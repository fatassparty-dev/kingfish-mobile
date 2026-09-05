import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

test('subscription management opens a fallback or gives instructions without an unhandled rejection', async () => {
  for (const failures of [0, 1, 2]) {
    const calls = [], alerts = [], exports = {}
    const source = readFileSync(new URL('../lib/mobileStore.ts', import.meta.url), 'utf8')
    runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, require(name) {
        if (name === './platform') return { IS_MAC: false }
        assert.equal(name, 'react-native')
        return { Platform: { OS: 'ios' }, Alert: { alert: (...args) => alerts.push(args) }, Linking: { openURL: async url => { calls.push(url); if (calls.length <= failures) throw new Error('Cannot open') } } }
      },
    })
    await assert.doesNotReject(exports.openMobileSubscriptionManagement())
    assert.equal(calls.length, failures ? 2 : 1)
    assert.equal(alerts.length, failures === 2 ? 1 : 0)
    if (alerts.length) assert.match(alerts[0][1], /Settings.*Subscriptions/)
  }
})

