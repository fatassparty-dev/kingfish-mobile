import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Image, Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { AppText } from '@/components/Text'
import { Screen } from '@/components/Screen'
import { colors, spacing } from '@/lib/theme'

export default function HomeScreen() {
  const lampGlow = useRef(new Animated.Value(0.46)).current
  const lampScale = useRef(new Animated.Value(1)).current
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
      lampGlow.setValue(0.42)
      lampScale.setValue(1)
      return
    }

    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(lampGlow, { toValue: 0.82, duration: 900, useNativeDriver: true }),
          Animated.timing(lampGlow, { toValue: 0.48, duration: 700, useNativeDriver: true }),
          Animated.timing(lampGlow, { toValue: 0.92, duration: 140, useNativeDriver: true }),
          Animated.timing(lampGlow, { toValue: 0.58, duration: 520, useNativeDriver: true }),
          Animated.timing(lampGlow, { toValue: 0.74, duration: 1200, useNativeDriver: true }),
          Animated.timing(lampGlow, { toValue: 0.5, duration: 800, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(lampScale, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(lampScale, { toValue: 0.96, duration: 700, useNativeDriver: true }),
          Animated.timing(lampScale, { toValue: 1.12, duration: 140, useNativeDriver: true }),
          Animated.timing(lampScale, { toValue: 1, duration: 2520, useNativeDriver: true }),
        ]),
      ]),
    )
    animation.start()

    return () => animation.stop()
  }, [lampGlow, lampScale, reduceMotion])

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroImageWrap}>
          <Image source={require('../../assets/images/bait-shop-hero.png')} style={styles.heroImage} />
          <Animated.View pointerEvents="none" style={[styles.lampGlow, { opacity: lampGlow, transform: [{ scale: lampScale }] }]}>
            <View style={styles.lampCore} />
          </Animated.View>
        </View>
        <View style={styles.heroContent}>
          <View style={styles.brandRow}>
            <Image source={require('../../assets/images/crown-logo.png')} style={styles.logo} />
            <View style={styles.brandCopy}>
              <AppText variant="eyebrow">// KingFish Bets</AppText>
              <AppText variant="title" style={styles.title}>Welcome to{'\n'}The KingFish{'\n'}Bait Shop</AppText>
            </View>
          </View>

          <AppText style={styles.copy}>
            Find the lines, context, and angles worth checking before you place a bet.
          </AppText>

          <View style={styles.actionGrid}>
            <HomeAction
              label="Dashboard"
              body="Live lines, props, and market movement."
              onPress={() => router.push('/')}
            />
            <HomeAction
              label="Tools"
              body="MLB and NFL cheat sheets plus calculators."
              onPress={() => router.push('/cheat-sheets')}
            />
            <HomeAction
              label="Fantasy Hub"
              body="Draft boards, rankings, sleepers, and team tools."
              onPress={() => router.push('/fantasy' as any)}
            />
            <HomeAction
              label="Game Factors"
              body="Weather, park, dome, and matchup context."
              onPress={() => router.push({ pathname: '/cheat-sheets', params: { mode: 'factors' } } as any)}
            />
            <HomeAction
              label="Ask KingFish"
              body="AI sports analysis connected to KingFish lines, props, and more."
              onPress={() => router.push('/ask-kingfish')}
            />
            <HomeAction
              label="Account"
              body="Manage premium access, purchases, and support."
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
    height: 132,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    aspectRatio: 941 / 1672,
    resizeMode: 'cover',
  },
  lampGlow: {
    position: 'absolute',
    left: 102,
    top: 63,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,220,126,.28)',
  },
  lampCore: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255,245,198,.72)',
  },
  heroContent: {
    padding: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    marginTop: 6,
    fontSize: 29,
    lineHeight: 31,
  },
  copy: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.md,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  action: {
    width: '48%',
    minHeight: 104,
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.28)',
    borderRadius: 10,
    backgroundColor: 'rgba(8,9,14,.78)',
    padding: 10,
  },
  actionLabel: {
    color: colors.gold,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '900',
  },
  actionBody: {
    marginTop: spacing.sm,
    fontSize: 12,
    lineHeight: 17,
  },
})
