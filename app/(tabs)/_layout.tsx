import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { colors } from '@/lib/theme'

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ color, fontSize: 15, fontWeight: '900' }}>{label}</Text>
}

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
          tabBarIcon: ({ color }) => <TabIcon color={color} label="HM" />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabIcon color={color} label="DB" />,
        }}
      />
      <Tabs.Screen
        name="cheat-sheets"
        options={{
          title: 'Tools',
          tabBarIcon: ({ color }) => <TabIcon color={color} label="TL" />,
        }}
      />
      <Tabs.Screen
        name="ask-kingfish"
        options={{
          title: 'Ask AI',
          tabBarIcon: ({ color }) => <TabIcon color={color} label="AI" />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <TabIcon color={color} label="AC" />,
        }}
      />
    </Tabs>
  )
}
