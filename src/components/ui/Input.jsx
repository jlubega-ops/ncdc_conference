"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/**
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {string} [props.hint]
 * @param {string} [props.type]
 */
export function Input({
  label,
  requiredMark,
  error,
  hint,
  className,
  id,
  type = "text",
  ...props
}) {
  const inputId = id ?? props.name;
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);
  const inputType = isPassword ? (visible ? "text" : "password") : type;

  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
          {requiredMark ? <span className="text-error"> *</span> : null}
        </label>
      ) : null}
      <div className={isPassword ? "relative" : undefined}>
        <input
          id={inputId}
          type={inputType}
          className={cn(
            "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-error focus-visible:ring-error/30",
            isPassword && "pr-10",
            className,
          )}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            onClick={() => setVisible((open) => !open)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            title={visible ? "Hide password" : "Show password"}
          >
            <Icon icon={visible ? EyeOff : Eye} size="sm" />
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-1.5 text-xs text-error">{error}</p> : null}
      {hint && !error ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
