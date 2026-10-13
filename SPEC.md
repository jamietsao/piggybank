# Piggybank specification

This is the maintained product and architecture specification. It describes
the current implementation, the reasons for important decisions, and explicitly
deferred work. Update it in the same commit as relevant behavior, data-model, or
architecture changes. Use [README.md](README.md) for setup and operation, and
[AGENTS.md](AGENTS.md) for agent working agreements. Git records prior decisions;
this file is not a chronological work log.

## Purpose and audience

Make recording physical cash changes easier for two daughters who already use
Google Sheets to track their piggybanks. The primary devices are iPhone and iPad
using Safari. Their individual, Family Link-supervised Google accounts own their
respective spreadsheets.

The existing spreadsheets remain the source of financial data. Entries made in
the app and in Sheets must share the same balance semantics. There is no SQL
database, separate registration system, or copied financial ledger.

## Current scope and verification status

Implemented: responsive balance/history screens, Google OAuth, file-specific
spreadsheet authorization, account isolation, Add money, Spend money, Recount
cash, confirmations, error handling, and automated tests. A local preview uses
clearly marked fictional data.

As of 2026-10-12, type checking, the production build, 63 unit/integration tests,
and 24 browser checks have passed. Browser checks cover phone and tablet sizes
in Chromium and a phone configuration in WebKit with mocked APIs. These are
not proof of real Google authorization or execution of formulas in Google Sheets.

Local Google credentials are configured. Live Google sign-in has succeeded for
one configured account in desktop Chrome, and the live Picker dialog renders
after the referrer-policy fix. The configured Notes-layout test copy loads
218 populated rows and a $187.00 balance in read-only mode, with the balance and
transaction history confirmed by the user. The read-only Vercel deployment at
`https://piggybank-mauve.vercel.app` has also passed user review of hosted Google
sign-in and balance/history. The user confirmed the requested Safari sign-in,
read-only display, screen-fit, refresh, and return-to-app checks on a target
device; the specific device model was not recorded. HTTP checks verified the
Google redirect/callback, PKCE, Secure/HttpOnly OAuth cookie, no-store responses,
and unauthenticated ledger rejection.

The hosted read-only milestone is reviewed for the first configured account.
The user reports that local Add money, Spend money, and Recount cash work on
the disposable copy, and observed the app's working running-balance formula
in Sheets. The user also confirmed that adding after a recount starts from the
recounted balance. After local review, the user also confirmed the requested
hosted Safari Add, Spend, Recount, and subsequent Add sequence, and that direct
spreadsheet edits/deletions appear after automatic refresh. The basic live-write
milestone is reviewed locally and on Vercel for the disposable copy, with writes
enabled for Production testing and disabled for Preview. Remaining write edge
cases, concurrent appends, and writes under the second account remain unverified.
The user
chose to proceed with the tested first account's original sheet without the
remaining manual edge-case checks and supplied its URL. This authorizes that
account's original-sheet connection; it does not establish that deferred tests
passed. The user connected the original through Google Picker on Vercel and
confirmed its balance/history look correct. The original-sheet setup milestone
is reviewed; Production now resolves the first account to the original with
writes enabled, while Preview remains read-only. Compatibility/access was
verified under the daughter's app session; the agent's connected Drive account
could not inspect the original. Synthetic writes were tested on the disposable
copy, not on the original.
Keep local development on the disposable copy and do not add synthetic test
entries to the originals. The user also signed in with the second account on
their phone, configured its mapping alongside the first, connected its original
through Picker, and confirmed the displayed balance/history. Both original-sheet
connections are now reviewed and configured in Production; Preview remains
read-only. The connected Drive account cannot inspect either original, so these
access/layout checks were performed through the daughters' app sessions.
Keep actual outcomes in the README acceptance checklist.

### Deferred features

- Editing and deleting transactions in the app; corrections currently happen
  in Google Sheets.
- Public registration, automatic spreadsheet discovery, and creation for new
  users. See the future-onboarding design below.
- Offline transaction queues, recurring allowances, categories, savings goals,
  notifications, and multi-currency support.

## Product behavior

