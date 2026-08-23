import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { useAuth } from '@/lib/auth'
import { getPremiumPricing, purchasePremium, restorePurchases } from '@/lib/purchases'
import type { PremiumPricing, PurchasePlan } from '@/lib/purchases'
import { colors, spacing } from '@/lib/theme'
import {
  billingManagementCopy,
  isGooglePlayBuild,
  manageSubscriptionLabel,
  openMobileSubscriptionManagement,
  paywallRenewalTerms,
} from '@/lib/mobileStore'

type PlanOption = {
  id: PurchasePlan
  eyebrow: string
  price: string
  sub: string
  badge?: string
}

const APP_STORE_PLANS: PlanOption[] = [
  {
    id: 'monthly',
    eyebrow: '// Monthly',
    price: '$0.99 first month',
    sub: 'Then $4.99/month until canceled. No free trial.',
    badge: 'Intro offer',
  },
  {
    id: 'yearly',
    eyebrow: '// Yearly',
    price: '$49.99/yr',
    sub: '$49.99/year until canceled. No free trial.',
    badge: 'Best value',
  },
]

const GOOGLE_PLAY_PLANS: PlanOption[] = [
  {
    id: 'monthly',
    eyebrow: '// Monthly',
    price: '$0.99 first month',
    sub: 'Start with 3 days free. Your introductory first month is $0.99, then renews at $4.99/month until canceled.',
    badge: 'Intro offer',
  },
]

const FEATURES = [
  'Live props, game lines, and best odds',
  'Player profiles with recent form',
  'MLB cheat sheets and stat reports',
  'Unlimited Ask KingFish with live context',
  'NFL Command Center and all supported sports',
]

