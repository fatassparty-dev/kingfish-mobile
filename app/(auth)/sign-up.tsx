import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { Link, router } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { supabase } from '@/lib/supabase'
import { colors, spacing } from '@/lib/theme'
import { normalizeLocation, LOCATION_OPTIONS } from '@/lib/locations'

// Supabase returns weak-password errors as a raw string that lists the entire
// required character sets (the whole alphabet, all digits) — unreadable to a user.
// Translate it into plain language, derived from what Supabase actually asked for
// so the guidance stays accurate even if the password policy changes.
function friendlyAuthError(err: { message?: string; code?: string } | null): string {
  const message = err?.message || 'Could not create your account. Please try again.'
  const isWeakPassword =
    err?.code === 'weak_password' ||
    (/password/i.test(message) && /(should contain|at least one character|too weak)/i.test(message))
  if (!isWeakPassword) return message

  const needs: string[] = []
  if (message.includes('abcdefghijklmnopqrstuvwxyz')) needs.push('a lowercase letter')
  if (message.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ')) needs.push('an uppercase letter')
  if (message.includes('0123456789')) needs.push('a number')
  if (message.includes('!@#$')) needs.push('a symbol')

  if (!needs.length) {
    return 'Password must be at least 8 characters and use a mix of uppercase and lowercase letters and numbers.'
  }
  const list =
    needs.length === 1
      ? needs[0]
      : `${needs.slice(0, -1).join(', ')}, and ${needs[needs.length - 1]}`
  return `Password must be at least 8 characters and include ${list}.`
}

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
  const [showLocationPicker, setShowLocationPicker] = useState(false)

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
      setError(friendlyAuthError(authError))
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
        <Pressable onPress={() => setShowLocationPicker(true)} style={[styles.input, styles.selectTrigger]}>
          <AppText style={state ? styles.selectValue : styles.selectPlaceholder}>
            {LOCATION_OPTIONS.find((o) => o.value === state)?.label ?? 'Select your location...'}
          </AppText>
        </Pressable>
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

      <Modal visible={showLocationPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowLocationPicker(false)}>
        <View style={styles.modalScreen}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <AppText variant="eyebrow">// Location</AppText>
            <AppText variant="title" style={styles.modalTitle}>Select your location</AppText>
            <View style={styles.optionList}>
              {LOCATION_OPTIONS.map((option) => {
                const active = state === option.value
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => { setState(option.value); setShowLocationPicker(false) }}
                    style={[styles.option, active && styles.optionActive]}
                  >
                    <AppText style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</AppText>
                    {active ? <AppText style={styles.optionCheck}>✓</AppText> : null}
                  </Pressable>
                )
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  selectTrigger: { justifyContent: 'center' },
  selectValue: { color: colors.textPrimary, fontSize: 15 },
  selectPlaceholder: { color: colors.textMuted, fontSize: 15 },
  modalScreen: { flex: 1, backgroundColor: colors.bgPrimary },
  modalContent: { padding: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  modalTitle: { marginTop: spacing.sm, marginBottom: spacing.lg },
  optionList: { gap: spacing.sm },
  option: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionActive: { borderColor: 'rgba(198,145,50,.55)', backgroundColor: 'rgba(198,145,50,.08)' },
  optionText: { color: colors.textSecondary, fontWeight: '800', fontSize: 15 },
  optionTextActive: { color: colors.textPrimary },
  optionCheck: { color: colors.gold, fontWeight: '900' },
})
