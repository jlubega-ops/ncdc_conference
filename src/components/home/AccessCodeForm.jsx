"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * Enter conference code / reference to open an event.
 */
export function AccessCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/conferences/lookup?code=${encodeURIComponent(code.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Conference not found.");
        return;
      }
      router.push(data.conference.href);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Conference code"
        name="code"
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="e.g. K7M2P-2027"
        hint="Exact code or reference from your invitation."
        autoFocus
      />
      {error ? (
        <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" className="w-full" disabled={loading} icon={KeyRound}>
        {loading ? "Opening…" : "Open conference"}
      </Button>
    </form>
  );
}
