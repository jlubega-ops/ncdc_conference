import Image from "next/image";
import { cn } from "@/lib/cn";
import { brandAssets, isRuntimeUploadSrc } from "@/lib/assets";

/**
 * Organisation logos are often wide wordmarks, not squares.
 * Constrains height and lets width follow the image aspect ratio.
 *
 * @param {{
 *   src?: string | null;
 *   alt?: string;
 *   className?: string;
 *   maxHeightClass?: string;
 *   maxWidthClass?: string;
 *   priority?: boolean;
 * }} props
 */
export function OrganiserLogo({
  src,
  alt = "Organisation logo",
  className,
  maxHeightClass = "h-10",
  maxWidthClass = "max-w-[12rem]",
  priority = false,
}) {
  const resolved = String(src || "").trim() || brandAssets.logo;
  return (
    <Image
      src={resolved}
      alt={alt}
      width={320}
      height={96}
      className={cn(
        "w-auto object-contain object-left",
        maxHeightClass,
        maxWidthClass,
        className,
      )}
      style={{ width: "auto" }}
      priority={priority}
      unoptimized={isRuntimeUploadSrc(resolved) || resolved.includes("/assets/")}
    />
  );
}
