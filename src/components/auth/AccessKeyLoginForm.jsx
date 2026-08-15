"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSession } from "@/components/auth/SessionProvider";

function normalizeAccessKeyInput(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/\s+/g, "");
}

/** Only allow same-origin relative paths (preserve deep links safely). */
function safeInternalRedirect(value) {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) return null;
  return path;
}

export function AccessKeyLoginForm() {
  const searchParams = useSearchParams();
  const { refreshSession } = useSession();
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessKey: normalizeAccessKeyInput(accessKey),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Access verification failed.");
        return;
      }
      await refreshSession();
      const redirect =
        safeInternalRedirect(searchParams.get("redirect")) ||
        safeInternalRedirect(data.redirect) ||
        "/dashboard";
      window.location.assign(redirect);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Access code"
        name="accessKey"
        type="text"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
        value={accessKey}
        onChange={(e) => setAccessKey(normalizeAccessKeyInput(e.target.value))}
        className="font-mono uppercase tracking-wide"
        hint="From your email — 4 characters, letters and numbers (no I, O, 0, 1, or L)"
        placeholder="e.g. A7K3"
        autoFocus
      />
      {error ? (
        <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" className="w-full" disabled={loading}>
        {loading ? "Verifying…" : "Open conference"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Each access code opens one conference. Codes are unique across the platform. Only one login
        session can be active at a time.
      </p>
      <p className="text-xs text-muted-foreground">
        Enter the short code from your email in uppercase. Ambiguous characters (I, O, 0, 1, L) are
        never used.
      </p>
    </form>
  );
}
