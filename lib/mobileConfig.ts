import { useQuery } from '@tanstack/react-query'
import { kingfishFetch } from './api'

export type MobileConfig = {
  updated_at?: string
  links: {
    home: string
    fantasy_hub: string
    nfl_command_center: string
    help: string
    pricing: string
    terms: string
    privacy: string
    refund: string
    support_email: string
    responsible_gaming: string
  }
  app_notice: {
    title: string
    body: string
  } | null
  flags: {
    fantasy_hub: boolean
    nfl_props: boolean
    mobile_paywall: boolean
    [key: string]: boolean
  }
}

export const DEFAULT_MOBILE_CONFIG: MobileConfig = {
  links: {
    home: 'https://kingfishbets.com',
    fantasy_hub: 'https://kingfishbets.com/fantasy',
    nfl_command_center: 'https://kingfishbets.com/nfl',
    help: 'https://kingfishbets.com/help',
    pricing: 'https://kingfishbets.com/pricing',
    terms: 'https://kingfishbets.com/terms',
    privacy: 'https://kingfishbets.com/privacy',
    refund: 'https://kingfishbets.com/refund',
    support_email: 'mailto:support@kingfishbets.com',
    responsible_gaming: 'tel:18005224700',
  },
  app_notice: null,
  flags: {
    fantasy_hub: true,
    nfl_props: true,
    mobile_paywall: true,
    mlb_tab_league: true,
    mlb_tab_matchups: true,
    mlb_tab_lines: true,
    mlb_tab_props: true,
    nba_tab_league: true,
    nba_tab_matchups: true,
    nba_tab_lines: true,
    nba_tab_props: true,
    nhl_tab_league: true,
    nhl_tab_matchups: true,
    nhl_tab_lines: true,
    nhl_tab_props: true,
    wnba_tab_league: true,
    wnba_tab_matchups: true,
    wnba_tab_lines: true,
    wnba_tab_props: true,
    nfl_dashboard_tab_league: true,
    nfl_dashboard_tab_matchups: true,
    nfl_dashboard_tab_lines: true,
    nfl_dashboard_tab_props: true,
    mlb_access_lines_free: false,
    mlb_access_props_free: false,
    nba_access_lines_free: false,
    nba_access_props_free: false,
    nhl_access_lines_free: false,
    nhl_access_props_free: false,
    wnba_access_lines_free: false,
    wnba_access_props_free: false,
    nfl_access_lines_free: false,
    nfl_access_props_free: false,
    mlb_maintenance_lines: false,
    mlb_maintenance_props: false,
    nba_maintenance_lines: false,
    nba_maintenance_props: false,
    nhl_maintenance_lines: false,
    nhl_maintenance_props: false,
    wnba_maintenance_lines: false,
    wnba_maintenance_props: false,
    nfl_maintenance_lines: false,
    nfl_maintenance_props: false,
  },
}

export async function fetchMobileConfig() {
  try {
    const config = await kingfishFetch<MobileConfig>('/api/mobile-config')
    return {
      ...DEFAULT_MOBILE_CONFIG,
      ...config,
      links: {
        ...DEFAULT_MOBILE_CONFIG.links,
        ...config.links,
      },
      flags: {
        ...DEFAULT_MOBILE_CONFIG.flags,
        ...config.flags,
      },
    }
  } catch {
    return DEFAULT_MOBILE_CONFIG
  }
}

export function useMobileConfig() {
  const query = useQuery({
    queryKey: ['mobile-config'],
    queryFn: fetchMobileConfig,
    staleTime: 5 * 60 * 1000,
  })

  return query.data || DEFAULT_MOBILE_CONFIG
}
