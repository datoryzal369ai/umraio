/**
 * AI SALES ELITE™ — UMRAIO's elite autonomous sales & closing intelligence.
 *
 * STEP 3I.1. This is an INTELLIGENCE LAYER, not a new system. It sits on top of
 * the existing deterministic engines (conversation intelligence, behavioural
 * profile, objection lifecycle, closing engine) and answers three questions the
 * lower layers deliberately leave open:
 *
 *   1. What commercial STATE is this lead actually in?
 *   2. What is the SINGLE best next action right now?
 *   3. If it is time to close — WHICH closing style fits this human?
 *
 * Everything here is pure and deterministic: no model calls, no I/O. The output
 * is fed to the model as situational awareness and to the UI as pipeline
 * intelligence. The psychological framework is NEVER exposed to the customer.
 */

/* ------------------------------------------------------------------ *
 * 1. TYPES
 * ------------------------------------------------------------------ */

/** UMRAIO sells in two distinct commercial contexts. */
export type SalesDomain =
  /** The agency selling Umrah packages to a pilgrim. */
  | "agency_customer"
  /** UMRAIO selling the platform to an Umrah agency decision maker. */
  | "umraio_product";

export type EliteLeadState =
  | "NEW"
  | "EXPLORING"
  | "QUALIFYING"
  | "INTERESTED"
  | "CONSIDERING"
  | "HIGH_INTENT"
  | "READY_TO_CLOSE"
  | "CLOSED_WON"
  | "CLOSED_LOST"
  | "NURTURE";

export type EliteAction =
  | "ANSWER"
  | "CLARIFY"
  | "QUALIFY"
  | "RECOMMEND"
  | "BUILD_VALUE"
  | "HANDLE_OBJECTION"
  | "REASSURE"
  | "COMPARE"
  | "NEGOTIATE"
  | "ASK_FOR_COMMITMENT"
  | "CLOSE"
  | "FOLLOW_UP"
  | "ESCALATE_TO_HUMAN";

export type ClosingMode =
  | "NONE"
  | "DIRECT"
  | "ASSUMPTIVE"
  | "CHOICE"
  | "SUMMARY"
  | "VALUE"
  | "NEXT_STEP"
  | "LOW_FRICTION"
  | "CONSULTATIVE";

export type Band = "low" | "medium" | "high";

/** What the engine believes about the human on the other side. */
export type PsychologyRead = {
  /** How ready they are to commit right now. */
  readiness: Band;
  /** Confidence in the agency / platform. */
  trust: Band;
  /** How much price dominates their reasoning. */
  priceSensitivity: Band;
  /** Real (stated) time pressure — never manufactured. */
  urgency: Band;
  /** Can this person decide alone? */
  decisionAuthority: "sole" | "shared" | "unknown";
  /** Emotional temperature of the latest message. */
  emotion: "positive" | "neutral" | "hesitant" | "frustrated";
  /** They are actively weighing another provider. */
  comparing: boolean;
  /** Perceived risk that must be reduced before commitment. */
  riskPerception: Band;
};

export type EliteRead = {
  domain: SalesDomain;
  state: EliteLeadState;
  action: EliteAction;
  closingMode: ClosingMode;
  psychology: PsychologyRead;
  /** The one objection to resolve in this message, if any. */
  objectionFocus: string | null;
  /** True when a human consultant must take over. */
  escalate: boolean;
  escalationReason: string | null;
  /** Context-anchored follow-up angle, never a generic nudge. */
  followUp: { hours: number; angle: string } | null;
  /** Short, human-readable rationale for the dashboard / audit trail. */
  rationale: string;
  /** 0-1 confidence in this read. */
  confidence: number;
};

