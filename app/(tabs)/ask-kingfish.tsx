import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { kingfishFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { colors, spacing } from '@/lib/theme'
import type { ChatMessage } from '@/types'

const FREE_DAILY_LIMIT = 3

const STARTERS = [
  'Who has the best hit prop today?',
  'Any HR picks worth a look?',
  'What are the strongest looks today?',
]

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

export default function AskKingFishScreen() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const scrollRef = useRef<ScrollView>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [limitHit, setLimitHit] = useState(false)

  const date = useMemo(todayKey, [])
  const usageQuery = useQuery({
    queryKey: ['chat-usage', date],
    queryFn: () => kingfishFetch<{ count: number }>(`/api/chat-usage?date=${date}`),
    staleTime: 60 * 1000,
  })
  const historyQuery = useQuery({
    queryKey: ['chat-history'],
    queryFn: () => kingfishFetch<{ messages: ChatMessage[] }>('/api/chat-history'),
    staleTime: 60 * 1000,
  })

  const chatsUsed = usageQuery.data?.count || 0
  const chatsLeft = Math.max(0, FREE_DAILY_LIMIT - chatsUsed)
  const isPremium = profile?.is_premium === true
  const reachedLimit = !isPremium && (limitHit || chatsLeft <= 0)

  useEffect(() => {
    if (messages.length === 0 && historyQuery.data?.messages?.length) {
      setMessages(historyQuery.data.messages)
    }
  }, [historyQuery.data?.messages, messages.length])

  async function sendMessage(text = input) {
    const trimmed = text.trim()
    if (!trimmed || sending || reachedLimit) return

    Keyboard.dismiss()
    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setSending(true)

    try {
      const data = await kingfishFetch<{ reply: string; isPremium?: boolean }>('/api/kingfish-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })

      setMessages((current) => [...current, { role: 'assistant', content: data.reply }])
      await queryClient.invalidateQueries({ queryKey: ['chat-usage', date] })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message === 'limit_reached') {
        setLimitHit(true)
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: `You've used your ${FREE_DAILY_LIMIT} free chats for today. Premium unlocks unlimited Ask KingFish access.`,
          },
        ])
      } else {
        setMessages((current) => [
          ...current,
          { role: 'assistant', content: 'Something went wrong while KingFish was thinking. Try again in a minute.' },
        ])
      }
    } finally {
      setSending(false)
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Image source={require('../../assets/images/kingfish-mascot2.png')} style={styles.avatar} />
        <AppText variant="eyebrow">// AI Analyst</AppText>
        <AppText variant="title" style={styles.title}>Ask KingFish</AppText>
        <AppText variant="muted" style={styles.copy}>
          Sharp answers backed by live odds, props, stats, and KingFish context.
        </AppText>

        <View style={styles.limitRow}>
          {!isPremium && Array.from({ length: FREE_DAILY_LIMIT }).map((_, index) => (
            <View key={index} style={[styles.limitDot, index < chatsLeft && styles.limitDotActive]} />
          ))}
          <AppText variant="mono">
            {isPremium
              ? 'Unlimited Premium chat'
              : reachedLimit
                ? 'Daily free limit reached'
                : `${chatsLeft} free chat${chatsLeft === 1 ? '' : 's'} left today`}
          </AppText>
        </View>
      </View>

      {messages.length === 0 && !reachedLimit && (
        <View style={styles.starters}>
          {STARTERS.map((starter) => (
            <Pressable key={starter} onPress={() => setInput(starter)} style={styles.starterButton}>
              <AppText style={styles.starterText}>{starter}</AppText>
            </Pressable>
          ))}
        </View>
      )}

      {(messages.length > 0 || sending || historyQuery.isLoading) && (
        <Card>
          {historyQuery.isLoading && messages.length === 0 && (
            <View style={styles.contextRow}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted">Loading KingFish...</AppText>
            </View>
          )}

          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((message, index) => <MessageBubble key={`${message.role}-${index}`} message={message} />)}

            {sending && (
              <View style={styles.thinkingRow}>
                <ActivityIndicator color={colors.gold} />
                <AppText variant="muted">KingFish is thinking...</AppText>
              </View>
            )}
          </ScrollView>
        </Card>
      )}

      {reachedLimit && (
        <View style={styles.upgradeBox}>
          <AppText variant="eyebrow">// Premium</AppText>
          <AppText style={styles.upgradeTitle}>Unlimited Ask KingFish</AppText>
          <AppText variant="muted" style={styles.upgradeCopy}>
            Premium includes unlimited chat, player props, cheat sheets, and edge tools.
          </AppText>
          <Button onPress={() => router.push('/modals/paywall')}>View Premium</Button>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          editable={!sending && !reachedLimit}
          placeholder={reachedLimit ? 'Premium unlocks unlimited chat' : 'Ask KingFish...'}
          placeholderTextColor={colors.textMuted}
          multiline
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
          style={styles.input}
        />
        <Pressable
          onPress={() => sendMessage()}
          disabled={sending || !input.trim() || reachedLimit}
          style={[styles.sendButton, (sending || !input.trim() || reachedLimit) && styles.sendDisabled]}
        >
          <AppText style={styles.sendText}>Send</AppText>
        </Pressable>
      </View>
    </Screen>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.kingFishBubble]}>
        <AppText style={[styles.messageText, isUser && styles.userMessageText]}>{message.content}</AppText>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: spacing.lg,
  },
  title: {
    marginTop: 8,
    textAlign: 'center',
  },
  copy: {
    marginTop: 10,
    textAlign: 'center',
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  limitDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  limitDotActive: {
    backgroundColor: colors.gold,
  },
  starters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  starterButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.bgCardAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  starterText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  messages: {
    maxHeight: 430,
  },
  messagesContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyCopy: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  messageRow: {
    flexDirection: 'row',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '88%',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  kingFishBubble: {
    backgroundColor: colors.bgCardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: colors.gold,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
  },
  userMessageText: {
    color: colors.bgPrimary,
    fontWeight: '800',
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  upgradeBox: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.25)',
    borderRadius: 12,
    backgroundColor: 'rgba(198,145,50,.07)',
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  upgradeCopy: {
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: 10,
    backgroundColor: colors.bgCard,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: 15,
  },
  sendButton: {
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
  },
  sendDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: colors.bgPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
})
