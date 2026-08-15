"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Award, Download, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { cn } from "@/lib/cn";
import { requestCertificateEmail } from "@/lib/certificates/request-email";

/**
 * Embedded certificate view for a conference's Certificate tab (no dashboard links).
 * @param {{ slug: string }} props
 */
export function ConferenceCertificateTab({ slug }) {
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [emailQueued, setEmailQueued] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const res = await fetch("/api/me/certificates");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load certificate status.");
      const match = (data.certificates ?? []).find((c) => c.conference.slug === slug);
      setRow(match ?? null);
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : "Could not load certificate status.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function downloadCertificate() {
    setConfirmOpen(false);
    setDownloadBusy(true);
    try {
      const res = await fetch(`/api/me/certificates/${slug}/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not download the certificate PDF. Please try again.");
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
      await load({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not download the certificate PDF. Please try again.");
    } finally {
      setDownloadBusy(false);
    }
  }

  function emailCertificate() {
    setEmailQueued(true);
    void requestCertificateEmail(slug, {
      onConfirmed: () => load({ silent: true }),
      onFailed: () => setEmailQueued(false),
    });
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

  const canAct = row.eligible;
  const canEmail = Boolean(
    !emailQueued && (row.canEmail ?? (canAct && !row.emailCooldownMessage)),
  );
  const emailLabel = canEmail ? "Send to email" : "Email sent";

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

      {row.stats ? (
        <>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <div
                className={cn(
                  "h-full rounded-full",
                  row.eligible ? "bg-primary" : "bg-amber-500",
                )}
                style={{
                  width: `${Math.min(100, Math.round((Number(row.stats.attended || 0) / Math.max(1, Number(row.stats.totalDays || 1))) * 100))}%`,
                }}
              />
            </div>
            <span className="text-xs font-bold text-foreground">
              {row.stats.attended}/{row.stats.totalDays} days
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {row.stats.attended} attended · {row.stats.missed} missed · {row.stats.remaining}{" "}
            remaining
          </p>
        </>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant={canAct ? "primary" : "outline"}
          size="sm"
          disabled={!canAct || downloadBusy}
          onClick={() => setConfirmOpen(true)}
        >
          <Icon icon={Download} size="sm" />
          {downloadBusy ? "Preparing certificate…" : "Download PDF"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canEmail}
          title={row.emailCooldownMessage || undefined}
          onClick={emailCertificate}
        >
          <Icon icon={Mail} size="sm" />
          {emailLabel}
        </Button>
      </div>
      {downloadBusy ? (
        <p className="mt-2 text-xs text-muted-foreground">
          First download can take up to a couple of minutes if many people generate PDFs at once.
          Keep this page open. After that, you can download again as often as you like.
        </p>
      ) : null}

      {row.certificate?.emailedAt ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {row.emailCooldownMessage
            ? row.emailCooldownMessage
            : `Last emailed ${new Date(row.certificate.emailedAt).toLocaleString("en-UG", {
                dateStyle: "medium",
                timeStyle: "short",
              })}. You can email again after 24 hours.`}
        </p>
      ) : canAct ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Prefer Download PDF if you can — email is limited to once per 24 hours per person because
          of Gmail sending limits.
        </p>
      ) : null}

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={downloadCertificate}
        title="Confirm the name on your certificate"
        message={`This PDF will be issued to:\n\n${row.recipientName || "your profile name"}\n\nIf this is not correct, update your profile (or ask the organisers) before downloading. Repeat downloads are fast once the name is right.`}
        confirmLabel="Download PDF"
        cancelLabel="Go back"
        loading={downloadBusy}
      />
    </div>
  );
}
