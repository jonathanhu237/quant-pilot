import { Link } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
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
import {
  getDashboard,
  type DashboardResponse,
  type DashboardTrade,
  type DashboardWatchlistQuote,
} from '@/lib/api';

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
      layout={reducedMotion ? undefined : LinearTransition.duration(220)}
      className={`flex-row items-start justify-between px-4 py-4 ${
        index === 0 ? '' : 'border-t border-divider'
      }`}>
      <View className="flex-1 gap-1 pr-4">
        <Text className="text-base font-semibold text-accent">{sideLabel}</Text>
        <NumericText className="text-sm text-secondary">
          {trade.symbol} · {trade.shares}
          {sharesUnitLabel}
        </NumericText>
      </View>
      <View className="items-end gap-1">
        <NumericText className="text-base font-semibold text-primary">
          {formatCurrency(trade.price)}
        </NumericText>
        <Text className="text-xs text-secondary" selectable>
          {new Date(trade.created_at).toLocaleString()}
        </Text>
      </View>
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
      layout={reducedMotion ? undefined : LinearTransition.duration(220)}
      className={`flex-row items-center justify-between px-4 py-4 ${
        index === 0 ? '' : 'border-t border-divider'
      }`}>
      <View className="flex-1 gap-1 pr-4">
        <Text className="text-base font-semibold text-primary">{quote.name}</Text>
        <Text className="text-sm text-secondary" selectable>
          {quote.symbol}
        </Text>
      </View>
      <View className="items-end gap-1">
        <NumericText className="text-base font-semibold text-primary">
          {quote.price.toFixed(2)}
        </NumericText>
        <NumericText className="text-sm font-medium" toneValue={quote.change_pct}>
          {quote.change_pct > 0 ? '+' : ''}
          {quote.change_pct.toFixed(2)}%
        </NumericText>
      </View>
    </Animated.View>
  );
});

export default function HomeScreen() {
  const { t } = useTranslation();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const loadDashboard = useCallback(async () => {
    setError(null);
    const nextDashboard = await getDashboard();
    setDashboard(nextDashboard);
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

  async function refresh() {
    setRefreshing(true);
    try {
      await loadDashboard();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('home.errors.refresh'));
    } finally {
      setRefreshing(false);
    }
  }

  if (loading || dashboard === null) {
    return (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{
          gap: 24,
          paddingBottom: 32,
          paddingHorizontal: 20,
          paddingTop: 8,
        }}
        contentInsetAdjustmentBehavior="automatic">
        <SkeletonBlock className="h-4 w-56 rounded-full" />

        <View className="gap-4 rounded-3xl bg-surface px-4 py-5" style={{ borderCurve: 'continuous' }}>
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1 gap-3">
              <SkeletonBlock className="h-4 w-24 rounded-full bg-background/70" />
              <SkeletonBlock className="h-10 w-44 rounded-2xl bg-background/70" />
            </View>
            <SkeletonBlock className="mt-1 h-6 w-20 rounded-full bg-background/70" />
          </View>
          <SkeletonBlock className="h-4 w-32 rounded-full bg-background/70" />
        </View>

        <View className="rounded-3xl bg-surface" style={{ borderCurve: 'continuous' }}>
          <View className="gap-2 px-4 pt-5">
            <SkeletonBlock className="h-6 w-40 rounded-full bg-background/70" />
            <SkeletonBlock className="h-4 w-52 rounded-full bg-background/70" />
          </View>
          <View className="pb-1">
            {[0, 1, 2].map((index) => (
              <View
                key={`trade-skeleton-${index}`}
                className={`flex-row items-start justify-between px-4 py-4 ${
                  index === 0 ? '' : 'border-t border-divider'
                }`}>
                <View className="flex-1 gap-2 pr-4">
                  <SkeletonBlock className="h-4 w-20 rounded-full bg-background/70" />
                  <SkeletonBlock className="h-4 w-28 rounded-full bg-background/70" />
                </View>
                <View className="items-end gap-2">
                  <SkeletonBlock className="h-4 w-20 rounded-full bg-background/70" />
                  <SkeletonBlock className="h-4 w-24 rounded-full bg-background/70" />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="rounded-3xl bg-surface" style={{ borderCurve: 'continuous' }}>
          <View className="gap-2 px-4 pt-5">
            <SkeletonBlock className="h-6 w-44 rounded-full bg-background/70" />
            <SkeletonBlock className="h-4 w-56 rounded-full bg-background/70" />
          </View>
          <View className="pb-1">
            {[0, 1, 2].map((index) => (
              <View
                key={`quote-skeleton-${index}`}
                className={`flex-row items-center justify-between px-4 py-4 ${
                  index === 0 ? '' : 'border-t border-divider'
                }`}>
                <View className="flex-1 gap-2 pr-4">
                  <SkeletonBlock className="h-4 w-32 rounded-full bg-background/70" />
                  <SkeletonBlock className="h-4 w-20 rounded-full bg-background/70" />
                </View>
                <View className="items-end gap-2">
                  <SkeletonBlock className="h-5 w-20 rounded-full bg-background/70" />
                  <SkeletonBlock className="h-4 w-16 rounded-full bg-background/70" />
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ gap: 24, paddingBottom: 32, paddingHorizontal: 20, paddingTop: 8 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#5E6AD2" />
      }>
      <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(220)}>
        <Text className="text-sm leading-6 text-secondary">{t('home.subtitle')}</Text>
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

      <Animated.View
        entering={reducedMotion ? undefined : FadeIn.duration(240).delay(40)}>
        <Link href="/paper-trading" asChild>
          <Pressable
            accessibilityLabel={t('accessibility.home.openPaperTrading')}
            accessibilityRole="button"
            className="gap-4 rounded-3xl bg-surface px-4 py-5 active:opacity-80"
            style={{ borderCurve: 'continuous' }}>
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1 gap-2">
                <Text className="text-sm text-secondary">{t('home.account.title')}</Text>
                <NumericText className="text-3xl font-bold text-primary">
                  {formatCurrency(dashboard.account_summary.total_assets)}
                </NumericText>
              </View>
              <NumericText
                className="text-base font-semibold"
                toneValue={dashboard.account_summary.total_return_rate}>
                {formatPercent(dashboard.account_summary.total_return_rate)}
              </NumericText>
            </View>
            <Text className="text-sm font-medium text-accent">{t('home.account.cta')}</Text>
          </Pressable>
        </Link>
      </Animated.View>

      <Animated.View
        entering={reducedMotion ? undefined : FadeIn.duration(240).delay(80)}>
        <SectionCard
          subtitle={t('home.recentTrades.subtitle')}
          title={t('home.recentTrades.title')}>
          {dashboard.recent_trades.length === 0 ? (
            <View className="px-4 py-8">
              <Text className="text-center text-base text-secondary">
                {t('home.recentTrades.empty')}
              </Text>
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

      <Animated.View
        entering={reducedMotion ? undefined : FadeIn.duration(240).delay(120)}>
        <SectionCard subtitle={t('home.watchlist.subtitle')} title={t('home.watchlist.title')}>
          {dashboard.watchlist_quotes.length === 0 ? (
            <View className="px-4 py-8">
              <Text className="text-center text-base text-secondary">
                {t('home.watchlist.empty')}
              </Text>
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
    </ScrollView>
  );
}
