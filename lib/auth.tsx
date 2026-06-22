import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { router, useSegments } from 'expo-router'
import { supabase } from './supabase'
import type { UserProfile } from '@/types'
import { configurePurchases } from './purchases'
import { kingfishFetch } from './api'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
  profileError: string | null
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const PUBLIC_ROUTES = new Set(['help', 'privacy', 'refund', 'support', 'terms'])

// Background retry cadence for a profile read that comes back empty/failed right
// after sign-in. Premium is read from the server, so a transient miss must not be
// treated as "free" — we retry until the read resolves (token attaches / network
// warms up) instead of waiting on a chance token refresh ~30s out.
const PROFILE_RETRY_DELAYS_MS = [1200, 2400, 3600, 5000]

function isInvalidRefreshToken(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes('invalid refresh token')
}

// One authoritative profile read via the server (`GET /api/account`). Reading
// server-side (service role) instead of querying `user_profiles` directly removes
// the sign-in race that made paid users briefly show as "Free", and the server
// self-heals a stale mobile entitlement. Hard timeout so a cold/slow network can't
// hang the premium reveal.
async function fetchProfileOnce(): Promise<{ data: UserProfile | null; error: Error | null }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await kingfishFetch<{ profile: UserProfile | null }>('/api/account', {
      signal: controller.signal,
    })
    return { data: res.profile ?? null, error: null }
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error('Could not load profile.') }
  } finally {
    clearTimeout(timer)
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const segments = useSegments()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Keep retrying a missing/failed profile read in the background until the row
  // resolves, the user changes, or we run out of attempts. Never clears an
  // already-loaded profile — a transient miss must not downgrade a premium user
  // to "free". This is what previously only self-healed by luck after ~30s.
  async function retryLoadProfile(userId: string) {
    for (const delay of PROFILE_RETRY_DELAYS_MS) {
      await new Promise((resolve) => setTimeout(resolve, delay))
      // Bail if the signed-in user changed (or signed out) while we waited.
      const { data: current } = await supabase.auth.getSession()
      if (current.session?.user?.id !== userId) return
      const { data } = await fetchProfileOnce()
      if (data) {
        setProfile(data)
        setProfileError(null)
        return
      }
    }
  }

  async function loadProfile(activeSession = session) {
    const user = activeSession?.user
    if (!user) {
      setProfile(null)
      setProfileError(null)
      return
    }

    // First read blocks the caller so the app can reveal quickly.
    const { data, error } = await fetchProfileOnce()
    if (data) {
      setProfile(data)
      setProfileError(null)
      return
    }

    // No usable profile yet. Right after sign-in this is almost always a transient
    // race (auth token not attached -> RLS returns no row) or a cold-start timeout,
    // NOT a real free account. Preserve any known-good profile for this same user
    // instead of flashing "Free", surface the error, and retry in the background.
    setProfile((prev) => (prev && prev.user_id === user.id ? prev : null))
    if (error) setProfileError(error.message)
    void retryLoadProfile(user.id)
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      // Premium comes from the authoritative server profile (`/api/account`), so
      // load it FIRST and reveal the app immediately. RevenueCat is only needed to
      // make a purchase/restore — warm it up in the background so it never blocks
      // the premium reveal (a web/Stripe subscriber has no Apple entitlement to
      // wait on). This is what made cold launch take ~20s to show Pro.
      await loadProfile(data.session)
      setLoading(false)
      configurePurchases(data.session?.user?.id).catch(() => {})
    }).catch((err) => {
      if (!mounted) return
      if (isInvalidRefreshToken(err)) {
        supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        setSession(null)
        setProfile(null)
        setProfileError(null)
      } else {
        setProfileError(err.message || 'Could not load session.')
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      try {
        setSession(nextSession)
        // Profile (premium source of truth) first; RevenueCat warm-up in the
        // background so it never gates the premium reveal. See note above.
        await loadProfile(nextSession)
        configurePurchases(nextSession?.user?.id).catch(() => {})
      } catch (err) {
        if (isInvalidRefreshToken(err)) {
          supabase.auth.signOut({ scope: 'local' }).catch(() => {})
          setSession(null)
          setProfile(null)
          setProfileError(null)
        } else {
          setProfileError(err instanceof Error ? err.message : 'Could not load session.')
        }
      } finally {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'
    const isPublicRoute = PUBLIC_ROUTES.has(String(segments[0] || ''))
    if (!session && !inAuthGroup && !isPublicRoute) {
      router.replace('/sign-in')
    } else if (session && inAuthGroup) {
      router.replace('/home')
    }
  }, [loading, session, segments])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user || null,
      profile,
      loading,
      profileError,
      refreshProfile: async () => {
        setLoading(true)
        await loadProfile()
        setLoading(false)
      },
      signOut: async () => {
        await supabase.auth.signOut()
        setSession(null)
        setProfile(null)
        router.replace('/sign-in')
      },
    }),
    [session, profile, loading, profileError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
