import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Image, Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { AppText } from '@/components/Text'
import { Screen } from '@/components/Screen'
import { colors, spacing } from '@/lib/theme'

export default function HomeScreen() {
  const lampGlow = useRef(new Animated.Value(0.28)).current
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    let mounted = true

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled)
    })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)

    return () => {
      mounted = false
      subscription.remove()
    }
  }, [])

  useEffect(() => {
    if (reduceMotion) {
      lampGlow.setValue(0.24)
      return
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(lampGlow, { toValue: 0.36, duration: 900, useNativeDriver: true }),
        Animated.timing(lampGlow, { toValue: 0.27, duration: 650, useNativeDriver: true }),
        Animated.timing(lampGlow, { toValue: 0.42, duration: 120, useNativeDriver: true }),
        Animated.timing(lampGlow, { toValue: 0.31, duration: 420, useNativeDriver: true }),
        Animated.timing(lampGlow, { toValue: 0.34, duration: 1100, useNativeDriver: true }),
        Animated.timing(lampGlow, { toValue: 0.28, duration: 780, useNativeDriver: true }),
      ]),
    )
    animation.start()

    return () => animation.stop()
  }, [lampGlow, reduceMotion])

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroImageWrap}>
          <Image source={require('../../assets/images/bait-shop-hero.png')} style={styles.heroImage} />
          <Animated.View pointerEvents="none" style={[styles.lampGlow, { opacity: lampGlow }]} />
        </View>
        <View style={styles.heroContent}>
          <View style={styles.brandRow}>
            <Image source={require('../../assets/images/crown-logo.png')} style={styles.logo} />
            <View style={styles.brandCopy}>
              <AppText variant="eyebrow">// KingFish Bets</AppText>
              <AppText variant="title" style={styles.title}>Welcome to the Bait Shop</AppText>
            </View>
          </View>

          <AppText style={styles.copy}>
            Live odds, props, sportsbook prices, weather, and KingFish context in one sharp betting research workspace.
          </AppText>

          <View style={styles.actionGrid}>
            <HomeAction
              label="Dashboard"
              body="Live odds, game lines, player props, and betting intelligence."
              onPress={() => router.push('/')}
            />
            <HomeAction
              label="Tools"
              body="Cheat sheets, calculators, and game factors."
              onPress={() => router.push('/cheat-sheets')}
            />
            <HomeAction
              label="Ask AI"
              body="Pressure-test props, parlays, totals, and matchup reads."
              onPress={() => router.push('/ask-kingfish')}
            />
            <HomeAction
              label="Account"
              body="Premium status, restore purchases, and support."
              onPress={() => router.push('/account')}
            />
          </View>
        </View>
      </View>
    </Screen>
  )
}

function HomeAction({ label, body, onPress }: { label: string; body: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.action}>
      <AppText style={styles.actionLabel}>{label}</AppText>
      <AppText variant="muted" style={styles.actionBody}>{body}</AppText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.32)',
    borderRadius: 16,
    backgroundColor: colors.bgCardAlt,
    overflow: 'hidden',
  },
  heroImageWrap: {
    width: '100%',
    height: 150,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    aspectRatio: 941 / 1672,
    resizeMode: 'cover',
  },
  lampGlow: {
    position: 'absolute',
    left: 154,
    top: 47,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,224,146,.62)',
  },
  heroContent: {
    padding: spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 58,
    height: 58,
    resizeMode: 'contain',
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    marginTop: 6,
    fontSize: 34,
    lineHeight: 36,
  },
  copy: {
    color: colors.textSecondary,
    fontSize: 17,
    lineHeight: 25,
    marginTop: spacing.lg,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  action: {
    width: '48%',
    minHeight: 118,
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.28)',
    borderRadius: 10,
    backgroundColor: 'rgba(8,9,14,.78)',
    padding: spacing.md,
  },
  actionLabel: {
    color: colors.gold,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
  },
  actionBody: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 19,
  },
})
