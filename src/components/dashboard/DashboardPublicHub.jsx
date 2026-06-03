import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function DashboardPublicHub() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Dashboard</h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Sign in to manage conferences, submit research, review papers, or access
          your registered events. Choose an option below to get started.
        </p>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <p className="text-sm text-muted-foreground">
          Conference browsing and registration are handled on the home and conferences
          pages. Use one of the actions below to continue.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="primary" href="/login">
            Staff sign in
          </Button>
          <Button variant="outline" href="/conferences">
            Browse conferences
          </Button>
          <Button variant="outline" href="/login?tab=access">
            Use access key
          </Button>
        </div>
      </div>

      <div className="mt-10 rounded-lg border border-border bg-surface p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div className="flex gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary">
            <Icon icon={FileText} size="md" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Call for papers</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              View open submission deadlines without signing in.
            </p>
          </div>
        </div>
        <Button variant="ghost" href="/call-for-papers" className="mt-4 w-full sm:mt-0 sm:w-auto">
          View calls
        </Button>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in here
        </Link>
        . New attendee? Use{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          conference access
        </Link>{" "}
        with your invitation key.
      </p>
    </div>
  );
}
