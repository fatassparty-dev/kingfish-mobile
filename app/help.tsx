import { Linking, ScrollView, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { AppBottomNav } from '@/components/AppBottomNav'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { useMobileConfig } from '@/lib/mobileConfig'
import { colors, spacing } from '@/lib/theme'

const quickStart = [
  'Pick a sport on the Dashboard.',
  'Choose Game Lines for team markets or Player Props for player markets.',
  'Use the category buttons to narrow the board.',
  'Tap player names for profiles, recent form, and available props.',
  'Open Tools when you want cheat sheets, calculators, or Pro Tools.',
]

const tools = [
  {
    title: 'Dashboard',
    body: 'The live board for each sport. Use it to scan today\'s games, compare odds, check weather, and jump between game lines and player props.',
  },
  {
    title: 'Game Lines',
    body: 'Shows moneylines and totals from supported US sportsbooks. The best available price is highlighted so you can compare books quickly.',
  },
  {
    title: 'Supported Sportsbooks',
    body: 'KingFish pricing comes from supported regulated U.S. sportsbooks, including DraftKings, FanDuel, BetMGM, Caesars, BetRivers, and theScore Bet by default. Regional and optional books such as Hard Rock Bet, WynnBET, SuperBook, BetPARX, Fanatics, bet365, PointsBet, Unibet, Bally Bet, and Barstool can appear when available or enabled in Account settings. KingFish does not support offshore sportsbooks.',
  },
  {
    title: 'Player Props',
    body: 'Choose a prop category, then compare the line, season average, recent averages, hit rates, best odds, sportsbook, and Edge.',
  },
  {
    title: 'Landscape Dashboard',
    body: 'Want to see more on the Dashboard? Turn your phone sideways in Player Props to view Line, Odds, AVG, L5, L10, L5 Hit, L10 Hit, and Edge in one wider table.',
  },
  {
    title: 'Player Profiles',
    body: 'Tap a player name to see today\'s markets, season form, recent game logs, and the props KingFish found for that player.',
  },
  {
    title: 'Pro Tools',
    body: 'Find Fantasy Hub and Game Factors inside the Pro Tools tab in Tools.',
  },
  {
    title: 'Fantasy Hub',
    body: 'Use Home League, Best Ball, Draft Planner, and Roster Watch for football draft prep and season-long team tracking.',
  },
  {
    title: 'Ask KingFish',
    body: 'Use the chat when you want the data explained in plain English, want help comparing players, or want a quick read on a betting idea.',
  },
]

const statTerms = [
  { label: 'Line', body: 'The sportsbook number. For example, Over 1.5 hits or Over 4.5 strikeouts.' },
  { label: 'Season', body: 'The player\'s season average for that stat.' },
  { label: 'L20 / L10 / L5', body: 'The player\'s average over the last 20, 10, or 5 games. These help show recent form.' },
  { label: 'Hit Rate', body: 'How often the player cleared the current line in that sample.' },
  { label: 'Best', body: 'The best price KingFish found among supported books.' },
  { label: 'Book', body: 'The sportsbook offering the best price.' },
]

const edgePieces = [
  { label: 'Stat Cushion', body: 'How far the player\'s averages sit above or below the line.' },
  { label: 'Recent Form', body: 'Whether L10 and L5 are rising, steady, or slipping compared with the season.' },
  { label: 'Hit Rate', body: 'How often the player has cleared this line recently.' },
  { label: 'Price', body: 'Whether the odds are still playable for the signal.' },
]

const cheatSheets = [
  { title: 'Hits Bet/Fade', body: '0.5 hit props ranked by recent hit form, price, and history against today\'s starter.' },
  { title: 'HR Targets', body: 'Home run candidates based on starter history, recent power form, and available odds.' },
  { title: 'Hot Total Bases', body: 'Players clearing their total-bases line consistently, with Last 5 hit rate added so one big game does not carry the sheet.' },
  { title: 'Safe Alt K', body: 'Pitcher strikeout targets where the alternate line is the main focus.' },
  { title: 'Hot Hitters', body: 'Recent form first: last 5, last 10, and streak-style momentum.' },
  { title: 'Batter vs Pitcher', body: "Career batter history against today's probable starter, with sample size shown up front." },
  { title: 'Game Lines & Edge', body: 'A game-level view of odds, totals, and context such as MLB weather.' },
  { title: 'NFL TD Streaks', body: 'Regular-season touchdown scoring streaks by player for quick NFL scoring-form research.' },
  { title: 'NFL QB 2+ TD Streaks', body: 'Quarterbacks on recent streaks of 2+ passing touchdown games.' },
  { title: 'QB 200+ Yard Games', body: 'Quarterbacks clearing 200 passing yards, ranked by active streak, L5 and L10 hit rate, and recent yardage form.' },
]

const sportNotes = [
  {
    title: 'Player Prop Sports',
    body: 'MLB, NBA, WNBA, NHL, and NFL include supported player props, player stats, profiles, game lines, and matchup boards when markets are available.',
  },
  {
    title: 'Team Market Sports',
    body: 'College, KBO, and Soccer focus on team markets, league boards, game lines, and matchup context. Player props are not offered for these sports right now.',
  },
  {
    title: 'Stat Sheets',
    body: 'MLB and NFL also include dedicated stat sheets for faster research on popular player markets and scoring trends.',
  },
]

export default function HelpScreen() {
  const mobileConfig = useMobileConfig()

  return (
    <Screen scroll={false}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <AppText variant="eyebrow">// Help Guide</AppText>
          <AppText variant="title" style={styles.title}>How To Use KingFish</AppText>
          <AppText variant="muted" style={styles.copy}>
            KingFish helps you turn live odds, player stats, recent form, weather, and price shopping into faster sports analytics and betting research.
          </AppText>

          <View style={styles.section}>
            <AppText variant="eyebrow">Quick Start</AppText>
            <Card>
              {quickStart.map((item, index) => (
                <View key={item} style={styles.stepRow}>
                  <AppText style={styles.stepNumber}>{index + 1}</AppText>
                  <AppText variant="muted" style={styles.stepText}>{item}</AppText>
                </View>
              ))}
            </Card>
          </View>

          <View style={styles.section}>
            <AppText variant="eyebrow">Main Tools</AppText>
            {tools.map((item) => <HelpCard key={item.title} title={item.title} body={item.body} />)}
          </View>

          <View style={styles.section}>
            <AppText variant="eyebrow">Reading Props</AppText>
            <View style={styles.grid}>
              {statTerms.map((item) => <MiniCard key={item.label} title={item.label} body={item.body} />)}
            </View>
          </View>

          <View style={styles.section}>
            <AppText variant="eyebrow">Edge Score</AppText>
            <Card>
              <AppText style={styles.cardTitle}>What Edge Means</AppText>
              <AppText variant="muted" style={styles.cardBody}>
                Edge is a 0-100 KingFish research signal. It is not a guarantee. It helps you find props where the stats, recent form, hit rate, and price line up better than average.
              </AppText>
              <View style={styles.edgeScale}>
                <Scale label="78+" value="Strong" color={colors.green} />
                <Scale label="64-77" value="Lean" color={colors.gold} />
                <Scale label="45-63" value="Neutral" color={colors.textSecondary} />
                <Scale label="0-44" value="Fade" color={colors.red} />
              </View>
            </Card>
            <View style={styles.grid}>
              {edgePieces.map((item) => <MiniCard key={item.label} title={item.label} body={item.body} />)}
            </View>
          </View>

          <View style={styles.section}>
            <AppText variant="eyebrow">Stat Sheets</AppText>
            <Card>
              <AppText style={styles.cardTitle}>How They Work</AppText>
              <AppText variant="muted" style={styles.cardBody}>
                Stat sheets are saved boards for quick MLB and NFL research. Open a sheet and KingFish returns a short list of names with the line, best book when available, timing, and why each player made the board.
              </AppText>
            </Card>
            {cheatSheets.map((item) => <HelpCard key={item.title} title={item.title} body={item.body} />)}
          </View>

          <View style={styles.section}>
            <AppText variant="eyebrow">Sports Coverage</AppText>
            {sportNotes.map((item) => <HelpCard key={item.title} title={item.title} body={item.body} />)}
          </View>

          <View style={styles.section}>
            <AppText variant="eyebrow">A Simple Workflow</AppText>
            <Card>
              <AppText style={styles.cardTitle}>From Board To Bet Slip</AppText>
              <AppText variant="muted" style={styles.cardBody}>
                Start with stat sheets for ideas. Open the Dashboard to confirm the market and best price. Tap the player profile to check recent form. Use Ask KingFish if you want a plain-English second read before making your own decision.
              </AppText>
            </Card>
          </View>

          <View style={styles.section}>
            <AppText variant="eyebrow">Tutorials</AppText>
            <Card>
              <AppText style={styles.cardTitle}>More Help</AppText>
              <AppText variant="muted" style={styles.cardBody}>
                For account help or anything that looks off, send support a note from inside the app.
              </AppText>
              <View style={styles.buttonGap}>
                <Button variant="secondary" onPress={() => router.push('/support')}>
                  Contact Support
                </Button>
              </View>
            </Card>
          </View>

          <View style={styles.section}>
            <AppText variant="eyebrow">Responsible Use</AppText>
            <Card>
              <AppText variant="muted" style={styles.cardBody}>
                KingFish is an 18+ analytics platform where permitted by law. We do not accept wagers, and no tool guarantees profit. If a higher age requirement applies in your jurisdiction, you must meet that requirement.
              </AppText>
              <AppText style={styles.supportText} onPress={() => Linking.openURL(mobileConfig.links.responsible_gaming)}>
                Problem gambling helpline: 1-800-522-4700
              </AppText>
              <View style={styles.buttonGap}>
                <Button variant="secondary" onPress={() => router.push('/support')}>
                  Contact Support
                </Button>
              </View>
            </Card>
          </View>

          <View style={styles.section}>
            <AppText variant="eyebrow">Billing</AppText>
            <Card>
              <AppText style={styles.cardTitle}>Plans & Refunds</AppText>
              <AppText variant="muted" style={styles.cardBody}>
                Manage or cancel your plan from Account. Canceling turns off renewal, and access continues until the current billing period ends. Refund requests are handled by the store used at checkout.
              </AppText>
              <View style={styles.buttonGap}>
                <Button variant="secondary" onPress={() => router.push('/refund')}>
                  Refund Policy
                </Button>
              </View>
            </Card>
          </View>

          <Button variant="outline" onPress={() => router.back()}>Back</Button>
        </ScrollView>
        <AppBottomNav />
      </View>
    </Screen>
  )
}

function HelpCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <AppText style={styles.cardTitle}>{title}</AppText>
      <AppText variant="muted" style={styles.cardBody}>{body}</AppText>
    </Card>
  )
}

function MiniCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.miniCard}>
      <AppText style={styles.miniTitle}>{title}</AppText>
      <AppText variant="muted" style={styles.miniBody}>{body}</AppText>
    </View>
  )
}

function Scale({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.scaleItem}>
      <AppText variant="mono">{label}</AppText>
      <AppText style={[styles.scaleValue, { color }]}>{value}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  title: {
    marginTop: 8,
  },
  copy: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  section: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  cardBody: {
    marginTop: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  miniCard: {
    width: '47%',
    minHeight: 126,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.md,
  },
  miniTitle: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '900',
  },
  miniBody: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
  },
  edgeScale: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  scaleItem: {
    width: '47%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.md,
  },
  scaleValue: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '900',
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepNumber: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: '900',
    width: 24,
  },
  stepText: {
    flex: 1,
  },
  supportText: {
    color: colors.gold,
    fontWeight: '900',
    marginTop: spacing.md,
  },
  buttonGap: {
    marginTop: spacing.lg,
  },
})
