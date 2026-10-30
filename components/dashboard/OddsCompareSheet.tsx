/**
 * "Tap a price, see every book": the phone version of the web's OddsCompare
 * popup (kingfish-bets app/dashboard/components/OddsCompare.tsx), plus the
 * alt-line picker that stands in for the web board's per-row line dropdown.
 *
 * Both are bottom sheets on React Native `Modal` (the PlayerProfileModal
 * pattern). They close on the backdrop, the X, or Android back. Prices are the
 * raw book prices already in the payload; nothing here is a derived number.
 */
import type { ReactNode } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { AppText } from '@/components/Text'
import { fmtOdds } from '@/lib/format'
import type { BookPrice } from '@/lib/oddsCompare'
import { displayBookName, shortBookName } from '@/lib/sportsbooks'
import { colors, spacing } from '@/lib/theme'

export type OddsCompareData = {
  title: string
  subtitle: string
  prices: BookPrice[]
  note?: string
}

export type LinePickerData = {
  title: string
  subtitle: string
  options: Array<{ line: number; label: string; best?: BookPrice }>
  selected: number
  onPick: (line: number) => void
}

// A price cell's tap target is small text; this brings it to Apple's 44pt.
const CHIP_HIT_SLOP = { top: 14, bottom: 14, left: 8, right: 8 }

/**
 * Any price cell as a button that opens the compare sheet, keeping the cell's
 * own layout. Nested inside a row's own Pressable, this one wins the tap, so
 * the rest of the row keeps its action.
 */
export function CompareTap({ title, onPress, children, style }: { title: string; onPress: () => void; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={CHIP_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`${title} odds at every book`}
      style={({ pressed }) => [style, pressed && styles.chipPressed]}
    >
      {children}
    </Pressable>
  )
}

/** A price as a gold, dotted-underlined button that opens the compare sheet. */
export function PriceChip({ title, onPress, children, style }: { title: string; onPress: () => void; children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <CompareTap title={title} onPress={onPress}>
      <AppText variant="mono" style={[styles.chipText, style]} numberOfLines={1}>{children}</AppText>
    </CompareTap>
  )
}

function BottomSheet({ visible, title, subtitle, label, onClose, children }: {
  visible: boolean
  title: string
  subtitle: string
  label: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      supportedOrientations={['portrait', 'landscape-left', 'landscape-right']}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet} accessibilityViewIsModal accessibilityLabel={label}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <AppText style={styles.title} numberOfLines={2}>{title}</AppText>
              <AppText variant="mono" style={styles.subtitle} numberOfLines={2}>{subtitle}</AppText>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
              <AppText style={styles.closeText}>×</AppText>
            </Pressable>
          </View>
          <ScrollView bounces={false} contentContainerStyle={styles.body}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  )
}

export function OddsCompareSheet({ data, onClose }: { data: OddsCompareData | null; onClose: () => void }) {
  return (
    <BottomSheet
      visible={Boolean(data)}
      title={data?.title || ''}
      subtitle={data?.subtitle || ''}
      label={`${data?.title || ''} odds by book`}
      onClose={onClose}
    >
      {(data?.prices || []).map((price, index) => (
        <View
          key={price.book}
          style={[styles.item, index === 0 && styles.itemBest]}
          accessible
          accessibilityLabel={`${displayBookName(price.book)} ${fmtOdds(price.odds)}${index === 0 ? ', best price' : ''}`}
        >
          <View style={styles.bookWrap}>
            <AppText style={[styles.bookName, index === 0 && styles.bestText]}>{displayBookName(price.book)}</AppText>
            {index === 0 ? <AppText style={styles.bestTag}>Best</AppText> : null}
          </View>
          <AppText variant="mono" style={[styles.price, index === 0 && styles.bestText]}>{fmtOdds(price.odds)}</AppText>
        </View>
      ))}
      {data?.note ? <AppText variant="mono" style={styles.note}>{data.note}</AppText> : null}
    </BottomSheet>
  )
}

export function LinePickerSheet({ data, onClose }: { data: LinePickerData | null; onClose: () => void }) {
  return (
    <BottomSheet
      visible={Boolean(data)}
      title={data?.title || ''}
      subtitle={data?.subtitle || ''}
      label={`${data?.title || ''} line choices`}
      onClose={onClose}
    >
      {(data?.options || []).map((option) => {
        const selected = option.line === data?.selected
        return (
          <Pressable
            key={option.line}
            onPress={() => {
              data?.onPick(option.line)
              onClose()
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${option.label}${option.best ? `, ${fmtOdds(option.best.odds)} at ${displayBookName(option.best.book)}` : ''}`}
            style={({ pressed }) => [styles.item, styles.pickItem, selected && styles.pickSelected, pressed && styles.chipPressed]}
          >
            <AppText style={[styles.pickLine, selected && styles.bestText]}>{option.label}</AppText>
            {option.best ? (
              <AppText variant="mono" style={[styles.price, selected && styles.bestText]}>
                {fmtOdds(option.best.odds)} {shortBookName(option.best.book)}
              </AppText>
            ) : null}
          </Pressable>
        )
      })}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  chipText: {
    color: colors.gold,
    fontWeight: '900',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: 'rgba(198,145,50,.5)',
  },
  chipPressed: {
    opacity: 0.6,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5,7,12,.72)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  close: {
    paddingHorizontal: 4,
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 28,
    lineHeight: 28,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 34,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemBest: {
    backgroundColor: 'rgba(198,145,50,.06)',
  },
  bookWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  bookName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  bestTag: {
    color: colors.gold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  price: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  bestText: {
    color: colors.gold,
  },
  note: {
    marginTop: spacing.sm,
    fontSize: 11,
    lineHeight: 15,
  },
  pickItem: {
    borderRadius: 8,
  },
  pickSelected: {
    backgroundColor: 'rgba(198,145,50,.1)',
  },
  pickLine: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
})
