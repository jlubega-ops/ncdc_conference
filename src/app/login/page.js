import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginTabs } from "@/components/auth/LoginTabs";
import { Logo } from "@/components/ui/Logo";
import { PublicFormLayout } from "@/components/layout/PublicFormLayout";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata = {
  title: "Sign in | NCDC Conference Platform",
  description: "Sign in with your email and password.",
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
      eyebrow="Sign in"
      title="NCDC Conference Platform"
      subtitle="Sign in with the email and password sent after registration, or your staff account."
      footer={
        <Link href="/" className="font-medium hover:text-primary">
          ← Back to home
        </Link>
      }
    >
      <div className="mb-6 flex justify-center">
        <Logo size="lg" linkToHome showText={false} />
      </div>

      {redirectTo ? (
        <p className="mb-4 rounded-md bg-primary-light px-3 py-2 text-xs text-primary">
          Sign in to continue to {redirectTo}
        </p>
      ) : null}

      <LoginTabs />
    </PublicFormLayout>
  );
}
