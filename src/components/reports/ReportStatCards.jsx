"use client";

import {
  Award,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  MessageSquare,
  UserCheck,
  Users,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const ICONS = {
  calendar: Calendar,
  users: Users,
  check: CheckCircle2,
  clock: Clock,
  file: FileText,
  message: MessageSquare,
  clipboard: ClipboardCheck,
  usercheck: UserCheck,
  award: Award,
};

/**
 * @param {{ items: Array<{ label: string; value: number | string; icon?: string }> }} props
 */
export function ReportStatCards({ items }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const LucideIcon = ICONS[item.icon] ?? Users;
        return (
          <div
            key={item.label}
            className="rounded-xl border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{item.value}</p>
              </div>
              <span className={cn("rounded-lg bg-primary-light p-2.5 text-primary")}>
                <Icon icon={LucideIcon} size="sm" />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
