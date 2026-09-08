import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { kingfishFetch } from '@/lib/api'
import { colors, spacing } from '@/lib/theme'

type NflNewsStory = {
  id: string
  headline: string
  summary: string
  subject: string | null
  source: string
  url: string
  published_at: string
}

type NflNewsResponse = {
  status: 'available'
  edition_date: string
  generated_at: string
  previous_edition?: boolean
  items: NflNewsStory[]
}

function formatEditionDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Chicago',
  })
}

function formatPublishedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  }) + ' CT'
}

export default function NflDailyIntelScreen() {
  const query = useQuery({
    queryKey: ['nfl-daily-intel'],
    queryFn: () => kingfishFetch<NflNewsResponse>('/api/nfl-news'),
    staleTime: 30 * 60 * 1000,
  })

  const edition = query.data

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <AppText style={styles.backText}>‹ Back to Tools</AppText>
      </Pressable>

      <AppText variant="eyebrow">// NFL Briefing</AppText>
      <AppText variant="title" style={styles.title}>NFL Daily Intel</AppText>
      <AppText variant="muted" style={styles.intro}>
        Player updates, injuries, and team news. Saved each morning at 7 AM CT.
      </AppText>

      {query.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.gold} />
          <AppText variant="muted" style={styles.loadingText}>Loading today&apos;s NFL briefing…</AppText>
        </View>
      ) : query.isError || !edition ? (
        <Card>
          <AppText style={styles.errorTitle}>Daily Intel is temporarily unavailable.</AppText>
          <AppText variant="muted" style={styles.errorCopy}>Your other KingFish tools are still available.</AppText>
          <Pressable accessibilityRole="button" onPress={() => { void query.refetch() }} style={styles.retry}>
            <AppText style={styles.retryText}>Try Again</AppText>
          </Pressable>
        </Card>
      ) : (
        <>
          <View style={styles.editionRow}>
            <AppText variant="mono">{formatEditionDate(edition.edition_date)}</AppText>
            {edition.previous_edition ? <AppText style={styles.savedLabel}>Latest saved edition</AppText> : null}
          </View>

          {edition.items.map((story, index) => (
            <Card key={story.id} style={styles.storyCard}>
              <View style={styles.storyHeading}>
                <AppText style={styles.storyNumber}>{index + 1}</AppText>
                <View style={styles.storyCopy}>
                  {story.subject ? <AppText variant="eyebrow">{story.subject}</AppText> : null}
                  <AppText style={styles.headline}>{story.headline}</AppText>
                </View>
              </View>
              <AppText variant="muted" style={styles.summary}>{story.summary}</AppText>
              <View style={styles.sourceRow}>
                <AppText variant="mono" style={styles.source} numberOfLines={1}>
                  {story.source}{formatPublishedAt(story.published_at) ? ` · ${formatPublishedAt(story.published_at)}` : ''}
                </AppText>
                <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(story.url) }}>
                  <AppText style={styles.readLink}>Read</AppText>
                </Pressable>
              </View>
            </Card>
          ))}

          {!edition.items.length ? (
            <Card>
              <AppText variant="muted">No NFL updates were saved for this edition.</AppText>
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  back: { paddingVertical: spacing.sm, marginBottom: spacing.xs },
  backText: { color: colors.gold, fontWeight: '800', fontSize: 16 },
  title: { marginTop: 4 },
  intro: { marginTop: spacing.sm, marginBottom: spacing.lg, lineHeight: 20 },
  loading: { alignItems: 'center', paddingTop: 72 },
  loadingText: { marginTop: spacing.md },
  editionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  savedLabel: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  storyCard: { marginBottom: spacing.md },
  storyHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  storyNumber: { color: colors.gold, fontSize: 22, lineHeight: 26, fontWeight: '900' },
  storyCopy: { flex: 1 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '800', marginTop: 3 },
  summary: { marginTop: spacing.md, lineHeight: 20 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  source: { flex: 1, fontSize: 10 },
  readLink: { color: colors.gold, fontSize: 13, fontWeight: '800', paddingVertical: 6 },
  errorTitle: { fontSize: 17, fontWeight: '800' },
  errorCopy: { marginTop: spacing.sm },
  retry: { alignSelf: 'flex-start', marginTop: spacing.md, paddingVertical: 6 },
  retryText: { color: colors.gold, fontWeight: '800' },
})
