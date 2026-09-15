# KingFish release status

Last updated: September 14, 2026 (Central Time)

## Browser and release handoffs

Never use a browser or other computer UI without Brian's explicit permission
for that specific action. Never include browser/UI use or store-console
upload/submission instructions in a future-session prompt unless Brian has
explicitly authorized them. A request to prepare a release or write a prompt
does not confer that permission. See `AGENTS.md`.

This is the short source of truth for what is public, what is under store
review, and what requires the next native build. Detailed history remains in
`APP_STORE_CHANGELOG.md` and `RELEASE-IMPACT-LEDGER.md`.

## Published now

### Website

- The main dashboard is deployed at `https://www.kingfishbets.com/dashboard`.
- The NFL Teaser Builder is deployed at
  `https://www.kingfishbets.com/nfl-teaser`. Both routes returned HTTP 200 in a
  live check on September 14, 2026.
- The deployed football work includes current NFL board data/caching, current
  college season-week navigation, highlighted college spread leans, `KF PROJ`
  totals without a Total Lean recommendation, and the removal of the redundant
  college O/U column.
- Website and server calculations can continue to update without a native app
  build when the current app already knows how to render the response.

### Apple App Store

- iOS 1.0.9, build 31, is approved and publicly available.

### Google Play

- Android 1.0.9, version code 6, is approved and publicly available.
- Android 1.0.10, version code 7, was submitted to Production on September 10.
  Google review/publication was still pending at the last recorded check; verify
  Play Console before describing it as public.

## Submitted to Apple

- iOS version: 1.0.10
- Selected build: 36
- App Review submission date: September 14, 2026
- Status: submitted; approval and public availability pending
- Source commit: `f679699`
- Signed IPA:
  `~/Developer/KingFishBetsLLC/builds/KingFishBets-1.0.10-b36-export/KingFishBets.ipa`
- SHA-256:
  `5c0bfd549261435d5b1bbeca55670e807e54b042671b794f7e78827da8305890`

Build 35 was uploaded and then superseded because its experimental Landscape
button could lock the interface without returning cleanly. Build 36 removes the
button and native orientation dependency and restores build 34 behavior. Apple
rejected an attempted build 34 upload because build 35 had already used the
higher number. Never reuse a build number, including one that was uploaded but
not submitted for review.

The submitted App Store metadata is recorded verbatim in
`STORE_METADATA_DRAFT.md`. Apple promotional copy correctly says eligible new
monthly subscribers pay $0.99 for the first month, then $4.99/month, with no
free trial.

## Included in iOS 1.0.10 build 36

- Faster NFL board loading and Today/Week/All navigation.
- Current-season NFL props with rolling player histories.
- Correct first/last-touchdown fields and clearer season/week history labels.
- Actual college season weeks and compact List/Cards presentation.
- Clearer school names in landscape, highlighted spread leans, and `KF PROJ`
  totals without Total Lean recommendations.
- NFL Line Movers in Tools.
- Three-row Free previews on supported props and game boards.
- Persistent sign-in, accurate required-notification controls, and other
  reliability fixes accumulated since the previous iOS release.

## Next native release

Plan iOS 1.1.0 with build 37 or higher. Its lead scope is a native NFL Teaser
Builder in Tools using the website's existing authenticated `/api/nfl-teaser`
contract. The Teaser Builder is live on the website but is not inside submitted
iOS 1.0.10 build 36.

Do not remove 1.0.10 from review for the Teaser Builder. Build and test it as a
separate release after 1.0.10 completes review. Before submission, test its
Premium gate, sportsbook selection, teaser-point choices, suggested pairs,
custom ticket selection, ticket math, empty/stale states, and phone scrolling.

## Publication follow-through

1. When Apple approves 1.0.10, publish it according to the release setting in
   App Store Connect and record the first confirmed Ready for Sale time.
2. Update the server's latest iOS version to 1.0.10 after it is publicly
   available. Leave the minimum supported version unchanged unless a real
   compatibility or safety issue requires a forced update.
3. Confirm whether Android 1.0.10 code 7 has become public and update the Android
   status documents and impact ledger.
4. Keep the iOS build 36 archive, export, and dSYMs until Apple approves it.
5. Start native Teaser Builder work under version 1.1.0, build 37 or higher.
