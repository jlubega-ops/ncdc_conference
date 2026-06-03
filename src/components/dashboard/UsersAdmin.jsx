"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Loader2, Mail, Pencil, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Icon } from "@/components/ui/Icon";
import { Field, FormSection } from "@/components/forms/FormLayout";
import { cn } from "@/lib/cn";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { GENDER_OPTIONS } from "@/lib/registration/constants";
import { formatAdminDate } from "@/components/dashboard/admin-tabs/AdminTabShell";
import { AdminListFilters } from "@/components/dashboard/admin-tabs/AdminListFilters";
import { genderLabel } from "@/lib/users/profile";

const ASSIGNABLE_ROLES = ["SUPERADMIN", "CONFERENCE_ADMIN", "REVIEWER", "ATTENDEE"];

const EMPTY_FORM = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  gender: "",
  roles: [],
  conferenceIds: [],
};

/**
 * @param {any} user
 */
function userToForm(user) {
  return {
    firstName: user.profile?.firstName ?? "",
    middleName: user.profile?.middleName ?? "",
    lastName: user.profile?.lastName ?? "",
    email: user.email ?? "",
    gender: user.profile?.gender ?? "",
    roles: [...new Set(user.roles.map((r) => r.role))],
    conferenceIds: [
      ...new Set(
        user.roles.filter((r) => r.conferenceId).map((r) => r.conferenceId),
      ),
    ],
  };
}

/**
 * @param {any} user
 * @param {{ search: string; accountFilter: string; roleFilter: string; conferenceFilter: string }} filters
 */
function userMatchesFilters(user, filters) {
  const { search, accountFilter, roleFilter, conferenceFilter } = filters;
  if (accountFilter === "active" && !user.accountActivated) return false;
  if (accountFilter === "pending" && user.accountActivated) return false;
  if (roleFilter !== "all") {
    const roles = user.roles.map((r) => r.role);
    if (!roles.includes(roleFilter)) return false;
  }
  if (conferenceFilter !== "all") {
    const hasConference = user.roles.some((r) => r.conferenceId === conferenceFilter);
    if (!hasConference) return false;
  }
  const q = search.trim().toLowerCase();
  if (q) {
    const text = [
      user.name,
      user.email,
      user.profile?.firstName,
      user.profile?.lastName,
      user.profile?.middleName,
      ...user.roles.map((r) => ROLE_LABELS[r.role] ?? r.role),
      ...user.roles.map((r) => r.conference?.title),
      genderLabel(user.profile?.gender),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!text.includes(q)) return false;
  }
  return true;
}

