/**
 * UMRAIO® Islamic Implementation Layer™ — deterministic core (P0).
 *
 * This module contains NO religious judgement. It is a deterministic safety
 * router and policy matcher:
 *
 *   ISLAMIC PRINCIPLE → RULE → POLICY CHECK → AI DECISION → VALIDATION
 *   → ACTION → AUDIT → HUMAN / QUALIFIED EXPERT OVERSIGHT
 *
 * UMRAIO is not a mufti, scholar, fatwa body or Shariah authority. Nothing
 * here issues a religious ruling; it only decides whether an action may
 * proceed, needs qualified human review, or must be blocked.
 */

export const ISLAMIC_SCOPES = [
  "PRODUCT",
  "MARKETING",
  "COMMUNICATION",
  "TRANSACTION",
  "CUSTOMER_INTERACTION",
  "OPERATIONS",
] as const;
export type IslamicScope = (typeof ISLAMIC_SCOPES)[number];

export const ISLAMIC_SEVERITIES = ["INFO", "CAUTION", "REVIEW_REQUIRED", "BLOCK"] as const;
export type IslamicSeverity = (typeof ISLAMIC_SEVERITIES)[number];

export type PolicyOutcome = "ALLOW" | "REVIEW_REQUIRED" | "BLOCK" | "NOT_APPLICABLE";

export type IslamicPolicy = {
  id: string;
  agency_id: string | null;
  code: string;
  principle: string;
  rule_text: string;
  scope: IslamicScope;
  severity: IslamicSeverity;
  match_patterns: string[];
  source: string;
  authority: string;
  version: number;
  effective_from: string;
  effective_until: string | null;
  is_active: boolean;
  requires_human_review: boolean;
};

export type PolicyMatch = {
  policy_id: string;
  code: string;
  version: number;
  principle: string;
  scope: IslamicScope;
  severity: IslamicSeverity;
  source: string;
  authority: string;
  requires_human_review: boolean;
  matched_on: string;
};

export type PolicyEvaluation = {
  outcome: PolicyOutcome;
  scope: IslamicScope | null;
  matches: PolicyMatch[];
  requiresHumanReview: boolean;
  reason: string;
};

export const NOT_APPLICABLE: PolicyEvaluation = {
  outcome: "NOT_APPLICABLE",
  scope: null,
  matches: [],
  requiresHumanReview: false,
  reason: "No Islamic policy scope applies to this action.",
};

/** A policy is only usable when it is active, in force and fully attributed. */
export function isUsablePolicy(policy: IslamicPolicy, now = new Date()): boolean {
  if (!policy.is_active) return false;
  if (!policy.source?.trim() || !policy.authority?.trim()) return false;
  if (policy.effective_from && new Date(policy.effective_from) > now) return false;
  if (policy.effective_until && new Date(policy.effective_until) <= now) return false;
  return true;
}

