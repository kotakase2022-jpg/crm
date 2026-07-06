# AI Review Process

This repository uses CodeRabbit OSS as the standard AI reviewer for pull requests. Cursor Bugbot is optional backup only.

## Standard Reviewer

- Standard: CodeRabbit OSS
- Backup: Cursor Bugbot, only when CodeRabbit is unavailable or the user explicitly asks for an additional review
- Mechanical gate: GitHub Actions `quality-gate`

CodeRabbit review does not replace local verification, `npm run quality`, or GitHub Actions.

## CodeRabbit Setup Checklist

Repository owners should complete this once:

1. Keep this repository public/open-source while relying on the CodeRabbit OSS cost model.
2. Install the CodeRabbit GitHub App from https://github.com/apps/coderabbitai.
3. Grant access to `kotakase2022-jpg/crm`.
4. Keep `.coderabbit.yaml` in the repository root.
5. Open or update a pull request and confirm CodeRabbit posts a review.
6. If CodeRabbit exposes a stable GitHub status check, optionally require it in branch protection in addition to `quality-gate`.
7. Keep automatic incremental review volume modest; the repository config currently pauses after two reviewed commits to avoid unnecessary repeated reviews.

Do not enable paid CodeRabbit plans, private-repo billing, or usage-based add-ons without explicit user approval.

## Pull Request Rule

Before a PR is considered ready:

- `npm run quality` should pass locally for PR-ready work.
- GitHub Actions `quality-gate` must pass.
- CodeRabbit OSS should review the PR.
- Critical/high CodeRabbit findings must be fixed or explicitly deferred with a reason in the PR and `AI_HANDOFF.md`.
- Cursor Bugbot usage, if any, must be documented as backup use with the reason.

## Cost Control

If the repository becomes private, CodeRabbit OSS eligibility changes, or CodeRabbit asks for billing configuration, pause the review workflow and ask the user before proceeding.

## Handoff Notes

Every AI handoff should record:

- CodeRabbit review status
- unresolved CodeRabbit findings
- whether Cursor Bugbot was used as backup
- any deferred AI-review finding and the reason
- whether `quality-gate` and local verification were run
