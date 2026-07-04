import { HardHat } from "lucide-react";
import { signInAction, signUpAction } from "@/lib/crm/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = first(params.next) ?? "/dashboard";
  const error = first(params.error);
  const notice = first(params.notice);

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
          {error ? <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          {notice ? <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
          <form action={signInAction} className="grid gap-3">
            <input type="hidden" name="next" value={next} />
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="email">
                メール
              </label>
              <Input id="email" name="email" type="email" required autoComplete="email" placeholder="admin@example.com" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="password">
                パスワード
              </label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
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
