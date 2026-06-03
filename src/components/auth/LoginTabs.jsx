"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { StaffLoginForm } from "@/components/auth/StaffLoginForm";
import { AccessKeyLoginForm } from "@/components/auth/AccessKeyLoginForm";

const TABS = [
  { id: "access", label: "Conference access" },
  { id: "staff", label: "Staff sign in" },
];

/**
 * @param {{ defaultTab?: "access" | "staff" }} props
 */
export function LoginTabs({ defaultTab = "access" }) {
  const [tab, setTab] = useState(defaultTab === "staff" ? "staff" : "access");

  return (
    <div>
      <div className="flex rounded-lg border border-border bg-background p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-surface text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "staff" ? <StaffLoginForm /> : <AccessKeyLoginForm />}
      </div>
    </div>
  );
}
