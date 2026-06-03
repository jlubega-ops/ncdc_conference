import { iconSize } from "@/theme/tokens";
import { cn } from "@/lib/cn";

const sizeClasses = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
  xl: "size-8",
};

/**
 * Consistent icon wrapper for Lucide icons.
 *
 * @example
 * import { Calendar } from "lucide-react";
 * <Icon icon={Calendar} size="md" />
 */
export function Icon({ icon: IconComponent, size = "md", className, ...props }) {
  return (
    <IconComponent
      aria-hidden={props["aria-label"] ? undefined : true}
      className={cn("shrink-0", sizeClasses[size], className)}
      size={iconSize[size]}
      strokeWidth={1.75}
      {...props}
    />
  );
}
