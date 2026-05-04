export type Sport = 'MLB' | 'NBA' | 'NFL' | 'NHL' | 'WNBA' | 'KBO' | 'NCAAB' | 'NCAAF' | 'SOCCER'

export interface UserProfile {
  user_id: string
  is_premium: boolean
  is_admin?: boolean
  is_vip?: boolean
  is_gifted?: boolean
  first_name?: string | null
  last_name?: string | null
  state?: string | null
  subscription_status?: string | null
  subscription_platform?: 'web' | 'ios' | 'android' | 'manual' | null
  stripe_plan?: 'monthly' | 'annual' | 'lifetime' | string | null
  premium_expires_at?: string | null
}

export interface Outcome {
  name: string
  description?: string
  price: number
  point?: number
}

export interface Market {
  key: string
  outcomes: Outcome[]
}

export interface Bookmaker {
  key: string
  title: string
  markets: Market[]
}

export interface Game {
  id?: string
  game_id?: string
  home_team: string
  away_team: string
  commence_time: string
  bookmakers: Bookmaker[]
}

export interface WeatherInfo {
  park: string
  tempF: number
  windStr: string
  windImpact: 'boost' | 'suppress' | 'neutral'
  precipPct: number
  sky: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
