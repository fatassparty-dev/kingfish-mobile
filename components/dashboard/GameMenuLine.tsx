import { Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { MenuView, type MenuAction } from '@react-native-menu/menu'
import { AppText } from '@/components/Text'
import { colors, spacing } from '@/lib/theme'

// The props board's game filter as one quiet line: "Week 8 · All Games ⌃⌄" on
// the left (Apple's native pop-up menu on iOS, the standard popup on Android)
// and a search icon on the right. Brian, 2026-10-29: the old gold pill read
// as a selected chip, not a menu. Built for NFL first; meant to carry over to
// every sport's board.

export type GameMenuSection = {
  // Shown as the section header on iOS; omit for an untitled group.
  title?: string
  options: Array<{ key: string; label: string; detail?: string }>
}

export function GameMenuLine({ label, sections, selected, onPick, searchActive, onSearch }: {
  label: string
  sections: GameMenuSection[]
  selected: string
  onPick: (key: string) => void
  searchActive: boolean
  onSearch: () => void
}) {
  const actions: MenuAction[] = sections
    .filter((section) => section.options.length > 0)
    .map((section, index) => ({
      id: `section-${index}`,
      title: section.title || '',
      displayInline: true,
      subactions: section.options.map((option) => ({
        id: option.key,
        title: option.label,
        subtitle: option.detail,
        state: option.key === selected ? 'on' : 'off',
      })),
    }))

  return (
    <View style={styles.row}>
      <MenuView
        actions={actions}
        onPressAction={({ nativeEvent }) => onPick(nativeEvent.event)}
        shouldOpenOnLongPress={false}
        themeVariant="dark"
        style={styles.menu}
      >
        <View style={styles.trigger} accessible accessibilityRole="button" accessibilityLabel={`${label}. Choose games`}>
          <AppText style={styles.label} numberOfLines={1}>{label}</AppText>
          <Ionicons name="chevron-expand" size={15} color={colors.textSecondary} />
        </View>
      </MenuView>
      <Pressable
        onPress={onSearch}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Search players"
        style={styles.search}
      >
        <Ionicons name="search" size={19} color={searchActive ? colors.gold : colors.textSecondary} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 44,
  },
  menu: {
    flexShrink: 1,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  search: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
})
