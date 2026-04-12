import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { PillSelector } from '@/components/pill-selector';
import { TradeSide, useTradeSubmission } from '@/hooks/use-trade-submission';

type TradeSheetParams = {
  price?: string | string[];
  side?: string | string[];
  signalDate?: string | string[];
  strategyId?: string | string[];
  strategyName?: string | string[];
  symbol?: string | string[];
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? '';
}

function formatSignalPrice(price: string) {
  const numericPrice = Number(price);
  return Number.isFinite(numericPrice) ? `¥${numericPrice.toFixed(2)}` : '--';
}

function formatSignalDate(signalDate: string) {
  if (!signalDate) {
    return '--';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(signalDate)) {
    return signalDate;
  }

  const parsedDate = new Date(signalDate);
  return Number.isNaN(parsedDate.getTime()) ? signalDate : parsedDate.toLocaleString();
}

export default function HomeSignalTradeSheet() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const params = useLocalSearchParams() as TradeSheetParams;
  const [tradeSide, setTradeSide] = useState<TradeSide>(
    getSingleParam(params.side) === 'sell' ? 'sell' : 'buy'
  );
  const [shares, setShares] = useState('100');
  const placeholderColor = colorScheme === 'light' ? '#6B6B7E' : '#8B8B9E';
  const reducedMotion = useReducedMotion();
  const symbol = getSingleParam(params.symbol);
  const strategyId = getSingleParam(params.strategyId);
  const strategyName = getSingleParam(params.strategyName);
  const signalDate = getSingleParam(params.signalDate);
  const price = getSingleParam(params.price);
  const displayStrategyName = strategyName || strategyId || '--';
  const { sheetError, setSheetError, submitTrade, submitting } = useTradeSubmission();
  const submitAccessibilityLabel =
    tradeSide === 'buy'
      ? t('accessibility.paperTrading.submitBuyTrade')
      : t('accessibility.paperTrading.submitSellTrade');

  return (
    <View className="flex-1 bg-surface">
      <View className="flex-1 gap-5 px-5 pt-4">
        <View className="gap-3 rounded-3xl bg-background px-4 py-4" style={{ borderCurve: 'continuous' }}>
          <Text className="text-sm font-medium text-secondary">
            {t('home.signals.tradeSheet.contextLabel')}
          </Text>
          <View className="gap-3">
            <Text className="text-lg font-semibold text-primary">{displayStrategyName}</Text>
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-xs text-secondary">
                  {t('home.signals.tradeSheet.signalDateLabel')}
                </Text>
                <Text className="text-sm text-primary">{formatSignalDate(signalDate)}</Text>
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-xs text-secondary">
                  {t('home.signals.tradeSheet.priceLabel')}
                </Text>
                <Text className="text-sm text-primary">{formatSignalPrice(price)}</Text>
              </View>
            </View>
          </View>
        </View>

        <PillSelector
          onChange={(value) => {
            setTradeSide(value);
            setSheetError(null);
          }}
          options={[
            { label: t('paperTrading.tradeSide.buy'), value: 'buy' },
            { label: t('paperTrading.tradeSide.sell'), value: 'sell' },
          ]}
          selectedValue={tradeSide}
        />

        <View className="gap-2">
          <Text className="text-sm font-medium text-secondary">
            {t('home.signals.tradeSheet.symbolLabel')}
          </Text>
          <View
            className="rounded-2xl border border-divider bg-background px-4 opacity-90"
            style={{ borderCurve: 'continuous', paddingVertical: 14 }}>
            <Text className="text-base text-primary" selectable>
              {symbol || '--'}
            </Text>
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-secondary">
            {t('paperTrading.tradeModal.shares')}
          </Text>
          <TextInput
            className="rounded-2xl border border-divider bg-background px-4 text-primary"
            keyboardType="number-pad"
            onChangeText={(value) => {
              setShares(value);
              setSheetError(null);
            }}
            placeholder={t('paperTrading.tradeModal.sharesPlaceholder')}
            placeholderTextColor={placeholderColor}
            style={{
              borderCurve: 'continuous',
              fontSize: 16,
              lineHeight: undefined,
              paddingVertical: 14,
            }}
            value={shares}
          />
        </View>

        {sheetError ? (
          <Animated.Text
            className="text-sm text-error"
            entering={reducedMotion ? undefined : FadeIn.duration(200)}
            exiting={reducedMotion ? undefined : FadeOut.duration(160)}
            selectable>
            {sheetError}
          </Animated.Text>
        ) : null}
      </View>

      <View className="flex-row gap-3 border-t border-divider px-5 pb-8 pt-4">
        <Pressable
          accessibilityLabel={t('accessibility.paperTrading.cancelTrade')}
          accessibilityRole="button"
          className="min-h-11 flex-1 items-center justify-center rounded-xl border border-divider px-4 py-3 active:opacity-80"
          onPress={() => router.back()}
          style={{ borderCurve: 'continuous' }}>
          <Text className="font-medium text-secondary">{t('paperTrading.tradeModal.cancel')}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={submitAccessibilityLabel}
          accessibilityRole="button"
          className={`min-h-11 flex-1 items-center justify-center rounded-xl px-4 py-3 ${
            submitting ? 'bg-accent/70' : 'bg-accent active:opacity-80'
          }`}
          disabled={submitting}
          onPress={() => {
            void submitTrade({
              onSuccess: () => router.back(),
              shares,
              side: tradeSide,
              symbol,
            });
          }}
          style={{ borderCurve: 'continuous' }}>
          <Text className="font-medium text-primary">
            {submitting
              ? t('paperTrading.tradeModal.submitting')
              : t(`paperTrading.tradeModal.confirm.${tradeSide}`)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
