"use client";

import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import {
  AGE_RANGES,
  ATTENDANCE_MODES,
  COUNTRIES,
  COUNTRY_CODES,
  GENDER_OPTIONS,
} from "@/lib/registration/constants";
import { Field, FormSection, selectClass } from "@/components/forms/FormLayout";

/**
 * @param {{
 *   values: Record<string, string>;
 *   errors?: Record<string, string>;
 *   onChange: (name: string, value: string) => void;
 *   email?: string;
 *   onEmailChange?: (value: string) => void;
 *   emailReadOnly?: boolean;
 *   showEmail?: boolean;
 *   disabled?: boolean;
 * }} props
 */
export function UserProfileFields({
  values,
  errors = {},
  onChange,
  email = "",
  onEmailChange,
  emailReadOnly = false,
  showEmail = true,
  disabled = false,
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0 border-0 p-0">
      <FormSection title="Your details">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="First name"
            requiredMark
            value={values.firstName ?? ""}
            onChange={(e) => onChange("firstName", e.target.value)}
            error={errors.firstName}
          />
          <Input
            label="Middle name"
            hint="Optional"
            value={values.middleName ?? ""}
            onChange={(e) => onChange("middleName", e.target.value)}
          />
          <Input
            label="Last name"
            requiredMark
            value={values.lastName ?? ""}
            onChange={(e) => onChange("lastName", e.target.value)}
            error={errors.lastName}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Gender *" error={errors.gender}>
            <div className="flex gap-3">
              {GENDER_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="gender"
                    value={opt.value}
                    checked={values.gender === opt.value}
                    onChange={() => onChange("gender", opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Age range *" error={errors.ageRange}>
            <select
              value={values.ageRange ?? ""}
              onChange={(e) => onChange("ageRange", e.target.value)}
              className={cn(selectClass, errors.ageRange && "border-error")}
            >
              <option value="">Select…</option>
              {AGE_RANGES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      {showEmail ? (
        <FormSection title="Contact">
          <Input
            label="Email"
            type="email"
            requiredMark
            value={email}
            readOnly={emailReadOnly}
            disabled={emailReadOnly}
            onChange={
              emailReadOnly || !onEmailChange
                ? undefined
                : (e) => onEmailChange(e.target.value)
            }
            error={errors.email}
            hint={emailReadOnly ? "Email cannot be changed here." : undefined}
            className={emailReadOnly ? "bg-neutral-50" : undefined}
          />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Field label="Country code *" error={errors.countryCode} className="w-full sm:w-48 shrink-0">
              <select
                value={values.countryCode ?? ""}
                onChange={(e) => onChange("countryCode", e.target.value)}
                className={cn(selectClass, errors.countryCode && "border-error")}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="min-w-0 flex-1">
              <Input
                label="Telephone"
                requiredMark
                value={values.telephone ?? ""}
                onChange={(e) => onChange("telephone", e.target.value.replace(/\s/g, ""))}
                error={errors.telephone}
                hint="Without leading 0 (e.g. 712345678)"
                inputMode="numeric"
              />
            </div>
          </div>
        </FormSection>
      ) : (
        <FormSection title="Contact">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Field label="Country code *" error={errors.countryCode} className="w-full sm:w-48 shrink-0">
              <select
                value={values.countryCode ?? ""}
                onChange={(e) => onChange("countryCode", e.target.value)}
                className={cn(selectClass, errors.countryCode && "border-error")}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="min-w-0 flex-1">
              <Input
                label="Telephone"
                requiredMark
                value={values.telephone ?? ""}
                onChange={(e) => onChange("telephone", e.target.value.replace(/\s/g, ""))}
                error={errors.telephone}
                hint="Without leading 0"
                inputMode="numeric"
              />
            </div>
          </div>
        </FormSection>
      )}

      <FormSection title="Background">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Country of origin *" error={errors.countryOfOrigin}>
            <select
              value={values.countryOfOrigin ?? ""}
              onChange={(e) => onChange("countryOfOrigin", e.target.value)}
              className={cn(selectClass, errors.countryOfOrigin && "border-error")}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Input
            label="Organisation"
            requiredMark
            value={values.institution ?? ""}
            onChange={(e) => onChange("institution", e.target.value)}
            error={errors.institution}
          />
        </div>
        <Field label="Preferred mode of attendance" error={errors.attendanceMode}>
          <div className="flex gap-4">
            {ATTENDANCE_MODES.map((m) => (
              <label key={m.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="attendanceMode"
                  value={m.value}
                  checked={values.attendanceMode === m.value}
                  onChange={() => onChange("attendanceMode", m.value)}
                />
                {m.label}
              </label>
            ))}
          </div>
        </Field>
      </FormSection>
    </fieldset>
  );
}