export function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [resendTarget, setResendTarget] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [conferenceFilter, setConferenceFilter] = useState("all");

  const filters = useMemo(
    () => ({ search, accountFilter, roleFilter, conferenceFilter }),
    [search, accountFilter, roleFilter, conferenceFilter],
  );

  const filteredUsers = useMemo(
    () => users.filter((user) => userMatchesFilters(user, filters)),
    [users, filters],
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    accountFilter !== "all" ||
    roleFilter !== "all" ||
    conferenceFilter !== "all";

  function clearFilters() {
    setSearch("");
    setAccountFilter("all");
    setRoleFilter("all");
    setConferenceFilter("all");
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, confRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/users/conferences"),
      ]);
      const usersData = await usersRes.json();
      const confData = await confRes.json();
      if (!usersRes.ok) throw new Error(usersData.error || "Could not load users.");
      setUsers(usersData.users ?? []);
      if (confRes.ok) setConferences(confData.conferences ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function closeFormModal() {
    setShowCreate(false);
    setEditingUser(null);
    setErrors({});
    setForm(EMPTY_FORM);
  }

  function openCreate() {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowCreate(true);
  }

  /**
   * @param {any} user
   */
  function openEdit(user) {
    setShowCreate(false);
    setEditingUser(user);
    setForm(userToForm(user));
    setErrors({});
  }

  function toggleRole(role) {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.roles;
      return next;
    });
  }

  function toggleConference(id) {
    setForm((prev) => ({
      ...prev,
      conferenceIds: prev.conferenceIds.includes(id)
        ? prev.conferenceIds.filter((c) => c !== id)
        : [...prev.conferenceIds, id],
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.conferenceIds;
      return next;
    });
  }

  const needsConference = form.roles.some((r) =>
    ["CONFERENCE_ADMIN", "REVIEWER"].includes(r),
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const isEdit = Boolean(editingUser);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/users/${editingUser.id}` : "/api/admin/users",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        throw new Error(data.error || (isEdit ? "Could not update user." : "Could not create user."));
      }
      toast.success(data.message || (isEdit ? "User updated." : "User created."));
      closeFormModal();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmResendActivation() {
    if (!resendTarget) return;
    setResendingId(resendTarget.id);
    try {
      const res = await fetch(`/api/admin/users/${resendTarget.id}/resend-activation`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not resend activation.");
      toast.success(data.message || "Activation email sent with a new temporary password.");
      setResendTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resend activation.");
    } finally {
      setResendingId(null);
    }
  }

  async function confirmDeleteUser() {
    if (!userToDelete) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete user.");
      toast.success(data.message || "User deleted.");
      setUserToDelete(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete user.");
    } finally {
      setBusy(false);
    }
  }

  function renderUserForm() {
    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSection title="Account details">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="First name"
              requiredMark
              value={form.firstName}
              onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
              error={errors.firstName}
            />
            <Input
              label="Middle name"
              hint="Optional"
              value={form.middleName}
              onChange={(e) => setForm((p) => ({ ...p, middleName: e.target.value }))}
            />
            <Input
              label="Last name"
              requiredMark
              value={form.lastName}
              onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
              error={errors.lastName}
            />
          </div>
          <Input
            label="Email"
            type="email"
            requiredMark
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            error={errors.email}
          />
          <Field label="Gender *" error={errors.gender}>
            <div className="flex gap-4">
              {GENDER_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={form.gender === opt.value}
                    onChange={() => setForm((p) => ({ ...p, gender: opt.value }))}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </Field>
        </FormSection>

        <FormSection
          title="Roles"
          description="Select one or more roles. Conference admin and reviewer require conference assignment."
        >
          <div className="flex flex-wrap gap-2">
            {ASSIGNABLE_ROLES.map((role) => (
              <label
                key={role}
                className={cn(
                  "cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  form.roles.includes(role)
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border hover:border-primary/40",
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={form.roles.includes(role)}
                  onChange={() => toggleRole(role)}
                />
                {ROLE_LABELS[role]}
              </label>
            ))}
          </div>
          {errors.roles ? <p className="text-xs text-error">{errors.roles}</p> : null}
        </FormSection>

        {needsConference ? (
          <FormSection title="Conference assignment">
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-3">
              {conferences.length === 0 ? (
                <p className="text-sm text-muted-foreground">No conferences available.</p>
              ) : (
                conferences.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.conferenceIds.includes(c.id)}
                      onChange={() => toggleConference(c.id)}
                    />
                    {c.title}
                  </label>
                ))
              )}
            </div>
            {errors.conferenceIds ? (
              <p className="mt-1 text-xs text-error">{errors.conferenceIds}</p>
            ) : null}
          </FormSection>
        ) : null}

        {!editingUser ? (
          <p className="text-xs text-muted-foreground">
            The user receives an email with a temporary password and must change it on first
            login.
          </p>
        ) : editingUser.accountActivated ? (
          <p className="text-xs text-muted-foreground">
            This account is already activated. Editing details does not reset their password.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Account is still pending activation. Use &quot;Resend activation&quot; to send a new
            temporary password.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" disabled={busy}>
            {busy
              ? editingUser
                ? "Saving…"
                : "Creating…"
              : editingUser
                ? "Save changes"
                : "Create user & send activation"}
          </Button>
          <Button type="button" variant="outline" onClick={closeFormModal} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage accounts, roles, and activation emails.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Icon icon={UserPlus} size="sm" />
          Add user
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : (
        <>
          <AdminListFilters
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by name, email, or role…"
            extraSelects={[
              {
                value: roleFilter,
                onChange: setRoleFilter,
                allLabel: "All roles",
                ariaLabel: "Filter by role",
                options: ASSIGNABLE_ROLES.map((role) => ({
                  value: role,
                  label: ROLE_LABELS[role] ?? role,
                })),
              },
              {
                value: conferenceFilter,
                onChange: setConferenceFilter,
                allLabel: "All conferences",
                ariaLabel: "Filter by conference",
                options: conferences.map((c) => ({
                  value: c.id,
                  label: c.title,
                })),
              },
            ]}
            trailing={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Clear filters
                </button>
              ) : null
            }
          />
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {[
              { value: "all", label: "All accounts" },
              { value: "active", label: "Active" },
              { value: "pending", label: "Pending activation" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAccountFilter(opt.value)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  accountFilter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-neutral-100 text-muted-foreground hover:bg-neutral-200",
                )}
              >
                {opt.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">
              {filteredUsers.length === users.length
                ? `${users.length} user${users.length === 1 ? "" : "s"}`
                : `Showing ${filteredUsers.length} of ${users.length}`}
            </span>
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border bg-neutral-50/80 text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No users yet.
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No users match your filters.{" "}
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="font-medium text-primary hover:underline"
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isResending = resendingId === user.id;
                  return (
                    <tr key={user.id}>
                      <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {genderLabel(user.profile?.gender) || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {[...new Set(user.roles.map((r) => r.role))].map((role) => (
                            <span
                              key={role}
                              className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-medium text-primary"
                            >
                              {ROLE_LABELS[role] ?? role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                            user.accountActivated
                              ? "border-primary/25 bg-primary-light text-primary"
                              : "border-amber-200 bg-amber-50 text-amber-900",
                          )}
                        >
                          {user.accountActivated ? "Active" : "Pending activation"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatAdminDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {!user.accountActivated ? (
                            <Button
                              size="sm"
                              variant="outline"
                              icon={isResending ? Loader2 : Mail}
                              disabled={Boolean(resendingId)}
                              onClick={() => setResendTarget(user)}
                              aria-label={`Resend activation email to ${user.email}`}
                              className={isResending ? "[&_svg]:animate-spin" : undefined}
                            >
                              {isResending ? "Sending…" : "Resend activation"}
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Pencil}
                            onClick={() => openEdit(user)}
                            aria-label={`Edit ${user.name}`}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Trash2}
                            onClick={() => setUserToDelete(user)}
                            aria-label={`Delete ${user.name}`}
                            className="text-error hover:bg-error/10 hover:text-error"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        </>
      )}

      <Modal
        open={showCreate}
        onClose={closeFormModal}
        title="Add user"
        size="lg"
      >
        {renderUserForm()}
      </Modal>

      <Modal
        open={Boolean(editingUser)}
        onClose={closeFormModal}
        title={editingUser ? `Edit user — ${editingUser.name}` : "Edit user"}
        size="lg"
      >
        {editingUser ? renderUserForm() : null}
      </Modal>

      <ConfirmModal
        open={Boolean(resendTarget)}
        onClose={() => !resendingId && setResendTarget(null)}
        onConfirm={confirmResendActivation}
        title="Resend activation email?"
        message={
          resendTarget
            ? `A new temporary password will be generated and emailed to ${resendTarget.email}. Any previous temporary password will stop working. The user must change their password on first login.`
            : ""
        }
        confirmLabel="Send activation email"
        loading={Boolean(resendingId)}
      />

      <ConfirmModal
        open={Boolean(userToDelete)}
        onClose={() => !busy && setUserToDelete(null)}
        onConfirm={confirmDeleteUser}
        title="Delete user?"
        message={
          userToDelete
            ? `Permanently delete ${userToDelete.name} (${userToDelete.email})? Their registrations, papers, sessions, and role assignments will be removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete user"
        variant="danger"
        loading={busy}
      />
    </div>
  );
}
