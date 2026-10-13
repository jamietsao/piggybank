# Working on Piggybank

## Project context

- Use [SPEC.md](SPEC.md) for product behavior, architecture, spreadsheet schema,
  account boundaries, and future-design context when the task affects those areas.
- Use [README.md](README.md) for local setup, Google configuration, test commands,
  deployment, and the live acceptance checklist.
- Keep current behavior distinct from deferred ideas. Update the relevant docs
  in the same commit as behavior, data-model, or architecture changes; use Git
  for history instead of growing a conversational work log.

## Working agreements

- Use `jamietsao@gmail.com` as the Git author and committer email for this repo.
  Configure it locally (`git config --local user.email jamietsao@gmail.com`),
  leaving global Git settings unchanged. Verify the effective identity before
  committing; do not use the user's work email.
- For commits with Codex contributions, append this Git trailer after a blank
  line in the commit message: `Co-authored-by: Codex <noreply@openai.com>`.
  This is the repo's attribution convention; keep Jamie Tsao as the primary
  author and committer. Do not add it to commits without Codex contributions
  or rewrite previously published commits solely to add attribution.
- Always use branch-based development. Check the current branch and working tree
  before starting a milestone; create an appropriately named feature/fix/docs
  branch from `main` for new work. Preserve existing uncommitted work when
  switching branches. Do not implement or commit changes directly on `main`.
- Deliver reviewed milestones through pull requests targeting `main`. Push the
  working branch and open a PR when authorized; use a draft PR while validation
  or user review is pending. Do not merge a PR without the user's approval.
- Agree on the next milestone with the user. Implement and test that milestone,
  report the result, and stop for user review before moving to the next one.
  Do not continue through later milestones just because the code is available.
- Commit once the user approves the milestone or explicitly authorizes its
  commit. Existing authorization remains valid; do not request it again merely
  because these instructions mention review. Pushes and deployments are separate
  steps from a local checkpoint commit.
- The current baseline includes all v1 code. One configured account has passed
  live Google sign-in, Picker selection, and read-only access to a disposable
  Notes-layout copy in desktop Chrome; the user confirmed balance and history.
  The user also confirmed hosted Google sign-in, balance/history, and the
  requested Safari screen-fit, refresh, and return-to-app checks on a target
  device. The read-only Vercel milestone is reviewed. Second-account testing
  is deferred until its sign-in is available. The user reports that local Add,
  Spend, and Recount work on the disposable copy and observed the working
  running-balance formula in Sheets, including a subsequent Add after a
  recount. The user also confirmed the requested hosted Safari write sequence
  and automatic refresh after direct sheet edits/deletions. The basic Add,
  Spend, and Recount milestone is reviewed locally and on Vercel, using the
  disposable copy. Remaining write edge cases and concurrent appends are
  unverified; originals are not approved for release. Record this milestone in
  one PR and agree on further work before starting it. Validate changes locally
  before deploying them to Vercel. The user prefers
  step-by-step guidance for dashboard setup; let them perform the dashboard
  actions unless they request browser automation. Use the README checklist;
  mocked tests or preview access cannot establish completion of live checks.

## Implementation and verification

- Preserve the existing spreadsheet structure and historical entries. The latest
  row's Balance is authoritative; do not replace it with a sum of Amount.
- Keep account admission, sheet-connection lookup, and ledger operations separate.
  Never use a client-provided file ID as the target for a transaction.
- Use integer cents for money calculations and literal string cells for notes.
  An uncertain write must not be automatically retried.
- Use disposable copies for live testing. Keep real Sheet writes disabled until
  the agreed write-testing milestone; follow the README release checklist before
  connecting originals. Never commit credentials or log tokens/financial notes.
- Run checks appropriate to the change. `npm run check` runs type checking, the
  unit/integration suite, and a production build; `npm run test:e2e` exercises
  phone/tablet and WebKit flows. These tests use fixtures and have no production
  access. Stop a server on port 3000 before browser tests.
- Documentation-only changes need link/content checks, not a repeat of the full
  app suite. Do not rerun passing tests without a relevant change or concern.
- Preserve the Next.js-generated instruction block below. Consult the relevant
  bundled Next.js guide for code changes, as that block requires.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
