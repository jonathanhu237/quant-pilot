import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { PillSelector } from '@/components/pill-selector';
import { TradeSide, useTradeSubmission } from '@/hooks/use-trade-submission';

export default function NewTradeSheet() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const [tradeSide, setTradeSide] = useState<TradeSide>('buy');
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const placeholderColor = colorScheme === 'light' ? '#6B6B7E' : '#8B8B9E';
  const reducedMotion = useReducedMotion();
  const { sheetError, setSheetError, submitTrade, submitting } = useTradeSubmission({
    onSuccess: () => router.back(),
    shares,
    side: tradeSide,
    symbol,
  });
  const submitAccessibilityLabel =
    tradeSide === 'buy'
      ? t('accessibility.paperTrading.submitBuyTrade')
      : t('accessibility.paperTrading.submitSellTrade');

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
