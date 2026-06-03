"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LogOut, User, RefreshCw } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useSession } from "@/components/auth/SessionProvider";
import { ROLE_LABELS } from "@/lib/auth/roles";

function UserAvatar({ user, size = 36 }) {
  if (user?.image) {
    return (
      <Image
        src={user.image}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover"
      />
    );
  }

  const initial = (user?.name?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();
  return (
    <span
      className="flex items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function ProfileMenu() {
  const { session, logout, switchRole, switching } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (!session) return null;

  const { user, activeRole, availableRoles, canSwitchRole } = session;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-md border border-border bg-surface p-1 pr-2 transition-colors",
          "hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={switching}
      >
        <UserAvatar user={user} />
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-foreground sm:block">
          {user.name ?? user.email}
        </span>
        <Icon icon={ChevronDown} size="sm" className="text-muted-foreground" />
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-border bg-surface py-1 shadow-lg"
          role="menu"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-foreground">
              {user.name ?? "Account"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <p className="mt-1 text-xs font-medium text-primary">
              {ROLE_LABELS[activeRole] ?? activeRole}
            </p>
          </div>

          <Link
            href="/dashboard/profile"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-neutral-50"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Icon icon={User} size="sm" />
            Profile
          </Link>

          {canSwitchRole ? (
            <div className="border-t border-border py-1">
              <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Switch role
              </p>
              {availableRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  role="menuitem"
                  disabled={role === activeRole || switching}
                  onClick={() => {
                    setOpen(false);
                    switchRole(role);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2 text-sm text-left",
                    role === activeRole
                      ? "bg-primary-light font-medium text-primary"
                      : "text-foreground hover:bg-neutral-50",
                  )}
                >
                  <Icon icon={RefreshCw} size="sm" />
                  {ROLE_LABELS[role] ?? role}
                  {role === activeRole ? (
                    <span className="ml-auto text-xs">Active</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

          <div className="border-t border-border py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-neutral-50"
            >
              <Icon icon={LogOut} size="sm" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
