import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  UserRound,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;






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
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === item.to
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
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
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col justify-between bg-sidebar p-5">
              <div>
                <BrandLogo showTagline className="mb-8" />
                {nav}
              </div>
              <SignOutBlock email={user?.email ?? ""} onSignOut={handleSignOut} />
            </SheetContent>
          </Sheet>
        </header>

        <main className="min-w-0 flex-1 p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

function SignOutBlock({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <div className="space-y-3 border-t border-sidebar-border pt-4">
      <p className="truncate text-xs text-muted-foreground">{email}</p>
      <Button variant="outline" size="sm" className="w-full" onClick={onSignOut}>
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  );
}
