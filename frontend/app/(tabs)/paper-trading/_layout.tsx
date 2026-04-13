import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Stack } from 'expo-router/stack';

import { Button } from '@/components/ui/button';
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
              <Button
                accessibilityLabel={t('accessibility.paperTrading.openTradeSheet')}
                textTone="accent"
                variant="secondary">
                {t('paperTrading.tradeButton')}
              </Button>
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
