import { redirect } from "next/navigation";
import { CertificatesList } from "@/components/dashboard/CertificatesList";
import { getSessionRecord } from "@/lib/auth/session";

export const metadata = {
  title: "Certificates | NCDC Dashboard",
};

export default async function CertificatesPage() {
  const session = await getSessionRecord();
  if (!session) redirect("/login?redirect=/dashboard/certificates");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Certificates</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Certificates are issued after the conference ends when you attend at least 90% of
        scheduled days. Download a PDF with a verification QR code, or send it to your registered
        email. Anyone can confirm authenticity at{" "}
        <a href="/certificates/verify" className="font-medium text-primary hover:underline">
          certificate verification
        </a>
        .
      </p>
      <CertificatesList />
    </div>
  );
}
