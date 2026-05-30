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
      <View style={[styles.homeRoof, { borderColor: color }]} />
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
      <View style={[styles.robotAntenna, { backgroundColor: color }]} />
      <View style={[styles.robotHead, { borderColor: color }]}>
        <View style={[styles.robotEye, { backgroundColor: color }]} />
        <View style={[styles.robotEye, { backgroundColor: color }]} />
        <View style={[styles.robotMouth, { backgroundColor: color }]} />
      </View>
      <View style={[styles.robotEarLeft, { backgroundColor: color }]} />
      <View style={[styles.robotEarRight, { backgroundColor: color }]} />
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
    borderRadius: 8,
  },
  iconShellActive: {
    backgroundColor: 'rgba(198,145,50,.12)',
  },
  iconBox: {
    width: 24,
    height: 24,
    position: 'relative',
  },
  homeRoof: {
    position: 'absolute',
    left: 5,
    top: 4,
    width: 14,
    height: 14,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderTopLeftRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  homeBase: {
    position: 'absolute',
    left: 5,
    top: 11,
    width: 14,
    height: 11,
    borderWidth: 2,
    borderTopWidth: 0,
    borderRadius: 4,
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
  robotAntenna: {
    position: 'absolute',
    left: 11,
    top: 2,
    width: 2,
    height: 4,
    borderRadius: 2,
  },
  robotHead: {
    position: 'absolute',
    left: 5,
    top: 6,
    width: 14,
    height: 14,
    borderWidth: 2,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  robotEye: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginTop: -2,
  },
  robotMouth: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 3,
    height: 2,
    borderRadius: 2,
  },
  robotEarLeft: {
    position: 'absolute',
    left: 3,
    top: 11,
    width: 3,
    height: 6,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  robotEarRight: {
    position: 'absolute',
    right: 3,
    top: 11,
    width: 3,
    height: 6,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
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
