/**
 * UMRAIO® STEP 3.7 — BEHAVIORAL SALES PSYCHOLOGY ENGINE™ (pure core).
 *
 * Additive behavioural intelligence layer on top of STEP 3 / STEP 3.6.
 *
 * Design rules:
 * - Observable conversational evidence ONLY. No personality diagnosis, no
 *   invasive psychological profiling, no sensitive-trait persuasion.
 * - Deterministic and dependency-free, so it is auditable, cheap and reusable
 *   by the future B2B ("MEET YOUR UMRAIO EXECUTIVE") and acquisition-funnel
 *   agents — the domain-specific knowledge lives outside this module.
 * - Every reading carries a confidence; low confidence = hypothesis, not fact.
 */

import {
  conversationOptedOut,
  detectBookingIntent,
  detectDepositIntent,
  detectFrustration,
  detectHumanRequest,
  detectObjectionResolution,
  maskNegatedSpans,
  normalizeMessage,
} from "@/lib/sales/hardening.core";

/* ------------------------------------------------------------------ *
 * Signal value scales
 * ------------------------------------------------------------------ */

export type Level = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
export type HesitationLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH";
export type LoadLevel = "LOW" | "MEDIUM" | "HIGH";

export type DecisionReadiness =
  | "EXPLORING"
  | "QUALIFYING"
  | "CONSIDERING"
  | "HIGH_INTENT"
  | "READY_TO_BOOK"
  | "DEPOSIT_READY"
  | "BOOKED";

export type ComparisonBehaviour =
  | "PRICE_COMPARING"
  | "VALUE_COMPARING"
  | "TRUST_COMPARING"
  | "FEATURE_COMPARING";

export type CommunicationTrait =
  | "CONCISE"
  | "DETAILED"
  | "FORMAL"
  | "CASUAL"
  | "EMOTIONAL"
  | "DIRECT"
  | "ANALYTICAL"
  | "QUESTION_HEAVY";

export type ValueDimension =
  | "HOTEL"
  | "FLIGHT"
  | "DISTANCE"
  | "MEALS"
  | "VISA"
  | "TRANSPORT"
  | "MUTAWWIF"
  | "INCLUSIONS"
  | "COMFORT"
  | "FAMILY_SUITABILITY";

export type DecisionMaker =
  | "SPOUSE"
  | "PARENT"
  | "CHILDREN"
  | "FAMILY"
  | "BOSS"
  | "PARTNER"
  | "BUSINESS_PARTNER";

export type BehavioralStrategy =
  | "MOVE_TO_CLOSE"
  | "VALUE_CLARIFICATION"
  | "PACKAGE_ALTERNATIVE"
  | "BUILD_TRUST"
  | "SIMPLIFY_CHOICES"
  | "SUPPORT_DECISION_PROCESS"
  | "REDUCE_FRICTION"
  | "FACILITATE_BOOKING"
  | "REPAIR_EXPERIENCE"
  | "STOP_CONTACT"
  | "HUMAN_ASSIST"
  | "UNDERSTAND_NEED";

export type Reading<T> = { value: T; confidence: number };

export type BehavioralProfile = {
  trust: Reading<Level>;
  hesitation: Reading<HesitationLevel>;
  priceSensitivity: Reading<Level>;
  valueSensitivity: Reading<Level>;
  valueDimensions: ValueDimension[];
  urgency: Reading<Level>;
  decisionReadiness: Reading<DecisionReadiness>;
  informationLoad: LoadLevel;
  comparison: ComparisonBehaviour[];
  decisionMakers: DecisionMaker[];
  /** Dependency stated and NOT yet resolved by the customer. */
  decisionMakerDependency: boolean;
  decisionMakerResolved: boolean;
  reassuranceNeed: Reading<Level>;
  closingReadiness: Reading<Level>;
  communicationTraits: CommunicationTrait[];
  strategy: BehavioralStrategy;
  /** Internal audit trail — never shown to the customer. */
  rationale: string[];
};

