# Android Submission Progress

Living tracker for the first Google Play release of **KingFish Bets**.

- App: KingFish Bets
- Package: `com.kingfishbets.app`
- Play developer: KingFish Bets, LLC (Organization)
- Play Console account ID: `8423832205415622500`
- Started: 2026-08-22
- Target: Submit the first production release for Google Play review
- Current stage: Android preparation

Update this file as work is completed. Do not store passwords, private keys,
service-account JSON contents, banking details, tax information, or reviewer
credentials here.

## Status Summary

| Area | Status | Current result / next action |
|---|---|---|
| Developer account | Complete | Organization and representative approved by Google |
| Play Console app record | Complete | App exists for `com.kingfishbets.app` |
| Closed-test prerequisite | Not required | New-personal-account 12-testers/14-days rule does not apply to this organization account |
| Source audit | Complete | Shared Expo app confirmed; Android-specific gaps identified |
| TypeScript verification | Passing | `npm run typecheck` passed 2026-08-22 |
| Android code adaptation | Complete | Shared platform-aware store behavior implemented; device testing remains |
| Android app configuration | Complete | Version code, build profiles, Firebase config, and RevenueCat Android public SDK key added |
| Firebase / notifications | Ready for device test | Android app, owners, public config, private FCM V1 credential, and sender project verified |
| Google payments profile | Verification pending | Organization profile and bank added; W-9 submitted and in review; bank micro-deposit remains |
| Google Play subscriptions | Ready to configure | First signed bundle accepted on the internal track; create the approved monthly product and offer |
| RevenueCat Android | In progress | Google Play app and public Android SDK key added; Play credentials, products, and offering remain |
| First Android build | Complete | Production AAB `1.0.5` / code `1` finished and was published to the internal track |
| Android testing | Device needed | Tester enrollment verified; use a Google Play-enabled emulator initially and a physical Android device before production if available |
| Store listing copy | Draft needed | Adapt the iOS metadata for Google Play |
| Store graphics | Not started | Feature graphic, icon verification, and Android screenshots |
| App-content declarations | Not started | Data Safety, App Access, IARC, target audience, ads, financial features |
| Account-deletion web path | Complete | Public page deployed and verified signed out at `https://kingfishbets.com/account-deletion` |
| Production submission | Not started | Submit only after the review build and purchase path are verified |

## Important Decisions and Guardrails

- This is the existing Expo/React Native app, not a new application codebase.
- Android uses the same KingFish backend, accounts, premium entitlement, sports
  data, algorithms, and feature configuration as iOS and web.
- Package name remains `com.kingfishbets.app`.
- Use Google Play App Signing for the new app.
- The Play listing and app are positioned truthfully as an 18+ sports analytics
  and information product. KingFish does not accept wagers, hold funds, operate
  a sportsbook, or link users to place wagers.
- Answer Google content and rating questions based on the exact wording shown.
  Do not reuse the developer-signup answer for IARC or other declarations.
- Do not include gambling ads or calls to action to place a wager.
- Android digital subscriptions must use Google Play Billing through RevenueCat.
- Do not place any outside purchase call to action in the Android app.
- Do not submit a production build until monthly purchase, yearly purchase,
  restore, entitlement sync, and subscription-management behavior have been
  tested in a Play-installed build.
- Do not use browser automation, launch a local build, or start an emulator from
  an agent session on this computer. Brian initiates builds and performs visual
  testing; Codex prepares code, commands, checklists, and reviews screenshots or
  logs.

## Verified Starting Point

- `app.json` already declares Android package `com.kingfishbets.app`.
- Expo SDK 54 targets Android API level 36.
- `react-native-purchases` is installed.
- `lib/purchases.ts` already selects
  `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` on Android.
- `expo-notifications` is installed and token registration code already sends
  the device platform to the KingFish backend.
- The app includes an 18+ confirmation during account creation.
- The app includes in-app account deletion.
- Privacy, Terms, Refund, Help, and Support screens exist.
- The mobile project had no uncommitted changes when the audit began.
- `npm run typecheck` completed successfully on 2026-08-22.

## Findings to Fix Before the First Build

- [x] Add an explicit Android `versionCode`.
- Add `android.googleServicesFile` after Firebase registration.
- [x] Add the Android RevenueCat public SDK key to the production build
  environment.
