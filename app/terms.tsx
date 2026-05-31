import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { colors, spacing } from '@/lib/theme'

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using KingFish Bets, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.',
  },
  {
    title: '2. Description of Service',
    body: 'KingFish Bets provides sports analytics, betting research tools, odds comparison, market context, and AI-assisted analysis for informational and entertainment purposes only. We do not accept wagers, facilitate gambling transactions, or operate as a sportsbook.',
  },
  {
    title: '3. Not a Gambling Service',
    body: 'All analysis, odds data, Edge Scores, cheat sheets, AI responses, and other content are research signals only. They do not constitute financial, legal, gambling, or investment advice. Past performance does not guarantee future results. You are solely responsible for your own decisions.',
  },
  {
    title: '4. Eligibility',
    body: 'KingFish Bets is intended for users 17 years of age or older where permitted by law. You must also meet any higher age requirement that applies in your jurisdiction.',
  },
  {
    title: '5. User Accounts',
    body: 'You are responsible for maintaining the confidentiality of your account credentials and for notifying us of unauthorized account use.',
  },
  {
    title: '6. Subscription and Payments',
    body: 'Premium subscriptions in the mobile app may be purchased through in-app purchase. Subscriptions, cancellations, renewals, and mobile refund requests are handled through your App Store account and are subject to Apple policies. Subscription terms, trial eligibility, renewal pricing, and billing timing are shown before purchase.',
  },
  {
    title: '7. Mobile App License',
    body: 'We grant you a limited, non-transferable, non-exclusive license to use the KingFish Bets mobile app on devices you own or control, subject to these Terms and the applicable app store rules.',
  },
  {
    title: '8. Prohibited Uses',
    body: 'You may not use the Service for unlawful purposes, resell or redistribute premium content, scrape or reverse engineer the Service, impersonate another person, or use the Service where sports betting analytics services are prohibited.',
  },
  {
    title: '9. Intellectual Property',
    body: 'KingFish Bets content, analysis, algorithms, and design are the property of KingFish Bets and may not be reproduced or redistributed without written permission.',
  },
  {
    title: '10. Disclaimer of Warranties',
    body: 'The Service is provided as is. Odds, stats, injuries, weather, schedules, lineups, AI responses, and other data may be delayed, incomplete, unavailable, or incorrect. Sportsbook lines can change quickly and may differ by state, account, market, promotion, or sportsbook.',
  },
  {
    title: '11. AI and Automated Analysis',
    body: 'Ask KingFish and other automated tools may generate analysis using available data, historical context, and user prompts. AI-generated responses may contain errors or omissions and should not be treated as instructions to wager.',
  },
  {
    title: '12. Limitation of Liability',
    body: 'KingFish Bets shall not be liable for indirect, incidental, special, or consequential damages arising from your use of the Service, including gambling losses incurred based on information provided by the Service.',
  },
  {
    title: '13. Responsible Gambling',
    body: 'If you or someone you know has a gambling problem, call the National Problem Gambling Helpline at 1-800-522-4700.',
  },
  {
    title: '14. Changes to Terms',
    body: 'We may modify these terms from time to time. Continued use of the Service after changes constitutes acceptance of the new terms.',
  },
]

export default function TermsScreen() {
  return (
    <Screen>
      <AppText variant="eyebrow">// Legal</AppText>
      <AppText variant="title" style={styles.title}>Terms of Service</AppText>
      <AppText variant="muted" style={styles.updated}>Last updated: May 30, 2026</AppText>

      <Card style={styles.notice}>
        <AppText variant="muted">
          KingFish is an analytics and information platform. We do not accept wagers or operate as a sportsbook.
        </AppText>
      </Card>

      <View style={styles.sections}>
        {sections.map((section) => (
          <Card key={section.title}>
            <AppText style={styles.sectionTitle}>{section.title}</AppText>
            <AppText variant="muted" style={styles.body}>{section.body}</AppText>
          </Card>
        ))}
      </View>

      <Button variant="secondary" onPress={() => router.push('/privacy')}>Privacy Policy</Button>
      <View style={styles.gap} />
      <Button variant="outline" onPress={() => router.push('/support')}>Contact Support</Button>
      <View style={styles.gap} />
      <Button variant="outline" onPress={() => router.back()}>Back</Button>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { marginTop: 8 },
  updated: { marginTop: spacing.sm, marginBottom: spacing.xl },
  notice: { marginBottom: spacing.lg, borderColor: 'rgba(198,145,50,.45)' },
  sections: { gap: spacing.md, marginBottom: spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  body: { marginTop: spacing.sm },
  gap: { height: spacing.md },
})
