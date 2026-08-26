# Samsung Galaxy Store submission progress

Last updated: 2026-08-25

> The Samsung Galaxy Store Seller Portal account has been created under
> **KingFish Bets, LLC**. Samsung has not granted commercial seller status, no
> Samsung app has been registered or submitted, and no Galaxy Store billing
> work has begun.

The complete researched execution plan is maintained in
[`../../kingfish-bets/docs/samsung-galaxy-store-publishing-plan.md`](../../kingfish-bets/docs/samsung-galaxy-store-publishing-plan.md).
This file is the short operational tracker, comparable to
`ANDROID-SUBMISSION-PROGRESS.md` for Google Play.

## Current state

| Area | Status | Current result / next action |
|---|---|---|
| Samsung account | Complete | Company-controlled account used to enter Seller Portal |
| Seller Portal registration | Complete | Portal welcomed **KingFish Bets, LLC** and allows free-app registration |
| Seller type | Company identity entered | The portal is using the KingFish Bets, LLC name; preserve that company identity |
| Commercial seller status | **Blocked before submission** | The request reached Samsung's financial-information step, but KingFish does not yet have a payout account titled to **KingFish Bets, LLC** |
| Gambling-policy inquiry | Complete | Samsung declined advance clearance and said eligibility will be decided only after app submission and review |
| App registration | Not started | Do not add the app until the package/build decision and commercial-status process are understood |
| Samsung package name | Planned, not created | Recommended: `com.kingfishbets.app.galaxy`, subject to final approval before the first binary |
| Samsung build | Not started | No code or build changes have been made |
| Samsung IAP product | Not started | Initial recommendation is monthly only, mapped to the existing KingFish Bets Pro entitlement |
| RevenueCat Galaxy app | Not started | RevenueCat supports Galaxy Store, but setup waits for Seller Portal app/package information |
| Closed beta | Not started | Samsung IAP apps require a closed beta; purchase testing requires a physical Galaxy device |
| Store listing and declarations | Not started | Reuse approved Android materials, adapted honestly for Samsung |
| Samsung review | Not submitted | Review is the only path Samsung offered for an eligibility decision |
| Public release | Not started | Publication must remain manually controlled until approval and final retail QA |

## Account clarification

Samsung separates two concepts that sound similar:

1. **Seller Portal company registration** — complete. The account is registered
   using the KingFish Bets, LLC identity.
2. **Commercial seller status** — not complete. This is a separate verification
   request that enables paid applications and Samsung in-app purchases.

The portal confirmation stated that KingFish can register free applications
now and can sell paid applications after completing a commercial seller
request. This does not mean the account was registered as an individual, and it
does not mean commercial status has already been approved.

Before sending the commercial request, confirm that the Seller Portal profile
shows:

- company/seller name: **KingFish Bets, LLC**;
- country/region: **United States**;
- representative: the correct individual representative;
- company-controlled contact email;
- correct public support email; and
- acceptable public business address and phone.

Do not put identity documents, D-U-N-S records, banking information, tax data,
account recovery codes, or Seller Portal credentials in this repository.

## Samsung policy response

KingFish asked Samsung for written pre-submission confirmation that an 18+
analytics-only app—one that discusses sportsbook odds and sports betting but
does not accept wagers—could be distributed in Galaxy Store.

Samsung replied that:

- it cannot provide written confirmation before submission;
- eligibility can be determined only after Samsung receives and tests the app;
- KingFish should include a detailed explanation in the submission comments;
  and
- the review team will consider that explanation during review.

This is **not an approval or a rejection**. It replaces the original advance-
clearance gate with an actual app-review gate.

Samsung's published distribution policy still says apps may not “promote or
enable” gambling, including sports betting. Therefore:

- do not assume Apple, Google, or Microsoft approval predicts Samsung approval;
- do not conceal KingFish's real betting-analysis features from Samsung;
- do not create a sanitized reviewer-only build;
- do not claim that KingFish is a generic scores app;
- explain clearly that KingFish does not take wagers, deposits, balances, or
  sportsbook credentials and does not award money or prizes; and
- treat a policy rejection as a stop signal rather than repeatedly resubmitting
  misleading variants.

