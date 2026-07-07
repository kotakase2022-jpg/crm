@AGENTS.md

# CLAUDE.md - Claude Code Instructions

## Project

- Repository: https://github.com/kotakase2022-jpg/crm
- Product: 建設業向け帳票管理SaaSを販売・運用するための自社営業/CS用CRM
- Stack: Next.js App Router, TypeScript, Supabase, Tailwind CSS, Vitest, Playwright, Vercel

## Claude Code Role

Claude Code is primarily responsible for review, quality improvement, bug fixes, test additions, and missed-requirement checks after Codex work.

Prioritize reading:

1. `AI_HANDOFF.md`
2. The current git diff
3. CodeRabbit PR findings
4. Cursor Bugbot findings only when Bugbot was explicitly used as backup
5. Codex commits and comments
6. `README.md`, `docs/testing.md`, `docs/ai-review.md`, and relevant tests

## Review Principles

- Respect Codex's implementation intent.
- Prefer small, targeted fixes over large rewrites.
- Do not change existing specs, UI, data model, routing, or screen flow unless needed to fix a confirmed issue.
- If behavior is unclear, treat existing implementation, README, tests, and visible UI behavior as the source of truth.
- Security, auth, RLS, data integrity, runtime errors, build failures, and missing tests take priority.
- Treat CodeRabbit OSS as the standard PR review source. Cursor Bugbot is optional backup only and should not drive the default review loop unless the user explicitly asks or CodeRabbit is unavailable.
- Address CodeRabbit critical/high findings before lower-priority cleanup, or document why a finding is intentionally deferred.

## Verification

Run the relevant checks before handoff. For normal code changes:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

For PR-ready work, prefer:

```bash
npm run quality
```

Do not delete, skip, mark todo, comment out, or weaken tests to make checks pass.

## Handoff Back to Codex

After work, update these files when needed:

- `AGENTS.md`
- `CLAUDE.md`
- `AI_HANDOFF.md`

In `AI_HANDOFF.md`, leave:

- What was reviewed or changed
- What still needs work
- Any commands that failed or were not run
- CodeRabbit findings and response status
- Cursor Bugbot findings and response status only if Bugbot was used as backup
- The next recommended Codex action
