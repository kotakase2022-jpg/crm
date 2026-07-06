# AI_HANDOFF

## 0. Current Loop Phase

- Current owner: Codex
- Next owner: Claude Code
- Loop: 8
- Loop number inferred from: Previous handoff recorded `Current owner: Claude Code` / `Next owner: Codex` / `Loop: 7` and explicitly said the next new development cycle should be Loop 8.
- Phase: Development / Autonomous Improvement / Handoff
- Last updated: 2026-07-07 00:57:04 +09:00

## 1. Current Goal

今回の目的：

- Goal継続として、既存CRMの「不具合ゼロ」と「日々使いやすく強力な体験価値」を100点へ近づける。
- Claude CodeのLoop 7レビュー結果を受け取り、まず未コミットのClaude handoffを保全する。
- 小さくCodeRabbit OSSがレビューしやすい差分で、日常利用時の日本語CRM体験を改善する。

## 2. Current Branch / Commit / PR

- Branch: `codex/ai-handoff-loop`
- Latest code commit before this handoff update: `d4c5436` (`Localize company status labels`)
- Handoff preservation commit: `20095bb` (`Record Claude review handoff`)
- Last known good commit before Loop 8 local changes: `b1a9ee6` (`Expand coverage include for CRM helpers`)
- PR: https://github.com/kotakase2022-jpg/crm/pull/2
- CodeRabbit OSS review status before Loop 8 commits: `pass` on PR #2.
- Remote checks for the new Loop 8 commits must be rechecked after push.

## 3. What Was Done

今回完了したこと：

- Read required project context:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `AI_HANDOFF.md`
  - `README.md`
  - `package.json`
- Confirmed PR #2 checks were green before Loop 8 code changes:
  - CodeRabbit: pass.
  - Vercel: pass.
  - Vercel Preview Comments: pass.
  - `typecheck-lint-test-e2e-build`: pass.
- Committed Claude Code's Loop 7 handoff update separately as `20095bb`.
- Reviewed form/list/detail display paths for CRM entity option values.
- Fixed a UX issue where company status persisted values (`prospect`, `customer`, `churned`) leaked directly into Japanese CRM screens.
  - Added `companyStatuses` and `companyStatusLabels`.
  - Added optional `FieldConfig.optionLabels`.
  - Added shared `optionLabelForField()` formatting helper.
  - Kept stored DB values unchanged.
  - Localized company status display in forms, filters, list/detail formatted values, and badge tones.
- Added/updated tests:
  - unit coverage for company status label formatting;
  - unit coverage for raw status badge tones;
  - E2E coverage that company creation shows `見込み` instead of raw `prospect`.
- Ran focused tests and full local `npm.cmd run quality`; all passed.

## 4. Files Changed

主な変更ファイル：

- `AI_HANDOFF.md`
- `src/lib/crm/options.ts`
- `src/lib/crm/types.ts`
- `src/lib/crm/entities.ts`
- `src/lib/crm/format.ts`
- `src/components/crm/entity-form.tsx`
- `src/components/crm/entity-table.tsx`
- `src/components/ui/badge.tsx`
- `tests/unit/format.test.ts`
- `tests/unit/badge.test.ts`
- `tests/e2e/crm-flows.spec.ts`

## 5. Current Status

現在の状態：

- Local work is green after Loop 8 code changes.
- `npm.cmd run quality` passed:
  - typecheck passed;
  - lint passed;
  - test guard passed;
  - unit/integration: 26 files / 157 tests passed;
  - coverage: statements 93.08%, branches 86.18%, functions 99.04%, lines 95.50%;
  - Playwright E2E: 39 Chromium tests passed;
  - Next.js production build passed.
- Company status UX now stays Japanese-facing without changing existing persisted values.
- Cursor Bugbot was not used; CodeRabbit OSS remains the standard review path.

## 6. Known Issues

既知の問題：

- Live Supabase/Vercel authenticated browser verification is still not complete.
- PR #2 still needs remote checks rechecked after the Loop 8 commits are pushed.
- PR #2 still needs human review/approval before merge.
- The top-level goal remains incomplete because 100/100 cannot be proven without live authenticated acceptance and human/product confirmation.
- `src/proxy.ts` matcher duplication remains intentionally unchanged because Next.js proxy matcher values must stay statically analyzable.

## 7. CodeRabbit Review

