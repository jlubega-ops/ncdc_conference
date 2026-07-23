"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSession } from "@/components/auth/SessionProvider";

function normalizeAccessKeyInput(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function AccessKeyLoginForm() {
  const router = useRouter();
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
      router.push(data.redirect ?? "/dashboard");
      router.refresh();
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
        hint="From your email, e.g. ORG/CONF2027/XXXXXXXX — entered in all caps"
        placeholder="ORG/CONF2027/XXXXXXXX"
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
        Each access code opens one conference. Only one login session can be active at a time.
      </p>
      <p className="text-xs text-muted-foreground">
        Format: ORG/CONF[YEAR]/[CODE] (all uppercase). Characters avoid 0, O, 1, I, and L.
      </p>
    </form>
  );
}
