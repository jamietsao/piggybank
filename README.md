# Piggybank

A small, responsive family app for keeping track of cash. Built with Next.js,
TypeScript, and Google Sheets. The spreadsheet is the database.

The app shows the current balance and history, and records **Add money**,
**Spend money**, and **Recount cash**. It preserves the existing four-column
ledger and its balance formulas. There is no link that opens Google Sheets from
the app, and no in-app editing or deletion yet.

[SPEC.md](SPEC.md) records product behavior, architecture, the spreadsheet schema,
and future design. [AGENTS.md](AGENTS.md) records the agent working agreements,
including feature branches, pull requests, and milestone review checkpoints.
This README covers setup, operation, and live acceptance.

## Run locally

Use Node 22.12+ (Node 20.19+ is also supported). If you use nvm:

```sh
nvm install
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Without Google credentials the app shows its welcome
screen and setup message.

For an interactive local preview, set `DEV_DEMO_MODE=true` in `.env.local` and
restart the development server. The clearly marked preview uses fictional,
in-memory data and does not call Google. Its data resets when the server restarts.
The preview is **always disabled in production**, even if that variable is set.

## Google setup

Do this first with a disposable test spreadsheet under a supervised Google
account. Do not enable writes against the original spreadsheets until the
Family Link and Safari checks below pass. No spreadsheet permissions need to be
made public.

1. Create a Google Cloud project. Enable **Google Sheets API**, **Google Drive
   API**, and **Google Picker API** in that same project.
2. Configure the Google Auth Platform consent screen. Request `openid`, `email`,
   `profile`, and `https://www.googleapis.com/auth/drive.file`. For an external
   app in Testing mode, add both daughters as test users. Review Family Link's
   third-party app controls with a parent.
3. Create an OAuth client with application type **Web application**. Add
   `http://localhost:3000` to authorized JavaScript origins and
   `http://localhost:3000/api/auth/callback` to authorized redirect URIs. For
   deployment, add the equivalent HTTPS URLs for the stable app domain.
4. Create a Picker API key in the same project. Restrict it to **Google Picker
   API**. Under **Application restrictions → Websites**, allow
   `http://localhost:3000/*`, `https://docs.google.com/*`, and the production
   app's referrer when deployed (for example `https://your-domain.example/*`).
   Picker runs inside a Google Docs iframe, so omitting its referrer can cause
   an "API developer key is invalid" error. This key is intentionally sent to
   the browser; the OAuth client secret is not.
