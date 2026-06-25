// Bet-slip parser for "Grade My Slip".
//
// Takes the raw text that on-device OCR (Apple Vision) pulled off a sportsbook
// screenshot and groups it into legs. Heuristic and tuned against real slips — the
// user confirms/edits the result before anything is graded, so "recognizes the legs"
// is the bar, not perfection. Runs fully on-device; no network.
//
// Strategy: walk the lines top-to-bottom. A line that names a market anchors a leg:
//   • a player-prop market in the line ("Salvador Perez Hits") → player + market
//   • a team market on its own line ("Moneyline") → the team is the line just before
// Line values ("1+", "Over 1.5") attach to the leg they sit next to. UI chrome,
// money, keypad digits, and the parlay's total odds are filtered out.

export type DetectedLeg = {
  id: string
  selection: string // player or team
  market: string // e.g. "Hits", "Moneyline"
  line: string // e.g. "1+", "Over 1.5" ('' if none)
  odds: string // per-leg American odds if shown ('' for most parlay legs)
  raw: string // source line(s), for the confirm step / debugging
}

// Prop markets across all five sports, longest-first so "Total Bases" wins over
// "Bases" and "Home Runs" over "Runs".
const PROP_MARKETS = [
  'Hits+Runs+RBIs', 'Points+Rebounds+Assists', 'Pts+Reb+Ast',
  'Shots on Goal', 'Blocked Shots', 'Power Play Points', '3-Pointers Made', '3-Pointers',
  'Total Bases', 'Home Runs', 'Home Run', 'Stolen Bases',
  'Passing Yards', 'Pass Yards', 'Rushing Yards', 'Rush Yards', 'Receiving Yards', 'Rec Yards',
  'Passing TDs', 'Pass TDs', 'Rushing TDs', 'Rush TDs', 'Anytime TD', 'Touchdowns', 'Touchdown',
  'Strikeouts', 'Receptions', 'Completions', 'Interceptions', 'Tackles', 'Sacks',
  'Rebounds', 'Assists', 'Threes', 'Blocks', 'Steals', 'Turnovers', 'Saves',
  'Singles', 'Doubles', 'Triples', 'RBIs', 'RBI', 'Walks', 'Hits', 'Runs', 'Bases',
  'Points', 'Goals', 'Shots',
].sort((a, b) => b.length - a.length)

const PROP_RE = new RegExp(`(${PROP_MARKETS.map((m) => m.replace(/[+]/g, '\\+')).join('|')})`, 'i')
const TEAM_MARKET_RE = /^(money\s?line|spread|run\s?line|puck\s?line|total(?:\s+(?:runs|points|goals))?|over|under|alt(?:ernate)?[\w\s]*)$/i
const LINE_VAL_RE = /^(?:(over|under|o|u)\s*)?(\d+(?:\.\d+)?)\s*\+?$/i
const ODDS_RE = /^[+-]\d{2,4}$/

function clean(s: string) {
  return s.replace(/\s*\^+\s*$/, '').replace(/\s+/g, ' ').trim()
}

// UI chrome / money / keypad — never a leg or a selection.
function isNoise(line: string): boolean {
  if (!line) return true
  if (/bet slip|clear all|^sgp$|pick parlay|hide legs|show legs|cash\s?out|view rewards|^edit$|^share$|^remove$|same game|^bonus|^boost|odds boost|^place bet|^parlay$/i.test(line)) return true
  if (/^[+]?\$/.test(line) || /^\$?\d+\.\d{2}$/.test(line) || line === '$') return true // money
  if (/^\d{1,2}$/.test(line)) return true // lone keypad digit (but "1+" keeps its plus)
  return false
}

function isGameHeader(line: string) {
  return line.includes('@') || /\bvs\.?\b/i.test(line) || /•/.test(line)
}

export type ParsedSlip = {
  legs: DetectedLeg[]
  isSGP: boolean // same-game parlay (all legs one game) — gates "Improve my grade"
  matchup: string // e.g. "STL Cardinals @ KC Royals" ('' if none read)
}

export function parseSlip(rawText: string): ParsedSlip {
  const explicitSgp = /\bsgp\b|same[- ]?game parlay/i.test(rawText)
  let matchup = ''
  let matchupCount = 0

  const lines = rawText
    .split(/\r?\n/)
    .map(clean)
    .filter((l) => l.length > 0 && !isNoise(l))

  const legs: DetectedLeg[] = []
  let pendingSelection = ''
  let pendingLine = ''
  let n = 0

  const push = (selection: string, market: string, line: string, raw: string) => {
    if (!selection && !market) return
    legs.push({ id: `leg_${n++}`, selection: clean(selection), market, line, odds: '', raw })
    pendingSelection = ''
    pendingLine = ''
  }

  for (const line of lines) {
    // A standalone line value — remember it for the next/most-recent leg.
    const lv = line.match(LINE_VAL_RE)
    if (lv) {
      pendingLine = lv[1] ? `${capitalize(lv[1])} ${lv[2]}` : `${lv[2]}+`
      continue
    }
    if (ODDS_RE.test(line)) {
      // Lone odds late in a parlay = the parlay's total price; attach to the last
      // leg only if that leg has no odds yet and we're clearly mid-leg.
      if (legs.length && !legs[legs.length - 1].odds && pendingSelection) {
        legs[legs.length - 1].odds = line
      }
      continue
    }

    // Team market on its own line → selection is what we saw just before it.
    if (TEAM_MARKET_RE.test(line)) {
      push(pendingSelection, normalizeMarket(line), '', `${pendingSelection} ${line}`.trim())
      continue
    }

    // Player-prop market embedded in the line ("Salvador Perez Hits").
    const pm = line.match(PROP_RE)
    if (pm) {
      const market = pm[1]
      const before = line.slice(0, pm.index).trim()
      const selection = before || pendingSelection
      push(selection, titleCase(market), pendingLine, line)
      continue
    }

    if (isGameHeader(line)) {
      // Matchup header (e.g. "STL Cardinals @ KC Royals • Today 7:15 PM") — context,
      // not a leg, and not the selection (the bet's team appears on its own line next).
      if (!matchup) matchup = line.replace(/\s*•.*$/, '').trim()
      matchupCount += 1
      continue
    }

    // Otherwise it's a candidate selection (team or player name) for the next market.
    pendingSelection = line
  }

  // Same-game parlay = 2+ legs with the book's SGP label, or a single matchup header.
  const isSGP = legs.length > 1 && (explicitSgp || matchupCount === 1)
  return { legs, isSGP, matchup }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
function titleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1))
}
function normalizeMarket(s: string) {
  const t = s.toLowerCase().replace(/\s+/g, ' ').trim()
  if (t.startsWith('money')) return 'Moneyline'
  if (t.startsWith('run line')) return 'Run Line'
  if (t.startsWith('puck line')) return 'Puck Line'
  if (t === 'spread') return 'Spread'
  if (t.startsWith('total')) return titleCase(t)
  return titleCase(s)
}
