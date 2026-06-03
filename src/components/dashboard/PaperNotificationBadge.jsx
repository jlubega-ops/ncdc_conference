"use client";

import { useEffect, useState } from "react";

/**
 * @param {{ className?: string }} props
 */
export function PaperNotificationBadge({ className }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/me/papers/notifications-count");
        const data = await res.json();
        if (!cancelled && res.ok) setCount(data.count ?? 0);
      } catch {
        if (!cancelled) setCount(0);
      }
    }

    load();

    function onChange() {
      load();
    }

    window.addEventListener("paper-notifications-changed", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("paper-notifications-changed", onChange);
    };
  }, []);

  if (count < 1) return null;

  return (
    <span
      className={
        className ??
        "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white"
      }
      aria-label={`${count} new paper notifications`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
