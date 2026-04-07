import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { LANGUAGE_STORAGE_KEY } from '@/lib/i18n';
import {
  getDashboard,
  type DashboardResponse,
  type DashboardTrade,
  type DashboardWatchlistQuote,
} from '@/lib/api';

const THEME_STORAGE_KEY = 'quantpilot.theme';

function formatCurrency(value: number) {
  return `¥${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number) {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${(value * 100).toFixed(2)}%`;
}

function getValueColorClass(value: number) {
  if (value > 0) {
    return 'text-up';
  }
  if (value < 0) {
    return 'text-down';
  }
  return 'text-secondary';
}

function TradeRow({
  trade,
  t,
}: {
  trade: DashboardTrade;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  return (
    <View className="flex-row items-start justify-between border-t border-divider px-4 py-4 first:border-t-0">
      <View className="flex-1 pr-4">
        <Text className="text-base font-semibold text-accent">
          {t(`paperTrading.tradeSide.${trade.side}`)}
        </Text>
        <Text className="mt-1 text-sm text-secondary">
          {trade.symbol} · {trade.shares}
          {t('paperTrading.sharesUnit')}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-base font-semibold text-primary">{formatCurrency(trade.price)}</Text>
        <Text className="mt-1 text-xs text-secondary">
          {new Date(trade.created_at).toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

function QuoteRow({ quote }: { quote: DashboardWatchlistQuote }) {
  return (
    <View className="flex-row items-center justify-between border-t border-divider px-4 py-4 first:border-t-0">
      <View className="flex-1 pr-4">
        <Text className="text-base font-semibold text-primary">{quote.name}</Text>
        <Text className="mt-1 text-sm text-secondary">{quote.symbol}</Text>
      </View>
      <View className="items-end">
        <Text className="text-base font-semibold text-primary">{quote.price.toFixed(2)}</Text>
        <Text className={`mt-1 text-sm font-medium ${getValueColorClass(quote.change_pct)}`}>
          {quote.change_pct > 0 ? '+' : ''}
          {quote.change_pct.toFixed(2)}%
        </Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { i18n, t } = useTranslation();
  const { colorScheme, setColorScheme } = useColorScheme();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDark = colorScheme !== 'light';
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

  async function toggleLanguage() {
    const nextLanguage = i18n.language.toLowerCase().startsWith('zh') ? 'en' : 'zh-CN';
    await i18n.changeLanguage(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }

  async function toggleTheme() {
    const nextTheme = isDark ? 'light' : 'dark';
    setColorScheme(nextTheme);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
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
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={accentColor} />
      }>
      <View className="px-5">
        <View className="flex-row items-start justify-between gap-4">
          <Text className="flex-1 text-3xl font-bold text-primary">{t('home.title')}</Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              className="rounded-full bg-surface px-3 py-1 active:opacity-80"
              onPress={() => {
                void toggleLanguage();
              }}>
              <Text className="font-semibold text-accent">
                {i18n.language.toLowerCase().startsWith('zh') ? 'EN' : '中'}
              </Text>
            </Pressable>
            <Pressable
              className="rounded-full bg-surface px-3 py-2 active:opacity-80"
              onPress={() => {
                void toggleTheme();
              }}>
              <IconSymbol
                name={isDark ? 'moon.fill' : 'sun.max.fill'}
                size={16}
                color={accentColor}
              />
            </Pressable>
          </View>
        </View>
        <Text className="mt-2 text-sm leading-5 text-secondary">{t('home.subtitle')}</Text>

        {error ? <Text className="mt-4 text-sm text-error">{error}</Text> : null}

        <Pressable
          className="mt-6 rounded-3xl bg-surface px-4 py-5 active:opacity-80"
          onPress={() => router.push('/(tabs)/paper-trading')}>
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-sm text-secondary">{t('home.account.title')}</Text>
              <Text className="mt-2 text-3xl font-bold text-primary">
                {formatCurrency(dashboard.account_summary.total_assets)}
              </Text>
            </View>
            <Text
              className={`text-base font-semibold ${getValueColorClass(
                dashboard.account_summary.total_return_rate
              )}`}>
              {formatPercent(dashboard.account_summary.total_return_rate)}
            </Text>
          </View>
          <Text className="mt-4 text-sm font-medium text-accent">{t('home.account.cta')}</Text>
        </Pressable>

        <View className="mt-6 rounded-3xl bg-surface">
          <View className="px-4 pt-5">
            <Text className="text-xl font-semibold text-primary">
              {t('home.recentTrades.title')}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-secondary">
              {t('home.recentTrades.subtitle')}
            </Text>
          </View>
          {dashboard.recent_trades.length === 0 ? (
            <View className="px-4 py-8">
              <Text className="text-center text-base text-secondary">
                {t('home.recentTrades.empty')}
              </Text>
            </View>
          ) : (
            dashboard.recent_trades.map((trade) => <TradeRow key={trade.id} trade={trade} t={t} />)
          )}
        </View>

        <View className="mt-6 rounded-3xl bg-surface">
          <View className="px-4 pt-5">
            <Text className="text-xl font-semibold text-primary">
              {t('home.watchlist.title')}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-secondary">
              {t('home.watchlist.subtitle')}
            </Text>
          </View>
          {dashboard.watchlist_quotes.length === 0 ? (
            <View className="px-4 py-8">
              <Text className="text-center text-base text-secondary">
                {t('home.watchlist.empty')}
              </Text>
            </View>
          ) : (
            dashboard.watchlist_quotes.map((quote) => (
              <QuoteRow key={quote.symbol} quote={quote} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
