import type { PropsWithChildren } from 'react'
import { StyleSheet, Text as RNText, TextProps } from 'react-native'
import { colors } from '@/lib/theme'

interface AppTextProps extends TextProps, PropsWithChildren {
  variant?: 'eyebrow' | 'title' | 'body' | 'muted' | 'mono'
}

export function AppText({ variant = 'body', style, children, ...props }: AppTextProps) {
  return (
    <RNText {...props} style={[styles.base, styles[variant], style]}>
      {children}
    </RNText>
  )
}

const styles = StyleSheet.create({
  base: {
    color: colors.textPrimary,
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: '900',
    textTransform: 'uppercase',
    lineHeight: 36,
  },
  body: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  mono: {
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 0.6,
  },
})
