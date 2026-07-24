import Link from "next/link";
import { AccessKeyLoginForm } from "@/components/auth/AccessKeyLoginForm";
import { PublicFormLayout } from "@/components/layout/PublicFormLayout";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";

export const metadata = {
  title: "Access with code | Conference Management",
  description: "Enter your access code to open your conference.",
};

export default async function AccessWithCodePage() {
  await redirectIfAuthenticated();

  return (
    <PublicFormLayout
      maxWidth="md"
      eyebrow="Attendee access"
      title="Sign in with access code"
      subtitle="Enter the access code from your email. You will be signed in and taken to your conference."
      footer={
        <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link href="/" className="font-medium hover:text-primary">
            ← Back to home
          </Link>
          <span className="text-border" aria-hidden>
            ·
          </span>
          <Link href="/login?mode=staff" className="font-medium hover:text-primary">
            Staff sign in
          </Link>
        </span>
      }
    >
      <AccessKeyLoginForm />
    </PublicFormLayout>
  );
}
