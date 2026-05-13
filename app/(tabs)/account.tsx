import { Alert, Image, Linking, StyleSheet, View } from 'react-native'
import { useState } from 'react'
import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { kingfishFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useMobileConfig } from '@/lib/mobileConfig'
import { restorePurchases } from '@/lib/purchases'
import { colors, spacing } from '@/lib/theme'

export default function AccountScreen() {
  const { user, profile, loading, profileError, refreshProfile, signOut } = useAuth()
  const mobileConfig = useMobileConfig()
  const [restoreMessage, setRestoreMessage] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [clearingChat, setClearingChat] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const isPremium = profile?.is_premium === true
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
  const sourceLabel = getAccessSource(profile)
  const planLabel = getPlanLabel(profile)
  const renewalLabel = getRenewalLabel(profile)
  const statusCopy = getStatusCopy(Boolean(isPremium), sourceLabel, renewalLabel)
  async function handleRestorePurchases() {
    setRestoring(true)
    const result = await restorePurchases(user?.id)
    setRestoreMessage(result.message)
    await refreshProfile()
    setRestoring(false)
  }

  function confirmClearChatHistory() {
    Alert.alert(
      'Clear Chat History',
      'This removes your saved Ask KingFish conversation history from KingFish. It does not delete your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear History', style: 'destructive', onPress: handleClearChatHistory },
      ],
    )
  }

  async function handleClearChatHistory() {
    setClearingChat(true)
    try {
      await kingfishFetch('/api/chat-history', { method: 'DELETE' })
      setRestoreMessage('Ask KingFish chat history was cleared.')
    } catch (error: any) {
      setRestoreMessage(error?.message || 'Chat history could not be cleared.')
    } finally {
      setClearingChat(false)
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your KingFish account, profile, chat history, chat usage, and saved AI memory. If you have an active App Store subscription, cancel it separately in your Apple account settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: handleDeleteAccount },
      ],
    )
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true)
    try {
      await kingfishFetch('/api/account', { method: 'DELETE' })
      await signOut()
    } catch (error: any) {
      setRestoreMessage(error?.message || 'Account could not be deleted. Please contact support.')
      setDeletingAccount(false)
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Image source={require('../../assets/images/crown-logo.png')} style={styles.logo} />
        <View style={styles.headerText}>
          <AppText variant="eyebrow">// KingFish HQ</AppText>
          <AppText variant="title" style={styles.title}>
            {displayName ? `Welcome, ${profile?.first_name}` : 'Account'}
          </AppText>
        </View>
      </View>

      <Card>
        <AppText variant="eyebrow">// Status</AppText>
        <View style={styles.statusRow}>
          <AppText style={styles.plan}>
            {loading ? 'Loading...' : isPremium ? 'Premium Active' : 'Free Tier'}
          </AppText>
          {!loading ? (
            <View style={[styles.statusPill, isPremium ? styles.statusPillActive : styles.statusPillFree]}>
              <AppText style={[styles.statusPillText, isPremium && styles.statusPillTextActive]}>
                {isPremium ? 'Pro' : 'Free'}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="muted" style={styles.copy}>
          {user?.email || 'Signed in to KingFish'}
        </AppText>
        <AppText style={styles.statusCopy}>{statusCopy}</AppText>
        {profileError ? (
          <AppText style={styles.errorText}>
            {profileError}
          </AppText>
        ) : null}
        <View style={styles.profileGrid}>
          <ProfileCell label="Name" value={displayName || 'Not set'} />
          <ProfileCell label="State" value={profile?.state || 'Not set'} />
          <ProfileCell label="Plan" value={planLabel} />
          <ProfileCell label="Renews" value={renewalLabel} />
        </View>
        {restoreMessage ? <AppText style={styles.noticeText}>{restoreMessage}</AppText> : null}
        <View style={styles.cardAction}>
          <Button variant="secondary" loading={loading} onPress={refreshProfile}>
            Refresh Status
          </Button>
        </View>
      </Card>

      {mobileConfig.app_notice ? (
        <>
          <View style={styles.sectionGap} />
          <Card style={styles.noticeCard}>
            <AppText variant="eyebrow">// Notice</AppText>
            <AppText style={styles.webTitle}>{mobileConfig.app_notice.title}</AppText>
            <AppText variant="muted" style={styles.copy}>{mobileConfig.app_notice.body}</AppText>
          </Card>
        </>
      ) : null}

      <View style={styles.sectionGap} />

      <Card>
        <AppText variant="eyebrow">// Help</AppText>
        <AppText style={styles.webTitle}>How To Use KingFish</AppText>
        <AppText variant="muted" style={styles.copy}>
          Learn the Dashboard, Player Props, Edge Scores, Cheat Sheets, and Ask KingFish workflow.
        </AppText>
        <View style={styles.cardAction}>
          <Button variant="secondary" onPress={() => router.push('/help')}>
            Open Help Guide
          </Button>
        </View>
      </Card>

      <View style={styles.sectionGap} />

      <View style={styles.linkGrid}>
        {mobileConfig.flags.fantasy_hub ? (
          <LinkCard
            eyebrow="// Fantasy"
            title="Fantasy Hub"
            body="Open the draft room, rankings, player profiles, and NFL stack tools."
            href={mobileConfig.links.fantasy_hub}
          />
        ) : null}
        <LinkCard
          eyebrow="// NFL"
          title="Command Center"
          body="NFL research, injuries, draft tools, fantasy, and season-long coverage."
          href={mobileConfig.links.nfl_command_center}
        />
      </View>

      <View style={styles.sectionGap} />

      <Card>
        <AppText variant="eyebrow">// Data & Privacy</AppText>
        <AppText style={styles.webTitle}>Account Controls</AppText>
        <AppText variant="muted" style={styles.copy}>
          Clear your saved Ask KingFish history or delete your KingFish account from the app.
          App Store subscriptions must be canceled separately in your Apple account settings.
        </AppText>
        <View style={styles.cardAction}>
          <Button variant="secondary" loading={clearingChat} onPress={confirmClearChatHistory}>
            Clear Chat History
          </Button>
        </View>
        <View style={styles.buttonGap} />
        <Button variant="outline" loading={deletingAccount} onPress={confirmDeleteAccount}>
          Delete Account
        </Button>
      </Card>

      <View style={styles.sectionGap} />

      <Card>
        <AppText variant="eyebrow">// Full Website</AppText>
        <AppText style={styles.webTitle}>KingFishBets.com</AppText>
        <AppText variant="muted" style={styles.copy}>
          Open the full desktop research workspace for news, fantasy depth, NFL offseason
          coverage, draft results, and expanded research views.
        </AppText>
        <View style={styles.cardAction}>
          <Button variant="secondary" onPress={() => Linking.openURL(mobileConfig.links.home)}>
            Open Full Website
          </Button>
        </View>
      </Card>

      <View style={styles.actions}>
        {!isPremium && mobileConfig.flags.mobile_paywall ? (
          <Button onPress={() => router.push('/modals/paywall')}>Upgrade</Button>
        ) : null}
        <Button variant="secondary" loading={restoring} onPress={handleRestorePurchases}>Restore Purchases</Button>
        <Button variant="outline" onPress={signOut}>Sign Out</Button>
      </View>
    </Screen>
  )
}

function LinkCard({ eyebrow, title, body, href }: { eyebrow: string; title: string; body: string; href: string }) {
  return (
    <Card style={styles.linkCard}>
      <AppText variant="eyebrow">{eyebrow}</AppText>
      <AppText style={styles.linkTitle}>{title}</AppText>
      <AppText variant="muted" style={styles.linkBody}>{body}</AppText>
      <View style={styles.cardAction}>
        <Button variant="outline" onPress={() => Linking.openURL(href)}>
          Open
        </Button>
      </View>
    </Card>
  )
}

function ProfileCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileCell}>
      <AppText variant="eyebrow">{label}</AppText>
      <AppText style={styles.profileValue}>{value}</AppText>
    </View>
  )
}

