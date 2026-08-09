import umraioAsset from "@/assets/umraio-official-wordmark.png.asset.json";
import umraverseAsset from "@/assets/umraverse-logo.png.asset.json";
import renaiAsset from "@/assets/renai-core-logo.png.asset.json";
import { cn } from "@/lib/utils";

function Connector() {
  return (
    <span
      aria-hidden
      className="my-10 block h-14 w-px bg-gradient-to-b from-transparent via-primary/40 to-transparent sm:my-14 sm:h-20"
    />
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-light uppercase tracking-[0.42em] text-muted-foreground/70">
      {children}
    </p>
  );
}

/** Single source of truth for the UMRAIO brand architecture + corporate attribution. */
export function BrandArchitecture({ className }: { className?: string }) {
  return (
    <footer
      className={cn("border-t border-border/50 px-6 py-20 sm:px-10 sm:py-28", className)}
      aria-label="Brand architecture"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        {/* PRIMARY — UMRAIO */}
        <img
          src={umraioAsset.url}
          alt="UMRAIO® — Autonomous AI Business Executive"
          loading="lazy"
          className="h-auto w-full max-w-[260px] object-contain mix-blend-screen sm:max-w-[340px]"
        />
        <p className="mt-3 text-[10px] font-light uppercase leading-[1.6] tracking-[0.3em] text-muted-foreground sm:text-[11px]">
          Autonomous AI Business Executive
        </p>

        <Connector />

        {/* SECONDARY — RÉNAI.CORE */}
        <Label>Powered by</Label>
        <img
          src={renaiAsset.url}
          alt="RÉNAI.CORE™ — The Autonomous Intelligence Core"
          loading="lazy"
          className="mt-6 h-auto w-full max-w-[280px] object-contain mix-blend-screen sm:max-w-[400px]"
        />


        <Connector />

        {/* TERTIARY — UMRAVERSE */}
        <Label>Part of</Label>
        <img
          src={umraverseAsset.url}
          alt="UMRAVERSE® — Your Umrah Universe"
          loading="lazy"
          className="mt-6 h-auto w-full max-w-[200px] object-contain mix-blend-screen sm:max-w-[260px]"
        />


        <Connector />

        {/* CORPORATE OWNER */}
        <Label>Developed and owned by</Label>
        <p className="mt-3 text-sm font-medium tracking-tight text-foreground/80">
          Digital Renaissance Metaverse
        </p>
      </div>
    </footer>
  );
}
