"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { rankOrganisationMatches } from "@/lib/organisations/match";

/**
 * Text field with local organisation suggestions (no per-keystroke API).
 * @param {{
 *   label?: string;
 *   hint?: string;
 *   error?: string;
 *   value: string;
 *   onChange: (value: string) => void;
 *   organisations?: string[];
 *   disabled?: boolean;
 * }} props
 */
export function OrganisationSuggestInput({
  label = "Organisation",
  hint = "Optional",
  error,
  value,
  onChange,
  organisations = [],
  disabled = false,
}) {
  const [open, setOpen] = useState(false);

  const matches = useMemo(
    () => rankOrganisationMatches(value, organisations),
    [value, organisations],
  );

  const showList = open && !disabled && matches.length > 0 && matches[0] !== value;

  return (
    <div className="relative w-full">
      <Input
        label={label}
        hint={showList ? undefined : hint}
        error={error}
        value={value}
        disabled={disabled}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        onChange={(e) => {
          setOpen(true);
          onChange(e.target.value);
        }}
      />
      {showList ? (
        <ul
          className={cn(
            "absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-surface py-1 shadow-md",
          )}
          role="listbox"
        >
          {matches.map((org) => (
            <li key={org}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-primary-light"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(org);
                  setOpen(false);
                }}
              >
                {org}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
