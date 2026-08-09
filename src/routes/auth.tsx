import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { SubmitButton } from "@/components/app/SubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";

type Mode = "login" | "register" | "forgot";

const searchSchema = z.object({
  mode: z.enum(["login", "register", "forgot"]).optional().default("login"),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — UMRAIO® Autonomous AI Business Executive" },
      { name: "robots", content: "noindex, follow" },

        name: "description",
        content:
          "Sign in or create your UMRAIO® agency account to manage the Autonomous AI Business Executive for licensed Umrah agencies.",
      },
      { property: "og:title", content: "Sign in — UMRAIO® Autonomous AI Business Executive" },
      {
        property: "og:description",
        content: "Access your UMRAIO® agency workspace.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://umraio.com/auth" },
      { name: "twitter:title", content: "Sign in — UMRAIO® Autonomous AI Business Executive" },
      { name: "twitter:description", content: "Access your UMRAIO® agency workspace." },
    ],
    links: [{ rel: "canonical", href: "https://umraio.com/auth" }],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email address").max(255);
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be less than 72 characters");

function safeRedirect(value: string | undefined) {
  if (!value) return "/dashboard";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>(search.mode ?? "login");
  const [pending, setPending] = useState(false);
  const [emailSent, setEmailSent] = useState<null | "verify" | "reset">(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const destination = safeRedirect(search.redirect);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: destination, replace: true });
    }
  }, [loading, user, destination, navigate]);

  useEffect(() => {
    emailRef.current?.focus();
  }, [mode]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = z
      .object({ email: emailSchema, password: z.string().min(1, "Enter your password") })
      .safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid details");
      return;
    }

    setPending(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setPending(false);

    if (error) {
      toast.error(
        error.message === "Email not confirmed"
          ? "Please confirm your email address first."
          : "Invalid email or password.",
      );
      return;
    }
    toast.success("Welcome back.");
    navigate({ to: destination, replace: true });
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = z
      .object({
        fullName: z.string().trim().min(2, "Enter your full name").max(100),
        agencyName: z.string().trim().min(2, "Enter your agency name").max(120),
        email: emailSchema,
        password: passwordSchema,
      })
      .safeParse({
        fullName: form.get("fullName"),
        agencyName: form.get("agencyName"),
        email: form.get("email"),
        password: form.get("password"),
      });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid details");
      return;
    }

    setPending(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: parsed.data.fullName, agency_name: parsed.data.agencyName },
      },
    });
    setPending(false);

    if (error) {
      toast.error(
        error.message.toLowerCase().includes("already")
          ? "That email is already registered. Try signing in."
          : error.message,
      );
      return;
    }

    if (data.session) {
      navigate({ to: destination, replace: true });
      return;
    }
    setEmailSent("verify");
  }

  async function handleForgot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = emailSchema.safeParse(form.get("email"));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter a valid email");
      return;
    }

    setPending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPending(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setEmailSent("reset");
  }

  async function handleGoogle() {
    setPending(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setPending(false);
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: destination, replace: true });
  }

  if (emailSent) {
    return (
      <AuthLayout>
        <div className="text-center">
          <MailCheck className="mx-auto size-9 text-primary" />
          <h1 className="mt-5 text-2xl font-bold">Check your inbox</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {emailSent === "verify"
              ? "We've sent a verification link to your email. Confirm it to activate your agency workspace."
              : "We've sent a password reset link to your email. Open it to set a new password."}
          </p>
          <Button
            variant="outline"
            className="mt-6 w-full"
            onClick={() => {
              setEmailSent(null);
              setMode("login");
            }}
          >
            Back to sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold">
        {mode === "register"
          ? "Create your agency account"
          : mode === "forgot"
            ? "Reset your password"
            : "Sign in to UMRAIO"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "forgot"
          ? "We'll email you a secure link to set a new password."
          : "Your Autonomous AI Business Executive workspace for Umrah agencies."}
      </p>

      {mode !== "forgot" ? (
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as Mode)}
          className="mt-6 w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Work email">
                <Input ref={emailRef} name="email" type="email" autoComplete="email" required />
              </Field>
              <Field label="Password">
                <Input name="password" type="password" autoComplete="current-password" required />
              </Field>
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </button>
              <SubmitButton pending={pending}>Sign in</SubmitButton>
            </form>
          </TabsContent>

          <TabsContent value="register" className="mt-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <Field label="Full name">
                <Input name="fullName" autoComplete="name" required maxLength={100} />
              </Field>
              <Field label="Agency name">
                <Input name="agencyName" autoComplete="organization" required maxLength={120} />
              </Field>
              <Field label="Work email">
                <Input name="email" type="email" autoComplete="email" required />
              </Field>
              <Field label="Password">
                <Input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </Field>
              <SubmitButton pending={pending}>Create account</SubmitButton>
            </form>
          </TabsContent>
        </Tabs>
      ) : (
        <form onSubmit={handleForgot} className="mt-6 space-y-4">
          <Field label="Work email">
            <Input ref={emailRef} name="email" type="email" autoComplete="email" required />
          </Field>
          <SubmitButton pending={pending}>Send reset link</SubmitButton>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("login")}>
            Back to sign in
          </Button>
        </form>
      )}

      {mode !== "forgot" ? (
        <>
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={pending}
            onClick={handleGoogle}
          >
            Continue with Google
          </Button>
        </>
      ) : null}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Back to umraio.com
        </Link>
      </p>
    </AuthLayout>
  );
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-aurora px-5 py-12">
      <BrandLogo showTagline className="mb-8" />
      <div className="panel w-full max-w-md p-7 shadow-elevated sm:p-9">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
