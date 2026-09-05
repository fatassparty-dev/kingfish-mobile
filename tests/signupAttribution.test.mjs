import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

function attribution(os, nativePlatform, version = 'fixture-version', isMac = false) {
  const source = readFileSync(new URL('../lib/signupAttribution.ts', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}
  runInNewContext(code, { exports, require(name) {
    if (name === 'react-native') return { Platform: { OS: os } }
    if (name === 'expo-constants') return { default: { platform: nativePlatform, expoConfig: { version } } }
    if (name === './platform') return { IS_MAC: isMac }
    throw new Error('Unexpected dependency: ' + name)
  } })
  return exports.signupAttribution()
}

test('signup records the installed platform build and client identity', () => {
  const apple = attribution('ios', { ios: { buildNumber: '123' } })
  assert.equal(apple.acquisition_platform, 'ios')
  assert.equal(apple.acquisition_app_build, '123')
  assert.equal(apple.acquisition_app_version, 'fixture-version')
  assert.equal(apple.acquisition_client, 'kingfish-mobile')
  const android = attribution('android', { android: { versionCode: 456 } })
  assert.equal(android.acquisition_platform, 'android')
  assert.equal(android.acquisition_app_build, '456')
  
})

test('missing native build remains unknown without breaking signup metadata', () => {
  const result = attribution('ios', undefined, null)
  assert.equal(result.acquisition_app_build, null)
  assert.equal(result.acquisition_app_version, null)
  assert.equal(result.acquisition_signup_path, 'app_signup')
})
