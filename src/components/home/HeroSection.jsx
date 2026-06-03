import Image from "next/image";
import { Calendar, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { brandAssets } from "@/lib/assets";
import { platformStats } from "@/lib/data/conferences";

export function HeroSection() {
  return (
    <section className="relative min-h-[520px] border-b border-border overflow-hidden sm:min-h-[560px]">
      <Image
        src={brandAssets.building}
        alt="NCDC building"
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/50" />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-primary-light">NCDC Uganda</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            NCDC Conference Management Platform
          </h1>
          <p className="mt-4 text-lg text-white/85">
            Discover conferences, submit research papers, register for events, and
            access conference materials from one centralized platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="primary" icon={Calendar} href="/conferences">
              Browse Conferences
            </Button>
            <Button
              variant="outline"
              icon={FileText}
              href="/call-for-papers"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20"
            >
              Submit Research
            </Button>
          </div>
        </div>

        <dl className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          <div className="rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <dt className="flex items-center gap-2 text-sm text-white/80">
              <Icon icon={Calendar} size="sm" />
              Conferences Hosted
            </dt>
            <dd className="mt-2 text-2xl font-bold text-white">
              {platformStats.conferencesHosted}
            </dd>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <dt className="flex items-center gap-2 text-sm text-white/80">
              <Icon icon={Users} size="sm" />
              Participants
            </dt>
            <dd className="mt-2 text-2xl font-bold text-white">
              {platformStats.participants}
            </dd>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <dt className="flex items-center gap-2 text-sm text-white/80">
              <Icon icon={FileText} size="sm" />
              Research Papers Submitted
            </dt>
            <dd className="mt-2 text-2xl font-bold text-white">
              {platformStats.papersSubmitted}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
