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
import { useCopy } from "@/lib/i18n/dict";
import { leadFormCopy, leadsCopy } from "@/lib/i18n/app/leads.i18n";

function buildSchema(t: ReturnType<typeof useCopy<typeof leadFormCopy.en>>) {
  return z.object({
    full_name: z.string().trim().min(2, t.enterLeadName).max(120),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    email: z.string().trim().email(t.invalidEmail).max(255).optional().or(z.literal("")),
    preferred_month: z.string().trim().max(40).optional().or(z.literal("")),
    pax: z.coerce.number().int().min(1).max(500),
    budget_myr: z.coerce.number().min(0).max(10_000_000).optional(),
    tags: z.string().trim().max(200).optional().or(z.literal("")),
  });
}

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
  const t = useCopy(leadFormCopy);
  const tLeads = useCopy(leadsCopy);
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
    const schema = buildSchema(t);
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
      setError(parsed.error.issues[0]?.message ?? t.pleaseCheckForm);
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
          <DialogTitle>{lead ? t.editLeadTitle : t.newLeadTitle}</DialogTitle>
          <DialogDescription>
            {lead ? t.editLeadDescription : t.newLeadDescription}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">{t.fullNameLabel}</Label>
            <Input
              id="full_name"
              value={form.full_name}
              maxLength={120}
              onChange={(e) => set("full_name", e.target.value)}
              placeholder={t.fullNamePlaceholder}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">{t.phoneLabel}</Label>
              <Input
                id="phone"
                value={form.phone}
                maxLength={30}
                onChange={(e) => set("phone", e.target.value)}
                placeholder={t.phonePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t.emailLabel}</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                maxLength={255}
                onChange={(e) => set("email", e.target.value)}
                placeholder={t.emailPlaceholder}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FieldSelect
              label={t.statusLabel}
              value={form.temperature}
              options={[...LEAD_TEMPERATURES]}
              optionLabels={tLeads.temperatureLabels}
              onChange={(v) => set("temperature", v as LeadTemperature)}
            />
            <FieldSelect
              label={t.stageLabel}
              value={form.stage}
              options={[...LEAD_STAGES]}
              optionLabels={tLeads.stageLabels}
              onChange={(v) => set("stage", v as LeadStage)}
            />
            <FieldSelect
              label={t.sourceLabel}
              value={form.source}
              options={[...LEAD_SOURCES]}
              onChange={(v) => set("source", v)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="pax">{t.paxLabel}</Label>
              <Input
                id="pax"
                inputMode="numeric"
                value={form.pax}
                onChange={(e) => set("pax", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">{t.budgetLabel}</Label>
              <Input
                id="budget"
                inputMode="decimal"
                value={form.budget_myr}
                onChange={(e) => set("budget_myr", e.target.value)}
                placeholder={t.budgetPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">{t.monthLabel}</Label>
              <Input
                id="month"
                value={form.preferred_month}
                maxLength={40}
                onChange={(e) => set("preferred_month", e.target.value)}
                placeholder={t.monthPlaceholder}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-language">{t.languageLabel}</Label>
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
            <p className="text-xs text-muted-foreground">{t.languageHint}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">{t.tagsLabel}</Label>
            <Input
              id="tags"
              value={form.tags}
              maxLength={200}
              onChange={(e) => set("tags", e.target.value)}
              placeholder={t.tagsPlaceholder}
            />
            <p className="text-xs text-muted-foreground">{t.tagsHint}</p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {lead ? t.saveChanges : t.createLead}
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
  optionLabels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  optionLabels?: Record<string, string>;
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
              {optionLabels?.[option] ?? option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
