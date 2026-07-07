# AI_HANDOFF

## 0. Current Loop Phase

- Current owner: Codex
- Next owner: Claude Code
- Loop: 10
- Loop number inferred from: Previous handoff recorded Loop 9 as Claude Code -> Codex after PR #2 was merged to `main`; Loop 10 is the current Codex improvement branch from `origin/main`.
- Phase: Handoff
- Last updated: 2026-07-08 07:41:38 +09:00

## 1. Current Goal

Current goal:

- Continue the autonomous CRM hardening loop until both top-level scores can be proven as 100/100.
- This turn hardened the Supabase admin client configuration path so blank server settings and accidentally supplied publishable/anon keys fail closed instead of creating a pseudo-admin client.

Current score:

- Function/screen-transition defect-free score: 99 / 100
- Daily CRM experience value score: 99 / 100

Not yet 100 because a safe non-production Supabase authenticated live CRUD/RLS acceptance pass is still missing, and PR #3 still needs human/Claude review before merge.

## 2. Current Branch / Commit / PR

- Branch: `codex/loop10-crm-ux-hardening`
- Base: `main` after PR #2 merge (`42d0b81`, `Merge pull request #2 from kotakase2022-jpg/codex/ai-handoff-loop`)
- Latest code commit: `2a73888` (`Harden Supabase admin client configuration`)
- Latest branch commit: this handoff commit; run `git log --oneline -1` for the exact hash after commit.
- Last known good local commit: `2a73888`
- PR: https://github.com/kotakase2022-jpg/crm/pull/3
- PR #2: merged by the user before this loop continuation.
- CodeRabbit OSS review status: green on PR #3 at remote head `2fc066a`; re-check after pushing `2a73888` and this handoff.
- GitHub Actions `quality-gate`: green on PR #3 at remote head `2fc066a`; local `npm.cmd run quality` passes after `2a73888`.
- Vercel preview: green on PR #3 at remote head `2fc066a`; re-check after pushing this handoff.

## 3. What Was Done

Completed this turn:

- Re-read `AGENTS.md`, `CLAUDE.md`, `AI_HANDOFF.md`, `README.md`, `package.json`, and `docs/testing.md`.
- Re-checked PR #3 latest remote head `2fc066a`: CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate` all passed.
- Confirmed PR #3 remains open, non-draft, mergeable, and blocked only by `REVIEW_REQUIRED`.
- Hardened `src/lib/supabase/admin.ts` so `createAdminClient()` trims server-only settings and returns `null` when the Supabase URL is blank, `SUPABASE_SERVICE_ROLE_KEY` is blank, or the key is a known non-admin `sb_publishable_...` / `sb_anon_...` key.
- Added `tests/unit/supabase-admin.test.ts` proving the admin client is not created for missing URL, blank service-role key, or accidentally supplied publishable/anon keys, and that successful creation uses trimmed values with non-persistent auth settings.
- Re-ran focused Supabase admin coverage, `npm.cmd run typecheck`, the full local `npm.cmd run quality` gate, and the fail-closed missing-env Supabase acceptance path.

Previous Loop 10 continuation:

- Re-read `AGENTS.md`, `CLAUDE.md`, `AI_HANDOFF.md`, `README.md`, `package.json`, and `docs/testing.md`.
- Re-checked PR #3 latest remote head `5981bc2`: CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate` all passed.
- Confirmed PR #3 remains open, non-draft, mergeable, and blocked only by `REVIEW_REQUIRED`.
- Added `tests/unit/lead-import-cron-route.test.ts` with route-level coverage for unauthorized cron requests, wrong bearer tokens, successful aggregation, partial import failure status, and thrown import errors.
- Re-ran focused cron route coverage, `npm.cmd run typecheck`, the full local `npm.cmd run quality` gate, and the fail-closed missing-env Supabase acceptance path.

Earlier Loop 10 continuation also completed:

