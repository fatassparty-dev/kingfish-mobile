import { useState } from 'react'
import { Linking, Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { useAuth } from '@/lib/auth'
import { useMobileConfig } from '@/lib/mobileConfig'
import { PurchasePlan, purchasePremium, restorePurchases } from '@/lib/purchases'
import { colors, spacing } from '@/lib/theme'

const PLANS: {
  id: PurchasePlan
  eyebrow: string
  price: string
  sub: string
  badge?: string
}[] = [
  {
    id: 'monthly',
    eyebrow: '// Monthly',
    price: '$9.99/mo',
    sub: 'Eligible new subscribers get 7 days free, then flexible monthly access.',
    badge: 'Start here',
  },
  {
    id: 'yearly',
    eyebrow: '// Yearly',
    price: '$99/yr',
    sub: 'Eligible new subscribers get 7 days free, then the best value for the full sports calendar.',
    badge: 'Best value',
  },
  {
    id: 'lifetime',
    eyebrow: '// Lifetime',
    price: 'Lifetime',
    sub: 'One purchase for long-term KingFish access.',
  },
]

const FEATURES = [
  'Live props, game lines, and best odds',
  'Player profiles with recent form',
  'MLB cheat sheets and stat reports',
  'Ask KingFish AI with live context',
  'NFL Command Center and all supported sports',
]

export default function PaywallScreen() {
  const { user, profile, refreshProfile } = useAuth()
  const mobileConfig = useMobileConfig()
  const [message, setMessage] = useState('')
  const [loadingAction, setLoadingAction] = useState<'purchase' | 'restore' | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PurchasePlan>('monthly')
  const isPremium = profile?.is_premium === true
  const purchasePaused = mobileConfig.flags.mobile_paywall === false

  async function handlePurchase() {
    if (purchasePaused) {
      setMessage('Subscriptions are temporarily paused. Please try again later.')
      return
    }
    setLoadingAction('purchase')
    const result = await purchasePremium(user?.id, selectedPlan)
    setMessage(result.message)
    await refreshProfile()
    setLoadingAction(null)
  }

  async function handleRestore() {
    setLoadingAction('restore')
    const result = await restorePurchases(user?.id)
    setMessage(result.message)
    await refreshProfile()
    setLoadingAction(null)
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <AppText variant="eyebrow">// KingFish Bets Pro</AppText>
        <AppText variant="title" style={styles.title}>Unlock The Full Edge</AppText>
        <AppText variant="muted" style={styles.copy}>
          A betting intelligence platform built for props, NFL research, live odds, cheat sheets,
          and smarter decisions across the sports calendar.
        </AppText>
      </View>

      <View style={styles.featureCard}>
        {FEATURES.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <View style={styles.featureMark} />
            <AppText style={styles.featureText}>{feature}</AppText>
          </View>
        ))}
      </View>

      <View style={styles.plans}>
        {PLANS.map((plan) => {
          const selected = selectedPlan === plan.id
          return (
            <Pressable
              key={plan.id}
              onPress={() => setSelectedPlan(plan.id)}
              style={[styles.planCard, selected && styles.planCardActive]}
            >
              <View style={styles.planTop}>
                <View style={styles.planHeaderLeft}>
                  <AppText variant="eyebrow">{plan.eyebrow}</AppText>
                </View>
                {plan.badge ? (
                  <View style={[styles.badge, selected && styles.badgeActive]}>
                    <AppText style={[styles.badgeText, selected && styles.badgeTextActive]}>{plan.badge}</AppText>
                  </View>
                ) : null}
              </View>
              <AppText style={styles.price}>{plan.price}</AppText>
              <AppText variant="muted">{plan.sub}</AppText>
            </Pressable>
          )
        })}
      </View>

      {message ? (
        <Card style={styles.notice}>
          <AppText style={styles.noticeText}>{message}</AppText>
        </Card>
      ) : null}

      <Button loading={loadingAction === 'purchase'} disabled={isPremium || purchasePaused} onPress={handlePurchase}>
        {isPremium ? 'Pro Active' : purchasePaused ? 'Subscriptions Paused' : 'Start Premium'}
      </Button>
      <View style={styles.gap} />
      <Button variant="secondary" loading={loadingAction === 'restore'} onPress={handleRestore}>
        Restore Purchases
      </Button>
      <View style={styles.gap} />
      <Button variant="secondary" onPress={() => router.back()}>Close</Button>
      <AppText variant="muted" style={styles.terms}>
        Eligible new monthly and yearly subscribers get 7 days free, then KingFish Bets Pro is $9.99 per month or $99 per year. Monthly and yearly subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the trial or current period. Your store account is charged for renewal within 24 hours before the trial or current period ends. Lifetime is a one-time purchase where supported. Manage or cancel subscriptions in your App Store or Google Play account settings. KingFish is intended for users 17+ where permitted by law.
      </AppText>
      <View style={styles.legalLinks}>
        <Pressable onPress={() => Linking.openURL(mobileConfig.links.terms)}>
          <AppText style={styles.legalLink}>Terms</AppText>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(mobileConfig.links.privacy)}>
          <AppText style={styles.legalLink}>Privacy</AppText>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(mobileConfig.links.refund)}>
          <AppText style={styles.legalLink}>Refunds</AppText>
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { marginBottom: spacing.xl },
  title: { marginTop: 8 },
  copy: { marginTop: 10 },
  featureCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  featureText: {
    flex: 1,
    fontWeight: '700',
  },
  plans: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  planCard: {
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCardAlt,
  },
  planCardActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(198,145,50,.10)',
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  planHeaderLeft: { flex: 1 },
  price: { marginVertical: 10, minHeight: 42, fontSize: 30, lineHeight: 38, fontWeight: '900' },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderActive,
  },
  badgeActive: {
    borderColor: colors.gold,
    backgroundColor: colors.gold,
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  badgeTextActive: {
    color: colors.bgPrimary,
  },
  notice: { marginBottom: spacing.lg, borderColor: 'rgba(198,145,50,.35)' },
  noticeTitle: {
    marginTop: spacing.xs,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
  },
  noticeCopy: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  noticeText: { color: colors.textSecondary, fontWeight: '700' },
  gap: { height: spacing.md },
  terms: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.lg,
  },
  legalLink: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
  },
})