5. Copy values into `.env.local`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_PICKER_API_KEY`, and `GOOGLE_CLOUD_PROJECT_NUMBER`. The last value is
   the numeric project number, not its text project ID.
6. Generate a session password:

   ```sh
   openssl rand -base64 32
   ```

   Use that value for `SESSION_SECRET`. It must have at least 32 characters.
   Keep the same secret across instances of a deployment.
7. Leave `FAMILY_MEMBERS=[]`, restart the server, and sign in once with each
   daughter's Google account. The welcome screen displays that account's
   **verified Google account ID** without granting access to the app. Use that
   ID in `FAMILY_MEMBERS`; do not use an email address as the identity key.
8. Configure each connection. The spreadsheet ID is the part after `/d/` in the
   Sheets URL; the tab ID is the URL's `gid` number (often `0`). For example:

   ```json
   [
     {"googleSub":"first-verified-id","displayName":"First daughter","spreadsheetId":"first-file-id","sheetId":0},
     {"googleSub":"second-verified-id","displayName":"Second daughter","spreadsheetId":"second-file-id","sheetId":0}
   ]
   ```

   Store the JSON as a single `FAMILY_MEMBERS` environment-variable value.
   Names are used only for display. For the first test, configure disposable
   spreadsheet copies instead of the original file IDs.
9. Sign in again. If the app cannot yet read the sheet, select **Connect my
   spreadsheet** and choose the configured spreadsheet in Google Picker.
   Picker grants this app access to that specific file; the server verifies
   both the selected file and its layout. Selecting a different file cannot
   change the connection.

Google's **Testing** consent-screen mode can expire refresh tokens after seven
days. Before regular family use, review the consent-screen publishing status
and Google's applicable verification requirements. Use a stable production
domain rather than arbitrary Vercel preview URLs for regular Google sign-in.

References: [Google web-server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server),
[file-specific scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth),
[Picker setup](https://developers.google.com/workspace/drive/picker/guides/web-picker?hl=en),
[Family Link controls](https://support.google.com/families/answer/9204736).

## Prepare the ledger tab

The configured tab needs **Date, Amount, Balance, Description** in A1:D1 and an
opening row with a numeric balance. Keep it dedicated to ledger entries, with
summaries on another tab. Maintain Balance formulas when adding ordinary entries
directly in Sheets; a missing/error balance in the latest row blocks app writes.
See [the spreadsheet schema](SPEC.md#spreadsheet-schema-and-balance-semantics)
for data types, recount semantics, and compatibility limits.

The app's Description field is stored in column D. **Notes** is also accepted as
that column's header, so existing sheets can be renamed when convenient.
If a sheet still uses the earlier Date/Description/Amount/Balance layout, move
its entire columns to match the required layout and label column D Description;
changing only the header labels would put the existing values in the wrong
columns. Confirm the balance
formulas still work after reordering, using a disposable copy first.

## Implementation milestones and live acceptance

The code includes all v1 actions. Complete these external checks with your
credentials and devices **one agreed milestone at a time**. Review outcomes
with the user and record any fixes/checklist updates in that milestone's commit
before advancing. The current implementation/verification status is in
[SPEC.md](SPEC.md#current-scope-and-verification-status).

Verified on desktop Chrome with one configured account on 2026-10-12: Google
sign-in, Picker selection, and read-only loading of the Notes-layout test copy
(218 populated rows, $187.00). The user confirmed the balance and transaction
history match. The user also confirmed hosted Google sign-in, balance/history,
and the requested Safari screen-fit, refresh, and return-to-app checks on a
target device. The user also signed in with the second account on their phone,
connected its original through Picker, and confirmed the balance/history.
The user confirmed local and hosted Safari Add, Spend, Recount, and
adding after a recount on the disposable copy. Direct spreadsheet edits and
row deletions were also reflected in the app after automatic refresh. Writes
are enabled in Production, with both accounts mapped to their respective
originals. Local development still targets the disposable copy; Preview stays read-only.

- [x] **Desktop read-only checkpoint:** one account can sign in, connect its
  disposable copy, and view the correct balance and history; user review passed.
- [x] **Hosted read-only checkpoint:** first configured account can sign in on
  Vercel and view its balance/history; user review passed.
- [x] **Authorization gate (first account):** sign in on target-device Safari
  and successfully read the disposable sheet authorized through Picker. If blocked, pause
  and resolve parental permissions; do not switch to parent-managed identities.
- [x] **Read-only balance (first account):** confirm the balance matches Google Sheets. On the
  supplied Notes-layout copy, 218 populated rows should load and the balance
  should be $187. The earlier reference has 96 entries and a $270 balance once
  its columns are reordered to the current schema.
- [x] **Safari usability:** confirm the balance/history fit the screen and
  refresh and returning to the app work; user review passed.
- [ ] **History details:** check older entries, date ranges, and recount markers.
- [x] **External edits:** the user confirmed that direct spreadsheet updates
  and row deletions appear in the app after automatic refresh.
- [x] **Second-account access:** Google sign-in succeeded on the user's phone;
  its original is connected through Picker and balance/history passed user review.
- [ ] **Second-account writes:** money actions under this account have not been
  explicitly verified live.
- [x] **Basic local writes:** Add money, Spend money, and Recount cash work
  against the disposable copy, as reported by the user. The user observed the
  working running-balance formula in Sheets.
- [x] **Formula after a recount:** the user confirmed that a subsequent Add
  starts from the recounted balance on the disposable copy.
- [ ] **Add/Spend edge cases:** explicitly verify cents, backdated spending,
  a description beginning with `=`, and confirmed overspending.
- [ ] **Recount edge cases:** test a zero balance and another corrected balance,
  then add a transaction. Confirm formulas remain correct after earlier Sheet edits.
- [x] **Hosted writes:** after local review, the user confirmed the requested
  Add, Spend, Recount, and subsequent Add sequence on Vercel in target-device Safari.
- [ ] **Concurrent sessions:** append two ordinary entries from two sessions
  and verify both rows and their cumulative balance. The row formula is chosen
  relative to the actual appended row, not a client-calculated row number.
- [x] **First-account release:** the user connected the original through Picker
  and confirmed its displayed balance/history look correct; the app's layout
  check passed. The user approved proceeding after basic local and hosted tests,
  deferring remaining manual edge cases and concurrency checks.
- [x] **Second-account connection:** the user confirmed its original-sheet
  setup after updating the complete two-account mapping; first record preserved.
- [x] **OAuth Production:** the user completed required Branding fields,
  published OAuth, and confirmed fresh sign-out/sign-in and balance/history
  for both accounts at the custom domain.

`ENABLE_SHEET_WRITES=false` is the default. Read-only mode is displayed in the
app and enforced on the server. Original Sheets were not modified during
development. Setting the flag acknowledges completion of the manual gate.
Remaining unchecked edge cases are deferred by the user's decision to proceed
with original-sheet setup; they have not been verified live.

Avoid simultaneous recounts, spending confirmations, or structural Sheet edits
when checking exact confirmation amounts. The read/append concurrency limitation
is documented in [SPEC.md](SPEC.md#compatibility-and-limitations).

### Live-write verification

Add money, Spend money, and Recount cash are approved for testing together on
the configured disposable copy in one PR. Basic local and hosted Safari flows,
adding after a recount, and refresh after external edits/deletions passed user
review; other write edge cases and concurrent-session checks remain pending.
Test locally first, with `DEV_DEMO_MODE=false` and `ENABLE_SHEET_WRITES=true`
on the development-server process; the saved `.env.local` write flag can stay
`false`. Keep Vercel read-only until local review. For the basic sequence,
record the starting balance, add $1.25, spend $0.50,
then recount to the starting balance and confirm the reset. Inspect the appended
rows directly in the disposable sheet: Amount is positive for Add, negative for
Spend, and blank for Recount; Balance is a working formula for Add/Spend and a
literal value for Recount. Add $0.25 after the reset to verify the next formula,
then recount to the starting balance again. Refresh on desktop and Safari to
confirm the same balance/history. Record further checklist checks separately.

After local review, enable `ENABLE_SHEET_WRITES=true` for **Production only**
and redeploy. Keep it `false` for Preview and keep `DEV_DEMO_MODE=false` in both
environments. If the flag currently has one shared Production/Preview entry,
split it into separate entries before enabling Production. Keep the connection
on the disposable copy; enabling writes does not authorize switching to originals.

### Original-sheet setup

The user approved moving the tested first account to its original sheet and
provided its URL with tab ID `0`. Update only the Production `FAMILY_MEMBERS`
record's `spreadsheetId` and `sheetId`, keeping its verified `googleSub` and
display name. Redeploy, reload the app, and select the original in Google Picker
if access is requested. Verify Date/Amount/Balance/Description (or Notes) in A–D
and compare the app's balance/history with the original before regular use.
The user completed Picker connection and confirmed the original's displayed
balance/history look correct; the app's access/layout checks passed. The agent's
connected Drive account cannot inspect the original; verification used the
daughter's app session. Production writes remain enabled for regular use.

Keep the local connection and live test entries on the disposable copy. Do not
add synthetic test entries to the original. Keep remaining manual edge cases
recorded as deferred. Both accounts are now configured in Production, and the
user confirmed the second account's phone sign-in, Picker connection, and
balance/history. Second-account money actions remain unverified live.

When adding another account, append its verified account-to-sheet record to
the complete Production `FAMILY_MEMBERS` array, preserving existing records.
Its display name can be edited independently of the verified account ID.
Redeploy and sign in again if the unconfigured-account screen remains, then
connect the correct original through Picker and verify its balance/history
before making entries. All ledgers need Date/Amount/Balance/Description (or
Notes) in A–D. Connection values belong in private environment configuration,
not this repository's tracked files.

## Tests

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

- Vitest covers money validation, reference-ledger compatibility, historical
  recounts, Google identity checks, token refresh, account isolation, origin
  checks, file resolution, write requests, and uncertain saves.
- Playwright checks phone/tablet layouts and WebKit phone flows, history,
  additions, overspending confirmation, zero recounts, failed drafts, repeated
  taps, and invalid balances. It uses fictional data and mocked API responses;
  it does **not** authenticate to Google or modify real Sheets.
- `tests/fixtures/reference-balances.json` and
  `tests/fixtures/notes-ledger-balances.json` contain only amounts and balances
  from the provided test copies. Names, dates, and notes are omitted.
- Browser-test demo access is development-only. Production builds always require
  Google authorization.

The browser-test server uses port 3000; stop other dev servers before running it.
Real Safari, Family Link authorization, and actual Google formula evaluation
are separate live acceptance checks, not simulated browser-test claims.

## Vercel

The family app is at
[piggybank.jamietsao.com](https://piggybank.jamietsao.com/). Hosted Google
sign-in and balance/history passed user review on desktop and target-device
Safari, including screen-fit, refresh, and return-to-app checks. The second
account's phone sign-in, Picker connection, and balance/history passed user review;
its money actions remain unverified live.
After local review, the user confirmed
hosted Safari Add, Spend, Recount, and adding after a recount on the disposable
copy. Production now connects both accounts to their respective originals through
Picker, with balance/history confirmed by the user and writes enabled for regular use.
Local development stays on the disposable copy; Preview remains read-only.

Import `jamietsao/piggybank` as a Next.js project with root `./` and production
branch `main`. Vercel selects a supported Node version using `package.json`'s
engine range; the current range permits Node 24 as well as Node 22. Configure
these environment variables for **Production**:

| Variable | Value/source |
| --- | --- |
| `APP_URL` | `https://piggybank.jamietsao.com` |
| `GOOGLE_CLIENT_ID` | Existing Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Existing Google OAuth client secret |
| `GOOGLE_PICKER_API_KEY` | Existing Picker key with the hosted referrer added |
| `GOOGLE_CLOUD_PROJECT_NUMBER` | Existing numeric Google Cloud project number |
| `FAMILY_MEMBERS` | Complete two-account mapping to the respective originals |
| `SESSION_SECRET` | Separate generated deployment secret of at least 32 characters |