CodeRabbit OSSの指摘と対応状況：

- Review status before Loop 8 commits: `pass` on PR #2.
- Critical/high findings before this pass: none known.
- Resolved in Loop 8:
  - No CodeRabbit finding; proactive UX improvement for raw company status labels.
- Deferred / not applicable:
  - `src/proxy.ts` matcher DRY-up remains intentionally deferred due to Next.js static matcher constraints.
- Next check:
  - After pushing `20095bb`, `d4c5436`, and this handoff update, confirm CodeRabbit remains pass on PR #2.

## 8. Optional Bugbot Findings

Cursor Bugbotの任意確認：

- Status: Not run.
- Findings: None.
- Actions taken: None. The change is small, covered by unit/E2E tests, and does not touch auth, permissions, DB writes, deletion, payments, or secrets.

## 9. Verification Results

実行した確認コマンドと結果：

```bash
gh pr checks 2
# Passed before Loop 8 local commits:
# - CodeRabbit: pass
# - Vercel: pass
# - Vercel Preview Comments: pass
# - typecheck-lint-test-e2e-build: pass

npm.cmd run test -- --run tests/unit/format.test.ts tests/unit/badge.test.ts tests/unit/entity-table.test.ts tests/unit/entity-form.test.ts
# Passed: 4 files / 16 tests.

npm.cmd run typecheck
# Passed.

npm.cmd run lint
# Passed.

npm.cmd run test:e2e -- -g "companies creation persists to its detail page"
# Passed: 1 Chromium E2E test.

npm.cmd run quality
# Passed.
# unit/integration: 26 files / 157 tests.
# coverage: statements 93.08%, branches 86.18%, functions 99.04%, lines 95.50%.
# E2E: 39 Chromium tests.
# build: passed.
```

## 10. Next Recommended Action

次にClaude Codeが最初にやるべきこと：

1. Confirm the latest pushed PR #2 checks are green for the Loop 8 commits.
2. Review the company status label change for scope and data compatibility:
   - stored values remain `prospect` / `customer` / `churned`;
   - user-facing labels are `見込み` / `顧客` / `解約済み`;
   - forms, filters, details, badges, unit tests, and E2E all agree.
3. If checks stay green and CodeRabbit has no critical/high findings, either:
   - prepare PR #2 for human review/merge; or
   - keep future improvements in a fresh, smaller PR after this one merges.
4. Continue toward live Supabase/Vercel authenticated acceptance testing.

## 11. Suggested Review Scope for Claude Code

Claude Codeに重点レビューしてほしい範囲：

- `FieldConfig.optionLabels` optional type and whether it is narrow enough.
- `optionLabelForField()` and `formatValue("status", ...)` behavior.
- Form select/filter display labels with raw persisted values.
- E2E assertion that company status no longer leaks raw `prospect` text on the detail screen.
- Confirm that no DB migration or seed data change is needed.

## 12. Risk Notes

リスク・人間確認が必要な事項：

- Runtime data storage is unchanged; only display labels are localized.
- Existing Supabase rows using `prospect`, `customer`, or `churned` should render with Japanese labels.
- If future company statuses are added, add both a persisted value and a display label.
- No production deploy, production DB write, migration, secret output, or force push was performed.
- Live authenticated browser checks remain unverified.

## 13. Do Not Touch

触らない方がよい領域：

- `.env*`, Supabase service role keys, Vercel tokens, GitHub tokens, CodeRabbit/Cursor auth/session data, and other secrets.
- Production Supabase DB, production APIs, production Vercel deployments.
- RLS/migration design unless a critical issue is confirmed.
- Test deletion, `skip`/`only`/`todo`, coverage threshold weakening, or E2E main-flow removal.
- `git push --force`, `git reset --hard`, or reverting user/other-agent work.

## 14. Notes for Claude Code

Claude Codeへの補足：

- Use `npm.cmd` in PowerShell on this machine; plain `npm` may hit PowerShell execution policy.
- Current local self-score after this pass:
  - Function/screen-transition/no-known-defect score: 99/100 locally.
  - CRM daily-use experience value score: 98/100 locally.
- Scores remain below 100 because full live Supabase/Vercel authenticated verification and human/product acceptance are still pending.
- CodeRabbit OSS is the standard PR reviewer. Cursor Bugbot remains optional backup only.
