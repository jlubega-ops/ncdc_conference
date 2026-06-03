"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Shield, UserMinus, UserPlus } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { GENDER_OPTIONS } from "@/lib/registration/constants";
import { formatAdminDate } from "./AdminTabShell";

/**
 * @param {{ conferenceId: string; canAssign?: boolean }} props
 */
export function ConferenceAdminAdminsTab({ conferenceId, canAssign: canAssignProp }) {
  const [admins, setAdmins] = useState([]);
  const [canAssign, setCanAssign] = useState(Boolean(canAssignProp));
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [mode, setMode] = useState("existing");
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    gender: "M",
  });
  const [unassignTarget, setUnassignTarget] = useState(null);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/admins`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load conference admins.");
      setAdmins(data.admins ?? []);
      if (typeof data.canAssign === "boolean") {
        setCanAssign(data.canAssign || Boolean(canAssignProp));
      }
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

  const fetchCandidates = useCallback(
    async (query) => {
      const q = query.trim();
      if (q.length < 2) {
        setCandidates([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(
          `/api/admin/conferences/${conferenceId}/admins/candidates?q=${encodeURIComponent(q)}`,
        );
        const data = await res.json();
        if (res.ok) {
          setCandidates(data.candidates ?? []);
        } else {
          setCandidates([]);
          toast.error(data.error || "Could not search users.");
        }
      } catch {
        setCandidates([]);
      } finally {
        setSearching(false);
      }
    },
    [conferenceId],
  );

  useEffect(() => {
    if (!canAssign || mode !== "existing") {
      setCandidates([]);
      return;
    }

    const q = searchQuery.trim();
    if (q.length < 2) {
      setCandidates([]);
      return;
    }

    const timer = setTimeout(() => fetchCandidates(q), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, canAssign, mode, fetchCandidates]);

  function markCandidateAssigned(userId, assigned) {
    setCandidates((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, alreadyAssigned: assigned } : u)),
    );
  }

  async function assignExisting(userId) {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not assign admin.");
      setAdmins(data.admins ?? []);
      markCandidateAssigned(userId, true);
      toast.success(data.message || "Conference admin assigned.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign admin.");
    } finally {
      setBusyId(null);
    }
  }

  async function assignNew(event) {
    event.preventDefault();
    setBusyId("new");
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "new", ...newUser }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create admin.");
      setAdmins(data.admins ?? []);
      setNewUser({ email: "", firstName: "", lastName: "", gender: "M" });
      toast.success(data.message || "Conference admin created and assigned.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create admin.");
    } finally {
      setBusyId(null);
    }
  }

  function requestUnassign(userId, displayName, fromSearch = false) {
    setUnassignTarget({ userId, displayName, fromSearch });
  }

  async function confirmUnassign() {
    if (!unassignTarget) return;
    const { userId, fromSearch } = unassignTarget;
    setBusyId(userId);
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/admins?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not unassign admin.");
      setAdmins(data.admins ?? []);
      if (fromSearch) markCandidateAssigned(userId, false);
      toast.success(data.message || "Conference admin unassigned.");
      setUnassignTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not unassign admin.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-primary/20 bg-primary-light/40 px-4 py-3 text-sm text-foreground">
        <p className="font-medium text-primary">Conference admins</p>
        <p className="mt-1 text-muted-foreground">
          Users listed here can manage this conference (registrations, submissions, materials,
          etc.). Super admins can manage all conferences without being listed.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading assigned admins…</p>
      ) : admins.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
          No conference admins assigned to this conference yet.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Assigned ({admins.length})
          </p>
          <ul className="space-y-2">
            {admins.map((admin) => (
              <li
                key={admin.roleId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-primary">
                    {(admin.displayName || admin.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {admin.displayName || admin.name || "—"}
                      </p>
                      {admin.isCurrentUser ? (
                        <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-muted-foreground">
                          You
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{admin.email}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 font-medium",
                          admin.accountActivated
                            ? "bg-primary-light text-primary"
                            : "bg-amber-50 text-amber-900",
                        )}
                      >
                        {admin.accountActivated ? "Account active" : "Pending activation"}
                      </span>
                      <span className="text-muted-foreground">
                        Assigned {formatAdminDate(admin.assignedAt)}
                      </span>
                    </div>
                  </div>
                </div>
                {canAssign ? (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={UserMinus}
                    disabled={busyId === admin.userId}
                    onClick={() =>
                      requestUnassign(
                        admin.userId,
                        admin.displayName || admin.email,
                        false,
                      )
                    }
                  >
                    {busyId === admin.userId ? "Removing…" : "Unassign"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canAssign ? (
        <div className="rounded-lg border border-border bg-background p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Icon icon={UserPlus} size="sm" className="text-primary" />
            Assign conference admin
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "existing"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              Existing user
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "new"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground",
              )}
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
                hint="Search by email (e.g. user@example.com). Super admins can be listed for this conference but already have full system access."
              />
              {searching ? (
                <p className="mt-2 text-xs text-muted-foreground">Searching users…</p>
              ) : null}
              {searchQuery.trim().length >= 2 && !searching && candidates.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No users found.</p>
              ) : null}
              {candidates.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {candidates.map((user) => (
                    <li
                      key={user.id}
                      className="flex items-center gap-3 rounded-md border border-border px-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        {user.alreadyAssigned ? (
                          <p className="mt-1 text-xs font-medium text-primary">
                            Already assigned to this conference
                          </p>
                        ) : null}
                        {user.roles?.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {user.roles.map((r, i) => (
                              <span
                                key={`${r.role}-${i}`}
                                className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                              >
                                {r.label}
                                {r.conferenceTitle ? ` · ${r.conferenceTitle}` : ""}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {user.isSuperadmin ? (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Icon icon={Shield} size="sm" />
                            System super admin
                          </span>
                        ) : null}
                        <div className="flex flex-wrap justify-end gap-2">
                          {user.alreadyAssigned ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                icon={RefreshCw}
                                disabled={busyId === user.id}
                                onClick={() => assignExisting(user.id)}
                              >
                                {busyId === user.id ? "Saving…" : "Reassign"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                icon={UserMinus}
                                disabled={busyId === user.id}
                                onClick={() =>
                                  requestUnassign(
                                    user.id,
                                    user.displayName || user.email,
                                    true,
                                  )
                                }
                              >
                                Unassign
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="primary"
                              icon={UserPlus}
                              className="min-w-22 whitespace-nowrap"
                              disabled={busyId === user.id}
                              onClick={() => assignExisting(user.id)}
                            >
                              {busyId === user.id ? "Assigning…" : "Assign"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <form onSubmit={assignNew} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="First name"
                  requiredMark
                  value={newUser.firstName}
                  onChange={(e) => setNewUser((s) => ({ ...s, firstName: e.target.value }))}
                />
                <Input
                  label="Last name"
                  requiredMark
                  value={newUser.lastName}
                  onChange={(e) => setNewUser((s) => ({ ...s, lastName: e.target.value }))}
                />
              </div>
              <Input
                label="Email"
                type="email"
                requiredMark
                value={newUser.email}
                onChange={(e) => setNewUser((s) => ({ ...s, email: e.target.value }))}
              />
              <div>
                <p className="mb-1.5 text-sm font-medium text-foreground">Gender</p>
                <div className="flex gap-4">
                  {GENDER_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={newUser.gender === opt.value}
                        onChange={() => setNewUser((s) => ({ ...s, gender: opt.value }))}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                A temporary password is emailed; they must change it on first login.
              </p>
              <Button type="submit" icon={UserPlus} disabled={busyId === "new"}>
                {busyId === "new" ? "Creating…" : "Create & assign"}
              </Button>
            </form>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only super admins can assign or unassign conference admins.
        </p>
      )}

      <ConfirmModal
        open={Boolean(unassignTarget)}
        onClose={() => !busyId && setUnassignTarget(null)}
        onConfirm={confirmUnassign}
        title="Unassign conference admin"
        message={
          unassignTarget
            ? `Remove ${unassignTarget.displayName} as conference admin for this conference? They will no longer be able to manage this conference.`
            : ""
        }
        confirmLabel="Unassign"
        cancelLabel="Cancel"
        variant="danger"
        loading={Boolean(unassignTarget && busyId === unassignTarget.userId)}
      />
    </div>
  );
}
