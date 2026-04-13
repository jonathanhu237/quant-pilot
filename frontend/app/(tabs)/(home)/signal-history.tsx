import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { SectionCard } from '@/components/section-card';
import { SkeletonBlock } from '@/components/skeleton-block';
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

function getSignalLabelClass(signal: SignalHistoryEntry['signal']) {
  return signal === 'buy'
    ? 'text-up'
    : signal === 'sell'
      ? 'text-down'
      : 'text-secondary';
}

function getSignalDotClass(signal: SignalHistoryEntry['signal']) {
  return signal === 'buy'
    ? 'bg-up'
    : signal === 'sell'
      ? 'bg-down'
      : 'bg-secondary';
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
        <Text className="text-3xl font-semibold text-primary" numberOfLines={2}>
          {displayName}
        </Text>
        {symbol ? (
          <Text className="text-sm tracking-[0.24em] text-secondary" selectable>
            {symbol}
          </Text>
        ) : null}
      </Animated.View>

      {loading ? (
        <View className="gap-4">
          <View className="rounded-3xl bg-surface" style={{ borderCurve: 'continuous' }}>
            <View className="gap-2 px-4 pt-5">
              <SkeletonBlock className="h-6 w-40 rounded-full bg-background/70" />
              <SkeletonBlock className="h-4 w-52 rounded-full bg-background/70" />
            </View>
            <View className="pb-1">
              {[0, 1, 2].map((index) => (
                <View
                  key={`history-skeleton-${index}`}
                  className={`flex-row items-center justify-between px-4 py-4 ${
                    index === 0 ? '' : 'border-t border-divider'
                  }`}>
                  <SkeletonBlock className="h-4 w-28 rounded-full bg-background/70" />
                  <View className="flex-row items-center gap-2">
                    <SkeletonBlock className="h-2.5 w-2.5 rounded-full bg-background/70" />
                    <SkeletonBlock className="h-4 w-16 rounded-full bg-background/70" />
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View className="rounded-3xl bg-surface" style={{ borderCurve: 'continuous' }}>
            <View className="gap-2 px-4 pt-5">
              <SkeletonBlock className="h-6 w-36 rounded-full bg-background/70" />
              <SkeletonBlock className="h-4 w-48 rounded-full bg-background/70" />
            </View>
            <View className="pb-1">
              {[0, 1, 2].map((index) => (
                <View
                  key={`history-skeleton-secondary-${index}`}
                  className={`flex-row items-center justify-between px-4 py-4 ${
                    index === 0 ? '' : 'border-t border-divider'
                  }`}>
                  <SkeletonBlock className="h-4 w-28 rounded-full bg-background/70" />
                  <View className="flex-row items-center gap-2">
                    <SkeletonBlock className="h-2.5 w-2.5 rounded-full bg-background/70" />
                    <SkeletonBlock className="h-4 w-16 rounded-full bg-background/70" />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : error ? (
        <View className="rounded-3xl bg-surface px-4 py-10" style={{ borderCurve: 'continuous' }}>
          <Text className="text-center text-base text-error" selectable>
            {error}
          </Text>
        </View>
      ) : sections.length === 0 ? (
        <View className="rounded-3xl bg-surface px-4 py-10" style={{ borderCurve: 'continuous' }}>
          <Text className="text-center text-base text-secondary">
            {t('home.signals.history.empty')}
          </Text>
        </View>
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
                <View
                  key={`${section.strategyId}-${entry.signal_date}-${entryIndex}`}
                  className={`flex-row items-center justify-between px-4 py-4 ${
                    entryIndex === 0 ? '' : 'border-t border-divider'
                  }`}>
                  <Text className="text-sm text-secondary" selectable>
                    {formatHistoryDate(entry.signal_date)}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <View className={`h-2.5 w-2.5 rounded-full ${getSignalDotClass(entry.signal)}`} />
                    <Text className={`text-sm font-medium ${getSignalLabelClass(entry.signal)}`}>
                      {t(`home.signals.${entry.signal}`)}
                    </Text>
                  </View>
                </View>
              ))}
            </SectionCard>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}
