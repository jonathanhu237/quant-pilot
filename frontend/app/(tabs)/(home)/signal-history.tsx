import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { SectionCard } from '@/components/section-card';
import { SkeletonBlock } from '@/components/skeleton-block';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Body, Display } from '@/components/ui/typography';
import { getSignalHistory, type SignalHistoryEntry } from '@/lib/api';

type SignalHistorySection = {
  strategyId: string;
  strategyName: string;
  entries: SignalHistoryEntry[];
};

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function formatHistoryDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Date(value).toLocaleDateString();
}

function groupSignalHistory(entries: SignalHistoryEntry[]) {
  const sortedEntries = [...entries].sort(
    (left, right) => new Date(right.signal_date).getTime() - new Date(left.signal_date).getTime()
  );
  const sections = new Map<string, SignalHistorySection>();

  sortedEntries.forEach((entry) => {
    const existing = sections.get(entry.strategy_id);

    if (existing) {
      existing.entries.push(entry);
      return;
    }

    sections.set(entry.strategy_id, {
      entries: [entry],
      strategyId: entry.strategy_id,
      strategyName: entry.strategy_name,
    });
  });

  return Array.from(sections.values());
}

function getSignalBadgeVariant(signal: SignalHistoryEntry['signal']) {
  return signal === 'buy' ? 'positive' : signal === 'sell' ? 'negative' : 'neutral';
}

export default function SignalHistoryScreen() {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const params = useLocalSearchParams<{
    stockName?: string | string[];
    symbol?: string | string[];
  }>();
  const symbol = normalizeParam(params.symbol) ?? '';
  const stockName = normalizeParam(params.stockName) ?? '';
  const [history, setHistory] = useState<SignalHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!symbol) {
        if (active) {
          setError(t('home.signals.history.errors.load'));
          setLoading(false);
        }
        return;
      }

      setError(null);

      try {
        const nextHistory = await getSignalHistory(symbol, 30);

        if (active) {
          setHistory(nextHistory);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error ? loadError.message : t('home.signals.history.errors.load')
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, [symbol, t]);

  const sections = groupSignalHistory(history);
  const displayName = stockName || symbol || t('home.signals.history.title');

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        gap: 20,
        paddingBottom: 32,
        paddingHorizontal: 20,
        paddingTop: 8,
      }}
      contentInsetAdjustmentBehavior="automatic">
      <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(220)} className="gap-1 px-1 pt-1">
        <Display className="text-title" numberOfLines={2}>
          {displayName}
        </Display>
        {symbol ? (
          <Body className="tracking-[0.24em]" selectable tone="secondary">
            {symbol}
          </Body>
        ) : null}
      </Animated.View>

      {loading ? (
        <View className="gap-4">
          <Card>
            <View className="gap-2 px-4 pt-5">
              <SkeletonBlock className="h-6 w-40 rounded-full bg-background/70" />
              <SkeletonBlock className="h-4 w-52 rounded-full bg-background/70" />
            </View>
            <View className="pb-1">
              {[0, 1, 2].map((index) => (
                <ListRow
                  align="center"
                  className="gap-3"
                  key={`history-skeleton-${index}`}
                  isFirst={index === 0}
                  leading={<SkeletonBlock className="h-4 w-28 rounded-full bg-background/70" />}
                  trailing={<SkeletonBlock className="h-6 w-16 rounded-full bg-background/70" />}
                />
              ))}
            </View>
          </Card>

          <Card>
            <View className="gap-2 px-4 pt-5">
              <SkeletonBlock className="h-6 w-36 rounded-full bg-background/70" />
              <SkeletonBlock className="h-4 w-48 rounded-full bg-background/70" />
            </View>
            <View className="pb-1">
              {[0, 1, 2].map((index) => (
                <ListRow
                  align="center"
                  className="gap-3"
                  key={`history-skeleton-secondary-${index}`}
                  isFirst={index === 0}
                  leading={<SkeletonBlock className="h-4 w-28 rounded-full bg-background/70" />}
                  trailing={<SkeletonBlock className="h-6 w-16 rounded-full bg-background/70" />}
                />
              ))}
            </View>
          </Card>
        </View>
      ) : error ? (
        <Card className="px-card-x py-10">
          <Body className="text-center" selectable tone="error">
            {error}
          </Body>
        </Card>
      ) : sections.length === 0 ? (
        <Card className="px-card-x py-10">
          <Body className="text-center" tone="secondary">
            {t('home.signals.history.empty')}
          </Body>
        </Card>
      ) : (
        sections.map((section, sectionIndex) => (
          <Animated.View
            key={section.strategyId}
            entering={reducedMotion ? undefined : FadeIn.duration(220).delay(Math.min(sectionIndex * 60, 220))}>
            <SectionCard
              title={t(`strategy.strategies.${section.strategyId}.name`, {
                defaultValue: section.strategyName || section.strategyId,
              })}
              bodyClassName="pb-1">
              {section.entries.map((entry, entryIndex) => (
                <ListRow
                  align="center"
                  key={`${section.strategyId}-${entry.signal_date}-${entryIndex}`}
                  isFirst={entryIndex === 0}
                  leading={
                    <Body selectable tone="secondary">
                      {formatHistoryDate(entry.signal_date)}
                    </Body>
                  }
                  trailing={
                    <Badge variant={getSignalBadgeVariant(entry.signal)}>
                      {t(`home.signals.${entry.signal}`)}
                    </Badge>
                  }
                />
              ))}
            </SectionCard>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}
