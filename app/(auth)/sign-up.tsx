import { useState } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Link, router } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { supabase } from '@/lib/supabase'
import { colors, spacing } from '@/lib/theme'
import { normalizeLocation } from '@/lib/locations'

export default function SignUpScreen() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [state, setState] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [is18, setIs18] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function signUp() {
    setError('')
    setSuccess('')
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.')
      return
    }
    if (!normalizeLocation(state)) {
      setError('Please enter your location (state, PR, or OTHER).')
      return
    }
    if (!is18) {
      setError('You must confirm you are 18 or older where permitted by law.')
      return
    }
    if (!accepted) {
      setError('You must accept the Terms and Privacy Policy.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    // Pass the name into auth metadata so it persists even before a session exists
    // (email confirmation pending). The on_auth_user_created DB trigger copies this
    // into user_profiles server-side, so the name survives regardless of RLS/session.
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          state: normalizeLocation(state) || null,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Best-effort client write; the DB trigger is the source of truth.
    if (data.user) {
      await supabase
        .from('user_profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          state: normalizeLocation(state) || null,
        })
        .eq('user_id', data.user.id)
    }

    setSuccess('Account created. Check your email if confirmation is required.')
    setLoading(false)
  }

  return (
    <Screen>
      <AppText variant="eyebrow">// Join KingFish</AppText>
      <AppText variant="title" style={styles.title}>Create Account</AppText>
      <AppText variant="muted" style={styles.copy}>
        Create one account for the web app and mobile app. KingFish is an 18+ analytics platform where permitted by law. We do not accept wagers.
      </AppText>

      <Card>
        <View style={styles.nameRow}>
          <TextInput placeholder="First name" placeholderTextColor={colors.textMuted} value={firstName} onChangeText={setFirstName} style={[styles.input, styles.nameInput]} />
          <TextInput placeholder="Last name" placeholderTextColor={colors.textMuted} value={lastName} onChangeText={setLastName} style={[styles.input, styles.nameInput]} />
        </View>
        <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Email" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} style={styles.input} />
        <TextInput autoCapitalize="characters" placeholder="Location (state, PR, or OTHER)" placeholderTextColor={colors.textMuted} value={state} onChangeText={setState} style={styles.input} />
        <TextInput autoCapitalize="none" placeholder="Password" placeholderTextColor={colors.textMuted} secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
        <TextInput autoCapitalize="none" placeholder="Confirm password" placeholderTextColor={colors.textMuted} secureTextEntry value={confirm} onChangeText={setConfirm} style={styles.input} />

        <CheckRow checked={is18} onPress={() => setIs18((v) => !v)} text="I confirm I am 18 or older where permitted by law." />
        <CheckRow checked={accepted} onPress={() => setAccepted((v) => !v)} text="I accept the Terms of Service and Privacy Policy." />
        <AppText variant="muted" style={styles.note}>
          Your location helps KingFish show the right sportsbook context. You can change it anytime from Account.
        </AppText>

        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        {success ? <AppText style={styles.success}>{success}</AppText> : null}
        <Button loading={loading} onPress={signUp}>Create Account</Button>
      </Card>

      <View style={styles.footerLinks}>
        <Pressable onPress={() => router.push('/terms')}>
          <AppText style={styles.link}>Terms</AppText>
        </Pressable>
        <Pressable onPress={() => router.push('/privacy')}>
          <AppText style={styles.link}>Privacy</AppText>
        </Pressable>
        <Link href="/sign-in" asChild>
          <Pressable>
            <AppText style={styles.link}>Sign in</AppText>
          </Pressable>
        </Link>
      </View>
    </Screen>
  )
}

function CheckRow({ checked, onPress, text }: { checked: boolean; onPress: () => void; text: string }) {
  return (
    <Pressable onPress={onPress} style={styles.checkRow}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <AppText style={styles.check}>✓</AppText> : null}
      </View>
      <AppText variant="muted" style={styles.checkText}>{text}</AppText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  title: { marginTop: 8 },
  copy: { marginTop: 10, marginBottom: spacing.xl },
  nameRow: { flexDirection: 'row', gap: spacing.md },
  nameInput: { flex: 1 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: 8,
    backgroundColor: '#161C2C',
    color: colors.textPrimary,
    paddingHorizontal: 14,
    marginBottom: spacing.md,
    fontSize: 15,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  box: { width: 22, height: 22, borderRadius: 5, borderWidth: 1, borderColor: colors.borderActive, alignItems: 'center', justifyContent: 'center' },
  boxChecked: { backgroundColor: colors.gold, borderColor: colors.gold },
  check: { color: colors.bgPrimary, fontWeight: '900' },
  checkText: { flex: 1 },
  note: { marginBottom: spacing.md, fontSize: 12, lineHeight: 18 },
  error: { color: colors.red, marginBottom: spacing.md },
  success: { color: colors.green, marginBottom: spacing.md },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, marginTop: spacing.xl },
  link: { color: colors.gold, fontWeight: '700' },
})
