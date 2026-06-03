"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/Button";
import { formatAdminDate } from "./AdminTabShell";

/**
 * @param {{ conferenceId: string }} props
 */
export function ConferenceAdminRegistrationsTab({ conferenceId }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/conferences/${conferenceId}/registrations`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load registrations.");
      setRegistrations(data.registrations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load registrations.");
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    load();
  }, [load]);

  async function activate(registrationId) {
    setActivatingId(registrationId);
    try {
      const res = await fetch(
        `/api/admin/conferences/${conferenceId}/registrations/${registrationId}/activate`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not activate registration.");
      toast.success(
        data.accessKey
          ? `Activated. Access key: ${data.accessKey}`
          : data.message || "Registration activated.",
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not activate registration.");
    } finally {
      setActivatingId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading registrations…</p>;
  }

  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }

  if (registrations.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
        No registrations for this conference yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {registrations.map((row) => (
        <article
          key={row.id}
          className="rounded-md border border-border bg-background p-4 text-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">
                {row.displayName || row.user?.email}
              </p>
              <p className="text-xs text-muted-foreground">{row.user?.email}</p>
            </div>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                row.status === "CONFIRMED"
                  ? "bg-primary-light text-primary"
                  : "bg-neutral-100 text-muted-foreground"
              }`}
            >
              {row.status}
            </span>
          </div>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {row.institution ? (
              <div>
                <dt className="text-xs text-muted-foreground">Institution</dt>
                <dd>{row.institution}</dd>
              </div>
            ) : null}
            {row.attendanceMode ? (
              <div>
                <dt className="text-xs text-muted-foreground">Attendance</dt>
                <dd>{row.attendanceMode}</dd>
              </div>
            ) : null}
            {row.subThemes?.length ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Sub-themes</dt>
                <dd>{row.subThemes.join(", ")}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-muted-foreground">Registered</dt>
              <dd>{formatAdminDate(row.registeredAt)}</dd>
            </div>
            {row.paymentProofUrl ? (
              <div>
                <dt className="text-xs text-muted-foreground">Payment proof</dt>
                <dd>
                  <a
                    href={row.paymentProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View file
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
          {row.status === "PENDING" ? (
            <Button
              size="sm"
              variant="primary"
              className="mt-3"
              disabled={activatingId === row.id}
              onClick={() => activate(row.id)}
            >
              {activatingId === row.id ? "Activating…" : "Activate & issue access key"}
            </Button>
          ) : null}
        </article>
      ))}
    </div>
  );
}
