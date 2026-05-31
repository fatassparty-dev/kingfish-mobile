import { Linking, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { spacing } from '@/lib/theme'

const sections = [
  {
    title: '1. Information We Collect',
    body: 'When you create an account, we collect your email address, first and last name, optional state of residence, encrypted password credentials, subscription status, support requests, account communications, and Ask KingFish chat messages when you use that feature.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'We use your information to provide and improve KingFish, send account emails, determine subscription access, show sportsbook options relevant to your state, communicate service updates, and provide AI-powered responses.',
  },
  {
    title: '3. Information We Do Not Collect',
    body: 'KingFish Bets does not collect, store, or have access to your sportsbook account information, betting history, full payment card numbers, or financial account details.',
  },
  {
    title: '4. Cookies and Tracking',
    body: 'We use cookies and local app storage for authentication and app functionality. We do not sell your data to third parties.',
  },
  {
    title: '5. Data Storage',
    body: 'Your data is stored using secure cloud infrastructure and reasonable technical safeguards. We use encryption in transit where supported and limit access to personal information to what is needed to operate the Service.',
  },
  {
    title: '6. Service Providers',
    body: 'We use trusted providers for hosting, authentication, subscription management, payment processing, email delivery, security, analytics, sports data, odds data, weather data, and AI-powered functionality.',
  },
  {
    title: '7. Data Sharing',
    body: 'We do not sell, trade, or rent your personal information. We may share data with service providers only as necessary to operate KingFish Bets.',
  },
  {
    title: '8. Your Rights',
    body: 'You may request access, correction, or deletion of your personal information. You can delete your account inside the app or contact support for help.',
  },
  {
    title: '9. Data Retention',
    body: 'We retain account data, Ask KingFish chat history, saved AI preferences, and subscription access records while your account is active unless a shorter retention period is required. If you delete your account, we remove personal data within 30 days except where limited records must be retained for legal, security, tax, billing, or fraud-prevention purposes.',
  },
  {
    title: "10. Children's Privacy",
    body: 'KingFish Bets is intended for users 17 years of age or older where permitted by law. We do not knowingly collect personal information from users under 17.',
  },
  {
    title: '11. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time and will notify users of significant changes via email or a notice on the Service.',
  },
]

export default function PrivacyScreen() {
  return (
    <Screen>
      <AppText variant="eyebrow">// Legal</AppText>
      <AppText variant="title" style={styles.title}>Privacy Policy</AppText>
      <AppText variant="muted" style={styles.updated}>Last updated: May 30, 2026</AppText>

      <View style={styles.sections}>
        {sections.map((section) => (
          <Card key={section.title}>
            <AppText style={styles.sectionTitle}>{section.title}</AppText>
            <AppText variant="muted" style={styles.body}>{section.body}</AppText>
          </Card>
        ))}
      </View>

      <Button variant="secondary" onPress={() => router.push('/terms')}>Terms of Service</Button>
      <View style={styles.gap} />
      <Button variant="outline" onPress={() => Linking.openURL('mailto:support@kingfishbets.com')}>Contact Support</Button>
      <View style={styles.gap} />
      <Button variant="outline" onPress={() => router.back()}>Back</Button>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { marginTop: 8 },
  updated: { marginTop: spacing.sm, marginBottom: spacing.xl },
  sections: { gap: spacing.md, marginBottom: spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  body: { marginTop: spacing.sm },
  gap: { height: spacing.md },
})
