import { Platform } from 'react-native'
import Constants from 'expo-constants'

/**
 * Acquisition metadata for supabase.auth.signUp.
 *
 * The web login page has always sent these fields, and the on_auth_user_created
 * trigger copies them into hq_acquisition_events — but the apps never did, so
 * every app signup landed in HQ as "unknown" with no platform on it. During the
 * 2026-08-27 Google Play launch that was 15 of 20 signups: the spike was real
 * and completely unattributable.
 *
 * The store is inferred from the platform, which is honest — it is where the
 * binary came from. It is NOT an install-referrer: which ad or listing drove
 * the download needs the store's own attribution SDK, which we do not ship.
 */
export function signupAttribution() {
  const build = Platform.OS === 'android'
    ? Constants.platform?.android?.versionCode
    : Constants.platform?.ios?.buildNumber
  return {
    acquisition_platform: Platform.OS,
    acquisition_source: Platform.OS === 'android' ? 'google_play' : 'app_store',
    acquisition_medium: 'app',
    acquisition_signup_path: 'app_signup',
    acquisition_client: 'kingfish-mobile',
    acquisition_app_version: Constants.expoConfig?.version || null,
    acquisition_app_build: build == null ? null : String(build),
  }
}
