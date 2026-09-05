# September 5 engineering candidate

Prepared from the committed billing/signup/dependency release, without unrelated
NCAA or release-document edits in the primary working tree.

New source instruments native signup view/start/safe issue categories, paywall
views, purchase/restore starts, and authenticated player/stadium research opens.
Signup persists a random first-party visitor identity alongside the existing
platform/client/version/build metadata. No credentials, names, raw errors,
player identities or advertising IDs enter diagnostic payloads.

Signup always releases loading after a rejected request. A secondary profile
write cannot turn an already-created account into a failed-signup message.

The navigation decoder uses the upstream 0.5.0 algorithm with only a CommonJS
export adaptation; see vendor/decode-uri-component/README.md. No Expo SDK
upgrade. Valid route/query/auth parameters and long malformed queries pass
against the real query-string and React Navigation consumer.

Local source TypeScript and focused fixture checks passed using the preexisting
dependencies. A clean cloud install is a separate gate. GitHub workflow records
clean npm ci, TypeScript, consumer tests, Expo compatibility/Doctor and an audit.

## Release gates

The native funnel collector is a separately staged website release requiring
supabase-funnel-tracking-2026-09-05.sql. A missing collector/schema cannot block
native product use. Enable each platform's cohort only after a build-tagged real
signup and authenticated research use on that platform are verified. The existing
web-v1 rollout is preserved.

Brian deferred device QA to September 6 and may add more release changes. These
are candidates, not a final store submission. No public native release has been
made. Available devices are iPhone and Mac; iPad requires a cloud-built simulator
artifact, and physical iPad/Android checks remain unverified.

Studio's existing Mac Catalyst Xcode customization is not represented by the
managed EAS iOS configuration. A standard EAS iOS build is not a Mac release.
Do not build locally or substitute an iPad artifact for the Catalyst package.
The original ignored native project remains preserved in the primary repository.
