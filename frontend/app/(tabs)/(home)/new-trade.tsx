import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { PillSelector } from '@/components/pill-selector';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Body, Caption, Label, Title } from '@/components/ui/typography';
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
  const params = useLocalSearchParams() as TradeSheetParams;
  const [tradeSide, setTradeSide] = useState<TradeSide>(
    getSingleParam(params.side) === 'sell' ? 'sell' : 'buy'
  );
  const [shares, setShares] = useState('100');
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
        <Card className="gap-3 px-card-x py-row-y" tone="subtle">
          <Label tone="secondary">{t('home.signals.tradeSheet.contextLabel')}</Label>
          <View className="gap-3">
            <Title className="text-heading">{displayStrategyName}</Title>
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1">
                <Caption tone="secondary">{t('home.signals.tradeSheet.signalDateLabel')}</Caption>
                <Body>{formatSignalDate(signalDate)}</Body>
              </View>
              <View className="flex-1 gap-1">
                <Caption tone="secondary">{t('home.signals.tradeSheet.priceLabel')}</Caption>
                <Body>{formatSignalPrice(price)}</Body>
              </View>
            </View>
          </View>
        </Card>

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
          <Label tone="secondary">{t('home.signals.tradeSheet.symbolLabel')}</Label>
          <Card className="border border-divider px-field-x py-field-y opacity-90" tone="subtle">
            <Body selectable>{symbol || '--'}</Body>
          </Card>
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
            void submitTrade({
              onSuccess: () => router.back(),
              shares,
              side: tradeSide,
              symbol,
            });
          }}>
          {submitting
            ? t('paperTrading.tradeModal.submitting')
            : t(`paperTrading.tradeModal.confirm.${tradeSide}`)}
        </Button>
      </View>
    </View>
  );
}
