# NFL Daily Intel — iPhone release note

NFL Daily Intel is now a native iPhone Pro Tool backed by the public saved-data
endpoint `/api/nfl-news`. It displays the current saved edition date, numbered
headlines, player/team subjects when supplied, source descriptions, Central-time
publication timestamps, and links to the original articles. It does not run a
news collector, model, Edge+ worker, or paid provider call from the device.

The screen handles loading, empty, saved-prior-edition, and retryable error
states. NFL Daily Intel is intentionally available without the premium gate,
matching the website release. The compact third Tools selector remains labeled
`Tools` on iPhone by Brian's September 8 decision.

This source change is not shipped until a new native binary is built, installed,
device-tested, and submitted. Edge+ remains paused and is not part of this release.
