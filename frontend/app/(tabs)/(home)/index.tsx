import { Link } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { NumericText } from '@/components/numeric-text';
import { SectionCard } from '@/components/section-card';
import { SkeletonBlock } from '@/components/skeleton-block';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Body, Caption, Label } from '@/components/ui/typography';
import {
  getDashboard,
  getWatchlistSignals,
  type DashboardResponse,
  type DashboardTrade,
  type DashboardWatchlistQuote,
  type SymbolSignalSnapshot,
} from '@/lib/api';
import { HOME_NEW_TRADE_ROUTE, HOME_SIGNAL_HISTORY_ROUTE } from '@/lib/routes';
import { useAppTheme } from '@/lib/theme-context';

function formatCurrency(value: number) {
  return `¥${value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number) {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${(value * 100).toFixed(2)}%`;
}

const TradeRow = memo(function TradeRow({
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
  trade: DashboardTrade;
}) {
  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(220).delay(Math.min(index * 40, 180))}
      layout={reducedMotion ? undefined : LinearTransition.duration(220)}>
      <ListRow
        isFirst={index === 0}
        leading={
          <View className="gap-1">
            <Body tone="accent" weight="semibold">
              {sideLabel}
            </Body>
            <NumericText className="text-label text-secondary">
              {trade.symbol} · {trade.shares}
              {sharesUnitLabel}
            </NumericText>
          </View>
        }
        trailing={
          <View className="gap-1">
            <NumericText className="text-body font-semibold text-primary">
              {formatCurrency(trade.price)}
            </NumericText>
            <Caption selectable tone="secondary">
              {new Date(trade.created_at).toLocaleString()}
            </Caption>
          </View>
        }
      />
    </Animated.View>
  );
});

const QuoteRow = memo(function QuoteRow({
  index,
  quote,
  reducedMotion,
}: {
  index: number;
  quote: DashboardWatchlistQuote;
  reducedMotion: boolean;
}) {
  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(220).delay(Math.min(index * 40, 180))}
      layout={reducedMotion ? undefined : LinearTransition.duration(220)}>
      <ListRow
        align="center"
        isFirst={index === 0}
        leading={
          <View className="gap-1">
            <Body weight="semibold">{quote.name}</Body>
            <Body selectable tone="secondary">
              {quote.symbol}
            </Body>
          </View>
        }
        trailing={
          <View className="gap-1">
            <NumericText className="text-body font-semibold text-primary">
              {quote.price.toFixed(2)}
            </NumericText>
            <NumericText className="text-label font-medium" toneValue={quote.change_pct}>
              {quote.change_pct > 0 ? '+' : ''}
              {quote.change_pct.toFixed(2)}%
            </NumericText>
          </View>
        }
      />
    </Animated.View>
  );
});

