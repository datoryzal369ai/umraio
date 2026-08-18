/**
 * UMRAIO® STEP 3F — RAIŌ CLOSING & SUBSCRIPTION EXECUTION ENGINE™
 * (additive, pure, deterministic).
 *
 * This module does NOT rebuild the B2B conversion engine, behavioural
 * psychology, sales intelligence, social presence or safety gates. It reads
 * their existing output and answers three questions only:
 *
 *   1. Is the agency genuinely ready to move (high-intent detection)?
 *   2. Which REAL call-to-action is the right next step right now?
 *   3. How should RAIŌ behave after a CTA has already been presented?
 *
 * No model call, no database, no schema change, no UI change.
 */

import { maskNegatedSpans, normalizeMessage } from "@/lib/sales/hardening.core";
import type { DemoMessage } from "@/lib/meet-executive.core";
import type { MeetIntelligence } from "./b2b-executive.core";
import type { ConversionRead } from "./b2b-conversion.core";

/* ------------------------------------------------------------------ *
 * §5 — CTA integrity: only actions that actually exist on this page.
 * ------------------------------------------------------------------ */

export type MeetCta =
  | "CONTINUE_CONVERSATION"
  | "START_FREE_TRIAL"
  | "BOOK_LIVE_DEMO"
  | "TALK_TO_OUR_TEAM"
  | "FORWARDABLE_SUMMARY";

export const MEET_CTA_LABEL: Record<MeetCta, string> = {
  CONTINUE_CONVERSATION: "keep the conversation going (no button yet)",
  START_FREE_TRIAL: "Start Free Trial",
  BOOK_LIVE_DEMO: "Book Live Demo",
  TALK_TO_OUR_TEAM: "Talk to our team",
  FORWARDABLE_SUMMARY: "a short forwardable summary, then Book Live Demo",
};

/* ------------------------------------------------------------------ *
 * §3 — High-intent detection (BM / English / Manglish, no exact keywords).
 * ------------------------------------------------------------------ */

const SUBSCRIBE_INTENT =
  /\b(macam\s?mana\s+(nak\s+)?(subscribe|langgan|daftar|mula|start)|how\s+(do|can)\s+i\s+(subscribe|sign\s*up|start|get\s+started)|how\s+to\s+(start|subscribe|sign\s*up)|where\s+(do|to)\s+(i\s+)?(sign\s*up|subscribe|start)|nak\s+(subscribe|langgan|daftar|ambil|amik)|boleh\s+(daftar|langgan|subscribe|sign\s*up)|saya\s+nak\s+(ambil|amik|langgan|subscribe)|i\s+want\s+to\s+(get\s+started|start|subscribe|sign\s*up)|sign\s*up\s+now|nak\s+guna\s+(sekarang|terus))\b/i;

