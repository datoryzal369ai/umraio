import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { settingsCopy } from "@/lib/i18n/app/settings.i18n";
import { useCopy } from "@/lib/i18n/dict";
import {
  createApiKey,
  deleteApiKey,
  fetchAgency,
  fetchApiKeys,
  revokeApiKey,
} from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/settings/api-keys")({
  head: () => ({
    meta: [
      { title: "API Keys — UMRAIO" },
      {
        name: "description",
        content:
          "Create and revoke API keys so your website, CRM or automations can push Umrah leads into UMRAIO.",
      },
      { property: "og:title", content: "API Keys — UMRAIO" },
      {
        property: "og:description",
        content: "Programmatic access for lead ingestion and integrations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const copy = useCopy(settingsCopy).apiKeys;
  const queryClient = useQueryClient();
  const { data: agency } = useQuery({ queryKey: ["agency"], queryFn: fetchAgency });
  const { data: keys, isLoading } = useQuery({ queryKey: ["api-keys"], queryFn: fetchApiKeys });
  const [label, setLabel] = useState("");
  const [freshSecret, setFreshSecret] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      if (!agency) throw new Error(copy.toasts.agencyNotLoaded);
      const trimmed = label.trim();
      if (!trimmed) throw new Error(copy.toasts.needLabel);
      if (trimmed.length > 60) throw new Error(copy.toasts.labelTooLong);
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error(copy.toasts.sessionExpired);
      return createApiKey(agency.id, data.user.id, trimmed);
    },
    onSuccess: ({ secret }) => {
      setFreshSecret(secret);
      setLabel("");
      toast.success(copy.toasts.created);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revoke = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      toast.success(copy.toasts.revoked);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      toast.success(copy.toasts.deleted);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const copyValue = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(copy.toasts.copied);
  };

  return (
    <div className="space-y-6">
      <section className="panel space-y-4 p-5">
        <header className="flex items-start gap-3">
          <div className="rounded-xl border border-border/60 bg-surface p-2.5">
            <KeyRound className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight">{copy.create.title}</h2>
            <p className="text-xs text-muted-foreground">
              {copy.create.description}
            </p>
          </div>
        </header>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-1.5">
            <Label htmlFor="label">{copy.create.label}</Label>
            <Input
              id="label"
              maxLength={60}
              placeholder={copy.create.labelPlaceholder}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus className="size-4" />
            {create.isPending ? copy.create.creating : copy.create.createKey}
          </Button>
        </div>

        {freshSecret ? (
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {copy.create.copyNow}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-surface px-3 py-2 font-mono text-xs">
                {freshSecret}
              </code>
              <Button size="sm" variant="outline" onClick={() => copyValue(freshSecret)}>
                <Copy className="size-4" />
                {copy.create.copy}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {copy.create.hashNote}
            </p>
          </div>
        ) : null}
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-base font-semibold tracking-tight">{copy.active.title}</h2>
        {isLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : !keys?.length ? (
          <p className="text-sm text-muted-foreground">{copy.active.empty}</p>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{key.label}</p>
                  {key.revoked ? (
                    <Badge variant="outline" className="text-destructive">
                      {copy.active.revoked}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{copy.active.active}</Badge>
                  )}
                </div>
                <p className="font-mono text-xs text-muted-foreground">{key.key_prefix}••••••••</p>
                <p className="text-xs text-muted-foreground">
                  {copy.active.createdOn
                    .replace("{date}", new Date(key.created_at).toLocaleDateString())
                    .replace(
                      "{usage}",
                      key.last_used_at
                        ? copy.active.lastUsed.replace(
                            "{date}",
                            new Date(key.last_used_at).toLocaleDateString(),
                          )
                        : copy.active.neverUsed,
                    )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!key.revoked ? (
                  <Button size="sm" variant="outline" onClick={() => revoke.mutate(key.id)}>
                    {copy.active.revoke}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => remove.mutate(key.id)}
                  aria-label={copy.active.deleteAria.replace("{label}", key.label)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
