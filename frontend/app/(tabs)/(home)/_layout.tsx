import { Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { colorScheme, useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
import i18n, { LANGUAGE_STORAGE_KEY } from '@/lib/i18n';
import { getThemedStackOptions } from '@/lib/navigation';
import { setPreference, THEME_STORAGE_KEY } from '@/lib/preferences';

export default function HomeStackLayout() {
  const { t } = useTranslation();
  const { colorScheme: currentColorScheme } = useColorScheme();
  const isDark = currentColorScheme !== 'light';
  const accentColor = '#5E6AD2';
  const nextLanguageLabel = i18n.language.toLowerCase().startsWith('zh')
    ? t('common.languageToggle.english')
    : t('common.languageToggle.chinese');

  async function toggleLanguage() {
    const nextLanguage = i18n.language.toLowerCase().startsWith('zh') ? 'en' : 'zh-CN';
    await i18n.changeLanguage(nextLanguage);
    await setPreference(LANGUAGE_STORAGE_KEY, nextLanguage);
  }

  async function toggleTheme() {
    const nextTheme = isDark ? 'light' : 'dark';
    colorScheme.set(nextTheme);
    await setPreference(THEME_STORAGE_KEY, nextTheme);
  }

  return (
    <Stack screenOptions={getThemedStackOptions(isDark)}>
      <Stack.Screen
        name="index"
        options={{
          headerLargeTitle: true,
          headerRight: () => (
            <View className="flex-row items-center gap-2">
              <Pressable
                className="h-11 min-w-11 items-center justify-center rounded-full bg-surface px-3 active:opacity-80"
                hitSlop={4}
                onPress={() => {
                  void toggleLanguage();
                }}
                style={{ borderCurve: 'continuous' }}>
                <Text className="text-sm font-semibold text-accent">{nextLanguageLabel}</Text>
              </Pressable>
              <Pressable
                className="h-11 w-11 items-center justify-center rounded-full bg-surface active:opacity-80"
                hitSlop={4}
                onPress={() => {
                  void toggleTheme();
                }}
                style={{ borderCurve: 'continuous' }}>
                <IconSymbol
                  color={accentColor}
                  name={isDark ? 'moon.fill' : 'sun.max.fill'}
                  size={16}
                />
              </Pressable>
            </View>
          ),
          title: t('home.title'),
        }}
      />
    </Stack>
  );
}
