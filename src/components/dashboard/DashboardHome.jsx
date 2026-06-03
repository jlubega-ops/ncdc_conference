import { ROLE_LABELS } from "@/lib/auth/roles";

/**
 * @param {{ session: import("@/lib/auth/session").getCurrentSession extends () => Promise<infer S> ? NonNullable<S> : never }} props
 */
export function DashboardHome({ session }) {
  const roleLabel = ROLE_LABELS[session.activeRole] ?? session.activeRole;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
        Welcome{session.user.name ? `, ${session.user.name}` : ""}
      </h1>
      <p className="mt-2 text-muted-foreground">
        You are signed in as{" "}
        <span className="font-medium text-primary">{roleLabel}</span>. Use the sidebar
        to navigate — menu items match your current role permissions.
      </p>

      {session.canSwitchRole ? (
        <p className="mt-4 rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
          You have multiple roles. Open your profile menu (top right) to switch roles
          without signing out.
        </p>
      ) : null}

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4">
          <dt className="text-xs font-medium uppercase text-muted-foreground">Email</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{session.user.email}</dd>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <dt className="text-xs font-medium uppercase text-muted-foreground">
            Assigned roles
          </dt>
          <dd className="mt-1 text-sm text-foreground">
            {session.availableRoles.map((r) => ROLE_LABELS[r] ?? r).join(", ")}
          </dd>
        </div>
      </dl>
    </div>
  );
}
