import { Platform, Pressable, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { MenuView, type MenuAction } from '@react-native-menu/menu'
import { AppText } from '@/components/Text'
import { colors, spacing } from '@/lib/theme'

// The props board's game filter as one quiet line: "Week 8 · All Games ⌃⌄" on
// the left (Apple's native pop-up menu on iOS, the standard popup on Android)
// and a search icon on the right. Brian, 2026-10-29: the old gold chip row
// read as toggles, not a menu. Every sport's props board uses it: NFL with its
// week windows (PropCard), the daily sports via dailyGameMenu below.

export type GameMenuSection = {
  // Shown as the section header on iOS; omit for an untitled group.
  title?: string
  options: Array<{ key: string; label: string; detail?: string }>
}

const centralDay = (value: string | number) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
const matchup = (game: MenuGame) => `${game.away_team.split(' ').pop()} @ ${game.home_team.split(' ').pop()}`
type MenuGame = { away_team: string; home_team: string; commence_time: string }

/**
 * Menu for the daily sports (everything but NFL's week view): All Games first,
 * then each day's games under a Today / Tomorrow / weekday header. `games`
 * must already be upcoming and sorted by start time.
 */
export function dailyGameMenu<T extends MenuGame>(games: T[], selected: string, idOf: (game: T) => string, now = Date.now()) {
  const today = centralDay(now)
  const tomorrow = centralDay(now + 86400000)
  const dayTitle = (day: string) => day === today
    ? 'Today'
    : day === tomorrow
      ? 'Tomorrow'
      : new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
  const days = new Map<string, T[]>()
  for (const game of games) {
    const day = centralDay(game.commence_time)
    days.set(day, [...(days.get(day) || []), game])
  }
  const sections: GameMenuSection[] = [
    { options: [{ key: 'all', label: 'All Games', detail: `${games.length} ${games.length === 1 ? 'game' : 'games'}` }] },
    ...[...days.entries()].map(([day, dayGames]) => ({
      title: dayTitle(day),
      options: dayGames.map((game) => ({
        key: idOf(game),
        label: matchup(game),
        detail: new Date(game.commence_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT',
      })),
    })),
  ]
  const picked = games.find((game) => idOf(game) === selected)
  // One day on the board: the day is implied, so the line names only the game.
  const label = picked
    ? days.size > 1 ? `${dayTitle(centralDay(picked.commence_time))} · ${matchup(picked)}` : matchup(picked)
    : 'All Games'
  return { label, sections }
}

export function GameMenuLine({ label, sections, selected, onPick, searchActive, onSearch }: {
  label: string
  sections: GameMenuSection[]
  selected: string
  onPick: (key: string) => void
  searchActive: boolean
  onSearch: () => void
}) {
  const filled = sections.filter((section) => section.options.length > 0)
  // Android's popup ignores displayInline and subtitle, so grouped sections
  // would become submenus (the first one untitled). Flatten them there: a
  // greyed, untappable header row per titled section, the time on the line.
  const actions: MenuAction[] = Platform.OS === 'android'
    ? filled.flatMap((section, index) => [
      ...(section.title ? [{ id: `header-${index}`, title: section.title, attributes: { disabled: true } }] : []),
      ...section.options.map((option) => ({
        id: option.key,
        title: option.detail ? `${option.label}  ·  ${option.detail}` : option.label,
        state: option.key === selected ? 'on' as const : 'off' as const,
      })),
    ])
    : filled.map((section, index) => ({
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
