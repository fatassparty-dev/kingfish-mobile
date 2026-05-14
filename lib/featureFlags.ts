import { supabase } from './supabase'

export type FeatureFlagKey =
  | 'dashboard_mlb'
  | 'dashboard_nba'
  | 'dashboard_nhl'
  | 'dashboard_wnba'
  | 'dashboard_kbo'
  | 'dashboard_ncaab'
  | 'dashboard_ncaaf'
  | 'dashboard_soccer'
  | 'fantasy_hub'
  | 'nfl_props'
  | 'mobile_paywall'

export type FeatureFlag = {
  key: FeatureFlagKey
  enabled: boolean
}

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  dashboard_mlb: true,
  dashboard_nba: true,
  dashboard_nhl: true,
  dashboard_wnba: true,
  dashboard_kbo: true,
  dashboard_ncaab: false,
  dashboard_ncaaf: false,
  dashboard_soccer: false,
  fantasy_hub: true,
  nfl_props: true,
  mobile_paywall: true,
}

export function mergeFeatureFlags(rows: Partial<FeatureFlag>[] | null | undefined) {
  const merged = { ...DEFAULT_FEATURE_FLAGS }

  rows?.forEach((row) => {
    if (!row.key || !(row.key in merged)) return
    merged[row.key as FeatureFlagKey] = row.enabled === true
  })

  return merged
}

export async function fetchFeatureFlags() {
  const { data } = await supabase
    .from('app_feature_flags')
    .select('key,enabled')

  return mergeFeatureFlags(data as Partial<FeatureFlag>[] | null)
}
