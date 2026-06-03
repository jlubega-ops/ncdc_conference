import { HeroSection } from "@/components/home/HeroSection";
import { QuickActions } from "@/components/home/QuickActions";
import { FeaturedConferences } from "@/components/home/FeaturedConferences";
import { ConferenceSearch } from "@/components/home/ConferenceSearch";
import { CallsForPapers } from "@/components/home/CallsForPapers";
import { ImportantDates } from "@/components/home/ImportantDates";
import { ResourcesSection } from "@/components/home/ResourcesSection";
import { Announcements } from "@/components/home/Announcements";
import { WhyPlatform } from "@/components/home/WhyPlatform";
import {
  buildFeaturedConferences,
  buildOpenCalls,
  buildUpcomingDeadlines,
  getPublishedConferences,
} from "@/lib/conferences/service";

export const metadata = {
  title: "NCDC Conference Management Platform",
  description:
    "Discover conferences, submit research papers, register for events, and access conference materials from one centralized platform.",
};

export default async function HomePage() {
  const conferences = await getPublishedConferences();
  const featured = buildFeaturedConferences(conferences, 6);
  const calls = buildOpenCalls(conferences);
  const deadlines = buildUpcomingDeadlines(conferences, 6);

  return (
    <>
      <HeroSection />
      <QuickActions />
      <FeaturedConferences conferences={featured} />
      <ConferenceSearch conferences={conferences} />
      <CallsForPapers calls={calls} />
      <ImportantDates deadlines={deadlines} />
      <ResourcesSection />
      <Announcements />
      <WhyPlatform />
    </>
  );
}