- Added unit coverage proving the E2E persistent demo store retries a transient Windows `EPERM` rename failure and persists the intended row.
- Added unit coverage proving persistent Windows `EPERM` rename failures are not hidden: the operation throws after 5 attempts and removes the temp file.
- Re-ran focused demo-data coverage, `git diff --check`, the full local `npm.cmd run quality` gate, and the fail-closed missing-env Supabase acceptance path.
- Added unit coverage proving direct `signUpAction` auth failures also sanitize external `next` values before returning to `/login`.
- Ran `npm.cmd run quality`; it failed in the automation-task E2E with an actual `EPERM` from `renameSync()` in the E2E-only persistent demo store writer.
- Fixed `src/lib/crm/demo-data.ts` so persistent demo store writes use unique temp file names and retry transient Windows `EACCES` / `EPERM` rename races before failing.
- Re-ran focused demo-data/actions unit coverage, the previously failing automation E2E, `git diff --check`, the full local `npm.cmd run quality` gate, and the fail-closed missing-env Supabase acceptance path.
- Strengthened the `tests/unit/actions.test.ts` navigation mock so it mirrors the real safe internal redirect behavior instead of passing any string through.
- Added unit coverage proving direct `signInAction` posts sanitize external `next` values on both success and auth failure.
- Added unit coverage proving direct `signUpAction` posts sanitize external `next` values before the confirmation notice redirect.
- Pushed `cffedd4` and handoff `e2ca7a8`; PR #3 checks were all green at `e2ca7a8`.
- Added unit coverage proving Supabase list reads continue from `range(0, 999)` to `range(1000, 1999)` and include records from the final short page.
- Pushed `18e2139` and handoff `aa94b62`; PR #3 checks were all green at `aa94b62`.

Important earlier Loop 10 context:

- Added Playwright E2E coverage proving the support ticket related-task workflow:
  - creates a company;
  - creates a contact with that company prefilled;
  - creates a ticket with both company and contact prefilled;
  - opens the ticket detail related-task create action;
  - verifies `/tasks/new` receives `support_ticket_id`, `company_id`, and `contact_id`;
  - verifies the task form has those three selects prefilled;
  - saves the task;
  - verifies task detail links back to the ticket, company, and contact;
  - verifies the ticket detail related task table links back to the created task.
- Fixed an initial test timing issue by waiting for the Next.js client navigation URL before reading `page.url()`.
- Re-ran the focused ticket-task E2E, `git diff --check`, the full local `npm.cmd run quality` gate, and the fail-closed missing-env Supabase acceptance path.
- Pushed `0ca2984` and handoff `96290bb`; CodeRabbit and Vercel passed, but GitHub Actions `quality-gate` failed in E2E.
- Downloaded the failed Playwright screenshots and confirmed the failing pages were Next.js 404 screens for edit routes after records had been created earlier in the suite.
- Identified that `globalThis.__crmDemoStore` was still not enough in CI because Next dev can evaluate route workers/processes that do not share the same in-memory global.
- Added an E2E-only persistent demo store file:
  - `playwright.config.ts` creates/removes a per-run `.tmp/playwright-demo-store-<port>.json` and passes it as `CRM_DEMO_STORE_FILE`.
  - `src/lib/crm/demo-data.ts` uses that file only when `E2E_TEST_MODE=demo` and `CRM_DEMO_STORE_FILE` are set.
  - Demo reads sync from the file; demo creates/updates write back atomically through a temp file and rename.
  - Normal demo/Supabase runtime behavior remains unchanged when the E2E env var is absent.
- Changed `getDemoCounts()` to use `getDemoRows()` so counts also see the latest synchronized demo store.
- Re-ran the CI-failing focused E2E group and the full local `npm.cmd run quality` gate after the CI-store fix.

Important earlier PR #3 context:

- Strengthened lead conversion E2E so the converted deal has concrete links to the created company, contact, and original lead.
- Verified the created company detail page links back to the converted deal, and the created contact detail page links back to the company.
- Strengthened the dashboard risky-company E2E so CS users can click a risk signal, reach company detail, and start a prefilled related task.
- Fixed demo-mode route-bundle consistency by storing the CRM demo data store on `globalThis.__crmDemoStore`.
- Added unit coverage that asserts the demo store is shared through `globalThis`.
- Added `npm run acceptance:supabase`, an explicit non-production Supabase live acceptance harness for authenticated profile bootstrap, lead create/read/update/soft-delete, anonymous isolation, optional cross-organization isolation, service-role-key rejection, cleanup safety, and inserted/read-back value assertions.
- Hardened lead import setting/status update persistence so zero-row Supabase updates fail visibly instead of returning success.
- Improved spreadsheet import result toasts.
- Fixed the login auth feedback E2E locator collision with Next.js' internal route announcer.
- Preserved related-create context through validation errors.
- Preserved explicit `deleted_at` during Supabase update payload shaping.

