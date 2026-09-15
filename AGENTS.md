# KingFish Mobile agent rules

## Hard browser-permission rule (Brian, September 15, 2026)

Never open, control, inspect, or automate a browser or computer UI without
Brian's explicit permission for that specific action. This includes Chrome,
Safari, in-app browsers, CUA, Playwright, Puppeteer, headless browsers, and
Google Play or App Store console UI. Never suggest, delegate, or authorize
browser/UI work in a prompt, handoff, or new-session instruction without Brian's
explicit permission. A request to implement, build, prepare a release, or write
a prompt does not grant it. Finish local work and ask before any needed UI step.

This rule follows a Google Play handoff prompt that wrongly authorized
upload/submission and browser work, causing a failed, costly session. Do not
repeat that authorization error.
