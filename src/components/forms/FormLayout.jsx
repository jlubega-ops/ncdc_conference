import { cn } from "@/lib/cn";

export const selectClass =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

/**
 * @param {{ label: string; error?: string; children: import("react").ReactNode; className?: string; hint?: string }} props
 */
export function Field({ label, error, children, className, hint }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
    </div>
  );
}

export function FormSection({ title, description, children }) {
  return (
    <section className="rounded-lg border border-border bg-background/80 p-4 sm:p-5">
      <div className="border-b border-border pb-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function radioClass(checked) {
  return cn(
    "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
    checked
      ? "border-primary bg-primary-light text-primary"
      : "border-border bg-background text-foreground hover:border-primary/40",
  );
}
