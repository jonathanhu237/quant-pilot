import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { PillSelector } from '@/components/pill-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/typography';
import { TradeSide, useTradeSubmission } from '@/hooks/use-trade-submission';

export default function NewTradeSheet() {
  const { t } = useTranslation();
  const [tradeSide, setTradeSide] = useState<TradeSide>('buy');
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
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
          <Label tone="secondary">{t('paperTrading.tradeModal.symbol')}</Label>
          <Input
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={(value) => {
              setSymbol(value);
              setSheetError(null);
            }}
            placeholder={t('paperTrading.tradeModal.symbolPlaceholder')}
            value={symbol}
          />
        </View>

        <View className="gap-2">
          <Label tone="secondary">{t('paperTrading.tradeModal.shares')}</Label>
          <Input
            keyboardType="number-pad"
            onChangeText={(value) => {
              setShares(value);
              setSheetError(null);
            }}
            placeholder={t('paperTrading.tradeModal.sharesPlaceholder')}
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
        <Button
          accessibilityLabel={t('accessibility.paperTrading.cancelTrade')}
          className="flex-1"
          onPress={() => router.back()}
          variant="secondary">
          {t('paperTrading.tradeModal.cancel')}
        </Button>
        <Button
          accessibilityLabel={submitAccessibilityLabel}
          className="flex-1"
          loading={submitting}
          onPress={() => {
            void submitTrade();
          }}>
          {submitting
            ? t('paperTrading.tradeModal.submitting')
            : t(`paperTrading.tradeModal.confirm.${tradeSide}`)}
        </Button>
      </View>
    </View>
  );
}
