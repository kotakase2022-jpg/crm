import { HardHat } from "lucide-react";
import { signInAction, signUpAction } from "@/lib/crm/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { safeInternalRedirectPath } from "@/lib/crm/navigation";

const demoCredentials = {
  email: "demo@example.com",
  password: "Demo-crm-2026!",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeInternalRedirectPath(first(params.next));
  const error = first(params.error);
  const notice = first(params.notice);
  const shouldPrefillDemoCredentials = !error;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white">
              <HardHat className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-950">建設帳票CRM</h1>
              <p className="text-sm text-slate-500">Supabase Authでログイン</p>
            </div>
          </div>
          {error ? (
            <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
              {notice}
            </p>
          ) : null}
          <section aria-label="デモ用ログイン情報" className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-3">
            <p className="text-sm font-semibold text-sky-950">デモ用ログイン情報</p>
            <dl className="mt-2 grid gap-1 text-sm text-sky-900">
              <div className="flex flex-wrap items-center gap-x-2">
                <dt className="font-medium">ID</dt>
                <dd className="font-mono">{demoCredentials.email}</dd>
              </div>
              <div className="flex flex-wrap items-center gap-x-2">
                <dt className="font-medium">PASS</dt>
                <dd className="font-mono">{demoCredentials.password}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs leading-5 text-sky-800">共有デモアカウントです。機密情報や実顧客データは入力しないでください。</p>
          </section>
          <form action={signInAction} className="grid gap-3">
            <input type="hidden" name="next" value={next} />
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="email">
                メール
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@example.com"
                defaultValue={shouldPrefillDemoCredentials ? demoCredentials.email : undefined}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="password">
                パスワード
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                defaultValue={shouldPrefillDemoCredentials ? demoCredentials.password : undefined}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button className="w-full">ログイン</Button>
              <Button className="w-full" variant="secondary" formAction={signUpAction}>
                初回作成
              </Button>
            </div>
          </form>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Supabase環境変数が未設定の場合、ログイン操作後はローカルデモデータでCRMを確認できます。
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
