import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

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
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your agency profile, AI Sales Executive, channels and plan.
        </p>
      </header>

      <nav className="-mx-1 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
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
