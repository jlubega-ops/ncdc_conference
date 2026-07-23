"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Award, Download, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { CERTIFICATE_MIN_ATTENDANCE_PERCENT } from "@/lib/certificates/constants";

/**
 * Embedded certificate view for a conference's Certificate tab (no dashboard links).
 * @param {{ slug: string }} props
 */
export function ConferenceCertificateTab({ slug }) {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/me/certificates");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load certificate status.");
      const match = (data.certificates ?? []).find((c) => c.conference.slug === slug);
      setRow(match ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load certificate status.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function downloadCertificate() {
    setBusy(true);
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
      setBusy(false);
    }
  }

  async function emailCertificate() {
    setBusy(true);
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
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading certificate status…</p>;
  }

  if (error) {
    return <p className="text-sm text-error">{error}</p>;
  }

  if (!row) {
    return (
      <p className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
        You need an approved conference registration to track certificate eligibility.
      </p>
    );
  }

  const canAct = row.eligible || Boolean(row.certificate);

  return (
    <div
      className={cn(
        "rounded-lg border p-5",
        canAct ? "border-primary/40 bg-primary-light/30" : "border-border bg-surface",
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          icon={Award}
          size="md"
          className={canAct ? "text-primary" : "text-muted-foreground"}
        />
        <div>
          <p className="font-semibold text-foreground">Certificate of participation</p>
          <p className="mt-1 text-sm text-muted-foreground">{row.message}</p>
        </div>
      </div>

      {row.certificate ? (
        <p className="mt-3 font-mono text-xs text-primary">
          {row.certificate.certificateNumber}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
          <div
            className={cn(
              "h-full rounded-full",
              row.stats.overallProgress >= CERTIFICATE_MIN_ATTENDANCE_PERCENT
                ? "bg-primary"
                : "bg-amber-500",
            )}
            style={{ width: `${row.stats.overallProgress}%` }}
          />
        </div>
        <span className="text-xs font-bold text-foreground">{row.stats.overallProgress}%</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {row.stats.attended} attended · {row.stats.missed} missed · {row.stats.remaining}{" "}
        remaining · min {CERTIFICATE_MIN_ATTENDANCE_PERCENT}% after conference ends
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant={canAct ? "primary" : "outline"}
          size="sm"
          disabled={!canAct || busy}
          onClick={downloadCertificate}
        >
          <Icon icon={Download} size="sm" />
          {busy ? "Please wait…" : "Download PDF"}
        </Button>
        <Button variant="outline" size="sm" disabled={!canAct || busy} onClick={emailCertificate}>
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
  );
}