### Balance and history

- Home shows the current balance, three money actions, and recent history.
- History uses reverse spreadsheet row order, not date order. Backdated entries
  do not move earlier rows or change the ledger's physical ordering.
- Show 20 entries initially, with “Show more” in increments of 20. The server
  currently loads the full ledger; this is client-side presentation, not API
  pagination.
- Preserve historical date text, including date ranges and malformed dates,
  as displayed in Sheets. Do not clean up or migrate historical rows implicitly.
- Load on opening the app and reload after successful saves, clicking Refresh,
  window focus, or a visibility change back to the visible tab. These events
  read the current ledger; there is no periodic polling or Google push listener.
  External edits made while the app stays focused appear on the next refresh.
  An unsuccessful read may show the last loaded balance, labeled accordingly,
  while entry actions are disabled.
- There is no link or button that opens the spreadsheet from the app. The
  one-time Google Picker connection selects a file and returns to the app.

### Recording cash changes

| Action | User input | Spreadsheet effect | Confirmation |
| --- | --- | --- | --- |
| Add money | Positive amount, description, date | Append positive Amount and running Balance formula | No special confirmation |
| Spend money | Positive amount, description, date | Append negative Amount and running Balance formula | Warn and allow confirmation if balance would be negative |
| Recount cash | Nonnegative counted total, date, optional note | Append blank Amount and literal Balance reset | Always confirm the change from the current balance |

All actions default the date to the device's local calendar date. New dates must
be valid `YYYY-MM-DD` dates from 1900-01-01 through 9999-12-31; backdating is
allowed. Money is USD, with up to two decimal places. Individual entry amounts
are limited to $999,999.99. Add/Spend require an amount greater than zero; Recount
accepts zero. Descriptions are trimmed, limited to 500 characters, and required
for Add/Spend. A blank recount note becomes “Recounted cash.”

Use integer cents for application arithmetic and convert to numeric dollars
only at the Sheets boundary. Negative balances are supported, not blocked.
Use decimal-keypad inputs, large touch targets, and a phone layout without
horizontal scrolling.

### Failed saves and stale confirmations

Preserve the form draft after a failed save; closing and reopening the same
action retains it. Disable repeated submissions while a save is in flight.
Do not automatically repeat a write whose result is uncertain. Ask the user to
refresh and check history before acknowledging that the entry was not saved and
retrying. There is no durable server-side idempotency store.

The server reads a fresh balance before every write. A recount or negative-balance
spend requires `confirmed=true` and `expectedBalanceCents` matching that balance.
If confirmation is needed and missing/stale, return HTTP 409 and have the UI
refresh and request confirmation again. A successful append is reported as saved
independently from the subsequent read; a failed refresh must not invite a second
submission of an already-saved entry.

## Spreadsheet schema and balance semantics

One configured spreadsheet file and tab per account. Row 1 must contain these
headers, compared after trimming and lowercasing:

| Column | Header | Existing cells | New app-created cells |
| --- | --- | --- | --- |
| A | Date | Dates or displayed date text | Numeric Sheets date serial, formatted `m/d/yy` |
| B | Amount | Signed numeric dollars, or blank for a balance reset | Positive/negative numeric dollars, or blank for recount |
| C | Balance | Numeric balance or formula with a numeric result | Running formula for Add/Spend, literal numeric dollars for recount |
| D | Description | Displayed text | Literal string, including text starting with `=` |

The app and API use `description` for the entry's note; it maps to column D.
Notes is also accepted as column D's header, with the same trimming and
case-insensitive comparison, so existing copies work before their header is
renamed. The earlier Date/Description/Amount/Balance layout is not
accepted. Reorder entire columns on a disposable copy and verify formulas before
connecting a sheet in the current layout; do not merely relabel its headers.

An opening row must establish a numeric balance. The current balance is the
effective numeric value in column C of the **last populated row in A–D**.
It is not the sum of Amount: historical recounts deliberately reset the balance.
Formatting-only rows are ignored. A missing or formula-error balance in the
latest populated row blocks writes; do not silently fall back to an older balance.