/* ------------------------------------------------------------------ *
 * Lexicons (BM + English + Malaysian WhatsApp shorthand)
 * ------------------------------------------------------------------ */

const TRUST_CONCERN =
  /\b(scam|penipu|tipu|selamat\s+ke|betul\s+ke|boleh\s+percaya|percaya\s+ke|trusted|genuine|sah\s+ke|asli|licence|license|lesen|motac|registered|berdaftar|proof|bukti|takut\s+(nak\s+)?(bayar|transfer|online)|risau\s+bayar|is\s+this\s+real|legit)\b/i;
const TRUST_POSITIVE =
  /\b(saya\s+percaya|i\s+trust|dah\s+check\s+(company|agency)|kawan\s+recommend|recommended\s+by|dah\s+pernah\s+guna|repeat\s+customer|pernah\s+book\s+dengan)\b/i;

const HESITATION =
  /\b(fikir\s+dulu|pikir\s+dulu|nanti\s+saya\s+(confirm|reply|bagitahu)|tengok\s+dulu|lihat\s+dulu|see\s+first|think\s+about|let\s+me\s+think|not\s+sure|tak\s+pasti|belum\s+decide|belum\s+putus|maybe|mungkin|entah|nanti\s+dulu|slow\s+slow|jap\s+dulu)\b/i;

const PRICE_COMPLAINT =
  /\b(mahal|expensive|pricey|over\s?budget|tak\s+mampu|cannot\s+afford|out\s+of\s+(my\s+)?budget|ada\s+(yang\s+)?murah|paling\s+murah|cheaper|cheapest|murah\s+sikit|diskaun|discount|kurang\s+sikit|nego|boleh\s+kurang)\b/i;
const PRICE_QUESTION =
  /\b(berapa|brp|brape|harga|price|how\s+much|kos|cost|rate)\b/i;

const VALUE_LEXICON: Array<{ dim: ValueDimension; re: RegExp }> = [
  { dim: "HOTEL", re: /\b(hotel|penginapan|bilik|room|accommodation|bintang|star)\b/i },
  { dim: "FLIGHT", re: /\b(flight|penerbangan|airline|kapal\s?terbang|transit|direct)\b/i },
  { dim: "DISTANCE", re: /\b(dekat|jauh|jarak|distance|walking|jalan\s+kaki|near|masjidil|haram|nabawi)\b/i },
  { dim: "MEALS", re: /\b(makan|meal|breakfast|sarapan|buffet|food|katering)\b/i },
  { dim: "VISA", re: /\b(visa|permit|pasport|passport)\b/i },
  { dim: "TRANSPORT", re: /\b(bas|bus|transport|pengangkutan|ziarah|transfer)\b/i },
  { dim: "MUTAWWIF", re: /\b(mutawwif|mutawif|ustaz|ustad|pembimbing|guide)\b/i },
  { dim: "INCLUSIONS", re: /\b(termasuk|include|inclusion|apa\s+yang\s+dapat|package\s+ni\s+ada)\b/i },
  { dim: "COMFORT", re: /\b(selesa|comfort|comfortable|senang|convenient|wheelchair|kerusi\s+roda)\b/i },
  { dim: "FAMILY_SUITABILITY", re: /\b(keluarga|family|anak|children|kids|mak|ibu|ayah|bapa|parents|warga\s+emas|elderly|orang\s+tua)\b/i },
];

const URGENCY =
  /\b(urgent|segera|cepat|asap|hari\s+ini|today|esok|tomorrow|last\s+minute|nak\s+confirm\s+(cepat|sekarang|hari)|boleh\s+confirm\s+sekarang|slot\s+(masih\s+)?ada|masih\s+ada\s+(tempat|slot|kosong)|kejar|tarikh\s+dekat|closing\s+soon)\b/i;

