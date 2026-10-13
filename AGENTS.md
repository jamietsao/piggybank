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
- The current baseline includes all v1 code. Both accounts are connected to
  their respective originals on Vercel; the user confirmed Picker access and
  balance/history, including second-account sign-in on their phone. Basic Add,
  Spend, Recount, adding after a recount, and external-edit refresh passed user
  review on a disposable copy locally and on hosted Safari. Production writes
  are enabled; Preview remains read-only. Second-account writes and remaining
  manual edge cases/concurrency checks are unverified. The user chose to defer
  extra manual checks and proceed with the originals; do not mark them passed.
  This original-sheet setup milestone is reviewed. Agree on further work before
  starting it. Use the README checklist; mocked tests or preview access cannot
  establish completion of live checks.
- Keep local development and synthetic test entries on disposable copies.
  Validate changes locally before deploying them to Vercel. The user prefers
  step-by-step guidance for dashboard setup; let them perform dashboard actions
  unless they request browser automation.

## Implementation and verification

- Preserve the existing spreadsheet structure and historical entries. The latest
  row's Balance is authoritative; do not replace it with a sum of Amount.
- Keep account admission, sheet-connection lookup, and ledger operations separate.
  Never use a client-provided file ID as the target for a transaction.
- Use integer cents for money calculations and literal string cells for notes.
  An uncertain write must not be automatically retried.
- Use disposable copies for live testing. Keep real Sheet writes disabled until
  the agreed write-testing milestone; follow the README release checklist before
  connecting originals, honoring the user's recorded decision to defer remaining
  manual edge cases for original-sheet setup. Never commit credentials or log
  tokens/financial notes.
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