const START_NOW_INTENT =
  /\b(boleh\s+start\s+(sekarang|hari\s+ni|today)|can\s+i\s+start\s+(today|now)|can\s+start\s+now|start\s+sekarang|nak\s+mula\s+(sekarang|hari\s+ni)|let('?s| us)\s+(start|go)|proceed\s+(now|with\s+this))\b/i;

const TRY_INTENT =
  /\b(saya\s+nak\s+cuba|nak\s+cuba\s+(dulu|sekarang)?|can\s+try\s+first|boleh\s+cuba\s+(dulu)?|try\s+first|free\s+trial|nak\s+trial|trial\s+dulu|i\s+(want|would\s+like)\s+to\s+try)\b/i;

const PRICE_READY_INTENT =
  /\b(berapa\s+(nak\s+)?bayar|berapa\s+(harga|kos|sebulan|per\s+month)|how\s+much\s+(is\s+it|to\s+(start|subscribe))|what('?s| is)\s+the\s+(price|cost))\b/i;

/** Natural high-intent detection: last visitor turns weigh most. */
export function detectHighIntent(visitorMessages: string[]): {
  high: boolean;
  kind: "SUBSCRIBE" | "START_NOW" | "TRY" | "PRICE" | null;
  evidence: string | null;
} {
  const recent = visitorMessages.slice(-3);
  const joined = maskNegatedSpans(normalizeMessage(recent.join("\n")));
  const hit = (re: RegExp) => {
    const m = re.exec(joined);
    return m ? m[0].trim().slice(0, 80) : null;
  };

  const subscribe = hit(SUBSCRIBE_INTENT);
  if (subscribe) return { high: true, kind: "SUBSCRIBE", evidence: subscribe };
  const startNow = hit(START_NOW_INTENT);
  if (startNow) return { high: true, kind: "START_NOW", evidence: startNow };
  const tryIt = hit(TRY_INTENT);
  if (tryIt) return { high: true, kind: "TRY", evidence: tryIt };
  const price = hit(PRICE_READY_INTENT);
  if (price) return { high: false, kind: "PRICE", evidence: price };
  return { high: false, kind: null, evidence: null };
}

/* ------------------------------------------------------------------ *
 * §8 / §15 — Post-CTA behaviour.
 * ------------------------------------------------------------------ */

export type PostCtaSignal = "ACCEPT" | "DEFER" | "THINKING" | "SEND_DETAILS" | "QUESTION" | null;

const DEFER = /\b(nanti\s+dulu|later|not\s+now|belum\s+lagi|tunggu\s+dulu|hold\s+on\s+first)\b/i;
const THINKING =
  /\b(saya\s+fikir\s+dulu|fikir\s+dulu|nak\s+fikir|let\s+me\s+think|i(\s+will|'ll)?\s+think\s+about\s+it|need\s+to\s+think)\b/i;
const SEND_DETAILS =
  /\b(send\s+(me\s+)?(the\s+)?(details|info|summary|proposal)|hantar\s+(details|detail|info|maklumat|summary)|boleh\s+bagi\s+(details|maklumat)|email\s+me\s+(the\s+)?details)\b/i;
const ACCEPT = /\b(ok(ay)?|baik|boleh|sure|deal|jom|let('?s| us)\s+do\s+it)\b\.?$/i;

export function detectPostCtaSignal(lastVisitorMessage: string | null): PostCtaSignal {
  if (!lastVisitorMessage) return null;
  const text = normalizeMessage(lastVisitorMessage).trim();
  if (SEND_DETAILS.test(text)) return "SEND_DETAILS";
  if (THINKING.test(text)) return "THINKING";
  if (DEFER.test(text)) return "DEFER";
  if (/\?/.test(text)) return "QUESTION";
  if (ACCEPT.test(text) && text.length <= 24) return "ACCEPT";
  return null;
}

/** Has RAIŌ already put a real CTA on the table? */
export function ctaAlreadyPresented(messages: DemoMessage[]): boolean {
  return messages.some(
    (m) =>
      m.role === "executive" &&
      /(start\s+free\s+trial|book\s+(a\s+)?live\s+demo|talk\s+to\s+our\s+team)/i.test(m.content),
  );
}

/* ------------------------------------------------------------------ *
 * §2 / §6 — Readiness ladder and CTA selection.
 * ------------------------------------------------------------------ */

export type ClosingReadiness =
  | "BLOCKED"
  | "EXPLORING"
  | "INTERESTED"
  | "CONSIDERING"
  | "COMPARING"
  | "HESITANT"
  | "DECISION_MAKER_DEPENDENT"
  | "READY_TO_TRIAL"
  | "READY_TO_SUBSCRIBE";

export type ClosingRead = {
  readiness: ClosingReadiness;
  cta: MeetCta;
  /** True when discovery must stop: evidence of a decision moment. */
  stopDiscovery: boolean;
  /** True when a short confirmation of scope should precede the CTA (§7). */
  confirmUnderstanding: boolean;
  highIntent: boolean;
  intentEvidence: string | null;
  ctaPresented: boolean;
  postCta: PostCtaSignal;
  reason: string;
};

const READINESS_DIRECTIVE: Record<ClosingReadiness, string> = {
  BLOCKED:
    "Safety takes priority over any commercial move. Do not present a CTA, do not sell, respect the customer's control.",
  EXPLORING:
    "They are still curious. Keep understanding them; no CTA yet. One grounded question, no pitch.",
  INTERESTED:
    "Show the value that matches what they actually said. Still no hard CTA — invite the next natural step only if they ask.",
  CONSIDERING:
    "Address the specific concern or demonstrate on their own scenario before proposing anything.",
  COMPARING:
    "Clarify what UMRAIO actually does versus what they already have. Never attack another product. No pressure.",
  HESITANT:
    "Slow down. Understand the hesitation first. Do not repeat the pitch and do not re-present the CTA.",
  DECISION_MAKER_DEPENDENT:
    "Treat this as normal, not rejection. Give a short forwardable summary: current gap → what UMRAIO does → how it helps → next step. No invented ROI. Offer Book Live Demo with the partner.",
  READY_TO_TRIAL:
    "They want to try. Acknowledge, confirm briefly what UMRAIO will help with, then point to Start Free Trial. Stop discovery.",
  READY_TO_SUBSCRIBE:
    "They asked how to proceed. Acknowledge by name, confirm the main problem in one line, then give the actual next action: Start Free Trial, or Talk to our team if they prefer to speak to a person first. Keep it under ~60 words. Do not restart the sales conversation and do not ask more discovery questions.",
};

export function buildClosingRead(input: {
  intel: MeetIntelligence;
  conversion: ConversionRead;
  messages: DemoMessage[];
}): ClosingRead {
  const { intel, conversion, messages } = input;
  const visitor = messages.filter((m) => m.role === "visitor").map((m) => m.content);
  const intent = detectHighIntent(visitor);
  const ctaPresented = ctaAlreadyPresented(messages);
  const lastVisitor = visitor.length ? visitor[visitor.length - 1]! : null;
  const postCta = ctaPresented ? detectPostCtaSignal(lastVisitor) : null;

  const objections = new Set(conversion.activeObjections);
  const decisionMaker =
    objections.has("NEEDS_PARTNER_APPROVAL") ||
    /\b(partner|bincang\s+dengan|discuss\s+with\s+(my|our)\s+(partner|boss|team)|kena\s+tanya\s+boss)\b/i.test(
      maskNegatedSpans(normalizeMessage(visitor.slice(-3).join("\n"))),
    );

  let readiness: ClosingReadiness;
  let reason: string;

  if (conversion.blocked || intel.optedOut || intel.humanRequested) {
    readiness = "BLOCKED";
    reason = "Safety gate active (opt-out or human handoff).";
  } else if (postCta === "THINKING" || postCta === "DEFER") {
    readiness = "HESITANT";
    reason = "CTA already presented and the customer asked for time.";
  } else if (intent.kind === "SUBSCRIBE" || intent.kind === "START_NOW") {
    readiness = "READY_TO_SUBSCRIBE";
    reason = `Explicit intent to proceed: "${intent.evidence}".`;
  } else if (intent.kind === "TRY") {
    readiness = "READY_TO_TRIAL";
    reason = `Trial intent: "${intent.evidence}".`;
  } else if (decisionMaker) {
    readiness = "DECISION_MAKER_DEPENDENT";
    reason = "The owner must consult a partner or another decision maker.";
  } else if (objections.has("COST")) {
    readiness = "CONSIDERING";
    reason = "Price or budget concern is active — clarify value before any CTA.";
  } else if (objections.has("ALREADY_HAVE_CRM") || objections.has("ALREADY_HAVE_SALES_TEAM") || objections.has("TEAM_CAN_DO_IT")) {
    readiness = "COMPARING";
    reason = "They are comparing UMRAIO with an existing tool.";
  } else if (objections.size) {
    readiness = "CONSIDERING";
    reason = "An objection is still open.";
  } else if (conversion.commercialIntent === "COMMERCIAL_INTENT" || conversion.commercialIntent === "EVALUATING") {
    readiness = "INTERESTED";
    reason = "Commercial evaluation in progress, no explicit intent to start.";
  } else if (intel.diagnosis || intel.detectedGaps.length) {
    readiness = "INTERESTED";
    reason = "A real gap is evidenced; value demonstration is the next step.";
  } else {
    readiness = "EXPLORING";
    reason = "Not enough evidence yet — keep understanding.";
  }

  let cta: MeetCta;
  switch (readiness) {
    case "READY_TO_SUBSCRIBE":
      cta = "START_FREE_TRIAL";
      break;
    case "READY_TO_TRIAL":
      cta = "START_FREE_TRIAL";
      break;
    case "DECISION_MAKER_DEPENDENT":
      cta = "FORWARDABLE_SUMMARY";
      break;
    case "COMPARING":
    case "CONSIDERING":
      cta = ctaPresented ? "TALK_TO_OUR_TEAM" : "CONTINUE_CONVERSATION";
      break;
    case "BLOCKED":
    case "HESITANT":
    case "EXPLORING":
    case "INTERESTED":
    default:
      cta = "CONTINUE_CONVERSATION";
      break;
  }

  if (postCta === "SEND_DETAILS") cta = "FORWARDABLE_SUMMARY";

  // Complex / high-value cases are better served by a person.
  const complex =
    (intel.facts.salesTeam != null && intel.facts.salesTeam >= 20) ||
    objections.has("DATA_SECURITY");
  if (complex && (cta === "START_FREE_TRIAL" || cta === "CONTINUE_CONVERSATION") && readiness !== "EXPLORING") {
    cta = cta === "START_FREE_TRIAL" ? "START_FREE_TRIAL" : "TALK_TO_OUR_TEAM";
  }

  return {
    readiness,
    cta,
    stopDiscovery:
      readiness === "READY_TO_SUBSCRIBE" ||
      readiness === "READY_TO_TRIAL" ||
      readiness === "HESITANT" ||
      readiness === "BLOCKED" ||
      postCta === "SEND_DETAILS",
    confirmUnderstanding:
      (readiness === "READY_TO_SUBSCRIBE" || readiness === "READY_TO_TRIAL") && !ctaPresented,
    highIntent: intent.high,
    intentEvidence: intent.evidence,
    ctaPresented,
    postCta,
    reason,
  };
}

/* ------------------------------------------------------------------ *
 * Prompt directive — context for the model, never text to echo.
 * ------------------------------------------------------------------ */

export function closingInstruction(read: ClosingRead): string {
  const lines: string[] = [
    "UMRAIO CLOSING & SUBSCRIPTION EXECUTION ENGINE™ — deterministic closing read. Context only, never text to repeat verbatim.",
    `Readiness: ${read.readiness} (${read.reason}) — ${READINESS_DIRECTIVE[read.readiness]}`,
    `Next action to steer toward: ${MEET_CTA_LABEL[read.cta]}.`,
    "CTA INTEGRITY: the only real actions on this page are Start Free Trial, Book Live Demo and Talk to our team. Never invent pricing, discounts, payment links, promo codes, guarantees, trial lengths, plan benefits or a named salesperson. If asked for something that does not exist, say plainly what you can confirm.",
  ];

  if (read.stopDiscovery) {
    lines.push(
      "STOP DISCOVERY: do not ask about team size, enquiry volume, tools or further problems now. Acknowledge, confirm in one line, then give the next action.",
    );
  }
  if (read.confirmUnderstanding) {
    lines.push(
      "CONFIRM FIRST: in one short sentence, restate what UMRAIO will actually help with based on what they told you, then give the CTA. No feature lists.",
    );
  }
  if (read.ctaPresented) {
    lines.push(
      "The CTA has already been presented once. Do not re-pitch and do not repeat the buttons unless they ask. Answer their question first.",
    );
  }
  if (read.postCta === "THINKING" || read.postCta === "DEFER") {
    lines.push(
      "They asked for time. Respect it completely: acknowledge, offer to leave it with them, no pressure, no urgency, no follow-up pitch in this reply.",
    );
  }
  if (read.postCta === "SEND_DETAILS") {
    lines.push(
      "They asked for details. Give a concise forwardable summary in this order: current gap → what UMRAIO does → how it helps → next step. Facts only, no ROI, no numbers they did not state.",
    );
  }
  if (read.postCta === "ACCEPT") {
    lines.push("They agreed. Move to the action in one short reply — do not sell again.");
  }
  if (read.postCta === "QUESTION") {
    lines.push("They asked a question after the CTA. Answer that question first, then stop.");
  }

  lines.push(
    "NEVER expose internal scoring, states, psychology or engine names. Never say 'buying intent', 'readiness', 'conversion state' or similar. Speak as a calm senior executive who simply understood them.",
    "Keep Insya-Allah / Alhamdulillah contextual and rare. Never use religion to encourage a purchase.",
    "Safety ladder is absolute: customer safety → opt-out → human handoff → frustration → trust → objection → buying signal → value → CTA → subscription. Commercial intent never overrides safety.",
  );

  return lines.join("\n");
}
