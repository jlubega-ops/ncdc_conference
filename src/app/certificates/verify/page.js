import { Suspense } from "react";
import { CertificateVerify } from "@/components/certificates/CertificateVerify";

export const metadata = {
  title: "Verify certificate | NCDC Conference",
  description: "Verify an NCDC conference attendance certificate by number or QR code.",
};

export default function CertificateVerifyPage() {
  return (
    <main className="min-h-screen bg-neutral-50/80 px-4 py-12">
      <Suspense
        fallback={
          <p className="text-center text-sm text-muted-foreground">Loading verification…</p>
        }
      >
        <CertificateVerify />
      </Suspense>
    </main>
  );
}
