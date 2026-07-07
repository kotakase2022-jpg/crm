# AI_HANDOFF

## 0. Current Loop Phase

- Current owner: Codex
- Next owner: Claude Code
- Loop: 10
- Loop number inferred from: Previous handoff recorded Loop 9 as Claude Code -> Codex after PR #2 was merged to `main`; Loop 10 is the current Codex improvement branch from `origin/main`.
- Phase: Handoff
- Last updated: 2026-07-08 JST

## 1. Current Goal

Current goal:

- Continue the autonomous CRM hardening loop until both top-level scores can be proven as 100/100.
- This turn strengthened the live non-production Supabase acceptance check so accepted lead creation verifies persisted user-entered lead field values in addition to organization scope and non-deleted state.

Current score:

- Function/screen-transition defect-free score: 99 / 100
- Daily CRM experience value score: 99 / 100

Not yet 100 because a safe non-production Supabase authenticated live CRUD acceptance pass is still missing, and PR #3 still needs human/Claude review before merge.

## 2. Current Branch / Commit / PR

- Branch: `codex/loop10-crm-ux-hardening`
- Base: `main` after PR #2 merge (`42d0b81`, `Merge pull request #2 from kotakase2022-jpg/codex/ai-handoff-loop`)
- Latest code commit: `51e4985` (`Assert accepted lead field values`)
- Latest branch commit: this handoff commit; run `git log --oneline -1` for the exact hash after commit.
- Last known good local commit: `51e4985`
- PR: https://github.com/kotakase2022-jpg/crm/pull/3
- PR #2: merged by the user before this handoff.
- CodeRabbit OSS review status: green on PR #3 at remote head `de61281` before the accepted-lead-field-values guard commit; re-check after pushing this handoff.
- GitHub Actions `quality-gate`: green on PR #3 at remote head `de61281`; local `npm.cmd run quality` passes after `51e4985`.
- Vercel preview: green on PR #3 at remote head `de61281` before the accepted-lead-field-values guard commit; re-check after pushing this handoff.

## 3. What Was Done

Completed this turn:

- Confirmed PR #3 was green at remote head `de61281`: CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate` all passed; review decision remained `REVIEW_REQUIRED`, and review threads were empty.
- Added direct accepted-lead field-value assertions to `npm run acceptance:supabase`: the returned row must preserve the created lead `name`, `company_name`, and `notes` marker.
- Updated the package-script guard test so the accepted-lead field-value check cannot be removed silently.
- Re-ran focused package-script tests, `git diff --check`, the full local `npm.cmd run quality` gate, and the fail-closed missing-env acceptance path successfully after accepted-lead-field-values hardening.

Previous accepted-lead-scope hardening in Loop 10:

- Confirmed PR #3 was green at remote head `3cdb8ad`: CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate` all passed; review decision remained `REVIEW_REQUIRED`, and review threads were empty.
- Added direct accepted-lead create assertions to `npm run acceptance:supabase`: the returned row must belong to the bootstrapped `organization_id` and must not already have `deleted_at` set.
- Updated the package-script guard test so the accepted-lead organization-scope and non-deleted checks cannot be removed silently.
- Re-ran focused package-script tests, `git diff --check`, the full local `npm.cmd run quality` gate, and the fail-closed missing-env acceptance path successfully after accepted-lead-scope hardening.

Previous service-role-key hardening in Loop 10:

- Confirmed PR #3 was green at remote head `4878911`: CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate` all passed; review decision remained `REVIEW_REQUIRED`.
- Added an `ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY` guard so `npm run acceptance:supabase` fails before network access when the supplied key is a new-format `sb_secret_...` key or a legacy JWT whose role is `service_role`.
- Documented that live acceptance must use a publishable/anon key, not a service-role key, because service-role keys bypass RLS and would make isolation checks meaningless.
- Updated the package-script guard test so the service-role/secret-key rejection logic cannot be removed silently.
- Re-ran `npm.cmd run acceptance:supabase` with a dummy `sb_secret_...` key and confirmed it fails before network access without printing the key value.
- Re-ran `npm.cmd run acceptance:supabase` with a dummy legacy `service_role` JWT and confirmed it fails before network access without printing the key value.
- Ran focused package-script tests, `git diff --check`, and the full local `npm.cmd run quality` gate successfully after service-role-key hardening.

