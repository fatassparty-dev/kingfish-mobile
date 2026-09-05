import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

function fixture({ os = 'ios', failures = 0, mac = false } = {}) {
  const calls = [], alerts = [], exports = {}
  const source = readFileSync(new URL('../lib/billingManagement.ts', import.meta.url), 'utf8')
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, require(name) {
      assert.equal(name, 'react-native')
      return { Platform: { OS: os, constants: { isMacCatalyst: mac } }, Alert: { alert: (...args) => alerts.push(args) }, Linking: { openURL: async url => { calls.push(url); if (calls.length <= failures) throw new Error('Cannot open') } } }
    },
  })
  return { ...exports, calls, alerts }
}

test('billing uses purchase source, never the current device or a mirrored plan name', async () => {
  for (const os of ['ios', 'android']) {
    for (const [source, expected, url] of [['stripe','web','https://kingfishbets.com/account'], ['google','google','https://play.google.com/store/account/subscriptions'], ['apple','apple','itms-apps://apps.apple.com/account/subscriptions']]) {
      const f = fixture({ os })
      const profile = { premium_source: source, subscription_platform: 'ios', stripe_plan: 'monthly' }
      assert.equal(f.billingProvider(profile), expected)
      await f.openBillingManagement(profile)
      assert.equal(f.calls[0], url)
      assert.equal(f.alerts.length, 0)
    }
  }
  const f = fixture()
  assert.equal(f.billingProvider({ stripe_plan: 'monthly' }), 'unknown')
  assert.equal(f.billingProvider({ premium_source: 'comp', subscription_platform: 'ios' }), 'manual')
  for (const [platform, expected] of [['web','web'], ['ios','apple'], ['android','google'], ['manual','manual']]) {
    assert.equal(f.billingProvider({ subscription_platform: platform }), expected)
  }
})

test('unknown and manual access do not silently open the device store', async () => {
  for (const profile of [null, { stripe_plan: 'annual' }, { premium_source: 'comp' }, { stripe_plan: 'lifetime' }]) {
    const f = fixture()
    await f.openBillingManagement(profile)
    assert.equal(f.calls.length, 0)
    assert.equal(f.alerts.length, 1)
    if (f.billingProvider(profile) === 'manual') f.alerts[0][2][1].onPress()
    const chooser = f.alerts.at(-1)
    assert.equal(chooser[2].length, 3)
    chooser[2][2].onPress()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(f.calls[0], 'https://kingfishbets.com/account')
  }
})

test('failed links provide provider-specific instructions without rejected promises', async () => {
  for (const source of ['stripe','google','apple']) {
    const f = fixture({ failures: 2 })
    await assert.doesNotReject(f.openBillingManagement({ premium_source: source }))
    assert.equal(f.calls.length, source === 'apple' ? 2 : 1)
    assert.equal(f.alerts.length, 1)
    assert.match(f.alerts[0][1], source === 'stripe' ? /KingFishBets.com\/account/ : source === 'google' ? /Google Play/ : /Settings.*Subscriptions/)
  }
  const mac = fixture({ failures: 2, mac: true })
  await mac.openBillingManagement({ premium_source: 'apple' })
  assert.match(mac.alerts[0][1], /Account Settings/)
  const fallback = fixture({ failures: 1 })
  await fallback.openBillingManagement({ premium_source: 'apple' })
  assert.equal(fallback.calls[1], 'https://apps.apple.com/account/subscriptions')
  assert.equal(fallback.alerts.length, 0)
})
