import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import * as SystemUI from 'expo-system-ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

import i18n, { LANGUAGE_STORAGE_KEY, normalizeLanguageTag } from '@/lib/i18n';
import '../global.css';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const { t } = useTranslation();
  const [isLanguageReady, setIsLanguageReady] = useState(false);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync('#0F0F14');
  }, []);

  useEffect(() => {
    async function restoreLanguagePreference() {
      try {
        const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (storedLanguage) {
          const nextLanguage = normalizeLanguageTag(storedLanguage);
          if (nextLanguage !== i18n.language) {
            await i18n.changeLanguage(nextLanguage);
          }
        }
      } finally {
        setIsLanguageReady(true);
      }
    }

    void restoreLanguagePreference();
  }, []);

  const theme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: '#5E6AD2',
      background: '#0F0F14',
      card: '#0F0F14',
      text: '#FFFFFF',
      border: 'rgba(255,255,255,0.08)',
      notification: '#FF4D4D',
    },
  };

  if (!isLanguageReady) {
    return null;
  }

  return (
    <ThemeProvider value={theme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: t('modal.title') }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