For initial read-only setup, set `ENABLE_SHEET_WRITES=false` and
`DEV_DEMO_MODE=false` for **Production and Preview**. During the approved write
milestone, use the separate Production/Preview write settings described above.
Keep the local `APP_URL` pointed at localhost. Store secrets directly
in Vercel's environment-variable settings, with no `NEXT_PUBLIC_` prefix.
Production credentials are not needed in arbitrary branch preview deployments.
Use Vercel's Secret/Sensitive option for `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`,
and `GOOGLE_PICKER_API_KEY`. Picker's key is sent to the browser at runtime, so
its website/API restrictions still apply. Redeploy after changing environment
variables.

In the same Google OAuth client, add the hosted JavaScript origin
`https://piggybank.jamietsao.com` and redirect URI
`https://piggybank.jamietsao.com/api/auth/callback`. On the Picker API key,
allow `https://piggybank.jamietsao.com/*` alongside `http://localhost:3000/*`
and `https://docs.google.com/*`. Keep sign-in testing on the stable production
domain. Preview/deployment URLs may require Vercel authentication in addition
to the app's Google sign-in.

The basic read/write checkpoint is reviewed locally and on Vercel using the
first account's disposable copy. Both original connections passed user review,
with remaining manual edge cases deferred.

### Custom-domain setup