function normalise(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Deterministic policy match over a scoped text payload.
 * Only policies whose scope matches the action's scope are considered.
 */
export function evaluatePolicies(
  policies: IslamicPolicy[],
  scope: IslamicScope,
  text: string,
  now = new Date(),
): PolicyEvaluation {
  const haystack = normalise(text);
  const matches: PolicyMatch[] = [];

  for (const policy of policies) {
    if (policy.scope !== scope) continue;
    if (!isUsablePolicy(policy, now)) continue;
    const hit = policy.match_patterns.find((pattern) => {
      const needle = normalise(pattern);
      return needle.length > 2 && haystack.includes(needle);
    });
    if (!hit) continue;
    matches.push({
      policy_id: policy.id,
      code: policy.code,
      version: policy.version,
      principle: policy.principle,
      scope: policy.scope,
      severity: policy.severity,
      source: policy.source,
      authority: policy.authority,
      requires_human_review: policy.requires_human_review,
      matched_on: hit,
    });
  }

  if (!matches.length) {
    return {
      outcome: "ALLOW",
      scope,
      matches: [],
      requiresHumanReview: false,
      reason: "No policy in this scope matched the action.",
    };
  }

  const blocked = matches.find((m) => m.severity === "BLOCK");
  if (blocked) {
    return {
      outcome: "BLOCK",
      scope,
      matches,
      requiresHumanReview: true,
      reason: `${blocked.code} v${blocked.version}: ${blocked.principle}`,
    };
  }

  const review = matches.find((m) => m.severity === "REVIEW_REQUIRED" || m.requires_human_review);
  if (review) {
    return {
      outcome: "REVIEW_REQUIRED",
      scope,
      matches,
      requiresHumanReview: true,
      reason: `${review.code} v${review.version}: ${review.principle}`,
    };
  }

  const caution = matches[0]!;
  return {
    outcome: "ALLOW",
    scope,
    matches,
    requiresHumanReview: false,
    reason: `${caution.code} v${caution.version} noted (${caution.severity}).`,
  };
}

/* ------------------------------------------------------------------ */
/* Religious-authority safety router (conservative pre-check)          */
/* ------------------------------------------------------------------ */

/**
 * Conservative detector for questions that ask for a religious RULING.
 * This is a SAFETY ROUTER, not a Shariah engine: it never decides a
 * religious matter, it only decides that a matter needs care and possibly
 * qualified human review. Patterns require ruling-seeking phrasing so that
 * ordinary sales talk ("pakej halal food") does not trigger it.
 */
const RELIGIOUS_RULING_PATTERNS: RegExp[] = [
  /\bfatwa\b/i,
  /\b(apa|apakah|nak\s+tahu)?\s*hukum(nya)?\b/i,
  /\b(adakah|apakah|is|are)\b[^.?!]{0,60}\b(wajib|haram|halal|makruh|sunat|sah|tidak\s+sah|batal)\b/i,
  /\b(wajib|haram|makruh|sah|tidak\s+sah|batal)\s*(ke|kah|tak|atau\s+tidak)\b/i,
  /\b(islamic|religious|shariah|syariah)\s+(ruling|law|judgement|verdict)\b/i,
  /\b(boleh|dibenarkan)\s+tak\b[^.?!]{0,50}\b(islam|syariah|shariah|agama)\b/i,
  /\bmahram\b[^.?!]{0,40}\b(wajib|perlu|mesti|hukum|boleh)\b/i,
  /\b(ihram|talbiyah|tawaf|saie|sai'e|miqat)\b[^.?!]{0,40}\b(hukum|wajib|sah|batal|rukun)\b/i,
  /\b(patuh|mematuhi)\s+(syariah|shariah)\b/i,
];

export type ReligiousSignal = {
  isReligiousRulingRequest: boolean;
  matchedOn: string | null;
};

export function detectReligiousRulingRequest(text: string | null | undefined): ReligiousSignal {
  if (!text || !text.trim()) return { isReligiousRulingRequest: false, matchedOn: null };
  for (const re of RELIGIOUS_RULING_PATTERNS) {
    const found = re.exec(text);
    if (found) return { isReligiousRulingRequest: true, matchedOn: found[0].slice(0, 60) };
  }
  return { isReligiousRulingRequest: false, matchedOn: null };
}

/** Boundary text injected into the model prompt when the router triggers. */
export const RELIGIOUS_BOUNDARY_INSTRUCTION = [
  "RELIGIOUS AUTHORITY BOUNDARY (Islamic Implementation Layer™, highest priority):",
  "The customer's latest message appears to ask for a religious ruling.",
  "You are NOT a mufti, Islamic scholar, fatwa body or Shariah authority. Never issue a ruling, fatwa or definitive religious verdict, and never state that something is definitively halal, haram, wajib, sunat, makruh, sah or batal.",
  "You may share general, properly sourced information that already exists in the approved knowledge base, clearly attributed.",
  "State your limitation once, plainly, for example: 'Saya boleh kongsi maklumat umum daripada panduan yang diluluskan, tetapi saya bukan pihak berkuasa agama. Untuk hukum yang muktamad, ini perlu disemak oleh pakar bertauliah.'",
  "Then call request_expert_review so a qualified human is asked to review, and continue helping with the travel side of the enquiry.",
  "Do not repeat this disclaimer in ordinary sales conversation.",
].join(" ");
