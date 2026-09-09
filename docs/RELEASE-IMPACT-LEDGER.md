# Store release impact ledger

Use this ledger to test whether a store release changes discovery, account
creation, useful product activity or paid conversion. Times are Central Time.
Publication is an event boundary, not proof that the release caused a change.

## Measurement rules

- Record the store's own impressions, listing visitors and acquisitions. A rise
  here is the evidence needed for the idea that an update moved KingFish toward
  the front of a store's discovery surfaces.
- Record KingFish completed accounts separately from store installs. For native
  1.0.9 signups, retain platform, store source, client, app version and build.
- Record first meaningful research use, return use, trial starts and paid
  customers when those measures are available and mature.
- Keep unknown-platform accounts visible. Never backfill or guess their source.
- Compare the same weekdays when possible. Mark promotions, games, email, ads,
  listing changes and other releases that overlap a measurement window.
- Check at 24 hours, 72 hours, 7 days and 14 days. Day-7 return-use cohorts are
  incomplete until their full seventh Central calendar day has passed.

## Android 1.0.9 release event

| Field | Recorded value |
|---|---|
| Store / track | Google Play / Production |
| Version | 1.0.9 |
| Version code | 6 |
| Source commit | `adf4627a34b5f20178d5b36fff5d8fd75172a5ff` |
| EAS build | `15a60bf7-b2c1-4f69-a5af-4bc6f91c2c77` |
| Cloud build completed | September 8, 2026, 7:45 p.m. |
| Submitted to Google | September 8, 2026, 10:14 p.m. |
| First confirmed Published | September 9, 2026, 7:35 a.m. |
| Rollout | Production; full rollout selected; managed publishing off |
| Store listing change | None recorded with this release; existing Google Play images retained |
| Device coverage | No supported-device loss reported by Play Console |

The exact publication time is somewhere after submission and no later than the
first observed Published time. Use September 9 as the daily cohort boundary and
retain the time interval above for hourly analysis.

### Customer-facing changes

- NFL Daily Intel in Tools.
- NCAA football cheat sheets in the native app.
- Persistent sign-in across normal closes and reopenings.
- More reliable signup and subscription-management handling.
- Future native signup evidence containing platform, store, client, version and
  build when the production signup trigger records the supplied metadata.

Expected new-account evidence from this binary:

| Field | Expected value |
|---|---|
| `acquisition_platform` | `android` |
| `acquisition_source` | `google_play` |
| `acquisition_medium` | `app` |
| `acquisition_signup_path` | `app_signup` |
| `acquisition_client` | `kingfish-mobile` |
| `acquisition_app_version` | `1.0.9` |
| `acquisition_app_build` | `6` |

The binary and Google publication are verified. A real customer signup carrying
these exact fields has not yet been verified, so keep that as a separate check.

### Hypothesis and competing explanations

Primary hypothesis: publishing an update increases Google Play visibility,
leading to more listing visits, installs and KingFish accounts.

Concurrent factors that must remain visible in the comparison:

- the first NFL game and opening-week search interest on September 9;
- the football-opening $0.99 introductory promotion;
- the nearby iOS 1.0.9 submission and its new App Store screenshots;
- any paid campaigns, emails, social posts or third-party catalog exposure.

If registrations rise without a rise in Play impressions or acquisitions, the
data does not support the store-ranking hypothesis. If Play discovery rises but
registrations do not, inspect listing-to-install and install-to-signup conversion.

### Checkpoints

| Checkpoint | Due | Play impressions / visitors / acquisitions | Android accounts | Activated | Trial / paid | Notes |
|---|---|---:|---:|---:|---:|---|
| 24 hours | Sep 10, 7:35 a.m. | — | — | — | — | |
| 72 hours | Sep 12, 7:35 a.m. | — | — | — | — | First full NFL Sunday begins next day |
| 7 days | Sep 16, 7:35 a.m. | — | — | — | — | Compare with prior same weekdays |
| 14 days | Sep 23, 7:35 a.m. | — | — | — | — | Evaluate sustained effect |

For the pre-release comparison, use the seven-day interval ending immediately
before September 8 at 10:14 p.m. Central, then also compare calendar-day and
same-weekday views. Save raw counts as well as percentage changes so a small
baseline is not mistaken for a large durable effect.

## iOS 1.0.9 release event

| Field | Recorded value |
|---|---|
| Store | Apple App Store |
| Version | 1.0.9 |
| Build | 31 |
| Source commit | `caaa145` |
| Apple review | Approved September 9, 2026 |
| Scheduled release | September 9, 2026, 11:00 a.m. Central |
| Public availability | Not yet independently verified; record the first confirmed live time |
| Store listing change | Eight new App Store screenshots |
| Promotion | Football opening special: first month for $0.99 |

The approval and scheduled-release time were recorded at 10:58 a.m. Central,
two minutes before release. Approval does not by itself prove public
availability, so the public release boundary remains pending until the listing
or a device confirms version 1.0.9 is available.

### Customer-facing changes

- NFL Daily Intel in Tools.
- NCAA football cheat sheets in the native app.
- Persistent sign-in across normal closes and reopenings.
- More reliable signup and subscription-management handling.
- Native signup evidence containing platform, store, client, version and build.
- A redesigned App Store screenshot gallery promoting the current experience.

Expected new-account evidence from this binary:

| Field | Expected value |
|---|---|
| `acquisition_platform` | `ios` |
| `acquisition_source` | `app_store` |
| `acquisition_medium` | `app` |
| `acquisition_signup_path` | `app_signup` |
| `acquisition_client` | `kingfish-mobile` |
| `acquisition_app_version` | `1.0.9` |
| `acquisition_app_build` | `31` |

A real iOS 1.0.9 signup carrying these exact fields has not yet been verified.
Keep that verification separate from Apple approval and public availability.

### Hypothesis and competing explanations

Primary hypothesis: the release or its new screenshots increases App Store
visibility and conversion, leading to more product-page views, downloads and
KingFish accounts.

The opening NFL game, the $0.99 offer, the Android 1.0.9 release, and any
campaign activity overlap this release. Use App Store Connect source and funnel
metrics before attributing a signup increase to update placement.

### Checkpoints

These provisional due times use the scheduled release boundary. Shift them to
the first confirmed public time if the version appears later.

| Checkpoint | Due | App Store impressions / product-page views / downloads | iOS accounts | Activated | Trial / paid | Notes |
|---|---|---:|---:|---:|---:|---|
| 24 hours | Sep 10, 11:00 a.m. | — | — | — | — | Confirm public-release time first |
| 72 hours | Sep 12, 11:00 a.m. | — | — | — | — | |
| 7 days | Sep 16, 11:00 a.m. | — | — | — | — | Compare with prior same weekdays |
| 14 days | Sep 23, 11:00 a.m. | — | — | — | — | Evaluate sustained effect |

For the pre-release comparison, use the seven-day interval ending immediately
before September 9 at 11:00 a.m. Central. Preserve the Android release as an
overlapping event rather than combining both stores into one acquisition total.