export type EliteInput = {
  domain: SalesDomain;
  /** Chronological customer/visitor messages, oldest first. */
  customerMessages: string[];
  /** Upstream conversation state label (free-form, used as a hint only). */
  upstreamState?: string | null;
  /** Signals detected by the conversation intelligence layer. */
  signals?: string[];
  /** Objections still unresolved. */
  activeObjections?: string[];
  /** Objections the customer already settled — never reopen. */
  resolvedObjections?: string[];
  buyingSignals?: string[];
  /** Qualification facts already captured. */
  known?: string[];
  /** Qualification facts still missing. */
  missing?: string[];
  optOut?: boolean;
  humanRequested?: boolean;
  /** Quotation lifecycle status, when one exists. */
  quotationStatus?: string | null;
  bookingConfirmed?: boolean;
  /** Hours since the customer last wrote. Null when unknown. */
  hoursSinceCustomerMessage?: number | null;
  /** True when a human already owns the conversation. */
  humanTakeover?: boolean;
};

/* ------------------------------------------------------------------ *
 * 2. LIGHT DETECTORS (psychology dimensions the lower layers omit)
 * ------------------------------------------------------------------ */

const has = (list: string[] | undefined, ...names: string[]) =>
  !!list && names.some((n) => list.includes(n));

const test = (text: string, re: RegExp) => re.test(text);

const SPOUSE_RE =
  /\b(suami|isteri|husband|wife|bincang\s+(dengan|dgn)|discuss\s+with|tanya\s+(dulu\s+)?(suami|isteri|family|keluarga|boss|partner)|family\s+decision|kena\s+tanya)\b/i;
