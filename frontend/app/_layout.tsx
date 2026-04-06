import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import * as SystemUI from 'expo-system-ui';
import { useTranslation } from 'react-i18next';

import '@/lib/i18n';
import '../global.css';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const { t } = useTranslation();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync('#0F0F14');
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
