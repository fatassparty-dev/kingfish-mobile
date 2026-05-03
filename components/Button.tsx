import { PropsWithChildren } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors, radius } from '@/lib/theme'

interface ButtonProps extends PropsWithChildren {
  onPress?: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  loading?: boolean
  disabled?: boolean
}

export function Button({ children, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        (pressed || disabled || loading) && styles.dimmed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.bgPrimary : colors.textPrimary} />
      ) : (
        <Text style={[styles.label, variant === 'primary' && styles.primaryLabel]}>{children}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primary: {
    backgroundColor: colors.gold,
  },
  secondary: {
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.borderActive,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.35)',
  },
  dimmed: {
    opacity: 0.7,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryLabel: {
    color: colors.bgPrimary,
  },
})
