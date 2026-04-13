import { useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { NumericText } from '@/components/numeric-text';
import { PillSelector } from '@/components/pill-selector';
import { SectionCard } from '@/components/section-card';
import { SkeletonBlock } from '@/components/skeleton-block';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Body, Heading, Label } from '@/components/ui/typography';
import {
  getStrategies,
  runBacktest,
  type BacktestResult,
  type StrategyMeta,
  type StrategyParameterDefinition,
} from '@/lib/api';

type RangeOption = '1y' | '3y' | '5y';

const RANGE_OPTIONS: RangeOption[] = ['1y', '3y', '5y'];

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDateRange(range: RangeOption) {
  const endDate = new Date();
  const startDate = new Date(endDate);

  if (range === '1y') {
    startDate.setFullYear(endDate.getFullYear() - 1);
  } else if (range === '3y') {
    startDate.setFullYear(endDate.getFullYear() - 3);
  } else {
    startDate.setFullYear(endDate.getFullYear() - 5);
  }

  return {
    end_date: formatDate(endDate),
    start_date: formatDate(startDate),
  };
}

function metricTone(value: number, kind: 'drawdown' | 'neutral' | 'return') {
  if (kind === 'neutral') {
    return undefined;
  }

  if (kind === 'drawdown') {
    return value === 0 ? 0 : -value;
  }

  return value;
}

