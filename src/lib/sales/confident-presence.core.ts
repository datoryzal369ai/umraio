/**
 * UMRAIO® STEP 3D.2 — ISLAMIC CONFIDENT SALES PRESENCE™
 *
 * A thin, additive presentation layer on top of the existing engines. It does
 * NOT decide sales strategy (Step 3.7 behavioural engine), conversation state
 * (Step 3), conversion state (Step 3C), closing state (Step 3F) or social
 * presence (Step 3D). It only decides HOW confidently RAIŌ should speak:
 * whether to answer "boleh?" directly, whether a customer target should be
 * accepted as a target (never a guarantee), and when Islamic expressions are
 * contextually appropriate.
 *
 * Pure functions only — no I/O, no model calls, no schema changes.
 * Deterministic safety controls (opt-out, human handoff, frustration) always
 * take priority and suppress this layer.
 */

import {
  conversationOptedOut,
  detectFrustration,
  detectHumanRequest,
  maskNegatedSpans,
  normalizeMessage,
} from "./hardening.core";

export type ConfidenceMode =
  | "SUPPRESSED"
  | "REASSURE_AND_EXECUTE"
  | "TARGET_OWNERSHIP"
  | "SMALL_VOLUME_RESPECT"
  | "MOMENTUM"
  | "CELEBRATE_PROGRESS"
  | "STANDARD";

export type CustomerTarget = {
  /** Numeric target the customer stated, e.g. 10. */
  value: number;
  /** Unit as the customer framed it. */
  unit: "jemaah" | "booking" | "lead" | "sales";
  /** Raw phrase that evidenced the target. */
  evidence: string;
};

export type ConfidenceRead = {
  mode: ConfidenceMode;
  /** True when the last customer message is a direct "boleh?" style question. */
  directAnswerRequired: boolean;
  /** Customer-stated target that must be accepted as a target, never guaranteed. */
  target: CustomerTarget | null;
  /** Customer framed a very small volume ("kalau 1 jemaah?"). */
  smallVolume: boolean;
  /** Customer reported positive progress — Alhamdulillah is contextually right. */
  positiveProgress: boolean;
  /** Insya-Allah is contextually appropriate for this reply. */
  allowInsyaAllah: boolean;
  /** Alhamdulillah is contextually appropriate for this reply. */
  allowAlhamdulillah: boolean;
  /** Suppress hedging/disclaimer-first phrasing for this reply. */
  suppressDisclaimerOpening: boolean;
};

/* ------------------------------------------------------------------ */
/* Detection                                                           */
/* ------------------------------------------------------------------ */

const CAPABILITY_ASK =
  /(?<!\b(?:tak|tidak|x|xleh)\s)\b(boleh(\s+(tak|ke|x))?\??|boleh\s+bantu|boleh\s+tolong|can\s+(you|u)\s+(help|do)|can\s+it|is\s+it\s+possible|macam\s+mana\s+nak|camne\s+nak|how\s+(do|can)\s+i|how\s+to)\b/i;

