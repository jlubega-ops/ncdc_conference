import { cn } from "@/lib/cn";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function parseTimeValue(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return { hour: "", minute: "" };
  return {
    hour: String(Math.min(23, Number(match[1]))).padStart(2, "0"),
    minute: String(Math.min(59, Number(match[2]))).padStart(2, "0"),
  };
}

/**
 * 24-hour time picker (HH:mm). Avoids OS AM/PM time inputs.
 * @param {{
 *   label?: string;
 *   error?: string;
 *   hint?: string;
 *   requiredMark?: boolean;
 *   id?: string;
 *   name?: string;
 *   value?: string;
 *   disabled?: boolean;
 *   onChange?: (value: string) => void;
 *   className?: string;
 * }} props
 */
export function TimeInput({
  label,
  requiredMark,
  error,
  hint,
  className,
  id,
  name,
  value = "",
  disabled = false,
  onChange,
}) {
  const inputId = id ?? name;
  const { hour, minute } = parseTimeValue(value);

  function emit(nextHour, nextMinute) {
    if (!nextHour && !nextMinute) {
      onChange?.("");
      return;
    }
    const h = nextHour || "00";
    const m = nextMinute || "00";
    onChange?.(`${h}:${m}`);
  }

  const selectClass = cn(
    "h-10 min-w-0 flex-1 bg-transparent px-1.5 text-sm text-foreground",
    "focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
  );

  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
          {requiredMark ? <span className="text-error"> *</span> : null}
        </label>
      ) : null}
      <div
        className={cn(
          "flex h-10 w-full items-center rounded-md border border-border bg-surface px-1",
          "focus-within:ring-2 focus-within:ring-primary/30",
          error && "border-error focus-within:ring-error/30",
          disabled && "opacity-50",
        )}
      >
        <select
          id={inputId}
          name={name ? `${name}-hour` : undefined}
          aria-label={label ? `${label} hour` : "Hour"}
          className={selectClass}
          value={hour}
          disabled={disabled}
          onChange={(e) => emit(e.target.value, minute)}
        >
          <option value="">HH</option>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="shrink-0 text-sm font-medium text-muted-foreground" aria-hidden>
          :
        </span>
        <select
          name={name ? `${name}-minute` : undefined}
          aria-label={label ? `${label} minute` : "Minute"}
          className={selectClass}
          value={minute}
          disabled={disabled}
          onChange={(e) => emit(hour, e.target.value)}
        >
          <option value="">mm</option>
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="mt-1.5 text-xs text-error">{error}</p> : null}
      {hint && !error ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