export default function PaywallScreen() {
  const { user, profile, refreshProfile } = useAuth()
  const [message, setMessage] = useState('')
  const [loadingAction, setLoadingAction] = useState<'purchase' | 'restore' | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PurchasePlan>('monthly')
  const [pricing, setPricing] = useState<PremiumPricing>({})
  const [pricingLoaded, setPricingLoaded] = useState(false)
  const isPremium = profile?.is_premium === true

  useEffect(() => {
    let active = true
    void getPremiumPricing(user?.id).then((nextPricing) => {
      if (active) {
        setPricing(nextPricing)
        setPricingLoaded(true)
      }
    })
    return () => { active = false }
  }, [user?.id])

  const plans = useMemo<PlanOption[]>(() => {
    if (isGooglePlayBuild) return GOOGLE_PLAY_PLANS

    const monthly = pricing.monthly
    const yearly = pricing.yearly
    const monthlyBasePrice = monthly?.priceString || '$4.99'
    const monthlyIntroPrice = monthly?.introPriceString
    const hasConfirmedMonthlyPrice = pricingLoaded && Boolean(monthly?.priceString)
    const showIntroOffer = monthlyIntroPrice || !hasConfirmedMonthlyPrice

    return [
      {
        id: 'monthly',
        eyebrow: '// Monthly',
        price: showIntroOffer
          ? `${monthlyIntroPrice || '$0.99'} first month`
          : `${monthlyBasePrice}/mo`,
        sub: showIntroOffer
          ? `Then ${monthlyBasePrice}/month until canceled. No free trial.`
          : `${monthlyBasePrice}/month until canceled. No introductory offer or free trial is currently available for this Apple account.`,
        badge: showIntroOffer ? 'Intro offer' : undefined,
      },
      {
        id: 'yearly',
        eyebrow: '// Yearly',
        price: `${yearly?.priceString || '$49.99'}/yr`,
        sub: `${yearly?.priceString || '$49.99'}/year until canceled. No free trial.`,
        badge: 'Best value',
      },
    ]
  }, [pricing, pricingLoaded])

  const renewalTerms = useMemo(() => {
    if (isGooglePlayBuild) return paywallRenewalTerms
    const monthlyBasePrice = pricing.monthly?.priceString || '$4.99'
    const monthlyIntroPrice = pricing.monthly?.introPriceString
    const yearlyPrice = pricing.yearly?.priceString || '$49.99'
    const monthlyTerms = monthlyIntroPrice || !pricingLoaded || !pricing.monthly?.priceString
      ? `Eligible new monthly subscribers pay ${monthlyIntroPrice || '$0.99'} for the first month, then ${monthlyBasePrice} per month.`
      : `The monthly plan is ${monthlyBasePrice} per month.`
    return `${monthlyTerms} The yearly plan is ${yearlyPrice} per year. There is no free trial. Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period. Your Apple account is charged when the purchase is confirmed and for renewal within 24 hours before the current period ends. Manage or cancel subscriptions in your Apple account settings. KingFish is intended for users 18+ where permitted by law.`
  }, [pricing, pricingLoaded])

  async function handlePurchase() {
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

  // Logged-out users must create an account first — premium access (paid OR a free
  // promo) is always tied to an account. This is the single chokepoint every
  // "Get Access" gate routes through, so it gates all premium sections at once.
  if (!user) {
    return (
      <Screen>
        <View style={styles.hero}>
          <AppText variant="eyebrow">// KingFish Bets</AppText>
          <AppText variant="title" style={styles.title}>Create A Free Account</AppText>
          <AppText variant="muted" style={styles.copy}>
            Premium tools and free promos are tied to your KingFish account. Sign up free to unlock
            access — it only takes a moment.
          </AppText>
        </View>
        <Button onPress={() => { router.back(); router.push('/sign-up') }}>Sign Up Free</Button>
        <View style={styles.gap} />
        <Button variant="secondary" onPress={() => { router.back(); router.push('/sign-in') }}>
          I already have an account
        </Button>
        <View style={styles.gap} />
        <Button variant="secondary" onPress={() => router.back()}>Close</Button>
      </Screen>
    )
  }

  if (isPremium) {
    return (
      <Screen>
        <View style={styles.hero}>
          <AppText variant="eyebrow">// KingFish Bets Pro</AppText>
          <AppText variant="title" style={styles.title}>Pro Is Active</AppText>
          <AppText variant="muted" style={styles.copy}>
            Your account already has premium access.
          </AppText>
        </View>
        <Card style={styles.notice}>
          <AppText variant="eyebrow">// Active</AppText>
          <AppText style={styles.noticeTitle}>You are already on KingFish Bets Pro.</AppText>
          <AppText variant="muted" style={styles.noticeCopy}>
            {billingManagementCopy}
          </AppText>
        </Card>
        <Button variant="secondary" onPress={() => void openMobileSubscriptionManagement()}>
          {manageSubscriptionLabel}
        </Button>
        <View style={styles.gap} />
        <Button variant="secondary" onPress={() => router.back()}>Close</Button>
      </Screen>
    )
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <AppText variant="eyebrow">// KingFish Bets Pro</AppText>
        <AppText variant="title" style={styles.title}>Unlock The Full Edge</AppText>
        <AppText variant="muted" style={styles.copy}>
          A sports analytics platform built for props, NFL research, live odds, cheat sheets,
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
        {plans.map((plan) => {
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

      <Button loading={loadingAction === 'purchase'} onPress={handlePurchase}>
        {isGooglePlayBuild ? 'Start 3-Day Free Trial' : 'Start Premium'}
      </Button>
      <View style={styles.gap} />
      <Button variant="secondary" loading={loadingAction === 'restore'} onPress={handleRestore}>
        Restore Purchases
      </Button>
      <View style={styles.gap} />
      <Button variant="secondary" onPress={() => router.back()}>Close</Button>
      <AppText variant="muted" style={styles.terms}>
        {renewalTerms}
      </AppText>
      <View style={styles.legalLinks}>
        <Pressable onPress={() => router.push('/terms')}>
          <AppText style={styles.legalLink}>Terms</AppText>
        </Pressable>
        <Pressable onPress={() => router.push('/privacy')}>
          <AppText style={styles.legalLink}>Privacy</AppText>
        </Pressable>
        <Pressable onPress={() => router.push('/refund')}>
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
    borderRadius: 6,
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
