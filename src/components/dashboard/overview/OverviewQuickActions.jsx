import Link from "next/link";
import {
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  FilePlus,
  FileText,
  Files,
  LayoutDashboard,
  Settings,
  Ticket,
  UserCheck,
  UserPlus,
  Users,
  ClipboardCheck,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const NAV_ICONS = {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  FilePlus,
  Files,
  CalendarDays,
  BookOpen,
  UserCheck,
  Award,
  ClipboardCheck,
  UserPlus,
  Ticket,
  BarChart3,
};

/**
 * @param {{
 *   actions: Array<{ label: string; href: string; icon?: string; primary?: boolean; badge?: string | number }>;
 * }} props
 */
export function OverviewQuickActions({ actions }) {
  if (!actions?.length) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground">Quick actions</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => {
          const LucideIcon = NAV_ICONS[action.icon] ?? FileText;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg border bg-surface p-4 shadow-sm transition-colors",
                action.primary
                  ? "border-primary/40 hover:border-primary hover:bg-primary-light/50"
                  : "border-border hover:border-primary/30 hover:bg-neutral-50/80",
              )}
            >
              <span
                className={cn(
                  "rounded-lg p-2.5 transition-colors",
                  action.primary
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary-light text-primary group-hover:bg-primary group-hover:text-primary-foreground",
                )}
              >
                <Icon icon={LucideIcon} size="sm" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{action.label}</p>
                {action.badge != null && Number(action.badge) > 0 ? (
                  <p className="mt-0.5 text-xs font-medium text-primary">{action.badge} pending</p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
