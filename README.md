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
target device. Second-account testing is deferred until its sign-in is
available. Live money changes remain disabled.

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
- [ ] **History details and external edits:** check older entries, date ranges,
  and recount markers. Change an entry directly in the disposable sheet and
  confirm Refresh and returning to the app pick up the change.
- [ ] **Second account:** repeat Google sign-in and read-only checks when its
  sign-in is available; currently deferred.
- [ ] **Add/Spend on the disposable sheet:** set `ENABLE_SHEET_WRITES=true`,
  restart, and test deposits, cents, backdated spending, a description beginning
  with `=`, and confirmed overspending.
- [ ] **Recount:** test a zero balance and another corrected balance, then add
  a transaction. Confirm formulas remain correct after earlier Sheet edits.
- [ ] **Concurrent sessions:** append two ordinary entries from two sessions
  and verify both rows and their cumulative balance. The row formula is chosen
  relative to the actual appended row, not a client-calculated row number.
- [ ] **Release:** use each original sheet's actual ID/tab ID and confirm its
  layout. Make writes available only after checks on the disposable copies pass.

`ENABLE_SHEET_WRITES=false` is the default. Read-only mode is displayed in the
app and enforced on the server. Original Sheets were not modified during
development. Setting the flag acknowledges completion of the manual gate.

Avoid simultaneous recounts, spending confirmations, or structural Sheet edits
when checking exact confirmation amounts. The read/append concurrency limitation
is documented in [SPEC.md](SPEC.md#compatibility-and-limitations).

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

The read-only test deployment is at
[piggybank-mauve.vercel.app](https://piggybank-mauve.vercel.app/). Hosted Google
sign-in and balance/history passed user review on desktop and target-device
Safari, including screen-fit, refresh, and return-to-app checks. The second
account's testing is deferred for now. Live money changes remain disabled.

Import `jamietsao/piggybank` as a Next.js project with root `./` and production
branch `main`. Vercel selects a supported Node version using `package.json`'s
engine range; the current range permits Node 24 as well as Node 22. Configure
these environment variables for **Production**:

| Variable | Value/source |
| --- | --- |
| `APP_URL` | `https://piggybank-mauve.vercel.app` |
| `GOOGLE_CLIENT_ID` | Existing Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Existing Google OAuth client secret |
| `GOOGLE_PICKER_API_KEY` | Existing Picker key with the hosted referrer added |
| `GOOGLE_CLOUD_PROJECT_NUMBER` | Existing numeric Google Cloud project number |
| `FAMILY_MEMBERS` | Existing account-to-disposable-copy configuration |
| `SESSION_SECRET` | Separate generated deployment secret of at least 32 characters |

Set `ENABLE_SHEET_WRITES=false` and `DEV_DEMO_MODE=false` for **Production and
Preview**. Keep the local `APP_URL` pointed at localhost. Store secrets directly
in Vercel's environment-variable settings, with no `NEXT_PUBLIC_` prefix.
Production credentials are not needed in arbitrary branch preview deployments.
Use Vercel's Secret/Sensitive option for `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`,
and `GOOGLE_PICKER_API_KEY`. Picker's key is sent to the browser at runtime, so
its website/API restrictions still apply. Redeploy after changing environment
variables.

In the same Google OAuth client, add the hosted JavaScript origin
`https://piggybank-mauve.vercel.app` and redirect URI
`https://piggybank-mauve.vercel.app/api/auth/callback`. On the Picker API key,
allow `https://piggybank-mauve.vercel.app/*` alongside `http://localhost:3000/*`
and `https://docs.google.com/*`. Keep sign-in testing on the stable production
domain. Preview/deployment URLs may require Vercel authentication in addition
to the app's Google sign-in.

The first account's hosted read-only checkpoint is reviewed. Follow the live
acceptance checklist and agree on the next milestone before enabling write
testing on disposable copies.

The authentication model and future onboarding extension are documented in
[SPEC.md](SPEC.md#architecture-and-account-connections).
