import Constants from 'expo-constants'
import type { PropsWithChildren } from 'react'
import { useState } from 'react'
import { Linking, Modal, Platform, StyleSheet, View } from 'react-native'
import { Button } from './Button'
import { AppText } from './Text'
import { useMobileConfig } from '@/lib/mobileConfig'
import { colors, spacing } from '@/lib/theme'

export function compareVersions(left: string, right: string) {
  const a = left.split('.').map(part => Number(part) || 0)
  const b = right.split('.').map(part => Number(part) || 0)
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) > (b[index] || 0)) return 1
    if ((a[index] || 0) < (b[index] || 0)) return -1
  }
  return 0
}

export function AppControlGate({ children }: PropsWithChildren) {
  const config = useMobileConfig()
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null)
  const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null
  const currentVersion = Constants.expoConfig?.version || '0.0.0'
  const release = config.release
  const minimumVersion = platform ? release?.minimum_supported_version?.[platform] : undefined
  const latestVersion = platform ? release?.latest_version?.[platform] : undefined
  const storeUrl = platform ? release?.store_urls?.[platform] : undefined
  const mustUpdate = Boolean(minimumVersion && compareVersions(currentVersion, minimumVersion) < 0)
  const updateAvailable = Boolean(
    !mustUpdate
    && latestVersion
    && compareVersions(currentVersion, latestVersion) < 0
    && dismissedVersion !== latestVersion,
  )

  const openStore = () => Linking.openURL(storeUrl || config.links.home)

  if (release?.maintenance?.enabled) {
    return (
      <View style={styles.blockingPage}>
        <AppText variant="eyebrow">// Maintenance</AppText>
        <AppText variant="title" style={styles.title}>{release.maintenance.title || 'KingFish is refreshing'}</AppText>
        <AppText variant="muted" style={styles.body}>{release.maintenance.body || 'Please check back shortly.'}</AppText>
      </View>
    )
  }

  if (mustUpdate) {
    return (
      <View style={styles.blockingPage}>
        <AppText variant="eyebrow">// Update Required</AppText>
        <AppText variant="title" style={styles.title}>Update KingFish Bets</AppText>
        <AppText variant="muted" style={styles.body}>
          {release?.update_message || 'A newer version is required to continue.'}
        </AppText>
        <View style={styles.action}><Button onPress={openStore}>Open App Store</Button></View>
      </View>
    )
  }

  return (
    <>
      {children}
      <Modal visible={updateAvailable} transparent animationType="fade" onRequestClose={() => setDismissedVersion(latestVersion || null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <AppText variant="eyebrow">// Update Available</AppText>
            <AppText variant="title" style={styles.title}>A newer KingFish is ready</AppText>
            <AppText variant="muted" style={styles.body}>{release?.update_message}</AppText>
            <View style={styles.action}><Button onPress={openStore}>Update Now</Button></View>
            <View style={styles.action}><Button variant="outline" onPress={() => setDismissedVersion(latestVersion || null)}>Not Now</Button></View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  blockingPage: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bgPrimary,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(0,0,0,.72)',
  },
  sheet: {
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: 16,
    backgroundColor: colors.bgPrimary,
  },
  title: { marginTop: spacing.sm },
  body: { marginTop: spacing.md, lineHeight: 22 },
  action: { marginTop: spacing.lg },
})
