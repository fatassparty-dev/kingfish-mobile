# Store release build — the working recipe

The exact commands that produced **1.0.5 (build 21)** on 2026-08-19. Every flag
here exists because leaving it out produced a real, confusing failure. Do not
trim them.

## 0. Before you build

Bump the version in **all three** places. `ios/` is gitignored, so it drifts out
of sync with `app.json` and will happily build a version that has already
shipped — Transporter then rejects the upload with a 409.

- `app.json` → `expo.version` + `expo.ios.buildNumber`
- `ios/KingFishBets.xcodeproj/project.pbxproj` → `MARKETING_VERSION` +
  `CURRENT_PROJECT_VERSION` (appears twice each)
- `ios/KingFishBets/Info.plist` → `CFBundleShortVersionString` + `CFBundleVersion`

`pod install` is only needed if a **native** dependency changed. Adding a JS-only
import of a package already in `Podfile.lock` does not require it.

## 1. Archive (unsigned)

```bash
cd /Users/briandelancey/Developer/KingFishBetsLLC/kingfish-mobile/ios && export LANG=en_US.UTF-8 && SENTRY_DISABLE_AUTO_UPLOAD=true xcodebuild -workspace KingFishBets.xcworkspace -scheme KingFishBets -configuration Release -sdk iphoneos -archivePath ~/Developer/KingFishBetsLLC/builds/KingFishBets-<VERSION>.xcarchive archive CODE_SIGNING_ALLOWED=NO ENABLE_USER_SCRIPT_SANDBOXING=NO 2>&1 | tee ~/Developer/KingFishBetsLLC/builds/kfb-build.log
```

**Why each flag:**

- `SENTRY_DISABLE_AUTO_UPLOAD=true` — otherwise sentry-cli tries to upload source
  maps, fails to read `sentry.properties`, and fails the bundle phase:
  `error: sentry-cli - Failed to load file referenced by SENTRY_PROPERTIES`.
  Consequence: no source maps for this build, so JS crash stacks in Sentry are
  minified. Every shipped build has made this tradeoff.
- `ENABLE_USER_SCRIPT_SANDBOXING=NO` — **the Release config sets this to YES**
  (Debug is NO). Sandboxed script phases cannot write outside declared outputs,
  so Metro bundles fine and then dies writing the bundle:
  `Error: EPERM: operation not permitted, open '.../main.jsbundle'`.
  Overriding on the command line leaves the project setting alone.
- `CODE_SIGNING_ALLOWED=NO` — archive unsigned to avoid "requires a development
  team"; signing happens at export.
- `LANG=en_US.UTF-8` — expo/pod tooling misbehaves without it.
- `tee` to a log — the real error is usually thousands of lines above the
  `** ARCHIVE FAILED **` summary, and the summary never names it.

Ends with `** ARCHIVE SUCCEEDED **`.

## 2. Export the signed .ipa

```bash
cd ~/Developer/KingFishBetsLLC/builds && xcodebuild -exportArchive -archivePath ~/Developer/KingFishBetsLLC/builds/KingFishBets-<VERSION>.xcarchive -exportOptionsPlist ~/Developer/KingFishBetsLLC/builds/ExportOptions.plist -exportPath ~/Developer/KingFishBetsLLC/builds/KingFishBets-<VERSION>-export
```

`~/Developer/KingFishBetsLLC/builds/ExportOptions.plist` holds `method=app-store`, `teamID=3275YRB2Q7`,
`signingStyle=automatic`, `uploadSymbols=true`.

**Deprecation warning, seen every export since Xcode 26:**

```
IDEDistribution: Command line name "app-store" is deprecated. Use "app-store-connect" instead.
```

Harmless today — the export still succeeds and the .ipa is valid. But Apple will
drop the old name eventually, and it will fail an export at the worst moment. To
retire it, change one line in `~/Developer/KingFishBetsLLC/builds/ExportOptions.plist`:

```xml
<key>method</key><string>app-store-connect</string>
```

Do that between releases, not mid-submission, and confirm one export succeeds
before relying on it.

Needs network — it resolves the distribution certificate and profile from Apple.

## 3. Upload

Open **Transporter**, drag the `.ipa` in (do NOT double-click it), then Deliver.
Processing takes ~10–30 minutes before the build shows up in TestFlight.

## Housekeeping

Builds live in `~/Developer/KingFishBetsLLC/builds/`, never the Desktop
(Brian, 2026-08-19). Keep the archive for the build you submitted until Apple
approves it — it holds the dSYMs and is what you would re-export from. Once
approved, delete the archive, the export folder, and the log; App Store Connect
keeps the binary. `ExportOptions.plist` stays permanently.

## Verifying before upload

```bash
/usr/libexec/PlistBuddy -c "Print :ApplicationProperties:CFBundleShortVersionString" ~/Developer/KingFishBetsLLC/builds/KingFishBets-<VERSION>.xcarchive/Info.plist
ls -lh ~/Developer/KingFishBetsLLC/builds/KingFishBets-<VERSION>.xcarchive/Products/Applications/KingFishBets.app/main.jsbundle
```

`main.jsbundle` must be present and a few MB. If it is missing, the JS never made
it in and the build is empty of your changes.

## Failures already diagnosed (don't re-chase these)

| Symptom | Cause |
|---|---|
| `PhaseScriptExecution Bundle React Native code and images` fails, `error: sentry-cli` | Missing `SENTRY_DISABLE_AUTO_UPLOAD=true` |
| Same phase fails, `EPERM ... main.jsbundle` | Missing `ENABLE_USER_SCRIPT_SANDBOXING=NO` |
| Transporter 409 / "version already exists" | `ios/` version drift — see step 0 |
| Metro says `Bundled N modules` and then fails | Bundling succeeded; the failure is after it. Not your JS. |

Clearing DerivedData is **not** a fix for any of the above. It costs 15 minutes
of full rebuild and changes nothing.