## 4. Files Changed

Main files changed this turn:

- `src/lib/supabase/admin.ts`
- `tests/unit/supabase-admin.test.ts`
- `AI_HANDOFF.md`

Important earlier PR #3 files:

- `package.json`
- `.env.example`
- `docs/testing.md`
- `scripts/supabase-live-acceptance.mjs`
- `tests/unit/package-scripts.test.ts`
- `src/components/crm/toast-notice.tsx`
- `src/lib/crm/lead-imports.ts`
- `src/lib/crm/actions.ts`
- `src/app/login/page.tsx`
- `src/lib/crm/data.ts`
- `src/lib/crm/persistence.ts`
- `src/lib/crm/demo-data.ts`
- `tests/unit/lead-imports.test.ts`
- `tests/unit/actions.test.ts`
- `tests/unit/data-supabase.test.ts`
- `tests/unit/persistence.test.ts`
- `tests/unit/demo-data.test.ts`
- `tests/unit/lead-import-cron-route.test.ts`
- `tests/unit/supabase-admin.test.ts`

## 5. Current Status

- Local code quality is green after `2a73888`.
- Working tree should be clean after this handoff update is committed.
- PR #3 is open and mergeable, but review is still required.
- PR #3 remote head `2fc066a` has CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate` green. Push `2a73888` and this handoff, then re-check.
- No production DB, production API, migration, RLS, or Vercel setting changes were made.
- No secrets were read or printed.
- Cursor Bugbot was not used; CodeRabbit OSS remains the standard review path.

## 6. Known Issues

- No current Critical/High code issue is known after the latest local quality gate.
- `2a73888` changes the Supabase admin-client configuration path to fail closed for blank settings or accidentally supplied publishable/anon keys, with direct unit coverage.
- `bfe96f5` is test-only and covers the cron API route's auth and error response behavior; no runtime code changed.
- The previous `npm.cmd run quality` attempt failed because Windows rejected an E2E persistent demo store `renameSync()` with `EPERM`; this was fixed by `aa9e7c6`, and `a0b0676` now adds unit coverage for both retry-success and persistent-failure paths.
- PR #3 run `28898352028` failed before `cb497a8`; the failure was an E2E demo-store sharing issue that rendered edit routes as 404 in CI. It was fixed by `cb497a8`, and PR #3 was green at `a14942f`.
- Live authenticated Supabase/Vercel CRUD/RLS acceptance is still incomplete because this shell does not have safe non-production Supabase runtime/test credentials. `npm.cmd run acceptance:supabase` exists and fails loudly until those credentials are supplied.
- Local Supabase startup is not currently available because the installed Supabase CLI binary is blocked by Windows Application Control policy, even though Docker is installed.
- PR #3 still needs human/Claude review because GitHub reports `REVIEW_REQUIRED`.
- `codex/persistent-quality-gate-ops` still exists as an older stale branch. Do not delete it without explicit human confirmation.
- Some Japanese text may look garbled in PowerShell output because of terminal encoding; inspect files in a UTF-8-aware editor if needed.

## 7. CodeRabbit Review

CodeRabbit OSS findings and response:

- Review status: Passed on PR #3 at remote head `2fc066a`; re-check after pushing `2a73888` and this handoff commit.
- Critical findings: none known.
- Resolved findings: none; CodeRabbit previously produced no actionable comments.
- Deferred findings: none.
- False positives / not applicable: none.
- Review threads: no known unresolved threads at the previous checked PR head; re-check after push if needed.

## 8. Optional Bugbot Findings

Cursor Bugbot optional backup:

