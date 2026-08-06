import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { SubmitButton } from "@/components/app/SubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — UMRAIO" },
      {
        name: "description",
        content: "Choose a new password for your UMRAIO AI Business Executive account.",
      },
      { property: "og:title", content: "Set a new password — UMRAIO" },
      { property: "og:description", content: "Securely reset your UMRAIO account password." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery");

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (isRecovery && session)) setReady(true);
    });

    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData.session) setReady(true);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (ready) passwordRef.current?.focus();
  }, [ready]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = z
      .object({
        password: z.string().min(8, "Password must be at least 8 characters").max(72),
        confirm: z.string(),
      })
      .refine((values) => values.password === values.confirm, {
        message: "Passwords do not match",
      })
      .safeParse({ password: form.get("password"), confirm: form.get("confirm") });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }

    setPending(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setPending(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-aurora px-5 py-12">
      <BrandLogo showTagline className="mb-8" />
      <div className="panel w-full max-w-md p-7 shadow-elevated sm:p-9">
        <ShieldCheck className="size-8 text-primary" />
        <h1 className="mt-5 text-2xl font-bold">Set a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ready
            ? "Choose a strong password of at least 8 characters."
            : "Open the reset link from your email to continue."}
        </p>

        {ready ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>New password</Label>
              <Input
                ref={passwordRef}
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm password</Label>
              <Input
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <SubmitButton pending={pending} className="w-full">
              Update password
            </SubmitButton>
          </form>
        ) : (
          <Button
            variant="outline"
            className="mt-6 w-full"
            onClick={() => navigate({ to: "/auth", search: { mode: "forgot" } })}
          >
            Request a new link
          </Button>
        )}
      </div>
    </div>
  );
}
