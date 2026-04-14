import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { SkeletonBlock } from '@/components/skeleton-block';
import { Card } from '@/components/ui/card';
import { Body, Heading, Label } from '@/components/ui/typography';
import { getStrategies, type StrategyMeta } from '@/lib/api';
import { getStrategyDetailRoute } from '@/lib/routes';

export default function StrategyScreen() {
  const { t } = useTranslation();
  const [strategies, setStrategies] = useState<StrategyMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    async function loadStrategyMetadata() {
      try {
        const data = await getStrategies();
        if (cancelled) return;
        setStrategies(data);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : t('strategy.errors.load'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadStrategyMetadata();
    return () => {
      cancelled = true;
    };
  }, [t]);

  function getStrategyName(strategy: StrategyMeta) {
    return t(`strategy.strategies.${strategy.id}.name`, { defaultValue: strategy.name });
  }

  function getStrategyDescription(strategy: StrategyMeta) {
    return t(`strategy.strategies.${strategy.id}.description`, {
      defaultValue: strategy.description,
    });
  }

  async function handleStrategyPress(strategy: StrategyMeta) {
    if (process.env.EXPO_OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(getStrategyDetailRoute(strategy.id) as never);
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ gap: 24, paddingBottom: 32, paddingHorizontal: 20, paddingTop: 8 }}
      contentInsetAdjustmentBehavior="automatic">
      {loading ? (
        <>
          <SkeletonBlock className="h-4 w-64 rounded-full" />
          <View className="gap-3">
            {[0, 1].map((index) => (
              <Card
                key={`strategy-skeleton-${index}`}
                className="border border-divider px-card-x py-row-y"
                tone="raised">
                <SkeletonBlock className="h-6 w-36 rounded-full" />
                <SkeletonBlock className="mt-3 h-4 w-full rounded-full bg-background/70" />
                <SkeletonBlock className="mt-2 h-4 w-5/6 rounded-full bg-background/70" />
                <SkeletonBlock className="mt-4 h-4 w-24 rounded-full" />
              </Card>
            ))}
          </View>
        </>
      ) : (
        <>
          <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(220)}>
            <Body tone="secondary">{t('strategy.subtitle')}</Body>
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

          <View className="gap-3">
            {strategies.map((strategy, index) => {
              const strategyName = getStrategyName(strategy);
              return (
                <Animated.View
                  key={strategy.id}
                  entering={
                    reducedMotion ? undefined : FadeIn.duration(220).delay(Math.min(index * 40, 200))
                  }
                  layout={reducedMotion ? undefined : LinearTransition.duration(220)}>
                  <Pressable
                    accessibilityLabel={t('accessibility.strategy.selectStrategy', {
                      name: strategyName,
                    })}
                    accessibilityRole="button"
                    className="rounded-card border border-divider active:opacity-80"
                    onPress={() => {
                      void handleStrategyPress(strategy);
                    }}
                    style={{ borderCurve: 'continuous' }}>
                    <Card className="px-card-x py-row-y" tone="raised">
                      <Heading>{strategyName}</Heading>
                      <Body className="mt-2" tone="secondary">
                        {getStrategyDescription(strategy)}
                      </Body>
                      <Label className="mt-4" tone="accent">
                        {t('strategy.viewDetail')}
                      </Label>
                    </Card>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}