- [x] Add a safe draft internal Android submit profile.
- [x] Make the paywall platform-aware:
  - Google Play subscription-management wording and URL on Android.
  - Google Play renewal and billing disclosure on Android.
  - No Apple account or App Store language on Android.
- [x] Make Account billing management platform-aware.
- [x] Make the Refund screen platform-aware.
- [x] Make Terms subscription language platform-aware.
- [x] Make Help billing language platform-aware.
- [x] Make the account-deletion subscription warning platform-aware.
- [x] Remove unused Android camera and microphone permissions from the
  screenshot-only image-picker configuration.
- [x] Create the required Android notification channel before requesting
  notification permission or an Expo push token.
- Confirm Android notification channels, permission behavior, and FCM token
  registration.
- Confirm Android back-button behavior on screens and modals.
- Confirm photo-picker permissions and Grade My Slip behavior on Android.
- [x] Create a public account-deletion/request web resource that is prominent
  and usable after the app has been uninstalled. Deployment remains pending.
- Review all external links so Android contains no outside purchase steering or
  sportsbook wagering links.

## Credentials and Account Setup

Record only completion status and safe identifiers here. Store JSON key files
securely outside version control unless the specific file is public app config.

### Firebase / FCM

- [x] Create Firebase project `kingfish-bets` for KingFish Bets.
- [x] Register Android package `com.kingfishbets.app`.
- [x] Download and validate `google-services.json`.
- [x] Wire `google-services.json` into Expo app configuration.
- [x] Add `kingfishbets@gmail.com` as a second Firebase project Owner and accept
      the invitation from that account. Keep the original owner as a backup.
- [x] Configure the private FCM V1 service-account key in EAS credentials.
- [x] Confirm the Firebase project/sender ID matches between the app config and
      the EAS FCM credential.
- [ ] Test receipt of a push notification on Android.

Notes:

- `google-services.json` contains public-facing app identifiers; it is distinct
  from private service-account JSON keys.
- Never paste private-key JSON contents into this tracker or chat.

### Google Payments Profile

- [x] Complete the organization merchant payments profile.
- [x] Add the required business bank account.
- [ ] Verify the bank account by entering Google's exact micro-deposit amount
      after it appears. Expected within three business days; check 2026-08-24
      through 2026-08-26.
- [x] Submit required US Form W-9. Submitted 2026-08-22; Google status is
      `In review`, so final approval remains pending.
- [ ] Confirm Google approves the submitted W-9 and removes the temporary
      withholding status.
- [ ] Confirm the merchant/payments profile is active for subscriptions.

This section is owned by Brian because it includes legal, banking, and tax
attestations.

### RevenueCat / Google Play

- [x] Add a Google Play app for `com.kingfishbets.app` to the existing KingFish
      RevenueCat project.
- [ ] Create a dedicated Google Cloud service account for RevenueCat.
- [ ] Enable required Google Play and Pub/Sub APIs.
- [ ] Invite the service-account email in Play Console.
- [ ] Grant only the required Play permissions:
  - View app information and download bulk reports (read-only)
  - View financial data, orders, and cancellation survey responses
  - Manage orders and subscriptions
