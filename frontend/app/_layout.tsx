import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import * as SystemUI from 'expo-system-ui';
import { colorScheme, useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';

import i18n, { LANGUAGE_STORAGE_KEY, normalizeLanguageTag } from '@/lib/i18n';
import { getPreference } from '@/lib/preferences';
import '../global.css';

export const unstable_settings = {
  anchor: '(tabs)',
};

const THEME_STORAGE_KEY = 'quantpilot.theme';

export default function RootLayout() {
  const { t } = useTranslation();
  const { colorScheme: currentColorScheme } = useColorScheme();
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    async function restorePreferences() {
      try {
        const storedLanguage = await getPreference(LANGUAGE_STORAGE_KEY);
        if (storedLanguage) {
          const nextLanguage = normalizeLanguageTag(storedLanguage);
          if (nextLanguage !== i18n.language) {
            await i18n.changeLanguage(nextLanguage);
          }
        }

        const storedTheme = await getPreference(THEME_STORAGE_KEY);
        if (storedTheme === 'light' || storedTheme === 'dark') {
          colorScheme.set(storedTheme);
        } else {
          colorScheme.set('dark');
        }
      } finally {
        setIsAppReady(true);
      }
    }

    void restorePreferences();
  }, []);

  useEffect(() => {
    const backgroundColor = currentColorScheme === 'light' ? '#F5F5F7' : '#0F0F14';
    void SystemUI.setBackgroundColorAsync(backgroundColor);
  }, [currentColorScheme]);

  const isDark = currentColorScheme !== 'light';
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const theme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: '#5E6AD2',
      background: isDark ? '#0F0F14' : '#F5F5F7',
      card: isDark ? '#0F0F14' : '#F5F5F7',
      text: isDark ? '#FFFFFF' : '#0F0F14',
      border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      notification: '#FF4D4D',
    },
  };

  if (!isAppReady) {
    return null;
  }

  return (
    <View className={`flex-1 ${isDark ? 'dark' : ''}`}>
      <ThemeProvider value={theme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: 'modal', title: t('modal.title') }}
          />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeProvider>
    </View>
  );
}
