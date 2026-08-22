import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { colors, spacing } from '@/lib/theme'
import {
  manageSubscriptionLabel,
  mobileStoreName,
  openMobileRefundRequest,
  openMobileSubscriptionManagement,
  refundDetailCopy,
  refundIntroCopy,
  requestRefundLabel,
} from '@/lib/mobileStore'

export default function RefundScreen() {
  return (
    <Screen>
      <AppText variant="eyebrow">// Billing</AppText>
      <AppText variant="title" style={styles.title}>Refund Policy</AppText>
      <AppText variant="muted" style={styles.copy}>
        {refundIntroCopy}
      </AppText>

      <View style={styles.sections}>
        <Card>
          <AppText style={styles.sectionTitle}>{mobileStoreName} Purchases</AppText>
          <AppText variant="muted" style={styles.body}>
            {refundDetailCopy}
          </AppText>
          <View style={styles.cardAction}>
            <Button
              variant="secondary"
              onPress={() => void openMobileSubscriptionManagement()}
            >
              {manageSubscriptionLabel}
            </Button>
          </View>
          <View style={styles.gap} />
          <Button variant="outline" onPress={() => void openMobileRefundRequest()}>
            {requestRefundLabel}
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
