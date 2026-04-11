import { Link } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import { Stack } from 'expo-router/stack';

import { getThemedSheetOptions, getThemedStackOptions } from '@/lib/navigation';

export default function PaperTradingStackLayout() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';

  return (
    <Stack screenOptions={getThemedStackOptions(isDark)}>
      <Stack.Screen
        name="index"
        options={{
          headerLargeTitle: true,
          headerRight: () => (
            <Link href="./new-trade" asChild>
              <Pressable
                className="min-h-11 items-center justify-center rounded-full bg-accent px-4 py-2 active:opacity-80"
                hitSlop={4}
                style={{ borderCurve: 'continuous' }}>
                <Text className="text-sm font-semibold text-primary">
                  {t('paperTrading.tradeButton')}
                </Text>
              </Pressable>
            </Link>
          ),
          title: t('paperTrading.title'),
        }}
      />
      <Stack.Screen
        name="new-trade"
        options={getThemedSheetOptions(isDark, t('paperTrading.tradeModal.title'))}
      />
    </Stack>
  );
}
