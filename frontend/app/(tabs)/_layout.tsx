import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        sceneStyle: {
          backgroundColor: '#0F0F14',
        },
        tabBarStyle: {
          backgroundColor: '#0F0F14',
          borderTopColor: 'rgba(255,255,255,0.08)',
        },
        tabBarInactiveTintColor: '#8B8B9E',
        tabBarActiveTintColor: '#5E6AD2',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: t('tabs.market'),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="chart.line.uptrend.xyaxis" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="strategy"
        options={{
          title: t('tabs.strategy'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="lightbulb.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="paper-trading"
        options={{
          title: t('tabs.trading'),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="dollarsign.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: t('tabs.ai'),
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="bubble.left.and.bubble.right.fill"
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
