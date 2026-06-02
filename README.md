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
- No AI bubbles. Do not use rounded generic label bubbles, bubbly pills, decorative badges, or repeated helper chips as a shortcut for design. They look generic and lazy in KingFish. Prefer boxier labels, table-like clarity, real icons, and quiet actions.
- Do not remove or flatten custom branded identity pieces without approval. Intentional KingFish visuals are not generic AI tells.
- Do not name third-party data providers in public mobile copy unless there is a legal or product reason, such as asking the user to connect an outside fantasy account.
- It is okay to say "KingFish data" when describing KingFish dashboards, tools, cheat sheets, or Ask KingFish context. Do not use that language when it would imply an outside ranking, ADP list, or vendor feed originated with KingFish.
- Run `npm run typecheck` before packaging an App Store build.
- For iOS billing surfaces, keep the language Apple-specific: Manage Apple Subscription, App Store refund policy, and cancellation at the end of the current billing period.
- Edge color language is intentional: Strong is green, Lean is gold, Neutral is muted, Fade is red.

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
- `production` for App Store builds

Do not run production submission until Apple Developer, RevenueCat Apple products, App Store Connect metadata, screenshots, and review notes are ready. Keep Google Play language out of the iOS app unless Android becomes an active release target.

## App Store Prep Checklist

Before the first real store build, confirm:

- Apple Developer organization enrollment is approved.
- RevenueCat has Apple products attached to the KingFish Bets Pro entitlement.
- The mobile env values are set for Supabase, the KingFish API base URL, and RevenueCat public SDK keys.
- The App Store app record uses bundle ID `com.kingfishbets.app`.
- Terms, Privacy, Refund, Help, and support links are live on `kingfishbets.com`.
- Screenshots show Dashboard, Game Lines, Player Props, Tools/Cheat Sheets, Fantasy Hub, Ask KingFish, Account, Paywall, and support/legal account links.
- Export compliance can answer that the app does not use non-exempt encryption beyond standard platform HTTPS/security.

## Tomorrow Test Pass

Use this focused pass before submitting a build:

- Sign up, sign in, sign out, reset password, and confirm auth screens link to Terms, Privacy, and support.
- Account: edit profile, restore purchases, open legal/support links, and confirm Delete Account is visible.
- Paywall: product copy, Terms/Privacy/Refund links, Restore Purchase, monthly/yearly plan selection, and Apple subscription management link.
- Dashboard: sport selector, season-watch states, Game Lines, Player Props, player profile modal, and paywall behavior for locked premium areas.
- Tools: Cheat Sheets, calculators, Game Factors, and Fantasy Hub.
- Fantasy Hub: Home League, Best Ball, Draft Planner, Sleeper/Roster Watch, hide/taken actions, and player profile modal.
- Ask KingFish: free limit messaging, premium messaging, and support/legal paths.
- Help, Terms, Privacy, and any Refund link opened from the app.
- Offline/error feel: API errors should read as temporary unavailable states, not broken screens.

## Current Polish Lessons

Use these as guardrails when matching mobile on web or when touching nearby mobile screens:

- Mobile Tools uses three tabs: Cheat Sheets, Calculators, and Pro Tools. Pro Tools contains Fantasy Hub and Game Factors.
- Cheat Sheet tiles should stay clean and intentional: compact two-column cards, sport eyebrow, strong title, subtle gold top accent, no repeated descriptions.
- The current sheet set includes MLB sheets plus NFL TD Streaks, NFL QB 2+ TD Streaks, and QB 200+ Yard Games.
- Game Factors should explain itself as a scoring-volume grade built from stadium, weather, officials, and matchup context. Avoid customer-facing terms such as "setup" when "volume" or "grade" is clearer.
- Hide neutral Game Factors tags. Keep useful tags such as HR Props, Power-Friendly, Cold Suppress, Rain/Wind Risk, Totals/Passing, and similar signals.
- Player prop landscape columns should be Player, Line, Odds, AVG, L5, L10, L5 Hit, L10 Hit, Edge.
- Player profiles can use landscape, but fantasy profiles should not show gambling-style Recent Form. Use News when available instead.
- Fantasy Draft Planner player actions should read Available until tapped; tapping marks the player taken and rebuilds/collapses the path around them.
- Account support actions should be obvious: Help Guide and Contact Support as full-width buttons, with Terms, Privacy, and Refund Policy as compact legal links.
- iOS billing should show Manage Apple Subscription and Refund Policy. Do not send users to Pricing when they are trying to manage a plan.

Do not turn this into another page-by-page polish pass unless Brian asks for it.

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
