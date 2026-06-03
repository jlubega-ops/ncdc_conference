import { canViewConferenceContent } from "@/lib/conferences/visibility";
import { LinkifiedText } from "@/components/ui/LinkifiedText";

/**
 * @param {{ conference: any, className?: string }} props
 */
export function OnlineStreamSection({ conference, className }) {
  if (!canViewConferenceContent(conference, "viewOnlineLinks")) return null;

  const stream = conference.onlineStream;
  const youtubeLink = stream?.youtubeLink?.trim();
  const zoomDetails = stream?.zoomDetails?.trim();

  if (!youtubeLink && !zoomDetails) return null;

  return (
    <section className={className}>
      <h3 className="text-sm font-semibold text-foreground">Online stream</h3>
      <div className="mt-3 space-y-3 rounded-md border border-border bg-background p-4">
        {youtubeLink ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground">YouTube</p>
            <a
              href={youtubeLink.startsWith("http") ? youtubeLink : `https://${youtubeLink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-primary hover:underline"
            >
              {youtubeLink}
            </a>
          </div>
        ) : null}
        {zoomDetails ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Zoom</p>
            <LinkifiedText text={zoomDetails} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