- Status: Not run.
- Findings: none.
- Actions taken: none.
- Reason: The current change is narrow, route-test-only, covered by focused unit tests and the full quality gate, and CodeRabbit OSS is the standard review path for this public repository.

## 9. Verification Results

Current turn commands:

```bash
gh pr view 3 --repo kotakase2022-jpg/crm --json number,title,state,isDraft,mergeStateStatus,mergeable,reviewDecision,headRefName,baseRefName,url,headRefOid,statusCheckRollup
# Passed.
# PR #3 open, non-draft, mergeable, mergeStateStatus BLOCKED, reviewDecision REVIEW_REQUIRED, remote head 2fc066a.
# CodeRabbit, Vercel, Vercel Preview Comments, and quality-gate were all green at 2fc066a.

npm.cmd run test -- --run tests/unit/supabase-admin.test.ts
# First run failed because the test imported `src/lib/supabase/admin.ts`, which has a `server-only` side-effect import.
# The test was corrected to mock `server-only`, matching existing server-side unit tests.
# Re-run passed. 1 file / 4 tests.

npm.cmd run typecheck
# Passed after 2a73888.

npm.cmd run quality
# Passed after 2a73888.
# typecheck: passed
# lint: passed
# test: passed (30 files / 198 tests)
# coverage: passed
#   statements 93.69%
#   branches 86.54%
#   functions 99.54%
#   lines 95.94%
# test:e2e: passed (45 Chromium tests)
# build: passed (Next.js 16.2.10 production build)

npm.cmd run acceptance:supabase
# Failed as expected with missing dedicated ACCEPTANCE_* variables:
# ACCEPTANCE_SUPABASE_URL, ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY, ACCEPTANCE_TEST_EMAIL, ACCEPTANCE_TEST_PASSWORD.
# No stack trace or secret value was printed.
```

Previous turn commands:

```bash
gh pr view 3 --repo kotakase2022-jpg/crm --json number,title,state,isDraft,mergeStateStatus,mergeable,reviewDecision,headRefName,baseRefName,url,headRefOid,statusCheckRollup
# Passed.
# PR #3 open, non-draft, mergeable, mergeStateStatus BLOCKED, reviewDecision REVIEW_REQUIRED, remote head 5981bc2.
# CodeRabbit, Vercel, Vercel Preview Comments, and quality-gate were all green at 5981bc2.

gh pr checks 3 --repo kotakase2022-jpg/crm
# Passed before bfe96f5 and this handoff.
# CodeRabbit: pass
# Vercel: pass
# Vercel Preview Comments: pass
# typecheck-lint-test-e2e-build: pass

npm.cmd run test -- --run tests/unit/lead-import-cron-route.test.ts
# First run passed. 1 file / 5 tests.

npm.cmd run typecheck
# First run failed because the cron route test fixtures used `id` instead of the actual ImportResult fields.
# Test data was corrected to use settingId/status/importedCount/skippedCount/message.
# Re-run passed.

npm.cmd run test -- --run tests/unit/lead-import-cron-route.test.ts
# Passed after type fixture correction. 1 file / 5 tests.

npm.cmd run quality
# Passed after bfe96f5.
# typecheck: passed
# lint: passed
# test: passed (29 files / 194 tests)
# coverage: passed
#   statements 93.69%
#   branches 86.54%
#   functions 99.54%
#   lines 95.94%
# test:e2e: passed (45 Chromium tests)
# build: passed (Next.js 16.2.10 production build)

npm.cmd run acceptance:supabase
# Failed as expected with missing dedicated ACCEPTANCE_* variables:
# ACCEPTANCE_SUPABASE_URL, ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY, ACCEPTANCE_TEST_EMAIL, ACCEPTANCE_TEST_PASSWORD.
# No stack trace or secret value was printed.
```

Selected previous Loop 10 verification retained for context:

