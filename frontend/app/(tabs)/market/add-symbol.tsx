import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Body } from '@/components/ui/typography';
import { addToWatchlist } from '@/lib/api';

export default function AddSymbolSheet() {
  const { t } = useTranslation();
  const [newSymbol, setNewSymbol] = useState('');
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const reducedMotion = useReducedMotion();

  async function triggerSuccessHaptic() {
    if (process.env.EXPO_OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  async function handleAddSymbol() {
    const symbol = newSymbol.trim();

    if (!/^\d{6}$/.test(symbol)) {
      setSheetError(t('market.invalidSymbol'));
      return;
    }

    setSheetError(null);
    setSubmitting(true);

    try {
      await addToWatchlist(symbol);
      await triggerSuccessHaptic();
      router.back();
    } catch (submitError) {
      setSheetError(submitError instanceof Error ? submitError.message : t('market.errors.add'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-surface">
      <View className="flex-1 gap-5 px-5 pt-4">
        <Body tone="secondary">{t('market.subtitle')}</Body>
        <Input
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={(value) => {
            setNewSymbol(value);
            if (sheetError) {
              setSheetError(null);
            }
          }}
          placeholder={t('market.symbolPlaceholder')}
          value={newSymbol}
        />
        {sheetError ? (
          <Animated.Text
            className="mt-4 text-sm text-error"
            entering={reducedMotion ? undefined : FadeIn.duration(200)}
            exiting={reducedMotion ? undefined : FadeOut.duration(160)}
            selectable>
            {sheetError}
          </Animated.Text>
        ) : null}
      </View>

      <View className="flex-row gap-3 border-t border-divider px-5 pb-8 pt-4">
        <Button
          accessibilityLabel={t('accessibility.market.cancelAddSymbol')}
          className="flex-1"
          onPress={() => router.back()}
          variant="secondary">
          {t('market.cancel')}
        </Button>
        <Button
          accessibilityLabel={t('accessibility.market.confirmAddSymbol')}
          className="flex-1"
          loading={submitting}
          onPress={() => {
            void handleAddSymbol();
          }}>
          {submitting ? t('market.adding') : t('market.add')}
        </Button>
      </View>
    </View>
  );
}
