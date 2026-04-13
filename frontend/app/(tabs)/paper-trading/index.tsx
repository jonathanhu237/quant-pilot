import { memo, useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { NumericText } from '@/components/numeric-text';
import { PillSelector } from '@/components/pill-selector';
import { SectionCard } from '@/components/section-card';
import { SkeletonBlock } from '@/components/skeleton-block';
import { ListRow } from '@/components/ui/list-row';
import { Body, Caption, Label } from '@/components/ui/typography';
import {
  getTradeHistory,
  getTradingAccount,
  type TradingAccount,
  type TradingTrade,
} from '@/lib/api';
import { useAppTheme } from '@/lib/theme-context';

type TradingTab = 'history' | 'positions';
type TradingPosition = TradingAccount['positions'][number];

function formatCurrency(value: number) {
  return `¥${value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number, withSign = true) {
  const prefix = withSign && value > 0 ? '+' : '';
  return `${prefix}${(value * 100).toFixed(2)}%`;
}

const PositionRow = memo(function PositionRow({
  costLabel,
  currentLabel,
  index,
  marketValueLabel,
  position,
  reducedMotion,
  sharesUnitLabel,
}: {
  costLabel: string;
  currentLabel: string;
  index: number;
  marketValueLabel: string;
  position: TradingPosition;
  reducedMotion: boolean;
  sharesUnitLabel: string;
}) {
  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(220).delay(Math.min(index * 40, 200))}
      layout={reducedMotion ? undefined : LinearTransition.duration(220)}>
      <View className={index === 0 ? '' : 'border-t border-divider'}>
        <ListRow
          className="pb-0"
          isFirst
          leading={
            <View>
              <Body weight="semibold">{position.name}</Body>
              <NumericText className="mt-1 text-label text-secondary">
                {position.symbol} · {position.shares}
                {sharesUnitLabel}
              </NumericText>
            </View>
          }
          trailing={
            <View>
              <NumericText className="text-body font-semibold" toneValue={position.unrealized_pnl}>
                {formatPercent(position.unrealized_pnl_pct)}
              </NumericText>
              <NumericText className="mt-1 text-label" toneValue={position.unrealized_pnl}>
                {formatCurrency(position.unrealized_pnl)}
              </NumericText>
            </View>
          }
        />
        <View className="mt-4 flex-row flex-wrap justify-between gap-y-3 px-row-x pb-row-y">
          <View className="w-[32%]">
            <Caption tone="secondary">{costLabel}</Caption>
            <NumericText className="mt-1 text-label font-medium text-primary">
              {formatCurrency(position.average_cost)}
            </NumericText>
          </View>
          <View className="w-[32%]">
            <Caption tone="secondary">{currentLabel}</Caption>
            <NumericText className="mt-1 text-label font-medium text-primary">
              {formatCurrency(position.current_price)}
            </NumericText>
          </View>
          <View className="w-[32%]">
            <Caption tone="secondary">{marketValueLabel}</Caption>
            <NumericText className="mt-1 text-label font-medium text-primary">
              {formatCurrency(position.market_value)}
            </NumericText>
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

const HistoryRow = memo(function HistoryRow({
  index,
  reducedMotion,
  sharesUnitLabel,
  sideLabel,
  trade,
}: {
  index: number;
  reducedMotion: boolean;
  sharesUnitLabel: string;
  sideLabel: string;
  trade: TradingTrade;
}) {
  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(220).delay(Math.min(index * 40, 200))}
      layout={reducedMotion ? undefined : LinearTransition.duration(220)}>
      <ListRow
        isFirst={index === 0}
        leading={
          <View>
            <Body tone="accent" weight="semibold">
              {sideLabel}
            </Body>
            <NumericText className="mt-1 text-label text-secondary">
              {trade.symbol} · {trade.shares}
              {sharesUnitLabel}
            </NumericText>
          </View>
        }
        trailing={
          <View>
            <NumericText className="text-body font-semibold text-primary">
              {formatCurrency(trade.price)}
            </NumericText>
            <Caption className="mt-1" selectable tone="secondary">
              {new Date(trade.created_at).toLocaleString()}
            </Caption>
          </View>
        }
      />
    </Animated.View>
  );
});

export default function PaperTradingScreen() {
  const { t } = useTranslation();
  const { palette } = useAppTheme();
  const [account, setAccount] = useState<TradingAccount | null>(null);
  const [history, setHistory] = useState<TradingTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TradingTab>('positions');
  const reducedMotion = useReducedMotion();

  const fetchTradingData = useCallback(async () => {
    const [nextAccount, nextHistory] = await Promise.all([getTradingAccount(), getTradeHistory()]);

    return {
      account: nextAccount,
      history: nextHistory,
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function initialize() {
        try {
          const nextData = await fetchTradingData();

          if (!active) {
            return;
          }

          setAccount(nextData.account);
          setHistory(nextData.history);
          setError(null);
        } catch (loadError) {
          if (active) {
            setError(loadError instanceof Error ? loadError.message : t('paperTrading.errors.load'));
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      void initialize();

      return () => {
        active = false;
      };
    }, [fetchTradingData, t])
  );

  async function refresh() {
    setRefreshing(true);

    try {
      const nextData = await fetchTradingData();
      setAccount(nextData.account);
      setHistory(nextData.history);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('paperTrading.errors.load'));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ gap: 24, paddingBottom: 40, paddingHorizontal: 20, paddingTop: 8 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.accent} />
      }>
      {loading || account === null ? (
        <>
          <SkeletonBlock className="h-4 w-56 rounded-full" />

          <SectionCard bodyClassName="px-card-x py-card-y">
            <SkeletonBlock className="h-4 w-24 rounded-full bg-background/70" />
            <SkeletonBlock className="mt-3 h-10 w-44 rounded-2xl bg-background/70" />

            <View className="mt-5 flex-row flex-wrap justify-between gap-y-4">
              {[0, 1, 2, 3].map((index) => (
                <View key={`summary-skeleton-${index}`} className="w-[48%] gap-2">
                  <SkeletonBlock className="h-4 w-20 rounded-full bg-background/70" />
                  <SkeletonBlock className="h-6 w-28 rounded-full bg-background/70" />
                </View>
              ))}
            </View>
          </SectionCard>

          <View className="flex-row gap-3">
            <SkeletonBlock className="h-11 flex-1 rounded-full" />
            <SkeletonBlock className="h-11 flex-1 rounded-full" />
          </View>

          <SectionCard>
            {[0, 1].map((index) => (
              <View
                key={`paper-row-skeleton-${index}`}
                className={index === 0 ? '' : 'border-t border-divider'}>
                <ListRow
                  isFirst
                  leading={
                    <View className="gap-2">
                      <SkeletonBlock className="h-4 w-28 rounded-full bg-background/70" />
                      <SkeletonBlock className="h-4 w-24 rounded-full bg-background/70" />
                    </View>
                  }
                  trailing={
                    <View className="items-end gap-2">
                      <SkeletonBlock className="h-5 w-16 rounded-full bg-background/70" />
                      <SkeletonBlock className="h-4 w-20 rounded-full bg-background/70" />
                    </View>
                  }
                />
                <View className="mt-4 flex-row flex-wrap justify-between gap-y-3 px-row-x pb-row-y">
                  {[0, 1, 2].map((statIndex) => (
                    <View key={`paper-stat-skeleton-${index}-${statIndex}`} className="w-[32%] gap-2">
                      <SkeletonBlock className="h-3 w-16 rounded-full bg-background/70" />
                      <SkeletonBlock className="h-4 w-20 rounded-full bg-background/70" />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </SectionCard>
        </>
      ) : (
        <>
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(220)}>
            <Body tone="secondary">{t('paperTrading.subtitle')}</Body>
          </Animated.View>

          {error ? (
            <Animated.Text
              className="text-sm text-error"
              entering={reducedMotion ? undefined : FadeIn.duration(200)}
              exiting={reducedMotion ? undefined : FadeOut.duration(160)}
              selectable>
              {error}
            </Animated.Text>
          ) : null}

          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(240).delay(40)}>
            <SectionCard bodyClassName="px-card-x py-card-y">
              <Body tone="secondary">{t('paperTrading.summary.totalAssets')}</Body>
              <NumericText className="mt-2 text-display font-bold text-primary">
                {formatCurrency(account.total_assets)}
              </NumericText>

              <View className="mt-5 flex-row flex-wrap justify-between gap-y-4">
                <View className="w-[48%]">
                  <Label tone="secondary">{t('paperTrading.summary.cash')}</Label>
                  <NumericText className="mt-1 text-heading font-semibold text-primary">
                    {formatCurrency(account.cash_balance)}
                  </NumericText>
                </View>
                <View className="w-[48%]">
                  <Label tone="secondary">{t('paperTrading.summary.marketValue')}</Label>
                  <NumericText className="mt-1 text-heading font-semibold text-primary">
                    {formatCurrency(account.market_value)}
                  </NumericText>
                </View>
                <View className="w-[48%]">
                  <Label tone="secondary">{t('paperTrading.summary.totalPnl')}</Label>
                  <NumericText className="mt-1 text-heading font-semibold" toneValue={account.total_pnl}>
                    {formatCurrency(account.total_pnl)}
                  </NumericText>
                </View>
                <View className="w-[48%]">
                  <Label tone="secondary">{t('paperTrading.summary.returnRate')}</Label>
                  <NumericText
                    className="mt-1 text-heading font-semibold"
                    toneValue={account.total_return_rate}>
                    {formatPercent(account.total_return_rate)}
                  </NumericText>
                </View>
              </View>
            </SectionCard>
          </Animated.View>

          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(240).delay(80)}>
            <PillSelector
              onChange={setActiveTab}
              options={[
                { label: t('paperTrading.tabs.positions'), value: 'positions' },
                { label: t('paperTrading.tabs.history'), value: 'history' },
              ]}
              selectedValue={activeTab}
            />
          </Animated.View>

          <SectionCard>
            {activeTab === 'positions' ? (
              account.positions.length === 0 ? (
                <View className="px-row-x py-8">
                  <Body className="text-center" tone="secondary">
                    {t('paperTrading.emptyPositions')}
                  </Body>
                </View>
              ) : (
                account.positions.map((position, index) => (
                  <PositionRow
                    key={position.symbol}
                    costLabel={t('paperTrading.position.cost')}
                    currentLabel={t('paperTrading.position.current')}
                    index={index}
                    marketValueLabel={t('paperTrading.position.marketValue')}
                    position={position}
                    reducedMotion={reducedMotion}
                    sharesUnitLabel={t('paperTrading.sharesUnit')}
                  />
                ))
              )
            ) : history.length === 0 ? (
              <View className="px-row-x py-8">
                <Body className="text-center" tone="secondary">
                  {t('paperTrading.emptyHistory')}
                </Body>
              </View>
            ) : (
              history.map((trade, index) => (
                <HistoryRow
                  key={trade.id}
                  index={index}
                  reducedMotion={reducedMotion}
                  sharesUnitLabel={t('paperTrading.sharesUnit')}
                  sideLabel={t(`paperTrading.tradeSide.${trade.side}`)}
                  trade={trade}
                />
              ))
            )}
          </SectionCard>
        </>
      )}
    </ScrollView>
  );
}