## Recommended launch route

Proceed in this order:

1. Verify the Seller Portal company profile.
2. Request Corporate Commercial Seller status for KingFish Bets, LLC.
3. Wait for Samsung's business/financial verification result while preparing
   the submission packet and exact policy explanation.
4. Approve the Samsung package and signing strategy.
5. Build the Samsung-specific Android variant only after the account path is
   confirmed.
6. Configure Samsung IAP through the existing RevenueCat project.
7. Run a Samsung closed beta on a physical Galaxy device.
8. Submit the real app with the detailed policy explanation and manual
   publication selected.
9. If approved, run final retail QA and explicitly approve publication.
10. If rejected because the real KingFish product is ineligible, stop the
    Samsung project.

## Immediate next action

Commercial seller verification is currently blocked at Samsung's financial-
information step. Open a bank account whose legal account-holder name is
**KingFish Bets, LLC**, then obtain the bank's official incoming international
USD wire instructions before returning to the Samsung form.

Do not use Brian's personal Capital One account or a personal E\*TRADE account.
Do not guess a branch name, branch address, SWIFT/BIC code, intermediary bank,
or other payout information.

Record only the non-sensitive outcome here:

- [x] Company name displays as KingFish Bets, LLC.
- [ ] Country/region displays as United States.
- [ ] Representative name is correct.
- [ ] Contact and public support information are correct.
- [ ] Brian approves proceeding with commercial seller verification.

Banking blocker:

- [ ] Open a bank account titled exactly to KingFish Bets, LLC.
- [ ] Confirm the account can receive international USD wire payments.
- [ ] Obtain official beneficiary-bank, branch/address, SWIFT/BIC, and any
      intermediary-bank instructions directly from the bank.
- [ ] Obtain a bank statement or account-verification document showing the LLC
      as account holder, if Samsung requests supporting documentation.

Then:

- [x] Start the commercial seller request.
- [ ] Note whether Samsung offers D-U-N-S verification or document verification.
- [x] Note the requested payout fields without copying private values into Git.
- [ ] Submit only after every legal name and address matches the authoritative company records.

## Commercial seller preparation

Samsung may request:

- matching KingFish Bets, LLC legal information;
- individual representative verification;
- D-U-N-S company verification or alternate company documents;
- U.S. financial/payout information;
- tax information;
- company-domain email explanation; and
- confirmation of the type of application KingFish plans to distribute.

Samsung says commercial approval can take several days. D-U-N-S verification
can take up to ten business days. The submission should use exact matching
company, representative, address, country, and payout information to avoid an
avoidable rejection.

## Planned product and commerce

Subject to Samsung approval:

| Item | Initial Samsung decision |
|---|---|
| App title | KingFish Bets |
| Seller | KingFish Bets, LLC |
| Market | United States only |
| Language | English (United States) |
| Age | 18+ |
| Download price | Free |
| Premium product | Monthly Samsung subscription only |
| Entitlement | Existing KingFish Bets Pro RevenueCat entitlement |
| Existing account | Same Supabase/KingFish account across every platform |
| Annual plan | Deferred from first Samsung release |
| Publication | Manual after approval and final QA |

The preferred subscription offer is the existing Android launch structure—
three days free, then $0.99 for the first paid month, then $4.99/month—only if
Samsung Seller Portal can represent those exact terms. The store product, not
hardcoded copy, must be authoritative.

## Submission explanation draft

Include a concise version of the following in Samsung's private review comments:

> KingFish Bets is an 18+ sports analytics and information application for U.S.
> users. It displays sports statistics, publicly posted prices from supported
> regulated sportsbooks, player-prop and game research, informational picks,
> calculators, fantasy tools, and AI-assisted sports analysis. KingFish does
> not accept or place wagers, hold funds or balances, award cash or prizes,
> operate a sportsbook, connect to sportsbook accounts, or process gambling
> transactions. The subscription unlocks analytics and research features only.
> Samsung Customer Service advised us to provide this complete explanation in
> the submission comments so the review team can evaluate the application under
> the Galaxy Store distribution policy.

Also provide:

