import { supabase } from "@/integrations/supabase/client";

/** Client read model for the Islamic Implementation Layer™ (read-only). */
export type IslamicPolicyRow = {
  id: string;
  agency_id: string | null;
  code: string;
  principle: string;
  rule_text: string;
  scope: string;
  severity: string;
  source: string;
  authority: string;
  version: number;
  effective_from: string;
  effective_until: string | null;
  requires_human_review: boolean;
};

export async function fetchIslamicPolicies(): Promise<IslamicPolicyRow[]> {
  const { data, error } = await supabase
    .from("islamic_policies")
    .select(
      "id, agency_id, code, principle, rule_text, scope, severity, source, authority, version, effective_from, effective_until, requires_human_review",
    )
    .eq("is_active", true)
    .order("code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as IslamicPolicyRow[];
}

export type PolicyDecisionRow = {
  id: string;
  created_at: string;
  action: string;
  meta: Record<string, unknown>;
};

/** Recent policy decisions from the existing audit trail. */
export async function fetchPolicyDecisions(limit = 20): Promise<PolicyDecisionRow[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, created_at, action, meta")
    .eq("entity", "islamic_policy")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PolicyDecisionRow[];
}

export type ExpertReviewRow = {
  id: string;
  created_at: string;
  title: string;
  body: string;
  read_at: string | null;
  meta: Record<string, unknown>;
};

export async function fetchExpertReviews(limit = 20): Promise<ExpertReviewRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, created_at, title, body, read_at, meta")
    .eq("kind", "religious_guidance_review")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ExpertReviewRow[];
}

export type PackageReviewRow = {
  id: string;
  name: string;
  halal_review_status: string;
  halal_reviewed_at: string | null;
};

export async function fetchPackageReviewStatus(): Promise<PackageReviewRow[]> {
  const { data, error } = await supabase
    .from("packages")
    .select("id, name, halal_review_status, halal_reviewed_at")
    .order("name", { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as PackageReviewRow[];
}

export const SEVERITY_TONE: Record<string, string> = {
  BLOCK: "border-destructive/40 text-destructive",
  REVIEW_REQUIRED: "border-amber-500/40 text-amber-400",
  CAUTION: "border-primary/40 text-primary",
  INFO: "border-border text-muted-foreground",
};

export const REVIEW_STATUS_LABEL: Record<string, string> = {
  NOT_REVIEWED: "Not reviewed",
  REVIEW_REQUIRED: "Review required",
  REVIEWED: "Reviewed",
  REJECTED: "Rejected",
};
