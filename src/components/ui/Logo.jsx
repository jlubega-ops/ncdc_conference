"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { brandAssets } from "@/lib/assets";
import { useOrganiserBrand } from "@/components/layout/OrganiserBrandProvider";
import { OrganiserLogo } from "@/components/ui/OrganiserLogo";

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
    sm: { height: "h-8", maxWidth: "max-w-[9rem]", text: "text-sm" },
    md: { height: "h-9 sm:h-10", maxWidth: "max-w-[11rem]", text: "text-sm" },
    lg: { height: "h-10 sm:h-12", maxWidth: "max-w-[14rem]", text: "text-base" },
  };

  const { height, maxWidth, text } = sizes[size];

  const content = (
    <span className={cn("flex min-w-0 shrink items-center gap-3", className)}>
      <OrganiserLogo
        src={logoSrc}
        alt={label}
        maxHeightClass={height}
        maxWidthClass={maxWidth}
        priority={size !== "sm"}
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
