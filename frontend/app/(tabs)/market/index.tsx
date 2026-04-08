import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { NumericText } from '@/components/numeric-text';
import { getQuotes, getWatchlist, removeFromWatchlist } from '@/lib/api';

type MarketRow = {
  changePct: number | null;
  name: string;
  price: number | null;
  symbol: string;
};

function buildRows(
  symbols: string[],
  quotes: Awaited<ReturnType<typeof getQuotes>>,
  fallbackName: string
) {
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

export default function MarketScreen() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const accentColor = '#5E6AD2';

  const fetchMarket = useCallback(async () => {
    const symbols = await getWatchlist();

    if (symbols.length === 0) {
      return {
        error: null as string | null,
        rows: [] as MarketRow[],
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

  async function handleDeleteSymbol(symbol: string) {
    try {
      await removeFromWatchlist(symbol);
      const nextMarket = await fetchMarket();
      setRows(nextMarket.rows);
      setError(nextMarket.error);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t('market.errors.delete'));
    }
  }

  function getChangeText(changePct: number | null) {
    if (changePct === null) {
      return '--';
    }

    return `${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%`;
  }

  function renderItem({ index, item }: ListRenderItemInfo<MarketRow>) {
    return (
      <Animated.View
        entering={FadeIn.duration(220).delay(Math.min(index * 40, 200))}
        layout={LinearTransition.duration(220)}
        className={`flex-row items-center gap-3 py-4 ${
          index === 0 ? '' : 'border-t border-divider'
        }`}>
        <View className="flex-1">
          <Text className="text-base font-semibold text-primary">{item.name}</Text>
          <Text className="mt-1 text-sm text-secondary" selectable>
            {item.symbol}
          </Text>
        </View>
        <View className="items-end">
          <NumericText className="text-lg font-semibold text-primary">
            {item.price === null ? '--' : item.price.toFixed(2)}
          </NumericText>
          <NumericText className="mt-1 text-sm font-medium" toneValue={item.changePct}>
            {getChangeText(item.changePct)}
          </NumericText>
        </View>
        <Pressable
          className="ml-3 min-h-11 rounded-xl px-3 py-2 active:opacity-80"
          hitSlop={4}
          onPress={() => {
            void handleDeleteSymbol(item.symbol);
          }}
          style={{ borderCurve: 'continuous' }}>
          <Text className="text-sm font-medium text-secondary">{t('market.delete')}</Text>
        </Pressable>
      </Animated.View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={accentColor} />
        <Text className="mt-3 text-base text-secondary">{t('market.loading')}</Text>
      </View>
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
      data={rows}
      keyExtractor={(item) => item.symbol}
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-semibold text-primary">{t('market.emptyTitle')}</Text>
          <Text className="mt-2 text-center text-sm leading-6 text-secondary">
            {t('market.emptySubtitle')}
          </Text>
        </View>
      }
      ListHeaderComponent={
        <View className="pb-6">
          <Animated.View entering={FadeIn.duration(220)}>
            <Text className="text-sm leading-6 text-secondary">{t('market.subtitle')}</Text>
          </Animated.View>
          {error ? (
            <Animated.Text
              className="pt-4 text-sm text-error"
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(160)}
              selectable>
              {error}
            </Animated.Text>
          ) : null}
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={accentColor} />
      }
      renderItem={renderItem}
    />
  );
}
