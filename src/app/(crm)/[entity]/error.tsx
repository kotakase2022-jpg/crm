"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Card>
      <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
        <AlertTriangle className="h-8 w-8 text-rose-600" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold text-slate-950">画面の読み込みに失敗しました</h2>
        <p className="mt-1 max-w-xl whitespace-pre-line text-sm text-slate-500">{error.message}</p>
        <Button className="mt-4" variant="secondary" onClick={reset}>
          再試行
        </Button>
      </CardContent>
    </Card>
  );
}