- [ ] Upload the private service-account key to RevenueCat.
- [ ] Confirm RevenueCat reports valid Play credentials.
- [ ] Configure Google Real-Time Developer Notifications / Pub/Sub.
- [ ] Send and verify the test real-time notification.
- [x] Record the Android public SDK key in the production build
      environment as `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.

Credential propagation may take up to 36 hours. Do not interpret an initial
validation delay as a code failure until permissions and propagation have been
checked.

## Build and Release Configuration

- [x] Use `1.0.5` as the first Android marketing version.
- [x] Set Android `versionCode` to `1` (every later
      upload must be higher).
- [x] Configure the production profile to create an Android App Bundle (`.aab`).
- [x] Configure the preview profile to create an installable Android APK.
- [ ] Confirm production build includes:
  - Supabase proxy URL
  - Supabase publishable key
  - KingFish API base URL
  - Android RevenueCat public SDK key
  - Sentry configuration as intended
  - Firebase app configuration
- [x] Generate and securely store the Android upload key through EAS.
- [x] Enable Google Play App Signing during the first release.
- [x] Produce the first signed AAB.
- [x] Record build ID and version here after completion.
- [x] Upload the AAB to an internal test release.
- [x] Confirm Play Console accepts package name, signing, version code, and
      target API level.

Build record:

| Field | Value |
|---|---|
| Marketing version | 1.0.5 |
| Android version code | 1 |
| EAS build ID | `c2cb3fcc-1dbe-48db-ad0a-f8db9d06c3fc` |
| Build date | 2026-08-22 (finished 09:40 CDT) |
| AAB upload status | Published to internal testing 2026-08-22 09:54 CDT |
| Play App Signing | Enabled; Google-managed app signing key in use |

## Google Play Subscription Products

Approved launch pricing for new monthly subscribers:

- 3-day free trial
- $0.99 for the first month
- $4.99/month afterward until canceled
- Required paywall wording: “3 days free, then $0.99 for your first month, then
  $4.99/month until canceled.”

Google Play supports this as a new-customer offer with two phases (free trial,
then introductory price) followed by the regular monthly base-plan price.

| Plan | Intended product ID | Regular price | Introductory offer | Status |
|---|---|---:|---|---|
| Monthly | `kingfish_bets_pro_monthly` | $4.99/month | 3 days free, then $0.99 for month one | Approved; not created |
| Yearly | `kingfish_bets_pro_yearly` | Decision pending | Decision pending | Do not create yet |

- [ ] Confirm product IDs before creation; Play product IDs cannot be renamed or
      reused after creation.
- [ ] Create and activate a monthly base plan.
- [ ] Do not create or change the yearly plan until its price and offer are
      explicitly approved.
- [ ] Create the eligible-new-subscriber monthly offer with a 3-day free-trial
      phase followed by one $0.99 monthly introductory-price phase.
- [ ] Confirm pricing and regional availability.
- [ ] Import or attach both Play products in RevenueCat.
- [ ] Attach both products to the existing KingFish Bets Pro entitlement.
- [ ] Add monthly and annual packages to the current RevenueCat offering.
- [ ] Confirm the Android SDK retrieves the approved monthly package with the
      intended price, periods, and trial terms. Add a yearly package only after
      its commercial terms are approved.

## Cross-Platform Pricing Rollout

The approved customer-facing goal is the same monthly sequence everywhere:
3 days free, then $0.99 for the first month, then $4.99/month until canceled.

- [ ] Restore the intended free-versus-Premium feature gates before charging;
      Premium features are currently enabled for free accounts.
- [ ] Update the shared mobile paywall price, trial, renewal disclosure, and
      eligibility-aware presentation.
- [ ] Update Google Play using the exact two-phase introductory offer described
      above.
- [ ] Update RevenueCat products, packages, offering, and entitlement mappings
      to the new Google Play configuration.
- [ ] Change the iOS monthly base subscription price to $4.99 in App Store
      Connect.
- [ ] Choose and configure the compliant iOS introductory path. Apple permits
      one standard introductory offer type per subscription at a time, so its
      ordinary setup cannot automatically combine both a 3-day free trial and
      a $0.99 first month. Decide between the two as the standard iOS intro or
      use an additional Apple-supported offer mechanism.
- [ ] Update the iOS paywall only after its App Store offer is finalized; the
      displayed sequence must exactly match Apple's purchase sheet.
- [ ] Update website pricing, checkout/billing behavior, pricing page, Help,
      Terms, Refund, and marketing copy to the finalized web sequence.
- [ ] Replace all remaining $9.99/month and 7-day-trial references across the
      app, website, store metadata, review notes, and screenshots.
- [ ] Decide how existing free users are notified or given a grace period before
      Premium feature gates are restored.
- [ ] Test the complete new-customer sequence, renewal disclosure, cancellation,
      restore, entitlement sync, and ineligible/returning-customer price display
      independently on Google Play, iOS, and web.

## Android Test Matrix

Record device/OS/build details when testing begins.

| Test | Status | Notes |
|---|---|---|
| Fresh install and first launch | Not tested | |
| Sign up with 18+ and Terms confirmation | Not tested | |
| Email confirmation | Not tested | |
| Sign in / sign out | Not tested | |
| Password reset | Not tested | |
| Dashboard and sport navigation | Not tested | |
| Game Lines | Not tested | |
| Player Props and player profile | Not tested | |
| Tools / Cheat Sheets / Calculators | Not tested | |
| Fantasy Hub | Not tested | |
| Ask KingFish free and premium behavior | Not tested | |
| Grade My Slip photo selection | Not tested | |
| Notification permission | Not tested | |
| Push notification receipt | Not tested | |
| Monthly purchase | Not tested | |
| Yearly purchase | Not tested | |
| Restore purchases | Not tested | |
| Premium backend entitlement sync | Not tested | |
| Manage Google Play Subscription | Not tested | |
| Refund/help route | Not tested | |
| In-app account deletion | Not tested | |
| Terms / Privacy / Support links | Not tested | |
| Android system back button | Not tested | |
| Portrait and landscape layouts | Not tested | |
| Offline / temporary API failure states | Not tested | |

Test environment:

| Field | Value |
|---|---|
| Device or emulator | Pending |
| Android version | Pending |
| Play test track | Pending |
| Tester Google account | Do not record email here |
| Build version/code | Pending |

Brian does not currently own an Android phone. Brian must initiate any emulator
or device session. Use a Google Play-enabled Android emulator for initial app
testing; complete purchase, restore, and push-notification checks on a physical
Android device before production when one is available.

## Store Listing

### Copy

- [ ] App name: KingFish Bets
- [ ] Short description (maximum 80 characters)
- [ ] Full description (maximum 4,000 characters)
- [ ] Category: review `Sports` as the expected choice
- [ ] Tags
- [ ] Support email
- [ ] Support phone, if displayed/required
- [ ] Website: `https://kingfishbets.com`
- [ ] Privacy policy URL
- [ ] Responsible-use wording
- [ ] No unsupported feature claims
- [ ] No Apple-specific language
- [ ] No wagering call to action

