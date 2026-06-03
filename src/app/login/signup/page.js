import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { getCurrentSession } from "@/lib/auth/session";
import { getRegistrableConferences } from "@/lib/conferences/registrable";

export const metadata = {
  title: "Register | NCDC Conference Platform",
  description: "Choose a conference to register for.",
};

export default async function SignupPage({ searchParams }) {
  const params = await searchParams;

  try {
    const existing = await getCurrentSession();
    if (existing) {
      redirect(typeof params?.redirect === "string" ? params.redirect : "/dashboard");
    }
  } catch {
    /* database unavailable */
  }

  const conferences = await getRegistrableConferences();
  const preselected = params?.conference?.trim();

  return (
    <AuthPageLayout>
      <div className="mb-8 flex justify-center">
        <div className="rounded-lg bg-white/95 px-6 py-4 shadow-lg backdrop-blur-sm">
          <Logo size="lg" linkToHome />
        </div>
      </div>

      <div className="rounded-lg border border-white/20 bg-surface/95 p-6 shadow-xl backdrop-blur-md sm:p-8">
        <h1 className="text-2xl font-bold text-foreground">Register for a conference</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Select a conference to open the registration form. Only upcoming and running
          conferences are listed.
        </p>

        {conferences.length === 0 ? (
          <p className="mt-6 rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No conferences are accepting registrations right now.
          </p>
        ) : (
          <ul className="mt-6 space-y-2">
            {conferences.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/conferences/${c.slug}/register`}
                  className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3 text-sm transition-colors hover:border-primary/40 hover:bg-primary-light/30"
                >
                  <span className="font-medium text-foreground">{c.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.status === "running" ? "Running" : "Upcoming"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {preselected && conferences.some((c) => c.slug === preselected) ? (
          <Button
            variant="primary"
            className="mt-6 w-full"
            href={`/conferences/${preselected}/register`}
          >
            Continue to registration
          </Button>
        ) : null}
      </div>

      <p className="mt-6 text-center text-sm text-white/85">
        <Link href="/login?tab=access" className="font-medium text-white hover:underline">
          Already have an access key? Sign in
        </Link>
        {" · "}
        <Link href="/" className="font-medium text-white hover:underline">
          Home
        </Link>
      </p>
    </AuthPageLayout>
  );
}