const COMPARISON_ANY =
  /\b(beza|perbezaan|difference|different|compare|comparison|banding|berbanding|vs|versus|mana\s+(satu\s+)?(lagi\s+)?(baik|bagus|sesuai)|which\s+one|package\s+a\s+.{0,20}\bb\b|agency\s+lain|agensi\s+lain|tempat\s+lain|competitor)\b/i;

const DECISION_MAKERS: Array<{ who: DecisionMaker; re: RegExp }> = [
  { who: "SPOUSE", re: /\b(husband|suami|wife|isteri|bini|laki\s+saya|spouse)\b/i },
  { who: "PARENT", re: /\b(mak|emak|ibu|ayah|bapa|abah|parents|mother|father|mama|papa)\b/i },
  { who: "CHILDREN", re: /\b(anak|anak\s+saya|children|kids)\b/i },
  { who: "FAMILY", re: /\b(keluarga|family|adik\s+beradik|sibling)\b/i },
  { who: "BOSS", re: /\b(boss|bos|majikan|manager|ketua)\b/i },
  { who: "PARTNER", re: /\b(partner|pasangan)\b/i },
  { who: "BUSINESS_PARTNER", re: /\b(business\s+partner|rakan\s+kongsi|syarikat)\b/i },
];

const DEPENDENCY_VERB =
  /\b(bincang|discuss|tanya|ask|rujuk|check\s+with|consult|minta\s+pendapat|kena\s+tanya|nak\s+tanya|talk\s+to|confirm\s+dengan|kena\s+bincang)\b/i;

const DEPENDENCY_RESOLVED =
  /\b(dah|sudah|already|have)\s+(bincang|discuss(ed)?|tanya|ask(ed)?|check(ed)?|talk(ed)?)\b|\b(dia|mereka|they|he|she)\s+(setuju|agree[d]?|ok(ay)?|no\s+problem|dah\s+ok)\b|\b(kami|we)\s+(setuju|agree[d]?|dah\s+decide)\b/i;

const REASSURANCE =
  /\b(betul\s+ke|confirm\s*\?|selamat\s+ke|boleh\s+percaya|macam\s+mana\s+nak\s+tahu|how\s+do\s+i\s+know|are\s+you\s+sure|sure\s+ke|guarantee|jaminan|ada\s+resit|receipt|refund|kalau\s+cancel)\b/i;

