import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
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
  'Open Tools when you want cheat sheets, calculators, or game factors.',
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
    title: 'Player Props',
    body: 'Choose a prop category, then compare the line, season average, recent averages, hit rates, best odds, sportsbook, and Edge.',
  },
  {
    title: 'Player Profiles',
    body: 'Tap a player name to see today\'s markets, season form, recent game logs, and the props KingFish found for that player.',
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
  { title: 'Game Lines & Edge', body: 'A game-level view of odds, totals, and context such as MLB weather.' },
]

const sportNotes = [
  {
    title: 'MLB',
    body: 'MLB leads the app with live game lines, player props, player stats, weather, profiles, and cheat sheets.',
  },
  {
    title: 'NBA, NHL, WNBA, KBO',
    body: 'These sports use the same live-board style when markets are available, with supported props and stats shown directly in the dashboard.',
  },
  {
    title: 'NFL and College',
    body: 'NFL includes the Command Center, Fantasy Draft Room, futures context, injuries, news, and props as markets open. College boards focus on team stats and matchup context where player prop betting is restricted.',
  },
]

const navItems = [
  { label: 'Dashboard', icon: 'DB', href: '/' },
  { label: 'Tools', icon: 'TL', href: '/cheat-sheets' },
  { label: 'Ask', icon: 'AI', href: '/ask-kingfish' },
  { label: 'Account', icon: 'AC', href: '/account' },
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
            KingFish helps you turn live odds, player stats, recent form, weather, and price shopping into faster betting research.
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
                <Scale label="78+" value="Strong" color={colors.gold} />
                <Scale label="64-77" value="Lean" color={colors.green} />
                <Scale label="45-63" value="Neutral" color={colors.textSecondary} />
                <Scale label="0-44" value="Fade" color={colors.red} />
              </View>
            </Card>
            <View style={styles.grid}>
              {edgePieces.map((item) => <MiniCard key={item.label} title={item.label} body={item.body} />)}
            </View>
          </View>

          <View style={styles.section}>
            <AppText variant="eyebrow">Cheat Sheets</AppText>
            <Card>
              <AppText style={styles.cardTitle}>How They Work</AppText>
              <AppText variant="muted" style={styles.cardBody}>
                Cheat Sheets are saved daily boards for quick MLB research. Open a sheet and KingFish returns a short list of names with the exact line, best book, saved time, and why each player made the board.
              </AppText>
            </Card>
            {cheatSheets.map((item) => <HelpCard key={item.title} title={item.title} body={item.body} />)}
          </View>

          <View style={styles.section}>
            <AppText variant="eyebrow">Sports Roadmap</AppText>
            {sportNotes.map((item) => <HelpCard key={item.title} title={item.title} body={item.body} />)}
          </View>

          <View style={styles.section}>
            <AppText variant="eyebrow">A Simple Workflow</AppText>
            <Card>
              <AppText style={styles.cardTitle}>From Board To Bet Slip</AppText>
              <AppText variant="muted" style={styles.cardBody}>
                Start with Cheat Sheets for ideas. Open the Dashboard to confirm the market and best price. Tap the player profile to check recent form. Use Ask KingFish if you want a plain-English second read before making your own decision.
              </AppText>
            </Card>
          </View>

          <View style={styles.section}>
            <AppText variant="eyebrow">Tutorials</AppText>
            <Card>
              <AppText style={styles.cardTitle}>Need A Deeper Walkthrough?</AppText>
              <AppText variant="muted" style={styles.cardBody}>
                The web Help Center has longer guides, support articles, and tutorials we can keep expanding without an app update.
              </AppText>
              <View style={styles.buttonGap}>
                <Button variant="secondary" onPress={() => Linking.openURL(mobileConfig.links.help)}>
                  Open Web Help Center
                </Button>
              </View>
            </Card>
          </View>

          <View style={styles.section}>
            <AppText variant="eyebrow">Responsible Use</AppText>
            <Card>
              <AppText variant="muted" style={styles.cardBody}>
                KingFish is a 17+ analytics platform where permitted by law. We do not accept wagers, and no tool guarantees profit. If a higher age requirement applies in your jurisdiction, you must meet that requirement.
              </AppText>
              <AppText style={styles.supportText} onPress={() => Linking.openURL(mobileConfig.links.responsible_gaming)}>
                Problem gambling helpline: 1-800-MY-RESET
              </AppText>
              <View style={styles.buttonGap}>
                <Button variant="secondary" onPress={() => Linking.openURL(mobileConfig.links.support_email)}>
                  Contact Support
                </Button>
              </View>
            </Card>
          </View>

          <Button variant="outline" onPress={() => router.back()}>Back</Button>
        </ScrollView>
        <HelpNav />
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

function HelpNav() {
  return (
    <View style={styles.navBar}>
      {navItems.map((item) => (
        <Pressable key={item.label} onPress={() => router.replace(item.href as any)} style={styles.navItem}>
          <AppText style={styles.navIcon}>{item.icon}</AppText>
          <AppText style={styles.navLabel}>{item.label}</AppText>
        </Pressable>
      ))}
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
  navIcon: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '900',
  },
  navLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
})
