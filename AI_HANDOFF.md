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
- This turn strengthened Playwright E2E coverage for the CS-risk workflow: dashboard risky-company signal -> company detail -> related task creation form with the company prefilled.

Current score:

- Function/screen-transition defect-free score: 99 / 100
- Daily CRM experience value score: 99 / 100

Not yet 100 because a safe non-production Supabase authenticated live CRUD acceptance pass is still missing, and PR #3 still needs human/Claude review before merge.

## 2. Current Branch / Commit / PR

- Branch: `codex/loop10-crm-ux-hardening`
- Base: `main` after PR #2 merge (`42d0b81`, `Merge pull request #2 from kotakase2022-jpg/codex/ai-handoff-loop`)
- Latest code commit: `9825722` (`Verify dashboard risky company navigation`)
- Latest branch commit: this handoff commit; run `git log --oneline -1` for the exact hash after commit.
- Last known good local commit: `9825722`
- PR: https://github.com/kotakase2022-jpg/crm/pull/3
- PR #2: merged by the user before this handoff.
- CodeRabbit OSS review status: green on PR #3 at remote head `c2c09f7` before the dashboard-risky-company E2E commit; re-check after pushing this handoff.
- GitHub Actions `quality-gate`: green on PR #3 at remote head `c2c09f7`; local `npm.cmd run quality` passes after `9825722`.
- Vercel preview: green on PR #3 at remote head `c2c09f7` before the dashboard-risky-company E2E commit; re-check after pushing this handoff.

## 3. What Was Done

Completed this turn:

- Confirmed PR #3 latest remote head `c2c09f7` was green before the new test-only change: CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate` all passed.
- Confirmed PR #3 remains open, non-draft, mergeable, and blocked only by `REVIEW_REQUIRED`.
- Strengthened `tests/e2e/crm-flows.spec.ts` so the dashboard operational decision-signal test now:
  - validates the risky-company dashboard link is a concrete company detail path;
  - clicks the risky-company link;
  - verifies the company detail page loads;
  - verifies a related task creation link exists for that company;
  - clicks through to `/tasks/new?company_id=...`;
  - verifies the company select is prefilled with the risky company.
- Ran focused E2E, whitespace diff check, full local quality gate, and the fail-closed missing-env Supabase acceptance path.

Important earlier PR #3 context:

- Added `npm run acceptance:supabase`, an explicit non-production Supabase live acceptance harness for authenticated profile bootstrap, lead create/read/update/soft-delete, anonymous isolation, optional cross-organization isolation, service-role-key rejection, cleanup safety, and inserted/read-back value assertions.
- Hardened lead import setting/status update persistence so zero-row Supabase updates fail visibly instead of returning success.
- Improved spreadsheet import result toasts.
- Fixed the login auth feedback E2E locator collision with Next.js' internal route announcer.
- Preserved related-create context through validation errors.
- Preserved explicit `deleted_at` during Supabase update payload shaping.

## 4. Files Changed

Main files changed this turn:

- `tests/e2e/crm-flows.spec.ts`
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
- `tests/unit/lead-imports.test.ts`
- `tests/unit/actions.test.ts`
- `tests/unit/data-supabase.test.ts`
- `tests/unit/persistence.test.ts`

## 5. Current Status

- Local code quality is green after `9825722`.
- Working tree should be clean after this handoff update is committed.
- PR #3 is open and mergeable, but review is still required.
- PR #3 remote head `c2c09f7` was green for CodeRabbit, Vercel, Vercel Preview Comments, and GitHub Actions `quality-gate` before `9825722`; the E2E commit and this handoff commit need to be pushed and re-checked.
- No production DB, production API, migration, RLS, or Vercel setting changes were made.
- No secrets were read or printed.
- Cursor Bugbot was not used; CodeRabbit OSS remains the standard review path.

## 6. Known Issues

