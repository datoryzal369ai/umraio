import { Link } from "@tanstack/react-router";

import logoAsset from "@/assets/umraio-logo.png.asset.json";
import robotAsset from "@/assets/umraio-robot.png.asset.json";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  showTagline = false,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <Link to="/" className={cn("flex items-center gap-3", className)}>
      <img
        src={logoAsset.url}
        alt="UMRAIO® logo"
        className="h-10 w-10 rounded-full object-cover ring-1 ring-border"
        width={40}
        height={40}
      />
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-bold tracking-tight">UMRAIO®</span>
        {showTagline ? (
          <span className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            AI Autonomous Business Executive
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/** The robot mark from the official logo — used as the AI Executive's identity in the UI. */
export function AssistantAvatar({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <img
      src={robotAsset.url}
      alt="UMRAIO AI Executive"
      width={size}
      height={size}
      className={cn(
        "rounded-full bg-surface object-contain ring-1 ring-border/70 backdrop-blur",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
