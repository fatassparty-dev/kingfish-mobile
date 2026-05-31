import Constants from 'expo-constants'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Alert, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { kingfishFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { openSupportEmail } from '@/lib/support'
import { colors, spacing } from '@/lib/theme'

const TOPICS = ['Account', 'Subscription', 'App Issue', 'Data Question', 'Other']

export default function SupportScreen() {
  const { user } = useAuth()
  const [topic, setTopic] = useState('Account')
  const [email, setEmail] = useState(user?.email || '')
  const [ccEmail, setCcEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const emailLocked = Boolean(user?.email)
  const appVersion = Constants.expoConfig?.version || ''

  const canSend = useMemo(() => {
    const hasPrimaryEmail = email.trim().length > 4
    const cc = ccEmail.trim()
    const ccLooksOk = !cc || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cc)
    return hasPrimaryEmail && ccLooksOk && message.trim().length >= 8 && !sending
  }, [ccEmail, email, message, sending])

  async function submitSupport() {
    setError('')
    setStatus('')
    setSending(true)

    try {
      await kingfishFetch<{ ok: boolean }>('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          email: email.trim(),
          ccEmail: ccEmail.trim(),
          message: message.trim(),
          platform: Platform.OS,
          appVersion,
        }),
      })

      setMessage('')
      setStatus('Sent. We will reply by email.')
    } catch (err: any) {
      setError(err?.message || 'Support request could not be sent.')
      Alert.alert('Could Not Send', 'Email support@kingfishbets.com if this keeps happening.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Email', onPress: () => openSupportEmail() },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <Screen>
      <AppText variant="eyebrow">// Support</AppText>
      <AppText variant="title" style={styles.title}>Contact Support</AppText>
      <AppText variant="muted" style={styles.copy}>
        Send a note to KingFish support. We will reply by email.
      </AppText>

      <Card>
        <AppText variant="eyebrow">Topic</AppText>
        <View style={styles.topicGrid}>
          {TOPICS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setTopic(item)}
              style={[styles.topicButton, topic === item && styles.topicButtonActive]}
            >
              <AppText style={[styles.topicText, topic === item && styles.topicTextActive]}>{item}</AppText>
            </Pressable>
          ))}
        </View>

        {emailLocked ? (
          <View style={styles.accountEmailRow}>
            <AppText variant="eyebrow">Account Email</AppText>
            <AppText style={styles.accountEmail}>{email}</AppText>
          </View>
        ) : (
          <>
            <AppText variant="eyebrow" style={styles.label}>Email</AppText>
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
          </>
        )}

        <AppText variant="eyebrow" style={styles.label}>CC Email</AppText>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="Optional"
          placeholderTextColor={colors.textMuted}
          value={ccEmail}
          onChangeText={setCcEmail}
          style={styles.input}
        />

        <AppText variant="eyebrow" style={styles.label}>Message</AppText>
        <TextInput
          multiline
          placeholder="What can we help with?"
          placeholderTextColor={colors.textMuted}
          textAlignVertical="top"
          value={message}
          onChangeText={setMessage}
          style={[styles.input, styles.messageInput]}
        />

        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        {status ? <AppText style={styles.success}>{status}</AppText> : null}

        <Button loading={sending} disabled={!canSend} onPress={submitSupport}>
          Send Message
        </Button>
      </Card>

      <View style={styles.actions}>
        <Button variant="outline" onPress={() => openSupportEmail()}>Email Instead</Button>
        <Button variant="secondary" onPress={() => router.back()}>Back</Button>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { marginTop: 8 },
  copy: { marginTop: spacing.sm, marginBottom: spacing.xl },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  topicButton: {
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#111520',
  },
  topicButtonActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(198,145,50,.12)',
  },
  topicText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  topicTextActive: {
    color: colors.gold,
  },
  label: {
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: 8,
    backgroundColor: '#111520',
    color: colors.textPrimary,
    paddingHorizontal: 14,
    marginBottom: spacing.md,
    fontSize: 15,
  },
  accountEmailRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: '#111520',
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  accountEmail: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
  },
  messageInput: {
    minHeight: 150,
    paddingTop: 14,
    lineHeight: 21,
  },
  error: { color: colors.red, marginBottom: spacing.md },
  success: { color: colors.green, marginBottom: spacing.md },
  actions: { gap: spacing.md, marginTop: spacing.lg },
})
