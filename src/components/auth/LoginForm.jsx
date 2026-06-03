"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSession } from "@/components/auth/SessionProvider";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign in failed.");
        return;
      }
      await refreshSession();
      const redirect =
        (typeof searchParams.get("redirect") === "string" && searchParams.get("redirect")) ||
        data.redirect ||
        "/dashboard";
      router.push(redirect);
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
        placeholder="you@institution.ac.ug"
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs text-primary hover:underline">
          Forgot password?
        </Link>
      </div>
      {error ? (
        <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-xs text-muted-foreground">
        New attendees receive a temporary password by email after registering. You must change it
        on first sign-in.
      </p>
    </form>
  );
}