const SignalRow = memo(function SignalRow({
  index,
  reducedMotion,
  symbolSignal,
  t,
}: {
  index: number;
  reducedMotion: boolean;
  symbolSignal: SymbolSignalSnapshot;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  function getSignalBadgeVariant(signal: 'buy' | 'sell' | 'hold') {
    return signal === 'buy' ? 'positive' : signal === 'sell' ? 'negative' : 'neutral';
  }

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(220).delay(Math.min(index * 40, 180))}
      layout={reducedMotion ? undefined : LinearTransition.duration(220)}>
      <ListRow
        isFirst={index === 0}
        leading={
          <Link
            href={{
              params: {
                stockName: symbolSignal.name,
                symbol: symbolSignal.symbol,
              },
              pathname: HOME_SIGNAL_HISTORY_ROUTE,
            }}
            asChild>
            <Pressable
              accessibilityLabel={t('accessibility.home.openSignalHistory', {
                stockName: symbolSignal.name,
                symbol: symbolSignal.symbol,
              })}
              accessibilityRole="button"
              className="gap-1 active:opacity-80"
              hitSlop={4}>
              <Body weight="semibold">{symbolSignal.name}</Body>
              <Body selectable tone="secondary">
                {symbolSignal.symbol}
              </Body>
            </Pressable>
          </Link>
        }
        trailing={
          <View className="gap-2">
            <NumericText className="text-body font-semibold text-primary">
              {formatCurrency(symbolSignal.price)}
            </NumericText>
            <NumericText className="text-label font-medium" toneValue={symbolSignal.change_pct}>
              {symbolSignal.change_pct > 0 ? '+' : ''}
              {symbolSignal.change_pct.toFixed(2)}%
            </NumericText>
            <View className="flex-row flex-wrap justify-end gap-2">
              {symbolSignal.signals.map((signal) => {
                const strategyName = t(`strategy.strategies.${signal.strategy_id}.name`, {
                  defaultValue: signal.strategy_name,
                });
                const signalLabel = t(`home.signals.${signal.signal}`);
                const tradeAccessibilityLabel = t('accessibility.home.tradeFromSignal', {
                  side: signalLabel,
                  strategy: strategyName,
                  symbol: symbolSignal.symbol,
                });
                const badgeLabel = `${strategyName} · ${signalLabel}`;

                if (signal.signal === 'hold') {
                  return (
                    <Badge
                      key={`${symbolSignal.symbol}-${signal.strategy_id}`}
                      variant={getSignalBadgeVariant(signal.signal)}>
                      {badgeLabel}
                    </Badge>
                  );
                }

                return (
                  <Link
                    href={{
                      params: {
                        price: symbolSignal.price.toString(),
                        side: signal.signal,
                        signalDate: signal.signal_date,
                        strategyId: signal.strategy_id,
                        strategyName,
                        symbol: symbolSignal.symbol,
                      },
                      pathname: HOME_NEW_TRADE_ROUTE,
                    }}
                    key={`${symbolSignal.symbol}-${signal.strategy_id}`}
                    asChild>
                    <Badge
                      accessibilityLabel={tradeAccessibilityLabel}
                      variant={getSignalBadgeVariant(signal.signal)}>
                      {badgeLabel}
                    </Badge>
                  </Link>
                );
              })}
            </View>
          </View>
        }
      />
    </Animated.View>
  );
});

