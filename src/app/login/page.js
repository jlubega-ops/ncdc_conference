import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { LoginTabs } from "@/components/auth/LoginTabs";
import { Logo } from "@/components/ui/Logo";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata = {
  title: "Sign in | NCDC Conference Platform",
  description: "Sign in with your staff account or conference access key.",
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

  const defaultTab = params?.tab === "staff" ? "staff" : "access";

  return (
    <AuthPageLayout>
      <div className="mb-8 flex justify-center">
        <div className="rounded-lg bg-white/95 px-6 py-4 shadow-lg backdrop-blur-sm">
          <Logo size="lg" linkToHome />
        </div>
      </div>

      <div className="rounded-lg border border-white/20 bg-surface/95 p-6 shadow-xl backdrop-blur-md sm:p-8">
        <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Attendees and paper submitters use the access key from their conference approval email.
          Staff use email and password.
        </p>

        {redirectTo ? (
          <p className="mt-3 rounded-md bg-primary-light px-3 py-2 text-xs text-primary">
            Sign in to continue to {redirectTo}
          </p>
        ) : null}

        <div className="mt-6">
          <LoginTabs defaultTab={defaultTab} />
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-white/85">
        <Link href="/" className="font-medium text-white hover:underline">
          Home
        </Link>
      </p>
    </AuthPageLayout>
  );
}
