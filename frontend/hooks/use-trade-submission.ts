import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

import { buyStock, sellStock } from '@/lib/api';

export type TradeSide = 'buy' | 'sell';

type TradeErrorCode = 'insufficient_cash' | 'insufficient_position' | 'quote_unavailable';

type TradeApiError = Error & {
  code?: string;
};

type TradeSubmissionInput = {
  onSuccess?: () => void | Promise<void>;
  shares: string;
  side: TradeSide;
  symbol: string;
};

type TradeSubmissionOptions = Partial<TradeSubmissionInput>;

function isTradeErrorCode(code: string | undefined): code is TradeErrorCode {
  return (
    code === 'insufficient_cash' ||
    code === 'insufficient_position' ||
    code === 'quote_unavailable'
  );
}

async function triggerSuccessHaptic() {
  if (Platform.OS === 'ios') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

async function triggerErrorHaptic() {
  if (Platform.OS === 'ios') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

export function useTradeSubmission(options: TradeSubmissionOptions = {}) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  async function submitTrade(input?: TradeSubmissionInput) {
    const side = input?.side ?? options.side ?? 'buy';
    const symbol = (input?.symbol ?? options.symbol ?? '').trim();
    const shares = (input?.shares ?? options.shares ?? '').trim();
    const onSuccess = input?.onSuccess ?? options.onSuccess;
    const shareCount = Number.parseInt(shares, 10);

    if (!/^\d{6}$/.test(symbol)) {
      setSheetError(t('paperTrading.errors.invalidSymbol'));
      return;
    }

    if (!Number.isFinite(shareCount) || shareCount <= 0) {
      setSheetError(t('paperTrading.errors.invalidShares'));
      return;
    }

    setSubmitting(true);
    setSheetError(null);

    try {
      if (side === 'buy') {
        await buyStock({ shares: shareCount, symbol });
      } else {
        await sellStock({ shares: shareCount, symbol });
      }

      await triggerSuccessHaptic();
      await onSuccess?.();
    } catch (tradeError) {
      const errorCode =
        tradeError instanceof Error ? (tradeError as TradeApiError).code : undefined;

      if (isTradeErrorCode(errorCode)) {
        setSheetError(t(`paperTrading.errors.${errorCode}`));
      } else {
        setSheetError(t('paperTrading.errors.trade'));
      }

      await triggerErrorHaptic();
    } finally {
      setSubmitting(false);
    }
  }

  return {
    setSheetError,
    sheetError,
    submitTrade,
    submitting,
  };
}
