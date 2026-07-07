<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Before any Next.js code change, read the relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md - Codex Instructions

## Project

- Repository: https://github.com/kotakase2022-jpg/crm
- Product: 建設業向け帳票管理SaaSを販売・運用するための自社営業/CS用CRM
- Stack: Next.js App Router, TypeScript, Supabase, Tailwind CSS, Vitest, Playwright, Vercel

## AI Development Loop

This project is developed by alternating between Codex, CodeRabbit OSS PR review, and Claude Code. Cursor Bugbot is optional backup only and should be used only when CodeRabbit is unavailable or the user explicitly asks for an additional review.

1. Codex implements focused development tasks and fixes.
2. Before stopping or handing off, Codex updates `AGENTS.md`, `CLAUDE.md`, and `AI_HANDOFF.md` when needed.
3. A pull request is opened or updated and CodeRabbit OSS reviews the PR. Security, auth, data-loss, build, runtime, and test findings take priority.
4. Codex or Claude Code addresses CodeRabbit findings, or explicitly records any deferred finding with a reason.
5. Claude Code reviews, improves quality, fixes bugs, adds tests, and checks for missed requirements.
6. Claude Code updates `AGENTS.md`, `CLAUDE.md`, and `AI_HANDOFF.md` when needed.
7. CodeRabbit OSS re-reviews the PR after new pushes.
8. Work returns to Codex with the latest handoff context.

## Required Reading Before Work

At the start of every task, read these files in this order:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `AI_HANDOFF.md`
4. `README.md`
5. `package.json`

Also read `docs/testing.md` before changing tests, CI, hooks, or quality-gate behavior. Read `docs/ai-review.md` before changing AI review, PR review, CodeRabbit, or Bugbot workflow.

## Codex Role

Codex is primarily responsible for implementation and targeted fixes.

- Keep each work unit to one task unless the user explicitly asks for broader work.
- Prefer small, reviewable changes.
- Respect existing specs, UI, data model, routing, and test strategy.
- Do not rewrite or redesign unrelated areas.
- Do not change existing screen transitions or Japanese UI copy unless the task requires it.
- When touching Next.js behavior, read the matching bundled doc under `node_modules/next/dist/docs/` first.

## Safety Rules

- Never print, commit, or expose `.env`, API keys, passwords, Supabase service role keys, Vercel tokens, or other secrets.
- Never use production DBs, production APIs, or real customer data in tests.
- Do not delete, skip, mark todo, comment out, or weaken tests to make a gate pass.
- Do not hide type errors with broad `any` or suppressions unless the reason is documented and localized.
- Use soft-delete patterns where the app already expects them.
- Avoid unrelated large refactors and formatting churn.

## Quality Gate

Before marking work complete, run the relevant checks. For normal code changes, run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

For PR handoff or user-facing feature work, prefer the full gate:

```bash
npm run quality
```

If any command fails, fix the implementation when practical. If not fixed before handoff, record the exact command, failure summary, likely cause, and next action in `AI_HANDOFF.md`.

## Handoff Requirement

Before stopping, handing off, or when credit/time runs low:

- Update `AI_HANDOFF.md`.
- Record current owner, next owner, branch, latest commit, completed work, changed files, verification results, known issues, CodeRabbit review status, optional Bugbot backup status if used, and next recommended action.
- Make it clear what Claude Code should read or do first.
- Keep the handoff honest. Do not claim success for checks that were not run.
- Record CodeRabbit review status. Record Cursor Bugbot status only if Bugbot was intentionally used as backup.

## AI PR Review Policy

- CodeRabbit OSS is the standard AI PR reviewer while this repository remains public/open-source.
- Keep `.coderabbit.yaml` versioned and update it when review scope or risk areas change.
- Cursor Bugbot is optional backup only. Do not use it as the default review step because of usage cost.
- Do not enable paid CodeRabbit plans, private-repo billing, or usage-based review add-ons without explicit user approval.
- If this repository becomes private or CodeRabbit OSS eligibility changes, pause and ask the user before continuing the AI review workflow.
- CodeRabbit review does not replace local checks or GitHub Actions `quality-gate`.

## Branch and PR Practice

- Work from `main` or a fresh branch based on `origin/main`.
- Use PRs for ongoing development. Do not push directly to `main` except for emergency repository recovery by an administrator.
- GitHub Actions `quality-gate` must pass before merge.
- CodeRabbit OSS should review each PR before merge; critical/high findings must be fixed or explicitly deferred with a reason.
- Vercel production deployments should come from `main` after `quality-gate` succeeds.
