"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { brandAssets, isRuntimeUploadSrc } from "@/lib/assets";
import { useOrganiserBrand } from "@/components/layout/OrganiserBrandProvider";

/**
 * @param {object} props
 * @param {"sm"|"md"|"lg"} [props.size]
 * @param {boolean} [props.showText]
 * @param {boolean} [props.linkToHome]
 */
export function Logo({ size = "md", showText = true, linkToHome = true, className }) {
  const { brand } = useOrganiserBrand();
  const logoSrc = brand?.logo || brandAssets.logo;
  const label = brand?.name || "Conference Management";

  const sizes = {
    sm: { img: 32, text: "text-sm" },
    md: { img: 40, text: "text-sm" },
    lg: { img: 52, text: "text-base" },
  };

  const { img, text } = sizes[size];

  const content = (
    <span className={cn("flex shrink-0 items-center gap-3", className)}>
      <Image
        src={logoSrc}
        alt={label}
        width={img * 2}
        height={img}
        className="h-8 w-auto object-contain sm:h-10"
        style={{ width: "auto", height: "auto", maxHeight: size === "lg" ? "2.5rem" : "2rem" }}
        priority={size !== "sm"}
        unoptimized={isRuntimeUploadSrc(logoSrc)}
      />
      {showText ? (
        <span className="hidden sm:block">
          <span className={cn("block font-semibold text-foreground", text)}>{label}</span>
          {brand?.shortName ? (
            <span className="block text-[11px] font-medium text-muted-foreground">
              {brand.shortName}
            </span>
          ) : null}
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
