# Android launch plan

> The active, day-by-day submission checklist and status are maintained in
> [`ANDROID-SUBMISSION-PROGRESS.md`](ANDROID-SUBMISSION-PROGRESS.md). This file
> remains the background launch plan and account-setup history.

Written 2026-08-20, updated 2026-08-21. Organized into phases. Phase 1 is DONE
and the developer account is APPROVED; start at Phase 2.

## Correcting an assumption from planning

**This is not a new app or a new codebase.** KingFish Bets is Expo/React
Native — the same JS/TS in this repo already runs on iOS; Android is the same
source with native Android project files generated from it (the same way
`ios/` already exists here, generated from this repo, not hand-built). There
is no new folder for the app itself. `android/` will appear inside
`kingfish-mobile` the first time it's built, same as `ios/` did.

What genuinely IS new is account-side setup — a different store, a different
console, a different signing story.

---

## PHASE 1 — Play Console account ✅ COMPLETE 2026-08-20

Done in one sitting, the same day the iOS apps went to Apple.

- ✅ Google Play Console developer account created, **Organization** type,
  "KingFish Bets, LLC" — Account ID 8423832205415622500
- ✅ $25 one-time registration fee paid (vs. Apple's $99/year)
- ✅ Account Google address: **kingfishbets@gmail.com** (business address, not
  the personal Gmail — deliberate, so the company's store identity isn't tied
  to a personal account)
- ✅ App categories declared at signup: **None of the above** — see the
  gambling note below, this was a consequential answer
- ✅ Organization website verified — `https://kingfishbets.com`
- ✅ Organization documents — **APPROVED by Google 2026-08-21**
- ✅ Authorized representative — **APPROVED by Google 2026-08-21**
- ✅ App record created in Play Console for `com.kingfishbets.app`

**Turnaround was ~1 day**, not the "few days" Google warned about — submitted
Thursday afternoon 2026-08-20, approved Friday 2026-08-21. Much faster than
Apple. Phase 2 is unblocked as of now; nothing in it is waiting on Google.

### The closed-testing question — RESOLVED, and it's good news

The earlier draft of this plan flagged Google's closed-testing requirement as
the #1 schedule risk and refused to name a number without checking. Checked
2026-08-20:

- New **personal** accounts must run a closed test with **12 testers opted in
  continuously for 14 days** before they can even apply for production access.
- **Organization accounts registered to a legal business entity are EXEMPT**
  and can publish straight to production.

KingFish registered as an Organization against the LLC, so **this requirement
does not apply.** No tester recruitment, no 14-day clock. This was the single
biggest schedule risk in the project and it is gone.

(This is also why Individual vs. Organization was the one signup choice that
could not be gotten wrong — it cannot be switched later without starting a new
account.)

### The gambling question — the standing position

KingFish does not accept wagers, hold funds, or process bets. It displays
publicly available odds and statistics for comparison. That is the position
Apple already accepted, and it is why "Real-money gambling apps" was **not**
checked at signup — that category gates you behind a per-jurisdiction
gambling-license application KingFish neither needs nor qualifies for, and
flags a brand-new account as a gambling operator on day one.

**But note the distinction, it matters in Phase 3:** the signup question was
about *what the organization operates*. The IARC content-rating questionnaire
on the app listing asks about *what the app contains* — and there the honest
answer does include gambling references / odds information. Different
question, different honest answer. Do not carry the "None of the above" answer
forward into IARC.

### Website verification — how it actually worked (for future reference)

Play Console asks for the website URL in two unrelated places, which is
confusing. Typing it at signup only tells Google which site to check; proving
ownership happens in **Google Search Console**, a separate product.

`kingfishbets.com` was already a DNS-verified **Domain** property in Search
Console under `fatassparty@gmail.com` (the `google-site-verification` TXT
record was already live at Directnic, which hosts the domain's DNS).
`kingfishbets@gmail.com` was added as an **Owner** on that property so the
business account controls the business domain going forward. Both accounts
remain owners — the original verifier was deliberately not removed.

---

## PHASE 2 — Credentials + first build ← **START HERE**

Unblocked as of 2026-08-21: the developer account is approved and the app
record exists, so every step below can proceed.

**Every step in this phase except the code work needs Brian signed into a
console (Firebase, RevenueCat, Play Console, Google payments). None of it can
be done unattended — the deliverables Claude needs back from it are two
credentials: `google-services.json` and the `goog_...` RevenueCat key.**

1. **Firebase project + `google-services.json`** — free, ~10 minutes. Create a
   Firebase project, add an **Android** app inside it with package
   `com.kingfishbets.app` (must match exactly), download `google-services.json`.
   This is what makes Android push notifications work (FCM); nothing from the
   Apple push setup carries over. **This file is a secret** — do not commit it;
   same gitignore-and-keep-a-copy pattern as `.env`.
2. **Google payments profile** — required before subscriptions can be sold.
   Same LLC details, plus bank account and tax info (W-9 for a US LLC).
3. **RevenueCat** — add a **Play Store** app to the existing KingFish
   RevenueCat project. Requires creating a Google Cloud service account and
   granting it Play Console access (RevenueCat's setup flow walks through it).
   Yields the Android public SDK key (`goog_...`) →
   `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
   Note: `lib/purchases.ts` already branches on `Platform.OS === 'android'` and
   reads this var. **The code path exists; only the key is missing.**
4. **Play Console subscription products** — mirror the iOS product IDs, names,
   and prices exactly.
5. **Signing** — Google Play App Signing (Google holds the app signing key) is
   the standard and recommended path for a new app. If using EAS Build,
   `eas credentials` generates and manages the upload key with no manual
   keytool step.
6. **Code work** (Claude does this, no Brian input needed beyond the two
   credential files):
   - `eas.json`: add an `android` production build profile matching the `ios`
     one's shape, plus `submit.production.android`. Automated `eas submit`
     needs a Google **service account JSON key** with Play Console API access —
     a *separate* credential from `google-services.json`. One authenticates the
     app to Google's push service; the other authenticates EAS to the Play
     Console API for uploads.
   - Wire `google-services.json` in via `app.json` → `android.googleServicesFile`.
   - First build: `eas build --platform android --profile production`.
     **Budget real shakeout time here** — expect Android-specific build issues
     no amount of iOS testing would surface, same as the iOS archive took
     several attempts to get the flags right.
   - Test on an Android emulator or real device before any store submission.
     There is no iOS-side substitute: permissions dialogs, hardware back-button
     behavior, and notification channels diverge in real, not cosmetic, ways.

---

## PHASE 3 — Store listing + submission

**Scheduling note:** phone screenshots CANNOT be produced until Phase 2's first
build runs in an emulator — they must be real Android screenshots, not the iOS
set resized. The feature graphic is the only listing asset that can be built
ahead of the build, since it's pure design work.

Asset requirements (verified 2026-08-20 against Google's spec):

- **App icon** — 512×512, 32-bit PNG **with** alpha, max 1024KB
- **Feature graphic** — 1024×500, JPEG or 24-bit PNG **without** alpha.
  Google-only, no iOS equivalent. This is the banner across the top of the
  listing. Required.
- **Phone screenshots** — minimum 2, maximum 8. JPEG or 24-bit PNG without
  alpha. Portrait 9:16 at 1080×1920 or better. Google is looser on aspect ratio
  than Apple, but the max dimension can't exceed 2× the min dimension.
  Recommended: at least 4 at 1080px+ to qualify for Play promotions.
- **Short description** — 80 characters
- **Full description** — 4000 characters. The iOS App Store copy in
  `STORE_METADATA_DRAFT.md` is a solid starting draft; it needs a pass for
  Google's tone, not a straight paste.
- **Data safety** — Google's equivalent of Apple's privacy nutrition label.
  Same underlying facts as what was already filed with Apple, different form.
- **Content rating (IARC)** — answer honestly; see the gambling note in Phase 1.
  Expect a higher age rating and extra questions given the subject matter.

Then: submit for production review. Google's review is typically faster than
Apple's — often under 7 days, sometimes hours. With the Organization exemption
in hand, there is no testing track standing between submission and production.

---

## What does NOT need redoing

Everything server-side is already cross-platform and needs zero Android work:
every API route, every cheat sheet, Sports You Follow, Home customization,
RevenueCat's entitlement logic (Android just needs its own key wired into the
same code path), the whole `/api/account` and `/api/mobile-config` contract.
Android is a client, same as iOS and Studio are clients — it reads the same
server.

`app.json` already has `expo.android.package = "com.kingfishbets.app"`.
Nothing to decide there.
