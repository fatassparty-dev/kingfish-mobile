# KingFish Mobile

Expo app shell for KingFish Bets.

## First Local Setup

When npm can reach the registry, run:

```bash
cd mobile
npm install
npm run start
```

Then choose:

- `i` for iPhone Simulator, if Xcode is installed
- `a` for Android Emulator, if Android Studio is installed
- scan the QR code with Expo Go for a physical-device preview

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
- The `mobile_paywall` switch keeps native purchase buttons hidden until App Store and Google Play subscriptions are ready.
- Weekly NFL data belongs on the web/backend side first. The app should consume the backend result.
- Mobile web-link destinations and app notices come from `/api/mobile-config` with safe in-app fallbacks.
- Run `npm run typecheck` before packaging an App Store or Google Play build.

## Server-Driven Update Map

These can change from the backend/admin side without an App Store update:

- Sport launch states and dashboard season-watch states
- Weekly NFL fantasy/stat CSV data after the web backend rebuilds its JSON/API output
- Live odds, props, weather, cheat sheets, and player profiles served by KingFish APIs
- Account premium status after Stripe, RevenueCat, or manual admin changes sync to Supabase
- Mobile destination links, support links, legal links, and app notices from `/api/mobile-config`
- Native purchase entry points after `mobile_paywall` is turned on in the admin portal

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
- Screenshots show Dashboard, Player Props, Cheat Sheets, Ask KingFish, Account, and the NFL/Fantasy web doors.
- Export compliance can answer that the app does not use non-exempt encryption beyond standard platform HTTPS/security.

## npm Cache Permission Fix

If npm says your cache has root-owned files, run the command npm suggests:

```bash
sudo chown -R 501:20 "/Users/briandelancey/.npm"
```

Then run:

```bash
npm install
npm run start
```