### Graphics

- [ ] Play Store icon: 512 x 512 PNG, maximum 1,024 KB
- [ ] Feature graphic: 1,024 x 500 JPEG or 24-bit PNG without alpha
- [ ] At least two real Android screenshots
- [ ] Prefer at least four 1,080 x 1,920 portrait screenshots
- [ ] Screenshots accurately match the submitted Android build
- [ ] No small unreadable overlay text
- [ ] No misleading ranking, award, pricing, or promotional claims

Suggested screenshot set:

1. Dashboard / sport research overview
2. Game Lines and best-price comparison
3. Player Props with recent-form context
4. Tools / Cheat Sheets
5. Fantasy Hub
6. Ask KingFish
7. Account / supported settings
8. KingFish Bets Pro paywall, only if the final Play products and prices match

## App Content and Policy Declarations

Do not pre-answer ambiguous questions. Read the exact Play Console wording and
record the submitted answer and rationale after it is saved.

### Required forms

- [ ] Privacy policy
- [ ] Ads declaration (the app currently appears to contain no ad SDK or ads)
- [ ] App Access with active premium review account and navigation instructions
- [ ] Target audience and content
- [ ] IARC content rating
- [ ] Data Safety
- [ ] Financial Features declaration
- [ ] Data deletion questions and public deletion URL
- [ ] Any Play Console gambling-related declaration surfaced for this app
- [ ] Any permissions declaration surfaced after bundle analysis
- [ ] Government apps declaration, if surfaced
- [ ] News apps declaration, if surfaced
- [ ] Health apps declaration, if surfaced

### App Access / Review Account

- [ ] Create a non-admin premium reviewer account.
- [ ] Confirm the account remains active through review.
- [ ] Confirm no MFA, location restriction, expiring code, or purchase is required
      for reviewers to access premium functionality.
- [ ] Provide concise navigation instructions for premium boards, Ask KingFish,
      subscriptions, restore, legal/support, and account deletion.
- [ ] Do not store the reviewer password in this file or source control.

### Preliminary Data Safety Inventory

Verify this inventory against the final build and every included SDK before
submitting the form.

- Account information:
  - Email address
  - First and last name
  - User/account identifier
  - Optional state or territory
- App activity and user content:
  - Product interactions and preferences
  - Ask KingFish messages and saved chat history
  - Support messages
  - Bet-slip screenshot selected by the user for Grade My Slip
- Purchases:
  - Subscription product/status and purchase entitlement information
- Device/app information:
  - Push notification token
  - App version and platform
  - Crash and diagnostic information through Sentry, if enabled in the final
    Android build
