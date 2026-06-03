"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { useSession } from "@/components/auth/SessionProvider";

export function DashboardShell({ children }) {
  const { session } = useSession();
  const [mobileNav, setMobileNav] = useState(false);

  if (!session) {
    return <div className="flex-1">{children}</div>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-1 flex-col overflow-hidden lg:flex-row">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3 lg:hidden">
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

      <div className="min-w-0 flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </div>
    </div>
  );
}
