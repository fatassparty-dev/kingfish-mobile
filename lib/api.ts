import { supabase } from './supabase'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://kingfishbets.com'

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

export async function kingfishFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${response.status}`)
  }

  return response.json()
}
