import { memo, useCallback, useDeferredValue, useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { NumericText } from '@/components/numeric-text';
import { SkeletonBlock } from '@/components/skeleton-block';
import { getQuotes, getWatchlist, removeFromWatchlist } from '@/lib/api';
import { setMarketSearchQuery, useMarketSearchQuery } from '@/lib/market-search';

type MarketRowData = {
  changePct: number | null;
  name: string;
  price: number | null;
  symbol: string;
};

function buildRows(
  symbols: string[],
  quotes: Awaited<ReturnType<typeof getQuotes>>,
  fallbackName: string
): MarketRowData[] {
  const quoteMap = new Map(quotes.map((quote) => [quote.symbol, quote]));

  return symbols.map((symbol) => {
    const quote = quoteMap.get(symbol);
    return {
      changePct: quote?.change_pct ?? null,
      name: quote?.name ?? fallbackName,
      price: quote?.price ?? null,
      symbol,
    };
  });
}

const MarketListRow = memo(function MarketListRow({
  deleteAccessibilityLabel,
  deleteLabel,
  index,
  item,
  onDelete,
  reducedMotion,
}: {
  deleteAccessibilityLabel: string;
  deleteLabel: string;
  index: number;
  item: MarketRowData;
  onDelete: (symbol: string) => void;
  reducedMotion: boolean;
}) {
  function getChangeText(changePct: number | null) {
    if (changePct === null) {
      return '--';
    }

    return `${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%`;
  }

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(220).delay(Math.min(index * 40, 200))}
      layout={reducedMotion ? undefined : LinearTransition.duration(220)}
      className={`flex-row items-center gap-3 py-4 ${
        index === 0 ? '' : 'border-t border-divider'
      }`}>
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-primary">{item.name}</Text>
        <Text className="text-sm text-secondary" selectable>
          {item.symbol}
        </Text>
      </View>
      <View className="items-end gap-1">
        <NumericText className="text-lg font-semibold text-primary">
          {item.price === null ? '--' : item.price.toFixed(2)}
        </NumericText>
        <NumericText className="text-sm font-medium" toneValue={item.changePct}>
          {getChangeText(item.changePct)}
        </NumericText>
      </View>
      <Pressable
        accessibilityLabel={deleteAccessibilityLabel}
        accessibilityRole="button"
        className="ml-3 min-h-11 rounded-xl px-3 py-2 active:opacity-80"
        hitSlop={4}
        onPress={() => {
          onDelete(item.symbol);
        }}
        style={{ borderCurve: 'continuous' }}>
        <Text className="text-sm font-medium text-secondary">{deleteLabel}</Text>
      </Pressable>
    </Animated.View>
  );
});

export default function MarketScreen() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<MarketRowData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const searchQuery = useMarketSearchQuery();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();

  const fetchMarket = useCallback(async () => {
    const symbols = await getWatchlist();

    if (symbols.length === 0) {
      return {
        error: null as string | null,
        rows: [] as MarketRowData[],
      };
    }

    try {
      const quotes = await getQuotes(symbols);
      return {
        error: null as string | null,
        rows: buildRows(symbols, quotes, t('market.quoteUnavailable')),
      };
    } catch {
      return {
        error: t('market.errors.quotesUnavailable'),
        rows: buildRows(symbols, [], t('market.quoteUnavailable')),
      };
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setMarketSearchQuery('');

      async function initialize() {
        try {
          const nextMarket = await fetchMarket();

          if (!active) {
            return;
          }

          setRows(nextMarket.rows);
          setError(nextMarket.error);
        } catch (loadError) {
          if (active) {
            setError(loadError instanceof Error ? loadError.message : t('market.errors.load'));
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
    }, [fetchMarket, t])
  );

  async function refresh() {
    setRefreshing(true);

    try {
      const nextMarket = await fetchMarket();
      setRows(nextMarket.rows);
      setError(nextMarket.error);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('market.errors.refresh'));
    } finally {
      setRefreshing(false);
    }
  }

  const handleDeleteSymbol = useCallback(async (symbol: string) => {
    try {
      await removeFromWatchlist(symbol);
      if (process.env.EXPO_OS === 'ios') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const nextMarket = await fetchMarket();
      setRows(nextMarket.rows);
      setError(nextMarket.error);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t('market.errors.delete'));
    }
  }, [fetchMarket, t]);

  const filteredRows =
    normalizedSearchQuery.length === 0
      ? rows
      : rows.filter((item) => {
          const query = normalizedSearchQuery;
          return (
            item.symbol.toLowerCase().includes(query) || item.name.toLowerCase().includes(query)
          );
        });

  const renderItem = useCallback(
    ({ index, item }: ListRenderItemInfo<MarketRowData>) => (
      <MarketListRow
        deleteAccessibilityLabel={t('accessibility.market.deleteSymbol', {
          name: item.name,
          symbol: item.symbol,
        })}
        deleteLabel={t('market.delete')}
        index={index}
        item={item}
        onDelete={handleDeleteSymbol}
        reducedMotion={reducedMotion}
      />
    ),
    [handleDeleteSymbol, reducedMotion, t]
  );

  if (loading) {
    return (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{
          gap: 0,
          paddingBottom: 32,
          paddingHorizontal: 20,
          paddingTop: 8,
        }}
        contentInsetAdjustmentBehavior="automatic">
        <View className="pb-6">
          <SkeletonBlock className="h-4 w-48 rounded-full" />
        </View>
        {[0, 1, 2, 3, 4].map((index) => (
          <View
            key={`market-skeleton-${index}`}
            className={`flex-row items-center gap-3 py-4 ${
              index === 0 ? '' : 'border-t border-divider'
            }`}>
            <View className="flex-1 gap-2">
              <SkeletonBlock className="h-4 w-28 rounded-full" />
              <SkeletonBlock className="h-4 w-16 rounded-full" />
            </View>
            <View className="items-end gap-2">
              <SkeletonBlock className="h-5 w-20 rounded-full" />
              <SkeletonBlock className="h-4 w-16 rounded-full" />
            </View>
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: 32,
        paddingHorizontal: 20,
        paddingTop: 8,
      }}
      contentInsetAdjustmentBehavior="automatic"
      data={filteredRows}
      keyExtractor={(item) => item.symbol}
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center gap-2 px-6">
          <Text className="text-xl font-semibold text-primary">{t('market.emptyTitle')}</Text>
          <Text className="text-center text-sm leading-6 text-secondary">
            {t('market.emptySubtitle')}
          </Text>
        </View>
      }
      ListHeaderComponent={
        <View className="pb-6">
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(220)}>
            <Text className="text-sm leading-6 text-secondary">{t('market.subtitle')}</Text>
          </Animated.View>
          {error ? (
            <Animated.Text
              className="pt-4 text-sm text-error"
              entering={reducedMotion ? undefined : FadeIn.duration(200)}
              exiting={reducedMotion ? undefined : FadeOut.duration(160)}
              selectable>
              {error}
            </Animated.Text>
          ) : null}
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#5E6AD2" />
      }
      renderItem={renderItem}
    />
  );
}
