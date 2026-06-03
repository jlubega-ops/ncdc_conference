import { LayoutDashboard } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { cn } from "@/lib/cn";

/**
 * @param {{
 *   greeting: string | null;
 *   subtitle: string;
 *   role: string;
 *   timeLabel?: string;
 * }} props
 */
export function OverviewHero({ greeting, subtitle, role, timeLabel }) {
  const hour = new Date().getHours();
  const timeGreeting =
    timeLabel ??
    (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
  const title = greeting ? `${timeGreeting}, ${greeting}` : timeGreeting;

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary-light/80 via-surface to-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-start gap-4">
        <span className="rounded-xl bg-primary p-3 text-primary-foreground shadow-sm">
          <Icon icon={LayoutDashboard} size="md" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
            <span className="rounded-md bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
              {ROLE_LABELS[role] ?? role}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{ alerts: Array<{ type?: string; title: string; body?: string; href?: string }> }} props
 */
export function OverviewAlerts({ alerts }) {
  if (!alerts?.length) return null;

  const styles = {
    primary: "border-primary/30 bg-primary-light text-primary",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    info: "border-border bg-neutral-50/80 text-foreground",
  };

  return (
    <ul className="space-y-2">
      {alerts.map((alert, i) => (
        <li key={`${alert.title}-${i}`}>
          {alert.href ? (
            <a
              href={alert.href}
              className={cn(
                "block rounded-md border px-4 py-3 text-sm transition-colors hover:opacity-90",
                styles[alert.type] ?? styles.info,
              )}
            >
              <p className="font-medium">{alert.title}</p>
              {alert.body ? <p className="mt-1 text-xs opacity-90 line-clamp-2">{alert.body}</p> : null}
            </a>
          ) : (
            <div
              className={cn(
                "rounded-md border px-4 py-3 text-sm",
                styles[alert.type] ?? styles.info,
              )}
            >
              <p className="font-medium">{alert.title}</p>
              {alert.body ? <p className="mt-1 text-xs opacity-90">{alert.body}</p> : null}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
