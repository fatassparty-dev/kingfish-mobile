import { Linking, Platform } from 'react-native'

const ANDROID_PACKAGE = 'com.kingfishbets.app'
const APPLE_SUBSCRIPTIONS_APP_URL = 'itms-apps://apps.apple.com/account/subscriptions'
const APPLE_SUBSCRIPTIONS_WEB_URL = 'https://apps.apple.com/account/subscriptions'
const APPLE_REFUND_URL = 'https://support.apple.com/en-us/118223'
const GOOGLE_PLAY_SUBSCRIPTIONS_URL = `https://play.google.com/store/account/subscriptions?package=${ANDROID_PACKAGE}`
const GOOGLE_PLAY_REFUND_URL = 'https://support.google.com/googleplay/workflow/9813244?hl=en'

export const isGooglePlayBuild = Platform.OS === 'android'
export const mobileStoreName = isGooglePlayBuild ? 'Google Play' : 'App Store'
export const manageSubscriptionLabel = isGooglePlayBuild
  ? 'Manage Google Play Subscription'
  : 'Manage Apple Subscription'
export const requestRefundLabel = isGooglePlayBuild ? 'Request Google Play Refund' : 'Request Apple Refund'

export const billingManagementCopy = isGooglePlayBuild
  ? 'Manage or cancel Google Play subscriptions through your Google Play account. Canceling turns off renewal, and Pro access continues until the current billing period ends.'
  : 'Manage or cancel App Store subscriptions through your Apple account settings. Canceling turns off renewal, and Pro access continues until the current billing period ends.'

export const deletionSubscriptionWarning = isGooglePlayBuild
  ? 'If you have an active Google Play subscription, cancel it separately in your Google Play account.'
  : 'If you have an active App Store subscription, cancel it separately in your Apple account settings.'

export const mobileSubscriptionTerms = isGooglePlayBuild
  ? 'Premium subscriptions in the Android app may be purchased through Google Play Billing. Subscriptions, cancellations, renewals, and mobile refund requests are handled through your Google Play account and are subject to Google Play policies. Canceling turns off renewal, and access continues until the current billing period ends. Subscription terms, trial eligibility, renewal pricing, and billing timing are shown before purchase.'
  : 'Premium subscriptions in the iOS app may be purchased through Apple in-app purchase. Subscriptions, cancellations, renewals, and mobile refund requests are handled through your App Store account and are subject to Apple policies. Canceling turns off renewal, and access continues until the current billing period ends. Subscription terms, trial eligibility, renewal pricing, and billing timing are shown before purchase.'

export const paywallRenewalTerms = isGooglePlayBuild
  ? 'Eligible new subscribers receive 3 days free, then are charged $0.99 for the first month, then $4.99 per month until canceled. Payment is charged to your Google Play account when the purchase is confirmed. The subscription automatically renews unless canceled before the end of the trial or current billing period. Manage or cancel your subscription in Google Play. KingFish is intended for users 18+ where permitted by law.'
  : 'Eligible new monthly subscribers get 3 days free, then KingFish Bets Pro is $4.99 per month. Eligible new yearly subscribers get 7 days free, then KingFish Bets Pro is $49.99 per year. Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the trial or current period. Your Apple account is charged for renewal within 24 hours before the trial or current period ends. Manage or cancel subscriptions in your Apple account settings. KingFish is intended for users 18+ where permitted by law.'

export const refundIntroCopy = isGooglePlayBuild
  ? 'KingFish subscriptions purchased in the Android app are managed through Google Play. Canceling turns off renewal, and access continues until the current billing period ends.'
  : 'KingFish subscriptions purchased in the iOS app are managed through Apple. Canceling turns off renewal, and access continues until the current billing period ends.'

export const refundDetailCopy = isGooglePlayBuild
  ? 'Google Play handles billing and cancellation for subscriptions purchased in the Android app. Refund eligibility is subject to Google Play policies and applicable law. You can request an eligible refund through Google Play or contact KingFish support for purchase issues.'
  : 'Apple handles billing, cancellation, and refund requests for subscriptions purchased in the iOS app. KingFish cannot directly issue App Store refunds from inside the app.'

export async function openMobileSubscriptionManagement() {
  if (isGooglePlayBuild) {
    await Linking.openURL(GOOGLE_PLAY_SUBSCRIPTIONS_URL)
    return
  }

  await Linking.openURL(APPLE_SUBSCRIPTIONS_APP_URL).catch(() => Linking.openURL(APPLE_SUBSCRIPTIONS_WEB_URL))
}

export async function openMobileRefundRequest() {
  await Linking.openURL(isGooglePlayBuild ? GOOGLE_PLAY_REFUND_URL : APPLE_REFUND_URL)
}
