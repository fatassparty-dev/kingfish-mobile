# Weekend billing-management release

Account, active-Pro paywall, and the personal subscription section on Refund
Policy route by purchase provider rather than device. The account API exposes
the existing premium_source field. Stripe goes to the existing website account
page (browser sign-in required), Apple to Apple subscription settings, and Google
to Google Play. No token is placed in a URL. Canonical source wins over stale
legacy platform metadata; stripe_plan alone never proves website billing.

Missing source/platform offers a three-provider chooser. Manual/comp/lifetime
access offers help without claiming that separate paid subscriptions are canceled.
Link failures display provider-specific manual instructions, including Catalyst.
Account deletion copy reminds customers to cancel billing before deleting.
Store-specific refund policy buttons remain explicitly labeled by store.

Validation: six billing/fallback/signup-attribution tests passed in each app;
both app TypeScript checks passed. No native build or device test performed.
The earlier compatible dependency lock updates still require a clean cloud
install/build and device QA; local node_modules predates those lock updates.

## Before shipping this weekend

- Confirm the deployed account API includes premium_source for the signed-in
  account. No new SQL is required; this field is used by existing webhooks.
- On iPhone and iPad/Mac, test website, Apple, Google, missing-source and manual
  account fixtures. The account screen and active-Pro paywall must agree.
- For a real website subscriber, sign into the website account page opened by
  the button and confirm their existing cancellation controls are available.
  Do not cancel a real subscription merely to test navigation.
- Verify Apple opens normally on a device and the manual fallback is readable.
  A successful open is navigation, not proof a subscription exists in that store.
- Verify signup/sign-in, premium access and restore purchases after the build.
- Build using the normal cloud/store workflow, then submit and release after QA.

This fixes navigation and failure handling, not purchasing, renewal logic, or the
unresolved Sentry native app hang. It is not live until a new app binary ships.
