import { Alert, Linking } from 'react-native'

const SUPPORT_EMAIL = 'support@kingfishbets.com'

function emailFromUrl(url: string) {
  return url.replace(/^mailto:/i, '').split('?')[0] || SUPPORT_EMAIL
}

export async function openSupportEmail(url = `mailto:${SUPPORT_EMAIL}`) {
  try {
    const canOpen = await Linking.canOpenURL(url)
    if (canOpen) {
      await Linking.openURL(url)
      return
    }
  } catch {
    // Fall through to a visible fallback for simulators or devices without Mail configured.
  }

  Alert.alert('Contact Support', `Email ${emailFromUrl(url)}`)
}
