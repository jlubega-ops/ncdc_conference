import { canViewConferenceContent } from "@/lib/conferences/visibility";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { normalizeBreakoutRooms } from "@/lib/conferences/utils";

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
export function BreakoutRoomsSection({ conference, className, registrationStatus }) {
  if (!canViewConferenceContent(conference, "viewOnlineLinks", registrationStatus)) return null;

  const settings = normalizeBreakoutRooms(conference.breakoutRooms);
  if (!settings.allowed || settings.rooms.length === 0) return null;

  const rooms = settings.rooms;

  return (
    <section className={className}>
      <h3 className="text-sm font-semibold text-foreground">
        Breakout room{rooms.length === 1 ? "" : "s"}
      </h3>
      <div className="mt-3 space-y-3 rounded-md border border-border bg-background p-4">
        {rooms.map((room) => {
          const href = hrefForLink(room.link);
          return (
            <div key={room.id} className="border-b border-border pb-3 last:border-b-0 last:pb-0">
              <p className="text-xs font-medium text-muted-foreground">
                {room.platform || "Breakout room"}
              </p>
              {room.topic ? (
                <p className="mt-1 text-sm font-medium text-foreground">{room.topic}</p>
              ) : null}
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block break-all text-sm text-primary hover:underline"
                >
                  {room.link}
                </a>
              ) : null}
              {room.description ? (
                <div className="mt-1">
                  <LinkifiedText text={room.description} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
