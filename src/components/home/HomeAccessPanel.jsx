"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Search } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

/**
 * Home access panel: search open conferences by name/reference.
 * Code access lives on /access for shareable links.
 */
export function HomeAccessPanel() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [openList, setOpenList] = useState(false);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    function onPointerDown(e) {
      if (!wrapRef.current?.contains(e.target)) setOpenList(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return undefined;
    }

    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/conferences/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.conferences ?? []);
        setOpenList(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function selectConference(item) {
    setOpenList(false);
    router.push(item.href);
  }

  return (
    <div
      ref={wrapRef}
      className="w-full max-w-md rounded-xl border border-white/20 bg-white/95 p-5 shadow-lg backdrop-blur-sm sm:p-6"
    >
      <h2 className="text-base font-semibold text-foreground">Search conferences</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Search by conference name or reference. Only open conferences are shown.
      </p>

      <div className="relative mt-5">
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Name or reference
        </label>
        <div className="relative">
          <Icon
            icon={Search}
            size="sm"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpenList(true)}
            placeholder="Start typing a name or reference…"
            className="h-10 w-full rounded-md border border-border bg-surface pr-3 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            autoComplete="off"
          />
        </div>

        {openList && query.trim().length >= 2 ? (
          <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-md">
            {searching ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">Searching…</li>
            ) : results.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">
                No open conferences match your search.
              </li>
            ) : (
              results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => selectConference(item)}
                    className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-primary-light/60"
                  >
                    <span className="text-sm font-medium text-foreground">{item.title}</span>
                    <span className="text-xs text-muted-foreground">
                      Ref: {item.reference}
                      {item.dateRange ? ` · ${item.dateRange}` : ""}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      <Link
        href="/access"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary-light/40"
      >
        <Icon icon={KeyRound} size="sm" className="text-primary" />
        Sign in with access code
      </Link>

      <p className="mt-5 border-t border-border pt-4 text-center text-sm text-muted-foreground">
        Administrator or staff?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
