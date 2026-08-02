import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — UMRAIO" },
      {
        name: "description",
        content: "Manage your UMRAIO account details, contact information and agency profile.",
      },
      { property: "og:title", content: "Your profile — UMRAIO" },
      { property: "og:description", content: "Manage your UMRAIO account details." },
    ],
  }),
  component: ProfilePage,
});

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  job_title: z.string().trim().max(80).optional().or(z.literal("")),
});

function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ full_name: "", phone: "", job_title: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["profile-detail", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, phone, job_title, email, agencies(name, country, plan)")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return profile;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        full_name: data.full_name ?? "",
        phone: data.phone ?? "",
        job_title: data.job_title ?? "",
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const parsed = profileSchema.parse(values);
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: parsed.full_name,
          phone: parsed.phone || null,
          job_title: parsed.job_title || null,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated.");
      queryClient.invalidateQueries({ queryKey: ["profile-detail", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof z.ZodError
          ? (error.issues[0]?.message ?? "Invalid details")
          : "Could not save profile.",
      );
    },
  });

  const agency = data?.agencies as
    { name: string; country: string; plan: string } | null | undefined;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          These details identify you inside your agency workspace.
        </p>
      </header>

      <form
        className="panel space-y-5 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(form);
        }}
      >
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={data?.email ?? user?.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label>Full name</Label>
          <Input
            value={form.full_name}
            maxLength={100}
            onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            value={form.phone}
            maxLength={30}
            placeholder="+60 12-345 6789"
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Job title</Label>
          <Input
            value={form.job_title}
            maxLength={80}
            placeholder="Sales Manager"
            onChange={(event) => setForm((prev) => ({ ...prev, job_title: event.target.value }))}
          />
        </div>
        <Button type="submit" disabled={mutation.isPending || isLoading}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
        </Button>
      </form>

      <div className="panel p-6">
        <h2 className="text-lg font-semibold">Agency</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="mt-1 font-medium">{agency?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Country</dt>
            <dd className="mt-1 font-medium">{agency?.country ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="mt-1 font-medium capitalize">{agency?.plan ?? "—"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
