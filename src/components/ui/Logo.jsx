import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { brandAssets } from "@/lib/assets";

/**
 * @param {object} props
 * @param {"sm"|"md"|"lg"} [props.size]
 * @param {boolean} [props.showText]
 * @param {boolean} [props.linkToHome]
 */
export function Logo({ size = "md", showText = true, linkToHome = true, className }) {
  const sizes = {
    sm: { img: 32, text: "text-sm" },
    md: { img: 40, text: "text-sm" },
    lg: { img: 52, text: "text-base" },
  };

  const { img, text } = sizes[size];

  const content = (
    <span className={cn("flex shrink-0 items-center gap-3", className)}>
      <Image
        src={brandAssets.logo}
        alt="NCDC logo"
        width={img * 2}
        height={img}
        className="h-8 w-auto object-contain sm:h-10"
        style={{ width: "auto", height: "auto", maxHeight: size === "lg" ? "2.5rem" : "2rem" }}
        priority={size !== "sm"}
      />
      {showText ? (
        <span className="hidden sm:block">
          <span className={cn("block font-semibold text-foreground", text)}>NCDC</span>
          <span className="block text-xs text-muted-foreground">Conference Platform</span>
        </span>
      ) : null}
    </span>
  );

  if (linkToHome) {
    return (
      <Link href="/" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
        {content}
      </Link>
    );
  }

  return content;
}
