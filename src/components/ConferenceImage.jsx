import Image from "next/image";
import { cn } from "@/lib/cn";
import { isRuntimeUploadSrc, resolveConferenceImageSrc } from "@/lib/assets";

/**
 * @param {object} props
 * @param {string} [props.src]
 * @param {string} props.alt
 * @param {string} [props.className]
 * @param {"cover"|"contain"} [props.objectFit]
 * @param {boolean} [props.priority]
 */
export function ConferenceImage({
  src,
  alt,
  className,
  objectFit = "cover",
  priority = false,
}) {
  const resolved = resolveConferenceImageSrc(src);
  return (
    <Image
      src={resolved}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className={cn(objectFit === "cover" ? "object-cover" : "object-contain", className)}
      priority={priority}
      unoptimized={isRuntimeUploadSrc(resolved)}
    />
  );
}
