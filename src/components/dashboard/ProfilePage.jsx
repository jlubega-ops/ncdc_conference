"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { PasswordChangeForm } from "@/components/auth/PasswordChangeForm";
import { UserProfileFields } from "@/components/forms/UserProfileFields";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { DEFAULT_COUNTRY, DEFAULT_COUNTRY_CODE } from "@/lib/registration/constants";
import { useSession } from "@/components/auth/SessionProvider";

export function ProfilePage() {
  const { session, refreshSession } = useSession();
  const isAttendee = session?.activeRole === "ATTENDEE";
  const [tab, setTab] = useState("profile");
  const [email, setEmail] = useState("");
  const [profileLocked, setProfileLocked] = useState(false);
  const [values, setValues] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    ageRange: "",
    countryCode: DEFAULT_COUNTRY_CODE,
    telephone: "",
    countryOfOrigin: DEFAULT_COUNTRY,
    institution: "",
    attendanceMode: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/me/profile");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load profile.");
      setEmail(data.email);
      setProfileLocked(Boolean(data.profileLocked));
      setValues({
        firstName: data.profile.firstName ?? "",
        middleName: data.profile.middleName ?? "",
        lastName: data.profile.lastName ?? "",
        gender: data.profile.gender ?? "",
        ageRange: data.profile.ageRange ?? "",
        countryCode: data.profile.countryCode || DEFAULT_COUNTRY_CODE,
        telephone: data.profile.telephone ?? "",
        countryOfOrigin: data.profile.countryOfOrigin || DEFAULT_COUNTRY,
        institution: data.profile.institution ?? "",
        attendanceMode: data.profile.attendanceMode ?? "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function onChange(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (profileLocked) return;
    setSaving(true);
    setErrors({});
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        throw new Error(data.error || "Could not save profile.");
      }
      toast.success("Profile updated.");
      await refreshSession();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  const tabs = isAttendee
    ? [{ id: "profile", label: "Profile" }]
    : [
        { id: "profile", label: "Profile" },
        { id: "password", label: "Password" },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAttendee
            ? "View your personal details."
            : "Manage your personal details and password."}
        </p>
      </div>

      {tabs.length > 1 ? (
        <div className="flex gap-1 rounded-lg border border-border bg-neutral-50/80 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-surface text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {tab === "profile" || isAttendee ? (
        loading ? (
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        ) : (
          <form onSubmit={handleSave} className="max-w-3xl space-y-5">
            {profileLocked ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                This conference uploaded the attendee list. Your name and profile details cannot be
                changed here. Contact the organisers if something is incorrect.
              </p>
            ) : null}
            <UserProfileFields
              values={values}
              errors={errors}
              onChange={onChange}
              email={email}
              emailReadOnly
              showEmail
              disabled={profileLocked}
            />
            {profileLocked ? null : (
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving…" : "Save profile"}
              </Button>
            )}
          </form>
        )
      ) : (
        <div className="max-w-md rounded-lg border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold text-foreground">Change password</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Use your current password, or your temporary password if this is your first sign-in.
          </p>
          <div className="mt-4">
            <PasswordChangeForm
              onSuccess={async () => {
                toast.success("Password updated.");
                await refreshSession();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
