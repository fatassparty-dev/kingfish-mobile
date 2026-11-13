import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { Card } from '@/components/Card'
import { AppText } from '@/components/Text'
import { colors } from '@/lib/theme'

// Women's college basketball League View: the AP Top 25 and conference
// standings, exactly as /api/ncaaw-league ships them (kingfish-bets
// lib/ncaab/womensLeague.ts). Raw poll and standings data, no KingFish model.
export type NcaawLeague = {
  poll: {
    headline: string | null
    date: string | null
    teams: Array<{ rank: number; previous: number | null; school: string; conference: string | null; record: string; points: number | null; firstPlaceVotes: number | null }>
    others: Array<{ school: string; points: number | null }>
  }
  conferences: Array<{
    name: string
    teams: Array<{ school: string; overall: string; conference: string; ppg: string | null; oppPpg: string | null; diff: string | null; streak: string | null }>
  }>
  updatedAt: string
}

type Props = { data?: NcaawLeague; isLoading: boolean; isError: boolean; onRetry: () => void }

function movement(rank: number, previous: number | null) {
  if (previous == null) return { text: 'NEW', color: colors.gold }
  if (previous === rank) return { text: '—', color: colors.textSecondary }
  return previous > rank ? { text: `▲${previous - rank}`, color: colors.green } : { text: `▼${rank - previous}`, color: colors.red }
}

export function NcaawLeagueView({ data, isLoading, isError, onRetry }: Props) {
  const [mode, setMode] = useState<'poll' | 'standings'>('poll')
  const [conference, setConference] = useState<string | null>(null)
  const conferences = data?.conferences || []
  const activeConference = conferences.find((group) => group.name === conference) || conferences[0]
  const pollDate = data?.poll.date ? new Date(data.poll.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : null

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.gold} /></View>
  if (isError || !data) return <Card>
    <AppText variant="eyebrow">// League View</AppText>
    <Pressable accessibilityRole="button" onPress={onRetry}><AppText style={styles.action}>Could not load the women's poll and standings. Tap to retry.</AppText></Pressable>
  </Card>

  return <View style={styles.wrap}>
    <View style={styles.chips}>
      {(['poll', 'standings'] as const).map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: mode === item }} onPress={() => setMode(item)} style={[styles.chip, mode === item && styles.chipActive]}>
        <AppText style={[styles.chipText, mode === item && styles.chipTextActive]}>{item === 'poll' ? 'AP Top 25' : 'Standings'}</AppText>
      </Pressable>)}
    </View>

    {mode === 'poll' ? <Card>
      <AppText variant="eyebrow">// AP Top 25{pollDate ? ` · ${pollDate}` : ''}</AppText>
      {data.poll.teams.length === 0 ? <AppText variant="muted" style={styles.meta}>The AP poll isn't out yet.</AppText> : <>
        <View style={styles.header}>
          <AppText style={[styles.rankCol, styles.column, styles.left]}>#</AppText>
          <AppText style={[styles.school, styles.column, styles.left]}>Team</AppText>
          <AppText style={[styles.cell, styles.column]}>Record</AppText>
          <AppText style={[styles.cell, styles.column]}>Move</AppText>
        </View>
        {data.poll.teams.map((team) => {
          const move = movement(team.rank, team.previous)
          return <View key={`${team.rank}-${team.school}`} style={styles.row}>
            <AppText style={[styles.rankCol, styles.rank]}>{team.rank}</AppText>
            <View style={styles.school}>
              <AppText style={styles.name} numberOfLines={1}>{team.school}{team.firstPlaceVotes ? <AppText style={styles.dim}> ({team.firstPlaceVotes})</AppText> : null}</AppText>
              {team.conference ? <AppText style={styles.sub} numberOfLines={1}>{team.conference}</AppText> : null}
            </View>
            <AppText style={[styles.cell, styles.value]}>{team.record}</AppText>
            <AppText style={[styles.cell, styles.value, { color: move.color }]}>{move.text}</AppText>
          </View>
        })}
        {data.poll.others.length > 0 && <AppText variant="muted" style={styles.meta}>
          Others receiving votes: {data.poll.others.map((team) => `${team.school}${team.points != null ? ` ${team.points}` : ''}`).join(', ')}
        </AppText>}
      </>}
    </Card> : <Card>
      <AppText variant="eyebrow">// Conference Standings</AppText>
      {conferences.length === 0 ? <AppText variant="muted" style={styles.meta}>Standings aren't posted yet.</AppText> : <>
        <View style={styles.chips}>
          {conferences.map((group) => <Pressable key={group.name} accessibilityRole="button" accessibilityState={{ selected: activeConference?.name === group.name }} onPress={() => setConference(group.name)} style={[styles.chip, activeConference?.name === group.name && styles.chipActive]}>
            <AppText style={[styles.chipText, activeConference?.name === group.name && styles.chipTextActive]}>{group.name}</AppText>
          </Pressable>)}
        </View>
        <View style={styles.header}>
          <AppText style={[styles.school, styles.column, styles.left]}>Team</AppText>
          {['Conf', 'Overall', 'PPG', 'Strk'].map((column) => <AppText key={column} style={[styles.cell, styles.column]}>{column}</AppText>)}
        </View>
        {activeConference?.teams.map((team) => <View key={team.school} style={styles.row}>
          <AppText style={[styles.school, styles.name]} numberOfLines={1}>{team.school}</AppText>
          <AppText style={[styles.cell, styles.value, styles.strong]}>{team.conference}</AppText>
          <AppText style={[styles.cell, styles.value]}>{team.overall}</AppText>
          <AppText style={[styles.cell, styles.value]}>{team.ppg ?? '—'}</AppText>
          <AppText style={[styles.cell, styles.value]}>{team.streak ?? '—'}</AppText>
        </View>)}
      </>}
    </Card>}
  </View>
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  center: { paddingVertical: 24, alignItems: 'center' },
  action: { color: colors.gold, fontSize: 12, paddingVertical: 8 },
  meta: { fontSize: 11, lineHeight: 17, marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 8 },
  column: { fontSize: 10, lineHeight: 13, color: colors.gold, textAlign: 'right' },
  left: { textAlign: 'left' },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 8 },
  rankCol: { width: 26 },
  rank: { color: colors.gold, fontWeight: '800', fontSize: 13 },
  school: { flex: 1, paddingRight: 6 },
  name: { color: colors.textPrimary, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  sub: { color: colors.textSecondary, fontSize: 10, lineHeight: 14 },
  dim: { color: colors.textSecondary, fontWeight: '400' },
  strong: { fontWeight: '700' },
  cell: { width: 46, textAlign: 'right' },
  value: { fontSize: 11, lineHeight: 16, color: colors.textPrimary },
})