const CLOSING_SIGNALS: RegExp[] = [
  /\b(deposit|dp|bayaran\s+awal)\b/i,
  /\b(cara\s+bayar|payment\s+method|macam\s?mana\s+nak\s+(bayar|book|tempah|daftar)|how\s+(do\s+i|to)\s+(book|pay)|how\s+to\s+proceed)\b/i,
  /\b(reserve|tempah|book\s+now|nak\s+book|nak\s+booking|slot\s+saya)\b/i,
  /\b(nak\s+yang\s+ni|saya\s+ambil|i'?ll\s+take|pilih\s+package|choose\s+package|this\s+one)\b/i,
  /\b(quotation|quote|sebut\s?harga|invois|invoice)\b/i,
  /\b(boleh\s+confirm\s+sekarang|nak\s+proceed|proceed|kami\s+setuju|saya\s+setuju|go\s+ahead|deal)\b/i,
];

function anyMatch(list: string[], re: RegExp): number {
  return list.reduce((n, m) => (re.test(m) ? n + 1 : n), 0);
}

function level(score: number, hi = 3, mid = 1): Level {
  if (score >= hi) return "HIGH";
  if (score >= mid) return "MEDIUM";
  if (score > 0) return "LOW";
  return "UNKNOWN";
}

function conf(base: number, evidence: number): number {
  return Math.round(Math.min(0.95, base + Math.min(evidence, 5) * 0.07) * 100) / 100;
}

/* ------------------------------------------------------------------ *
 * Communication behaviour (behaviour, never personality)
 * ------------------------------------------------------------------ */

export function detectCommunicationTraits(messages: string[]): CommunicationTrait[] {
  const recent = messages.slice(-5).filter(Boolean);
  if (!recent.length) return [];
  const joined = recent.join(" ");
  const avgWords = recent.reduce((n, m) => n + m.trim().split(/\s+/).length, 0) / recent.length;
  const questions = (joined.match(/\?/g) ?? []).length;
  const out = new Set<CommunicationTrait>();

  if (avgWords <= 7) out.add("CONCISE");
  if (avgWords >= 25) out.add("DETAILED");
  if (/\b(tuan|puan|encik|dear|sir|madam|kindly|mohon|sekiranya)\b/i.test(joined)) out.add("FORMAL");
  if (/\b(nk|tk|xde|dgn|utk|brp|mcm|dkt|skit|dh|blh|tq|pls|okay|ok|haha|hehe)\b/i.test(joined))
    out.add("CASUAL");
  if (/\b(risau|takut|worried|sedih|excited|tak\s+sabar|alhamdulillah|syukur|penat|kecewa)\b/i.test(joined))
    out.add("EMOTIONAL");
  if (questions >= 3 || questions >= recent.length) out.add("QUESTION_HEAVY");
  if (COMPARISON_ANY.test(joined) || /\b(explain|terangkan|detail|breakdown|kenapa|why|sebab)\b/i.test(joined))
    out.add("ANALYTICAL");
  if (avgWords <= 12 && questions >= 1 && !out.has("ANALYTICAL")) out.add("DIRECT");

  return Array.from(out);
}

/* ------------------------------------------------------------------ *
 * Main builder
 * ------------------------------------------------------------------ */

export type BehavioralInput = {
  /** Customer messages only, chronological (oldest first). */
  customerMessages: string[];
  /** Assistant/human messages, used only for information-load estimation. */
  agentMessages?: string[];
  /** Existing STEP 3 signals, kept as the single source of truth for control. */
  optedOut?: boolean;
  humanTakeover?: boolean;
  /** Existing conversion state, so readiness never contradicts the state machine. */
  quotationStatus?: string | null;
  bookingConfirmed?: boolean;
  leadStage?: string | null;
  knownCount?: number;
};

export function buildBehavioralProfile(input: BehavioralInput): BehavioralProfile {
  const msgs = input.customerMessages.filter(Boolean);
  const norm = msgs.map((m) => normalizeMessage(m));
  const masked = norm.map((m) => maskNegatedSpans(m));
  const latest = msgs.length ? msgs[msgs.length - 1]! : "";
  const latestNorm = normalizeMessage(latest);
  const latestMasked = maskNegatedSpans(latestNorm);
  const rationale: string[] = [];

  const optedOut = input.optedOut ?? conversationOptedOut(msgs).optedOut;
  const humanRequested = msgs.slice(-3).some((m) => detectHumanRequest(m));
  const frustration = detectFrustration(latest);

  /* ---- TRUST ---- */
  const trustHits = anyMatch(norm, TRUST_CONCERN);
  const trustPositive = anyMatch(norm, TRUST_POSITIVE);
  let trustValue: Level = "UNKNOWN";
  if (trustHits >= 2) trustValue = "LOW";
  else if (trustHits === 1) trustValue = "MEDIUM";
  if (trustPositive > 0 && trustHits === 0) trustValue = "HIGH";
  else if (trustPositive > 0 && trustHits > 0) trustValue = "MEDIUM";
  if (trustHits) rationale.push(`trust concern evidence x${trustHits}`);
  const trust: Reading<Level> = {
    value: trustValue,
    confidence: conf(0.5, trustHits + trustPositive),
  };

  /* ---- HESITATION ---- */
  const hesitationHits = anyMatch(masked, HESITATION);
  const hesitation: Reading<HesitationLevel> = {
    value:
      hesitationHits >= 3 ? "HIGH" : hesitationHits === 2 ? "MEDIUM" : hesitationHits === 1 ? "LOW" : "NONE",
    confidence: conf(0.5, hesitationHits),
  };
  if (hesitationHits) rationale.push(`hesitation evidence x${hesitationHits}`);

  /* ---- PRICE SENSITIVITY ---- */
  const priceComplaints = anyMatch(norm, PRICE_COMPLAINT);
  const priceQuestions = anyMatch(norm, PRICE_QUESTION);
  // A single normal price question is NOT price sensitivity.
  const priceScore = priceComplaints * 2 + Math.max(0, priceQuestions - 1);
  const priceSensitivity: Reading<Level> = {
    value: priceScore >= 2 ? "HIGH" : priceScore === 1 ? "MEDIUM" : priceQuestions ? "LOW" : "UNKNOWN",
    confidence: conf(0.45, priceScore),
  };
  if (priceScore) rationale.push(`price sensitivity score ${priceScore}`);

  /* ---- VALUE SENSITIVITY ---- */
  const valueDimensions: ValueDimension[] = [];
  for (const v of VALUE_LEXICON) if (norm.some((m) => v.re.test(m))) valueDimensions.push(v.dim);
  const valueSensitivity: Reading<Level> = {
    value: level(valueDimensions.length, 3, 1),
    confidence: conf(0.5, valueDimensions.length),
  };
  if (valueDimensions.length) rationale.push(`value dimensions: ${valueDimensions.join("/")}`);

  /* ---- URGENCY (detected only, never manufactured) ---- */
  const urgencyHits = anyMatch(norm, URGENCY);
  const urgency: Reading<Level> = {
    value: urgencyHits >= 2 ? "HIGH" : urgencyHits === 1 ? "MEDIUM" : "UNKNOWN",
    confidence: conf(0.45, urgencyHits),
  };

  /* ---- COMPARISON BEHAVIOUR ---- */
  const comparison: ComparisonBehaviour[] = [];
  if (msgs.some((m) => COMPARISON_ANY.test(normalizeMessage(m)))) {
    if (priceComplaints || priceQuestions) comparison.push("PRICE_COMPARING");
    if (TRUST_CONCERN.test(norm.join(" "))) comparison.push("TRUST_COMPARING");
    if (valueDimensions.length) comparison.push("VALUE_COMPARING");
    if (!comparison.length) comparison.push("FEATURE_COMPARING");
  }

  /* ---- DECISION-MAKER DEPENDENCY ---- */
  const decisionMakers: DecisionMaker[] = [];
  let dependencyStated = false;
  let dependencyResolved = false;
  msgs.forEach((m) => {
    const n = normalizeMessage(m);
    const who = DECISION_MAKERS.filter((d) => d.re.test(n)).map((d) => d.who);
    if (!who.length) return;
    const hasVerb = DEPENDENCY_VERB.test(n);
    const resolved = DEPENDENCY_RESOLVED.test(n);
    if (hasVerb || resolved) {
      for (const w of who) if (!decisionMakers.includes(w)) decisionMakers.push(w);
      if (resolved) dependencyResolved = true;
      else dependencyStated = true;
    }
  });
  if (dependencyResolved) dependencyStated = false;
  const decisionMakerDependency = dependencyStated;
  if (decisionMakers.length)
    rationale.push(
      `decision maker ${decisionMakers.join("/")} ${dependencyResolved ? "RESOLVED" : "ACTIVE"}`,
    );

  /* ---- REASSURANCE NEED ---- */
  const reassuranceHits = anyMatch(norm, REASSURANCE) + trustHits;
  const reassuranceNeed: Reading<Level> = {
    value: reassuranceHits >= 2 ? "HIGH" : reassuranceHits === 1 ? "MEDIUM" : "UNKNOWN",
    confidence: conf(0.45, reassuranceHits),
  };

  /* ---- CLOSING READINESS ---- */
  const closingHits = CLOSING_SIGNALS.reduce((n, re) => (re.test(latestMasked) ? n + 1 : n), 0);
  const historicalClosing = CLOSING_SIGNALS.reduce(
    (n, re) => (masked.slice(0, -1).some((m) => re.test(m)) ? n + 1 : n),
    0,
  );
  const closingScore = optedOut ? 0 : closingHits * 2 + historicalClosing;
  const closingReadiness: Reading<Level> = {
    value: closingScore >= 3 ? "HIGH" : closingScore >= 1 ? "MEDIUM" : "UNKNOWN",
    confidence: conf(0.5, closingScore),
  };

  /* ---- DECISION READINESS (aligned to conversion state, never parallel) ---- */
  const bookingIntent = !optedOut && detectBookingIntent(latest);
  const depositIntent = !optedOut && detectDepositIntent(latest);
  let readiness: DecisionReadiness;
  if (input.bookingConfirmed || input.leadStage === "booked") readiness = "BOOKED";
  else if (input.quotationStatus === "accepted" || (input.quotationStatus && depositIntent))
    readiness = "DEPOSIT_READY";
  else if (depositIntent || bookingIntent || closingReadiness.value === "HIGH")
    readiness = "READY_TO_BOOK";
  else if (closingReadiness.value === "MEDIUM" || input.quotationStatus) readiness = "HIGH_INTENT";
  else if (hesitation.value !== "NONE" || comparison.length || decisionMakerDependency)
    readiness = "CONSIDERING";
  else if ((input.knownCount ?? 0) >= 3) readiness = "QUALIFYING";
  else readiness = "EXPLORING";
  if (optedOut) readiness = "EXPLORING";
  const decisionReadiness: Reading<DecisionReadiness> = {
    value: readiness,
    confidence: conf(0.5, closingScore + (input.quotationStatus ? 2 : 0)),
  };

  /* ---- INFORMATION LOAD ---- */
  const agentMsgs = input.agentMessages ?? [];
  const agentAvgWords = agentMsgs.length
    ? agentMsgs.slice(-3).reduce((n, m) => n + m.trim().split(/\s+/).length, 0) /
      Math.min(3, agentMsgs.length)
    : 0;
  const overloadAsk =
    /\b(banyak\s+sangat|too\s+many|confuse[d]?|keliru|pening|tak\s+faham|which\s+one\s+(is\s+)?(best|better)|yang\s+mana\s+(satu\s+)?(paling\s+)?(baik|sesuai|best)|simplify|ringkas)\b/i.test(
      latestNorm,
    );
  const informationLoad: LoadLevel =
    overloadAsk || agentAvgWords >= 140 ? "HIGH" : agentAvgWords >= 80 || comparison.length ? "MEDIUM" : "LOW";

  /* ---- COMMUNICATION TRAITS ---- */
  const communicationTraits = detectCommunicationTraits(msgs);

  /* ---- STRATEGY (priority ladder; safety always wins) ---- */
  let strategy: BehavioralStrategy;
  if (optedOut) {
    strategy = "STOP_CONTACT";
    rationale.push("explicit opt-out — STEP 3.6 safety gate takes absolute priority");
  } else if (frustration.length) {
    strategy = "REPAIR_EXPERIENCE";
    rationale.push(`frustration signals: ${frustration.join("/")}`);
  } else if (humanRequested || input.humanTakeover) {
    strategy = "HUMAN_ASSIST";
  } else if (readiness === "DEPOSIT_READY" || readiness === "READY_TO_BOOK" || readiness === "BOOKED") {
    strategy = "FACILITATE_BOOKING";
    rationale.push("customer has decided — facilitate, do not keep selling");
  } else if (trust.value === "LOW" || reassuranceNeed.value === "HIGH") {
    strategy = "BUILD_TRUST";
  } else if (decisionMakerDependency) {
    strategy = "SUPPORT_DECISION_PROCESS";
  } else if (priceSensitivity.value === "HIGH") {
    strategy = valueSensitivity.value === "HIGH" ? "PACKAGE_ALTERNATIVE" : "VALUE_CLARIFICATION";
    rationale.push("price sensitivity high — clarify value, never invent a discount");
  } else if (informationLoad === "HIGH") {
    strategy = "SIMPLIFY_CHOICES";
  } else if (hesitation.value === "HIGH" || (hesitation.value === "MEDIUM" && trust.value === "HIGH")) {
    strategy = "REDUCE_FRICTION";
  } else if (trust.value === "MEDIUM" && reassuranceNeed.value === "MEDIUM") {
    strategy = "BUILD_TRUST";
  } else if (readiness === "HIGH_INTENT") {
    strategy = "MOVE_TO_CLOSE";
  } else if (comparison.length) {
    strategy = "SIMPLIFY_CHOICES";
  } else {
    strategy = "UNDERSTAND_NEED";
  }

  if (detectObjectionResolution(latest) && dependencyResolved) {
    rationale.push("previously stated decision-maker dependency is now resolved");
  }

  return {
    trust,
    hesitation,
    priceSensitivity,
    valueSensitivity,
    valueDimensions,
    urgency,
    decisionReadiness,
    informationLoad,
    comparison,
    decisionMakers,
    decisionMakerDependency,
    decisionMakerResolved: dependencyResolved,
    reassuranceNeed,
    closingReadiness,
    communicationTraits,
    strategy,
    rationale,
  };
}

/* ------------------------------------------------------------------ *
 * Strategy directives (prompt block) — ethical guardrails baked in
 * ------------------------------------------------------------------ */

export const STRATEGY_DIRECTIVE: Record<BehavioralStrategy, string> = {
  MOVE_TO_CLOSE:
    "Trust and intent are both there. Skip further education and ask for the next concrete commitment using verified figures only.",
  VALUE_CLARIFICATION:
    "The customer feels the price is high. Do NOT discount and do NOT invent promotions. Restate what the price actually covers from verified package data, tied to what they said matters.",
  PACKAGE_ALTERNATIVE:
    "Offer a genuinely cheaper verified package or a different verified configuration, and state honestly what changes at that price.",
  BUILD_TRUST:
    "Answer the trust concern first with verified agency facts only. Offer written details or a human colleague. Never fabricate licences, reviews, testimonials or social proof.",
  SIMPLIFY_CHOICES:
    "Reduce the decision surface: recommend one primary verified option plus at most one alternative, and say in one line why each fits.",
  SUPPORT_DECISION_PROCESS:
    "The customer needs to consult someone. Give a short, forwardable summary of the key verified facts and agree a specific time to check back. No pressure.",
  REDUCE_FRICTION:
    "They are close but hesitating. Identify and resolve the ONE remaining blocker. Do not restart qualification.",
  FACILITATE_BOOKING:
    "The customer has decided. Stop selling. Move directly to the quotation / deposit / booking step that the conversion state allows, using only issued figures.",
  REPAIR_EXPERIENCE:
    "The customer is frustrated. Acknowledge honestly, answer from what is already known, do not ask repeated questions, and escalate to a human when appropriate.",
  STOP_CONTACT:
    "The customer opted out. Send no promotional content, no follow-up and no sales question.",
  HUMAN_ASSIST:
    "A human is needed or already handling this. Acknowledge briefly and stop selling.",
  UNDERSTAND_NEED:
    "Not enough behavioural evidence yet. Ask one high-value question that actually unlocks a recommendation.",
};

/** Prompt block injected alongside the STEP 3 intelligence instruction. */
export function behavioralInstruction(p: BehavioralProfile): string {
  const lines: string[] = [
    "BEHAVIOURAL SALES INTELLIGENCE (Step 3.7) — observed from this conversation only. Situational awareness, never text to repeat, never a personality judgement.",
    `Strategy: ${p.strategy} — ${STRATEGY_DIRECTIVE[p.strategy]}`,
    `Decision readiness: ${p.decisionReadiness.value} (confidence ${p.decisionReadiness.confidence.toFixed(2)}).`,
  ];
  const dim = (label: string, r: Reading<string>) =>
    r.value === "UNKNOWN" || r.value === "NONE"
      ? null
      : `${label}: ${r.value} (${r.confidence.toFixed(2)}${r.confidence < 0.6 ? " — hypothesis only, verify naturally in conversation" : ""})`;
  const dims = [
    dim("Trust", p.trust),
    dim("Hesitation", p.hesitation),
    dim("Price sensitivity", p.priceSensitivity),
    dim("Value sensitivity", p.valueSensitivity),
    dim("Urgency", p.urgency),
    dim("Reassurance need", p.reassuranceNeed),
    dim("Closing readiness", p.closingReadiness),
  ].filter(Boolean) as string[];
  if (dims.length) lines.push(dims.join(" · "));

  if (p.valueDimensions.length)
    lines.push(`What this customer cares about: ${p.valueDimensions.join(", ")}. Lead with these.`);
  if (p.comparison.length)
    lines.push(
      `Comparison behaviour: ${p.comparison.join(", ")}. Compare only verified facts — never invent competitor pricing, hotels or claims.`,
    );
  if (p.decisionMakers.length)
    lines.push(
      p.decisionMakerDependency
        ? `Decision depends on: ${p.decisionMakers.join(", ")}. This is a decision process, NOT a rejection. Support it.`
        : `Decision-maker consultation already resolved (${p.decisionMakers.join(", ")}). Do not reopen it or re-ask for approval.`,
    );
  if (p.informationLoad === "HIGH")
    lines.push("Information load is HIGH: simplify hard. One recommendation, one alternative, short lines.");
  if (p.communicationTraits.length)
    lines.push(
      `Communication behaviour to mirror: ${p.communicationTraits.join(", ")}. Match rhythm and depth, not personality.`,
    );
  if (p.urgency.value !== "UNKNOWN")
    lines.push(
      "Urgency was observed in the customer's own words. Never manufacture scarcity, deadlines or availability that is not verified in the data.",
    );

  lines.push(
    "ETHICS: no fabricated scarcity, bookings, availability, testimonials, social proof, competitor claims or discounts. No religious guilt, no fear, no pressure after refusal. Never bypass opt-out or human takeover.",
  );
  return lines.join("\n");
}

/** Contextual follow-up hint derived from behaviour (used by the dispatcher). */
export function behavioralFollowupHint(p: BehavioralProfile): string | null {
  if (p.strategy === "STOP_CONTACT") return null;
  if (p.decisionMakerDependency)
    return `The customer said they need to consult ${p.decisionMakers.join("/").toLowerCase()}. Follow up by referring to that discussion and offering to re-check the most suitable verified package — never a generic "still interested?".`;
  if (p.trust.value === "LOW" || p.reassuranceNeed.value === "HIGH")
    return "Unresolved trust concern. Follow up with verified reassurance and an offer to speak to a human colleague.";
  if (p.priceSensitivity.value === "HIGH")
    return "Budget was the blocker. Follow up with a verified alternative that fits the stated budget, without inventing a discount.";
  if (p.hesitation.value === "HIGH" || p.hesitation.value === "MEDIUM")
    return "Customer was still deciding. Follow up by resolving the single remaining blocker, not by restarting qualification.";
  if (p.decisionReadiness.value === "READY_TO_BOOK" || p.decisionReadiness.value === "DEPOSIT_READY")
    return "Customer was ready to proceed. Follow up with the exact next transaction step using issued figures only.";
  return null;
}
