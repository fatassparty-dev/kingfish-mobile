import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/Text'
import { colors, spacing } from '@/lib/theme'

export type TabIconName = 'home' | 'board' | 'tools' | 'ai' | 'account'

const navItems: Array<{ label: string; icon: TabIconName; href: string }> = [
  { label: 'Home', icon: 'home', href: '/home' },
  { label: 'Board', icon: 'board', href: '/' },
  { label: 'Tools', icon: 'tools', href: '/cheat-sheets' },
  { label: 'Ask AI', icon: 'ai', href: '/ask-kingfish' },
  { label: 'Account', icon: 'account', href: '/account' },
]

export function TabIcon({ name, color, focused }: { name: TabIconName; color: string; focused: boolean }) {
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
      <View style={[styles.lureBody, { borderColor: color }]} />
      <View style={[styles.lureEye, { backgroundColor: color }]} />
      <View style={[styles.lureHookStem, { backgroundColor: color }]} />
      <View style={[styles.lureHookCurve, { borderColor: color }]} />
      <View style={[styles.lureSparkLine, styles.lureSparkVertical, { backgroundColor: color }]} />
      <View style={[styles.lureSparkLine, styles.lureSparkHorizontal, { backgroundColor: color }]} />
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
  lureBody: {
    position: 'absolute',
    left: 5,
    top: 4,
    width: 10,
    height: 14,
    borderWidth: 2,
    borderRadius: 7,
    transform: [{ rotate: '-18deg' }],
  },
  lureEye: {
    position: 'absolute',
    left: 9,
    top: 8,
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  lureHookStem: {
    position: 'absolute',
    left: 11,
    top: 16,
    width: 2,
    height: 4,
    borderRadius: 2,
  },
  lureHookCurve: {
    position: 'absolute',
    left: 10,
    top: 18,
    width: 7,
    height: 5,
    borderWidth: 2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 7,
  },
  lureSparkLine: {
    position: 'absolute',
    right: 3,
    top: 4,
    width: 2,
    height: 8,
    borderRadius: 2,
  },
  lureSparkVertical: {},
  lureSparkHorizontal: {
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
