import { Link } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stack } from 'expo-router/stack';

import { getThemedSheetOptions, getThemedStackOptions } from '@/lib/navigation';
import { PAPER_TRADING_NEW_TRADE_ROUTE } from '@/lib/routes';
import { useAppTheme } from '@/lib/theme-context';

export default function PaperTradingStackLayout() {
  const { t } = useTranslation();
  const { isDark } = useAppTheme();

  return (
    <Stack screenOptions={getThemedStackOptions(isDark, true)}>
      <Stack.Screen
        name="index"
        options={{
          headerRight: () => (
            <Link href={PAPER_TRADING_NEW_TRADE_ROUTE} asChild>
              <Pressable
                accessibilityLabel={t('accessibility.paperTrading.openTradeSheet')}
                accessibilityRole="button"
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
