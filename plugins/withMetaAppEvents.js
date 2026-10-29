const { withAppDelegate, withInfoPlist, withPodfile } = require('@expo/config-plugins')
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode')

/**
 * Meta app-install measurement (iOS only) — so Instagram/Facebook App Promotion
 * ads can count and optimize for installs.
 *
 * Deliberately minimal: FBSDKCoreKit only (no Login, Share or Gaming kits) and
 * the ONE event Meta needs, activateApp. Meta counts an install as the first
 * activateApp from a new device.
 *
 * - FacebookAutoLogAppEventsEnabled is OFF, so the SDK never auto-logs in-app
 *   purchases/subscriptions (RevenueCat owns those) and activateApp is called
 *   by hand from applicationDidBecomeActive instead.
 * - No custom events, no user IDs, emails, names, picks or betting research
 *   are ever sent. Nothing in JS talks to the SDK at all.
 * - The App Tracking Transparency prompt is shown first. If the person says
 *   no, the SDK still runs but without the advertising ID, and Meta only gets
 *   Apple's anonymous SKAdNetwork install count. The SDK reads the ATT answer
 *   itself; nothing here forces tracking on.
 *
 * The iOS release is archived from the checked-in-but-gitignored ios/ folder,
 * not a fresh prebuild, so the same edits were also applied by hand to
 * ios/KingFishBets (AppDelegate.swift, Info.plist, Podfile). This plugin keeps
 * them alive through any future prebuild — same reason as withAssetStatements.
 */

const SDK_VERSION = '~> 18.1'

// Meta's SKAdNetwork IDs — Apple sends install postbacks only to networks listed here.
const META_SKADNETWORK_IDS = ['v9wttpbfk9.skadnetwork', 'n38lu8286q.skadnetwork']

const TRACKING_PURPOSE =
  'KingFish uses this to see which of our ads bring people to the app. Your account and betting research are never shared.'

function withMetaInfoPlist(config, { appId, clientToken, displayName }) {
  return withInfoPlist(config, (cfg) => {
    const plist = cfg.modResults
    plist.FacebookAppID = appId
    plist.FacebookClientToken = clientToken
    plist.FacebookDisplayName = displayName
    plist.FacebookAutoLogAppEventsEnabled = false
    plist.NSUserTrackingUsageDescription = TRACKING_PURPOSE

    const items = Array.isArray(plist.SKAdNetworkItems) ? plist.SKAdNetworkItems : []
    const existing = new Set(items.map((item) => item.SKAdNetworkIdentifier))
    for (const id of META_SKADNETWORK_IDS) {
      if (!existing.has(id)) items.push({ SKAdNetworkIdentifier: id })
    }
    plist.SKAdNetworkItems = items
    return cfg
  })
}

function addMetaPod(src) {
  return mergeContents({
    src,
    newSrc: `  pod 'FBSDKCoreKit', '${SDK_VERSION}'`,
    tag: 'kingfish-meta-app-events',
    anchor: /use_expo_modules!/,
    offset: 1,
    comment: '#',
  }).contents
}

function addMetaAppDelegate(src) {
  let out = src
  if (!out.includes('import FBSDKCoreKit')) {
    out = out.replace('import Expo\n', 'import AppTrackingTransparency\nimport Expo\nimport FBSDKCoreKit\n')
  }

  out = mergeContents({
    src: out,
    newSrc: '    ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)',
    tag: 'kingfish-meta-launch',
    anchor: /return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/,
    offset: 0,
    comment: '//',
  }).contents

  out = mergeContents({
    src: out,
    newSrc: [
      '  // Meta install measurement: ask ATT once, then log activation.',
      '  public override func applicationDidBecomeActive(_ application: UIApplication) {',
      '    super.applicationDidBecomeActive(application)',
      '    if ATTrackingManager.trackingAuthorizationStatus == .notDetermined {',
      '      ATTrackingManager.requestTrackingAuthorization { _ in',
      '        DispatchQueue.main.async { AppEvents.shared.activateApp() }',
      '      }',
      '    } else {',
      '      AppEvents.shared.activateApp()',
      '    }',
      '  }',
      '',
    ].join('\n'),
    tag: 'kingfish-meta-activate',
    anchor: /\/\/ Linking API/,
    offset: 0,
    comment: '//',
  }).contents

  return out
}

function withMetaPod(config) {
  return withPodfile(config, (cfg) => {
    cfg.modResults.contents = addMetaPod(cfg.modResults.contents)
    return cfg
  })
}

function withMetaAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('withMetaAppEvents expects a Swift AppDelegate')
    }
    cfg.modResults.contents = addMetaAppDelegate(cfg.modResults.contents)
    return cfg
  })
}

module.exports = function withMetaAppEvents(config, props) {
  if (!props?.appId || !props?.clientToken) {
    throw new Error('withMetaAppEvents needs appId and clientToken')
  }
  const options = { displayName: config.name, ...props }
  return withMetaAppDelegate(withMetaPod(withMetaInfoPlist(config, options)))
}

module.exports.addMetaPod = addMetaPod
module.exports.addMetaAppDelegate = addMetaAppDelegate
