"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { PublicFormLayout } from "@/components/layout/PublicFormLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed.");
        return;
      }
      setMessage(data.message);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicFormLayout
      maxWidth="md"
      eyebrow="Account"
      title="Reset password"
      subtitle="Enter your email and we will send a reset link if an account exists."
      footer={
        <Link href="/login" className="font-medium hover:text-primary">
          ← Back to sign in
        </Link>
      }
    >
      <div className="mb-6 flex justify-center">
        <Logo size="lg" linkToHome showText={false} />
      </div>
      {message ? (
        <p className="rounded-md bg-primary-light px-3 py-2 text-sm text-primary">{message}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error ? (
            <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
          ) : null}
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </PublicFormLayout>
  );
}
