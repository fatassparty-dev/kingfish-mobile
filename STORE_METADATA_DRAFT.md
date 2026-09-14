# KingFish Bets Store Metadata Draft

This records the customer-facing metadata used for iOS 1.0.10 build 36. The
binary was submitted for App Review on September 14, 2026. Promotional text can
change without a new binary; version description and What's New should remain
aligned with the submitted build.

## App Name

KingFish Bets

## Subtitle / Short Description

Props & Odds Analytics

## Promotional Text

Football is back! Get KingFish projections, live odds, matchup tools, and player
props for $0.99 your first month, then $4.99/month. Eligible new subscribers.

Apple has no free trial. Do not reuse Google Play or web trial language here.

## What's New — iOS 1.0.10

> Football season is here. This update includes:
>
> - Faster NFL board loading
> - Today, current-week, and all-game NFL filters
> - Current-season NFL prop data with rolling player histories
> - Actual season-week navigation for college football
> - More compact college football board views
> - Clearer school names and spread information
> - KingFish spread leans and total projections
> - Cleaner line-movement summaries
> - Improved login persistence and general reliability
>
> Eligible new monthly subscribers can also get their first month for $0.99,
> then $4.99/month.

The NFL Teaser Builder is not in the submitted native binary. Do not add it to
the 1.0.10 description, What's New, screenshots, or review notes.

## TestFlight — What to Test

> Please test the updated NFL and college football boards, including filters,
> stats, layouts, rotation, and staying signed in. Report any missing data,
> display issues, or crashes.

## Full Description

KingFish Bets is a sports analytics and odds research platform built for
faster, clearer research across the sports calendar.

Compare game lines, scan player props, review recent performance, explore player
profiles, generate cheat sheets, use fantasy football tools, and ask KingFish
for plain-English analysis backed by current data.

Inside KingFish Bets:

- Live game lines across supported sports
- Player props with recent-game and hit-rate context
- Odds comparison across supported U.S. sportsbooks
- KingFish projections and matchup insights
- MLB cheat sheets and Batter vs. Pitcher research
- MLB and NFL Game Factors
- College football rankings, spreads, totals, and matchup information
- Fantasy football rankings, news, and roster tools
- Ask KingFish analysis using current KingFish data
- One account across iPhone, Android, and the web

KingFish Bets does not accept wagers, hold funds, or operate as a sportsbook. It
is an analytics and information platform for users 18 and older where permitted
by law, subject to any higher age requirement in the user's jurisdiction.

All statistics, projections, research signals, tools, and analysis are provided
for informational and entertainment purposes. Gambling involves risk. Please
bet responsibly and within your means.

## Keywords

sports odds,player props,MLB props,NFL odds,sports analytics,betting research,cheat sheets

## App Review Notes

KingFish Bets is an analytics and sports information app. The app does not accept wagers, process bets, or operate as a sportsbook.

Premium access unlocks advanced research tools, player prop views, cheat sheets, and expanded AI usage. Payments in the iOS app are handled through Apple in-app purchase. Existing web or manually granted premium status is shared through the KingFish account system.

Reviewer notes:

- The app does not accept wagers or link users to place bets.
- Users can create an account, sign in, restore purchases, and delete their account from Account.
- Terms, Privacy, Refund, Help, and support email are available from Account and authentication screens.
- If no live market is posted for a sport, the app shows the current season-watch or empty state instead of fake content.
- Please provide App Review with a test account that has KingFish Bets Pro enabled so premium boards, Ask KingFish, cheat sheets, Fantasy Hub, Account, billing, support, legal pages, and account deletion can all be reviewed without needing a real purchase.
- Native subscriptions are handled through Apple in-app purchase in the iOS app. The mobile app does not include an outside checkout flow for new premium purchases.

The app uses public mobile-safe API keys only. Server-only keys and paid data provider keys remain on the KingFish backend.

## Review Test Account

Add these credentials in App Store Connect Review Notes before submission:

- Username: [create reviewer email]
- Password: [create reviewer password]
- Account state: Premium enabled, non-admin, safe demo account

Recommended reviewer path:

1. Sign in with the demo account.
2. On Dashboard, select NCAAF and review Game Props, Game Matchups, and League
   View. Confirm conference selection filters by actual team conference,
   Matchups displays weather instead of Status, and League View shows the
   current AP Top 25.
3. Review Game Lines, Player Props, Cheat Sheets, Fantasy Hub, Ask KingFish,
   Account, Help, Terms, Privacy, Refund Policy, and Support.
4. Confirm Restore Purchases and Manage Apple Subscription are visible from
   Account and the paywall.
5. Confirm Delete Account is visible from Account. Use a separate disposable
   account if Apple wants to test actual deletion.

## Screenshot Plan

Capture screenshots after the production build is stable:

- Sign In / Create Account
- Dashboard sport selector
- Game Lines
- Player Props board
- Player profile modal
- Tools / Cheat Sheets
- Fantasy Hub
- Ask KingFish
- Account Settings
- Paywall / subscription screen

## Data Safety Notes

The app may use:

- Email address for account login
- Name and optional state for account context
- App activity related to product usage and subscription status
- Chat messages when the user uses Ask KingFish
- A bet-slip screenshot the user explicitly selects for Grade My Slip; it is sent
  to KingFish and an AI processing provider to extract wager details and is not
  used for advertising or tracking

The app does not sell personal data. Payment details for iOS in-app purchases are handled by Apple and are not stored directly in the mobile app. Web payment details are handled outside the app by the web checkout provider.

## Age / Responsible Use Notes

Use 18+ positioning wherever the store asks for age context, unless Apple or a specific jurisdiction requires a higher age.

Suggested wording:

KingFish Bets is for users 18 and older where permitted by law. KingFish does not accept wagers. Tools and analysis are informational only. Problem gambling helpline: 1-800-522-4700.

## Family Sharing

First-submission posture: keep Family Sharing off for KingFish Bets Pro.
