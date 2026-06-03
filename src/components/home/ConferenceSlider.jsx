"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { STATUS_LABELS } from "@/lib/conferences/constants";

const AUTO_ADVANCE_MS = 6000;

/**
 * @param {{ slides: Array<{ slug: string, title: string, dateRange: string, location: string, status: string, image: string, imageAlt: string }> }} props
 */
export function ConferenceSlider({ slides }) {
  const [index, setIndex] = useState(0);

  const goTo = useCallback(
    (next) => {
      setIndex((i) => (next + slides.length) % slides.length);
    },
    [slides.length],
  );

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[index];
  const statusLabel = STATUS_LABELS[slide.status] ?? slide.status;

  return (
    <section
      className="relative border-b border-border bg-neutral-900"
      aria-label="Upcoming conferences"
      aria-roledescription="carousel"
    >
      <div className="relative aspect-[21/9] max-h-[420px] min-h-[220px] w-full overflow-hidden sm:min-h-[280px] lg:min-h-[360px]">
        {slides.map((s, i) => (
          <div
            key={`${s.slug}-${s.image}-${i}`}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            aria-hidden={i !== index}
          >
            <Image
              src={s.image}
              alt={s.imageAlt}
              fill
              className="object-cover"
              sizes="100vw"
              priority={i === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30" />
          </div>
        ))}

        <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-8 pt-16 sm:px-8 sm:pb-10">
          <span className="mb-3 inline-flex w-fit rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
            {statusLabel}
          </span>
          <h2 className="max-w-2xl text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            {slide.title}
          </h2>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/90">
            <span className="inline-flex items-center gap-2">
              <Icon icon={Calendar} size="sm" />
              {slide.dateRange}
            </span>
            <span className="inline-flex items-center gap-2">
              <Icon icon={MapPin} size="sm" />
              {slide.location}
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="primary" href={`/conferences/${slide.slug}`}>
              View Details
            </Button>
            <Button
              variant="outline"
              href={`/conferences/${slide.slug}/register`}
              className="border-white/40 bg-white/10 text-white hover:bg-white/20"
            >
              Register
            </Button>
          </div>
        </div>

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              className="absolute left-3 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-md bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label="Previous slide"
            >
              <Icon icon={ChevronLeft} size="md" />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              className="absolute right-3 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-md bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label="Next slide"
            >
              <Icon icon={ChevronRight} size="md" />
            </button>

            <div className="absolute bottom-4 right-4 z-20 flex gap-2 sm:right-8">
              {slides.map((s, i) => (
                <button
                  key={`dot-${s.slug}-${i}`}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    "size-2 rounded-full transition-colors",
                    i === index ? "bg-primary" : "bg-white/50 hover:bg-white/80",
                  )}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === index}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
