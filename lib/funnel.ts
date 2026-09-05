import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'
import { signupAttribution } from './signupAttribution'

type Event = {
  event_name: 'signup_view' | 'signup_started' | 'signup_issue' | 'paywall_view' | 'purchase_started' | 'restore_started' | 'research_opened'
  issue?: 'terms_required' | 'name_required' | 'location_required' | 'password_mismatch' | 'auth_rejected' | 'network_error'
  sport?: string
  surface?: 'player_profile' | 'stadium_profile'
}
const makeId = () => `native_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`
const sessionId = makeId()
let visitor: Promise<string> | undefined
function visitorId() {
  visitor ??= (async () => {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const saved = await Promise.race([
        AsyncStorage.getItem('kingfish_funnel_visitor_v1'),
        new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 300) }),
      ])
      if (saved && /^[a-zA-Z0-9_-]{16,100}$/.test(saved)) return saved
      void AsyncStorage.setItem('kingfish_funnel_visitor_v1', sessionId).catch(() => {})
    } catch { /* Storage is optional for analytics. */ }
    finally { if (timer) clearTimeout(timer) }
    return sessionId
  })()
  return visitor
}

/** Random first-party identity only; never an email, credential or advertising ID. */
export async function signupFunnelIdentity() {
  return { acquisition_visitor_id: await visitorId(), acquisition_session_id: sessionId }
}

export function recordFunnelEvent(event: Event): void {
  void (async () => {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const attribution = signupAttribution()
      const id = await visitorId()
      const { data: { session } } = await supabase.auth.getSession()
      if (event.event_name === 'research_opened' && !session) return
      const controller = new AbortController()
      timer = setTimeout(() => controller.abort(), 4000)
      await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL || 'https://kingfishbets.com'}/api/analytics/funnel`, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(session && { Authorization: `Bearer ${session.access_token}` }) },
        body: JSON.stringify({ ...event, visitor_id: id, client: attribution.acquisition_client,
          platform: attribution.acquisition_platform, app_version: attribution.acquisition_app_version,
          app_build: attribution.acquisition_app_build }),
      })
    } catch { /* Collection must never interrupt signup, billing or research. */ }
    finally { if (timer) clearTimeout(timer) }
  })()
}
