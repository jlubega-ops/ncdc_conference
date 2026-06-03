"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSession } from "@/components/auth/SessionProvider";

export function AccessKeyLoginForm() {
  const router = useRouter();
  const { refreshSession } = useSession();
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ email, accessKey }),
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
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        hint="Use the email you registered with."
      />
      <Input
        label="Access key"
        name="accessKey"
        type="text"
        autoComplete="off"
        required
        value={accessKey}
        onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
        hint="Full key from your approval email, e.g. NCDC/Conf2027/ABCDEFGH"
        placeholder="NCDC/Conf2027/XXXXXXXX"
      />
      {error ? (
        <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" className="w-full" disabled={loading}>
        {loading ? "Verifying…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/login/signup" className="font-medium text-primary hover:underline">
          Register for a conference
        </Link>
      </p>
      <p className="text-xs text-muted-foreground">
        Keys use the format NCDC/Conf[year]/[code] in uppercase. Characters are chosen to avoid
        confusion (no 0, O, 1, or I).
      </p>
    </form>
  );
}
