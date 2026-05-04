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
- Weekly NFL data belongs on the web/backend side first. The app should consume the backend result.
- Mobile web-link destinations and app notices come from `/api/mobile-config` with safe in-app fallbacks.
- Run `npm run typecheck` before packaging an App Store or Google Play build.

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
