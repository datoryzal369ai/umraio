/**
 * UMRAIO® — deterministic Umrah intent anchoring (customer sales context).
 *
 * Pure, dependency-free helpers used by the sales agent to make sure the LATEST
 * customer message decides the active business context. Without this, a long
 * conversation containing unrelated topics (corporate/brand/website chatter)
 * can anchor the model on the previous topic and hijack a clear Umrah booking
 * enquiry.
 */

export type UmrahIntent =
  | "UMRAH_PACKAGE_PURCHASE"
  | "UMRAH_PACKAGE_ENQUIRY"
  | "UMRAH_PACKAGE_PRICE_ENQUIRY"
  | "UMRAH_TRAVEL_ENQUIRY"
  | "BOOKING_INTENT"
  | null;

const PACKAGE = /\b(pakej|pakej[- ]?umrah|package|packages)\b/i;
const UMRAH = /\b(umrah|umroh|haji|makkah|mekah|madinah|ziarah)\b/i;
const BOOK =
  /\b(tempah|tempahan|booking|book|nak\s+daftar|daftar|reserve|reservation|deposit|proceed|register)\b/i;
const PRICE = /\b(harga|berapa|price|cost|kos|bajet|budget|rm\s?\d|quotation|sebut\s?harga)\b/i;
const TRAVEL = /\b(nak\s+pergi|nak\s+ke|travel|berangkat|pergi)\b/i;
const PAX = /\b(\d+\s*(orang|pax|jemaah)|keluarga|family|berdua|sekeluarga)\b/i;

/**
 * Classify the customer's current sales intent from the latest message only.
 * Returns null when the message carries no Umrah/booking signal.
 */
export function detectUmrahIntent(text: string | null | undefined): UmrahIntent {
  if (!text) return null;
  const t = text.trim();
  if (!t) return null;

  const pkg = PACKAGE.test(t);
  const umrah = UMRAH.test(t);
  const book = BOOK.test(t);
  const price = PRICE.test(t);

  if (pkg && price) return "UMRAH_PACKAGE_PRICE_ENQUIRY";
  if ((pkg || umrah) && book) return "UMRAH_PACKAGE_PURCHASE";
  if (book) return "BOOKING_INTENT";
  if (pkg) return "UMRAH_PACKAGE_ENQUIRY";
  if (umrah && (price || PAX.test(t))) return "UMRAH_PACKAGE_ENQUIRY";
  if (umrah && TRAVEL.test(t)) return "UMRAH_TRAVEL_ENQUIRY";
  if (umrah) return "UMRAH_TRAVEL_ENQUIRY";
  return null;
}

/**
 * Standing domain isolation rules for customer conversations. UMRAIO's customer
 * channel is an Umrah agency sales context only — never a website/brand/content
 * audit, corporate or developer assistant, whatever earlier turns discussed.
 */
export const DOMAIN_ISOLATION_INSTRUCTION = [
  "DOMAIN ISOLATION (highest priority, non-negotiable): this conversation is an Umrah agency customer-sales conversation. Your only domain is Umrah enquiries, package information, qualification, recommendations, quotations, booking assistance, follow-up and agency information.",
  "You are NEVER a website auditor, domain/brand consultant, content or marketing auditor, SEO reviewer, corporate assistant, developer or debugging assistant in this channel. Never offer to review a homepage, domain name, brand credibility, marketing copy, screenshots or corporate profiles, and never ask the customer for page text or screenshots.",
  "Do not volunteer corporate/company/domain topics (parent company, brand architecture, websites, internal technology). If the customer asks about UMRAIO itself, answer briefly from global UMRAIO knowledge and return to the Umrah enquiry.",
].join("\n");

/**
 * Anchor block appended to the system prompt so the LATEST customer message —
 * not an older unrelated topic — decides what is answered.
 */
export function intentAnchorInstruction(
  latestCustomerMessage: string | null | undefined,
  /** Already-redacted rendering of the same message (suppression-safe). */
  sanitizedLatestCustomerMessage?: string | null,
): string {
  const latest = (latestCustomerMessage ?? "").trim();
  // Intent is still classified from the authoritative raw message, but only the
  // sanitized text is ever embedded in the system prompt.
  const intent = detectUmrahIntent(latest);
  const embedded = ((sanitizedLatestCustomerMessage ?? latest) || "").trim();
  const lines = [
    "CURRENT TURN ANCHOR: the most recent customer message is the authoritative intent for this reply. Earlier messages are background only and must never override it. If an earlier topic is unrelated to the current message, ignore it completely.",
    embedded ? `Latest customer message (authoritative): "${embedded.slice(0, 500)}"` : null,
  ];
  if (intent) {
    lines.push(
      `Detected intent: ${intent}. Stay strictly inside the Umrah sales context and respond to THIS intent.`,
      "Required behaviour: acknowledge the Umrah enquiry, use search_knowledge / recommend_packages for any factual claim, and ask the next useful qualifying question (travel month, number of pilgrims, budget per person, hotel preference). Never invent prices, dates, hotels, flights, visa status, availability or booking confirmation.",
      'Example shape: "Baik. Saya boleh bantu semak pakej Umrah yang sesuai. Nak berangkat bulan bila dan berapa orang yang akan pergi?"',
    );
  } else if (latest) {
    lines.push(
      "No clear Umrah intent detected in this message. Do not confidently answer an unrelated topic and do not continue a previous unrelated topic — ask a short clarifying question that brings the conversation back to the customer's Umrah needs.",
    );
  }
  return lines.filter(Boolean).join("\n");
}

