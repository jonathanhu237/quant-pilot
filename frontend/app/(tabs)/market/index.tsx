import { router } from 'expo-router';
import { memo, useCallback, useDeferredValue, useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  RefreshControl,
  ScrollView,
  View,
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
import { Button } from '@/components/ui/button';
import { Body, Heading, Title } from '@/components/ui/typography';
import { ListRow } from '@/components/ui/list-row';
import { SkeletonBlock } from '@/components/skeleton-block';
import { getQuotes, getWatchlist, removeFromWatchlist } from '@/lib/api';
import { setMarketSearchQuery, useMarketSearchQuery } from '@/lib/market-search';
import { getMarketDetailRoute } from '@/lib/routes';
import { useAppTheme } from '@/lib/theme-context';

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
      layout={reducedMotion ? undefined : LinearTransition.duration(220)}>
      <ListRow
        align="center"
        className="gap-3"
        isFirst={index === 0}
        onPress={() => {
          router.push(getMarketDetailRoute(item.symbol) as never);
        }}
        leading={
          <View className="gap-1">
            <Heading className="text-body">{item.name}</Heading>
            <Body selectable tone="secondary">
              {item.symbol}
            </Body>
          </View>
        }
        trailing={
          <View className="flex-row items-center gap-3">
            <View className="items-end gap-1">
              <NumericText className="text-title font-semibold text-primary">
                {item.price === null ? '--' : item.price.toFixed(2)}
              </NumericText>
              <NumericText className="text-label font-medium" toneValue={item.changePct}>
                {getChangeText(item.changePct)}
              </NumericText>
            </View>
            <Button
              accessibilityLabel={deleteAccessibilityLabel}
              onPress={(event) => {
                event.stopPropagation();
                onDelete(item.symbol);
              }}
              size="sm"
              textTone="secondary"
              variant="ghost">
              {deleteLabel}
            </Button>
          </View>
        }
      />
    </Animated.View>
  );
});

export default function MarketScreen() {
  const { t } = useTranslation();
  const { palette } = useAppTheme();
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

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: 32,
        paddingHorizontal: 20,
        paddingTop: 8,
      }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.accent} />
      }>
      {loading ? (
        <>
          <View className="pb-6">
            <SkeletonBlock className="h-4 w-48 rounded-full" />
          </View>
          {[0, 1, 2, 3, 4].map((index) => (
            <ListRow
              align="center"
              className="gap-3"
              isFirst={index === 0}
              key={`market-skeleton-${index}`}
              leading={
                <View className="gap-2">
                  <SkeletonBlock className="h-4 w-28 rounded-full" />
                  <SkeletonBlock className="h-4 w-16 rounded-full" />
                </View>
              }
              trailing={
                <View className="items-end gap-2">
                  <SkeletonBlock className="h-5 w-20 rounded-full" />
                  <SkeletonBlock className="h-4 w-16 rounded-full" />
                </View>
              }
            />
          ))}
        </>
      ) : (
        <>
          <View className="pb-6">
            <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(220)}>
              <Body tone="secondary">{t('market.subtitle')}</Body>
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

          {filteredRows.length === 0 ? (
            <View className="flex-1 items-center justify-center gap-2 px-6">
              <Title>{t('market.emptyTitle')}</Title>
              <Body className="text-center" tone="secondary">
                {t('market.emptySubtitle')}
              </Body>
            </View>
          ) : (
            filteredRows.map((item, index) => (
              <MarketListRow
                deleteAccessibilityLabel={t('accessibility.market.deleteSymbol', {
                  name: item.name,
                  symbol: item.symbol,
                })}
                deleteLabel={t('market.delete')}
                index={index}
                item={item}
                key={item.symbol}
                onDelete={handleDeleteSymbol}
                reducedMotion={reducedMotion}
              />
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}