The app address is `https://piggybank.jamietsao.com`. The subdomain was
added to the Production project, and Network Solutions has the CNAME record
`piggybank` → `933c068932c50340.vercel-dns-017.com.` supplied by Vercel. HTTPS
has been verified with HTTP 200 and a valid certificate. The user added the new
Google OAuth origin and `/api/auth/callback` URI to the existing client, and
saved the new Picker website restriction.

Production APP_URL uses this origin. HTTP checks confirmed the matching Google
callback, PKCE, Secure/HttpOnly OAuth cookie, and unauthenticated ledger rejection.
The old `piggybank-mauve.vercel.app` address redirects with 308 Permanent, preserving path
and query, using Vercel's domain settings. The app uses one configured origin
for OAuth and write requests.

The user confirmed new-domain sign-in and balance/history for both accounts.
Sessions belong to their hostname, so previous-address logins do not carry over.
The permanent redirect was verified for both the homepage and a path with query
parameters. Custom-domain setup passed user review.

Keep local APP_URL on localhost, both account connections intact, and Preview
read-only. Google OAuth is now published to Production, as confirmed by the user;
fresh authorizations for both accounts passed user review.

### Google Branding and publishing

The user completed the required Branding fields, published OAuth to external
Production, and confirmed fresh sign-out/sign-in and correct balance/history
for both accounts. Google's Testing-mode seven-day limit does not apply to
new authorizations issued in Production; sessions and permissions can still
expire or be revoked. The app's two-account allowlist still controls access.
Public registration remains unimplemented. Google brand/scope verification is
separate from OAuth audience publishing.

Google requires app name, support email, homepage, and privacy-policy URL for
this project's external Production setup. The public `/privacy` page and
homepage/footer links passed user review. Type checking, the build,
63 unit/integration tests, 24 existing browser tests, and public-page/link/layout
checks on phone, desktop, and WebKit passed locally. The page is merged and
deployed; public HTTPS checks confirmed HTTP 200, the correct contact, no login
cookies, and the homepage link/description.

Configure Google Auth Platform → Branding:

- App name: `Piggybank`.
- User support email: select an available Google account/group email you monitor;
  use `piggybank@jamietsao.com` if it is offered in the dropdown.
- Homepage: `https://piggybank.jamietsao.com/`.
- Privacy policy: `https://piggybank.jamietsao.com/privacy`.
- Authorized domain: `jamietsao.com`; Google may ask for domain ownership verification.

Save, then return to Audience and review Google's prompts for publishing.
Only record Production status after Google confirms it. Sign out/in with each
account afterward to obtain fresh authorizations, and verify balance/history.
The app's family allowlist still controls ledger access. The user reviewed the
policy wording and selected `piggybank@jamietsao.com` as its contact. Public
registration remains unimplemented.

References: [Google Branding requirements](https://support.google.com/cloud/answer/15549049?hl=en),
[Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy).

The authentication model and future onboarding extension are documented in
[SPEC.md](SPEC.md#architecture-and-account-connections).
