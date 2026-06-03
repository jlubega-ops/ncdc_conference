import { Suspense } from "react";
import { CertificateVerify } from "@/components/certificates/CertificateVerify";

export const metadata = {
  title: "Verify certificate | NCDC Conference",
};

/**
 * QR codes link here: /certificates/verify/NCDC-2026-CONF-XXXXXXXX
 */
export default async function CertificateVerifyTokenPage({ params }) {
  const { token } = await params;

  return (
    <main className="min-h-screen bg-neutral-50/80 px-4 py-12">
      <Suspense
        fallback={
          <p className="text-center text-sm text-muted-foreground">Verifying certificate…</p>
        }
      >
        <CertificateVerify initialToken={token} />
      </Suspense>
    </main>
  );
}
