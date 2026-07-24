import { canViewConferenceContent } from "@/lib/conferences/visibility";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { normalizeOnlineStream } from "@/lib/conferences/utils";

/**
 * @param {string} link
 */
function hrefForLink(link) {
  const raw = String(link || "").trim();
  if (!raw) return null;
  return raw.startsWith("http") ? raw : `https://${raw}`;
}

/**
 * @param {{ conference: any, className?: string, registrationStatus?: string | null }} props
 */
export function OnlineStreamSection({ conference, className, registrationStatus }) {
  if (!canViewConferenceContent(conference, "viewOnlineLinks", registrationStatus)) return null;

  const streams = normalizeOnlineStream(conference.onlineStream);
  if (streams.length === 0) return null;

  return (
    <section className={className}>
      <h3 className="text-sm font-semibold text-foreground">
        Online stream{streams.length === 1 ? "" : "s"}
      </h3>
      <div className="mt-3 space-y-3 rounded-md border border-border bg-background p-4">
        {streams.map((entry) => {
          const href = hrefForLink(entry.link);
          return (
            <div key={entry.id} className="border-b border-border pb-3 last:border-b-0 last:pb-0">
              <p className="text-xs font-medium text-muted-foreground">
                {entry.platform || "Stream"}
              </p>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block break-all text-sm text-primary hover:underline"
                >
                  {entry.link}
                </a>
              ) : null}
              {entry.description ? (
                <div className="mt-1">
                  <LinkifiedText text={entry.description} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
