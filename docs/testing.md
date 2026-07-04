# Testing and Quality Gate

This repository must not be considered complete unless the mechanical quality gate succeeds. This applies to Codex, Cursor, and human contributors.

## Development Flow

All ongoing development must use pull requests. Do not push directly to `main` except for emergency repository recovery by an administrator.

Normal flow:

1. Create a branch from `main`.
2. Make the change and add the required tests.
3. Run `npm run quality` locally.
4. Open a pull request using `.github/pull_request_template.md`.
5. Merge only after GitHub Actions `quality-gate` succeeds.

For Vercel production deployments, `main` is the production source branch. A production deployment should only happen after the PR has passed `quality-gate` and has been merged to `main`.

## Local Commands

Run the full gate before handoff:

```bash
npm run quality
```

`quality` runs these checks in order and stops on the first failure:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test`
4. `npm run test:coverage`
5. `npm run test:e2e`
6. `npm run build`

Useful focused commands:

```bash
npm run test:guard
npm run test
npm run test:coverage
npm run test:e2e
```

## Test Guard Rules

`scripts/check-tests.mjs` fails the gate when it detects:

- focused tests such as `test.only`, `describe.only`, or `it.only`
- skipped or placeholder tests such as `test.skip`, `describe.skip`, `it.skip`, or `test.todo`
- Playwright `test.fixme`
- all E2E specs missing
- test blocks without an `expect(...)` assertion
- suspiciously large comment blocks or comment-heavy test files

Do not delete, skip, comment out, or weaken important tests to make the gate pass. When a test fails because the implementation is wrong, fix the implementation.

## Unit and Integration Tests

Vitest covers CRM domain logic under `src/lib/crm`:

- amount and ARR/MRR calculations
- date and formatter behavior
- CSV parsing
- entity input validation
- API response shaping and fallback behavior
- persistence payload shaping before Supabase writes
- sales funnel, dashboard KPI, CS KPI, and alert logic
- empty data, invalid data, and boundary values

Coverage output is written to `coverage/`. The current thresholds are non-zero and enforced for lines, branches, functions, and statements in `vitest.config.ts`.

## E2E Tests

Playwright Chromium specs live in `tests/e2e`. They run the app in demo mode with Supabase env vars intentionally empty, so production DBs, production APIs, and real user data are not touched.

The E2E suite verifies:

- initial dashboard rendering
- main CRM navigation
- lead creation and detail rendering
- lead conversion into a deal
- task completion and reopen flow
- automation task generation
- invalid form input without crash
- controlled route-level 404 behavior
- `console.error`, `pageerror`, failed local requests, unexpected local 4xx/5xx responses, hydration signals, and React runtime errors

Open the report after a local E2E run:

```bash
npx playwright show-report
```

## Fixtures

Fixtures are stored in `tests/fixtures`:

- `tests/fixtures/csv/leads.valid.csv`
- `tests/fixtures/csv/leads.empty.csv`
- `tests/fixtures/csv/leads.invalid.csv`
- `tests/fixtures/csv/leads.boundary.csv`
- `tests/fixtures/api/supabase-insert-success.json`
- `tests/fixtures/api/supabase-insert-error.json`
- `tests/fixtures/db/demo-snapshot.json`

Fixtures must not contain real customer data, personal data, production credentials, or secrets.

## Environment Variables

Use `.env.example` as the reference. Local E2E defaults to demo mode. Do not point tests at a production Supabase project.

Required production/runtime variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`

Optional test variables:

- `E2E_TEST_MODE=demo`
- `PLAYWRIGHT_PORT=3025`
- `PLAYWRIGHT_BASE_URL`

## CI

`.github/workflows/quality-gate.yml` runs on pull requests and pushes to `main` or `master`.

The workflow performs checkout, Node setup from `.nvmrc`, `npm ci`, Playwright Chromium install, typecheck, lint, test guard, unit/integration tests, coverage, E2E, and production build. It uploads Playwright reports, traces/screenshots, and coverage artifacts. If any step fails, CI fails.

If CI fails:

1. Open the failed step logs.
2. For E2E failures, download `playwright-report` and `playwright-test-results`.
3. Reproduce locally with `npm run test:e2e` or `npm run quality`.
4. Fix the implementation unless the test specification is demonstrably wrong.

## Branch Protection

Enable GitHub branch protection for `main`. If automation cannot set these rules, configure them manually in GitHub:

1. Open the repository settings.
2. Go to `Rules` or `Branches`, then create a rule for `main`.
3. Enable `Require a pull request before merging`.
4. Enable `Require status checks to pass before merging`.
5. Require the `quality-gate / typecheck-lint-test-e2e-build` status check.
6. Enable `Require branches to be up to date before merging`.
7. Restrict direct pushes to `main`.
8. Do not allow bypassing the above settings unless a repository owner needs emergency recovery.

The repository is not considered fully protected until this rule is active.

## New Feature Rule

Every new feature must add or update tests at the right level:

- New screen: add a corresponding Playwright E2E test.
- New form: add normal-path and error-path tests.
- New API route or server action behavior: add normal-path, error-path, and permission-error tests.
- CSV, PDF, image, or file upload changes: add or update fixtures and cover the upload/import/render flow.
- Supabase table, RLS, or persistence changes: add data-integrity tests and verify organization-level isolation behavior where practical.
- Pure domain logic: add a Vitest unit test.
- Cross-module behavior or data shaping: add a Vitest integration test.
- User-critical CRM workflow: add a Playwright E2E test.
- Bug fix: add a failing reproduction test first whenever practical, verify it fails, then fix the implementation.

Shipping a feature by weakening tests is not allowed.

It is forbidden to delete, skip, mark todo, comment out, or weaken existing tests just to make the gate pass.

## Local Hooks

Husky hooks provide a local safety net:

- `pre-commit`: runs `npm run test:guard`
- `pre-push`: runs `npm run test:guard`, `npm run lint`, `npm run typecheck`, and `npm run test`

E2E, coverage, and production build remain enforced by GitHub Actions and by the required local `npm run quality` before PR handoff.
