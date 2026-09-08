import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Supabase sessions can be larger than SecureStore's conservative per-value
// limit on older iOS versions, so keep the Keychain-backed copy in small chunks.
// AsyncStorage remains the web implementation and the native migration/fallback.
const CHUNK_SIZE = 1800
const MAX_CHUNKS = 64

function secureKey(key: string, suffix: string) {
  const safe = key.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-90)
  return `kingfish.auth.${safe}.${suffix}`
}

type SecureMeta = { count: number; generation: string }

async function storedMeta(key: string): Promise<SecureMeta | null> {
  const raw = await SecureStore.getItemAsync(secureKey(key, 'meta'))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SecureMeta
    return Number.isInteger(parsed.count) && parsed.count > 0 && parsed.count <= MAX_CHUNKS && parsed.generation
      ? parsed
      : null
  } catch {
    return null
  }
}

async function writeSecureValue(key: string, value: string) {
  const oldMeta = await storedMeta(key)
  const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'gs')) || ['']
  if (chunks.length > MAX_CHUNKS) throw new Error('Saved session is too large for secure storage.')
  const generation = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

  for (let index = 0; index < chunks.length; index += 1) {
    await SecureStore.setItemAsync(secureKey(key, `${generation}.${index}`), chunks[index])
  }
  // Commit the new generation only after every chunk exists. If Keychain is
  // interrupted midway, readers continue using the intact previous generation.
  await SecureStore.setItemAsync(secureKey(key, 'meta'), JSON.stringify({ count: chunks.length, generation }))
  if (oldMeta) {
    for (let index = 0; index < oldMeta.count; index += 1) {
      await SecureStore.deleteItemAsync(secureKey(key, `${oldMeta.generation}.${index}`))
    }
  }
}

async function deleteSecureValue(key: string) {
  const meta = await storedMeta(key)
  for (let index = 0; index < (meta?.count || 0); index += 1) {
    await SecureStore.deleteItemAsync(secureKey(key, `${meta!.generation}.${index}`))
  }
  await SecureStore.deleteItemAsync(secureKey(key, 'meta'))
}

export const authStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key)

    try {
      const meta = await storedMeta(key)
      if (meta) {
        const chunks = await Promise.all(
          Array.from({ length: meta.count }, (_, index) => SecureStore.getItemAsync(secureKey(key, `${meta.generation}.${index}`))),
        )
        if (chunks.every((chunk) => chunk !== null)) return chunks.join('')
      }
    } catch {
      // Fall through to the legacy store. A usable saved login is more important
      // than failing startup because Keychain was temporarily unavailable.
    }

    const legacyValue = await AsyncStorage.getItem(key)
    if (legacyValue) {
      try {
        await writeSecureValue(key, legacyValue)
        await AsyncStorage.removeItem(key)
      } catch {
        // Keep the legacy value in place if migration cannot complete.
      }
    }
    return legacyValue
  },

  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value)
    try {
      await writeSecureValue(key, value)
      await AsyncStorage.removeItem(key)
    } catch {
      await AsyncStorage.setItem(key, value)
    }
  },

  async removeItem(key: string) {
    if (Platform.OS !== 'web') {
      try {
        await deleteSecureValue(key)
      } catch {
        // Still clear the fallback store and local auth state below.
      }
    }
    await AsyncStorage.removeItem(key)
  },
}
