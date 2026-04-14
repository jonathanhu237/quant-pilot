import { useTranslation } from 'react-i18next';
import { Stack } from 'expo-router/stack';

import { getThemedStackOptions } from '@/lib/navigation';
import { useAppTheme } from '@/lib/theme-context';

export default function StrategyStackLayout() {
  const { t } = useTranslation();
  const { isDark } = useAppTheme();

  return (
    <Stack screenOptions={getThemedStackOptions(isDark, true)}>
      <Stack.Screen name="index" options={{ title: t('strategy.title') }} />
      <Stack.Screen name="[id]" options={{ headerLargeTitle: false, title: '' }} />
    </Stack>
  );
}
