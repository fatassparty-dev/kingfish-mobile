import { useState } from 'react'
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Link } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { useMobileConfig } from '@/lib/mobileConfig'
import { supabase } from '@/lib/supabase'
import { colors, spacing } from '@/lib/theme'

export default function ForgotPasswordScreen() {
  const mobileConfig = useMobileConfig()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function resetPassword() {
    setError('')
    setMessage('')
    setLoading(true)
    const redirectTo = `${mobileConfig.links.home.replace(/\/$/, '')}/account`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    })
    if (resetError) setError(resetError.message)
    else setMessage('Password reset email sent. Check your inbox and spam folder.')
    setLoading(false)
  }

  return (
    <Screen>
      <AppText variant="eyebrow">// Password Reset</AppText>
      <AppText variant="title" style={styles.title}>Reset Password</AppText>
      <AppText variant="muted" style={styles.copy}>
        Enter the email tied to your KingFish account. We will send a secure reset link.
      </AppText>
      <Card>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        {message ? <AppText style={styles.success}>{message}</AppText> : null}
        <Button loading={loading} onPress={resetPassword}>Send Reset Link</Button>
      </Card>
      <View style={styles.links}>
        <Link href="/sign-in" asChild>
          <Pressable>
            <AppText style={styles.link}>Back to sign in</AppText>
          </Pressable>
        </Link>
        <Pressable onPress={() => Linking.openURL(mobileConfig.links.support_email)}>
          <AppText style={styles.supportLink}>Contact support</AppText>
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { marginTop: 8 },
  copy: { marginTop: 10, marginBottom: spacing.xl },
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
  error: { color: colors.red, marginBottom: spacing.md },
  success: { color: colors.green, marginBottom: spacing.md },
  links: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  link: { color: colors.gold, fontWeight: '700' },
  supportLink: { color: colors.textSecondary, fontWeight: '700' },
})
