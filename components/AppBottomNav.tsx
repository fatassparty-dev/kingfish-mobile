import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '@/components/Text'
import { colors, spacing } from '@/lib/theme'

export type TabIconName = 'home' | 'board' | 'tools' | 'ai' | 'account'

const navItems: Array<{ label: string; icon: TabIconName; href: string }> = [
  { label: 'Home', icon: 'home', href: '/home' },
  { label: 'Dashboard', icon: 'board', href: '/' },
  { label: 'Tools', icon: 'tools', href: '/cheat-sheets' },
  { label: 'Ask', icon: 'ai', href: '/ask-kingfish' },
  { label: 'Account', icon: 'account', href: '/account' },
]

// Crisp vector glyphs (Ionicons ships with Expo) — the old hand-drawn
// border-trick icons read chunky at tab-bar size. Focused = filled variant.
const ICON_GLYPHS: Record<TabIconName, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  home: { active: 'home', inactive: 'home-outline' },
  board: { active: 'grid', inactive: 'grid-outline' },
  tools: { active: 'options', inactive: 'options-outline' },
  ai: { active: 'chatbubble-ellipses', inactive: 'chatbubble-ellipses-outline' },
  account: { active: 'person', inactive: 'person-outline' },
}

export function TabIcon({ name, color, focused }: { name: TabIconName; color: string; focused: boolean }) {
  const glyph = ICON_GLYPHS[name]
  return (
    <View style={styles.iconShell}>
      <Ionicons name={focused ? glyph.active : glyph.inactive} size={21} color={color} />
    </View>
  )
}

export function AppBottomNav() {
  return (
    <View style={styles.navBar}>
      {navItems.map((item) => (
        <Pressable key={item.label} onPress={() => router.replace(item.href as any)} style={styles.navItem}>
          <TabIcon name={item.icon} color={colors.textSecondary} focused={false} />
          <AppText style={styles.navLabel}>{item.label}</AppText>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  iconShell: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgCardAlt,
    marginHorizontal: -spacing.xl,
    marginBottom: -spacing.xl,
    paddingTop: 10,
    paddingBottom: 14,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  navLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
})
