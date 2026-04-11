import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import { Stack } from 'expo-router/stack';

import { getThemedStackOptions } from '@/lib/navigation';

export default function StrategyStackLayout() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';

  return (
    <Stack screenOptions={getThemedStackOptions(isDark)}>
      <Stack.Screen
        name="index"
        options={{ headerLargeTitle: true, title: t('strategy.title') }}
      />
    </Stack>
  );
}
