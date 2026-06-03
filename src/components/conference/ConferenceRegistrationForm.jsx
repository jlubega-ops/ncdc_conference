"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field, FormSection } from "@/components/forms/FormLayout";
import { UserProfileFields } from "@/components/forms/UserProfileFields";
import { cn } from "@/lib/cn";
import { DEFAULT_COUNTRY, DEFAULT_COUNTRY_CODE } from "@/lib/registration/constants";

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
  const [prefillNote, setPrefillNote] = useState("");
  const prefillTimer = useRef(null);

  useEffect(() => {
    const email = form.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setPrefillNote("");
      return;
    }

    if (prefillTimer.current) clearTimeout(prefillTimer.current);
    prefillTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/registration/prefill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok || !data.prefill) return;

        setForm((prev) => ({
          ...prev,
          firstName: prev.firstName || data.prefill.firstName || "",
          middleName: prev.middleName || data.prefill.middleName || "",
          lastName: prev.lastName || data.prefill.lastName || "",
          gender: prev.gender || data.prefill.gender || "",
          ageRange: prev.ageRange || data.prefill.ageRange || "",
          countryCode: prev.countryCode || data.prefill.countryCode || DEFAULT_COUNTRY_CODE,
          telephone: prev.telephone || data.prefill.telephone || "",
          countryOfOrigin:
            prev.countryOfOrigin || data.prefill.countryOfOrigin || DEFAULT_COUNTRY,
          institution: prev.institution || data.prefill.institution || "",
          attendanceMode: prev.attendanceMode || data.prefill.attendanceMode || "",
        }));
        setPrefillNote(
          "We found an existing account for this email. Your saved details were filled in — complete any missing fields and conference-specific sections.",
        );
      } catch {
        /* ignore */
      }
    }, 500);

    return () => {
      if (prefillTimer.current) clearTimeout(prefillTimer.current);
    };
  }, [form.email]);

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
        if (data.redirect) {
          setSuccess(data.error ? "" : (data.message ?? ""));
        }
        return;
      }

      setSuccess({
        message:
          data.message ??
          "Registration received. Check your email for sign-in details. Your application is pending approval.",
        redirect: data.redirect ?? null,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    const message = typeof success === "string" ? success : success.message;
    const loginHref = typeof success === "object" && success.redirect ? success.redirect : "/login";
    return (
      <div className="rounded-lg border border-primary/30 bg-primary-light p-6">
        <h2 className="text-lg font-semibold text-foreground">Registration submitted</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" href={loginHref}>
            Sign in
          </Button>
          <Button variant="ghost" href={`/conferences/${conference.slug}`}>
            Back to conference
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {formError ? (
        <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
          {formError}
        </p>
      ) : null}

      {prefillNote ? (
        <p className="rounded-md border border-primary/25 bg-primary-light px-4 py-3 text-sm text-primary">
          {prefillNote}
        </p>
      ) : null}

      <UserProfileFields
        values={form}
        errors={errors}
        onChange={setField}
        email={form.email}
        onEmailChange={(value) => setField("email", value)}
      />

      <FormSection title="Conference preferences">
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
      </FormSection>

      {conference.requiresPayment ? (
        <FormSection title="Payment">
          <Field label="Proof of payment *" error={errors.paymentProof}>
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
        </FormSection>
      ) : null}

      <FormSection title="Additional information">
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
      </FormSection>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-primary-light/40 px-4 py-4">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Submitting…" : "Submit registration"}
        </Button>
        <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
          Already have an account? Sign in
        </Link>
      </div>
    </form>
  );
}
