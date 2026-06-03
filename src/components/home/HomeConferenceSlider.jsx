import { ConferenceSlider } from "@/components/home/ConferenceSlider";

export function HomeConferenceSlider({ slides }) {
  return <ConferenceSlider slides={slides ?? []} />;
}