```bash
npm.cmd run test -- --run tests/unit/demo-data.test.ts
# First run after adding the persistent-failure test failed because the test expected import-time persistence.
# The implementation writes during sync/read/write operations, so the test was corrected to assert on getDemoRows().
# Re-run passed after a0b0676. 1 file / 7 tests.

npm.cmd run quality
# Passed after a0b0676.
# typecheck: passed
# lint: passed
# test: passed (28 files / 189 tests)
# coverage: passed
# test:e2e: passed (45 Chromium tests)
# build: passed.

npm.cmd run test -- --run tests/unit/actions.test.ts
# Passed after adding direct sign-up auth-failure next-target sanitization coverage.
# 1 file / 21 tests.

npm.cmd run quality
# First run in this pass failed in E2E automation task generation:
# expected /dashboard?toast=automation&count=\d+ but stayed on /dashboard.
# Server log showed EPERM from renameSync() in the E2E persistent demo store writer.

npm.cmd run test -- --run tests/unit/demo-data.test.ts tests/unit/actions.test.ts
# Passed after aa9e7c6. 2 files / 26 tests.

npm.cmd run test:e2e -- -g "automation task generation runs and reports a success state"
# Passed after aa9e7c6. 1 Chromium test.

git diff --check
# Passed.

npm.cmd run quality
# Passed after aa9e7c6.
# typecheck: passed
# lint: passed
# test: passed (28 files / 187 tests)
# coverage: passed
#   statements 93.69%
#   branches 86.54%
#   functions 99.54%
#   lines 95.94%
# test:e2e: passed (45 Chromium tests)
# build: passed (Next.js 16.2.10 production build)

npm.cmd run acceptance:supabase
# Failed as expected with missing dedicated ACCEPTANCE_* variables:
# ACCEPTANCE_SUPABASE_URL, ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY, ACCEPTANCE_TEST_EMAIL, ACCEPTANCE_TEST_PASSWORD.
# No stack trace or secret value was printed.

npm.cmd run test -- --run tests/unit/data-supabase.test.ts
# Passed after 18e2139. 1 file / 4 tests.

npm.cmd run quality
# Passed after 18e2139.
# typecheck: passed
# lint: passed
# test: passed (28 files / 183 tests)
# coverage: passed
# test:e2e: passed (45 Chromium tests)
# build: passed (Next.js 16.2.10 production build)

npm.cmd run test:e2e -- -g "ticket related task creation keeps the support context through save"
# First run failed because the test read page.url() immediately after clicking a Next.js Link.
# The page had already rendered the task form, so the test was corrected to wait with toHaveURL().
# Re-run passed. 1 Chromium test.

git diff --check
# Passed.

npm.cmd run quality
# Passed after 0ca2984.
# typecheck: passed
# lint: passed
# test: passed (28 files / 181 tests)
# coverage: passed
#   statements 93.69%
#   branches 86.54%
#   functions 99.54%
#   lines 95.94%
# test:e2e: passed (45 Chromium tests)
# build: passed (Next.js 16.2.10 production build)

gh pr checks 3 --repo kotakase2022-jpg/crm --watch --interval 10
# Failed at remote head 96290bb.
# CodeRabbit: pass.
# Vercel: pass.
# Vercel Preview Comments: pass.
# typecheck-lint-test-e2e-build: fail.

gh run view 28898352028 --repo kotakase2022-jpg/crm --log-failed
# Passed for log retrieval.
# Failure was in E2E. Screenshots showed edit pages rendering 404.
# Failed tests included record editing, datetime-local edit fields, deal stage editing, and trial usage metrics.

gh run download 28898352028 --repo kotakase2022-jpg/crm --name playwright-test-results --dir .tmp-gh-artifacts
# Passed. Artifact screenshots were inspected and then removed locally.

npm.cmd run test -- --run tests/unit/demo-data.test.ts
# Passed. 1 file / 4 tests.

npm.cmd run test:e2e -- -g "record editing persists updated notes|datetime-local edit fields|deal stage editing persists|trial usage metrics"
# Passed after cb497a8. 4 Chromium tests.

npm.cmd run quality
# Passed after cb497a8.
# typecheck: passed
# lint: passed
# test: passed (28 files / 181 tests)
# coverage: passed
#   statements 93.69%
#   branches 86.54%
#   functions 99.54%
#   lines 95.94%
# test:e2e: passed (45 Chromium tests)
# build: passed (Next.js 16.2.10 production build)

npm.cmd run acceptance:supabase
# Failed as expected with missing dedicated ACCEPTANCE_* variables:
# ACCEPTANCE_SUPABASE_URL, ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY, ACCEPTANCE_TEST_EMAIL, ACCEPTANCE_TEST_PASSWORD.
# No stack trace or secret value was printed.

npm.cmd run test:e2e -- -g "lead creation persists to the detail page and converts into a deal"
# Passed. 1 Chromium test after lead conversion relationship assertions.

npm.cmd run quality
# Passed after de07db3.
# typecheck: passed
# lint: passed
# test: passed (28 files / 181 tests)
# coverage: passed
# test:e2e: passed (44 Chromium tests)
# build: passed.

npm.cmd run test:e2e -- -g "dashboards, reports, and settings expose operational decision signals"
# Passed. 1 Chromium test after dashboard risky-company task prefill assertions.

npm.cmd run test:e2e -- -g "record editing persists updated notes|datetime-local edit fields|deal stage editing persists|trial usage metrics"
# Passed. 4 Chromium tests after demo-store global fix.
```