Previous cross-organization hardening in Loop 10:

- Confirmed PR #3 was green at remote head `6170da8`: CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate` all passed; review decision remained `REVIEW_REQUIRED`, and review threads were empty.
- Added optional authenticated cross-organization isolation coverage to `npm run acceptance:supabase`. If `ACCEPTANCE_OTHER_TEST_EMAIL` and `ACCEPTANCE_OTHER_TEST_PASSWORD` are both provided, the script signs in as that disposable second user, bootstraps/reads its organization id, fails if it is the same organization as the primary test user, and verifies the second organization cannot read the primary organization's created lead.
- Added fail-closed handling for partially configured optional cross-organization variables so an incomplete acceptance setup fails before any network call.
- Documented the optional stronger RLS isolation variables in `.env.example` and `docs/testing.md`.
- Updated the package-script guard test so the cross-organization isolation check cannot be removed silently.
- Re-ran `npm.cmd run acceptance:supabase` in the current environment and confirmed it still fails cleanly with missing dedicated `ACCEPTANCE_*` variables and no stack trace.
- Re-ran `npm.cmd run acceptance:supabase` with dummy required local values and only `ACCEPTANCE_OTHER_TEST_EMAIL` set; it failed before network access with the expected "set both optional variables or leave both empty" message.
- Ran focused package-script tests, `git diff --check`, and the full local `npm.cmd run quality` gate successfully after optional cross-organization hardening.

Previous anonymous-isolation hardening in Loop 10:

- Confirmed PR #3 was green at remote head `d272576`: CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate` all passed; review decision remained `REVIEW_REQUIRED`, and review threads were empty.
- Added an anonymous publishable-key read isolation check to `npm run acceptance:supabase`. After the authenticated test user creates a lead, the script now verifies that a client without an authenticated user cannot read that live lead before proceeding to update/read/soft-delete checks.
- Documented the stronger anonymous-isolation acceptance coverage in `docs/testing.md`.
- Added a unit guard to keep the acceptance harness explicit about the remote non-production confirmation and anonymous isolation checks.
- Re-ran `npm.cmd run acceptance:supabase` in the current environment and confirmed it still fails cleanly with missing dedicated `ACCEPTANCE_*` variables and no stack trace.
- Ran focused package-script tests, `git diff --check`, and the full local `npm.cmd run quality` gate successfully after anonymous-isolation hardening.

Previous cleanup-exception hardening in Loop 10:

- Confirmed PR #3 was green at remote head `da01581`: CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate` all passed; review decision remained `REVIEW_REQUIRED`.
- Hardened `npm run acceptance:supabase` cleanup so unexpected cleanup exceptions are reported as cleanup warnings instead of masking the original acceptance failure.
- Re-ran `npm.cmd run acceptance:supabase` in the current environment and confirmed it still fails cleanly with missing dedicated `ACCEPTANCE_*` variables and no stack trace.
- Ran focused package-script tests, `git diff --check`, and the full local `npm.cmd run quality` gate successfully after cleanup-exception hardening.

Previous cleanup hardening in Loop 10:

- Confirmed PR #3 was green at remote head `090021a`: CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate` all passed; review decision remained `REVIEW_REQUIRED`.
- Hardened `npm run acceptance:supabase` so `fail()` throws a handled acceptance error instead of calling `process.exit()` directly. This lets `finally` run.
- Added best-effort cleanup for the live acceptance flow: if a lead is created and a later step fails before the normal soft-delete assertion completes, the script now attempts to soft-delete that lead before signing out.
- Added `[::1]` to the local Supabase host allowlist so IPv6 localhost URLs do not require the remote non-production confirmation token.

