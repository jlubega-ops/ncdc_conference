import { Loader2 } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { ROLE_LABELS } from "@/lib/auth/roles";

export function RoleSwitchOverlay({ active, targetRole }) {
  if (!active) return null;

  const label = targetRole ? ROLE_LABELS[targetRole] ?? targetRole : "role";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-md"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-label="Switching role"
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface/90 p-8 text-center shadow-lg backdrop-blur-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-light text-primary">
          <Icon icon={Loader2} size="lg" className="animate-spin" />
        </div>
        <p className="mt-4 text-base font-semibold text-foreground">Switching role</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Activating <span className="font-medium text-foreground">{label}</span>…
        </p>
      </div>
    </div>
  );
}
