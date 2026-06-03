import Image from "next/image";
import { brandAssets } from "@/lib/assets";

/**
 * Sign-in / sign-up shell with NCDC background image.
 * @param {{ children: import("react").ReactNode }} props
 */
export function AuthPageLayout({ children }) {
  return (
    <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden">
      <Image
        src={brandAssets.building}
        alt=""
        fill
        className="object-cover"
        priority
        sizes="100vw"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-linear-to-br from-black/85 via-black/70 to-primary/30"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-lg flex-col justify-center px-4 py-12 sm:px-6">
        {children}
      </div>
    </div>
  );
}
