import Image from "next/image";
import { brandAssets } from "@/lib/assets";
import { ConferenceImage } from "@/components/ConferenceImage";
import { cn } from "@/lib/cn";

/**
 * @param {{
 *   children: import("react").ReactNode;
 *   eyebrow?: string;
 *   title: string;
 *   subtitle?: string;
 *   conference?: { cardImage?: string; slug?: string; title?: string };
 *   maxWidth?: "md" | "lg" | "xl";
 *   footer?: import("react").ReactNode;
 * }} props
 */
export function PublicFormLayout({
  children,
  eyebrow,
  title,
  subtitle,
  conference,
  maxWidth = "lg",
  footer,
}) {
  const maxClass =
    maxWidth === "xl" ? "max-w-4xl" : maxWidth === "md" ? "max-w-lg" : "max-w-3xl";

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-background">
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <Image
          src={brandAssets.building}
          alt=""
          fill
          className="object-cover opacity-30"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-b from-background/40 via-background/85 to-background" />
      </div>

      <div className={cn("relative mx-auto px-4 py-10 sm:px-6 sm:py-14", maxClass)}>
        {conference?.cardImage ? (
          <div className="relative mb-6 overflow-hidden rounded-xl border border-border shadow-md">
            <div className="relative h-36 w-full sm:h-44">
              <ConferenceImage src={conference.cardImage} alt={conference.title || title} />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/35 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                {eyebrow ? (
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">{title}</h1>
                {subtitle ? (
                  <p className="mt-1 text-sm text-white/85">{subtitle}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <header className="mb-6 text-center sm:text-left">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </header>
        )}

        <div className="rounded-xl border border-border/80 bg-surface/95 p-6 shadow-lg backdrop-blur-sm sm:p-8">
          {children}
        </div>

        {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  );
}