function getAccessSource(profile: ReturnType<typeof useAuth>['profile']) {
  if (!profile) return 'KingFish account'
  if (profile.is_gifted) return 'Gifted access'
  if (profile.subscription_platform === 'ios') return 'App Store'
  if (profile.subscription_platform === 'android') return 'Google Play'
  if (profile.subscription_platform === 'manual') return 'Manual access'
  if (profile.stripe_plan) return 'KingFishBets.com'
  return 'KingFish account'
}

function getPlanLabel(profile: ReturnType<typeof useAuth>['profile']) {
  if (!profile?.is_premium) return 'Free'
  if (profile.is_gifted) return 'Gifted'
  if (profile.stripe_plan === 'annual') return 'Yearly'
  if (profile.stripe_plan === 'monthly') return 'Monthly'
  if (profile.stripe_plan === 'lifetime') return 'Lifetime'
  return 'Premium'
}

function getRenewalLabel(profile: ReturnType<typeof useAuth>['profile']) {
  if (!profile?.is_premium) return 'None'
  if (profile.stripe_plan === 'lifetime') return 'Lifetime'
  if (!profile.premium_expires_at) return profile.is_gifted ? 'Manual' : 'Active'
  return new Date(profile.premium_expires_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getStatusCopy(isPremium: boolean, sourceLabel: string, renewalLabel: string) {
  if (!isPremium) {
    return 'Upgrade anytime to unlock player props, cheat sheets, unlimited Ask KingFish, and the full KingFish workspace.'
  }

  if (renewalLabel === 'Lifetime') {
    return `Your premium access is active through ${sourceLabel}.`
  }

  if (renewalLabel === 'Active' || renewalLabel === 'Manual') {
    return `Your premium access is active through ${sourceLabel}.`
  }

  return `Your premium access is active through ${sourceLabel}. Current access date: ${renewalLabel}.`
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  logo: { width: 64, height: 64, borderRadius: 16 },
  headerText: { flex: 1 },
  title: { marginTop: 8 },
  statusRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  plan: { marginTop: 8, fontSize: 22, fontWeight: '900' },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  statusPillFree: {
    backgroundColor: colors.bgCardAlt,
    borderColor: colors.borderActive,
  },
  statusPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statusPillTextActive: {
    color: colors.bgPrimary,
  },
  webTitle: { marginTop: 8, fontSize: 22, fontWeight: '900' },
  copy: { marginTop: 8 },
  statusCopy: {
    marginTop: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  errorText: { marginTop: spacing.md, color: '#EF4444', fontWeight: '900' },
  noticeText: { marginTop: spacing.md, color: colors.textSecondary, fontWeight: '700' },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  profileCell: {
    width: '47%',
    minHeight: 72,
    justifyContent: 'center',
  },
  profileValue: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionGap: { height: spacing.md },
  linkGrid: {
    gap: spacing.md,
  },
  linkCard: {
    minHeight: 188,
  },
  linkTitle: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '900',
  },
  linkBody: {
    marginTop: 8,
  },
  noticeCard: {
    borderColor: 'rgba(198,145,50,.45)',
  },
  cardAction: { marginTop: spacing.lg },
  buttonGap: { height: spacing.md },
  actions: { gap: spacing.md, marginTop: spacing.lg },
})