const SOLE_RE =
  /\b(saya\s+(yang\s+)?decide|i\s+decide|i'?m\s+the\s+owner|saya\s+(owner|pemilik|boss|founder|director|pengarah)|owner\s+agensi|agency\s+owner|my\s+(agency|company))\b/i;
const COMPARE_RE =
  /\b(agensi\s+lain|company\s+lain|other\s+(agency|agencies|provider|vendor)s?|compare|banding|competitor|pesaing|quote\s+lain|tempat\s+lain)\b/i;
const URGENCY_RE =
  /\b(urgent|segera|cepat|asap|minggu\s+ini|this\s+week|bulan\s+ini|this\s+month|kejar|last\s+minute|dah\s+dekat)\b/i;
const RISK_RE =
  /\b(scam|penipu|selamat\s+ke|betul\s+ke|jamin|guarantee|refund|kalau\s+batal|cancel(l)?ation|risiko|risk|lesen|licence|motac)\b/i;
const COMMIT_RE =
  /\b(ok(ay)?\s*(lah)?\s*,?\s*(kita\s+)?(proceed|teruskan|jom|go\s+ahead)|saya\s+ambil|i'?ll\s+take|let'?s\s+(proceed|do\s+it|start)|deal|setuju|saya\s+nak\s+(ambil|book|daftar))\b/i;
const PRICE_PUSH_RE =
  /\b(mahal|expensive|kurang\s+sikit|boleh\s+kurang|best\s+price|discount|diskaun|murah\s+lagi|nego)\b/i;
const GHOST_RE = /\b(nanti\s+saya\s+reply|later|saya\s+fikir\s+dulu|i'?ll\s+think)\b/i;

/** Rolling text window used by the psychology detectors. */
function windowText(messages: string[], n = 6): string {
  return messages.slice(-n).join(" \n ");
}

export function readPsychology(input: EliteInput): PsychologyRead {
  const recent = windowText(input.customerMessages);
  const latest = input.customerMessages.length
    ? input.customerMessages[input.customerMessages.length - 1]!
    : "";
  const signals = input.signals ?? [];
  const objections = input.activeObjections ?? [];
  const buying = input.buyingSignals ?? [];

  const strongCommit =
    test(latest, COMMIT_RE) ||
    has(signals, "READY_TO_BOOK", "DEPOSIT_INTENT", "READY_TO_BUY", "CONFIDENT");
  const readiness: Band = strongCommit
    ? "high"
    : buying.length || has(signals, "INTERESTED", "EXCITED")
      ? "medium"
      : "low";

  const trustHit = has(signals, "TRUST_CONCERN") || objections.includes("TRUST") || test(recent, RISK_RE);
  const trust: Band = trustHit ? "low" : readiness === "high" || buying.length ? "high" : "medium";

  const priceHit =
    has(signals, "PRICE_CONCERN") || objections.includes("PRICE") || test(recent, PRICE_PUSH_RE);
  const priceSensitivity: Band = priceHit
    ? test(latest, PRICE_PUSH_RE) || objections.includes("PRICE")
      ? "high"
      : "medium"
    : "low";

  const urgency: Band = has(signals, "URGENT") || test(latest, URGENCY_RE)
    ? "high"
    : test(recent, URGENCY_RE)
      ? "medium"
      : "low";

  const decisionAuthority: PsychologyRead["decisionAuthority"] = test(recent, SPOUSE_RE)
    ? "shared"
    : test(recent, SOLE_RE)
      ? "sole"
      : "unknown";

  const emotion: PsychologyRead["emotion"] = has(signals, "FRUSTRATED", "REPETITION_COMPLAINT")
    ? "frustrated"
    : has(signals, "HESITANT", "CONFUSED", "NOT_READY")
      ? "hesitant"
      : has(signals, "EXCITED", "INTERESTED", "READY_TO_BUY", "READY_TO_BOOK", "CONFIDENT")
        ? "positive"
        : "neutral";

  const comparing =
    test(recent, COMPARE_RE) || objections.includes("COMPARISON") || has(signals, "COMPARISON");

  const riskPerception: Band = trustHit
    ? "high"
    : objections.includes("UNCERTAINTY") || has(signals, "HESITANT") || test(recent, RISK_RE)
      ? "medium"
      : "low";

  return {
    readiness,
    trust,
    priceSensitivity,
    urgency,
    decisionAuthority,
    emotion,
    comparing,
    riskPerception,
  };
}

/* ------------------------------------------------------------------ *
 * 3. LEAD STATE
 * ------------------------------------------------------------------ */

export function readLeadState(input: EliteInput, psy: PsychologyRead): EliteLeadState {
  const turns = input.customerMessages.length;
  const signals = input.signals ?? [];
  const quotation = (input.quotationStatus ?? "").toLowerCase();

  if (input.bookingConfirmed || quotation === "accepted" || quotation === "won") return "CLOSED_WON";
  if (input.optOut || has(signals, "NOT_INTERESTED", "DO_NOT_CONTACT")) {
    return input.optOut ? "CLOSED_LOST" : "NURTURE";
  }
  if (turns === 0) return "NEW";

  const known = input.known ?? [];
  const missing = input.missing ?? [];

  if (psy.readiness === "high" && (quotation || known.length >= 3)) return "READY_TO_CLOSE";
  if (psy.readiness === "high") return "HIGH_INTENT";
  if (quotation && quotation !== "expired") return "CONSIDERING";
  if ((input.activeObjections ?? []).length || psy.emotion === "hesitant" || psy.comparing) {
    return "CONSIDERING";
  }
  if ((input.buyingSignals ?? []).length || psy.readiness === "medium") return "INTERESTED";
  if (known.length && missing.length) return "QUALIFYING";
  if (turns <= 2) return "EXPLORING";
  return "QUALIFYING";
}

/* ------------------------------------------------------------------ *
 * 4. NEXT BEST ACTION (exactly one)
 * ------------------------------------------------------------------ */

const UPSTREAM_ACTION_MAP: Record<string, EliteAction> = {
  ASK_CLARIFYING_QUESTION: "CLARIFY",
  ANSWER_FROM_CONTEXT: "ANSWER",
  RECOMMEND_PACKAGE: "RECOMMEND",
  EXPLAIN_VALUE: "BUILD_VALUE",
  HANDLE_OBJECTION: "HANDLE_OBJECTION",
  PROVIDE_COMPARISON: "COMPARE",
  BUILD_TRUST: "REASSURE",
  CREATE_QUOTATION: "ASK_FOR_COMMITMENT",
  SEND_QUOTATION: "ASK_FOR_COMMITMENT",
  MOVE_TO_DEPOSIT_READY: "CLOSE",
  FOLLOW_UP: "FOLLOW_UP",
  NURTURE: "FOLLOW_UP",
  ESCALATE: "ESCALATE_TO_HUMAN",
  SIMPLIFY_OPTIONS: "CLARIFY",
  SUPPORT_DECISION_MAKER: "REASSURE",
  REDUCE_FRICTION: "ASK_FOR_COMMITMENT",
};

export function chooseAction(
  input: EliteInput,
  psy: PsychologyRead,
  state: EliteLeadState,
): { action: EliteAction; rationale: string } {
  const signals = input.signals ?? [];
  const active = input.activeObjections ?? [];

  // 1. Human control always wins.
  if (input.humanRequested || input.humanTakeover) {
    return { action: "ESCALATE_TO_HUMAN", rationale: "A human was explicitly requested or is already handling this conversation." };
  }
  if (psy.emotion === "frustrated") {
    return { action: "REASSURE", rationale: "The customer is frustrated — repair the relationship before any selling." };
  }
  if (state === "CLOSED_LOST") {
    return { action: "FOLLOW_UP", rationale: "The customer disengaged — no selling, respect their decision." };
  }

  // 2. Unresolved objection blocks everything else.
  if (active.length) {
    if (active.includes("PRICE") && psy.readiness === "high") {
      return { action: "NEGOTIATE", rationale: "Strong intent held back by price — restructure value and payment, never invent a discount." };
    }
    if (psy.comparing || active.includes("COMPARISON")) {
      return { action: "COMPARE", rationale: "The customer is weighing alternatives — give an honest, verified comparison." };
    }
    if (active.includes("TRUST") || psy.trust === "low") {
      return { action: "REASSURE", rationale: "Trust is the blocker — reduce perceived risk with verifiable facts." };
    }
    return { action: "HANDLE_OBJECTION", rationale: `Resolve the active objection (${active[0]}) before advancing.` };
  }

  // 3. Real buying signals.
  if (state === "READY_TO_CLOSE") {
    return { action: "CLOSE", rationale: "The customer has shown clear commitment — move to the concrete next step." };
  }
  if (state === "HIGH_INTENT") {
    return { action: "ASK_FOR_COMMITMENT", rationale: "Buying intent is clear — ask for the next small commitment, not for interest." };
  }

  // 4. Shared decision authority: never pressure a sole decision.
  if (psy.decisionAuthority === "shared" && psy.readiness !== "low") {
    return { action: "REASSURE", rationale: "The decision is shared — equip them to convince the other decision maker, then agree a check-back time." };
  }

  // 5. Disengagement.
  if ((input.hoursSinceCustomerMessage ?? 0) >= 24 && state !== "NEW") {
    return { action: "FOLLOW_UP", rationale: "The conversation went quiet — re-engage on the last real topic." };
  }

  // 6. Fall back to the upstream engine's decision, then to stage defaults.
  const upstream = input.upstreamState && UPSTREAM_ACTION_MAP[input.upstreamState];
  if (upstream) return { action: upstream, rationale: "Following the conversation engine's derived next best action." };

  if (has(signals, "RECOMMENDATION_REQUEST")) {
    return { action: "RECOMMEND", rationale: "The customer asked for a recommendation — give one, not a menu." };
  }
  if (state === "NEW" || state === "EXPLORING") {
    return { action: "CLARIFY", rationale: "Understand the real need before qualifying or recommending." };
  }
  if (state === "QUALIFYING") {
    return { action: "QUALIFY", rationale: "Collect the one or two facts that actually change the recommendation." };
  }
  if (state === "INTERESTED") {
    return { action: "RECOMMEND", rationale: "Enough is known — recommend the best-fit verified option." };
  }
  if (state === "CONSIDERING") {
    return { action: "BUILD_VALUE", rationale: "They are weighing the decision — strengthen perceived value with verified facts." };
  }
  return { action: "ANSWER", rationale: "Answer what was actually asked." };
}

/* ------------------------------------------------------------------ *
 * 5. CLOSING MODE
 * ------------------------------------------------------------------ */

export function chooseClosingMode(
  action: EliteAction,
  psy: PsychologyRead,
  input: EliteInput,
): ClosingMode {
  if (action !== "CLOSE" && action !== "ASK_FOR_COMMITMENT" && action !== "NEGOTIATE") return "NONE";

  if (psy.decisionAuthority === "shared") return "SUMMARY";
  if (psy.trust === "low" || psy.riskPerception === "high") return "LOW_FRICTION";
  if (psy.priceSensitivity === "high") return "VALUE";
  if (psy.comparing) return "CONSULTATIVE";
  if (action === "CLOSE" && psy.readiness === "high") {
    return input.quotationStatus ? "ASSUMPTIVE" : "NEXT_STEP";
  }
  if (psy.emotion === "hesitant") return "CHOICE";
  if (psy.readiness === "high") return "DIRECT";
  return "NEXT_STEP";
}

/* ------------------------------------------------------------------ *
 * 6. FOLLOW-UP INTELLIGENCE (always context-anchored)
 * ------------------------------------------------------------------ */

export function planFollowUp(
  input: EliteInput,
  psy: PsychologyRead,
  state: EliteLeadState,
): EliteRead["followUp"] {
  if (input.optOut || input.humanTakeover) return null;
  if (state === "CLOSED_WON") return null;

  if (psy.decisionAuthority === "shared") {
    return { hours: 48, angle: "Check back on the discussion with their spouse/family — reference exactly what they said they needed to discuss." };
  }
  if (psy.comparing) {
    return { hours: 24, angle: "Follow up with the specific clarification that makes the comparison fair — no pressure, no rival bashing." };
  }
  if ((input.quotationStatus ?? "").toLowerCase() === "sent") {
    return { hours: 24, angle: "Follow up on the quotation already sent: answer any open question and offer to walk through it." };
  }
  if (state === "HIGH_INTENT" || state === "READY_TO_CLOSE") {
    return { hours: 12, angle: "Strong intent then silence — re-open on the exact package and next step already discussed." };
  }
  if (psy.priceSensitivity === "high") {
    return { hours: 72, angle: "Re-engage with a genuinely suitable verified option in their stated budget." };
  }
  if (state === "NURTURE" || state === "CLOSED_LOST") {
    return { hours: 24 * 30, angle: "Long-cycle nurture only — one useful, non-salesy message when something genuinely relevant appears." };
  }
  return { hours: 48, angle: "Re-engage on the last real topic in this conversation, adding one new useful fact." };
}

/* ------------------------------------------------------------------ *
 * 7. THE READ
 * ------------------------------------------------------------------ */

export function buildEliteRead(input: EliteInput): EliteRead {
  const psychology = readPsychology(input);
  const state = readLeadState(input, psychology);
  const { action, rationale } = chooseAction(input, psychology, state);
  const closingMode = chooseClosingMode(action, psychology, input);
  const active = input.activeObjections ?? [];

  const escalate = action === "ESCALATE_TO_HUMAN";
  const escalationReason = escalate
    ? input.humanRequested
      ? "Customer explicitly asked for a human consultant."
      : input.humanTakeover
        ? "A human colleague already owns this conversation."
        : "Human judgement required."
    : null;

  const turns = input.customerMessages.length;
  const confidence = Math.min(
    0.95,
    0.4 + Math.min(turns, 6) * 0.06 + (input.known?.length ?? 0) * 0.04 + (active.length ? 0.05 : 0),
  );

  return {
    domain: input.domain,
    state,
    action,
    closingMode,
    psychology,
    objectionFocus: active.length ? active[0]! : null,
    escalate,
    escalationReason,
    followUp: planFollowUp(input, psychology, state),
    rationale,
    confidence: Number(confidence.toFixed(2)),
  };
}

/* ------------------------------------------------------------------ *
 * 8. PROMPT LAYER
 * ------------------------------------------------------------------ */

export const ACTION_DIRECTIVE: Record<EliteAction, string> = {
  ANSWER:
    "Answer precisely what they actually asked, using verified information only. Do not bolt a sales question onto the end of every answer.",
  CLARIFY:
    "You do not yet understand the real need. Ask ONE genuinely useful question — the one whose answer changes your recommendation.",
  QUALIFY:
    "Collect at most one or two missing facts, woven naturally into the reply. Never interrogate, never list a form.",
  RECOMMEND:
    "Recommend ONE best-fit verified option (at most one alternative), with a short concrete reason tied to what they told you.",
  BUILD_VALUE:
    "Strengthen perceived value with specific verified facts that matter to THIS person — not generic selling points.",
  HANDLE_OBJECTION:
    "Understand the real concern first, acknowledge it plainly, reframe the value, reduce the risk, then move one step forward. Never argue, never get defensive, never discount reflexively.",
  REASSURE:
    "Lower perceived risk with verifiable, concrete facts. Calm confidence, no defensiveness, no over-promising.",
  COMPARE:
    "Give an honest, factual comparison using verified data only. Never criticise a competitor; make the trade-offs clear and let them decide.",
  NEGOTIATE:
    "Restructure the offer, not the truth: smaller pilgrim count, different verified package, or payment structuring. Never invent a discount or a price you were not given.",
  ASK_FOR_COMMITMENT:
    "They are interested — ask for the next small, concrete commitment. Never ask 'are you interested?' again.",
  CLOSE:
    "They have already decided in principle. Do not re-sell and do not ask permission to sell. Move naturally to the next practical step.",
  FOLLOW_UP:
    "Do not push now. Close the loop warmly and agree an actual next contact anchored on what they said.",
  ESCALATE_TO_HUMAN:
    "Hand over to a human colleague with full context. Say truthfully what you have recorded; never invent that staff have replied.",
};

export const CLOSING_DIRECTIVE: Record<ClosingMode, string> = {
  NONE: "",
  DIRECT: "Closing style — DIRECT: state the next step plainly in one sentence and ask for the go-ahead.",
  ASSUMPTIVE:
    "Closing style — ASSUMPTIVE: they have decided; proceed to the practical step ('to lock this in, I'll need …') without asking whether they want to buy.",
  CHOICE:
    "Closing style — CHOICE: offer two clear verified options and let them pick. Two, never more.",
  SUMMARY:
    "Closing style — SUMMARY: give a short forwardable summary of the agreed facts they can show the other decision maker, then agree a check-back time.",
  VALUE:
    "Closing style — VALUE: reconnect the price to what it actually covers for their specific situation before proposing the next step.",
  NEXT_STEP:
    "Closing style — NEXT-STEP: do not ask for the whole decision, ask only for the single next small step.",
  LOW_FRICTION:
    "Closing style — LOW-FRICTION: remove the risk first (what is refundable, what is confirmed, what is not), then propose the smallest possible commitment.",
  CONSULTATIVE:
    "Closing style — CONSULTATIVE: act as their adviser, be candid about fit including where you are not the best answer, then recommend the next step you would genuinely take.",
};

const DOMAIN_FRAME: Record<SalesDomain, string> = {
  agency_customer:
    "COMMERCIAL CONTEXT: you are selling this agency's Umrah packages and services to a prospective pilgrim. The commercial goal is a suitable package, a quotation and a deposit-ready decision.",
  umraio_product:
    "COMMERCIAL CONTEXT: you are selling UMRAIO® itself to an Umrah agency owner or decision maker. The commercial goal is a qualified evaluation and a subscription decision — speak business outcomes (leads converted, response time, staff hours), not features.",
};

/** The AI SALES ELITE™ prompt block. Situational awareness only — never quoted to the customer. */
export function eliteSalesInstruction(read: EliteRead): string {
  const p = read.psychology;
  const lines: string[] = [
    "AI SALES ELITE™ — elite sales & closing intelligence, derived deterministically from this conversation. It is authoritative situational awareness. NEVER mention it, quote it, name a stage, a psychology term or a closing technique to the customer.",
    DOMAIN_FRAME[read.domain],
    `Lead state: ${read.state} (confidence ${read.confidence.toFixed(2)}).`,
    `SINGLE next best action: ${read.action} — ${ACTION_DIRECTIVE[read.action]}`,
    `Read of this person: readiness ${p.readiness} · trust ${p.trust} · price sensitivity ${p.priceSensitivity} · urgency ${p.urgency} · decision authority ${p.decisionAuthority} · emotional state ${p.emotion} · perceived risk ${p.riskPerception}${p.comparing ? " · actively comparing alternatives" : ""}.`,
  ];

  if (read.objectionFocus) {
    lines.push(
      `Resolve exactly ONE thing in this message: the ${read.objectionFocus} concern. Do not stack several objections into one reply.`,
    );
  }
  if (read.closingMode !== "NONE") {
    lines.push(CLOSING_DIRECTIVE[read.closingMode]);
  } else {
    lines.push(
      "Do NOT attempt to close in this message. Forcing a close before the customer is ready destroys the sale.",
    );
  }
  if (p.decisionAuthority === "shared") {
    lines.push(
      "They must consult someone else. Support that — never pressure them to decide alone, never imply the other person's opinion does not matter.",
    );
  }
  if (p.emotion === "frustrated") {
    lines.push(
      "They are frustrated. Acknowledge it once, plainly and without excuses, fix the actual problem, and do not sell in this message.",
    );
  }
  if (read.followUp) {
    lines.push(
      `If this thread goes quiet, the correct follow-up (in about ${read.followUp.hours}h) is: ${read.followUp.angle}`,
    );
  }
  if (read.escalate) {
    lines.push(
      `ESCALATION: ${read.escalationReason} Hand over cleanly, state only what is verifiably recorded, and stop selling.`,
    );
  }

  lines.push(
    "ELITE CONVERSATION STANDARD: write as an exceptionally experienced human consultant. Vary your sentence structure and openings; never reuse the same reply pattern twice. No 'As an AI', 'Certainly!', 'Absolutely!', 'How can I assist you today?', no bullet-point forms, no repeated greetings, no forced enthusiasm.",
    "Listen before selling. Answer what they actually mean. Ask a question only when the answer changes what you would recommend. One idea per message, one clear next step.",
    "ABSOLUTE PROHIBITIONS: no fabricated prices, availability, testimonials, guarantees, certifications or customer facts; no invented urgency or scarcity; no pressure, manipulation or exploitation of a hesitant or vulnerable person. When you do not know, ask or escalate.",
  );

  return lines.filter(Boolean).join("\n");
}

/* ------------------------------------------------------------------ *
 * 9. HUMAN SALES HANDOFF BRIEF
 * ------------------------------------------------------------------ */

export function eliteHandoffBrief(input: {
  read: EliteRead;
  customerName?: string | null;
  budgetMyr?: number | null;
  pax?: number | null;
  packageInterest?: string | null;
  discussed?: string[];
  reason: string;
}): string {
  const { read } = input;
  const p = read.psychology;
  return [
    "AI SALES ELITE™ HANDOFF BRIEF",
    `LEAD: ${input.customerName ?? "Unknown"}${input.pax ? ` · ${input.pax} pilgrim(s)` : ""}${input.budgetMyr ? ` · budget RM${input.budgetMyr}/pax` : ""}`,
    `STATE: ${read.state} · readiness ${p.readiness} · trust ${p.trust} · sentiment ${p.emotion}`,
    `PACKAGE INTEREST: ${input.packageInterest ?? "not chosen yet"}`,
    `MAIN OBJECTION: ${read.objectionFocus ?? "none currently active"}`,
    `DECISION AUTHORITY: ${p.decisionAuthority}${p.comparing ? " · comparing other providers" : ""}`,
    `ALREADY DISCUSSED: ${input.discussed?.length ? input.discussed.join(", ") : "see conversation history"}`,
    `RECOMMENDED NEXT ACTION: ${read.action} — ${read.rationale}`,
    `CLOSING OPPORTUNITY: ${read.closingMode === "NONE" ? "not yet — do not push" : read.closingMode}`,
    `HANDOFF REASON: ${input.reason}`,
    "The customer must NOT be asked to repeat anything already captured above.",
  ].join("\n");
}
