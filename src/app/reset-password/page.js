"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { PublicFormLayout } from "@/components/layout/PublicFormLayout";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Reset failed.");
        return;
      }
      router.push("/login");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <PublicFormLayout
        maxWidth="md"
        title="Invalid link"
        subtitle="This password reset link is missing or invalid."
        footer={
          <Link href="/forgot-password" className="font-medium hover:text-primary">
            Request a new link
          </Link>
        }
      >
        <div className="flex justify-center">
          <Logo size="lg" linkToHome showText={false} />
        </div>
      </PublicFormLayout>
    );
  }

  return (
    <PublicFormLayout
      maxWidth="md"
      eyebrow="Account"
      title="Choose a new password"
      footer={
        <Link href="/login" className="font-medium hover:text-primary">
          ← Back to sign in
        </Link>
      }
    >
      <div className="mb-6 flex justify-center">
        <Logo size="lg" linkToHome showText={false} />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="New password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters"
        />
        <Input
          label="Confirm password"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error ? (
          <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
        ) : null}
        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? "Saving…" : "Update password"}
        </Button>
      </form>
    </PublicFormLayout>
  );
}
