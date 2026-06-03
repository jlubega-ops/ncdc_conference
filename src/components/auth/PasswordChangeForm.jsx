"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * @param {{
 *   mustChangePassword?: boolean;
 *   onSuccess?: () => void | Promise<void>;
 *   submitLabel?: string;
 *   compact?: boolean;
 * }} props
 */
export function PasswordChangeForm({
  mustChangePassword = false,
  onSuccess,
  submitLabel = "Save password",
  compact = false,
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update password.");
        return;
      }
      await onSuccess?.();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-3" : "space-y-4"}>
      <Input
        label={mustChangePassword ? "Temporary password" : "Current password"}
        type="password"
        required
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <Input
        label="New password"
        type="password"
        required
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        hint="At least 8 characters"
      />
      <Input
        label="Confirm new password"
        type="password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {error ? (
        <p className="rounded-md bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
      ) : null}
      <Button type="submit" variant="primary" className="w-full" disabled={loading}>
        {loading ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
