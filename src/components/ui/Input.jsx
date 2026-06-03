import { cn } from "@/lib/cn";

/**
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {string} [props.hint]
 */
export function Input({
  label,
  requiredMark,
  error,
  hint,
  className,
  id,
  ...props
}) {
  const inputId = id ?? props.name;

  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
          {requiredMark ? <span className="text-error"> *</span> : null}
        </label>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-error focus-visible:ring-error/30",
          className,
        )}
        {...props}
      />
      {error ? <p className="mt-1.5 text-xs text-error">{error}</p> : null}
      {hint && !error ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