Earlier Loop 10 completed work:

- Confirmed PR #3 was green at remote head `ec685c6`: CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate` all passed; review decision remained `REVIEW_REQUIRED`.
- Confirmed there is no `.env.local` in this checkout and all Supabase/test acceptance environment variables are missing from the shell. No secret values were printed.
- Confirmed Docker is installed, but the local Supabase CLI binary is blocked by Windows Application Control policy, so this shell cannot start a local Supabase stack via the checked-in `supabase/config.toml`.
- Added `npm run acceptance:supabase`, an explicit non-production live Supabase acceptance script that:
  - loads only dedicated `ACCEPTANCE_*` variables from the shell or `.env.acceptance.local`;
  - fails if required variables are missing instead of silently passing in mock/demo mode;
  - requires `ACCEPTANCE_NON_PRODUCTION_CONFIRMATION=I_CONFIRM_THIS_IS_NOT_PRODUCTION` for remote Supabase URLs;
  - signs in with Supabase Auth using a disposable test user;
  - calls `ensure_user_profile` to prove authenticated profile/organization bootstrap;
  - creates, reads, updates, and soft-deletes a lead through the publishable-key authenticated RLS path;
  - confirms the soft-deleted lead is hidden from active lead queries.
- Documented the live non-production acceptance command and required environment variables in `.env.example` and `docs/testing.md`.
- Added a package-script unit assertion so the acceptance command remains explicit and outside the default `quality` gate.
- Ran `npm.cmd run acceptance:supabase` in the current environment and confirmed it fails with missing dedicated `ACCEPTANCE_*` variables. This is expected and proves the script does not fake success without a real non-production target.
- Ran focused unit coverage for the package script and the full local `npm.cmd run quality` gate successfully after the new acceptance harness.
- Pushed the acceptance-script and handoff commits to PR #3 and confirmed CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate` are green at `fa07246`, then `090021a`.
- Confirmed PR #3 review threads list is empty; GitHub still reports `REVIEW_REQUIRED`.

- Confirmed PR #2 was already merged by the user and did not attempt a duplicate merge.
- Confirmed PR #3 remote head `1b22b7e` had a GitHub Actions `quality-gate` failure while CodeRabbit and Vercel were green.
- Inspected the failed run (`28889039473`) and found the only failure was `tests/e2e/crm-flows.spec.ts:45`:
  - The login auth feedback test asserted `page.getByRole("alert")`.
  - In CI, Playwright strict mode also found Next.js' internal `<div id="__next-route-announcer__" role="alert">`.
  - This made the test ambiguous even though the application error message was rendered correctly.
- Scoped the login auth feedback assertions to `page.locator("main")` so the test continues proving visible app-level alert/status feedback without colliding with framework internals.
- Ran the focused login auth feedback E2E test and the full local `npm.cmd run quality` gate successfully.

- Confirmed PR #3 was still green at remote head `929a136` before this new change: CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate` passed.
- Audited Cron lead-import status persistence after the previous `saveLeadImportSetting()` update hardening.
- Fixed demo-mode setting updates so a missing setting ID no longer returns success; it now throws `取込設定が見つかりません。`.
- Fixed Supabase setting updates so they call `.select("id").single()` after the scoped update. This makes missing/deleted/out-of-organization rows surface as an error instead of silently returning success.
- Fixed Supabase Cron run/setting status updates so they also call `.select("id").single()` after the scoped update. This prevents a lead import from reporting success when the final `lead_import_runs` / `lead_import_settings` status row was not actually updated.
- Improved import result toasts so `import-success` / `import-failed` display imported and skipped counts from the existing URL params.
- Added unit coverage for:
  - Supabase setting updates staying scoped to the current `organization_id`, setting `id`, and `deleted_at IS NULL`.
  - missing Supabase setting updates rejecting instead of returning success.
  - missing demo setting updates rejecting instead of returning success.
  - Cron imports returning `failed` when status persistence matches no row, with failure status/message written through the fallback status path.