- working reviewer account and instructions;
- navigation to Dashboard, Picks, Cheat Sheets, calculators, Ask KingFish, and
  Grade My Slip;
- subscription purchase and restore steps;
- Privacy, Terms, Help, and account-deletion links;
- the Samsung support case/reference number; and
- clear 18+ and responsible-use information.

## Release gates

### Account gate

- [x] Correct company identity is visible in Seller Portal.
- [ ] Business payout account is titled to KingFish Bets, LLC.
- [ ] Official international USD wire details have been obtained from the bank.
- [ ] Commercial seller status is approved.
- [ ] Payout and tax setup are accepted.
- [ ] Public seller contact information is approved.

### Build gate

- [ ] Samsung-specific package and signing decision is final.
- [ ] Galaxy build cannot initialize Google Play Billing.
- [ ] Galaxy build contains no Google Play cancellation/refund language.
- [ ] Apple and Google production behavior remains unchanged.

### Billing gate

- [ ] Samsung subscription is active in Seller Portal.
- [ ] Galaxy app and product are connected to RevenueCat.
- [ ] Samsung purchases map to the existing Premium entitlement.
- [ ] Purchase, restore, cancellation, expiration, refund, and revocation pass.
- [ ] Samsung events cannot remove Apple, Google, Stripe, or comp access.

### QA gate

- [ ] Closed-beta app installs from Galaxy Store on a physical Galaxy device.
- [ ] Real or licensed test purchase completes.
- [ ] Premium syncs to web and the other KingFish clients.
- [ ] Real Android push notification opens correctly.
- [ ] Grade My Slip/photo selection works.
- [ ] All navigation, account, legal, support, and deletion flows pass.

### Submission gate

- [ ] Listing and screenshots show the real application.
- [ ] Data and age declarations match the binary.
- [ ] Detailed policy explanation and support case are in reviewer comments.
- [ ] Reviewer account works from a clean install.
- [ ] Manual publication is selected.
- [ ] Brian explicitly approves submission.

## Activity log

### 2026-08-24

- Registered with Samsung Galaxy Store Seller Portal.
- Seller Portal displayed **Welcome! KingFish Bets, LLC**.
- Portal confirmed that the account can register free applications and must
  request commercial seller status to sell paid applications.
- Sent Samsung a pre-submission policy inquiry explaining KingFish's analytics-
  only model and asking for written eligibility confirmation.

### 2026-08-25

- Received Samsung Customer Service response.
- Samsung declined to make an advance eligibility determination.
- Samsung instructed KingFish to submit the app and place a detailed explanation
  in the review comments.
- Confirmed Seller Portal shows **KingFish Bets, LLC** as a Corporate Seller
  with Free Distribution Seller status.
- Started the Commercial Seller Status request and reached Samsung's required
  financial-information step.
- Identified a blocking requirement: Samsung requires a payout account whose
  account-holder name matches KingFish Bets, LLC. The available Capital One
  account is personal, and PayPal is unavailable. No personal account will be
  entered as the company's payout account.
- Paused the commercial seller request until an LLC bank account is opened and
  the bank supplies verified incoming international USD wire instructions.
- No app registration, code change, billing setup, beta, or app submission has
  occurred yet.

## Sensitive-information rule

Never commit or paste into this file:

- Samsung passwords, 2FA codes, recovery codes, or session links;
- reviewer passwords;
- government identification;
- D-U-N-S verification documents;
- bank, PayPal, tax, or payout information;
- Samsung or RevenueCat private service-account keys;
- signing keystores or passwords; or
- private support correspondence containing personal information.

## Official references

- [Galaxy Store overview](https://developer.samsung.com/galaxy-store)
- [Seller Portal and commercial seller setup](https://developer.samsung.com/galaxy-store/prepare.html)
- [Galaxy Store distribution policy](https://developer.samsung.com/galaxy-store/distribution-guide.html)
- [App registration, beta, and review](https://developer.samsung.com/galaxy-store/launch.html)
- [Samsung IAP](https://developer.samsung.com/iap/overview.html)
- [RevenueCat Galaxy Store setup](https://www.revenuecat.com/docs/platform-resources/galaxy-platform-resources/galaxy-setup-guide)