- Security:
  - Data is expected to be encrypted in transit
  - Users can request account and associated-data deletion
- Advertising/tracking:
  - No sale of personal data
  - No advertising SDK identified in the initial source audit
  - Verify the final build does not use data for cross-app tracking

For each collected type, the final form must confirm whether collection is
required or optional, its purpose, retention/deletion behavior, and whether any
transfer to a service provider qualifies as sharing under Google's definitions.

### Gambling / Sports Analytics Review Position

- KingFish displays sports statistics, publicly posted odds, market comparisons,
  research tools, and informational analysis.
- KingFish does not accept wagers, hold funds, process bets, manage sportsbook
  accounts, or provide buttons/links to place wagers.
- The app is intended for users 18 and older where permitted by law, subject to
  any higher local age requirement.
- Gambling references and odds content must be disclosed truthfully when the
  exact rating or policy question asks about them.
- Do not describe the app as having no gambling references.
- Escalate any Play Console question that appears to classify the app as a
  real-money gambling operator before submitting that answer.

## Public Account-Deletion Resource

Google requires an off-app web path even though KingFish supports deletion in
the app.

- [x] Create a dedicated public page.
- [x] Name KingFish Bets on the resource.
- [x] Explain how to request deletion without reinstalling the app.
- [x] Provide a support email request path.
- [x] Explain which account data is deleted.
- [x] Explain any limited records retained for legal, security, tax, billing, or
      fraud-prevention reasons and the retention period/category where known.
- [x] Explain that deleting an account does not automatically cancel an active
      Google Play subscription and link to Google Play subscription management.
- [x] Verify the page works while signed out.
- [x] Final URL selected: `https://kingfishbets.com/account-deletion`

## Production Submission Gate

Do not submit until every required gate is checked.

- [x] Android code adaptation complete
- [x] TypeScript check passes
- [ ] Production AAB accepted by Play Console
- [ ] No blocking issues in Play pre-launch or bundle analysis
- [ ] Internal Play-installed build tested
- [ ] Monthly purchase tested
- [ ] Yearly purchase tested
- [ ] Restore and entitlement sync tested
- [ ] Android billing/refund/subscription-management language verified
- [ ] Store listing complete
- [ ] Required Android assets accepted
- [ ] Privacy policy and deletion page live
- [ ] All App content declarations complete and accurate
- [ ] Reviewer account works and instructions are saved
- [ ] Countries/regions reviewed
- [ ] Release notes complete
- [ ] Publishing overview has no unintended changes
- [ ] Brian approves the final production submission

## Activity Log

### 2026-08-22

- Confirmed Google approved the KingFish Bets, LLC organization developer
  account and authorized representative.
- Confirmed the Play Console app record exists for `com.kingfishbets.app`.
- Reviewed `docs/ANDROID-LAUNCH.md`, `docs/RELEASE-BUILD.md`,
  `STORE_METADATA_DRAFT.md`, and the actual Expo app configuration/source.
- Confirmed Expo SDK 54 targets Android API level 36.
- Confirmed the organization account is not subject to the newer personal-account
  12-testers/14-days production-access requirement.
- Confirmed the RevenueCat Android code path already exists but lacks its Android
  production key and Play-side product configuration.
- Identified Apple-only billing, refund, Terms, and account-deletion language
  that must be made platform-aware.
- Identified the need for a prominent public account-deletion resource.
- Identified Google gambling-policy wording as an area requiring exact,
  question-by-question declarations rather than reusing signup answers.
- Ran `npm run typecheck`; it passed.
- Created this living submission tracker.
- Added shared platform-aware mobile-store behavior so Android uses Google Play
  billing, subscription-management, renewal, refund, Terms, Help, and account-
  deletion language while iOS retains Apple behavior.
- Set Android version code `1`, made the preview profile produce an installable
  APK, made the production profile explicitly produce an AAB, and added a draft
  internal-track submit profile.
- Created the public `/account-deletion` web resource and linked it from the
  privacy policy and sitemap; deployment and live verification remain pending.
- Updated public Help, Pricing, and Refund copy to cover both App Store and
  Google Play purchases.
- Resolved the Expo configuration and found the image-picker default was adding
  Android microphone access. Disabled both camera and microphone permissions
  because Grade My Slip only selects an existing screenshot.
