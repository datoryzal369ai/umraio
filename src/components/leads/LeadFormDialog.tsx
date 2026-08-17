import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LEAD_SOURCES,
  LEAD_STAGES,
  LEAD_TEMPERATURES,
  type Lead,
  type LeadInput,
  type LeadStage,
  type LeadTemperature,
} from "@/lib/leads";
import { CUSTOMER_LANGUAGES } from "@/lib/sales/conversation-intelligence.core";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter the lead's name").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  preferred_month: z.string().trim().max(40).optional().or(z.literal("")),
  pax: z.coerce.number().int().min(1).max(500),
  budget_myr: z.coerce.number().min(0).max(10_000_000).optional(),
  tags: z.string().trim().max(200).optional().or(z.literal("")),
});

type FormState = {
  full_name: string;
  phone: string;
  email: string;
  source: string;
  stage: LeadStage;
  temperature: LeadTemperature;
  pax: string;
  budget_myr: string;
  preferred_month: string;
  preferred_language: string;
  tags: string;
};

const empty: FormState = {
  full_name: "",
  phone: "",
  email: "",
  source: "whatsapp",
  stage: "new",
  temperature: "warm",
  pax: "1",
  budget_myr: "",
  preferred_month: "",
  preferred_language: "auto",
  tags: "",
};

export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  saving: boolean;
  onSubmit: (input: LeadInput) => void;
}) {
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      lead
        ? {
            full_name: lead.full_name,
            phone: lead.phone ?? "",
            email: lead.email ?? "",
            source: lead.source,
            stage: lead.stage,
            temperature: lead.temperature,
            pax: String(lead.pax ?? 1),
            budget_myr: lead.budget_myr != null ? String(lead.budget_myr) : "",
            preferred_month: lead.preferred_month ?? "",
            preferred_language: lead.preferred_language ?? "auto",
            tags: (lead.tags ?? []).join(", "),
          }
        : empty,
    );
  }, [open, lead]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse({
      full_name: form.full_name,
      phone: form.phone,
      email: form.email,
      preferred_month: form.preferred_month,
      pax: form.pax || "1",
      budget_myr: form.budget_myr === "" ? undefined : form.budget_myr,
      tags: form.tags,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setError(null);
    onSubmit({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      source: form.source,
      stage: form.stage,
      temperature: form.temperature,
      tags: (parsed.data.tags ?? "")
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean)
        .slice(0, 12),
      budget_myr: parsed.data.budget_myr ?? null,
      pax: parsed.data.pax,
      preferred_month: parsed.data.preferred_month || null,
      preferred_language: form.preferred_language,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{lead ? "Edit lead" : "New lead"}</DialogTitle>
          <DialogDescription>
            {lead
              ? "Update the prospect's details and pipeline status."
              : "Add a prospect to your pipeline so the AI sales executive can work it."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={form.full_name}
              maxLength={120}
              onChange={(e) => set("full_name", e.target.value)}
              placeholder="Nurul Aisyah"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                maxLength={30}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+60 12-345 6789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                maxLength={255}
                onChange={(e) => set("email", e.target.value)}
                placeholder="name@email.com"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FieldSelect
              label="Status"
              value={form.temperature}
              options={[...LEAD_TEMPERATURES]}
              onChange={(v) => set("temperature", v as LeadTemperature)}
            />
            <FieldSelect
              label="Stage"
              value={form.stage}
              options={[...LEAD_STAGES]}
              onChange={(v) => set("stage", v as LeadStage)}
            />
            <FieldSelect
              label="Source"
              value={form.source}
              options={[...LEAD_SOURCES]}
              onChange={(v) => set("source", v)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="pax">Pax</Label>
              <Input
                id="pax"
                inputMode="numeric"
                value={form.pax}
                onChange={(e) => set("pax", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (MYR)</Label>
              <Input
                id="budget"
                inputMode="decimal"
                value={form.budget_myr}
                onChange={(e) => set("budget_myr", e.target.value)}
                placeholder="12000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Preferred month</Label>
              <Input
                id="month"
                value={form.preferred_month}
                maxLength={40}
                onChange={(e) => set("preferred_month", e.target.value)}
                placeholder="Ramadan 2027"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-language">Conversation language</Label>
            <Select
              value={form.preferred_language}
              onValueChange={(v) => set("preferred_language", v)}
            >
              <SelectTrigger id="lead-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_LANGUAGES.map((language) => (
                  <SelectItem key={language.value} value={language.value}>
                    {language.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Auto detect follows the customer&apos;s own messages.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={form.tags}
              maxLength={200}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="vip, family, ramadan"
            />
            <p className="text-xs text-muted-foreground">Comma separated, up to 12 tags.</p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {lead ? "Save changes" : "Create lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option} className="capitalize">
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
