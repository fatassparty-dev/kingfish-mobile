import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const exports = {}
runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/oddsCompare.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports })
const { priceList, sidePricesAtLine, yesPrices, gameLinePrices, gameLineCompare, propBookLines, lineOptions, sideHit, sideHitRate, sideHitCount } = exports

const plain = (value) => JSON.parse(JSON.stringify(value))

test('priceList sorts best first and keeps input order on ties', () => {
  assert.deepEqual(plain(priceList({ fanduel: -110, draftkings: -105, betmgm: -105, espnbet: -120 })), [
    { book: 'draftkings', odds: -105 },
    { book: 'betmgm', odds: -105 },
    { book: 'fanduel', odds: -110 },
    { book: 'espnbet', odds: -120 },
  ])
  assert.deepEqual(plain(priceList({})), [])
})

test('sidePricesAtLine lists only books at the line, in book order on ties', () => {
  const data = {
    fanduel: { over: -113, under: -115, point: 94.5 },
    draftkings: { over: -110, under: -120, point: 94.5 },
    betmgm: { over: -105, under: -125, point: 95.5 },
    fanatics: { over: -110, point: 94.5 },
  }
  const books = ['fanduel', 'draftkings', 'betmgm', 'fanatics']
  assert.deepEqual(plain(sidePricesAtLine(data, books, 94.5, 'over')), [
    { book: 'draftkings', odds: -110 },
    { book: 'fanatics', odds: -110 },
    { book: 'fanduel', odds: -113 },
  ])
  assert.deepEqual(plain(sidePricesAtLine(data, books, 94.5, 'under')), [
    { book: 'fanduel', odds: -115 },
    { book: 'draftkings', odds: -120 },
  ])
  // Books outside the customer's list never appear.
  assert.deepEqual(plain(sidePricesAtLine(data, ['betmgm'], 94.5, 'over')), [])
})

test('yesPrices keeps only listed books, best first', () => {
  assert.deepEqual(plain(yesPrices({ fanduel: 120, draftkings: 140, betparx: 400 }, ['draftkings', 'fanduel'])), [
    { book: 'draftkings', odds: 140 },
    { book: 'fanduel', odds: 120 },
  ])
})

test('gameLinePrices matches outcome and point, in book order', () => {
  const game = {
    bookmakers: [
      { key: 'fanduel', markets: [{ key: 'spreads', outcomes: [{ name: 'Yankees', price: 140, point: -1.5 }, { name: 'Red Sox', price: -160, point: 1.5 }] }] },
      { key: 'draftkings', markets: [{ key: 'spreads', outcomes: [{ name: 'Yankees', price: 150, point: -1.5 }] }] },
      { key: 'betmgm', markets: [{ key: 'spreads', outcomes: [{ name: 'Yankees', price: 105, point: -1 }] }] },
      { key: 'bet365', markets: [{ key: 'spreads', outcomes: [{ name: 'Yankees', price: 200, point: -1.5 }] }] },
      { key: 'espnbet', markets: [{ key: 'h2h', outcomes: [{ name: 'Yankees', price: -130 }] }] },
    ],
  }
  const books = ['fanduel', 'draftkings', 'betmgm', 'espnbet']
  assert.deepEqual(plain(gameLinePrices(game, books, 'spreads', 'Yankees', -1.5)), [
    { book: 'draftkings', odds: 150 },
    { book: 'fanduel', odds: 140 },
  ])
  assert.deepEqual(plain(gameLinePrices(game, books, 'h2h', 'Yankees')), [{ book: 'espnbet', odds: -130 }])
  assert.deepEqual(plain(gameLinePrices(null, books, 'h2h', 'Yankees')), [])
})

test('propBookLines pairs each Under with the Over point, not the last Under seen', () => {
  const lines = propBookLines([
    { book: 'fanduel', name: 'Over', price: -113, point: 94.5 },
    { book: 'fanduel', name: 'Under', price: -115, point: 94.5 },
    { book: 'fanduel', name: 'Under', price: -300, point: 79.5 },
    { book: 'draftkings', name: 'Under', price: -110, point: 95.5 },
    { book: 'draftkings', name: 'Over', price: -110, point: 95.5 },
    { book: 'betmgm', name: 'Over', price: -105, point: 94.5 },
    { book: 'betmgm', name: 'Under', price: -125, point: 93.5 },
    { book: 'espnbet', name: 'Under', price: -110, point: 94.5 },
  ])
  assert.deepEqual(plain(lines), {
    fanduel: { over: -113, point: 94.5, under: -115 },
    draftkings: { over: -110, point: 95.5, under: -110 },
    betmgm: { over: -105, point: 94.5 },
  })
})

