import { Link } from 'expo-router';
import { Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import { Stack } from 'expo-router/stack';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { setMarketSearchQuery } from '@/lib/market-search';
import { getThemedSheetOptions, getThemedStackOptions } from '@/lib/navigation';

export default function MarketStackLayout() {
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
            <Link href="./add-symbol" asChild>
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
