import { Alert, Linking, Platform } from 'react-native'

type BillingProfile = {
  premium_source?: string | null
  subscription_platform?: string | null
  stripe_plan?: string | null
} | null | undefined
type Provider = 'apple' | 'google' | 'web' | 'manual' | 'unknown'

// stripe_plan is mirrored for store purchases too; it does NOT identify Stripe.
export function billingProvider(profile: BillingProfile): Provider {
  const source = profile?.premium_source
  if (source === 'apple') return 'apple'
  if (source === 'google') return 'google'
  if (source === 'stripe') return 'web'
  if (source === 'comp') return 'manual'
  if (profile?.subscription_platform === 'ios') return 'apple'
  if (profile?.subscription_platform === 'android') return 'google'
  if (profile?.subscription_platform === 'web') return 'web'
  if (profile?.subscription_platform === 'manual' || profile?.stripe_plan === 'lifetime') return 'manual'
  return 'unknown'
}

export function getBillingManagement(profile: BillingProfile) {
  const provider = billingProvider(profile)
  const content = {
    apple: { label: 'Manage Apple Subscription', copy: 'Manage or cancel your App Store subscription through the Apple account used to purchase it. Canceling turns off renewal; access continues until the current billing period ends.' },
    google: { label: 'Manage Google Play Subscription', copy: 'Manage or cancel your Google Play subscription through the Google account used to purchase it. Canceling turns off renewal; access continues until the current billing period ends.' },
    web: { label: 'Manage Website Subscription', copy: 'Your subscription is billed through KingFishBets.com. Sign in to the same KingFish account on the website to manage or cancel it.' },
    manual: { label: 'Subscription Help', copy: 'Your current access is managed by KingFish. Any subscription purchased separately must be managed with the provider that charged you.' },
    unknown: { label: 'Find My Subscription', copy: 'Manage subscriptions where you paid: Apple, Google Play, or KingFishBets.com. Where you created your account may be different.' },
  }
  return { provider, ...content[provider] }
}

async function openProvider(provider: 'apple' | 'google' | 'web') {
  const mac = Platform.OS === 'ios' && !!(Platform.constants as { isMacCatalyst?: boolean } | undefined)?.isMacCatalyst
  const instructions = {
    apple: mac ? 'Open the App Store, click your name, then Account Settings > Subscriptions. Use the Apple account that was charged.' : 'Open Settings on your Apple device, tap your name, then Subscriptions. Use the Apple account that was charged.',
    google: 'Open Google Play, tap your profile, then Payments & subscriptions > Subscriptions. Use the Google account that was charged.',
    web: 'Open KingFishBets.com/account in your browser and sign in to the KingFish account used for your website purchase.',
  }
  try {
    if (provider === 'apple') {
      await Linking.openURL('itms-apps://apps.apple.com/account/subscriptions')
        .catch(() => Linking.openURL('https://apps.apple.com/account/subscriptions'))
    } else {
      await Linking.openURL(provider === 'web' ? 'https://kingfishbets.com/account' : 'https://play.google.com/store/account/subscriptions')
    }
  } catch { Alert.alert('Manage your subscription', instructions[provider]) }
}

function chooseProvider() {
  Alert.alert('Where did you purchase?', 'Check your receipt for the provider that charged you. Use that provider’s account to manage or cancel the subscription.', [
    { text: 'Apple', onPress: () => { void openProvider('apple') } },
    { text: 'Google Play', onPress: () => { void openProvider('google') } },
    { text: 'KingFish Website', onPress: () => { void openProvider('web') } },
  ], { cancelable: true })
}

export async function openBillingManagement(profile: BillingProfile) {
  const provider = billingProvider(profile)
  if (provider === 'unknown') { chooseProvider(); return }
  if (provider === 'manual') {
    Alert.alert('Subscription help', 'Gift, manual, or lifetime access does not cancel any subscription purchased separately. Check your receipts if you are still being charged.', [
      { text: 'Close', style: 'cancel' },
      { text: 'Find a paid subscription', onPress: chooseProvider },
    ])
    return
  }
  await openProvider(provider)
}
