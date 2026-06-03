import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

const variants = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-dark focus-visible:ring-primary/30",
  secondary:
    "border border-primary bg-surface text-primary hover:bg-primary-light focus-visible:ring-primary/20",
  ghost:
    "text-foreground hover:bg-neutral-100 focus-visible:ring-neutral-300/50",
  outline:
    "border border-border bg-surface text-foreground hover:bg-neutral-50 focus-visible:ring-neutral-300/50",
  danger:
    "bg-error text-white hover:bg-error/90 focus-visible:ring-error/30",
};

const sizes = {
  sm: "h-8 gap-1.5 px-3 text-sm",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-11 gap-2 px-5 text-base",
};

/**
 * @param {object} props
 * @param {"primary"|"secondary"|"ghost"|"outline"|"danger"} [props.variant]
 * @param {"sm"|"md"|"lg"} [props.size]
 * @param {import("lucide-react").LucideIcon} [props.icon]
 * @param {"left"|"right"} [props.iconPosition]
 */
export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  className,
  children,
  disabled,
  type = "button",
  href,
  ...props
}) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-md font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );

  const content = (
    <>
      {icon && iconPosition === "left" ? (
        <Icon icon={icon} size={size === "lg" ? "md" : "sm"} />
      ) : null}
      {children}
      {icon && iconPosition === "right" ? (
        <Icon icon={icon} size={size === "lg" ? "md" : "sm"} />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={classes}
      {...props}
    >
      {content}
    </button>
  );
}
