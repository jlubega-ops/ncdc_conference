"use client";

import { useState } from "react";
import { ArrowLeft, LogOut, Menu } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { useSession } from "@/components/auth/SessionProvider";
import { getActiveConferenceSlug } from "@/lib/auth/dashboard-routes";

export function DashboardShell({ children }) {
  const { session, logout } = useSession();
  const [mobileNav, setMobileNav] = useState(false);

  if (!session) {
    return <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>;
  }

  if (session.activeRole === "ATTENDEE") {
    const slug = getActiveConferenceSlug(session);
    const conferenceHref = slug ? `/conferences/${slug}` : "/login?mode=access";

    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
          <Button variant="ghost" size="sm" icon={ArrowLeft} href={conferenceHref}>
            Back to my conference
          </Button>
          <Button variant="outline" size="sm" icon={LogOut} onClick={logout}>
            Logout
          </Button>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileNav(true)}
          className="rounded-md p-2 hover:bg-neutral-50"
          aria-label="Open dashboard menu"
        >
          <Icon icon={Menu} size="md" />
        </button>
        <span className="text-sm font-semibold text-foreground">Dashboard</span>
      </div>

      <DashboardSidebar mobileOpen={mobileNav} onClose={() => setMobileNav(false)} />

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </div>
    </div>
  );
}
