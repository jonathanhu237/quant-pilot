import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { NumericText } from '@/components/numeric-text';
import { SectionCard } from '@/components/section-card';
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

function TradeRow({
  index,
  t,
  trade,
}: {
  index: number;
  t: ReturnType<typeof useTranslation>['t'];
  trade: DashboardTrade;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(220).delay(Math.min(index * 40, 180))}
      layout={LinearTransition.duration(220)}
      className={`flex-row items-start justify-between px-4 py-4 ${
        index === 0 ? '' : 'border-t border-divider'
      }`}>
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
    </Animated.View>
  );
}

function QuoteRow({ index, quote }: { index: number; quote: DashboardWatchlistQuote }) {
  return (
    <Animated.View
      entering={FadeIn.duration(220).delay(Math.min(index * 40, 180))}
      layout={LinearTransition.duration(220)}
      className={`flex-row items-center justify-between px-4 py-4 ${
        index === 0 ? '' : 'border-t border-divider'
      }`}>
      <View className="flex-1 pr-4">
        <Text className="text-base font-semibold text-primary">{quote.name}</Text>
        <Text className="mt-1 text-sm text-secondary" selectable>
          {quote.symbol}
        </Text>
      </View>
      <View className="items-end">
        <NumericText className="text-base font-semibold text-primary">
          {quote.price.toFixed(2)}
        </NumericText>
        <NumericText
          className="mt-1 text-sm font-medium"
          toneValue={quote.change_pct}>
          {quote.change_pct > 0 ? '+' : ''}
          {quote.change_pct.toFixed(2)}%
        </NumericText>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accentColor = '#5E6AD2';

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
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={accentColor} />
        <Text className="mt-3 text-base text-secondary">{t('home.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 32 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={accentColor} />
      }>
      <View className="gap-6 px-5 pb-8 pt-2">
        <Animated.View entering={FadeIn.duration(220)}>
          <Text className="text-sm leading-6 text-secondary">{t('home.subtitle')}</Text>
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
          <Pressable
            className="rounded-3xl bg-surface px-4 py-5 active:opacity-80"
            onPress={() => router.push('/paper-trading')}
            style={{ borderCurve: 'continuous' }}>
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-sm text-secondary">{t('home.account.title')}</Text>
                <NumericText className="mt-2 text-3xl font-bold text-primary">
                  {formatCurrency(dashboard.account_summary.total_assets)}
                </NumericText>
              </View>
              <NumericText
                className="text-base font-semibold"
                toneValue={dashboard.account_summary.total_return_rate}>
                {formatPercent(dashboard.account_summary.total_return_rate)}
              </NumericText>
            </View>
            <Text className="mt-4 text-sm font-medium text-accent">{t('home.account.cta')}</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(240).delay(80)}>
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
                <TradeRow key={trade.id} index={index} t={t} trade={trade} />
              ))
            )}
          </SectionCard>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(240).delay(120)}>
          <SectionCard subtitle={t('home.watchlist.subtitle')} title={t('home.watchlist.title')}>
            {dashboard.watchlist_quotes.length === 0 ? (
              <View className="px-4 py-8">
                <Text className="text-center text-base text-secondary">
                  {t('home.watchlist.empty')}
                </Text>
              </View>
            ) : (
              dashboard.watchlist_quotes.map((quote, index) => (
                <QuoteRow key={quote.symbol} index={index} quote={quote} />
              ))
            )}
          </SectionCard>
        </Animated.View>
      </View>
    </ScrollView>
  );
}