## 10. Next Recommended Action

Claude Code should start here:

1. Run `git status --short --branch` and `git log --oneline -8`.
2. Confirm `2a73888` and this handoff commit are pushed to PR #3.
3. Run `gh pr checks 3 --repo kotakase2022-jpg/crm`.
4. Confirm the latest `quality-gate`, CodeRabbit, and Vercel checks are green after `2a73888` and this handoff commit.
5. Review `src/lib/supabase/admin.ts` and `tests/unit/supabase-admin.test.ts`; they should prove blank admin config and accidentally supplied publishable/anon keys fail closed while valid server-only settings are trimmed and passed to `createClient()`.
6. Review the new cron route response tests in `tests/unit/lead-import-cron-route.test.ts`; they should prove missing/wrong `CRON_SECRET`, partial import failures, and thrown cron errors are not reported as successful.
7. Review the new retry-success and persistent-failure tests in `tests/unit/demo-data.test.ts`.
8. Review the Windows `EPERM` demo-store retry in `src/lib/crm/demo-data.ts`; it should be limited to the E2E-only persistent demo store path and avoid affecting production Supabase mode.
9. Review the auth redirect sanitization tests in `tests/unit/actions.test.ts`; they should prove direct malicious `next` posts cannot escape the app after sign-in/sign-up success or failure.
10. Review the Supabase pagination regression test in `tests/unit/data-supabase.test.ts`; it should protect `readRows()` from silently dropping records after the first 1000 rows.
11. Review the new support ticket related-task E2E for brittleness and whether it proves the intended CS next-action workflow.
12. Review the strengthened lead conversion E2E flow for brittleness and whether it proves lead -> company/contact/deal relationship navigation.
13. Review the strengthened dashboard risky-company E2E flow for brittleness and whether it proves the intended CS priority workflow.
14. Review `scripts/supabase-live-acceptance.mjs` for production-safety, RLS coverage, and no accidental fallback to demo/mock data.
15. If a safe non-production Supabase URL, publishable key, and disposable test user are available, place them in `.env.acceptance.local` or shell env and run `npm.cmd run acceptance:supabase`.
16. For the strongest RLS evidence, configure `ACCEPTANCE_OTHER_TEST_EMAIL` and `ACCEPTANCE_OTHER_TEST_PASSWORD` with a second disposable user in a different organization before running live acceptance.
17. If live acceptance passes and PR #3 review is complete, update `AI_HANDOFF.md` with the result and reassess the two 99/100 scores.
18. If code changes are made, run at least the focused tests plus `npm.cmd run quality`.

## 11. Suggested Review Scope for Claude Code

Please review:

