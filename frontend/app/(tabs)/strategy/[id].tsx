import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { LineChart } from 'react-native-wagmi-charts';

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
import { useAppTheme } from '@/lib/theme-context';

const UP_COLOR = '#FF4D4D';
const DOWN_COLOR = '#00C48C';
const EQUITY_CHART_HEIGHT = 220;

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

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
}

function toTimestamp(dateValue: string) {
  return new Date(`${dateValue}T00:00:00+08:00`).getTime();
}

export default function StrategyDetailScreen() {
  const { t } = useTranslation();
  const { palette } = useAppTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const strategyId = getSingleParam(params.id);
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(width - 80, 240);

  const [strategies, setStrategies] = useState<StrategyMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState('600519');
  const [selectedRange, setSelectedRange] = useState<RangeOption>('1y');
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const strategy = useMemo(
    () => strategies.find((item) => item.id === strategyId) ?? null,
    [strategies, strategyId]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadStrategyMetadata() {
      try {
        const data = await getStrategies();
        if (cancelled) return;
        setStrategies(data);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : t('strategy.errors.load'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadStrategyMetadata();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (strategy) {
      setParamValues(
        Object.fromEntries(
          strategy.parameters.map((definition) => [definition.name, String(definition.default)])
        )
      );
    }
  }, [strategy]);

  async function triggerSuccessHaptic() {
    if (process.env.EXPO_OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  function getStrategyName(meta: StrategyMeta) {
    return t(`strategy.strategies.${meta.id}.name`, { defaultValue: meta.name });
  }

  function getStrategyDescription(meta: StrategyMeta) {
    return t(`strategy.strategies.${meta.id}.description`, {
      defaultValue: meta.description,
    });
  }

  function getParameterLabel(parameterName: string) {
    if (!strategy) return parameterName;
    return t(`strategy.strategies.${strategy.id}.params.${parameterName}`, {
      defaultValue: parameterName,
    });
  }

  function updateParam(name: string, value: string) {
    setParamValues((current) => ({ ...current, [name]: value }));
  }

  function normalizeParams(definitions: StrategyParameterDefinition[]) {
    const normalized: Record<string, number> = {};
    for (const definition of definitions) {
      const rawValue = paramValues[definition.name] ?? String(definition.default);
      const parsed =
        definition.type === 'integer' ? Number.parseInt(rawValue, 10) : Number.parseFloat(rawValue);

      if (!Number.isFinite(parsed)) {
        throw new Error(
          t('strategy.errors.invalidParam', {
            param: getParameterLabel(definition.name),
          })
        );
      }
      normalized[definition.name] = parsed;
    }
    return normalized;
  }

  async function handleRunBacktest() {
    if (!strategy) return;

    if (!/^\d{6}$/.test(symbol.trim())) {
      setRunError(t('strategy.errors.invalidSymbol'));
      return;
    }

    setRunning(true);
    setRunError(null);

    try {
      const nextParams = normalizeParams(strategy.parameters);
      const range = getDateRange(selectedRange);
      const nextResult = await runBacktest({
        end_date: range.end_date,
        params: nextParams,
        start_date: range.start_date,
        strategy_id: strategy.id,
        symbol: symbol.trim(),
      });
      setResult(nextResult);
      await triggerSuccessHaptic();
    } catch (error) {
      setRunError(error instanceof Error ? error.message : t('strategy.errors.run'));
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

  const equityChartData = useMemo(() => {
    if (!result) return [];
    return result.equity_curve.map((point) => ({
      timestamp: toTimestamp(point.date),
      value: point.value,
    }));
  }, [result]);

  const headerTitle = strategy ? getStrategyName(strategy) : strategyId;
  const lineColor = result && result.annual_return >= 0 ? UP_COLOR : DOWN_COLOR;

  return (
    <>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ gap: 24, paddingBottom: 32, paddingHorizontal: 20, paddingTop: 8 }}
        contentInsetAdjustmentBehavior="automatic">
        {loading ? (
          <View className="gap-3">
            <SkeletonBlock className="h-6 w-48 rounded-full" />
            <SkeletonBlock className="h-4 w-full rounded-full" />
            <SkeletonBlock className="h-4 w-5/6 rounded-full" />
          </View>
        ) : loadError ? (
          <Body className="text-error" selectable>
            {loadError}
          </Body>
        ) : !strategy ? (
          <Body className="text-error" selectable>
            {t('strategy.errors.notFound')}
          </Body>
        ) : (
          <>
            <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(220)}>
              <Card className="px-card-x py-card-y" tone="raised">
                <Heading>{getStrategyName(strategy)}</Heading>
                <Body className="mt-2" tone="secondary">
                  {getStrategyDescription(strategy)}
                </Body>
              </Card>
            </Animated.View>

            {runError ? (
              <Animated.Text
                className="text-sm text-error"
                entering={reducedMotion ? undefined : FadeIn.duration(200)}
                exiting={reducedMotion ? undefined : FadeOut.duration(160)}
                selectable>
                {runError}
              </Animated.Text>
            ) : null}

            <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(240).delay(40)}>
              <SectionCard
                bodyClassName="px-card-x py-card-y"
                title={t('strategy.configureTitle', { name: getStrategyName(strategy) })}>
                <View>
                  <Label tone="secondary">{t('strategy.symbolLabel')}</Label>
                  <Input
                    className="mt-2"
                    keyboardType="number-pad"
                    maxLength={6}
                    onChangeText={(value) => {
                      setSymbol(value);
                      setRunError(null);
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
                      setRunError(null);
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
                  {strategy.parameters.map((definition) => (
                    <View key={definition.name}>
                      <Label tone="secondary">{getParameterLabel(definition.name)}</Label>
                      <Input
                        className="mt-2"
                        keyboardType="numeric"
                        onChangeText={(value) => updateParam(definition.name, value)}
                        value={paramValues[definition.name] ?? String(definition.default)}
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

                  {result.equity_curve.length > 1 ? (
                    <View className="mt-5">
                      <Label tone="secondary">{t('strategy.metrics.equityCurve')}</Label>
                      <View className="mt-2 overflow-hidden rounded-card bg-background/70">
                        <LineChart.Provider data={equityChartData}>
                          <LineChart height={EQUITY_CHART_HEIGHT} width={chartWidth}>
                            <LineChart.Path color={lineColor} width={2} />
                            <LineChart.CursorCrosshair color={palette.secondary} />
                          </LineChart>
                        </LineChart.Provider>
                      </View>
                    </View>
                  ) : null}
                </SectionCard>
              </Animated.View>
            ) : null}

            {result ? (
              <Animated.View
                entering={reducedMotion ? undefined : FadeIn.duration(240).delay(60)}
                exiting={reducedMotion ? undefined : FadeOut.duration(180)}>
                <SectionCard bodyClassName="px-card-x py-card-y" title={t('strategy.tradesTitle')}>
                  {result.trades.length === 0 ? (
                    <Body className="py-4 text-center" tone="secondary">
                      {t('strategy.tradesEmpty')}
                    </Body>
                  ) : (
                    <View className="gap-3">
                      {result.trades.map((trade, index) => (
                        <View
                          key={`${trade.entry_date}-${trade.exit_date}-${index}`}
                          className={
                            index === 0
                              ? 'pb-3'
                              : 'border-t border-divider pt-3 pb-3'
                          }>
                          <View className="flex-row items-center justify-between">
                            <View className="gap-1">
                              <Label tone="secondary">{t('strategy.trade.entry')}</Label>
                              <Body weight="semibold">{trade.entry_date}</Body>
                              <NumericText className="text-label text-secondary">
                                {trade.entry_price.toFixed(2)}
                              </NumericText>
                            </View>
                            <View className="items-end gap-1">
                              <Label tone="secondary">{t('strategy.trade.exit')}</Label>
                              <Body weight="semibold">{trade.exit_date}</Body>
                              <NumericText className="text-label text-secondary">
                                {trade.exit_price.toFixed(2)}
                              </NumericText>
                            </View>
                          </View>
                          <View className="mt-3 flex-row items-center justify-between">
                            <Label tone="secondary">{t('strategy.trade.return')}</Label>
                            <NumericText
                              className="text-body font-semibold"
                              toneValue={trade.return_pct}>
                              {formatPercent(trade.return_pct)}
                            </NumericText>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </SectionCard>
              </Animated.View>
            ) : null}
          </>
        )}
      </ScrollView>
    </>
  );
}