test('lineOptions keeps the standard line and sorts alt rungs by value', () => {
  const standard = [{ book: 'fanduel', odds: -113 }]
  const options = lineOptions(94.5, standard, {
    '79.5': { draftkings: -200, fanduel: -190 },
    '94.5': { draftkings: 999 },
    '109.5': { fanduel: 160 },
    '119.5': {},
  })
  assert.deepEqual(plain(options), [
    { line: 79.5, prices: [{ book: 'fanduel', odds: -190 }, { book: 'draftkings', odds: -200 }] },
    { line: 94.5, prices: standard },
    { line: 109.5, prices: [{ book: 'fanduel', odds: 160 }] },
  ])
  assert.deepEqual(plain(lineOptions(0.5, standard)), [{ line: 0.5, prices: standard }])
})

test('hit helpers flip for the Under side and treat a push as no hit', () => {
  assert.equal(sideHit(5, 4.5, 'over'), true)
  assert.equal(sideHit(4, 4.5, 'under'), true)
  assert.equal(sideHit(4, 4, 'over'), false)
  assert.equal(sideHit(4, 4, 'under'), false)
  const values = [2, 5, 6, 3, 4]
  assert.equal(sideHitRate(values, 4.5, 'over'), 0.4)
  assert.equal(sideHitRate(values, 4.5, 'under'), 0.6)
  assert.equal(sideHitRate([], 4.5, 'under'), null)
  assert.equal(sideHitCount(values, 4.5, 'under'), '3/5')
  assert.equal(sideHitCount(undefined, 4.5, 'over'), '-')
})

test('gameLineCompare builds the sheet for one game-line price', () => {
  const game = {
    away_team: 'New York Yankees',
    home_team: 'Boston Red Sox',
    bookmakers: [
      { key: 'fanduel', markets: [{ key: 'spreads', outcomes: [{ name: 'New York Yankees', price: 140, point: -1.5 }] }, { key: 'totals', outcomes: [{ name: 'Over', price: -110, point: 8.5 }] }] },
      { key: 'draftkings', markets: [{ key: 'spreads', outcomes: [{ name: 'New York Yankees', price: 140, point: -1.5 }] }, { key: 'totals', outcomes: [{ name: 'Over', price: -105, point: 9 }] }] },
    ],
  }
  const books = ['fanduel', 'draftkings']
  const spread = gameLineCompare(game, books, { book: 'fanduel', price: 140, point: -1.5 }, { market: 'spreads', outcome: 'New York Yankees', label: 'Run Line · New York Yankees' })
  assert.equal(spread.title, 'New York Yankees @ Boston Red Sox')
  assert.equal(spread.subtitle, 'Run Line · New York Yankees -1.5')
  // A tie keeps the cell's book first, so "Best" matches the cell.
  assert.deepEqual(plain(spread.prices), [{ book: 'fanduel', odds: 140 }, { book: 'draftkings', odds: 140 }])
  assert.match(spread.note, /posting -1.5/)
  const total = gameLineCompare(game, books, { book: 'fanduel', price: -110, point: 8.5 }, { market: 'totals', outcome: 'Over', label: 'Total · Over' })
  assert.equal(total.subtitle, 'Total · Over 8.5')
  assert.deepEqual(plain(total.prices), [{ book: 'fanduel', odds: -110 }])
  const plus = gameLineCompare(game, books, { book: 'fanduel', price: -160, point: 1.5 }, { market: 'spreads', outcome: 'Boston Red Sox', label: 'Run Line · Boston Red Sox' })
  assert.equal(plus.subtitle, 'Run Line · Boston Red Sox +1.5')
  // No book found (stale data): the cell's own price still shows.
  assert.deepEqual(plain(plus.prices), [{ book: 'fanduel', odds: -160 }])
  const ml = gameLineCompare(game, books, { book: 'fanduel', price: -130, point: 3 }, { market: 'h2h', outcome: 'New York Yankees', label: 'Moneyline · New York Yankees' })
  assert.equal(ml.subtitle, 'Moneyline · New York Yankees')
  assert.equal(ml.note, 'Your books with this market posted.')
})
