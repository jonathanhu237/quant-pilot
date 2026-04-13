import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Stack } from 'expo-router/stack';

import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { setMarketSearchQuery } from '@/lib/market-search';
import { getThemedSheetOptions, getThemedStackOptions } from '@/lib/navigation';
import { MARKET_ADD_SYMBOL_ROUTE } from '@/lib/routes';
import { useAppTheme } from '@/lib/theme-context';

export default function MarketStackLayout() {
  const { t } = useTranslation();
  const { isDark, palette } = useAppTheme();

  return (
    <Stack screenOptions={getThemedStackOptions(isDark, true)}>
      <Stack.Screen
        name="index"
        options={{
          headerRight: () => (
            <Link href={MARKET_ADD_SYMBOL_ROUTE} asChild>
              <Button
                accessibilityLabel={t('accessibility.market.addSymbol')}
                leftIcon={<IconSymbol color={palette.onAccent} name="plus" size={18} />}
                square
              />
            </Link>
          ),
          headerSearchBarOptions: {
            autoCapitalize: 'none',
            onCancelButtonPress: () => {
              setMarketSearchQuery('');
            },
            onChangeText: (event) => {
              setMarketSearchQuery(event.nativeEvent.text);
            },
            placeholder: t('market.searchPlaceholder'),
          },
          title: t('market.title'),
        }}
      />
      <Stack.Screen
        name="add-symbol"
        options={getThemedSheetOptions(isDark, t('market.modalTitle'))}
      />
    </Stack>
  );
}
