import { Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';

import { getThemedStackOptions } from '@/lib/navigation';

export default function StrategyStackLayout() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';

  return (
    <Stack screenOptions={getThemedStackOptions(isDark)}>
      <Stack.Screen name="index" options={{ title: t('strategy.title') }} />
    </Stack>
  );
}
