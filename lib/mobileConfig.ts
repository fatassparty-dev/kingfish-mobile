import { useQuery } from '@tanstack/react-query'
import { kingfishFetch } from './api'

// A home-screen tile: deep-links into a screen in the app. The list is
// server-driven (/api/mobile-config home_tiles, defaults in kingfish-bets
// lib/homeTiles.ts) so the home layout can change with a site deploy — never
// an App Store build. DEFAULT_MOBILE_CONFIG.home_tiles is the offline/stale
// fallback; keep it in sync with the server defaults.
export type HomeTile = {
  key: string
  label: string
  body: string
  route: string
  params?: Record<string, string>
}

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
  dashboard_sport_order: string[]
  home_tiles: HomeTile[]
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
  dashboard_sport_order: ['MLB', 'NFL', 'NBA', 'NHL', 'WNBA', 'KBO', 'NCAAB', 'NCAAF', 'Soccer'],
  home_tiles: [
    {
      key: 'top-leans',
      label: 'Top 5 KingFish Leans',
      body: "Today's five best prop edges plus the top game lean. Locks 9:05 AM CT.",
      route: '/cheat-sheets',
      params: { sheet: 'topleans' },
    },
    {
      key: 'nrfi',
      label: 'NRFI / YRFI',
      body: 'A first-inning run / no-run call for every game today.',
      route: '/cheat-sheets',
      params: { sheet: 'nrfi' },
    },
    {
      key: 'value-finder',
      label: 'Game Lines',
      body: 'The KingFish value lean and best prices for every game, per sport.',
      route: '/value-finder',
    },
    {
      key: 'game-factors',
      label: 'Game Factors',
      body: 'Weather, park, dome, and matchup context.',
      route: '/game-factors',
    },
    {
      key: 'fantasy',
      label: 'Fantasy Hub',
      body: 'Draft boards, rankings, sleepers, and team tools.',
      route: '/fantasy',
    },
    {
      key: 'scout',
      label: 'The Scout',
      body: 'NFL tracking data: separation, pressure, coverage.',
      route: '/scout',
    },
    {
      key: 'ref-report',
      label: 'Ref Report',
      body: 'Officiating crew tendencies and totals impact.',
      route: '/ref-report',
    },
    {
      key: 'grade-slip',
      label: 'Grade My Slip',
      body: 'Snap a bet slip for an A–F grade and per-leg read.',
      route: '/grade-slip',
    },
  ],
  flags: {
    fantasy_hub: true,
    nfl_props: false,
    mobile_paywall: true,
    dashboard_tab_mlb: true,
    dashboard_tab_nba: true,
    dashboard_tab_nfl: true,
    dashboard_tab_nhl: true,
    dashboard_tab_wnba: true,
    dashboard_tab_kbo: true,
    dashboard_tab_ncaab: true,
    dashboard_tab_ncaaf: true,
    dashboard_tab_soccer: true,
    dashboard_mlb: true,
    dashboard_nba: true,
    dashboard_nhl: true,
    dashboard_wnba: true,
    dashboard_kbo: true,
    dashboard_ncaab: false,
    dashboard_ncaaf: false,
    dashboard_soccer: false,
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
    cheat_sheets_free: false,
    pro_tools_free: false,
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
      dashboard_sport_order: Array.isArray(config.dashboard_sport_order)
        ? config.dashboard_sport_order
        : DEFAULT_MOBILE_CONFIG.dashboard_sport_order,
      home_tiles: Array.isArray(config.home_tiles) && config.home_tiles.length
        ? config.home_tiles
        : DEFAULT_MOBILE_CONFIG.home_tiles,
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
