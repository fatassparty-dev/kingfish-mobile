import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { router, useSegments } from 'expo-router'
import { supabase } from './supabase'
import type { UserProfile } from '@/types'
import { configurePurchases } from './purchases'
import { Sentry } from './sentry'

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

function isInvalidRefreshToken(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes('invalid refresh token')
}

function setSentryUser(activeSession: Session | null) {
  if (activeSession?.user) {
    Sentry.setUser({
      id: activeSession.user.id,
    })
  } else {
    Sentry.setUser(null)
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const segments = useSegments()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  async function loadProfile(activeSession = session) {
    const user = activeSession?.user
    if (!user) {
      setProfile(null)
      setProfileError(null)
      return
    }

    try {
      const profileRequest = supabase
        .from('user_profiles')
        .select('user_id, is_premium, is_admin, is_vip, is_gifted, first_name, last_name, state, subscription_status, subscription_platform, stripe_plan, premium_expires_at')
        .eq('user_id', user.id)
        .single()

      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile lookup timed out. Pull to refresh or try again.')), 10000)
      })

      const { data, error } = await Promise.race([profileRequest, timeout])
      if (error) throw error
      setProfile((data as UserProfile) || null)
      setProfileError(null)
    } catch (err: any) {
      setProfile(null)
      setProfileError(err.message || 'Could not load profile.')
    }
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setSentryUser(data.session)
      await configurePurchases(data.session?.user?.id)
      await loadProfile(data.session)
      setLoading(false)
    }).catch((err) => {
      if (!mounted) return
      if (isInvalidRefreshToken(err)) {
        supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        setSession(null)
        setSentryUser(null)
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
        setSentryUser(nextSession)
        await configurePurchases(nextSession?.user?.id)
        await loadProfile(nextSession)
      } catch (err) {
        if (isInvalidRefreshToken(err)) {
          supabase.auth.signOut({ scope: 'local' }).catch(() => {})
          setSession(null)
          setSentryUser(null)
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
    if (!session && !inAuthGroup) {
      router.replace('/sign-in')
    } else if (session && inAuthGroup) {
      router.replace('/')
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
        setSentryUser(null)
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
