import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { addToWatchlist } from '@/lib/api';
import { useAppTheme } from '@/lib/theme-context';

export default function AddSymbolSheet() {
  const { t } = useTranslation();
  const { palette } = useAppTheme();
  const [newSymbol, setNewSymbol] = useState('');
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const placeholderColor = palette.placeholder;
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
        <Text className="text-sm leading-6 text-secondary">{t('market.subtitle')}</Text>
        <TextInput
          className="rounded-2xl border border-divider bg-background px-4 text-primary"
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={(value) => {
            setNewSymbol(value);
            if (sheetError) {
              setSheetError(null);
            }
          }}
          placeholder={t('market.symbolPlaceholder')}
          placeholderTextColor={placeholderColor}
          style={{ borderCurve: 'continuous', fontSize: 16, lineHeight: undefined, paddingVertical: 14 }}
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
        <Pressable
          accessibilityLabel={t('accessibility.market.cancelAddSymbol')}
          accessibilityRole="button"
          className="min-h-11 flex-1 items-center justify-center rounded-xl border border-divider px-4 py-3 active:opacity-80"
          onPress={() => router.back()}
          style={{ borderCurve: 'continuous' }}>
          <Text className="font-medium text-secondary">{t('market.cancel')}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t('accessibility.market.confirmAddSymbol')}
          accessibilityRole="button"
          className={`min-h-11 flex-1 items-center justify-center rounded-xl px-4 py-3 ${
            submitting ? 'bg-accent/70' : 'bg-accent active:opacity-80'
          }`}
          disabled={submitting}
          onPress={() => {
            void handleAddSymbol();
          }}
          style={{ borderCurve: 'continuous' }}>
          <Text className="font-medium text-primary">
            {submitting ? t('market.adding') : t('market.add')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
