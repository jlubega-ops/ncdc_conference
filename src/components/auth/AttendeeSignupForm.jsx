"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * @param {{ conferences?: Array<{ id: string, slug: string, title: string, year: number, dateRange?: string, status: string }>, defaultConferenceId?: string }} props
 */
export function AttendeeSignupForm({ conferences: initialConferences = [], defaultConferenceId = "" }) {
  const [conferences, setConferences] = useState(initialConferences);
  const [conferenceId, setConferenceId] = useState(
    defaultConferenceId || initialConferences[0]?.id || "",
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialConferences.length > 0) return;
    fetch("/api/conferences/registrable")
      .then((res) => res.json())
      .then((data) => {
        const list = data.conferences ?? [];
        setConferences(list);
        if (list.length === 0) return;
        const preferred =
          defaultConferenceId && list.some((c) => c.id === defaultConferenceId)
            ? defaultConferenceId
            : list[0].id;
        setConferenceId((current) => current || preferred);
      })
      .catch(() => setConferences([]));
  }, [initialConferences.length, defaultConferenceId]);

  useEffect(() => {
    if (defaultConferenceId && conferences.some((c) => c.id === defaultConferenceId)) {
      setConferenceId(defaultConferenceId);
    }
  }, [defaultConferenceId, conferences]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, conferenceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign-up failed.");
        return;
      }
      setSuccess(data.message ?? "Sign-up successful.");
      setEmail("");
      setName("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="w-full">
        <label htmlFor="signup-conference" className="mb-1.5 block text-sm font-medium text-foreground">
          Conference <span className="text-error">*</span>
        </label>
        <select
          id="signup-conference"
          name="conference"
          required
          value={conferenceId}
          onChange={(e) => setConferenceId(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {conferences.length === 0 ? (
            <option value="">No upcoming or running conferences available</option>
          ) : (
            conferences.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.status === "running" ? "Running" : "Upcoming"})
                {c.dateRange ? ` — ${c.dateRange}` : ""}
              </option>
            ))
          )}
        </select>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Only upcoming and currently running conferences accept new sign-ups. Ended conferences are
          not listed.
        </p>
      </div>
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label="Full name"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        hint="Optional. Helps organizers identify your registration."
      />
      {error ? (
        <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md bg-primary-light px-3 py-2 text-sm text-primary" role="status">
          {success}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={loading || conferences.length === 0}
      >
        {loading ? "Submitting…" : "Sign up"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an access key?{" "}
        <Link href="/access" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
