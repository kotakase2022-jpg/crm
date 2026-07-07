# 建設帳票CRM

建設業向け帳票管理SaaSを販売・運用するための自社営業/CS用CRMです。リード獲得、商談、デモ、トライアル、契約、利用定着、解約リスク管理までを1つのNext.js App Routerアプリで扱います。

## 技術構成

- Next.js App Router / TypeScript
- Tailwind CSS
- Supabase Auth / PostgreSQL / RLS
- `@supabase/ssr`
- Recharts
- Lucide React

## セットアップ

```bash
npm install
cp .env.example .env.local
```

`.env.local` に以下を設定します。

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=...
```

`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` はVercelなど複数インスタンスでServer Actionsを安定運用するために推奨です。

## Supabase DB

ローカルSupabaseを使う場合:

```bash
supabase start
supabase db reset
```

作成される主なテーブル:

- `profiles`
- `organizations`
- `organization_members`
- `leads`
- `companies`
- `contacts`
- `deals`
- `activities`
- `tasks`
- `trials`
- `subscriptions`
- `product_usage`
- `support_tickets`
- `health_scores`
- `billing_records`
- `tags`
- `lead_tags`
- `company_tags`
- `deal_stage_history`
- `audit_logs`

RLSは`organization_id`単位で分離します。初回ログイン時に`ensure_user_profile()` RPCで組織・profile・membershipを作成します。

## 開発

```bash
npm run dev
```

Supabase環境変数が未設定の場合は、ローカルデモデータで画面確認できます。Supabase環境変数を設定すると、RLS配下のSupabaseへ永続化します。

## 検証

```bash
npm run lint
npm run build
```

## 実装済み画面

- ログイン
- ダッシュボード
- リード一覧/詳細/作成/編集/変換
- 会社一覧/詳細/作成/編集
- 担当者一覧/詳細/作成/編集
- 商談一覧/ステージボード/詳細/作成/編集
- タスク一覧/今日/期限切れ/詳細/作成/編集/完了切替
- トライアル一覧/詳細/作成/編集
- 契約一覧/詳細/作成/編集
- チケット一覧/詳細/作成/編集
- レポート
- 設定

## 自動化

ダッシュボードの「自動タスク生成」から以下の条件を判定します。

- 未接触リードの初回架電
- デモ実施後フォロー
- トライアル開始後3日ログインなし
- トライアル終了3日前の契約確認
- 高MRR商談の次回タスク漏れ
- 30日ログインなし
- 帳票作成ゼロ
- 未対応48時間超チケット
- 更新30日前
- ヘルススコア40未満

将来Vercel Cronへ移しやすいよう、判定関数とタスク作成処理は分離しています。

## 参考

- Supabase SSR: https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase API security: https://supabase.com/docs/guides/api/securing-your-api

## Testing / Quality Gate

Strict local and CI quality checks are documented in `docs/testing.md`. AI PR review operation is documented in `docs/ai-review.md`.

## AI PR Review

CodeRabbit OSS is the standard AI PR reviewer for this public repository. Keep `.coderabbit.yaml` in version control and install the CodeRabbit GitHub App for this repository before relying on PR AI review.

- CodeRabbit OSS review is expected on every pull request.
- Critical/high CodeRabbit findings must be fixed or explicitly deferred with a reason in the PR and `AI_HANDOFF.md`.
- Cursor Bugbot is optional backup only and should be used only when CodeRabbit is unavailable or the user explicitly asks for an additional review.
- Do not enable paid CodeRabbit plans, private-repo billing, or usage-based add-ons without explicit user approval.
- If the repository becomes private or OSS eligibility changes, reassess the review workflow and cost before continuing.
- CodeRabbit review does not replace `npm run quality` or GitHub Actions `quality-gate`.

Setup references:

- CodeRabbit GitHub App: https://github.com/apps/coderabbitai
- CodeRabbit GitHub setup docs: https://docs.coderabbit.ai/platforms/github-com
- CodeRabbit plans: https://docs.coderabbit.ai/management/plans

## AI Development Handoff

Codex and Claude Code work in an alternating loop on this repository, with CodeRabbit OSS as the standard PR reviewer. Before stopping or transferring work, update `AI_HANDOFF.md` with the current branch, changed files, verification results, CodeRabbit review status, optional Bugbot backup status if used, and the next recommended action.

## Spreadsheet Lead Import

リード一覧の「スプレッドシート取込設定」から、公開CSVまたはGoogleスプレッドシートURLを設定できます。

- Google Sheets URLはCSV export URLへ自動変換します。
- 12時間ごとにVercel Cronが `/api/cron/lead-imports` を呼び出します。
- 取込リードのデフォルトステータスは `新規（広告経由）` です。
- 手動作成リードのデフォルトステータスは `新規（広告以外）` です。
- 取込済み行はメール、電話、または会社名+リード名から作る安定キーで重複作成を避けます。

Production Vercel env vars:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=...
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` are server-only. Never expose them as `NEXT_PUBLIC_` variables.

Run the full gate before handoff:

```bash
npm run quality
```

GitHub branch protection should require the `quality-gate / typecheck-lint-test-e2e-build` workflow before merging to `main`. If a stable CodeRabbit status check is available after GitHub App installation, repository owners may also require it; do not replace the mechanical quality gate with AI review.

All ongoing development should use pull requests. Do not push directly to `main`; Vercel production deployments should come from `main` only after the GitHub Actions `quality-gate` workflow has passed. Codex, Claude Code, Cursor, and human contributors should not consider work complete until `npm run quality`, CI, and required PR review steps are green or explicitly deferred.
