import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';

import { NumericText } from '@/components/numeric-text';
import { PillSelector } from '@/components/pill-selector';
import { SectionCard } from '@/components/section-card';
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
  const { colorScheme } = useColorScheme();
  const [strategies, setStrategies] = useState<StrategyMeta[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [symbol, setSymbol] = useState('600519');
  const [selectedRange, setSelectedRange] = useState<RangeOption>('1y');
  const [params, setParams] = useState<Record<string, string>>({});
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accentColor = '#5E6AD2';
  const placeholderColor = colorScheme === 'light' ? '#6B6B7E' : '#8B8B9E';

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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={accentColor} />
        <Text className="mt-3 text-base text-secondary">{t('strategy.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 32 }}
      contentInsetAdjustmentBehavior="automatic">
      <View className="gap-6 px-5 pb-8 pt-2">
        <Animated.View entering={FadeIn.duration(220)}>
          <Text className="text-sm leading-6 text-secondary">{t('strategy.subtitle')}</Text>
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

        <View className="gap-3">
          {strategies.map((strategy, index) => {
            const selected = strategy.id === selectedStrategyId;

            return (
              <Animated.View
                key={strategy.id}
                entering={FadeIn.duration(220).delay(Math.min(index * 40, 180))}
                layout={LinearTransition.duration(220)}>
                <Pressable
                  className={`rounded-3xl border px-4 py-4 active:opacity-80 ${
                    selected ? 'border-accent bg-surface' : 'border-divider bg-surface/70'
                  }`}
                  onPress={() => selectStrategy(strategy)}
                  style={{ borderCurve: 'continuous' }}>
                  <Text className="text-lg font-semibold text-primary">
                    {getStrategyName(strategy)}
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-secondary">
                    {getStrategyDescription(strategy)}
                  </Text>
                  <Text className="mt-4 text-sm font-medium text-accent">
                    {t('strategy.runBacktest')}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {selectedStrategy ? (
          <Animated.View entering={FadeIn.duration(240).delay(40)}>
            <SectionCard
              bodyClassName="px-4 py-5"
              title={t('strategy.configureTitle', {
                name: getStrategyName(selectedStrategy),
              })}>
              <View>
                <Text className="text-sm font-medium text-secondary">{t('strategy.symbolLabel')}</Text>
                <TextInput
                  className="mt-2 rounded-2xl border border-divider bg-background px-4 text-primary"
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={(value) => {
                    setSymbol(value);
                    setError(null);
                  }}
                  placeholder={t('strategy.symbolPlaceholder')}
                  placeholderTextColor={placeholderColor}
                  style={{
                    borderCurve: 'continuous',
                    fontSize: 16,
                    lineHeight: undefined,
                    paddingVertical: 14,
                  }}
                  value={symbol}
                />
              </View>

              <View className="mt-5">
                <Text className="text-sm font-medium text-secondary">{t('strategy.rangeLabel')}</Text>
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
                <Text className="text-sm font-medium text-secondary">
                  {t('strategy.parametersLabel')}
                </Text>
                {selectedStrategy.parameters.map((definition) => (
                  <View key={definition.name}>
                    <Text className="text-sm text-secondary">
                      {getParameterLabel(selectedStrategy.id, definition.name)}
                    </Text>
                    <TextInput
                      className="mt-2 rounded-2xl border border-divider bg-background px-4 text-primary"
                      keyboardType="numeric"
                      onChangeText={(value) => updateParam(definition.name, value)}
                      style={{
                        borderCurve: 'continuous',
                        fontSize: 16,
                        lineHeight: undefined,
                        paddingVertical: 14,
                      }}
                      value={params[definition.name] ?? String(definition.default)}
                    />
                  </View>
                ))}
              </View>

              <Pressable
                className={`mt-6 min-h-11 items-center justify-center rounded-2xl px-4 py-4 ${
                  running ? 'bg-accent/70' : 'bg-accent active:opacity-80'
                }`}
                disabled={running}
                onPress={() => {
                  void handleRunBacktest();
                }}
                style={{ borderCurve: 'continuous' }}>
                <Text className="text-base font-semibold text-primary">
                  {running ? t('strategy.running') : t('strategy.run')}
                </Text>
              </Pressable>
            </SectionCard>
          </Animated.View>
        ) : null}

        {result ? (
          <Animated.View entering={FadeIn.duration(240)} exiting={FadeOut.duration(180)}>
            <SectionCard bodyClassName="px-4 py-5" title={t('strategy.resultsTitle')}>
              <View className="flex-row flex-wrap justify-between gap-y-3">
                <View
                  className="w-[48%] rounded-2xl bg-background px-4 py-4"
                  style={{ borderCurve: 'continuous' }}>
                  <Text className="text-sm text-secondary">{t('strategy.metrics.annualReturn')}</Text>
                  <NumericText
                    className="mt-2 text-xl font-semibold"
                    toneValue={metricTone(result.annual_return, 'return')}>
                    {formatPercent(result.annual_return)}
                  </NumericText>
                </View>
                <View
                  className="w-[48%] rounded-2xl bg-background px-4 py-4"
                  style={{ borderCurve: 'continuous' }}>
                  <Text className="text-sm text-secondary">{t('strategy.metrics.maxDrawdown')}</Text>
                  <NumericText
                    className="mt-2 text-xl font-semibold"
                    toneValue={metricTone(result.max_drawdown, 'drawdown')}>
                    {formatPercent(result.max_drawdown)}
                  </NumericText>
                </View>
                <View
                  className="w-[48%] rounded-2xl bg-background px-4 py-4"
                  style={{ borderCurve: 'continuous' }}>
                  <Text className="text-sm text-secondary">{t('strategy.metrics.winRate')}</Text>
                  <NumericText className="mt-2 text-xl font-semibold text-primary">
                    {formatWinRate(result.win_rate)}
                  </NumericText>
                </View>
                <View
                  className="w-[48%] rounded-2xl bg-background px-4 py-4"
                  style={{ borderCurve: 'continuous' }}>
                  <Text className="text-sm text-secondary">{t('strategy.metrics.sharpeRatio')}</Text>
                  <NumericText className="mt-2 text-xl font-semibold text-primary">
                    {formatSharpe(result.sharpe_ratio)}
                  </NumericText>
                </View>
              </View>

              <View className="mt-4 flex-row items-center gap-2">
                <Text className="text-sm text-secondary">{t('strategy.metrics.totalTrades')}</Text>
                <NumericText className="text-base font-semibold text-primary">
                  {result.total_trades}
                </NumericText>
              </View>
            </SectionCard>
          </Animated.View>
        ) : null}
      </View>
    </ScrollView>
  );
}
