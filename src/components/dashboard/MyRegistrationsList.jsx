"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ConferenceImage } from "@/components/ConferenceImage";
import { formatFullDate } from "@/lib/conferences/utils";

const STATUS_STYLES = {
  PENDING: "bg-neutral-100 text-muted-foreground",
  NEEDS_REVISION: "bg-amber-50 text-amber-800",
  CONFIRMED: "bg-primary-light text-primary",
  CANCELLED: "bg-error/10 text-error",
};

const STATUS_LABELS = {
  PENDING: "Pending approval",
  NEEDS_REVISION: "Action required",
  CONFIRMED: "Approved",
  CANCELLED: "Cancelled",
};

export function MyRegistrationsList() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/me/registrations");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load registrations.");
      setItems(data.registrations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load registrations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading your applications…</p>;
  }

  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">You have not applied to any conferences yet.</p>
        <Link href="/conferences" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          Browse conferences
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((row) => {
        const slug = row.conference?.slug;
        const base = slug ? `/dashboard/my-registrations/${slug}` : null;

        return (
          <article
            key={row.id}
            role={base ? "button" : undefined}
            tabIndex={base ? 0 : undefined}
            onClick={base ? () => router.push(base) : undefined}
            onKeyDown={
              base
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(base);
                    }
                  }
                : undefined
            }
            className={`flex gap-4 overflow-hidden rounded-lg border border-border bg-surface transition-colors ${
              base ? "cursor-pointer hover:border-primary/40 hover:shadow-sm" : ""
            }`}
          >
            <div className="relative hidden h-auto min-h-[120px] w-28 shrink-0 sm:block sm:w-36">
              <ConferenceImage
                src={row.conference?.cardImage}
                alt={row.conference?.title ?? "Conference"}
              />
            </div>
            <div className="min-w-0 flex-1 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-foreground">{row.conference?.title}</h2>
                  {row.conference?.startDate ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatFullDate(row.conference.startDate)}
                      {row.conference.endDate
                        ? ` – ${formatFullDate(row.conference.endDate)}`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[row.status] ?? STATUS_STYLES.PENDING}`}
                >
                  {STATUS_LABELS[row.status] ?? row.status}
                </span>
              </div>

              {row.status === "PENDING" ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Your application is awaiting approval. Programme and online links will unlock once
                  approved.
                </p>
              ) : null}

              {row.improvementRequest ? (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="font-medium">Organiser feedback</p>
                  <p className="mt-1">{row.improvementRequest}</p>
                  {row.adminNotes ? (
                    <p className="mt-2 text-xs text-amber-800">{row.adminNotes}</p>
                  ) : null}
                </div>
              ) : row.adminNotes && row.status === "CONFIRMED" ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Note:</span> {row.adminNotes}
                </p>
              ) : null}

              {base ? (
                <div className="mt-4 flex flex-wrap gap-3" onClick={(e) => e.stopPropagation()}>
                  <Link href={base} className="text-sm font-medium text-primary hover:underline">
                    View conference
                  </Link>
                  {row.status === "CONFIRMED" ? (
                    <>
                      <Link
                        href={`${base}?tab=programme`}
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        Programme & resources
                      </Link>
                      <Link
                        href={`${base}/papers`}
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        Submit paper
                      </Link>
                      <Link
                        href="/dashboard/my-papers"
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        View my papers
                      </Link>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
