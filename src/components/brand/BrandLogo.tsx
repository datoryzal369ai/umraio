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
    <Link
      to="/"
      className={cn(
        "group flex items-center gap-3 transition-opacity duration-300 hover:opacity-90",
        className,
      )}
    >
      <img
        src={logoAsset.url}
        alt="UMRAIO® logo"
        className="size-11 rounded-2xl object-cover ring-1 ring-border transition-shadow duration-300 group-hover:glow-ring"
        width={44}
        height={44}
      />
      <span className="flex flex-col leading-none">
        <span className="brand-wordmark text-xl font-extrabold sm:text-2xl">
          UMRAIO<sup className="align-super text-[0.5em] tracking-normal">®</sup>
        </span>
        {showTagline ? (
          <span className="mt-1.5 text-[9px] uppercase tracking-[0.26em] text-muted-foreground sm:text-[10px]">
            Autonomous AI Business Executive
          </span>
        ) : null}
      </span>
    </Link>

  );
}

/** The robot mark from the official logo — used as the AI Executive's identity in the UI. */
export function AssistantAvatar({ className, size = 32 }: { className?: string; size?: number }) {
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