export default function HomeScreen() {
  const { t } = useTranslation();
  const { palette } = useAppTheme();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [signals, setSignals] = useState<SymbolSignalSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signalsError, setSignalsError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const hasFocusedOnceRef = useRef(false);

  const loadDashboard = useCallback(async () => {
    setError(null);
    const nextDashboard = await getDashboard();
    setDashboard(nextDashboard);
  }, []);

  const loadSignals = useCallback(async () => {
    setSignalsError(null);
    const nextSignals = await getWatchlistSignals();
    setSignals(nextSignals);
  }, []);

  useEffect(() => {
    async function initialize() {
      try {
        await loadDashboard();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : t('home.errors.load'));
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadDashboard, t]);

  useEffect(() => {
    async function initializeSignals() {
      try {
        await loadSignals();
      } catch (loadError) {
        setSignalsError(
          loadError instanceof Error ? loadError.message : t('home.signals.errors.load')
        );
      } finally {
        setSignalsLoading(false);
      }
    }

    void initializeSignals();
  }, [loadSignals, t]);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return undefined;
      }

      let active = true;

      async function refreshOnFocus() {
        const [dashboardResult, signalsResult] = await Promise.allSettled([
          getDashboard(),
          getWatchlistSignals(),
        ]);

        if (!active) {
          return;
        }

        if (dashboardResult.status === 'fulfilled') {
          setDashboard(dashboardResult.value);
          setError(null);
        } else {
          setError(
            dashboardResult.reason instanceof Error
              ? dashboardResult.reason.message
              : t('home.errors.refresh')
          );
        }

        if (signalsResult.status === 'fulfilled') {
          setSignals(signalsResult.value);
          setSignalsError(null);
        } else {
          setSignalsError(
            signalsResult.reason instanceof Error
              ? signalsResult.reason.message
              : t('home.signals.errors.load')
          );
        }
      }

      void refreshOnFocus();

      return () => {
        active = false;
      };
    }, [t])
  );

  async function refresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        loadDashboard().catch((loadError) => {
          setError(loadError instanceof Error ? loadError.message : t('home.errors.refresh'));
        }),
        loadSignals().catch((loadError) => {
          setSignalsError(
            loadError instanceof Error ? loadError.message : t('home.signals.errors.load')
          );
        }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  const signalSection = (
    <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(240).delay(80)}>
      <SectionCard subtitle={t('home.signals.subtitle')} title={t('home.signals.title')}>
        {signalsLoading ? (
          <View className="pb-1">
            {[0, 1, 2].map((index) => (
              <ListRow
                className="gap-3"
                key={`signal-loading-${index}`}
                isFirst={index === 0}
                leading={
                  <View className="gap-2">
                    <SkeletonBlock className="h-4 w-24 rounded-full bg-background/70" />
                    <SkeletonBlock className="h-4 w-32 rounded-full bg-background/70" />
                  </View>
                }
                trailing={
                  <View className="items-end gap-2">
                    <SkeletonBlock className="h-4 w-20 rounded-full bg-background/70" />
                    <SkeletonBlock className="h-4 w-16 rounded-full bg-background/70" />
                    <SkeletonBlock className="h-6 w-32 rounded-full bg-background/70" />
                  </View>
                }
              />
            ))}
          </View>
        ) : signalsError ? (
          <View className="px-row-x py-8">
            <Body className="text-center" selectable tone="error">
              {signalsError}
            </Body>
          </View>
        ) : signals.length === 0 ? (
          <View className="px-row-x py-8">
            <Body className="text-center" tone="secondary">
              {t('home.signals.empty')}
            </Body>
          </View>
        ) : (
          signals.map((symbolSignal, index) => (
            <SignalRow
              key={symbolSignal.symbol}
              index={index}
              reducedMotion={reducedMotion}
              symbolSignal={symbolSignal}
              t={t}
            />
          ))
        )}
      </SectionCard>
    </Animated.View>
  );

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ gap: 24, paddingBottom: 32, paddingHorizontal: 20, paddingTop: 8 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.accent} />
      }>
      {loading ? (
        <>
          <SkeletonBlock className="h-4 w-56 rounded-full" />

          <Card className="gap-4 px-card-x py-card-y">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1 gap-3">
                <SkeletonBlock className="h-4 w-24 rounded-full bg-background/70" />
                <SkeletonBlock className="h-10 w-44 rounded-2xl bg-background/70" />
              </View>
              <SkeletonBlock className="mt-1 h-6 w-20 rounded-full bg-background/70" />
            </View>
            <SkeletonBlock className="h-4 w-32 rounded-full bg-background/70" />
          </Card>

          <Card>
            <View className="gap-2 px-4 pt-5">
              <SkeletonBlock className="h-6 w-36 rounded-full bg-background/70" />
              <SkeletonBlock className="h-4 w-60 rounded-full bg-background/70" />
            </View>
            <View className="pb-1">
              {[0, 1, 2].map((index) => (
                <ListRow
                  key={`signal-skeleton-${index}`}
                  isFirst={index === 0}
                  leading={
                    <View className="gap-2">
                      <SkeletonBlock className="h-4 w-24 rounded-full bg-background/70" />
                      <SkeletonBlock className="h-4 w-28 rounded-full bg-background/70" />
                    </View>
                  }
                  trailing={
                    <View className="items-end gap-2">
                      <SkeletonBlock className="h-4 w-20 rounded-full bg-background/70" />
                      <SkeletonBlock className="h-4 w-16 rounded-full bg-background/70" />
                      <SkeletonBlock className="h-6 w-28 rounded-full bg-background/70" />
                    </View>
                  }
                />
              ))}
            </View>
          </Card>

          <Card>
            <View className="gap-2 px-4 pt-5">
              <SkeletonBlock className="h-6 w-40 rounded-full bg-background/70" />
              <SkeletonBlock className="h-4 w-52 rounded-full bg-background/70" />
            </View>
            <View className="pb-1">
              {[0, 1, 2].map((index) => (
                <ListRow
                  key={`trade-skeleton-${index}`}
                  isFirst={index === 0}
                  leading={
                    <View className="gap-2">
                      <SkeletonBlock className="h-4 w-20 rounded-full bg-background/70" />
                      <SkeletonBlock className="h-4 w-28 rounded-full bg-background/70" />
                    </View>
                  }
                  trailing={
                    <View className="items-end gap-2">
                      <SkeletonBlock className="h-4 w-20 rounded-full bg-background/70" />
                      <SkeletonBlock className="h-4 w-24 rounded-full bg-background/70" />
                    </View>
                  }
                />
              ))}
            </View>
          </Card>

          <Card>
            <View className="gap-2 px-4 pt-5">
              <SkeletonBlock className="h-6 w-44 rounded-full bg-background/70" />
              <SkeletonBlock className="h-4 w-56 rounded-full bg-background/70" />
            </View>
            <View className="pb-1">
              {[0, 1, 2].map((index) => (
                <ListRow
                  align="center"
                  key={`quote-skeleton-${index}`}
                  isFirst={index === 0}
                  leading={
                    <View className="gap-2">
                      <SkeletonBlock className="h-4 w-32 rounded-full bg-background/70" />
                      <SkeletonBlock className="h-4 w-20 rounded-full bg-background/70" />
                    </View>
                  }
                  trailing={
                    <View className="items-end gap-2">
                      <SkeletonBlock className="h-5 w-20 rounded-full bg-background/70" />
                      <SkeletonBlock className="h-4 w-16 rounded-full bg-background/70" />
                    </View>
                  }
                />
              ))}
            </View>
          </Card>
        </>
      ) : (
        <>
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(220)}>
            <Body tone="secondary">{t('home.subtitle')}</Body>
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

          {dashboard ? (
            <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(240).delay(40)}>
              <Link href="/paper-trading" asChild>
                <Pressable
                  accessibilityLabel={t('accessibility.home.openPaperTrading')}
                  accessibilityRole="button"
                  className="active:opacity-80"
                  style={{ borderCurve: 'continuous' }}>
                  <Card className="gap-4 px-card-x py-card-y">
                    <View className="flex-row items-start justify-between gap-4">
                      <View className="flex-1 gap-2">
                        <Label tone="secondary">{t('home.account.title')}</Label>
                        <NumericText className="text-display font-bold text-primary">
                          {formatCurrency(dashboard.account_summary.total_assets)}
                        </NumericText>
                      </View>
                      <NumericText
                        className="text-body font-semibold"
                        toneValue={dashboard.account_summary.total_return_rate}>
                        {formatPercent(dashboard.account_summary.total_return_rate)}
                      </NumericText>
                    </View>
                    <Label tone="accent">{t('home.account.cta')}</Label>
                  </Card>
                </Pressable>
              </Link>
            </Animated.View>
          ) : null}

          {signalSection}

          {dashboard ? (
            <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(240).delay(120)}>
              <SectionCard
                subtitle={t('home.recentTrades.subtitle')}
                title={t('home.recentTrades.title')}>
                {dashboard.recent_trades.length === 0 ? (
                  <View className="px-row-x py-8">
                    <Body className="text-center" tone="secondary">
                      {t('home.recentTrades.empty')}
                    </Body>
                  </View>
                ) : (
                  dashboard.recent_trades.map((trade, index) => (
                    <TradeRow
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
            </Animated.View>
          ) : null}

          {dashboard ? (
            <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(240).delay(160)}>
              <SectionCard
                subtitle={t('home.watchlist.subtitle')}
                title={t('home.watchlist.title')}>
                {dashboard.watchlist_quotes.length === 0 ? (
                  <View className="px-row-x py-8">
                    <Body className="text-center" tone="secondary">
                      {t('home.watchlist.empty')}
                    </Body>
                  </View>
                ) : (
                  dashboard.watchlist_quotes.map((quote, index) => (
                    <QuoteRow
                      key={quote.symbol}
                      index={index}
                      quote={quote}
                      reducedMotion={reducedMotion}
                    />
                  ))
                )}
              </SectionCard>
            </Animated.View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
