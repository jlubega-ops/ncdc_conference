import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { PublicFormLayout } from "@/components/layout/PublicFormLayout";
import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";
import { getRegistrableConferences } from "@/lib/conferences/registrable";

export const metadata = {
  title: "Register | Conference Platform",
  description: "Choose a conference to register for.",
};

export default async function SignupPage({ searchParams }) {
  await redirectIfAuthenticated();

  const params = await searchParams;
  const conferences = await getRegistrableConferences();
  const preselected = params?.conference?.trim();

  return (
    <PublicFormLayout
      maxWidth="md"
      eyebrow="Register"
      title="Choose a conference"
      subtitle="Only conferences with open registration and an active call for papers are listed."
      footer={
        <>
          <Link href="/access" className="font-medium text-primary hover:underline">
            Already have an access key? Sign in
          </Link>
          {" · "}
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
        </>
      }
    >
      <div className="mb-6 flex justify-center">
        <Logo size="lg" linkToHome showText={false} />
      </div>

      {conferences.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
          No conferences are open for registration and call for papers right now.
        </p>
      ) : (
        <ul className="space-y-2">
          {conferences.map((c) => (
            <li key={c.id}>
              <Link
                href={`/conferences/${c.slug}/register`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary-light/30"
              >
                <span className="font-medium text-foreground">{c.title}</span>
                <span className="shrink-0 text-xs font-medium text-primary">Open</span>
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
          Continue to registration form
        </Button>
      ) : null}
    </PublicFormLayout>
  );
}
