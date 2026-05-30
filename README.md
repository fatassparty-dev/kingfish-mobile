# KingFish Mobile

Expo app shell for KingFish Bets.

## First Local Setup

When npm can reach the registry, install dependencies:

```bash
cd "/Users/briandelancey/Developer/KingFishBetsLLC/kingfish-mobile"
npm install
```

For the current iOS simulator review flow, run a local native build:

```bash
SENTRY_DISABLE_AUTO_UPLOAD=true EXPO_PUBLIC_SKIP_REVENUECAT=true npx expo run:ios --configuration Release
```

Notes:

- Use the native build path for simulator review. Expo Go is not the review path for this app.
- `SENTRY_DISABLE_AUTO_UPLOAD=true` keeps local builds from requiring a Sentry auth token.
- `EXPO_PUBLIC_SKIP_REVENUECAT=true` keeps simulator review from being blocked by test RevenueCat keys.

## Environment

Copy `.env.example` to `.env` and fill in only public mobile-safe values:

```bash
cp .env.example .env
```

Never put server-only keys in the mobile app.

## App Store Readiness Notes

The mobile app reads live odds, player props, premium status, and launch switches from the KingFish web backend. That means football, college football, soccer, and other seasonal boards can be prepared in the app now, then turned on from the admin portal or by weekly backend data updates without submitting a new App Store build.

Keep these rules in place:

- `.env`, `node_modules`, and Expo generated files stay out of git.
- Public mobile env values are okay; service-role keys are never okay.
- Feature switches control whether a sport shows live data or a clean season-watch state.
- The `mobile_paywall` switch is an emergency hold for native purchase buttons. Keep it on for App Store launch unless mobile checkout must be paused.
- Weekly NFL data belongs on the web/backend side first. The app should consume the backend result.
- Mobile web-link destinations and app notices come from `/api/mobile-config` with safe in-app fallbacks.
- When touching a mobile area, check the related screen, route, or backend link before calling it done whenever a local or deployed view is available.
- Keep the app clean, crisp, and simple. Think Apple: short copy, obvious actions, restrained controls, and no extra explanation unless it prevents confusion.
- Avoid AI-looking UI: bubbly pills, decorative badges, generic helper text, and repeated label chips. Prefer boxier labels, table-like clarity, and quiet actions.
- Do not remove or flatten custom branded identity pieces without approval. Intentional KingFish visuals are not generic AI tells.
- Do not name third-party data providers in public mobile copy unless there is a legal or product reason, such as asking the user to connect an outside fantasy account.
- Run `npm run typecheck` before packaging an App Store or Google Play build.

## Server-Driven Update Map

These can change from the backend/admin side without an App Store update:

- Sport launch states and dashboard season-watch states
- Weekly NFL fantasy/stat CSV data after the web backend rebuilds its JSON/API output
- Live odds, props, weather, cheat sheets, and player profiles served by KingFish APIs
- Account premium status after Stripe, RevenueCat, or manual admin changes sync to Supabase
- Mobile destination links, support links, legal links, and app notices from `/api/mobile-config`
- Native purchase entry points while `mobile_paywall` stays on in the admin portal

These still need a new mobile build:

- New native screens or tabs
- New native purchase SDK behavior or new App Store product wiring
- Changed app icons, splash screens, permissions, or store metadata
- Bug fixes inside the installed app bundle

The goal is to keep seasonal sports content, weekly NFL updates, and admin launch control on the web/backend side so the first App Store version can stay useful without constant review cycles.

## Build Profiles

`eas.json` is ready for the usual Expo build flow:

- `development` for a dev-client build when we need native-device debugging
- `preview` for internal simulator/device testing
- `production` for App Store and Google Play builds

Do not run production submission until Apple Developer, Google Play, RevenueCat, and store metadata are ready.

## App Store Prep Checklist

Before the first real store build, confirm:

- Apple Developer organization enrollment is approved.
- Google Play Console account is ready.
- RevenueCat has Apple and Google products attached to the KingFish Bets Pro entitlement.
- The mobile env values are set for Supabase, the KingFish API base URL, and RevenueCat public SDK keys.
- The App Store app record uses bundle ID `com.kingfishbets.app`.
- The Google Play app uses package name `com.kingfishbets.app`.
- Terms, Privacy, Refund, Help, and support links are live on `kingfishbets.com`.
- Screenshots show Dashboard, Player Props, Cheat Sheets, Ask KingFish, Account, and support/legal account links.
- Export compliance can answer that the app does not use non-exempt encryption beyond standard platform HTTPS/security.

## npm Cache Permission Fix

If npm says your cache has root-owned files, run the command npm suggests:

```bash
sudo chown -R 501:20 "/Users/briandelancey/.npm"
```

Then run:

```bash
npm install
SENTRY_DISABLE_AUTO_UPLOAD=true EXPO_PUBLIC_SKIP_REVENUECAT=true npx expo run:ios --configuration Release
```
