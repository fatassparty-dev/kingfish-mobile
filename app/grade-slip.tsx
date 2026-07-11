import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Screen } from '@/components/Screen'
import { Card } from '@/components/Card'
import { AppText } from '@/components/Text'
import { Button } from '@/components/Button'
import { useAuth } from '@/lib/auth'
import { kingfishFetch } from '@/lib/api'
import { colors, spacing } from '@/lib/theme'

// KingFish reads the slip on the server now (Sonnet 5 vision) — the on-device
// Apple Vision OCR + regex parser broke on every book's layout. The screenshot
// is uploaded to /api/grade-slip (extract mode); book/prompt fixes ship without
// an App Store build. Server-side-scores law is unaffected — grades still come
// from KingFish's own numbers in the grade step.
const SPORTS = ['NFL', 'MLB', 'NBA', 'WNBA', 'NHL'] as const
type Sport = (typeof SPORTS)[number]
type Leg = { id: string; selection: string; market: string; line: string; odds: string }

export default function GradeSlipScreen() {
  const { profile } = useAuth()
  const isPremium = profile?.is_premium === true

  const [sport, setSport] = useState<Sport | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [legs, setLegs] = useState<Leg[]>([])
  const [isSGP, setIsSGP] = useState(false)
  const [matchup, setMatchup] = useState('')
  const [grading, setGrading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [improvement, setImprovement] = useState('')
  const [showImprovement, setShowImprovement] = useState(false)
  const [gradeError, setGradeError] = useState('')

  async function pickAndExtract() {
    setError('')
    setLegs([])
    setIsSGP(false)
    setMatchup('')
    setFeedback('')
    setImprovement('')
    setShowImprovement(false)
    setGradeError('')
    if (!sport) {
      setError('Pick a sport first.')
      return
    }
    // quality<1 re-encodes to a compressed JPEG; slips are flat UI so the base64
    // stays well under the server's body cap without a resize dependency.
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      base64: true,
    })
    if (picked.canceled || !picked.assets?.length) return
    const asset = picked.assets[0]
    if (!asset.base64) {
      setError('Could not read that image. Try a different screenshot.')
      return
    }

    setBusy(true)
    try {
      const mime = asset.mimeType || 'image/jpeg'
      const data = await kingfishFetch<{
        legs?: Array<{ selection: string; market: string; line: string; odds: string }>
        isSGP?: boolean
        matchup?: string
        error?: string
      }>('/api/grade-slip', {
        method: 'POST',
        body: JSON.stringify({ sport, image: `data:${mime};base64,${asset.base64}` }),
      })
      if (data.legs?.length) {
        setLegs(data.legs.map((l, i) => ({
          id: `l_${i}`,
          selection: l.selection,
          market: l.market,
          line: l.line,
          odds: l.odds,
        })))
        setIsSGP(data.isSGP === true)
        setMatchup(data.matchup || '')
      } else {
        setError(data.error || 'KingFish couldn’t read that screenshot. Try a clearer one.')
      }
    } catch (e: any) {
      setError(e?.message || 'Could not reach KingFish. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  function removeLeg(id: string) {
    setLegs((cur) => cur.filter((l) => l.id !== id))
    setFeedback('')
    setImprovement('')
    setShowImprovement(false)
  }

  async function gradeSlip() {
    if (!legs.length || !sport) return
    setGradeError('')
    setImprovement('')
    setShowImprovement(false)
    setGrading(true)
    try {
      const data = await kingfishFetch<{ feedback?: string; improvement?: string; error?: string }>('/api/grade-slip', {
        method: 'POST',
        body: JSON.stringify({
          sport,
          isSGP,
          matchup,
          legs: legs.map((l) => ({ selection: l.selection, market: l.market, line: l.line })),
        }),
      })
      if (data.feedback) {
        setFeedback(data.feedback)
        setImprovement(data.improvement || '')
      } else {
        setGradeError(data.error || "KingFish couldn't grade this slip right now.")
      }
    } catch (e: any) {
      setGradeError(e?.message || 'Could not reach KingFish. Try again in a moment.')
    } finally {
      setGrading(false)
    }
  }

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back}>
          <AppText style={styles.backText}>‹ Back</AppText>
        </Pressable>

        <AppText variant="eyebrow">// Slip Grader</AppText>
        <AppText variant="title" style={styles.title}>Grade My Slip</AppText>
        <AppText variant="muted" style={styles.copy}>
          Snap a screenshot of a bet slip — drafted or already placed — and KingFish reads the
          legs so you can get a second opinion. We currently cover NFL, MLB, NBA, WNBA, and NHL.
        </AppText>

        {!isPremium ? (
          <Card>
            <AppText variant="title" style={styles.gateTitle}>A KingFish Premium tool</AppText>
            <AppText variant="muted" style={styles.copy}>
              Grade My Slip is part of KingFish Premium.
            </AppText>
            <Button onPress={() => router.push('/modals/paywall')}>Get Access</Button>
          </Card>
        ) : (
          <>
            <Card>
              <AppText variant="eyebrow">// 1. Pick the sport &amp; add a screenshot</AppText>
              <View style={styles.chips}>
                {SPORTS.map((s) => {
                  const active = sport === s
                  return (
                    <Pressable key={s} onPress={() => setSport(s)} style={[styles.chip, active && styles.chipActive]}>
                      <AppText style={[styles.chipText, active && styles.chipTextActive]}>{s}</AppText>
                    </Pressable>
                  )
                })}
              </View>

              <View style={styles.pickBtn}>
                <Button onPress={pickAndExtract} disabled={!sport || busy} loading={busy}>
                  {legs.length ? 'Choose a different screenshot' : 'Choose screenshot'}
                </Button>
              </View>
              <AppText variant="muted" style={styles.privacy}>
                Your screenshot is sent to KingFish to read the legs.
              </AppText>
              {error ? <AppText style={styles.error}>{error}</AppText> : null}
            </Card>

            <AppText variant="eyebrow" style={styles.resultsHeader}>// 2. Confirm bet slip</AppText>
            {busy ? (
              <View style={styles.busy}>
                <ActivityIndicator color={colors.gold} />
                <AppText variant="muted" style={styles.busyText}>Reading your slip…</AppText>
              </View>
            ) : legs.length ? (
              <Card>
                <AppText variant="muted" style={styles.copy}>
                  These are the legs KingFish read off your slip. Remove anything that's wrong before grading.
                </AppText>
                {legs.map((leg) => (
                  <View key={leg.id} style={styles.legRow}>
                    <View style={styles.legBody}>
                      <AppText style={styles.legSel}>{leg.selection || '(unread)'}</AppText>
                      <AppText variant="muted" style={styles.legMeta}>
                        {[leg.market, leg.line, leg.odds].filter(Boolean).join('   ·   ')}
                      </AppText>
                    </View>
                    <Pressable onPress={() => removeLeg(leg.id)} hitSlop={10}>
                      <AppText style={styles.remove}>Remove</AppText>
                    </Pressable>
                  </View>
                ))}
                <View style={styles.gradeBtn}>
                  <Button onPress={gradeSlip} loading={grading} disabled={grading}>Grade my slip</Button>
                </View>
              </Card>
            ) : (
              <Card>
                <AppText variant="muted" style={styles.copy}>
                  Pick a sport and add a screenshot — the legs KingFish reads will show up here to confirm.
                </AppText>
              </Card>
            )}

            <AppText variant="eyebrow" style={styles.resultsHeader}>// 3. Feedback</AppText>
            {grading ? (
              <View style={styles.busy}>
                <ActivityIndicator color={colors.gold} />
                <AppText variant="muted" style={styles.busyText}>KingFish is reading your slip…</AppText>
              </View>
            ) : feedback ? (
              <Card>
                <AppText variant="eyebrow">// KingFish's take</AppText>
                <AppText style={styles.feedbackText}>{feedback}</AppText>
              </Card>
            ) : (
              <Card>
                <AppText variant="muted" style={styles.copy}>
                  {legs.length
                    ? "Tap \"Grade my slip\" above and KingFish's read of each leg shows up here."
                    : "Confirm a slip above and KingFish's read will appear here."}
                </AppText>
              </Card>
            )}

            {feedback && improvement ? (
              showImprovement ? (
                <Card>
                  <AppText variant="eyebrow">// Improve this slip</AppText>
                  <AppText style={styles.feedbackText}>{improvement}</AppText>
                </Card>
              ) : (
                <View style={styles.gradeBtn}>
                  <Button onPress={() => setShowImprovement(true)}>Improve my grade</Button>
                </View>
              )
            ) : null}
            {gradeError ? <AppText style={styles.error}>{gradeError}</AppText> : null}
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 48 },
  back: { paddingVertical: spacing.sm, marginBottom: spacing.xs },
  backText: { color: colors.gold, fontWeight: '800', fontSize: 16 },
  title: { marginTop: 6 },
  copy: { marginTop: 10, marginBottom: spacing.md, lineHeight: 20 },
  gateTitle: { marginTop: 6, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderActive,
    backgroundColor: '#161C2C',
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.textSecondary, fontWeight: '800', fontSize: 15 },
  chipTextActive: { color: colors.bgPrimary },
  pickBtn: { marginTop: spacing.xl },
  privacy: { fontSize: 12, marginTop: spacing.sm },
  gradeBtn: { marginTop: spacing.lg },
  feedbackText: { color: colors.textPrimary, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  resultsHeader: { marginTop: spacing.xl, marginBottom: spacing.sm },
  error: { color: colors.red, marginTop: spacing.sm },
  busy: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  busyText: { marginTop: 0 },
  legRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(198,145,50,.14)',
  },
  legBody: { flex: 1 },
  legSel: { color: colors.textPrimary, fontWeight: '800', fontSize: 16 },
  legMeta: { marginTop: 3 },
  remove: { color: colors.red, fontWeight: '700', fontSize: 14 },
})
