"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import {
  AGE_RANGES,
  ATTENDANCE_MODES,
  COUNTRIES,
  COUNTRY_CODES,
  DEFAULT_COUNTRY,
  DEFAULT_COUNTRY_CODE,
  GENDER_OPTIONS,
} from "@/lib/registration/constants";

const selectClass =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

/**
 * @param {{ label: string, error?: string, children: import("react").ReactNode, className?: string }} props
 */
function Field({ label, error, children, className }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
    </div>
  );
}

/**
 * @param {{ conference: { slug: string, title: string, requiresPayment: boolean, subThemes?: string[] } }} props
 */
export function ConferenceRegistrationForm({ conference }) {
  const subThemes = Array.isArray(conference.subThemes) ? conference.subThemes : [];

  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    gender: "",
    ageRange: "",
    countryCode: DEFAULT_COUNTRY_CODE,
    telephone: "",
    countryOfOrigin: DEFAULT_COUNTRY,
    institution: "",
    attendanceMode: "",
    selectedSubThemes: [],
    expectations: "",
    postConferenceEvents: "",
    hasDisability: "",
    disabilityDetails: "",
  });
  const [paymentProof, setPaymentProof] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function toggleSubTheme(theme) {
    setForm((prev) => {
      const selected = prev.selectedSubThemes.includes(theme)
        ? prev.selectedSubThemes.filter((t) => t !== theme)
        : [...prev.selectedSubThemes, theme];
      return { ...prev, selectedSubThemes: selected };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.subThemes;
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSuccess("");
    setLoading(true);
    setErrors({});

    try {
      const body = new FormData();
      body.append("firstName", form.firstName);
      body.append("middleName", form.middleName);
      body.append("lastName", form.lastName);
      body.append("email", form.email);
      body.append("gender", form.gender);
      body.append("ageRange", form.ageRange);
      body.append("countryCode", form.countryCode);
      body.append("telephone", form.telephone);
      body.append("countryOfOrigin", form.countryOfOrigin);
      body.append("institution", form.institution);
      body.append("attendanceMode", form.attendanceMode);
      body.append("subThemes", JSON.stringify(form.selectedSubThemes));
      body.append("expectations", form.expectations);
      body.append("postConferenceEvents", form.postConferenceEvents);
      body.append("hasDisability", form.hasDisability);
      body.append("disabilityDetails", form.disabilityDetails);
      if (paymentProof) body.append("paymentProof", paymentProof);

      const res = await fetch(`/api/conferences/${conference.slug}/register`, {
        method: "POST",
        body,
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        setFormError(data.error ?? "Registration failed. Please check your details.");
        return;
      }

      setSuccess(
        data.message ??
          "Registration received. You will be notified by email once approved.",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary-light p-6">
        <h2 className="text-lg font-semibold text-foreground">Registration submitted</h2>
        <p className="mt-2 text-sm text-muted-foreground">{success}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" href="/login?tab=access">
            Sign in with access key
          </Button>
          <Button variant="ghost" href={`/conferences/${conference.slug}`}>
            Back to conference
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {formError ? (
        <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
          {formError}
        </p>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold text-foreground">Your details</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Input
            label="First name"
            requiredMark
            value={form.firstName}
            onChange={(e) => setField("firstName", e.target.value)}
            error={errors.firstName}
          />
          <Input
            label="Middle name"
            hint="Optional"
            value={form.middleName}
            onChange={(e) => setField("middleName", e.target.value)}
          />
          <Input
            label="Last name"
            requiredMark
            value={form.lastName}
            onChange={(e) => setField("lastName", e.target.value)}
            error={errors.lastName}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Gender *" error={errors.gender}>
            <div className="flex gap-4">
              {GENDER_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="gender"
                    value={opt.value}
                    checked={form.gender === opt.value}
                    onChange={() => setField("gender", opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Age range *" error={errors.ageRange}>
            <select
              value={form.ageRange}
              onChange={(e) => setField("ageRange", e.target.value)}
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
      </section>

      <section>
        <h2 className="text-sm font-semibold text-foreground">Contact</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Input
            label="Email"
            type="email"
            requiredMark
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            error={errors.email}
          />
          <div className="grid gap-4 sm:col-span-1 sm:grid-cols-5">
            <Field label="Code *" error={errors.countryCode} className="sm:col-span-2">
              <select
                value={form.countryCode}
                onChange={(e) => setField("countryCode", e.target.value)}
                className={cn(selectClass, errors.countryCode && "border-error")}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Input
              label="Telephone"
              requiredMark
              className="sm:col-span-3"
              value={form.telephone}
              onChange={(e) => setField("telephone", e.target.value.replace(/\s/g, ""))}
              error={errors.telephone}
              hint="Without leading 0 (e.g. 712345678)"
              inputMode="numeric"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-foreground">Background</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Country of origin *" error={errors.countryOfOrigin}>
            <select
              value={form.countryOfOrigin}
              onChange={(e) => setField("countryOfOrigin", e.target.value)}
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
            label="Institution"
            requiredMark
            value={form.institution}
            onChange={(e) => setField("institution", e.target.value)}
            error={errors.institution}
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-foreground">Conference preferences</h2>
        <div className="mt-3 space-y-4">
          <Field label="Mode of attendance *" error={errors.attendanceMode}>
            <div className="flex gap-4">
              {ATTENDANCE_MODES.map((m) => (
                <label key={m.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="attendanceMode"
                    value={m.value}
                    checked={form.attendanceMode === m.value}
                    onChange={() => setField("attendanceMode", m.value)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </Field>

          {subThemes.length > 0 ? (
            <Field
              label="Sub-theme(s) * — select at least one"
              error={errors.subThemes}
            >
              <div className="flex flex-wrap gap-2">
                {subThemes.map((theme) => (
                  <label
                    key={theme}
                    className={cn(
                      "cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors",
                      form.selectedSubThemes.includes(theme)
                        ? "border-primary bg-primary-light text-primary"
                        : "border-border bg-background text-foreground hover:border-primary/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={form.selectedSubThemes.includes(theme)}
                      onChange={() => toggleSubTheme(theme)}
                    />
                    {theme}
                  </label>
                ))}
              </div>
            </Field>
          ) : null}
        </div>
      </section>

      {conference.requiresPayment ? (
        <section>
          <h2 className="text-sm font-semibold text-foreground">Payment</h2>
          <Field label="Proof of payment *" error={errors.paymentProof} className="mt-3">
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => {
                setPaymentProof(e.target.files?.[0] ?? null);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.paymentProof;
                  return next;
                });
              }}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary-light file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">PDF or image, max 5MB.</p>
          </Field>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold text-foreground">Additional information</h2>
        <div className="mt-3 space-y-4">
          <Field label="What are your expectations for the conference?">
            <textarea
              rows={2}
              value={form.expectations}
              onChange={(e) => setField("expectations", e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              placeholder="Optional — brief answer"
            />
          </Field>

          <Field
            label="Would you wish to attend post-conference events? *"
            error={errors.postConferenceEvents}
          >
            <div className="flex gap-4">
              {["Yes", "No"].map((v) => (
                <label key={v} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="postConferenceEvents"
                    value={v}
                    checked={form.postConferenceEvents === v}
                    onChange={() => setField("postConferenceEvents", v)}
                  />
                  {v}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Do you have any form of disability? *" error={errors.hasDisability}>
            <div className="flex gap-4">
              {["Yes", "No"].map((v) => (
                <label key={v} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="hasDisability"
                    value={v}
                    checked={form.hasDisability === v}
                    onChange={() => {
                      setField("hasDisability", v);
                      if (v === "No") setField("disabilityDetails", "");
                    }}
                  />
                  {v}
                </label>
              ))}
            </div>
          </Field>

          {form.hasDisability === "Yes" ? (
            <Input
              label="Please specify"
              requiredMark
              value={form.disabilityDetails}
              onChange={(e) => setField("disabilityDetails", e.target.value)}
              error={errors.disabilityDetails}
            />
          ) : null}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Submitting…" : "Submit registration"}
        </Button>
        <Link
          href="/login?tab=access"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          Already registered? Sign in
        </Link>
      </div>
    </form>
  );
}
