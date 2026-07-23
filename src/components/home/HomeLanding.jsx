import Image from "next/image";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { brandAssets } from "@/lib/assets";
import { HomeAccessPanel } from "@/components/home/HomeAccessPanel";

/**
 * Full-viewport home landing: cover image, brand copy, browse CTA, access panel.
 */
export function HomeLanding() {
  return (
    <section className="relative h-dvh max-h-dvh overflow-hidden">
      <Image
        src={brandAssets.building}
        alt=""
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/65 to-black/45" />

      <div className="relative flex h-full items-center">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          <div className="max-w-xl">
            <p className="text-sm font-medium tracking-wide text-primary-light uppercase">
              Conference platform
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Conference Management
            </h1>
            <p className="mt-4 text-base text-white/85 sm:text-lg">
              Discover open conferences, register for events, and manage programmes from one
              place.
            </p>
            <div className="mt-8">
              <Button variant="primary" icon={Calendar} href="/conferences" size="lg">
                Browse conferences
              </Button>
            </div>
          </div>

          <HomeAccessPanel />
        </div>
      </div>
    </section>
  );
}
