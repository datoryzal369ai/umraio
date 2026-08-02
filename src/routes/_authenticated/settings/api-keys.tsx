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
  const queryClient = useQueryClient();
  const { data: agency } = useQuery({ queryKey: ["agency"], queryFn: fetchAgency });
  const { data: keys, isLoading } = useQuery({ queryKey: ["api-keys"], queryFn: fetchApiKeys });
  const [label, setLabel] = useState("");
  const [freshSecret, setFreshSecret] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      if (!agency) throw new Error("Agency not loaded.");
      const trimmed = label.trim();
      if (!trimmed) throw new Error("Give the key a label.");
      if (trimmed.length > 60) throw new Error("Label must be 60 characters or fewer.");
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Session expired. Please sign in again.");
      return createApiKey(agency.id, data.user.id, trimmed);
    },
    onSuccess: ({ secret }) => {
      setFreshSecret(secret);
      setLabel("");
      toast.success("API key created. Copy it now — it won't be shown again.");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revoke = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      toast.success("Key revoked.");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      toast.success("Key deleted.");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard.");
  };

  return (
    <div className="space-y-6">
      <section className="panel space-y-4 p-5">
        <header className="flex items-start gap-3">
          <div className="rounded-xl border border-border/60 bg-surface p-2.5">
            <KeyRound className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight">Create API key</h2>
            <p className="text-xs text-muted-foreground">
              Use keys to push leads from your website or automations into UMRAIO.
            </p>
          </div>
        </header>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-1.5">
            <Label htmlFor="label">Key label</Label>
            <Input
              id="label"
              maxLength={60}
              placeholder="Website lead form"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            <Plus className="size-4" />
            {create.isPending ? "Creating…" : "Create key"}
          </Button>
        </div>

        {freshSecret ? (
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Copy this secret now
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-surface px-3 py-2 font-mono text-xs">
                {freshSecret}
              </code>
              <Button size="sm" variant="outline" onClick={() => copy(freshSecret)}>
                <Copy className="size-4" />
                Copy
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              We store only a hash — this value cannot be recovered later.
            </p>
          </div>
        ) : null}
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-base font-semibold tracking-tight">Active keys</h2>
        {isLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : !keys?.length ? (
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
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
                      Revoked
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Active</Badge>
                  )}
                </div>
                <p className="font-mono text-xs text-muted-foreground">{key.key_prefix}••••••••</p>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(key.created_at).toLocaleDateString()} ·{" "}
                  {key.last_used_at
                    ? `last used ${new Date(key.last_used_at).toLocaleDateString()}`
                    : "never used"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!key.revoked ? (
                  <Button size="sm" variant="outline" onClick={() => revoke.mutate(key.id)}>
                    Revoke
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => remove.mutate(key.id)}
                  aria-label={`Delete ${key.label}`}
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
