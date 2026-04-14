import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router/stack';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import * as SystemUI from 'expo-system-ui';
import { vars } from 'nativewind';
import { useTranslation } from 'react-i18next';

import i18n, { LANGUAGE_STORAGE_KEY, normalizeLanguageTag } from '@/lib/i18n';
import { getPreference, setPreference, THEME_STORAGE_KEY } from '@/lib/preferences';
import { AppThemeProvider } from '@/lib/theme-context';
import {
  getThemePalette,
  getThemeVariables,
  getToggledThemeMode,
  normalizeThemeMode,
  type ThemeMode,
} from '@/lib/theme';
import '../global.css';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const { t } = useTranslation();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
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
        setThemeModeState(normalizeThemeMode(storedTheme));
      } finally {
        setIsAppReady(true);
      }
    }

    void restorePreferences();
  }, []);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(getThemePalette(themeMode).background);
  }, [themeMode]);

  function setThemeMode(nextTheme: ThemeMode) {
    setThemeModeState(nextTheme);
    void setPreference(THEME_STORAGE_KEY, nextTheme);
  }

  function toggleTheme() {
    setThemeModeState((currentTheme) => {
      const nextTheme = getToggledThemeMode(currentTheme);
      void setPreference(THEME_STORAGE_KEY, nextTheme);
      return nextTheme;
    });
  }

  if (!isAppReady) {
    return null;
  }

  const isDark = themeMode === 'dark';
  const palette = getThemePalette(themeMode);
  const themeVars = vars(getThemeVariables(themeMode));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider
        value={{
          isDark,
          palette,
          setThemeMode,
          themeMode,
          toggleTheme,
        }}>
        <View collapsable={false} style={[{ flex: 1 }, themeVars]}>
          <Stack
            screenOptions={{
              contentStyle: {
                backgroundColor: palette.background,
              },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: 'modal', title: t('modal.title') }}
            />
          </Stack>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </View>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}
