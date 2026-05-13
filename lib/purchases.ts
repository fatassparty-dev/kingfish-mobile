import { Platform } from 'react-native'
import Purchases, { LOG_LEVEL } from 'react-native-purchases'
import { kingfishFetch } from './api'

export type PurchaseResult = {
  ok: boolean
  message: string
}

declare const require: (name: string) => any

const ENTITLEMENT_IDS = ['kingfish_bets_pro', 'KingFish Bets Pro', 'premium']
const PRODUCT_PRIORITY = [
  '$rc_monthly',
  'monthly',
  '$rc_annual',
  'yearly',
  '$rc_lifetime',
  'lifetime',
]

const PLAN_PACKAGE_IDS = {
  monthly: ['$rc_monthly', 'monthly'],
  yearly: ['$rc_annual', 'yearly'],
  lifetime: ['$rc_lifetime', 'lifetime'],
} as const

export type PurchasePlan = keyof typeof PLAN_PACKAGE_IDS

let configuredForUserId: string | null = null

function getRevenueCatKey() {
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || ''
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || ''
  return ''
}

function isActivePremium(customerInfo: any) {
  const active = customerInfo?.entitlements?.active || {}
  return ENTITLEMENT_IDS.some((id) => typeof active[id] !== 'undefined')
}

function displayPurchaseError(error: any) {
  if (error?.userCancelled) return 'Purchase cancelled.'
  return error?.message || 'Purchase could not be completed. Please try again.'
}

async function syncPremiumStatus() {
  try {
    return await kingfishFetch<{ ok: boolean; is_premium: boolean }>('/api/revenuecat/sync', {
      method: 'POST',
    })
  } catch (error: any) {
    return {
      ok: false,
      is_premium: false,
      error: error?.message || 'Premium status could not sync yet.',
    }
  }
}

export async function configurePurchases(appUserID?: string | null): Promise<PurchaseResult> {
  const apiKey = getRevenueCatKey()
  if (!apiKey) {
    return {
      ok: false,
      message: Platform.OS === 'android'
        ? 'Google Play subscriptions are not configured for this build.'
        : 'In-app subscriptions are not configured for this build.',
    }
  }

  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN)

    if (configuredForUserId === null) {
      Purchases.configure({ apiKey, appUserID: appUserID || undefined })
      configuredForUserId = appUserID || 'anonymous'
    } else if (appUserID && configuredForUserId !== appUserID) {
      await Purchases.logIn(appUserID)
      configuredForUserId = appUserID
    }

    return { ok: true, message: 'Mobile purchases are ready.' }
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message || 'Mobile purchases could not start on this build.',
    }
  }
}

export async function getPremiumEntitlement(appUserID?: string | null): Promise<PurchaseResult> {
  const configured = await configurePurchases(appUserID)
  if (!configured.ok) return configured

  try {
    const customerInfo = await Purchases.getCustomerInfo()
    return {
      ok: isActivePremium(customerInfo),
      message: isActivePremium(customerInfo)
        ? 'KingFish Bets Pro is active.'
        : 'No active KingFish Bets Pro entitlement was found.',
    }
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message || 'Could not refresh subscription status.',
    }
  }
}

function choosePackage(offerings: any, plan?: PurchasePlan) {
  const availablePackages = offerings?.current?.availablePackages || []
  if (!availablePackages.length) return null

  const priority = plan ? [...PLAN_PACKAGE_IDS[plan], ...PRODUCT_PRIORITY] : PRODUCT_PRIORITY

  for (const productId of priority) {
    const match = availablePackages.find((pkg: any) =>
      pkg?.product?.identifier === productId || pkg?.identifier === productId,
    )
    if (match) return match
  }

  return availablePackages[0]
}

export async function purchasePremium(appUserID?: string | null, plan?: PurchasePlan): Promise<PurchaseResult> {
  const configured = await configurePurchases(appUserID)
  if (!configured.ok) return configured

  try {
    const offerings = await Purchases.getOfferings()
    const selectedPackage = choosePackage(offerings, plan)
    if (!selectedPackage) {
      return {
        ok: false,
        message: 'No mobile subscription products are available yet. Check the app-store product setup.',
      }
    }

    const { customerInfo } = await Purchases.purchasePackage(selectedPackage)
    const active = isActivePremium(customerInfo)
    const synced = active ? await syncPremiumStatus() : null
    return {
      ok: active && (synced?.is_premium ?? true),
      message: active && synced?.is_premium
        ? 'KingFish Bets Pro is active.'
        : active
          ? 'Purchase completed. Tap Refresh Status if Premium does not show within a moment.'
        : 'Purchase completed, but KingFish Bets Pro is not active yet.',
    }
  } catch (error: any) {
    return {
      ok: false,
      message: displayPurchaseError(error),
    }
  }
}

export async function restorePurchases(appUserID?: string | null): Promise<PurchaseResult> {
  const configured = await configurePurchases(appUserID)
  if (!configured.ok) return configured

  try {
    const customerInfo = await Purchases.restorePurchases()
    const active = isActivePremium(customerInfo)
    const synced = active ? await syncPremiumStatus() : null
    return {
      ok: active && (synced?.is_premium ?? true),
      message: active && synced?.is_premium
        ? 'KingFish Bets Pro was restored.'
        : active
          ? 'Purchase restored. Tap Refresh Status if Premium does not show within a moment.'
        : 'No active KingFish Bets Pro purchase was found for this Apple or Google account.',
    }
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message || 'Purchases could not be restored. Please try again.',
    }
  }
}
