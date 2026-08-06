import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

import { PageHeader } from "@/components/app/PageHeader";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/settings/agency", label: "Agency" },
  { to: "/settings/ai", label: "AI & Knowledge" },
  { to: "/settings/whatsapp", label: "WhatsApp" },
  { to: "/settings/notifications", label: "Notifications" },
  { to: "/settings/api-keys", label: "API Keys" },
  { to: "/settings/subscription", label: "Subscription" },
] as const;

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Configure your agency profile, AI Business Executive, channels and plan."
      />

      <nav
        aria-label="Settings sections"
        className="-mx-1 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={pathname === tab.to ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === tab.to
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