/* ------------------------------------------------------------------ *
 * Deterministic conversion signals (Phase 2).
 * Pure pattern detection — no model involvement, no arithmetic.
 * ------------------------------------------------------------------ */

export type ObjectionType =
  | "PRICE"
  | "TIMING"
  | "TRUST"
  | "COMPARISON"
  | "FAMILY_DECISION"
  | "DOCUMENTATION";

const OBJECTION_PATTERNS: Array<{ type: ObjectionType; re: RegExp }> = [
  { type: "PRICE", re: /\b(mahal|expensive|too\s+much|tak\s+mampu|cannot\s+afford|murah\s+lagi|discount|diskaun)\b/i },
  { type: "TIMING", re: /\b(nanti|later|next\s+year|tahun\s+depan|belum\s+sedia|not\s+ready|fikir\s+dulu|think\s+about)\b/i },
  { type: "TRUST", re: /\b(scam|penipu|selamat\s+ke|trusted|licence|lesen|motac|review|ulasan)\b/i },
  { type: "COMPARISON", re: /\b(agency\s+lain|other\s+agency|banding|compare|competitor|tempat\s+lain)\b/i },
  { type: "FAMILY_DECISION", re: /\b(bincang|discuss|tanya\s+(suami|isteri|family|keluarga)|ask\s+my\s+(husband|wife|family))\b/i },
  { type: "DOCUMENTATION", re: /\b(passport|pasport|visa|vaksin|vaccine|dokumen|document)\b.*\b(tiada|belum|expired|tak\s+ada|no)\b/i },
];

/** Objections present in a single customer message. */
export function detectObjections(text: string | null | undefined): ObjectionType[] {
  if (!text) return [];
  return OBJECTION_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.type);
}

export type BuyingSignal =
  | "READY_TO_BOOK"
  | "ASKED_FOR_QUOTATION"
  | "ASKED_HOW_TO_PAY"
  | "CONFIRMED_PAX"
  | "CONFIRMED_MONTH"
  | "CHOSE_PACKAGE";

const SIGNAL_PATTERNS: Array<{ signal: BuyingSignal; re: RegExp }> = [
  { signal: "READY_TO_BOOK", re: /\b(nak\s+(tempah|book|daftar)|confirm|saya\s+ambil|i'?ll\s+take|proceed|go\s+ahead)\b/i },
  { signal: "ASKED_FOR_QUOTATION", re: /\b(quotation|sebut\s?harga|quote|invois|invoice|breakdown)\b/i },
  { signal: "ASKED_HOW_TO_PAY", re: /\b(deposit|bayar|payment|transfer|instal(l)?ment|ansuran|how\s+to\s+pay)\b/i },
  { signal: "CONFIRMED_PAX", re: /\b\d+\s*(orang|pax|jemaah|people|person)\b/i },
  { signal: "CONFIRMED_MONTH", re: /\b(jan(uari)?|feb(ruari|ruary)?|mac|march|apr(il)?|mei|may|jun(e)?|jul(ai|y)?|ogos|august|sept(ember)?|okt(ober)?|october|nov(ember)?|dis(ember)?|december|ramadan|ramadhan|syawal|cuti\s+sekolah)\b/i },
  { signal: "CHOSE_PACKAGE", re: /\b(pakej\s+(ini|tu|no|nombor)|this\s+package|the\s+\d+\s*star|ambil\s+yang)\b/i },
];

export function detectBuyingSignals(text: string | null | undefined): BuyingSignal[] {
  if (!text) return [];
  return SIGNAL_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.signal);
}

/**
 * Deterministic readiness for a formal quotation. The model may only issue a
 * quotation after the customer has picked a package and stated pilgrim count;
 * this helper keeps that judgement out of the model where possible.
 */
export function isQuotationReady(input: {
  packageInterest?: string | null;
  pax?: number | null;
  preferredMonth?: string | null;
  latestMessage?: string | null;
}): boolean {
  const signals = detectBuyingSignals(input.latestMessage);
  const hasPackage = Boolean(input.packageInterest) || signals.includes("CHOSE_PACKAGE");
  const hasPax = Boolean(input.pax && input.pax > 0) || signals.includes("CONFIRMED_PAX");
  const intentful =
    signals.includes("READY_TO_BOOK") ||
    signals.includes("ASKED_FOR_QUOTATION") ||
    signals.includes("ASKED_HOW_TO_PAY") ||
    Boolean(input.preferredMonth);
  return hasPackage && hasPax && intentful;
}

/** Short, auditable coaching line appended to the system prompt. */
export function conversionSignalInstruction(text: string | null | undefined): string | null {
  const objections = detectObjections(text);
  const signals = detectBuyingSignals(text);
  if (!objections.length && !signals.length) return null;
  const parts: string[] = [];
  if (signals.length) {
    parts.push(
      `BUYING SIGNALS DETECTED (${signals.join(", ")}): move the conversation forward decisively — confirm the package and pilgrim count, then issue a quotation with create_quotation.`,
    );
  }
  if (objections.length) {
    parts.push(
      `OBJECTIONS DETECTED (${objections.join(", ")}): acknowledge the concern in one sentence, answer it with verified facts only, then re-propose the next step. Never argue, never invent reassurance, never promise a discount.`,
    );
  }
  return parts.join("\n");
}