export default function StrategyScreen() {
  const { t } = useTranslation();
  const [strategies, setStrategies] = useState<StrategyMeta[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [symbol, setSymbol] = useState('600519');
  const [selectedRange, setSelectedRange] = useState<RangeOption>('1y');
  const [params, setParams] = useState<Record<string, string>>({});
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  async function triggerSuccessHaptic() {
    if (process.env.EXPO_OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  useEffect(() => {
    async function loadStrategyMetadata() {
      try {
        const data = await getStrategies();
        setStrategies(data);

        if (data.length > 0) {
          setSelectedStrategyId(data[0].id);
          setParams(
            Object.fromEntries(
              data[0].parameters.map((definition) => [definition.name, String(definition.default)])
            )
          );
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : t('strategy.errors.load'));
      } finally {
        setLoading(false);
      }
    }

    void loadStrategyMetadata();
  }, [t]);

  const selectedStrategy = useMemo(
    () => strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null,
    [selectedStrategyId, strategies]
  );

  function selectStrategy(strategy: StrategyMeta) {
    setSelectedStrategyId(strategy.id);
    setParams(
      Object.fromEntries(
        strategy.parameters.map((definition) => [definition.name, String(definition.default)])
      )
    );
    setResult(null);
    setError(null);
  }

  function getStrategyName(strategy: StrategyMeta) {
    return t(`strategy.strategies.${strategy.id}.name`, { defaultValue: strategy.name });
  }

  function getStrategyDescription(strategy: StrategyMeta) {
    return t(`strategy.strategies.${strategy.id}.description`, {
      defaultValue: strategy.description,
    });
  }

  function getParameterLabel(strategyId: string, parameterName: string) {
    return t(`strategy.strategies.${strategyId}.params.${parameterName}`, {
      defaultValue: parameterName,
    });
  }

  function updateParam(name: string, value: string) {
    setParams((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function normalizeParams(definitions: StrategyParameterDefinition[]) {
    const normalized: Record<string, number> = {};

    for (const definition of definitions) {
      const rawValue = params[definition.name] ?? String(definition.default);
      const parsed =
        definition.type === 'integer' ? Number.parseInt(rawValue, 10) : Number.parseFloat(rawValue);

      if (!Number.isFinite(parsed)) {
        throw new Error(
          t('strategy.errors.invalidParam', {
            param: getParameterLabel(selectedStrategy?.id ?? '', definition.name),
          })
        );
      }

      normalized[definition.name] = parsed;
    }

    return normalized;
  }

  async function handleRunBacktest() {
    if (!selectedStrategy) {
      return;
    }

    if (!/^\d{6}$/.test(symbol.trim())) {
      setError(t('strategy.errors.invalidSymbol'));
      return;
    }

    setRunning(true);
    setError(null);

    try {
      const nextParams = normalizeParams(selectedStrategy.parameters);
      const range = getDateRange(selectedRange);
      const nextResult = await runBacktest({
        end_date: range.end_date,
        params: nextParams,
        start_date: range.start_date,
        strategy_id: selectedStrategy.id,
        symbol: symbol.trim(),
      });
      setResult(nextResult);
      await triggerSuccessHaptic();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : t('strategy.errors.run'));
    } finally {
      setRunning(false);
    }
  }

  function formatPercent(value: number) {
    return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
  }

  function formatWinRate(value: number) {
    return `${(value * 100).toFixed(2)}%`;
  }

  function formatSharpe(value: number) {
    return value.toFixed(2);
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
              const selected = strategy.id === selectedStrategyId;
              const strategyName = getStrategyName(strategy);

              return (
                <Animated.View
                  key={strategy.id}
                  entering={reducedMotion ? undefined : FadeIn.duration(220).delay(Math.min(index * 40, 180))}
                  layout={reducedMotion ? undefined : LinearTransition.duration(220)}>
                  <Pressable
                    accessibilityLabel={t('accessibility.strategy.selectStrategy', {
                      name: strategyName,
                    })}
                    accessibilityRole="button"
                    className={`rounded-card border active:opacity-80 ${
                      selected ? 'border-accent' : 'border-divider'
                    }`}
                    onPress={() => selectStrategy(strategy)}
                    style={{ borderCurve: 'continuous' }}>
                    <Card
                      className="px-card-x py-row-y"
                      tone={selected ? 'default' : 'raised'}>
                      <Heading>{strategyName}</Heading>
                      <Body className="mt-2" tone="secondary">
                        {getStrategyDescription(strategy)}
                      </Body>
                      <Label className="mt-4" tone="accent">
                        {t('strategy.runBacktest')}
                      </Label>
                    </Card>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          {selectedStrategy ? (
            <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(240).delay(40)}>
              <SectionCard
                bodyClassName="px-card-x py-card-y"
                title={t('strategy.configureTitle', {
                  name: getStrategyName(selectedStrategy),
                })}>
                <View>
                  <Label tone="secondary">{t('strategy.symbolLabel')}</Label>
                  <Input
                    className="mt-2"
                    keyboardType="number-pad"
                    maxLength={6}
                    onChangeText={(value) => {
                      setSymbol(value);
                      setError(null);
                    }}
                    placeholder={t('strategy.symbolPlaceholder')}
                    value={symbol}
                  />
                </View>

                <View className="mt-5">
                  <Label tone="secondary">{t('strategy.rangeLabel')}</Label>
                  <PillSelector
                    className="mt-2"
                    onChange={(range) => {
                      setSelectedRange(range);
                      setError(null);
                    }}
                    options={RANGE_OPTIONS.map((range) => ({
                      label: t(`strategy.ranges.${range}`),
                      value: range,
                    }))}
                    selectedValue={selectedRange}
                  />
                </View>

                <View className="mt-5 gap-4">
                  <Label tone="secondary">{t('strategy.parametersLabel')}</Label>
                  {selectedStrategy.parameters.map((definition) => (
                    <View key={definition.name}>
                      <Label tone="secondary">
                        {getParameterLabel(selectedStrategy.id, definition.name)}
                      </Label>
                      <Input
                        className="mt-2"
                        keyboardType="numeric"
                        onChangeText={(value) => updateParam(definition.name, value)}
                        value={params[definition.name] ?? String(definition.default)}
                      />
                    </View>
                  ))}
                </View>

                <Button
                  accessibilityLabel={t('accessibility.strategy.runBacktest')}
                  className="mt-6"
                  loading={running}
                  onPress={() => {
                    void handleRunBacktest();
                  }}>
                  {running ? t('strategy.running') : t('strategy.run')}
                </Button>
              </SectionCard>
            </Animated.View>
          ) : null}

          {result ? (
            <Animated.View
              entering={reducedMotion ? undefined : FadeIn.duration(240)}
              exiting={reducedMotion ? undefined : FadeOut.duration(180)}>
              <SectionCard bodyClassName="px-card-x py-card-y" title={t('strategy.resultsTitle')}>
                <View className="flex-row flex-wrap justify-between gap-y-3">
                  <Card className="w-[48%] px-card-x py-row-y" tone="subtle">
                    <Label tone="secondary">{t('strategy.metrics.annualReturn')}</Label>
                    <NumericText
                      className="mt-2 text-title font-semibold"
                      toneValue={metricTone(result.annual_return, 'return')}>
                      {formatPercent(result.annual_return)}
                    </NumericText>
                  </Card>
                  <Card className="w-[48%] px-card-x py-row-y" tone="subtle">
                    <Label tone="secondary">{t('strategy.metrics.maxDrawdown')}</Label>
                    <NumericText
                      className="mt-2 text-title font-semibold"
                      toneValue={metricTone(result.max_drawdown, 'drawdown')}>
                      {formatPercent(result.max_drawdown)}
                    </NumericText>
                  </Card>
                  <Card className="w-[48%] px-card-x py-row-y" tone="subtle">
                    <Label tone="secondary">{t('strategy.metrics.winRate')}</Label>
                    <NumericText className="mt-2 text-title font-semibold text-primary">
                      {formatWinRate(result.win_rate)}
                    </NumericText>
                  </Card>
                  <Card className="w-[48%] px-card-x py-row-y" tone="subtle">
                    <Label tone="secondary">{t('strategy.metrics.sharpeRatio')}</Label>
                    <NumericText className="mt-2 text-title font-semibold text-primary">
                      {formatSharpe(result.sharpe_ratio)}
                    </NumericText>
                  </Card>
                </View>

                <View className="mt-4 flex-row items-center gap-2">
                  <Label tone="secondary">{t('strategy.metrics.totalTrades')}</Label>
                  <NumericText className="text-body font-semibold text-primary">
                    {result.total_trades}
                  </NumericText>
                </View>
              </SectionCard>
            </Animated.View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
