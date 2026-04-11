import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { NumericText } from '@/components/numeric-text';
import { PillSelector } from '@/components/pill-selector';
import { SectionCard } from '@/components/section-card';
import {
  getTradeHistory,
  getTradingAccount,
  type TradingAccount,
  type TradingTrade,
} from '@/lib/api';

type TradingTab = 'history' | 'positions';

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

export default function PaperTradingScreen() {
  const { t } = useTranslation();
  const [account, setAccount] = useState<TradingAccount | null>(null);
  const [history, setHistory] = useState<TradingTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TradingTab>('positions');
  const accentColor = '#5E6AD2';

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

  if (loading || account === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={accentColor} />
        <Text className="mt-3 text-base text-secondary">{t('paperTrading.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ gap: 24, paddingBottom: 40, paddingHorizontal: 20, paddingTop: 8 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={accentColor} />
      }>
        <Animated.View entering={FadeIn.duration(220)}>
          <Text className="text-sm leading-6 text-secondary">{t('paperTrading.subtitle')}</Text>
        </Animated.View>

        {error ? (
          <Animated.Text
            className="text-sm text-error"
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(160)}
            selectable>
            {error}
          </Animated.Text>
        ) : null}

        <Animated.View entering={FadeIn.duration(240).delay(40)}>
          <SectionCard bodyClassName="px-4 py-5">
            <Text className="text-sm text-secondary">{t('paperTrading.summary.totalAssets')}</Text>
            <NumericText className="mt-2 text-3xl font-bold text-primary">
              {formatCurrency(account.total_assets)}
            </NumericText>

            <View className="mt-5 flex-row flex-wrap justify-between gap-y-4">
              <View className="w-[48%]">
                <Text className="text-sm text-secondary">{t('paperTrading.summary.cash')}</Text>
                <NumericText className="mt-1 text-lg font-semibold text-primary">
                  {formatCurrency(account.cash_balance)}
                </NumericText>
              </View>
              <View className="w-[48%]">
                <Text className="text-sm text-secondary">
                  {t('paperTrading.summary.marketValue')}
                </Text>
                <NumericText className="mt-1 text-lg font-semibold text-primary">
                  {formatCurrency(account.market_value)}
                </NumericText>
              </View>
              <View className="w-[48%]">
                <Text className="text-sm text-secondary">{t('paperTrading.summary.totalPnl')}</Text>
                <NumericText className="mt-1 text-lg font-semibold" toneValue={account.total_pnl}>
                  {formatCurrency(account.total_pnl)}
                </NumericText>
              </View>
              <View className="w-[48%]">
                <Text className="text-sm text-secondary">
                  {t('paperTrading.summary.returnRate')}
                </Text>
                <NumericText
                  className="mt-1 text-lg font-semibold"
                  toneValue={account.total_return_rate}>
                  {formatPercent(account.total_return_rate)}
                </NumericText>
              </View>
            </View>
          </SectionCard>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(240).delay(80)}>
          <PillSelector
            onChange={setActiveTab}
            options={([
              { label: t('paperTrading.tabs.positions'), value: 'positions' },
              { label: t('paperTrading.tabs.history'), value: 'history' },
            ] as const).map((option) => option)}
            selectedValue={activeTab}
            unselectedLabelClassName="text-secondary"
          />
        </Animated.View>

        <SectionCard>
          {activeTab === 'positions' ? (
            account.positions.length === 0 ? (
              <View className="px-4 py-8">
                <Text className="text-center text-base text-secondary">
                  {t('paperTrading.emptyPositions')}
                </Text>
              </View>
            ) : (
              account.positions.map((position, index) => (
                <Animated.View
                  key={position.symbol}
                  entering={FadeIn.duration(220).delay(Math.min(index * 40, 200))}
                  layout={LinearTransition.duration(220)}
                  className={`px-4 py-4 ${
                    index === 0 ? '' : 'border-t border-divider'
                  }`}>
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-4">
                      <Text className="text-base font-semibold text-primary">{position.name}</Text>
                      <NumericText className="mt-1 text-sm text-secondary">
                        {position.symbol} · {position.shares}
                        {t('paperTrading.sharesUnit')}
                      </NumericText>
                    </View>
                    <View className="items-end">
                      <NumericText
                        className="text-base font-semibold"
                        toneValue={position.unrealized_pnl}>
                        {formatPercent(position.unrealized_pnl_pct)}
                      </NumericText>
                      <NumericText
                        className="mt-1 text-sm"
                        toneValue={position.unrealized_pnl}>
                        {formatCurrency(position.unrealized_pnl)}
                      </NumericText>
                    </View>
                  </View>

                  <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
                    <View className="w-[32%]">
                      <Text className="text-xs text-secondary">
                        {t('paperTrading.position.cost')}
                      </Text>
                      <NumericText className="mt-1 text-sm font-medium text-primary">
                        {formatCurrency(position.average_cost)}
                      </NumericText>
                    </View>
                    <View className="w-[32%]">
                      <Text className="text-xs text-secondary">
                        {t('paperTrading.position.current')}
                      </Text>
                      <NumericText className="mt-1 text-sm font-medium text-primary">
                        {formatCurrency(position.current_price)}
                      </NumericText>
                    </View>
                    <View className="w-[32%]">
                      <Text className="text-xs text-secondary">
                        {t('paperTrading.position.marketValue')}
                      </Text>
                      <NumericText className="mt-1 text-sm font-medium text-primary">
                        {formatCurrency(position.market_value)}
                      </NumericText>
                    </View>
                  </View>
                </Animated.View>
              ))
            )
          ) : history.length === 0 ? (
            <View className="px-4 py-8">
              <Text className="text-center text-base text-secondary">
                {t('paperTrading.emptyHistory')}
              </Text>
            </View>
          ) : (
            history.map((trade, index) => (
              <Animated.View
                key={trade.id}
                entering={FadeIn.duration(220).delay(Math.min(index * 40, 200))}
                layout={LinearTransition.duration(220)}
                className={`px-4 py-4 ${
                  index === 0 ? '' : 'border-t border-divider'
                }`}>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-base font-semibold text-accent">
                      {t(`paperTrading.tradeSide.${trade.side}`)}
                    </Text>
                    <NumericText className="mt-1 text-sm text-secondary">
                      {trade.symbol} · {trade.shares}
                      {t('paperTrading.sharesUnit')}
                    </NumericText>
                  </View>
                  <View className="items-end">
                    <NumericText className="text-base font-semibold text-primary">
                      {formatCurrency(trade.price)}
                    </NumericText>
                    <Text className="mt-1 text-xs text-secondary" selectable>
                      {new Date(trade.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            ))
          )}
        </SectionCard>
    </ScrollView>
  );
}
