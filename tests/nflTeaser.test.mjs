import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const exports = {}
runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/nflTeaser.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports })
const { teaserTicketMath: math, toggleTeaserLeg: toggle } = exports

test('American ticket odds yield profit, total return and break-even rate', () => {
  const negative = math('-120', '100')
  assert.ok(Math.abs(negative.profit - 83.3333333333) < 0.00001)
  assert.ok(Math.abs(negative.total - 183.3333333333) < 0.00001)
  assert.ok(Math.abs(negative.breakEven - 54.5454545454) < 0.00001)
  const positive = math('+150', '25.50')
  assert.equal(positive.profit, 38.25)
  assert.equal(positive.total, 63.75)
  assert.equal(positive.breakEven, 40)
  assert.equal(math('-100', '100').profit, 100)
})
test('invalid, partial, non-finite, zero and negative ticket values never show payouts', () => {
  for (const odds of ['', '-', '+', '0', '99', '-99', 'Infinity', 'NaN', '1e5', '0x100']) assert.equal(math(odds, '100'), null, odds)
  for (const stake of ['', '0', '-2', 'NaN', 'Infinity', '1e3', '1.234', '100 dollars']) assert.equal(math('-120', stake), null, stake)
})
test('custom tickets allow 2–4 distinct games and always allow removal', () => {
  const legs = Array.from({ length: 6 }, (_, i) => ({ id: String(i), gameId: i === 5 ? '0' : String(i) }))
  let ids = []
  ids = toggle(ids, legs[0], legs)
  assert.equal(toggle(ids, legs[5], legs), ids, 'same-game leg rejected')
  for (const leg of legs.slice(1, 4)) ids = toggle(ids, leg, legs)
  assert.equal(ids.length, 4)
  assert.equal(toggle(ids, legs[4], legs), ids, 'fifth leg rejected')
  ids = toggle(ids, legs[0], legs)
  assert.equal(ids.length, 3)
  ids = toggle(ids, legs[4], legs)
  assert.equal(ids.length, 4)
})