- Added E2E coverage for import result toasts showing imported/skipped counts on both success and failure URLs.
- Ran focused tests and the full mechanical quality gate.
- Pushed PR #3 and confirmed CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate` are green at `6bcbbe4`.

Earlier Loop 10 context already in PR #3:

- Related-create validation redirects preserve configured relation fields.
- Login/auth feedback is accessible and normalized.
- Supabase soft-delete persistence preserves explicit `deleted_at` during update payload shaping.
- Service-role cron import status updates are scoped by organization, id, and non-deleted rows.

## 4. Files Changed

Main files changed this turn:

- `scripts/supabase-live-acceptance.mjs`
- `tests/unit/package-scripts.test.ts`
- `AI_HANDOFF.md`

Important earlier PR #3 files:

- `package.json`
- `.env.example`
- `docs/testing.md`
- `tests/unit/package-scripts.test.ts`
- `tests/e2e/crm-flows.spec.ts`
- `src/components/crm/toast-notice.tsx`
- `src/lib/crm/lead-imports.ts`
- `src/lib/crm/actions.ts`
- `src/app/login/page.tsx`
- `src/lib/crm/data.ts`
- `src/lib/crm/persistence.ts`
- `tests/unit/lead-imports.test.ts`
- `tests/unit/actions.test.ts`
- `tests/unit/data-supabase.test.ts`
- `tests/unit/persistence.test.ts`

## 5. Current Status

- Local code quality is green after `51e4985`.
- Working tree should be clean after this handoff update is committed.
- PR #3 is open and mergeable, but review is still required.
- PR #3 remote head `de61281` is green for CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate`; the `51e4985` accepted-lead-field-values guard commit and this handoff still need to be pushed and re-checked.
- No production DB, production API, migration, RLS, or Vercel setting changes were made.
- No secrets were read or printed.
- Cursor Bugbot was not used; CodeRabbit OSS remains the standard review path.

## 6. Known Issues

- No current Critical/High code issue is known after the latest local quality gate.
- Live authenticated Supabase/Vercel CRUD acceptance is still incomplete because this shell does not have safe non-production Supabase runtime/test credentials. `npm.cmd run acceptance:supabase` now exists and fails loudly until those credentials are supplied.
- Local Supabase startup is not currently available because the installed Supabase CLI binary is blocked by Windows Application Control policy, even though Docker is installed.
- PR #3 still needs human/Claude review because GitHub reports `REVIEW_REQUIRED`.
- `codex/persistent-quality-gate-ops` still exists as an older stale branch. Do not delete it without explicit human confirmation.
- Some Japanese text may look garbled in PowerShell output because of terminal encoding; inspect files in a UTF-8-aware editor if needed.

## 7. CodeRabbit Review

CodeRabbit OSS findings and response:

- Review status: Passed on PR #3 at remote head `de61281` before the accepted-lead-field-values guard commit; re-check after pushing this handoff commit.
- Critical findings: none known.
- Resolved findings: none; CodeRabbit previously produced no actionable comments.
- Deferred findings: none.
- False positives / not applicable: none.
- Review threads: 0.

## 8. Optional Bugbot Findings

Cursor Bugbot optional backup:

- Status: Not run.
- Findings: none.
- Actions taken: none.
- Reason: The current change is narrow, covered by unit tests and full quality gate, and CodeRabbit OSS is the standard review path for this public repository.

## 9. Verification Results

Current turn commands:

