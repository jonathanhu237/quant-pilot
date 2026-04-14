import { Stack, useLocalSearchParams } from 'expo-router';
import { startTransition, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CandlestickChart, LineChart } from 'react-native-wagmi-charts';

import { NumericText } from '@/components/numeric-text';
import { PillSelector } from '@/components/pill-selector';
import { SkeletonBlock } from '@/components/skeleton-block';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ListRow } from '@/components/ui/list-row';
import { Body, Caption, Heading, Title } from '@/components/ui/typography';
import {
  addToWatchlist,
  getKline,
  getQuotes,
  getWatchlist,
  removeFromWatchlist,
  type KlineRange,
  type KlineResponse,
  type StockQuote,
} from '@/lib/api';
import { useAppTheme } from '@/lib/theme-context';

const MAIN_CHART_HEIGHT = 260;
const RSI_CHART_HEIGHT = 160;
const UP_COLOR = '#FF4D4D';
const DOWN_COLOR = '#00C48C';
const RANGE_OPTIONS: KlineRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

type BasicInfoRow = {
  label: string;
  value: string;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
}

function toTimestamp(dateValue: string) {
  return new Date(`${dateValue}T00:00:00+08:00`).getTime();
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }

  return `¥${value.toFixed(2)}`;
}

function formatSignedNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export default function MarketDetailScreen() {
  const { t } = useTranslation();
  const { palette } = useAppTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ symbol?: string | string[] }>();
  const symbol = getSingleParam(params.symbol).trim();
  const chartWidth = Math.max(width - 72, 240);
  const [selectedRange, setSelectedRange] = useState<KlineRange>('1M');
  const [kline, setKline] = useState<KlineResponse | null>(null);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      if (!symbol) {
        if (active) {
          setError(t('market.errors.detailLoad'));
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      const [klineResult, quoteResult, watchlistResult] = await Promise.allSettled([
        getKline(symbol, selectedRange),
        getQuotes([symbol]),
        getWatchlist(),
      ]);

      if (!active) {
        return;
      }

      if (klineResult.status === 'rejected') {
        setError(
          klineResult.reason instanceof Error ? klineResult.reason.message : t('market.errors.detailLoad')
        );
        setKline(null);
        setQuote(null);
        setLoading(false);
        return;
      }

      setKline(klineResult.value);
      setQuote(quoteResult.status === 'fulfilled' ? (quoteResult.value[0] ?? null) : null);
      if (watchlistResult.status === 'fulfilled') {
        setIsWatchlisted(watchlistResult.value.includes(symbol));
      }
      setLoading(false);
    }

    void loadDetail();

    return () => {
      active = false;
    };
  }, [reloadToken, selectedRange, symbol, t]);

  const displayName = quote?.name ?? kline?.name ?? symbol;
  const headerTitle = loading || displayName === symbol ? symbol : `${symbol} ${displayName}`;

  const candleData = useMemo(
    () =>
      (kline?.bars ?? []).map((bar) => ({
        close: bar.close,
        high: bar.high,
        low: bar.low,
        open: bar.open,
        timestamp: toTimestamp(bar.date),
      })),
    [kline?.bars]
  );

  const xDomain = useMemo<[number, number] | undefined>(() => {
    if (candleData.length === 0) {
      return undefined;
    }

    return [candleData[0].timestamp, candleData[candleData.length - 1].timestamp];
  }, [candleData]);

  const maChartData = useMemo(() => {
    if (!kline) {
      return {
        ma20: [],
        ma5: [],
        ma60: [],
      };
    }

    return {
      ma5: kline.bars.flatMap((bar, index) =>
        kline.ma5[index] === null
          ? []
          : [{ timestamp: toTimestamp(bar.date), value: kline.ma5[index] as number }]
      ),
      ma20: kline.bars.flatMap((bar, index) =>
        kline.ma20[index] === null
          ? []
          : [{ timestamp: toTimestamp(bar.date), value: kline.ma20[index] as number }]
      ),
      ma60: kline.bars.flatMap((bar, index) =>
        kline.ma60[index] === null
          ? []
          : [{ timestamp: toTimestamp(bar.date), value: kline.ma60[index] as number }]
      ),
    };
  }, [kline]);

  const rsiChartData = useMemo(
    () =>
      kline?.bars.flatMap((bar, index) =>
        kline.rsi14[index] === null
          ? []
          : [{ timestamp: toTimestamp(bar.date), value: kline.rsi14[index] as number }]
      ) ?? [],
    [kline]
  );

  const rsiXDomain = useMemo<[number, number] | undefined>(() => {
    if (rsiChartData.length === 0) {
      return undefined;
    }
    return [rsiChartData[0].timestamp, rsiChartData[rsiChartData.length - 1].timestamp];
  }, [rsiChartData]);

  const candleYRange = useMemo(() => {
    if (!kline || kline.bars.length === 0) {
      return { max: 100, min: 0 };
    }

    const highs = kline.bars.map((bar) => bar.high);
    const lows = kline.bars.map((bar) => bar.low);
    const min = Math.min(...lows);
    const max = Math.max(...highs);

    return {
      max: max * 1.01,
      min: min * 0.99,
    };
  }, [kline]);

  const basicInfoRows = useMemo<BasicInfoRow[]>(
    () => [
      {
        label: t('market.detail.stats.prevClose'),
        value: formatCurrency(kline?.basic_info.prev_close),
      },
      {
        label: t('market.detail.stats.open'),
        value: formatCurrency(kline?.basic_info.open),
      },
      {
        label: t('market.detail.stats.high'),
        value: formatCurrency(kline?.basic_info.high),
      },
      {
        label: t('market.detail.stats.low'),
        value: formatCurrency(kline?.basic_info.low),
      },
    ],
    [kline, t]
  );

  async function toggleWatchlist() {
    if (!symbol) {
      return;
    }

    setWatchlistLoading(true);
    setError(null);

    try {
      if (isWatchlisted) {
        await removeFromWatchlist(symbol);
        setIsWatchlisted(false);
      } else {
        await addToWatchlist(symbol);
        setIsWatchlisted(true);
      }
    } catch (watchlistError) {
      setError(watchlistError instanceof Error ? watchlistError.message : t('market.errors.detailLoad'));
    } finally {
      setWatchlistLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLargeTitle: false,
          headerRight: () => (
            <Button
              accessibilityLabel={
                isWatchlisted
                  ? t('accessibility.market.removeDetailSymbol', { symbol })
                  : t('accessibility.market.addDetailSymbol', { symbol })
              }
              leftIcon={
                <IconSymbol
                  color={palette.accent}
                  name={isWatchlisted ? 'checkmark' : 'plus'}
                  size={18}
                />
              }
              loading={watchlistLoading}
              onPress={() => {
                void toggleWatchlist();
              }}
              square
              variant="secondary"
            />
          ),
          title: headerTitle,
        }}
      />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ gap: 20, paddingBottom: 32, paddingHorizontal: 20, paddingTop: 8 }}
        contentInsetAdjustmentBehavior="automatic">
        {loading ? (
          <>
            <Card className="gap-4 px-card-x py-card-y">
              <SkeletonBlock className="h-4 w-28 rounded-full" />
              <SkeletonBlock className="h-12 w-44 rounded-full" />
              <SkeletonBlock className="h-5 w-36 rounded-full" />
              <View className="flex-row flex-wrap gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <SkeletonBlock className="h-16 flex-1 rounded-card" key={`detail-stat-${index}`} />
                ))}
              </View>
            </Card>
            <Card className="gap-4 px-card-x py-card-y">
              <SkeletonBlock className="h-11 w-full rounded-full" />
              <SkeletonBlock className="h-64 w-full rounded-card" />
              <SkeletonBlock className="h-40 w-full rounded-card" />
            </Card>
          </>
        ) : error ? (
          <Card className="gap-4 px-card-x py-10">
            <Body className="text-center" selectable tone="error">
              {error}
            </Body>
            <View className="items-center">
              <Button
                onPress={() => {
                  setReloadToken((value) => value + 1);
                }}
                variant="secondary">
                {t('market.detail.retry')}
              </Button>
            </View>
          </Card>
        ) : kline ? (
          <>
            <Card className="gap-5 px-card-x py-card-y">
              <View className="gap-1">
                <Title>{displayName}</Title>
                <Body selectable tone="secondary">
                  {symbol}
                </Body>
              </View>

              <View className="gap-2">
                <NumericText className="text-display font-bold text-primary">
                  {quote?.price === null || quote?.price === undefined
                    ? t('market.detail.priceUnavailable')
                    : formatCurrency(quote.price)}
                </NumericText>
                <View className="flex-row items-center gap-3">
                  <NumericText className="text-title font-semibold" toneValue={quote?.change_pct}>
                    {formatSignedNumber(quote?.change_amount)}
                  </NumericText>
                  <NumericText className="text-body font-medium" toneValue={quote?.change_pct}>
                    {formatPercent(quote?.change_pct)}
                  </NumericText>
                </View>
              </View>

              <View className="flex-row flex-wrap gap-3">
                {basicInfoRows.map((row) => (
                  <View className="min-w-[140px] flex-1 rounded-card bg-background px-4 py-3" key={row.label}>
                    <Caption tone="secondary">{row.label}</Caption>
                    <NumericText className="pt-1 text-body font-semibold text-primary">
                      {row.value}
                    </NumericText>
                  </View>
                ))}
              </View>
            </Card>

            <Card className="gap-4 px-card-x py-card-y">
              <Heading>{t('market.detail.chartTitle')}</Heading>
              <PillSelector
                onChange={(value) => {
                  startTransition(() => {
                    setSelectedRange(value);
                  });
                }}
                options={RANGE_OPTIONS.map((rangeOption) => ({
                  label:
                    rangeOption === '1M'
                      ? t('market.detail.range.oneMonth')
                      : rangeOption === '3M'
                        ? t('market.detail.range.threeMonths')
                        : rangeOption === '6M'
                          ? t('market.detail.range.sixMonths')
                          : rangeOption === '1Y'
                            ? t('market.detail.range.oneYear')
                            : t('market.detail.range.all'),
                  value: rangeOption,
                }))}
                selectedValue={selectedRange}
              />

              <View className="gap-3">
                <View className="flex-row flex-wrap gap-3">
                  <Caption tone="secondary">{t('market.detail.legend.ma5')}</Caption>
                  <Caption tone="secondary">{t('market.detail.legend.ma20')}</Caption>
                  <Caption tone="secondary">{t('market.detail.legend.ma60')}</Caption>
                </View>

                <View className="overflow-hidden rounded-card bg-background/70">
                  <View style={{ height: MAIN_CHART_HEIGHT, width: chartWidth }}>
                    <CandlestickChart.Provider data={candleData}>
                      <CandlestickChart height={MAIN_CHART_HEIGHT} width={chartWidth}>
                        <CandlestickChart.Candles negativeColor={DOWN_COLOR} positiveColor={UP_COLOR} />
                        <CandlestickChart.Crosshair color={palette.secondary} />
                      </CandlestickChart>
                    </CandlestickChart.Provider>
                    {xDomain && maChartData.ma5.length > 1 ? (
                      <LineChart.Provider
                        data={maChartData.ma5}
                        xDomain={xDomain}
                        yRange={candleYRange}>
                        <LineChart
                          absolute
                          height={MAIN_CHART_HEIGHT}
                          pointerEvents="none"
                          style={{ left: 0, top: 0 }}
                          width={chartWidth}>
                          <LineChart.Path color="#F59E0B" width={2} />
                        </LineChart>
                      </LineChart.Provider>
                    ) : null}
                    {xDomain && maChartData.ma20.length > 1 ? (
                      <LineChart.Provider
                        data={maChartData.ma20}
                        xDomain={xDomain}
                        yRange={candleYRange}>
                        <LineChart
                          absolute
                          height={MAIN_CHART_HEIGHT}
                          pointerEvents="none"
                          style={{ left: 0, top: 0 }}
                          width={chartWidth}>
                          <LineChart.Path color={palette.accent} width={2} />
                        </LineChart>
                      </LineChart.Provider>
                    ) : null}
                    {xDomain && maChartData.ma60.length > 1 ? (
                      <LineChart.Provider
                        data={maChartData.ma60}
                        xDomain={xDomain}
                        yRange={candleYRange}>
                        <LineChart
                          absolute
                          height={MAIN_CHART_HEIGHT}
                          pointerEvents="none"
                          style={{ left: 0, top: 0 }}
                          width={chartWidth}>
                          <LineChart.Path color={palette.primary} width={2} />
                        </LineChart>
                      </LineChart.Provider>
                    ) : null}
                  </View>
                </View>

                {rsiChartData.length > 1 && rsiXDomain ? (
                  <View className="gap-2">
                    <Caption tone="secondary">{t('market.detail.legend.rsi14')}</Caption>
                    <View className="overflow-hidden rounded-card bg-background/70">
                      <LineChart.Provider
                        data={rsiChartData}
                        xDomain={rsiXDomain}
                        yRange={{ max: 100, min: 0 }}>
                        <LineChart height={RSI_CHART_HEIGHT} width={chartWidth}>
                          <LineChart.Path color={palette.accent} width={2}>
                            <LineChart.HorizontalLine
                              at={{ value: 30 }}
                              color={DOWN_COLOR}
                              lineProps={{ strokeDasharray: '4 4', strokeWidth: 1.5 }}
                            />
                            <LineChart.HorizontalLine
                              at={{ value: 70 }}
                              color={UP_COLOR}
                              lineProps={{ strokeDasharray: '4 4', strokeWidth: 1.5 }}
                            />
                          </LineChart.Path>
                          <LineChart.CursorCrosshair color={palette.secondary} />
                        </LineChart>
                      </LineChart.Provider>
                    </View>
                  </View>
                ) : null}
              </View>
            </Card>

            <Card>
              <View className="px-4 pt-5">
                <Heading>{t('market.detail.basicInfoTitle')}</Heading>
              </View>
              <View className="pb-1">
                {basicInfoRows.map((row, index) => (
                  <ListRow
                    align="center"
                    isFirst={index === 0}
                    key={`basic-info-${row.label}`}
                    leading={<Body tone="secondary">{row.label}</Body>}
                    trailing={
                      <NumericText className="text-body font-semibold text-primary">
                        {row.value}
                      </NumericText>
                    }
                  />
                ))}
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}
