import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  FileText,
  HeartHandshake,
  KanbanSquare,
  LayoutDashboard,
  LineChart,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  MessagesSquare,
  PenLine,
  Radar,
  Repeat,
  Settings,
  UserRound,
  Users,
} from "lucide-react";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/crm", label: "CRM Pipeline", icon: KanbanSquare },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/conversations", label: "AI Inbox", icon: MessagesSquare },
  { to: "/analytics", label: "AI Analytics", icon: BarChart3 },
  { to: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  { to: "/settings/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { to: "/settings/agency", label: "Settings", icon: Settings },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

/** Reserved slots for the future UMRAIO® AI workforce. Navigation only — not yet implemented. */
const futureModules = [
  { label: "AI WhatsApp Executive", icon: MessageCircle },
  { label: "AI Marketing Executive", icon: Megaphone },
  { label: "AI Content Executive", icon: PenLine },
  { label: "AI Lead Intelligence", icon: Radar },
  { label: "AI Quotation Executive", icon: FileText },
  { label: "AI Follow-up Executive", icon: Repeat },
  { label: "AI Customer Success Executive", icon: HeartHandshake },
  { label: "AI Business Insights", icon: LineChart },
] as const;

/** Highlights the nav entry that owns the current pathname, including nested routes. */
function isActive(pathname: string, to: string) {
  if (to === "/settings/whatsapp") return pathname === to;
  if (to === "/settings/agency")
    return pathname.startsWith("/settings") && pathname !== "/settings/whatsapp";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out.");
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = isActive(pathname, item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}

      <p className="mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        AI Workforce
      </p>
      <ul className="mt-1 flex flex-col gap-1">
        {futureModules.map((module) => (
          <li
            key={module.label}
            className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/60"
            aria-disabled="true"
          >
            <module.icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{module.label}</span>
            <span className="ml-auto shrink-0 rounded-full border border-border/70 px-2 py-0.5 text-[9px] uppercase tracking-wider">
              Soon
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar p-5 lg:flex">
        <div>
          <BrandLogo showTagline className="mb-8" />
          {nav}
        </div>
        <SignOutBlock email={user?.email ?? ""} onSignOut={handleSignOut} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-3 lg:hidden">
          <BrandLogo />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col justify-between bg-sidebar p-5">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div>
                <BrandLogo showTagline className="mb-8" />
                {nav}
              </div>
              <SignOutBlock email={user?.email ?? ""} onSignOut={handleSignOut} />
            </SheetContent>
          </Sheet>
        </header>

        <main id="main-content" className="min-w-0 flex-1 p-5 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SignOutBlock({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div className="space-y-3 border-t border-sidebar-border pt-4">
      <p className="truncate text-xs text-muted-foreground">{email}</p>
      <Button variant="outline" size="sm" className="w-full" onClick={onSignOut}>
        <LogOut aria-hidden="true" className="size-4" />
        Sign out
      </Button>
    </div>
  );
}
