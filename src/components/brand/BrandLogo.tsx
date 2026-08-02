import { Link } from "@tanstack/react-router";

import markAsset from "@/assets/umraio-mark.png.asset.json";
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
        src={markAsset.url}
        alt="UMRAIO logo"
        className="h-10 w-10 rounded-full object-cover"
        width={40}
        height={40}
      />
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-bold tracking-tight">UMRAIO</span>
        {showTagline ? (
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            AI Sales Executive
          </span>
        ) : null}
      </span>
    </Link>
  );
}
