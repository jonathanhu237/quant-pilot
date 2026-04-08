import { Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme !== 'light';

  return (
    <Tabs
      screenOptions={{
        sceneStyle: {
          backgroundColor: isDark ? '#0F0F14' : '#F5F5F7',
        },
        tabBarStyle: {
          backgroundColor: isDark ? '#0F0F14' : '#F5F5F7',
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        },
        tabBarInactiveTintColor: isDark ? '#8B8B9E' : '#6B6B7E',
        tabBarActiveTintColor: '#5E6AD2',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="(home)"
        options={{
          href: '/',
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          href: '/market',
          title: t('tabs.market'),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="chart.line.uptrend.xyaxis" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="strategy"
        options={{
          href: '/strategy',
          title: t('tabs.strategy'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="lightbulb.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="paper-trading"
        options={{
          href: '/paper-trading',
          title: t('tabs.trading'),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="dollarsign.circle.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