- No current Critical/High code issue is known after the latest local quality gate.
- Live authenticated Supabase/Vercel CRUD acceptance is still incomplete because this shell does not have safe non-production Supabase runtime/test credentials. `npm.cmd run acceptance:supabase` exists and fails loudly until those credentials are supplied.
- Local Supabase startup is not currently available because the installed Supabase CLI binary is blocked by Windows Application Control policy, even though Docker is installed.
- PR #3 still needs human/Claude review because GitHub reports `REVIEW_REQUIRED`.
- `codex/persistent-quality-gate-ops` still exists as an older stale branch. Do not delete it without explicit human confirmation.
- Some Japanese text may look garbled in PowerShell output because of terminal encoding; inspect files in a UTF-8-aware editor if needed.

## 7. CodeRabbit Review

CodeRabbit OSS findings and response:

- Review status: Passed on PR #3 at remote head `c2c09f7` before the dashboard-risky-company E2E commit; re-check after pushing this handoff commit.
- Critical findings: none known.
- Resolved findings: none; CodeRabbit previously produced no actionable comments.
- Deferred findings: none.
- False positives / not applicable: none.
- Review threads: 0 at the previous checked PR head; re-check after push if needed.

## 8. Optional Bugbot Findings

Cursor Bugbot optional backup:

- Status: Not run.
- Findings: none.
- Actions taken: none.
- Reason: The current change is narrow, test-only, covered by focused E2E and the full quality gate, and CodeRabbit OSS is the standard review path for this public repository.

## 9. Verification Results

Current turn commands:

```bash
gh pr view 3 --repo kotakase2022-jpg/crm --json number,title,state,isDraft,mergeStateStatus,mergeable,reviewDecision,headRefName,baseRefName,url,statusCheckRollup,headRefOid
# Passed before new commits.
# PR #3 open, non-draft, mergeable, reviewDecision REVIEW_REQUIRED, remote head c2c09f7.
# CodeRabbit, Vercel, Vercel Preview Comments, and quality-gate were all green at c2c09f7.

npm.cmd run test:e2e -- -g "dashboards, reports, and settings expose operational decision signals"
# Passed. 1 Chromium test.

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
```

## 10. Next Recommended Action

Claude Code should start here:

1. Run `git status --short --branch` and `git log --oneline -6`.
2. Confirm `9825722` and this handoff commit are pushed to PR #3.
3. Run `gh pr checks 3 --repo kotakase2022-jpg/crm`.
4. Confirm the latest `quality-gate`, CodeRabbit, and Vercel checks are green after the new E2E and handoff commits.
5. Review the strengthened dashboard risky-company E2E flow for brittleness and whether it proves the intended CS priority workflow.
6. Review `scripts/supabase-live-acceptance.mjs` for production-safety, RLS coverage, and no accidental fallback to demo/mock data.
7. If a safe non-production Supabase URL, publishable key, and disposable test user are available, place them in `.env.acceptance.local` or shell env and run `npm.cmd run acceptance:supabase`.
8. For the strongest RLS evidence, configure `ACCEPTANCE_OTHER_TEST_EMAIL` and `ACCEPTANCE_OTHER_TEST_PASSWORD` with a second disposable user in a different organization before running live acceptance.
9. If live acceptance passes and PR #3 review is complete, update `AI_HANDOFF.md` with the result and reassess the two 99/100 scores.
10. If code changes are made, run at least the focused tests plus `npm.cmd run quality`.

## 11. Suggested Review Scope for Claude Code

Please review:

- Does the dashboard risky-company E2E now prove a real user path from CS risk signal to company detail to related task creation?
- Is the new selector `main a[href="/tasks/new?company_id=..."]` stable enough for this CRM's generated related-create action?
- Does the test remain narrow and avoid asserting incidental Japanese copy?
- Does `scripts/supabase-live-acceptance.mjs` require dedicated `ACCEPTANCE_*` variables and fail closed when they are missing?
- Does the acceptance script avoid service-role credentials, production defaults, and mock/demo fallback?
- Does the script's create/read/update/soft-delete lead flow prove the remaining authenticated RLS persistence gap well enough when run against staging/local Supabase?
- Do the lead import persistence hardenings still avoid changing CSV parsing, import scheduling, lead creation, duplicate detection, or cron behavior?

## 12. Risk Notes

- The latest change is test-only and does not change runtime behavior.
- The E2E now clicks through from dashboard risk signal to company detail and task create form, but it still runs in demo mode; live Supabase acceptance remains the main unverified external persistence/RLS evidence gap.
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
