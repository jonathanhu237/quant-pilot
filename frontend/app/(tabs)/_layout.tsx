import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="chart.line.uptrend.xyaxis" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="strategy"
        options={{
          title: 'Strategy',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="lightbulb.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="paper-trading"
        options={{
          title: 'Trading',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="dollarsign.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
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
