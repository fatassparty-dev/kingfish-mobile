import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import TestRenderer, { act } from 'react-test-renderer'
import ts from 'typescript'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const source = readFileSync(new URL('../app/nfl-teaser.tsx', import.meta.url), 'utf8')
const compile = value => ts.transpileModule(value, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
const helper = {}
runInNewContext(compile(readFileSync(new URL('../lib/nflTeaser.ts', import.meta.url), 'utf8')), { exports: helper })
const leg = (id, gameId = id) => ({ id, gameId, team: `Team ${id}`, opponent: `Opponent ${id}`, kickoff: '2026-09-20T17:00:00Z', originalLine: -8, teasedLine: -2, explanation: 'Crosses 3 and 7' })
const data = () => ({ status: 'ready', points: 6, updatedAt: '2026-09-15T00:00:00Z', stale: false, books: [
  { key: 'a', name: 'Book A', legs: [leg('1'), leg('2'), leg('3'), leg('4'), leg('5')], pairs: [{ id: 'pair', legIds: ['1', '2'] }] },
  { key: 'b', name: 'Book B', legs: [leg('6'), leg('7')], pairs: [] },
] })
async function fixture({ session = { user: { id: 'test-user' } }, error = null, payload = data(), fetching = false, promo = false, premium = true, loading = false } = {}) {
  const exports = {}, calls = [], queries = [], requests = [], scrolls = []
  const state = { session, profile: { is_premium: premium }, loading }
  const query = { data: payload, error, isFetching: fetching, dataUpdatedAt: 1, refetch: () => calls.push('refetch') }
  runInNewContext(compile(source), { exports, require(name) {
    if (name === 'react') return React
    if (name === 'react/jsx-runtime') return jsxRuntime
    if (name === 'react-native') return { ActivityIndicator: 'ActivityIndicator', Keyboard: { dismiss: () => calls.push('dismiss') }, Pressable: 'Pressable', ScrollView: 'ScrollView', TextInput: 'TextInput', View: 'View', StyleSheet: { create: x => x } }
    if (name === 'expo-router') return { router: { canGoBack: () => true, back: () => calls.push('back'), push: x => calls.push(x), replace: x => calls.push(x) } }
    if (name === '@tanstack/react-query') return { useQuery: options => { queries.push(options); return query } }
    if (name === '@/components/Screen') return { Screen: ({ children, scrollRef }) => { scrollRef.current = { scrollTo: x => scrolls.push(x) }; return React.createElement('Screen', null, children) } }
    if (name === '@/components/Text') return { AppText: 'Text' }
    if (name === '@/components/Button') return { Button: 'Button' }
    if (name === '@/lib/auth') return { useAuth: () => state }
    if (name === '@/lib/mobileConfig') return { useMobileConfig: () => ({ flags: { pro_tools_free: promo } }) }
    if (name === '@/lib/api') return { kingfishFetch: (...args) => requests.push(args) }
    if (name === '@/lib/theme') return { colors: {}, spacing: {} }
    if (name === '@/lib/nflTeaser') return helper
    throw new Error(name)
  } })
  let root
  await act(() => { root = TestRenderer.create(React.createElement(exports.default)) })
  const text = () => JSON.stringify(root.toJSON())
  const labelText = value => Array.isArray(value) ? value.map(labelText).join('') : value?.props ? labelText(value.props.children) : String(value ?? '')
  const press = async label => {
    const target = root.root.findAll(node => ['Pressable', 'Button'].includes(node.type)).find(node => node.props.accessibilityLabel === label || labelText(node.props.children) === label)
    assert.ok(target, `Missing control: ${label}`)
    await act(() => target.props.onPress())
  }
  return { root, text, press, calls, queries, requests, scrolls, state, query, update: async () => act(() => root.update(React.createElement(exports.default))), close: async () => act(() => root.unmount()) }
}

test('signed-out, restoring, Premium-required, error and loading states do not expose cached legs', async () => {
  for (const [options, expected] of [
    [{ session: null }, 'Sign in to use'], [{ loading: true }, 'Restoring sign in'],
    [{ error: new Error('Premium required') }, 'part of KingFish Premium'],
    [{ error: new Error('Unauthorized') }, 'Sign in to use'],
    [{ error: new Error('Network unavailable') }, 'Network unavailable'],
    [{ fetching: true }, 'Finding teaser legs'],
  ]) {
    const f = await fixture(options)
    assert.match(f.text(), new RegExp(expected))
    assert.doesNotMatch(f.text(), /Team 1/)
    if (options.session === null || options.loading) assert.equal(f.queries.at(-1).enabled, false)
    await f.close()
  }
})
test('server checks both promo and paid access through the authenticated endpoint', async () => {
  for (const options of [{ promo: true, premium: false }, { promo: false, premium: true }, { promo: false, premium: false }]) {
    const f = await fixture(options)
    assert.equal(f.queries.at(-1).enabled, true)
    await f.queries.at(-1).queryFn()
    assert.equal(f.requests[0][0], '/api/nfl-teaser?points=6')
    assert.equal(f.requests[0][1].cache, 'no-store')
    await f.close()
  }
})
test('empty and stale snapshots are explained', async () => {
  for (const [status, expected] of [['no_games', 'No upcoming NFL games'], ['no_qualifiers', 'No spreads from your selected sportsbooks']]) {
    const f = await fixture({ payload: { ...data(), status, books: [] } })
    assert.ok(f.text().includes(expected)); await f.close()
  }
  const f = await fixture({ payload: { ...data(), stale: true } })
  assert.match(f.text(), /older than usual/); await f.close()
})
test('pairs populate tickets; ticket math, back and keyboard dismissal work', async () => {
  const f = await fixture()
  await f.press('Use pair 1')
  assert.equal(f.scrolls.length, 1)
  const inputs = f.root.root.findAllByType('TextInput')
  assert.equal(inputs.length, 2)
  await act(() => { inputs[0].props.onChangeText('-120'); inputs[1].props.onChangeText('100') })
  assert.match(f.text(), /83.33/)
  await f.press('Done'); assert.ok(f.calls.includes('dismiss'))
  await f.press('Remove Team 1'); assert.equal(f.root.root.findAllByType('TextInput').length, 0)
  await f.press('← Tools'); assert.ok(f.calls.includes('back'))
  await f.close()
})
test('book, point, user and snapshot changes clear selections and previous pricing', async () => {
  const f = await fixture()
  await f.press('Use pair 1'); await f.press('Book B')
  assert.equal(f.root.root.findAllByType('TextInput').length, 0)
  await f.press('Book A'); await f.press('Use pair 1')
  const points = f.root.root.findAllByType('Pressable').find(node => node.props.children?.props?.children === 6.5)
  await act(() => points.props.onPress())
  assert.equal(f.queries.at(-1).queryKey[2], 6.5)
  assert.equal(f.root.root.findAllByType('TextInput').length, 0)
  await f.press('Use pair 1'); f.query.dataUpdatedAt = 2; await f.update()
  assert.equal(f.root.root.findAllByType('TextInput').length, 0)
  await f.press('Use pair 1'); f.state.session = null; await f.update()
  assert.doesNotMatch(f.text(), /Team 1/)
  await f.close()
})
