import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert, Image, Linking, StyleSheet, Switch, TextInput, View } from 'react-native'
import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { kingfishFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useMobileConfig } from '@/lib/mobileConfig'
import { restorePurchases } from '@/lib/purchases'
import { supabase } from '@/lib/supabase'
import { colors, spacing } from '@/lib/theme'

type NotificationPreferenceKey = 'account' | 'betting' | 'offers'
type NotificationPreferences = Record<NotificationPreferenceKey, boolean>

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  account: true,
  betting: false,
  offers: false,
}

const NOTIFICATION_OPTIONS: Array<{
  key: NotificationPreferenceKey
  label: string
  body: string
}> = [
  {
    key: 'account',
    label: 'Account Notifications',
    body: 'Important subscription, billing, security, and account updates.',
  },
  {
    key: 'betting',
    label: 'KingFish Picks & Betting Alerts',
    body: 'Future high-edge scores, mismatch spots, line movement, and slate alerts.',
  },
  {
    key: 'offers',
    label: 'News & Offers',
    body: 'Product updates, feature launches, subscription offers, and free-trial promos.',
  },
]

export default function AccountScreen() {
  const { user, profile, loading, profileError, refreshProfile, signOut } = useAuth()
  const mobileConfig = useMobileConfig()
  const [restoreMessage, setRestoreMessage] = useState('')
  const [restoring, setRestoring] = useState(false)
  const [clearingChat, setClearingChat] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileFirstName, setProfileFirstName] = useState('')
  const [profileLastName, setProfileLastName] = useState('')
  const [profileState, setProfileState] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES)
  const [notificationMessage, setNotificationMessage] = useState('')
  const isPremium = profile?.is_premium === true
  const firstName = profile?.first_name?.trim()
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
  const sourceLabel = getAccessSource(profile)
  const planLabel = getPlanLabel(profile)
  const renewalLabel = getRenewalLabel(profile)
  const statusCopy = getStatusCopy(Boolean(isPremium), sourceLabel, renewalLabel)

  useEffect(() => {
    if (editingProfile) return
    setProfileFirstName(profile?.first_name || '')
    setProfileLastName(profile?.last_name || '')
    setProfileState(profile?.state || '')
  }, [editingProfile, profile?.first_name, profile?.last_name, profile?.state])

  useEffect(() => {
    const storageKey = notificationStorageKey(user?.id)
    if (!storageKey) return

    let mounted = true
    AsyncStorage.getItem(storageKey)
      .then((saved) => {
        if (!mounted || !saved) return
        const parsed = JSON.parse(saved) as Partial<NotificationPreferences>
        setNotificationPreferences({
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          ...parsed,
        })
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [user?.id])

  function startProfileEdit() {
    setProfileMessage('')
    setProfileFirstName(profile?.first_name || '')
    setProfileLastName(profile?.last_name || '')
    setProfileState(profile?.state || '')
    setEditingProfile(true)
  }

  function cancelProfileEdit() {
    setProfileMessage('')
    setEditingProfile(false)
  }

  async function saveProfile() {
    const nextFirstName = profileFirstName.trim()
    const nextLastName = profileLastName.trim()
    const nextState = profileState.trim().toUpperCase()

    setProfileMessage('')
    if (!nextFirstName || !nextLastName) {
      setProfileMessage('First and last name are required.')
      return
    }
    if (nextState && nextState.length !== 2) {
      setProfileMessage('Use a 2-letter state abbreviation.')
      return
    }
    if (!user?.id) {
      setProfileMessage('Sign in again to update your profile.')
      return
    }

    setSavingProfile(true)
    const { error } = await supabase
      .from('user_profiles')
      .update({
        first_name: nextFirstName,
        last_name: nextLastName,
        state: nextState || null,
      })
      .eq('user_id', user.id)

    if (error) {
      setProfileMessage(error.message || 'Profile could not be updated.')
      setSavingProfile(false)
      return
    }

    await refreshProfile()
    setEditingProfile(false)
    setProfileMessage('Profile updated.')
    setSavingProfile(false)
  }

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

  async function toggleNotificationPreference(key: NotificationPreferenceKey) {
    const storageKey = notificationStorageKey(user?.id)
    const nextPreferences = {
      ...notificationPreferences,
      [key]: !notificationPreferences[key],
    }
    setNotificationPreferences(nextPreferences)
    setNotificationMessage('Notification preferences saved.')

    if (!storageKey) return
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(nextPreferences))
    } catch {
      setNotificationMessage('Preference saved for this session. Sign in again if it does not stick.')
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Image source={require('../../assets/images/crown-logo.png')} style={styles.logo} />
        <View style={styles.headerText}>
          <AppText variant="eyebrow">// Account Settings</AppText>
          <AppText variant="title" style={styles.title}>
            {firstName ? `Hello, ${firstName}` : 'Account'}
          </AppText>
        </View>
      </View>

      <Card>
        <AppText variant="eyebrow">// Membership</AppText>
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
        {editingProfile ? (
          <View style={styles.editForm}>
            <View style={styles.nameRow}>
              <TextInput
                autoCapitalize="words"
                placeholder="First name"
                placeholderTextColor={colors.textMuted}
                value={profileFirstName}
                onChangeText={setProfileFirstName}
                style={[styles.input, styles.nameInput]}
              />
              <TextInput
                autoCapitalize="words"
                placeholder="Last name"
                placeholderTextColor={colors.textMuted}
                value={profileLastName}
                onChangeText={setProfileLastName}
                style={[styles.input, styles.nameInput]}
              />
            </View>
            <TextInput
              autoCapitalize="characters"
              maxLength={2}
              placeholder="State, optional"
              placeholderTextColor={colors.textMuted}
              value={profileState}
              onChangeText={setProfileState}
              style={styles.input}
            />
            <View style={styles.cardAction}>
              <Button loading={savingProfile} onPress={saveProfile}>Save Profile</Button>
            </View>
            <View style={styles.buttonGap} />
            <Button variant="outline" disabled={savingProfile} onPress={cancelProfileEdit}>Cancel</Button>
          </View>
        ) : (
          <>
            <View style={styles.profileGrid}>
              <ProfileCell label="Name" value={displayName || 'Not set'} />
              <ProfileCell label="State" value={profile?.state || 'Not set'} />
              <ProfileCell label="Plan" value={planLabel} />
              <ProfileCell label="Renews" value={renewalLabel} />
            </View>
            <View style={styles.cardAction}>
              <Button variant="secondary" onPress={startProfileEdit}>Edit Profile</Button>
            </View>
          </>
        )}
        {profileMessage ? <AppText style={styles.noticeText}>{profileMessage}</AppText> : null}
        {restoreMessage ? <AppText style={styles.noticeText}>{restoreMessage}</AppText> : null}
        <View style={styles.cardAction}>
          {!isPremium && mobileConfig.flags.mobile_paywall ? (
            <Button onPress={() => router.push('/modals/paywall')}>Upgrade</Button>
          ) : null}
          {!isPremium ? (
            <>
              <View style={mobileConfig.flags.mobile_paywall ? styles.buttonGap : undefined} />
              <Button variant="secondary" loading={restoring} onPress={handleRestorePurchases}>
                Restore Purchases
              </Button>
            </>
          ) : null}
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
        <AppText variant="eyebrow">// Notifications</AppText>
        <AppText style={styles.webTitle}>Notification Preferences</AppText>
        <AppText variant="muted" style={styles.copy}>
          Choose what KingFish can send when mobile alerts go live. You can change these anytime.
        </AppText>
        <View style={styles.notificationList}>
          {NOTIFICATION_OPTIONS.map((option) => (
            <View key={option.key} style={styles.notificationRow}>
              <View style={styles.notificationCopy}>
                <AppText style={styles.notificationTitle}>{option.label}</AppText>
                <AppText variant="muted" style={styles.notificationBody}>{option.body}</AppText>
              </View>
              <Switch
                value={notificationPreferences[option.key]}
                onValueChange={() => toggleNotificationPreference(option.key)}
                trackColor={{ false: colors.borderActive, true: 'rgba(198,145,50,.45)' }}
                thumbColor={notificationPreferences[option.key] ? colors.gold : colors.textSecondary}
              />
            </View>
          ))}
        </View>
        {notificationMessage ? <AppText style={styles.noticeText}>{notificationMessage}</AppText> : null}
      </Card>

      <View style={styles.sectionGap} />

      <Card>
        <AppText variant="eyebrow">// Support</AppText>
        <AppText style={styles.webTitle}>Need Something?</AppText>
        <AppText variant="muted" style={styles.copy}>
          Get help with your account, support requests, legal details, and KingFish settings.
        </AppText>
        <View style={styles.cardAction}>
          <Button variant="secondary" onPress={() => router.push('/help')}>
            Help Guide
          </Button>
        </View>
        <View style={styles.buttonGap} />
        <Button variant="outline" onPress={() => Linking.openURL(mobileConfig.links.home)}>
          Open Bait Shop
        </Button>
        <View style={styles.supportLinks}>
          <AppText style={styles.supportLink} onPress={() => Linking.openURL(mobileConfig.links.support_email)}>
            Contact Support
          </AppText>
          <AppText style={styles.supportLink} onPress={() => router.push('/terms')}>
            Terms
          </AppText>
          <AppText style={styles.supportLink} onPress={() => router.push('/privacy')}>
            Privacy
          </AppText>
        </View>
      </Card>

      <View style={styles.sectionGap} />

      <Card>
        <AppText variant="eyebrow">// Controls</AppText>
        <AppText style={styles.webTitle}>Account</AppText>
        <AppText variant="muted" style={styles.copy}>
          Clear saved Ask KingFish history, sign out, or delete your account.
        </AppText>
        <View style={styles.cardAction}>
          <Button variant="secondary" loading={clearingChat} onPress={confirmClearChatHistory}>
            Clear Ask KingFish History
          </Button>
        </View>
        <View style={styles.buttonGap} />
        <Button variant="outline" onPress={signOut}>Sign Out</Button>
        <View style={styles.deleteWrap}>
          <AppText style={styles.deleteLink} onPress={confirmDeleteAccount}>
            {deletingAccount ? 'Deleting account...' : 'Delete Account'}
          </AppText>
        </View>
      </Card>
    </Screen>
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

function notificationStorageKey(userId?: string | null) {
  return userId ? `kingfish-notifications:${userId}` : null
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
  editForm: {
    marginTop: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  nameInput: {
    flex: 1,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: 8,
    backgroundColor: '#161C2C',
    color: colors.textPrimary,
    paddingHorizontal: 14,
    marginBottom: spacing.md,
    fontSize: 15,
  },
  sectionGap: { height: spacing.md },
  noticeCard: {
    borderColor: 'rgba(198,145,50,.45)',
  },
  cardAction: { marginTop: spacing.lg },
  buttonGap: { height: spacing.md },
  supportLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  supportLink: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
  },
  notificationList: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  notificationRow: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  notificationCopy: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  notificationBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  deleteWrap: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  deleteLink: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '900',
  },
})
