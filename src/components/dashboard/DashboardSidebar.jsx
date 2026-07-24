"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  Settings,
  FileText,
  FilePlus,
  Files,
  ClipboardCheck,
  UserPlus,
  Ticket,
  BarChart3,
  Key,
  BookOpen,
  UserCheck,
  Award,
  ScrollText,
  X,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useSession } from "@/components/auth/SessionProvider";
import { getNavForRole, PERMISSIONS } from "@/lib/auth/permissions";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { PaperNotificationBadge } from "@/components/dashboard/PaperNotificationBadge";

const ICON_MAP = {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  Settings,
  FileText,
  FilePlus,
  Files,
  ClipboardCheck,
  UserPlus,
  Ticket,
  BarChart3,
  Key,
  BookOpen,
  UserCheck,
  Award,
  ScrollText,
};

/**
 * @param {{ mobileOpen: boolean, onClose: () => void }} props
 */
export function DashboardSidebar({ mobileOpen, onClose }) {
  const pathname = usePathname();
  const { session } = useSession();

  if (!session) return null;

  const navItems = getNavForRole(session.activeRole);

  const roleHeader = (
    <div className="shrink-0 border-b border-border px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Active role
      </p>
      <p className="mt-1 text-sm font-semibold text-primary">
        {ROLE_LABELS[session.activeRole] ?? session.activeRole}
      </p>
    </div>
  );

  const nav = (
    <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3" aria-label="Dashboard">
      {navItems.map((item) => {
        const LucideIcon = ICON_MAP[item.icon] ?? LayoutDashboard;
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary-light text-primary"
                : "text-foreground hover:bg-neutral-50",
            )}
          >
            <Icon icon={LucideIcon} size="sm" />
            <span className="flex-1">{item.label}</span>
            {item.permission === PERMISSIONS.MY_PAPERS ? (
              <PaperNotificationBadge />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <aside className="hidden h-full w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-surface lg:flex">
        {roleHeader}
        {nav}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={onClose}
          />
          <aside className="relative flex h-full w-[min(100%,280px)] flex-col overflow-hidden bg-surface shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <span className="font-semibold text-foreground">Menu</span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-2 hover:bg-neutral-50"
                aria-label="Close"
              >
                <Icon icon={X} size="md" />
              </button>
            </div>
            {roleHeader}
            {nav}
          </aside>
        </div>
      ) : null}
    </>
  );
}