Append a complete row in one `spreadsheets.batchUpdate` / `appendCells` request.
Google selects the appended row on the server. Ordinary app entries use:

```text
=INDEX(C:C,ROW()-1)+INDEX(B:B,ROW())
```

This refers to the immediately preceding balance and the new row's own amount
without precomputing a row number. Recounts append a blank B cell and explicit
C value, matching the existing ledger's reset convention. Prior rows, formulas,
and resets are preserved. Date serial calculation uses UTC for the submitted
calendar date, so storage does not shift it across time zones.

### Compatibility and limitations

- Keep the tab dedicated to ledger entries. `appendCells` appends after the last
  row with data anywhere in the tab; unrelated data below the ledger or in other
  columns could move the append point. Put summaries on another tab.
- When adding ordinary rows directly in Sheets, maintain the Balance formula.
  The app does not repair spreadsheet formulas or propagate them into manually
  added rows.
- Changes before a literal recount reset do not affect balances after that reset.
  Deleting a row directly in Sheets can break existing formula references.
- Sheets reads and appends are separate operations, without a compare-and-swap
  transaction. Concurrent ordinary appends use distinct rows and relative
  formulas; a concurrent edit after the confirmation read can still change the
  balance used by a save. Exact confirmation amounts are not guaranteed during
  simultaneous recounts, confirmations, or structural spreadsheet edits.
- Ledger entry `row` is the current row number for display/keying, not a stable
  transaction ID. Future editing/deletion needs an explicit row-identity and
  concurrency design.
- The earlier sanitized reference fixture contains 96 amounts/balances and ends
  at $270.00, including a historical $420 balance reset. Tests place its values
  in the current column order, matching a sheet whose columns have been moved.
- The Notes-layout fixture preserves a leading blank row and 218 populated rows,
  ending at $187.00. Both fixtures omit personal notes, names, and dates.

## Architecture and account connections

### Technology and module boundaries

- Next.js App Router and React provide the web interface and server routes in
  one project. TypeScript describes ledger and request contracts. Deployment
  targets Vercel; supported Node versions are in `package.json`.
- `src/components/` contains the dashboard, entry dialog, and Picker boundary.
- `src/app/api/` handles authentication, ledger reads, connection checks, and
  appends. Google file targets are resolved server-side.
- `src/lib/config.ts` separates account admission from connection resolution.
  `src/lib/sheets.ts` is the Google Sheets adapter; pure ledger, money, and
  transaction logic live alongside it.
- There is no persistent application database. Account configuration lives in
  server environment variables, financial data in Sheets, and encrypted login
  state in browser cookies. The development preview alone uses process memory.

### Authentication and authorization

Use Google OAuth authorization-code flow with state, nonce, and PKCE. Verify
Google ID-token identity before checking the allowlist. Identity keys are verified
Google subject IDs (`sub`), not email addresses or display names.

Request `openid`, `email`, `profile`, and `drive.file`. Each daughter selects her
configured existing file through Google Picker to grant file-specific access.
Picking a file grants access; it does not persist or alter the configured mapping.
The server validates that the selected file is the configured file and reads it
back. It resolves the tab by numeric sheet ID, so renaming the tab is supported.

`FAMILY_MEMBERS` is a server-only JSON array of these records:

```ts
type SheetConnection = {
  googleSub: string;
  displayName: string;
  spreadsheetId: string; // Google Drive file ID
  sheetId: number;       // Numeric tab ID, shown as gid in the Sheets URL
};
```

`isAllowedAccount` controls admission separately from `resolveSheetConnection`.
Each subject must have one configured connection. Every file read/write uses
the authenticated subject's connection, not a client-provided target. During
setup, an unconfigured but verified account can see its own subject ID to let a
parent finish configuration; it cannot access the ledger.

Sessions use `iron-session` encrypted cookies: HttpOnly, SameSite=Lax, Secure on
HTTPS. User sessions last up to 30 days; OAuth attempts expire after 10 minutes.
Refresh expiring access tokens on the server, and request reconnection when
access is revoked. Tokens are not stored in a database. Google Picker requires
a short-lived access token in browser JavaScript; refresh tokens and the OAuth
client secret stay out of client JavaScript.

