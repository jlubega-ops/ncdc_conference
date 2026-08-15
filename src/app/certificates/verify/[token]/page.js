import { Suspense } from "react";
import { CertificateVerify } from "@/components/certificates/CertificateVerify";
import { verifyCertificateByNumber } from "@/lib/certificates/service";
import { verifyTokenToCertificateNumber } from "@/lib/certificates/number";
import { conferenceMetadataIcons } from "@/lib/conferences/brand";

export async function generateMetadata({ params }) {
  const { token } = await params;
  const number = verifyTokenToCertificateNumber(decodeURIComponent(token || ""));
  const result = await verifyCertificateByNumber(number);
  if (result.valid && result.certificate) {
    const org = result.certificate.organiserName || result.certificate.conferenceTitle;
    return {
      title: `Verify certificate | ${org}`,
      icons: conferenceMetadataIcons({
        organiserLogo: result.certificate.organiserLogo,
      }),
    };
  }
  return { title: "Verify certificate" };
}

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
