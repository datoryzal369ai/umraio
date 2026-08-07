import { Link } from "@tanstack/react-router";

import logoAsset from "@/assets/umraio-logo.png.asset.json";
import wordmarkAsset from "@/assets/umraio-wordmark-tm.png.asset.json";
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
        "group flex items-center gap-3.5 transition-opacity duration-300 hover:opacity-90 sm:gap-4",
        className,
      )}
    >
      <img
        src={logoAsset.url}
        alt="UMRAIO® logo"
        className="size-14 shrink-0 rounded-2xl object-cover ring-1 ring-border transition-shadow duration-300 group-hover:glow-ring"
        width={55}
        height={55}
      />
      <span className="flex min-w-0 flex-col">
        <img
          src={wordmarkAsset.url}
          alt="UMRAIO®"
          className="h-7 w-auto object-contain sm:h-8"
        />
        {showTagline ? (
          <span className="mt-2 text-[9px] font-light uppercase tracking-[0.3em] text-muted-foreground sm:text-[10px]">
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
