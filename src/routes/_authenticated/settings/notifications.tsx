import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { fetchAgency, fetchSettings, updateSettings } from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/settings/notifications")({
  head: () => ({
    meta: [
      { title: "Notification Settings — UMRAIO" },
      {
        name: "description",
        content:
          "Choose when UMRAIO alerts your team about new leads, hot prospects, bookings and due follow-ups.",
      },
      { property: "og:title", content: "Notification Settings — UMRAIO" },
      {
        property: "og:description",
        content: "Alerts for new leads, hot leads, bookings and follow-ups.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationSettingsPage,
});

const EVENTS = [
  { key: "notify_new_lead", title: "New lead", description: "A new enquiry enters the pipeline." },
  {
    key: "notify_hot_lead",
    title: "Hot lead detected",
    description: "The AI marks a prospect as hot and ready to close.",
  },
  {
    key: "notify_booking",
    title: "Booking confirmed",
    description: "A lead converts to a booking.",
  },
  {
    key: "notify_followup_due",
    title: "Follow-up due",
    description: "A scheduled follow-up task reaches its run time.",
  },
  {
    key: "notify_daily_summary",
    title: "Daily summary",
    description: "End-of-day recap of leads, replies and bookings.",
  },
] as const;

const CHANNELS = [
  { key: "notify_email", title: "Email", description: "Send alerts to your agency contact email." },
  {
    key: "notify_whatsapp",
    title: "WhatsApp",
    description: "Send alerts to your connected WhatsApp Business number.",
  },
] as const;

type Keys = (typeof EVENTS)[number]["key"] | (typeof CHANNELS)[number]["key"];

function Row({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}

function NotificationSettingsPage() {
  const queryClient = useQueryClient();
  const { data: agency } = useQuery({ queryKey: ["agency"], queryFn: fetchAgency });
  const { data: settings, isLoading } = useQuery({
    queryKey: ["agency-settings", agency?.id],
    queryFn: () => fetchSettings(agency!.id),
    enabled: Boolean(agency?.id),
  });

  const [form, setForm] = useState<Record<Keys, boolean>>({
    notify_new_lead: true,
    notify_hot_lead: true,
    notify_booking: true,
    notify_followup_due: true,
    notify_daily_summary: false,
    notify_email: true,
    notify_whatsapp: false,
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      notify_new_lead: settings.notify_new_lead,
      notify_hot_lead: settings.notify_hot_lead,
      notify_booking: settings.notify_booking,
      notify_followup_due: settings.notify_followup_due,
      notify_daily_summary: settings.notify_daily_summary,
      notify_email: settings.notify_email,
      notify_whatsapp: settings.notify_whatsapp,
    });
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      if (!settings) throw new Error("Settings not loaded.");
      return updateSettings(settings.id, form);
    },
    onSuccess: () => {
      toast.success("Notification preferences saved.");
      queryClient.invalidateQueries({ queryKey: ["agency-settings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !settings) return <Skeleton className="h-[420px] rounded-2xl" />;

  return (
    <div className="space-y-6">
      <section className="panel space-y-4 p-5">
        <header className="flex items-start gap-3">
          <div className="rounded-xl border border-border/60 bg-surface p-2.5">
            <Bell className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight">Events</h2>
            <p className="text-xs text-muted-foreground">
              Pick what deserves your team's attention.
            </p>
          </div>
        </header>
        {EVENTS.map((event) => (
          <Row
            key={event.key}
            title={event.title}
            description={event.description}
            checked={form[event.key]}
            onChange={(value) => setForm({ ...form, [event.key]: value })}
          />
        ))}
      </section>

      <section className="panel space-y-4 p-5">
        <header className="flex items-start gap-3">
          <div className="rounded-xl border border-border/60 bg-surface p-2.5">
            <Send className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight">Channels</h2>
            <p className="text-xs text-muted-foreground">Where alerts are delivered.</p>
          </div>
        </header>
        {CHANNELS.map((channel) => (
          <Row
            key={channel.key}
            title={channel.title}
            description={channel.description}
            checked={form[channel.key]}
            onChange={(value) => setForm({ ...form, [channel.key]: value })}
          />
        ))}
      </section>

      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save notifications"}
      </Button>
    </div>
  );
}
