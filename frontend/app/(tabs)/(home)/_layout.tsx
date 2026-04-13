import { Stack } from 'expo-router/stack';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import i18n, { LANGUAGE_STORAGE_KEY } from '@/lib/i18n';
import { getThemedSheetOptions, getThemedStackOptions } from '@/lib/navigation';
import { setPreference } from '@/lib/preferences';
import { useAppTheme } from '@/lib/theme-context';

export default function HomeStackLayout() {
  const { t } = useTranslation();
  const { isDark, palette, toggleTheme } = useAppTheme();
  const nextLanguageLabel = i18n.language.toLowerCase().startsWith('zh')
    ? t('common.languageToggle.english')
    : t('common.languageToggle.chinese');
  const languageAccessibilityLabel = i18n.language.toLowerCase().startsWith('zh')
    ? t('accessibility.home.switchToEnglish')
    : t('accessibility.home.switchToChinese');
  const themeAccessibilityLabel = isDark
    ? t('accessibility.home.switchToLightTheme')
    : t('accessibility.home.switchToDarkTheme');

  async function toggleLanguage() {
    const nextLanguage = i18n.language.toLowerCase().startsWith('zh') ? 'en' : 'zh-CN';
    await i18n.changeLanguage(nextLanguage);
    await setPreference(LANGUAGE_STORAGE_KEY, nextLanguage);
  }

  return (
    <Stack screenOptions={getThemedStackOptions(isDark, true)}>
      <Stack.Screen
        name="index"
        options={{
          headerRight: () => (
            <View className="flex-row items-center gap-2">
              <Button
                accessibilityLabel={languageAccessibilityLabel}
                textTone="accent"
                variant="secondary"
                onPress={() => {
                  void toggleLanguage();
                }}>
                {nextLanguageLabel}
              </Button>
              <Button
                accessibilityLabel={themeAccessibilityLabel}
                leftIcon={
                  <IconSymbol
                    color={palette.accent}
                    name={isDark ? 'moon.fill' : 'sun.max.fill'}
                    size={16}
                  />
                }
                square
                variant="secondary"
                onPress={() => {
                  toggleTheme();
                }}
              />
            </View>
          ),
          title: t('home.title'),
        }}
      />
      <Stack.Screen
        name="new-trade"
        options={getThemedSheetOptions(isDark, t('home.signals.tradeSheet.title'))}
      />
      <Stack.Screen
        name="signal-history"
        options={getThemedSheetOptions(isDark, t('home.signals.history.title'))}
      />
    </Stack>
  );
}
