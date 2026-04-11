import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { PillSelector } from '@/components/pill-selector';
import { buyStock, sellStock } from '@/lib/api';

type TradeSide = 'buy' | 'sell';
type TradeErrorCode = 'insufficient_cash' | 'insufficient_position' | 'quote_unavailable';
type TradeApiError = Error & { code?: string };

function isTradeErrorCode(code: string | undefined): code is TradeErrorCode {
  return (
    code === 'insufficient_cash' ||
    code === 'insufficient_position' ||
    code === 'quote_unavailable'
  );
}

export default function NewTradeSheet() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const [submitting, setSubmitting] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [tradeSide, setTradeSide] = useState<TradeSide>('buy');
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const placeholderColor = colorScheme === 'light' ? '#6B6B7E' : '#8B8B9E';
  const reducedMotion = useReducedMotion();
  const submitAccessibilityLabel =
    tradeSide === 'buy'
      ? t('accessibility.paperTrading.submitBuyTrade')
      : t('accessibility.paperTrading.submitSellTrade');

  async function triggerSuccessHaptic() {
    if (process.env.EXPO_OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  async function triggerErrorHaptic() {
    if (process.env.EXPO_OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  async function submitTrade() {
    const normalizedSymbol = symbol.trim();
    const parsedShares = Number.parseInt(shares.trim(), 10);

    if (!/^\d{6}$/.test(normalizedSymbol)) {
      setSheetError(t('paperTrading.errors.invalidSymbol'));
      return;
    }

    if (!Number.isFinite(parsedShares) || parsedShares <= 0) {
      setSheetError(t('paperTrading.errors.invalidShares'));
      return;
    }

    setSubmitting(true);
    setSheetError(null);

    try {
      if (tradeSide === 'buy') {
        await buyStock({ shares: parsedShares, symbol: normalizedSymbol });
      } else {
        await sellStock({ shares: parsedShares, symbol: normalizedSymbol });
      }

      await triggerSuccessHaptic();
      router.back();
    } catch (tradeError) {
      const errorCode =
        tradeError instanceof Error ? (tradeError as TradeApiError).code : undefined;

      await triggerErrorHaptic();

      if (isTradeErrorCode(errorCode)) {
        setSheetError(t(`paperTrading.errors.${errorCode}`));
      } else {
        setSheetError(t('paperTrading.errors.trade'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-surface">
      <View className="flex-1 gap-5 px-5 pt-4">
        <PillSelector
          onChange={setTradeSide}
          options={[
            { label: t('paperTrading.tradeSide.buy'), value: 'buy' },
            { label: t('paperTrading.tradeSide.sell'), value: 'sell' },
          ]}
          selectedValue={tradeSide}
        />

        <View className="gap-2">
          <Text className="text-sm font-medium text-secondary">
            {t('paperTrading.tradeModal.symbol')}
          </Text>
          <TextInput
            className="rounded-2xl border border-divider bg-background px-4 text-primary"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={(value) => {
              setSymbol(value);
              setSheetError(null);
            }}
            placeholder={t('paperTrading.tradeModal.symbolPlaceholder')}
            placeholderTextColor={placeholderColor}
            style={{ borderCurve: 'continuous', fontSize: 16, lineHeight: undefined, paddingVertical: 14 }}
            value={symbol}
          />
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
            style={{ borderCurve: 'continuous', fontSize: 16, lineHeight: undefined, paddingVertical: 14 }}
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
            void submitTrade();
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