const MOMENTUM_ASK =
  /\b(nak\s+mula|nak\s+start|macam\s+mana\s+nak\s+mula|how\s+do\s+we\s+start|where\s+do\s+we\s+start|let'?s\s+start|ok\s+lah?\s+mula)\b/i;

const POSITIVE_PROGRESS =
  /\b(sales\s+(dah|sudah)\s+(mula\s+)?naik|dah\s+mula\s+naik|dah\s+ada\s+booking|makin\s+baik|improving|dah\s+improve|business\s+is\s+picking\s+up|alhamdulillah)\b/i;

const SMALL_VOLUME =
  /\b(kalau\s+(cuma\s+|just\s+)?(1|satu|dua|2)\s+(jemaah|lead|enquiry|customer|orang)|only\s+(1|one|2|two)\s+(lead|enquiry|customer|pilgrim)|enquiry\s+sikit|lead\s+sikit|tak\s+banyak\s+enquiry|very\s+few\s+leads?)\b/i;

const TARGET_PATTERNS: Array<{ re: RegExp; unit: CustomerTarget["unit"] }> = [
  { re: /(\d{1,4})\s*(?:orang\s+)?jemaah/i, unit: "jemaah" },
  { re: /(\d{1,4})\s*(?:booking|tempahan)/i, unit: "booking" },
  { re: /(\d{1,4})\s*(?:lead|enquiry|enquiries)/i, unit: "lead" },
  { re: /(?:sales|jualan)[^\d]{0,20}(\d{1,6})/i, unit: "sales" },
];

const TARGET_FRAMING =
  /\b(nak|mahu|target|sasaran|sekurang[-\s]?(kurang(nya)?|2\s*nya|2)|at\s+least|want\s+to\s+close|nak\s+close|minimum|aim)\b/i;

/** A number the customer frames as something they want to achieve. */
export function detectCustomerTarget(text: string | null | undefined): CustomerTarget | null {
  if (!text) return null;
  const masked = normalizeMessage(text);
  if (!TARGET_FRAMING.test(masked)) return null;
  for (const p of TARGET_PATTERNS) {
    const m = p.re.exec(masked);
    const value = m?.[1] ? Number(m[1]) : NaN;
    if (Number.isFinite(value) && value > 0) {
      return { value, unit: p.unit, evidence: m![0].trim() };
    }
  }
  return null;
}

export function detectCapabilityAsk(text: string | null | undefined): boolean {
  if (!text) return false;
  return CAPABILITY_ASK.test(normalizeMessage(text));
}

export function detectMomentumRequest(text: string | null | undefined): boolean {
  if (!text) return false;
  return MOMENTUM_ASK.test(normalizeMessage(text));
}

export function detectSmallVolumeFraming(text: string | null | undefined): boolean {
  if (!text) return false;
  return SMALL_VOLUME.test(normalizeMessage(text));
}

export function detectPositiveProgress(text: string | null | undefined): boolean {
  if (!text) return false;
  return POSITIVE_PROGRESS.test(maskNegatedSpans(normalizeMessage(text)));
}

/* ------------------------------------------------------------------ */
/* Read                                                                */
/* ------------------------------------------------------------------ */

export function buildConfidenceRead(input: {
  /** Customer messages, oldest first. */
  customerMessages: string[];
  /** Optional override when the caller already resolved safety state. */
  safetySuppressed?: boolean;
}): ConfidenceRead {
  const msgs = input.customerMessages.filter(Boolean);
  const last = msgs.length ? msgs[msgs.length - 1]! : null;

  const suppressed =
    input.safetySuppressed === true ||
    conversationOptedOut(msgs).optedOut ||
    detectHumanRequest(last) ||
    detectFrustration(last).length > 0;

  const target = (() => {
    for (let i = msgs.length - 1; i >= 0; i -= 1) {
      const t = detectCustomerTarget(msgs[i]);
      if (t) return t;
    }
    return null;
  })();

  const directAnswerRequired = !suppressed && detectCapabilityAsk(last);
  const smallVolume = !suppressed && detectSmallVolumeFraming(last);
  const positiveProgress = !suppressed && detectPositiveProgress(last);
  const momentum = !suppressed && detectMomentumRequest(last);
  const targetJustStated = !suppressed && detectCustomerTarget(last) !== null;

  const mode: ConfidenceMode = suppressed
    ? "SUPPRESSED"
    : positiveProgress
      ? "CELEBRATE_PROGRESS"
      : targetJustStated
        ? "TARGET_OWNERSHIP"
        : smallVolume
          ? "SMALL_VOLUME_RESPECT"
          : momentum
            ? "MOMENTUM"
            : directAnswerRequired
              ? "REASSURE_AND_EXECUTE"
              : "STANDARD";

  return {
    mode,
    directAnswerRequired,
    target,
    smallVolume,
    positiveProgress,
    allowInsyaAllah:
      !suppressed &&
      (directAnswerRequired || targetJustStated || smallVolume || momentum || positiveProgress),
    allowAlhamdulillah: !suppressed && positiveProgress,
    suppressDisclaimerOpening: !suppressed,
  };
}

/* ------------------------------------------------------------------ */
/* Prompt instruction                                                  */
/* ------------------------------------------------------------------ */

const BASE = [
  "CONFIDENT SALES PRESENCE (Islamic adab, commercial honesty):",
  "- Speak like an experienced Malaysian business executive who owns the execution: 'Saya boleh bantu susun...', 'Kita boleh mula dengan...', 'Daripada apa yang dikongsikan, saya nampak...'. Avoid weak phrasing ('mungkin saya boleh', 'saya cuba kalau boleh', 'tidak pasti') unless the uncertainty is genuinely material.",
  "- Structure commercial answers as: ACKNOWLEDGE -> CONFIDENT ANSWER -> VALUE/EXECUTION -> ONE next step. Never open with two disclaimers and a question.",
  "- Never expose internal analysis labels (price sensitive, hesitation, behavioural state). Express the understanding in human words instead.",
  "- Do not re-ask anything already answered: check known facts and history first, ask only what is genuinely missing.",
  "- Honesty is absolute: no guaranteed sales, pilgrims, conversion rates, ROI, invented figures, fake urgency, fake testimonials or religious pressure. You remain an AI and never claim to be human.",
].join("\n");

export function confidentPresenceInstruction(read: ConfidenceRead): string {
  if (read.mode === "SUPPRESSED") {
    return "CONFIDENT SALES PRESENCE: suppressed for this turn. Customer control, human handoff or frustration takes priority — respond plainly, no religious expressions, no selling, no new questions.";
  }

  const lines = [BASE];

  lines.push(
    "- ISLAMIC EXPRESSIONS: use 'Insya-Allah' only when offering help, committing effort, accepting a target, proposing execution or encouraging progress — never mechanically, never in every sentence, never as a guarantee and never when reporting factual data, status, pricing or handling safety. 'Alhamdulillah' only when the customer reports genuine good news.",
  );

  if (!read.allowInsyaAllah) {
    lines.push(
      "- For this turn no religious expression is required. Do not add 'Insya-Allah' or 'Alhamdulillah' as filler.",
    );
  }

  if (read.suppressDisclaimerOpening) {
    lines.push(
      "- Do NOT lead with what you cannot guarantee. Phrases like 'saya tak boleh jamin', 'tiada jaminan', 'AI tidak boleh' are only allowed when a specific legal, safety or factual clarification genuinely requires it — not merely because the customer asked for sales or closing help.",
    );
  }

  switch (read.mode) {
    case "REASSURE_AND_EXECUTE":
      lines.push(
        "- The customer asked whether you can help. Answer directly and positively FIRST ('Boleh, Insya-Allah.' / 'Yes, I can help with that.'), state concretely what you can do, then ask at most ONE relevant question.",
      );
      break;
    case "TARGET_OWNERSHIP":
      lines.push(
        `- The customer stated a target (${read.target ? `${read.target.value} ${read.target.unit}` : "stated target"}). Accept it as a shared TARGET, never as a guaranteed outcome: acknowledge it, commit to effort ('kita jadikan itu sebagai target', 'Insya-Allah kita usahakan'), explain the execution you can support (respond, understand, qualify, build trust, handle objection, recommend, quotation, follow-up, close — only the relevant parts), then ONE question. Never say the number is confirmed or guaranteed, and never invent a conversion rate.`,
      );
      break;
    case "SMALL_VOLUME_RESPECT":
      lines.push(
        "- The customer framed a very small volume. Never dismiss it. Affirm that even one genuinely interested lead deserves consistent handling, explain how you help keep that follow-up consistent and contextual, then continue naturally with the existing conversion state.",
      );
      break;
    case "MOMENTUM":
      lines.push(
        "- The customer is asking how to start. Do not reset to discovery. Confirm confidently, propose the highest-impact starting point (enquiry response and follow-up), then move to the existing available next step.",
      );
      break;
    case "CELEBRATE_PROGRESS":
      lines.push(
        "- The customer reported real progress. Open with a sincere 'Alhamdulillah' acknowledgement, then discuss how to keep the momentum consistent. No exaggeration, no invented figures.",
      );
      break;
    default:
      break;
  }

  return lines.join("\n");
}
