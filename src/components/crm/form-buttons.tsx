"use client";

import { Save } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SaveSubmitButton({
  idleLabel = "保存",
  pendingLabel = "保存中...",
}: {
  idleLabel?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      <Save className="h-4 w-4" aria-hidden />
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

export function ConfirmSubmitButton({
  children,
  confirmMessage,
  pendingLabel = "処理中...",
  variant = "danger",
}: {
  children: React.ReactNode;
  confirmMessage: string;
  pendingLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      aria-disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
