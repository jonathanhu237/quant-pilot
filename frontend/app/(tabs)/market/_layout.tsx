import { Link } from 'expo-router';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Stack } from 'expo-router/stack';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { setMarketSearchQuery } from '@/lib/market-search';
import { getThemedSheetOptions, getThemedStackOptions } from '@/lib/navigation';
import { MARKET_ADD_SYMBOL_ROUTE } from '@/lib/routes';
import { useAppTheme } from '@/lib/theme-context';

export default function MarketStackLayout() {
  const { t } = useTranslation();
  const { isDark } = useAppTheme();

  return (
    <Stack screenOptions={getThemedStackOptions(isDark, true)}>
      <Stack.Screen
        name="index"
        options={{
          headerRight: () => (
            <Link href={MARKET_ADD_SYMBOL_ROUTE} asChild>
              <Pressable
                accessibilityLabel={t('accessibility.market.addSymbol')}
                accessibilityRole="button"
                className="h-11 w-11 items-center justify-center rounded-full bg-accent active:opacity-80"
                hitSlop={4}
                style={{ borderCurve: 'continuous' }}>
                <IconSymbol color="#FFFFFF" name="plus" size={18} />
              </Pressable>
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
