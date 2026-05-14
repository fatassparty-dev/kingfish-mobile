import { Tabs } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { colors } from '@/lib/theme'

type TabIconName = 'home' | 'board' | 'tools' | 'ai' | 'account'

function TabIcon({ name, color, focused }: { name: TabIconName; color: string; focused: boolean }) {
  return (
    <View style={[styles.iconShell, focused && styles.iconShellActive]}>
      {name === 'home' ? <HomeIcon color={color} /> : null}
      {name === 'board' ? <BoardIcon color={color} /> : null}
      {name === 'tools' ? <ToolsIcon color={color} /> : null}
      {name === 'ai' ? <AiIcon color={color} /> : null}
      {name === 'account' ? <AccountIcon color={color} /> : null}
    </View>
  )
}

function HomeIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconBox}>
      <View style={[styles.homeRoofLeft, { backgroundColor: color }]} />
      <View style={[styles.homeRoofRight, { backgroundColor: color }]} />
      <View style={[styles.homeBase, { borderColor: color }]} />
    </View>
  )
}

function BoardIcon({ color }: { color: string }) {
  return (
    <View style={[styles.boardFrame, { borderColor: color }]}>
      <View style={[styles.boardLineVertical, { backgroundColor: color }]} />
      <View style={[styles.boardLineHorizontal, { backgroundColor: color }]} />
    </View>
  )
}

function ToolsIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconBox}>
      <View style={[styles.toolLine, styles.toolLineTop, { backgroundColor: color }]} />
      <View style={[styles.toolLine, styles.toolLineMiddle, { backgroundColor: color }]} />
      <View style={[styles.toolLine, styles.toolLineBottom, { backgroundColor: color }]} />
      <View style={[styles.toolKnob, styles.toolKnobTop, { borderColor: color }]} />
      <View style={[styles.toolKnob, styles.toolKnobMiddle, { borderColor: color }]} />
      <View style={[styles.toolKnob, styles.toolKnobBottom, { borderColor: color }]} />
    </View>
  )
}

function AiIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconBox}>
      <View style={[styles.sparkLine, styles.sparkVertical, { backgroundColor: color }]} />
      <View style={[styles.sparkLine, styles.sparkHorizontal, { backgroundColor: color }]} />
      <View style={[styles.sparkSmallLine, styles.sparkSmallVertical, { backgroundColor: color }]} />
      <View style={[styles.sparkSmallLine, styles.sparkSmallHorizontal, { backgroundColor: color }]} />
    </View>
  )
}

function AccountIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconBox}>
      <View style={[styles.accountHead, { borderColor: color }]} />
      <View style={[styles.accountBody, { borderColor: color }]} />
    </View>
  )
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

const styles = StyleSheet.create({
  iconShell: {
    width: 38,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  iconShellActive: {
    backgroundColor: 'rgba(198,145,50,.12)',
  },
  iconBox: {
    width: 24,
    height: 24,
    position: 'relative',
  },
  homeRoofLeft: {
    position: 'absolute',
    left: 4,
    top: 6,
    width: 12,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: '-38deg' }],
  },
  homeRoofRight: {
    position: 'absolute',
    right: 4,
    top: 6,
    width: 12,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: '38deg' }],
  },
  homeBase: {
    position: 'absolute',
    left: 6,
    top: 11,
    width: 12,
    height: 10,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  boardFrame: {
    width: 22,
    height: 20,
    borderWidth: 2,
    borderRadius: 5,
    position: 'relative',
  },
  boardLineVertical: {
    position: 'absolute',
    left: 9,
    top: 2,
    width: 2,
    height: 14,
    borderRadius: 2,
  },
  boardLineHorizontal: {
    position: 'absolute',
    left: 2,
    top: 8,
    width: 16,
    height: 2,
    borderRadius: 2,
  },
  toolLine: {
    position: 'absolute',
    left: 3,
    width: 18,
    height: 2,
    borderRadius: 2,
  },
  toolLineTop: {
    top: 5,
  },
  toolLineMiddle: {
    top: 11,
  },
  toolLineBottom: {
    top: 17,
  },
  toolKnob: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderWidth: 2,
    borderRadius: 4,
    backgroundColor: colors.bgCardAlt,
  },
  toolKnobTop: {
    left: 6,
    top: 2,
  },
  toolKnobMiddle: {
    right: 5,
    top: 8,
  },
  toolKnobBottom: {
    left: 10,
    top: 14,
  },
  sparkLine: {
    position: 'absolute',
    left: 11,
    top: 3,
    width: 2,
    height: 18,
    borderRadius: 2,
  },
  sparkVertical: {},
  sparkHorizontal: {
    transform: [{ rotate: '90deg' }],
  },
  sparkSmallLine: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    width: 2,
    height: 8,
    borderRadius: 2,
  },
  sparkSmallVertical: {},
  sparkSmallHorizontal: {
    transform: [{ rotate: '90deg' }],
  },
  accountHead: {
    position: 'absolute',
    left: 8,
    top: 3,
    width: 8,
    height: 8,
    borderWidth: 2,
    borderRadius: 5,
  },
  accountBody: {
    position: 'absolute',
    left: 4,
    top: 13,
    width: 16,
    height: 8,
    borderWidth: 2,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderBottomWidth: 0,
  },
})
