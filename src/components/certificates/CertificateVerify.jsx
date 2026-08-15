"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Award, BadgeCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { CERTIFICATE_NUMBER_PREFIX } from "@/lib/certificates/constants";
import {
  certificateNumberToVerifyToken,
  verifyTokenToCertificateNumber,
} from "@/lib/certificates/number";
import { OrganiserBrandSetter } from "@/components/layout/OrganiserBrandProvider";

function formatIssuedDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-UG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * @param {{ initialToken?: string | null }} [props]
 */
export function CertificateVerify({ initialToken = null }) {
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("n") || searchParams.get("number") || "";
  const fromToken = initialToken
    ? verifyTokenToCertificateNumber(decodeURIComponent(initialToken))
    : "";
  const initialNumber = fromToken || fromQuery;

  const [number, setNumber] = useState(initialNumber);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const verify = useCallback(async (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setResult({ valid: false, error: "Enter a certificate number." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/certificates/verify?n=${encodeURIComponent(trimmed)}`,
      );
      const data = await res.json();
      setResult(data);
      if (data.valid && typeof window !== "undefined") {
        const token = certificateNumberToVerifyToken(data.certificate.certificateNumber);
        const path = `/certificates/verify/${encodeURIComponent(token)}`;
        window.history.replaceState({}, "", path);
      }
    } catch {
      setResult({ valid: false, error: "Could not verify certificate. Try again." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialNumber.trim()) {
      verify(initialNumber);
    }
  }, [initialNumber, verify]);

  const scannedFromQr = Boolean(initialToken || fromQuery);

  function handleSubmit(e) {
    e.preventDefault();
    verify(number);
  }

  return (
    <div className="mx-auto max-w-xl">
      {result?.valid && result.brand ? <OrganiserBrandSetter brand={result.brand} /> : null}
      <div className="rounded-xl border border-primary/20 bg-linear-to-br from-primary-light/80 via-surface to-surface p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-primary p-2.5 text-primary-foreground">
            {result?.brand?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.brand.logo}
                alt=""
                className="h-6 w-auto max-w-[5.5rem] object-contain"
              />
            ) : (
              <Icon icon={Award} size="md" />
            )}
          </span>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Verify certificate</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirm a conference attendance certificate is genuine. Scan the QR code on the PDF
              or enter the certificate number below.
            </p>
          </div>
        </div>
      </div>

      {loading && scannedFromQr ? (
        <p className="mt-6 text-sm text-muted-foreground">Verifying scanned certificate…</p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <Input
          label="Certificate number"
          value={number}
          onChange={(e) => setNumber(e.target.value.toUpperCase())}
          placeholder={`${CERTIFICATE_NUMBER_PREFIX}/2026/CONF/XXXXXXXX`}
          hint="Format: NCDC/YEAR/CONF/XXXXXXXX (8-character code)"
        />
        <Button type="submit" variant="primary" disabled={loading} icon={Search}>
          {loading ? "Verifying…" : "Verify"}
        </Button>
      </form>

      {result ? (
        <div
          className={cn(
            "mt-8 rounded-lg border p-5",
            result.valid
              ? "border-primary/30 bg-primary-light/40"
              : "border-amber-200 bg-amber-50",
          )}
        >
          {result.valid && result.certificate ? (
            <>
              <div className="flex items-center gap-2 text-primary">
                <Icon icon={BadgeCheck} size="md" />
                <p className="font-semibold">Valid certificate</p>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">
                    Certificate number
                  </dt>
                  <dd className="mt-0.5 font-mono text-sm font-medium text-foreground">
                    {result.certificate.certificateNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">
                    Issued to
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {result.certificate.recipientName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">
                    Organised by
                  </dt>
                  <dd className="mt-0.5 text-foreground">
                    {result.certificate.organiserName || result.brand?.name || "—"}
                    {result.certificate.organiserShortName
                      ? ` (${result.certificate.organiserShortName})`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-muted-foreground">
                    Conference
                  </dt>
                  <dd className="mt-0.5 text-foreground">{result.certificate.conferenceTitle}</dd>
                  {result.certificate.dateRange ? (
                    <dd className="text-xs text-muted-foreground">
                      {result.certificate.dateRange}
                    </dd>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">
                      Attendance
                    </dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {result.certificate.attendancePercent}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Days</dt>
                    <dd className="mt-0.5 text-foreground">
                      {result.certificate.daysAttended} / {result.certificate.totalDays}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Issued</dt>
                    <dd className="mt-0.5 text-foreground">
                      {formatIssuedDate(result.certificate.issuedAt)}
                    </dd>
                  </div>
                </div>
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">
                This page shows verification details only. Personal contact information is not
                displayed.
              </p>
            </>
          ) : (
            <p className="text-sm text-amber-900">
              {result.error || "Certificate could not be verified."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