- Added the Android notification channel before permission/token registration,
  as required for the Android 13+ prompt and Expo push-token flow.
- Validated Firebase project `kingfish-bets` (project number `1056884349791`)
  and confirmed its registered Android package is exactly
  `com.kingfishbets.app`.
- Added the downloaded `google-services.json` to the mobile project and wired it
  through `android.googleServicesFile`.
- Decided to retain the personal Google account as a Firebase owner and add
  `kingfishbets@gmail.com` as a second Owner for durable business access.
- Verified from Firebase Users and permissions that both
  `fatassparty@gmail.com` and `kingfishbets@gmail.com` are active project Owners.
- Completed the Google Play organization merchant-payments profile and added the
  business bank account. Google initiated a micro-deposit of less than $0.25;
  exact-amount verification is pending because the bank does not display
  pending transactions. No banking identifiers are stored in this tracker.
- Validated and uploaded the private Firebase Admin service-account key to EAS
  as the Android FCM V1 push-notification credential for
  `com.kingfishbets.app`. EAS confirms it is assigned to Firebase project
  `kingfish-bets`; the private key was never copied into the repository.
- Submitted the required US Form W-9 through Google Payments. Its current
  status is `In review`; Google displays a temporary 24% withholding rate until
  approval. No taxpayer identifier or tax-form contents are stored here.
- Deployed the public account-deletion page and Android-aware Help, Pricing,
  Privacy, and Refund updates in web commit `1fcaf20`. Verified a signed-out
  request to `https://kingfishbets.com/account-deletion` returns HTTP 200 and
  contains the deletion request and Google Play subscription guidance.
- Created the RevenueCat Google Play app for `com.kingfishbets.app`. RevenueCat
  generated custom URL scheme `rc-3790f27f90`; it is not needed for the current
  custom paywall and is not being registered solely for dashboard paywall
  previews. The Android public SDK key and Play service credentials remain.
- Brian initiated the first production Android App Bundle build. EAS generated
  and securely stored the Android keystore. Build
  `c2cb3fcc-1dbe-48db-ad0a-f8db9d06c3fc` is running for version `1.0.5` / code
  `1` from commit `366cc75`.
- Added the RevenueCat Android public SDK key to the production build profile.
  The value is intentionally not copied into this tracker. Because the first
  AAB was already uploaded to EAS before this change, the later subscription-
  test build (version code `2`) will be the first Android build containing it.
- EAS build `c2cb3fcc-1dbe-48db-ad0a-f8db9d06c3fc` finished successfully and
  produced the first signed Android App Bundle for version `1.0.5` / code `1`.
- Google Play accepted version `1.0.5` / code `1`, target SDK 36, enabled Play
  App Signing, and published release `1.0.5 (1) – Bootstrap internal` to the
  internal test track at 09:54 CDT. The track remains inactive only until a
  tester email list is attached.
- Created and attached the `KingFish Internal Testers` list with two accounts,
  saved the track configuration, and verified the Google Play opt-in page shows
  the signed-in account as a tester. The internal-test enrollment link is
  `https://play.google.com/apps/internaltest/4701575429319244731`.
- Confirmed Brian does not currently have a physical Android phone. Initial
  testing will use a Google Play-enabled emulator; physical-device testing is
  still required before the production gate when a device is available.
- Approved the new monthly launch pricing goal: 3 days free, then $0.99 for the
  first month, then $4.99/month until canceled. Added coordinated Google Play,
  RevenueCat, iOS App Store, mobile paywall, website, feature-gating, disclosure,
  and testing tasks. Yearly pricing remains undecided and must not be created or
  changed yet.
- Re-ran mobile and web TypeScript checks; both passed.

## Next Actions

1. Brian: check for Google's bank micro-deposit Monday through Wednesday and
   enter the exact amount on the Play payment-methods page.
2. Brian: wait for Google to approve the submitted W-9; no further tax action
   is currently shown.
3. Configure the approved monthly Google Play offer and RevenueCat service
   credentials/products.
4. Implement and verify the cross-platform pricing rollout for Android, iOS,
   and web; decide the yearly plan and Apple's introductory-offer equivalent.
5. Produce version code `2` with the Android RevenueCat key and finalized
   pricing, then test Firebase push delivery and the rest of the Play-installed
   app before
   completing the production submission.
