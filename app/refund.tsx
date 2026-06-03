import { Linking, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { colors, spacing } from '@/lib/theme'

export default function RefundScreen() {
  function openUrl(primaryUrl: string, fallbackUrl?: string) {
    Linking.openURL(primaryUrl).catch(() => {
      if (fallbackUrl) Linking.openURL(fallbackUrl).catch(() => {})
    })
  }

  return (
    <Screen>
      <AppText variant="eyebrow">// Billing</AppText>
      <AppText variant="title" style={styles.title}>Refund Policy</AppText>
      <AppText variant="muted" style={styles.copy}>
        KingFish subscriptions purchased in the iOS app are managed through Apple. Canceling turns off renewal, and access continues until the current billing period ends.
      </AppText>

      <View style={styles.sections}>
        <Card>
          <AppText style={styles.sectionTitle}>App Store Purchases</AppText>
          <AppText variant="muted" style={styles.body}>
            Apple handles billing, cancellation, and refund requests for subscriptions purchased in the iOS app. KingFish cannot directly issue App Store refunds from inside the app.
          </AppText>
          <View style={styles.cardAction}>
            <Button
              variant="secondary"
              onPress={() => openUrl('itms-apps://apps.apple.com/account/subscriptions', 'https://apps.apple.com/account/subscriptions')}
            >
              Manage Apple Subscription
            </Button>
          </View>
          <View style={styles.gap} />
          <Button variant="outline" onPress={() => openUrl('https://support.apple.com/en-us/118223')}>
            Request Apple Refund
          </Button>
        </Card>

        <Card>
          <AppText style={styles.sectionTitle}>Other Account Access</AppText>
          <AppText variant="muted" style={styles.body}>
            If your KingFish account already has web, gift, or manual access, contact support and we will help you find the right account path.
          </AppText>
          <View style={styles.cardAction}>
            <Button variant="secondary" onPress={() => router.push('/support')}>
              Contact Support
            </Button>
          </View>
        </Card>
      </View>

      <Button variant="outline" onPress={() => router.back()}>Back</Button>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { marginTop: 8 },
  copy: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  sections: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  body: {
    marginTop: spacing.sm,
    lineHeight: 23,
  },
  cardAction: { marginTop: spacing.lg },
  gap: { height: spacing.md },
})
