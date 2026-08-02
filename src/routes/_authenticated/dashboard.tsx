import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, MailWarning, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — UMRAIO AI Sales Executive" },
      {
        name: "description",
        content: "Your UMRAIO agency workspace: account status, team and AI sales configuration.",
      },
      { property: "og:title", content: "Dashboard — UMRAIO" },
      { property: "og:description", content: "Your UMRAIO agency workspace." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, agency_id, agencies(name, plan, country)")
          .eq("id", user!.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);
      return { profile, roles: roles ?? [] };
    },
  });

  const verified = Boolean(user?.email_confirmed_at);
  const agency = data?.profile?.agencies as { name: string; plan: string } | null | undefined;

  async function resendVerification() {
    if (!user?.email) return;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Verification email sent.");
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {agency?.name ?? "Your agency"}
        </p>
        <h1 className="mt-2 text-3xl font-bold">
          Welcome{data?.profile?.full_name ? `, ${data.profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is live. The AI Sales Executive modules land in the next build phase.
        </p>
      </header>

      {!verified ? (
        <div className="panel flex flex-col gap-3 border-primary/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <MailWarning className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">Verify your email address</p>
              <p className="text-sm text-muted-foreground">
                Confirm {user?.email} to unlock full workspace access.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={resendVerification}>
            Resend email
          </Button>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat
          icon={BadgeCheck}
          label="Email status"
          value={verified ? "Verified" : "Pending"}
        />
        <Stat icon={ShieldCheck} label="Your role" value={data?.roles?.[0]?.role ?? "owner"} />
        <Stat icon={Users} label="Plan" value={agency?.plan ?? "trial"} />
      </section>

      <div className="panel p-6">
        <h2 className="text-lg font-semibold">Next up</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Authentication is complete. The next phase adds the inbox, lead pipeline, package
          catalogue and AI persona configuration.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/profile">Complete your profile</Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BadgeCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="panel p-5">
      <Icon className="size-5 text-primary" />
      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold capitalize">{value}</p>
    </div>
  );
}
