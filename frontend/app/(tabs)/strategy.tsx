import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
  };
}

function metricColorClass(value: number, kind: 'return' | 'drawdown' | 'neutral') {
  if (kind === 'neutral') {
    return 'text-primary';
  }

  if (value > 0) {
    return kind === 'drawdown' ? 'text-down' : 'text-up';
  }

  if (value < 0) {
    return kind === 'drawdown' ? 'text-up' : 'text-down';
  }

  return 'text-secondary';
}

export default function StrategyScreen() {
  const insets = useSafeAreaInsets();
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
        strategy_id: selectedStrategy.id,
        symbol: symbol.trim(),
        start_date: range.start_date,
        end_date: range.end_date,
        params: nextParams,
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
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}>
      <View className="px-5">
        <Text className="text-3xl font-bold text-primary">{t('strategy.title')}</Text>
        <Text className="mt-2 text-sm leading-5 text-secondary">{t('strategy.subtitle')}</Text>

        {error ? <Text className="mt-4 text-sm text-error">{error}</Text> : null}

        <View className="mt-6 gap-3">
          {strategies.map((strategy) => {
            const selected = strategy.id === selectedStrategyId;
            return (
              <Pressable
                key={strategy.id}
                className={`rounded-3xl border px-4 py-4 ${
                  selected ? 'border-accent bg-surface' : 'border-divider bg-surface/70'
                }`}
                onPress={() => selectStrategy(strategy)}>
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
            );
          })}
        </View>

        {selectedStrategy ? (
          <View className="mt-6 rounded-3xl border border-divider bg-surface px-4 py-5">
            <Text className="text-xl font-semibold text-primary">
              {t('strategy.configureTitle', {
                name: getStrategyName(selectedStrategy),
              })}
            </Text>

            <View className="mt-5">
              <Text className="text-sm font-medium text-secondary">
                {t('strategy.symbolLabel')}
              </Text>
              <TextInput
                className="mt-2 rounded-2xl border border-divider bg-background px-4 text-base text-primary"
                    style={{ height: 48, paddingTop: 0, paddingBottom: 0 }}
                    textAlignVertical="center"
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={(value) => {
                  setSymbol(value);
                  setError(null);
                }}
                placeholder={t('strategy.symbolPlaceholder')}
                placeholderTextColor={placeholderColor}
                value={symbol}
              />
            </View>

            <View className="mt-5">
              <Text className="text-sm font-medium text-secondary">
                {t('strategy.rangeLabel')}
              </Text>
              <View className="mt-2 flex-row gap-2">
                {RANGE_OPTIONS.map((range) => {
                  const selected = range === selectedRange;
                  return (
                    <Pressable
                      key={range}
                      className={`rounded-full px-4 py-2 ${
                        selected ? 'bg-accent' : 'bg-background'
                      }`}
                      onPress={() => {
                        setSelectedRange(range);
                        setError(null);
                      }}>
                      <Text className={selected ? 'font-medium text-primary' : 'font-medium text-secondary'}>
                        {t(`strategy.ranges.${range}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
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
                    className="mt-2 rounded-2xl border border-divider bg-background px-4 text-base text-primary"
                    style={{ height: 48, paddingTop: 0, paddingBottom: 0 }}
                    textAlignVertical="center"
                    keyboardType="numeric"
                    onChangeText={(value) => updateParam(definition.name, value)}
                    value={params[definition.name] ?? String(definition.default)}
                  />
                </View>
              ))}
            </View>

            <Pressable
              className={`mt-6 items-center rounded-2xl px-4 py-4 ${
                running ? 'bg-accent/70' : 'bg-accent active:opacity-80'
              }`}
              disabled={running}
              onPress={() => {
                void handleRunBacktest();
              }}>
              <Text className="text-base font-semibold text-primary">
                {running ? t('strategy.running') : t('strategy.run')}
              </Text>
            </Pressable>

            {result ? (
              <View className="mt-6">
                <Text className="text-lg font-semibold text-primary">
                  {t('strategy.resultsTitle')}
                </Text>
                <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
                  <View className="w-[48%] rounded-2xl bg-background px-4 py-4">
                    <Text className="text-sm text-secondary">
                      {t('strategy.metrics.annualReturn')}
                    </Text>
                    <Text
                      className={`mt-2 text-xl font-semibold ${metricColorClass(
                        result.annual_return,
                        'return'
                      )}`}>
                      {formatPercent(result.annual_return)}
                    </Text>
                  </View>
                  <View className="w-[48%] rounded-2xl bg-background px-4 py-4">
                    <Text className="text-sm text-secondary">
                      {t('strategy.metrics.maxDrawdown')}
                    </Text>
                    <Text
                      className={`mt-2 text-xl font-semibold ${metricColorClass(
                        result.max_drawdown,
                        'drawdown'
                      )}`}>
                      {formatPercent(result.max_drawdown)}
                    </Text>
                  </View>
                  <View className="w-[48%] rounded-2xl bg-background px-4 py-4">
                    <Text className="text-sm text-secondary">
                      {t('strategy.metrics.winRate')}
                    </Text>
                    <Text className="mt-2 text-xl font-semibold text-primary">
                      {formatWinRate(result.win_rate)}
                    </Text>
                  </View>
                  <View className="w-[48%] rounded-2xl bg-background px-4 py-4">
                    <Text className="text-sm text-secondary">
                      {t('strategy.metrics.sharpeRatio')}
                    </Text>
                    <Text className="mt-2 text-xl font-semibold text-primary">
                      {formatSharpe(result.sharpe_ratio)}
                    </Text>
                  </View>
                </View>

                <Text className="mt-4 text-sm text-secondary">
                  {t('strategy.metrics.totalTrades')}: {result.total_trades}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