```bash
gh pr checks 3 --repo kotakase2022-jpg/crm
# Passed at remote head de61281 before the accepted-lead-field-values guard commit:
# CodeRabbit pass
# Vercel pass
# Vercel Preview Comments pass
# quality-gate / typecheck-lint-test-e2e-build pass

gh api graphql ... reviewThreads
# Passed. PR #3 reviewThreads list is empty (0 unresolved); reviewDecision remains REVIEW_REQUIRED.

npm.cmd run test -- --run tests/unit/package-scripts.test.ts
# Passed. 1 file / 3 tests.

git diff --check
# Passed.

npm.cmd run quality
# Passed.
# typecheck: passed
# lint: passed
# test: passed (28 files / 180 tests)
# coverage: passed
#   statements 93.69%
#   branches 86.54%
#   functions 99.54%
#   lines 95.94%
# test:e2e: passed (44 Chromium tests)
# build: passed (Next.js 16.2.10 production build)

npm.cmd run acceptance:supabase
# Failed as expected with missing dedicated ACCEPTANCE_* variables:
# ACCEPTANCE_SUPABASE_URL, ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY, ACCEPTANCE_TEST_EMAIL, ACCEPTANCE_TEST_PASSWORD.
# No stack trace or secret value was printed.

npm.cmd run test -- --run tests/unit/package-scripts.test.ts
# Passed. 1 file / 3 tests.

git diff --check
# Passed.

npm.cmd run quality
# Passed.
# typecheck: passed
# lint: passed
# test: passed (28 files / 180 tests)
# coverage: passed
#   statements 93.69%
#   branches 86.54%
#   functions 99.54%
#   lines 95.94%
# test:e2e: passed (44 Chromium tests)
# build: passed (Next.js 16.2.10 production build)

npm.cmd run acceptance:supabase
# Failed as expected with missing dedicated ACCEPTANCE_* variables:
# ACCEPTANCE_SUPABASE_URL, ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY, ACCEPTANCE_TEST_EMAIL, ACCEPTANCE_TEST_PASSWORD.
# No stack trace or secret value was printed.

gh pr checks 3 --repo kotakase2022-jpg/crm
# Passed at remote head 3cdb8ad before the accepted-lead-scope guard commit:
# CodeRabbit pass
# Vercel pass
# Vercel Preview Comments pass
# quality-gate / typecheck-lint-test-e2e-build pass

npm.cmd run acceptance:supabase
# With ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY='sb_secret_dummy' and dummy local required variables:
# Failed as expected before network access because service/secret keys are not allowed for RLS acceptance.

$env:ACCEPTANCE_SUPABASE_URL='http://localhost:54321'; $env:ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY='eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature'; $env:ACCEPTANCE_TEST_EMAIL='primary@example.test'; $env:ACCEPTANCE_TEST_PASSWORD='password'; npm.cmd run acceptance:supabase
# Failed as expected before network access because legacy service_role JWTs are not allowed for RLS acceptance.

npm.cmd run test -- --run tests/unit/package-scripts.test.ts
# Passed. 1 file / 3 tests.

git diff --check
# Passed.

npm.cmd run quality
# Passed.
# typecheck: passed
# lint: passed
# test: passed (28 files / 180 tests)
# coverage: passed
#   statements 93.69%
#   branches 86.54%
#   functions 99.54%
#   lines 95.94%
# test:e2e: passed (44 Chromium tests)
# build: passed (Next.js 16.2.10 production build)

gh pr checks 3 --repo kotakase2022-jpg/crm
# Passed at remote head 4878911 before the service-role-key guard commit:
# CodeRabbit pass
# Vercel pass
# Vercel Preview Comments pass
# quality-gate / typecheck-lint-test-e2e-build pass
```

Earlier Loop 10 verification retained for context:

