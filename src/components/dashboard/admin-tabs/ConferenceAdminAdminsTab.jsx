"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatAdminDate } from "./AdminTabShell";

/**
 * @param {{ conferenceId: string, canAssign: boolean }} props
 */
export function ConferenceAdminAdminsTab({ conferenceId, canAssign }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [mode, setMode] = useState("existing");
  const [newUser, setNewUser] = useState({ email: "", name: "", password: "" });

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/admins`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load conference admins.");
      setAdmins(data.admins ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load conference admins.");
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  useEffect(() => {
    if (!canAssign || mode !== "existing") {
      setSearchResults([]);
      return;
    }

    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (res.ok) setSearchResults(data.users ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, canAssign, mode]);

  async function assignExisting(userId) {
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not assign admin.");
      setAdmins(data.admins ?? []);
      setSearchQuery("");
      setSearchResults([]);
      toast.success(data.message || "Conference admin assigned.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign admin.");
    } finally {
      setAssigning(false);
    }
  }

  async function assignNew(event) {
    event.preventDefault();
    setAssigning(true);
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "new", ...newUser }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create admin.");
      setAdmins(data.admins ?? []);
      setNewUser({ email: "", name: "", password: "" });
      toast.success(data.message || "Conference admin created and assigned.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create admin.");
    } finally {
      setAssigning(false);
    }
  }

  async function removeAdmin(userId) {
    if (!window.confirm("Remove this user as conference admin?")) return;
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/admins?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not remove admin.");
      setAdmins((prev) => prev.filter((a) => a.userId !== userId));
      toast.success(data.message || "Conference admin removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove admin.");
    }
  }

  const assignedIds = new Set(admins.map((a) => a.userId));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Conference admins can only view and manage conferences they are assigned to.
      </p>

      {canAssign ? (
        <div className="rounded-md border border-border bg-background p-4">
          <h3 className="text-sm font-semibold text-foreground">Assign conference admin</h3>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                mode === "existing"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              Existing user
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                mode === "new"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              Create new user
            </button>
          </div>

          {mode === "existing" ? (
            <div className="mt-4">
              <Input
                label="Search by email or name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type at least 2 characters…"
              />
              {searching ? (
                <p className="mt-2 text-xs text-muted-foreground">Searching…</p>
              ) : null}
              {searchResults.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {searchResults.map((user) => (
                    <li
                      key={user.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {user.name || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      {assignedIds.has(user.id) ? (
                        <span className="text-xs text-muted-foreground">Already assigned</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          icon={UserPlus}
                          disabled={assigning}
                          onClick={() => assignExisting(user.id)}
                        >
                          Assign
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <form onSubmit={assignNew} className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input
                label="Email"
                type="email"
                required
                value={newUser.email}
                onChange={(e) => setNewUser((s) => ({ ...s, email: e.target.value }))}
              />
              <Input
                label="Full name"
                value={newUser.name}
                onChange={(e) => setNewUser((s) => ({ ...s, name: e.target.value }))}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Password"
                  type="password"
                  required
                  hint="Minimum 8 characters. Used for staff login."
                  value={newUser.password}
                  onChange={(e) => setNewUser((s) => ({ ...s, password: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" icon={UserPlus} disabled={assigning}>
                  Create and assign
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading conference admins…</p>
      ) : admins.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
          No conference admins assigned yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-background">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Admin
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Assigned
                </th>
                {canAssign ? (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {admins.map((admin) => (
                <tr key={admin.userId}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{admin.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatAdminDate(admin.assignedAt)}
                  </td>
                  {canAssign ? (
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={X}
                        onClick={() => removeAdmin(admin.userId)}
                      >
                        Remove
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
