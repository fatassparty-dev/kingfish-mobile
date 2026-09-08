import { createClient } from '@supabase/supabase-js'
import { AppState, Platform } from 'react-native'
import { authStorage } from './authStorage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase mobile env values. Copy .env.example to .env when ready.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Supabase cannot refresh a native session while the app is suspended. Restart
// the refresh loop whenever KingFish becomes active so a returning customer keeps
// the same login instead of discovering an expired access token later.
export function installAuthAutoRefresh() {
  if (Platform.OS === 'web') return () => {}

  const update = (state: string) => {
    if (state === 'active') supabase.auth.startAutoRefresh()
    else supabase.auth.stopAutoRefresh()
  }

  update(AppState.currentState)
  const subscription = AppState.addEventListener('change', update)
  return () => {
    subscription.remove()
    supabase.auth.stopAutoRefresh()
  }
}
