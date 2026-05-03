import { useState } from 'react'
import { Image, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Link } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { supabase } from '@/lib/supabase'
import { colors, spacing } from '@/lib/theme'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function signIn() {
    setError('')
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (authError) setError(authError.message || 'Invalid email or password.')
    setLoading(false)
  }

  return (
    <Screen>
      <View style={styles.brand}>
        <Image source={require('../../assets/images/crown-logo.png')} style={styles.logo} />
        <AppText variant="eyebrow">// KingFish Bets</AppText>
        <AppText variant="title" style={styles.title}>Sign In</AppText>
        <AppText variant="muted" style={styles.copy}>
          Access your dashboard, cheat sheets, Ask KingFish history, and premium status.
        </AppText>
      </View>

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
        <TextInput
          autoCapitalize="none"
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        <Button loading={loading} onPress={signIn}>Sign In</Button>
      </Card>

      <View style={styles.links}>
        <Link href="/forgot-password" asChild>
          <Pressable>
            <AppText style={styles.link}>Forgot password?</AppText>
          </Pressable>
        </Link>
        <Link href="/sign-up" asChild>
          <Pressable>
            <AppText style={styles.link}>Create account</AppText>
          </Pressable>
        </Link>
      </View>

      <View style={styles.legalLinks}>
        <Pressable onPress={() => Linking.openURL('https://kingfishbets.com/terms')}>
          <AppText style={styles.legalLink}>Terms</AppText>
        </Pressable>
        <Pressable onPress={() => Linking.openURL('https://kingfishbets.com/privacy')}>
          <AppText style={styles.legalLink}>Privacy</AppText>
        </Pressable>
        <Pressable onPress={() => Linking.openURL('mailto:support@kingfishbets.com')}>
          <AppText style={styles.legalLink}>Support</AppText>
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
  logo: { width: 78, height: 78, borderRadius: 18, marginBottom: spacing.lg },
  title: { marginTop: 8, textAlign: 'center' },
  copy: { marginTop: spacing.md, textAlign: 'center' },
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
  links: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  link: { color: colors.gold, fontWeight: '700' },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.xl,
  },
  legalLink: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
})
