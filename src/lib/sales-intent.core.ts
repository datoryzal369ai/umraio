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
