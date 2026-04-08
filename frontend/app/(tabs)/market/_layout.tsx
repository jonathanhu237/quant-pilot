import { Stack, router } from 'expo-router';
import { Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';

import { IconSymbol } from '@/components/ui/icon-symbol';
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
          headerRight: () => (
            <Pressable
              className="h-11 w-11 items-center justify-center rounded-full bg-accent active:opacity-80"
              hitSlop={4}
              onPress={() => router.push('./add-symbol')}
              style={{ borderCurve: 'continuous' }}>
              <IconSymbol color="#FFFFFF" name="plus" size={18} />
            </Pressable>
          ),
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