- Does `createAdminClient()` fail closed for blank settings and known non-admin Supabase keys without changing normal server-side service-role behavior?
- Do `tests/unit/supabase-admin.test.ts` assertions adequately protect against accidentally configuring `SUPABASE_SERVICE_ROLE_KEY` with `sb_publishable_...` or `sb_anon_...` values?
- Does the new ticket-task E2E prove a real CS path from support ticket detail to a next-action task while preserving ticket, company, and contact context?
- Do the new cron route tests prove the Vercel Cron lead-import endpoint rejects unauthenticated calls and reports partial/total failures as errors?
- Do the E2E-only demo store retry tests cover both transient Windows `EPERM` / `EACCES` recovery and persistent write failure cleanup?
- Do the new auth redirect sanitization tests cover direct server-action posts, not only the login page's hidden `next` input?
- Does the new Supabase pagination regression test prove that list/snapshot reads keep fetching after the first 1000 rows and preserve deterministic ordering before each page?
- Do the unit tests in `tests/unit/demo-data.test.ts` adequately prevent regression of the CI route-worker demo-store reload behavior and Windows rename retry behavior?
- Is the E2E-only demo store file sharing in `playwright.config.ts` / `demo-data.ts` safe, deterministic, and limited to `E2E_TEST_MODE=demo`?
- Are the href/select assertions stable enough for this CRM's generated related-create action?
- Does the dashboard risky-company E2E prove a real user path from CS risk signal to company detail to related task creation?
- Does the lead conversion E2E prove a real user path from converted deal to created company, created contact, and original lead, plus company/contact back-links?
- Does `globalThis.__crmDemoStore` correctly solve demo-mode route-bundle consistency without affecting production Supabase mode?
- Is the demo-data unit test enough to prevent accidental regression to module-local demo storage?
- Does `scripts/supabase-live-acceptance.mjs` require dedicated `ACCEPTANCE_*` variables and fail closed when they are missing?
- Does the acceptance script avoid service-role credentials, production defaults, and mock/demo fallback?
- Does the script's create/read/update/soft-delete lead flow prove the remaining authenticated RLS persistence gap well enough when run against staging/local Supabase?
- Do the lead import persistence hardenings still avoid changing CSV parsing, import scheduling, lead creation, duplicate detection, or cron behavior?

## 12. Risk Notes

- The latest runtime change affects demo mode only when the E2E-specific `CRM_DEMO_STORE_FILE` env var is set. It is intended to stabilize CI route-worker sharing and should not affect Supabase mode.
- `2a73888` changes only the Supabase admin-client setup boundary. It rejects known publishable/anon key prefixes, but it does not fully decode and validate every possible legacy JWT role. Live/staging acceptance plus secret review remains important before production use.
- `bfe96f5` is test-only; it did not change cron route runtime behavior.
- The `aa9e7c6` retry uses `Atomics.wait` only in server-side Node code under the E2E persistent demo store path.
- The new E2E runs in demo mode; live Supabase acceptance remains the main unverified external persistence/RLS evidence gap.
- Running `npm.cmd run acceptance:supabase` with real acceptance credentials writes and then soft-deletes one lead in the target Supabase project. Use only local/staging projects with disposable test data.
- Remote Supabase targets require the exact `ACCEPTANCE_NON_PRODUCTION_CONFIRMATION=I_CONFIRM_THIS_IS_NOT_PRODUCTION` guard.
- The current shell cannot complete live acceptance because no acceptance env vars are present and local Supabase CLI execution is blocked by Windows Application Control policy.
- CodeRabbit account/plan metadata should be monitored by the repository owner because cost control is important for this project.

## 13. Do Not Touch

- `.env.local`, `.env.acceptance.local`, Supabase service role keys, Vercel secrets, and production data.
- `main` direct pushes.
- Supabase migrations/RLS/Vercel project settings unless the user explicitly asks.
- Quality gates, coverage thresholds, test guard, or Husky hooks unless the task is specifically about test infrastructure.
- Stale local/remote branches unless the user explicitly authorizes cleanup.

## 14. Notes for Claude Code

- Use `npm.cmd` / `npx.cmd` in Windows PowerShell.
- CodeRabbit OSS is the standard review path; Cursor Bugbot is optional backup only.
- Do not mark the persistent goal complete yet. The current evidence supports 99/100, not 100/100, because live authenticated non-production Supabase acceptance is missing and PR #3 still requires review.
- Keep the next change small and PR-reviewable.
- If PR checks lag after push, inspect the underlying GitHub Actions run with `gh run view <run-id> --json status,conclusion,createdAt,updatedAt,jobs`.
