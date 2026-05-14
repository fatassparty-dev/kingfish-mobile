import { Tabs } from 'expo-router'
import { TabIcon } from '@/components/AppBottomNav'
import { colors } from '@/lib/theme'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgCardAlt,
          borderTopColor: colors.border,
          height: 86,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Board',
          tabBarIcon: ({ color, focused }) => <TabIcon name="board" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cheat-sheets"
        options={{
          title: 'Tools',
          tabBarIcon: ({ color, focused }) => <TabIcon name="tools" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ask-kingfish"
        options={{
          title: 'Ask AI',
          tabBarIcon: ({ color, focused }) => <TabIcon name="ai" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => <TabIcon name="account" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  )
}