```bash
npm.cmd run test:e2e -- -g "login page exposes auth feedback accessibly"
# Passed. 1 Chromium test.

gh run view 28889039473 --repo kotakase2022-jpg/crm --log-failed
# Confirmed the previous CI failure was a strict locator collision with Next.js' route announcer, not an app rendering failure.

npm.cmd run test:e2e -- -g "lead spreadsheet import result toasts"
# Passed. 1 Chromium test.

npm.cmd run test -- --run tests/unit/lead-imports.test.ts
# Passed. 1 file / 15 tests.

npm.cmd run typecheck
# Passed.

npm.cmd run lint
# Passed.

npm.cmd run quality
# Passed.
# typecheck: passed
# lint: passed
# test: passed (28 files / 178 tests)
# coverage: passed
#   statements 93.69%
#   branches 86.54%
#   functions 99.54%
#   lines 95.94%
# test:e2e: passed (44 Chromium tests)
# build: passed (Next.js 16.2.10 production build)

git diff --check
# Passed.

git push
# Passed. Pre-push ran test:guard, lint, typecheck, and unit tests successfully.

gh pr checks 3 --repo kotakase2022-jpg/crm --watch --interval 10
# Passed at remote head 6bcbbe4:
# CodeRabbit pass
# Vercel pass
# Vercel Preview Comments pass
# quality-gate / typecheck-lint-test-e2e-build pass

gh api graphql ... reviewThreads
# Passed. PR #3 reviewThreads list is empty (0 unresolved).
```

PR state checked before the latest local commit:

```bash
gh pr view 3 --repo kotakase2022-jpg/crm --json number,title,state,isDraft,mergeStateStatus,mergeable,reviewDecision,headRefName,baseRefName,url,statusCheckRollup
# PR #3 open, non-draft, mergeable, review required.
# Previous remote head checks were green: CodeRabbit, Vercel, Vercel Preview Comments, and quality-gate.
```

## 10. Next Recommended Action

Claude Code should start here:

1. Run `git status --short --branch` and `git log --oneline -6`.
2. Confirm `51e4985` and this handoff commit are pushed to PR #3.
3. Run `gh pr checks 3 --repo kotakase2022-jpg/crm`.
4. Confirm the latest `quality-gate` rerun is green after `51e4985` and this handoff commit.
5. Confirm CodeRabbit OSS has no Critical/High findings on the latest PR head.
6. Review the new `npm run acceptance:supabase` script for production-safety, RLS coverage, and no accidental fallback to demo/mock data.
7. If a safe non-production Supabase URL, publishable key, and disposable test user are available, place them in `.env.acceptance.local` or shell env and run `npm.cmd run acceptance:supabase`.
8. For the strongest RLS evidence, configure `ACCEPTANCE_OTHER_TEST_EMAIL` and `ACCEPTANCE_OTHER_TEST_PASSWORD` with a second disposable user in a different organization before running live acceptance.
9. If live acceptance passes, update `AI_HANDOFF.md` with the result and reassess the two 99/100 scores.
10. If code changes are made, run at least the focused tests plus `npm.cmd run quality`.

## 11. Suggested Review Scope for Claude Code

Please review:

- Does `scripts/supabase-live-acceptance.mjs` require dedicated `ACCEPTANCE_*` variables and fail closed when they are missing?
- If a live acceptance run fails after creating a lead, does the cleanup path make a best-effort soft delete without hiding the original failure?
- If cleanup itself throws unexpectedly, does it emit a warning and preserve the original acceptance failure as the command failure?
- Does the script avoid service-role credentials, production defaults, and mock/demo fallback?
- Does the publishable-key guard reject new-format `sb_secret_...` keys and legacy `service_role` JWTs before any network access?
- Does the lead creation step fail immediately if Supabase returns a row outside the bootstrapped organization scope or with `deleted_at` already set?
- Does the lead creation step also fail if Supabase returns unexpected `name`, `company_name`, or `notes` values after insert?
- Is the remote-target confirmation strong enough to prevent accidental production Supabase writes?
- Does the anonymous publishable-key read check fail the acceptance command if unauthenticated clients can read the created lead?
- If optional second-user variables are provided, does the authenticated cross-organization check fail when the second user is in the same organization or can read the created lead?
- Does the script's create/read/update/soft-delete lead flow prove the remaining authenticated RLS persistence gap well enough when run against staging/local Supabase?
- Does the login auth feedback E2E now target the application-visible alert/status without weakening the accessibility assertion?
- Does `saveLeadImportSetting()` correctly reject missing/deleted/out-of-organization updates in both demo and Supabase modes?
- Is `.select("id").single()` the right Supabase pattern here to detect zero-row updates without broadening data exposure?
- Should the same zero-row detection on `lead_import_runs` / `lead_import_settings` status updates produce a failed import result, as currently implemented?
- Do import result toasts show enough immediate context for sales/CS users after a manual spreadsheet import?
- Do the new unit tests prove organization scoping and missing-row rejection without mocking a failed feature as success?
- Are error messages appropriate for user-facing CRM settings workflows?
- Does the patch avoid changing CSV parsing, import scheduling, lead creation, duplicate detection, or cron behavior?

