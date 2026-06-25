import { supabase } from './supabase'

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://kingfishbets.com'

async function getAccessToken() {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('invalid refresh token')) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
      return undefined
    }
    throw error
  }
}

// A hung connection (cold network, edge stall) must surface as an error so the
// caller — usually React Query — can RETRY, instead of leaving the UI spinning
// "loading" forever. Without this, a single stalled request never resolves and
// never rejects. When the caller supplies its own signal (e.g. the profile read's
// 8s timeout) we defer to it; otherwise we attach this default.
const DEFAULT_TIMEOUT_MS = 15000

export async function kingfishFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let timer: ReturnType<typeof setTimeout> | undefined
  let signal = init.signal ?? undefined
  if (!signal) {
    const controller = new AbortController()
    timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
    signal = controller.signal
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal,
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.error || `Request failed: ${response.status}`)
    }

    return response.json()
  } finally {
    if (timer) clearTimeout(timer)
  }
}
