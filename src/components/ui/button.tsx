import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-slate-950 text-white hover:bg-slate-800",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  ghost: "text-slate-600 hover:bg-slate-100",
};

export function buttonClassName(variant: keyof typeof variants = "primary", className?: string) {
  return cn(
    "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    className,
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <button
      className={buttonClassName(variant, className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  className,
  variant = "primary",
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <a
      className={buttonClassName(variant, className)}
      {...props}
    >
      {children}
    </a>
  );
}