## 12. Risk Notes

- The latest change adds a dedicated live non-production Supabase acceptance command. It is intentionally outside `npm run quality` because CI and normal local gates must not write to external databases.
- Running `npm.cmd run acceptance:supabase` with real acceptance credentials writes and then soft-deletes one lead in the target Supabase project. Use only local/staging projects with disposable test data.
- The acceptance command now fails before network access if `ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY` is a service-role/secret key, because those keys bypass RLS and would invalidate the acceptance evidence.
- The latest acceptance hardening verifies the inserted lead row is immediately returned in the expected organization scope and not already soft-deleted before any read/update/delete checks continue.
- The latest acceptance hardening also verifies that the inserted lead row preserves the user-entered `name`, `company_name`, and `notes` marker before continuing.
- The latest acceptance hardening checks anonymous read isolation before updating and soft-deleting the created lead, so a permissive public lead read policy should fail the command.
- The optional second-user acceptance path calls `ensure_user_profile` for the second disposable user and may create/bootstrap that user's test organization in the target non-production Supabase project.
- If `ACCEPTANCE_OTHER_TEST_EMAIL` belongs to the same organization as `ACCEPTANCE_TEST_EMAIL`, the command fails because it cannot prove cross-organization isolation.
- The cleanup hardening is best effort; if Supabase rejects cleanup after a mid-run failure, the script prints a cleanup warning and still fails the acceptance command.
- Remote Supabase targets require the exact `ACCEPTANCE_NON_PRODUCTION_CONFIRMATION=I_CONFIRM_THIS_IS_NOT_PRODUCTION` guard.
- The current shell cannot complete live acceptance because no acceptance env vars are present and local Supabase CLI execution is blocked by Windows Application Control policy.
- This previous change is intentionally limited to import settings/status update confirmation behavior.
- The latest UI change only formats existing `imported` / `skipped` query params already emitted by `runLeadImportSettingAction`.
- Supabase service-role Cron status update hardening remains in PR #3 and now fails visibly on zero-row status updates.
- A real Supabase update returning zero rows depends on PostgREST `.single()` returning an error. The unit test models that expected behavior.
- Live authenticated acceptance is still the main evidence gap before claiming 100/100.
- CodeRabbit account/plan metadata should be monitored by the repository owner because cost control is important for this project.

## 13. Do Not Touch

- `.env.local`, Supabase service role keys, Vercel secrets, and production data.
- `main` direct pushes.
- Supabase migrations/RLS/Vercel project settings unless the user explicitly asks.
- Quality gates, coverage thresholds, test guard, or Husky hooks unless the task is specifically about test infrastructure.
- Stale local/remote branches unless the user explicitly authorizes cleanup.

## 14. Notes for Claude Code

- Use `npm.cmd` / `npx.cmd` in Windows PowerShell.
- CodeRabbit OSS is the standard review path; Cursor Bugbot is optional backup only.
- Do not mark the persistent goal complete yet. The current evidence supports 99/100, not 100/100, because live authenticated non-production Supabase acceptance is missing.
- Keep the next change small and PR-reviewable.
- If PR checks lag after push, inspect the underlying GitHub Actions run with `gh run view <run-id> --json status,conclusion,createdAt,updatedAt,jobs`.
