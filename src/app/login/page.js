import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginPanel } from "@/components/auth/LoginPanel";
import { PublicFormLayout } from "@/components/layout/PublicFormLayout";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata = {
  title: "Sign in | Conference Management",
  description: "Sign in with an access code or staff credentials.",
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const redirectTo = params?.redirect;

  try {
    const existing = await getCurrentSession();
    if (existing) {
      redirect(typeof redirectTo === "string" ? redirectTo : "/dashboard");
    }
  } catch {
    /* database unavailable */
  }

  return (
    <PublicFormLayout
      maxWidth="md"
      eyebrow="Account"
      title="Sign in"
      subtitle="Attendees use an access code to open their conference. Staff use email and password."
      footer={
        <Link href="/" className="font-medium hover:text-primary">
          ← Back to home
        </Link>
      }
    >
      {redirectTo ? (
        <p className="mb-4 rounded-md bg-primary-light px-3 py-2 text-xs text-primary">
          Sign in to continue to {redirectTo}
        </p>
      ) : null}

      <LoginPanel />
    </PublicFormLayout>
  );
}
