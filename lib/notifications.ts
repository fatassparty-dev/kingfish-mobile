import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { kingfishFetch } from './api'

export type NotificationPreferenceKey = 'account' | 'betting' | 'offers'
export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  account: true,
  betting: false,
  offers: false,
}

declare const require: (name: string) => any

function getNotificationsModule() {
  try {
    return require('expo-notifications')
  } catch {
    return null
  }
}

function normalizePreferences(value?: Partial<NotificationPreferences> | null): NotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(value || {}),
  }
}

function shouldRegister(preferences: NotificationPreferences) {
  return Object.values(preferences).some(Boolean)
}

async function getExpoPushToken() {
  const Notifications = getNotificationsModule()
  if (!Notifications) {
    return {
      token: '',
      message: 'Push notifications need the expo-notifications package in the native build.',
    }
  }

  const existing = await Notifications.getPermissionsAsync()
  let status = existing.status
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync()
    status = requested.status
  }

  if (status !== 'granted') {
    return {
      token: '',
      message: 'Push notifications are off for KingFish in your device settings.',
    }
  }

  const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId
  const response = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
  return {
    token: response.data,
    message: 'Notification preferences saved.',
  }
}

export async function fetchNotificationPreferences() {
  const response = await kingfishFetch<{ preferences?: Partial<NotificationPreferences> }>('/api/mobile-notifications')
  return normalizePreferences(response.preferences)
}

export async function saveNotificationPreferences(
  preferences: NotificationPreferences,
  options: { registerForPush?: boolean } = {},
) {
  let expoPushToken = ''
  let permissionMessage = ''
  if (options.registerForPush && shouldRegister(preferences)) {
    const result = await getExpoPushToken()
    expoPushToken = result.token
    permissionMessage = result.message
  }

  const response = await kingfishFetch<{ ok: boolean; preferences: Partial<NotificationPreferences> }>('/api/mobile-notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      preferences,
      expoPushToken,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version || '',
    }),
  })

  return {
    preferences: normalizePreferences(response.preferences),
    message: permissionMessage || 'Notification preferences saved.',
  }
}