Authenticated JSON responses are private/no-store. Mutations require an Origin
matching `APP_URL`. Do not log tokens or financial descriptions. Required
environment variables and setup details are maintained in `.env.example` and
the README, not duplicated here.

Use `Referrer-Policy: strict-origin-when-cross-origin` so Google's
website-restricted Picker key receives the app's origin on cross-origin
requests without receiving URL paths or query strings. A `same-origin` policy
suppresses that referrer and can prevent Picker from loading.

### HTTP contracts

| Endpoint | Purpose | Success result |
| --- | --- | --- |
| `GET /api/auth/login` | Start Google authorization | Redirect to Google |
| `GET /api/auth/callback` | Verify authorization and establish login | Redirect to home |
| `POST /api/auth/logout` | Clear session | Redirect to home |
| `GET /api/ledger` | Read the account's ledger | `Ledger` |
| `POST /api/transactions` | Validate and append a money entry | `{ saved: true }` |
| `GET /api/connection` | Obtain short-lived Picker credentials | `{ pickerToken, apiKey, appId }` |
| `POST /api/connection` | Verify the selected configured file | `{ connected: true }` |

Transaction JSON matches the shared type in `src/lib/types.ts`:

```ts
type TransactionInput = {
  action: "add" | "spend" | "recount";
  amount: string; // Positive unsigned decimal text; recount may be zero
  description: string;
  date: string; // YYYY-MM-DD
  confirmed?: boolean;
  expectedBalanceCents?: number;
};
```

`Ledger` contains `balanceCents: number | null`, reverse-row-ordered `entries`,
`canWrite`, and `problem: string | null`. Each entry has `row`, displayed `date`,
`description`, nullable `amountCents`/`balanceCents`, and `kind`. A blank/non-numeric
amount is displayed as a recount; supported balance resets should use blank Amount.

JSON failures contain `{ error, code, uncertain? }`. Important outcomes include
401 for missing/revoked login, 403 for origin/access/read-only failures, 409 for
required confirmation, 422 for incompatible sheets or invalid balances, and
503 for Google outages or uncertain writes. Raw Google errors are not exposed.

### Live-write and preview controls

`ENABLE_SHEET_WRITES=false` is the default and is enforced by both server and UI.
Enable it only during the agreed write-testing milestone against disposable
copies, then against originals after live acceptance. If Family Link blocks
authorization, pause to resolve access; do not switch to parent-managed identity
without a separate product decision.

`DEV_DEMO_MODE=true` provides a labeled local preview only when
`NODE_ENV=development`. Production ignores this flag and requires normal login.
Demo appends modify fictional in-memory data, never Google Sheets.

## Verification approach

Unit/integration tests cover cent arithmetic, input validation, reference-ledger
compatibility, resets, malformed balances, OAuth identity checks, token refresh,
account isolation, request origins, file selection, append requests, and uncertain
saves. Browser tests cover the responsive money workflows with fictional data
and mocked API responses. CI runs type checks, unit/integration tests, the build,
and browser tests.

Real Google authorization, formula evaluation, concurrent writes, and real-device
Safari are manual live checks. Record their outcomes honestly; automated mocks
do not satisfy the authorization gate. Use disposable copies until reviewed.
Commands and the live checklist live in [README.md](README.md).

## Future public onboarding design — not implemented

Preserve the Sheets adapter and account-connection interface. Public onboarding
can remove the family allowlist and replace the environment-based resolver with
Drive discovery using private file `appProperties`. Mark connected/created files
with the app identifier, verified account subject, schema version, and tab ID.

After sign-in, discover an app-marked file. If none exists, offer to connect an
existing compatible ledger or create a new one. If multiple files match, ask the
user to choose rather than guessing. New files can be named “Piggybank”; names
are a convenience, not identity. Existing family files can receive metadata
during migration without rewriting their ledger rows.

This is the intended extension point, not a committed full onboarding schema.
Design creation recovery, account/file lifecycle, and stable transaction identity
when those features become an agreed milestone.
