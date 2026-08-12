"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Award, Download, Mail } from "lucide-react";
import { ConferenceImage } from "@/components/ConferenceImage";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export function CertificatesList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busySlug, setBusySlug] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/me/certificates");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load certificates.");
      setItems(data.certificates ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load certificates.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function downloadCertificate(slug) {
    setBusySlug(slug);
    try {
      const res = await fetch(`/api/me/certificates/${slug}/download`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not download certificate.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "NCDC-Certificate.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Certificate downloaded.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not download certificate.");
    } finally {
      setBusySlug(null);
    }
  }

  async function emailCertificate(slug) {
    setBusySlug(slug);
    try {
      const res = await fetch(`/api/me/certificates/${slug}/email`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send certificate.");
      if (data.ok) toast.success(data.message || "Certificate emailed.");
      else toast.warn(data.message || "Email could not be sent.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send certificate.");
    } finally {
      setBusySlug(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading certificates…</p>;
  }

  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="mt-8 rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
        You need an approved conference registration to track certificate eligibility.
      </p>
    );
  }

  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2">
      {items.map((row) => {
        const busy = busySlug === row.conference.slug;
        const hasCert = Boolean(row.certificate);
        const canAct = row.eligible || hasCert;

        return (
          <li
            key={row.conference.slug}
            className={cn(
              "overflow-hidden rounded-lg border bg-surface",
              canAct ? "border-primary/40" : "border-border",
            )}
          >
            <div className="flex">
              <div className="relative hidden w-24 shrink-0 sm:block">
                <ConferenceImage src={row.conference.cardImage} alt={row.conference.title} />
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-start gap-2">
                  <Icon
                    icon={Award}
                    size="sm"
                    className={canAct ? "text-primary" : "text-muted-foreground"}
                  />
                  <div>
                    <p className="font-semibold text-foreground">{row.conference.title}</p>
                    {row.conference.dateRange ? (
                      <p className="text-xs text-muted-foreground">{row.conference.dateRange}</p>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{row.message}</p>
                {row.certificate ? (
                  <p className="mt-2 font-mono text-xs text-primary">
                    {row.certificate.certificateNumber}
                  </p>
                ) : null}
                {row.stats ? (
                  <>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            canAct ? "bg-primary" : "bg-amber-500",
                          )}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (Number(row.stats.attended || 0) /
                                  Math.max(1, Number(row.stats.totalDays || 1))) *
                                  100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-foreground">
                        {row.stats.attended}/{row.stats.totalDays} days
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {row.stats.attended} attended · {row.stats.missed} missed ·{" "}
                      {row.stats.remaining} remaining
                    </p>
                  </>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant={canAct ? "primary" : "outline"}
                    size="sm"
                    disabled={!canAct || busy}
                    onClick={() => downloadCertificate(row.conference.slug)}
                  >
                    <Icon icon={Download} size="sm" />
                    {busy ? "Please wait…" : "Download PDF"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canAct || busy}
                    onClick={() => emailCertificate(row.conference.slug)}
                  >
                    <Icon icon={Mail} size="sm" />
                    Send to email
                  </Button>
                </div>
                {row.certificate?.emailedAt ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Emailed on{" "}
                    {new Date(row.certificate.emailedAt).toLocaleDateString("en-UG", {
                      dateStyle: "medium",
                    })}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
