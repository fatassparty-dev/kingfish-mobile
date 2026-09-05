import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const decode = require('../vendor/decode-uri-component')
function compileCommonJs(path, overrides = {}) {
  const module = { exports: {} }, localRequire = createRequire(path)
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { allowJs: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  runInNewContext(code, { module, exports: module.exports,
    require(name) { return overrides[name] || localRequire(name) } })
  return module.exports
}
const qsPath = require.resolve('query-string')
const qs = compileCommonJs(qsPath, { 'decode-uri-component': decode })

test('patched CommonJS decoder works in the actual query-string consumer', () => {
  assert.equal(typeof decode, 'function')
  for (const [encoded, plain] of [['D%27Andre+Swift', "D'Andre Swift"], ['caf%C3%A9','café'],['%F0%9F%91%91','👑'],['%2Faccount%3Fa%3Db','/account?a=b']]) {
    assert.equal(qs.parse('q=' + encoded).q, plain)
  }
  assert.deepEqual(Array.from(qs.parse('book=one&book=two').book), ['one','two'])
  assert.equal(qs.parse('access_token=a%2Bb%3D&next=%2Faccount').access_token, 'a+b=')
  if (process.env.CI) {
    assert.equal(require('decode-uri-component/package.json').version, '0.5.0')
    assert.equal(require('query-string').parse('q=%41').q, 'A')
  }
})

test('malformed encoded input remains bounded with the patched consumer', { timeout: 2000 }, () => {
  const start = performance.now()
  const malformed = '%80'.repeat(10000) + '%41'
  const result = qs.parse('q=' + malformed).q
  assert.ok(result.endsWith('A'))
  assert.ok(performance.now() - start < 1500)
  for (const q of ['%','%G1','%E0%A4','%C0%AF','%ED%A0%80']) assert.equal(typeof qs.parse('q='+q).q, 'string')
})

test('React Navigation preserves valid route and auth callback parameters', () => {
  const core = require.resolve('@react-navigation/core')
  const path = new URL('./getStateFromPath.js', 'file://' + core).pathname
  const { getStateFromPath } = compileCommonJs(path, { 'query-string': qs })
  const options = { screens: { account: 'account', callback: 'auth/callback', player: 'player/:name' } }
  const route = getStateFromPath('/account?from=billing', options).routes.at(-1)
  assert.equal(route.name,'account'); assert.equal(route.params.from,'billing')
  const auth = getStateFromPath('/auth/callback?code=abc%2Bdef%3D',options).routes.at(-1)
  assert.equal(auth.params.code,'abc+def=')
  assert.equal(getStateFromPath('/player/caf%C3%A9',options).routes.at(-1).params.name,'café')
  assert.doesNotThrow(()=>getStateFromPath('/account?q='+'%80'.repeat(5000),options))
})

function signupFixture({ authError = null, networkError = false, profileError = false, confirm = 'Password123' } = {}) {
  const source = readFileSync(new URL('../app/(auth)/sign-up.tsx', import.meta.url),'utf8')
  const ast = ts.createSourceFile('signup.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
  let handler
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'signUp') handler=node; ts.forEachChild(node,visit) }
  visit(ast); assert.ok(handler)
  const code = ts.transpileModule('const handler = ' + handler.getText(ast) + '; exports.run = handler;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText
  const state={loading:[],errors:[],success:[],events:[],signups:[]}, exports={}
  runInNewContext(code, { exports, firstName:'Test',lastName:'Person',state:'LA',email:'test@example.invalid',password:'Password123',confirm,is18:true,accepted:true,loading:false,
    setError:v=>state.errors.push(v),setSuccess:v=>state.success.push(v),setLoading:v=>state.loading.push(v),
    normalizeLocation:v=>v,recordFunnelEvent:v=>state.events.push(v),friendlyAuthError:()=> 'Safe auth error',
    signupAttribution:()=>({acquisition_client:'fixture-client',acquisition_app_build:'31'}),
    signupFunnelIdentity:async()=>({acquisition_visitor_id:'native_fixture_123456789'}),
    supabase:{auth:{signUp:async(input)=>{state.signups.push(input);if(networkError)throw Error('private raw error');return {data:{user:{id:'fixture'}},error:authError}}},
      from:()=>({update:()=>({eq:async()=>{if(profileError)throw Error('Profile unavailable');return {error:null}}})})},
  })
  return {...state,run:exports.run}
}
test('native signup releases loading after network/auth failure and never sends raw errors',async()=>{
  for (const opts of [{networkError:true},{authError:{message:'rejected'}}]) {
    const f=signupFixture(opts);await f.run();assert.equal(f.loading.at(-1),false)
    assert.ok(f.events.some(e=>e.event_name==='signup_issue'));assert.ok(!JSON.stringify(f.events).includes('private raw error'))
  }
})
test('created accounts survive optional profile failure; validation does not submit',async()=>{
  const good=signupFixture({profileError:true});await good.run();assert.ok(good.success.at(-1).startsWith('Account created'))
  assert.equal(good.signups[0].options.data.acquisition_app_build,'31')
  const bad=signupFixture({confirm:'different'});await bad.run();assert.equal(bad.signups.length,0)
  assert.ok(bad.events.some(e=>e.issue==='password_mismatch'))
})
