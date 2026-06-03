"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ConferenceCard } from "@/components/ConferenceCard";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import {
  CATEGORIES,
  STATUS_LABELS,
} from "@/lib/conferences/constants";

const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function ConferenceSearch({ conferences = [] }) {
  const years = [...new Set(conferences.map((c) => c.year).filter(Boolean))].sort();
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");

  const locations = useMemo(
    () => [...new Set(conferences.map((c) => c.location.split(",").pop()?.trim() ?? c.location))],
    [],
  );

  const filtered = useMemo(() => {
    return conferences.filter((c) => {
      const matchesQuery =
        !query ||
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.shortDescription.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase());
      const matchesYear = !year || c.year === Number(year);
      const matchesCategory = !category || c.category === category;
      const matchesStatus = !status || c.status === status;
      const matchesLocation =
        !location || c.location.toLowerCase().includes(location.toLowerCase());
      return matchesQuery && matchesYear && matchesCategory && matchesStatus && matchesLocation;
    });
  }, [query, year, category, status, location]);

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">
          Search & Filter Conferences
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Find conferences by name, year, category, status, or location.
        </p>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <Icon
              icon={Search}
              size="sm"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              placeholder="Search conferences..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-surface pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground"
              aria-label="Filter by year"
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground"
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground"
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground"
              aria-label="Filter by location"
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(category === cat ? "" : cat)}
                className={cn(
                  "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
                  category === cat
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border bg-surface text-muted-foreground hover:border-primary/30",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, 6).map((conference) => (
              <ConferenceCard key={conference.slug} conference={conference} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            No conferences match your search criteria.
          </p>
        )}
      </div>
    </section>
  );
}
