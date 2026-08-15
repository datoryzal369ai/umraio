/**
 * UMRAIO® — conversation-level topic suppression + history sanitization.
 *
 * Pure, dependency-free helpers. Scope is strictly the CURRENT conversation
 * context window sent to the model: no persistence, no claim of deleting any
 * global/permanent memory.
 */

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

/** Phrases a customer uses to ask UMRAIO to stop discussing something. */
const DIRECTIVE_PATTERNS: RegExp[] = [
  /jangan\s+(?:bercakap|cakap|bincang|berbincang|sebut|ungkit|mention)\s*(?:tentang|pasal|mengenai|about)?\s*(.+?)(?:\s+lagi)?\s*[.!?]*$/i,
  /(?:remove|padam|buang|delete)\s+(.+?)\s+(?:dalam|dari|daripada|from)\s+(?:memori|memory|ingatan|sistem|system|context)\b.*$/i,
  /(?:lupakan|forget)\s+(?:about\s+)?(.+?)\s*[.!?]*$/i,
  /(?:stop|don'?t|do\s+not)\s+(?:talking|talk|speaking|speak|mentioning|mention)\s+(?:about\s+)?(.+?)\s*[.!?]*$/i,
  /no\s+more\s+(?:talk\s+(?:about|of)\s+)?(.+?)\s*[.!?]*$/i,
];

const STOP_WORDS = new Set([
  "itu",
  "ini",
  "tu",
  "ni",
  "sekarang",
  "lagi",
  "topic",
  "topik",
  "perkara",
  "benda",
  "that",
  "this",
  "it",
  "now",
  "anymore",
  "please",
  "tolong",
]);

function cleanTopic(raw: string | undefined): string | null {
  if (!raw) return null;
  let t = raw
    .replace(/["'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:tentang|pasal|mengenai|about|the)\s+/i, "")
    .replace(/\s+(?:sekarang|now|lagi|anymore|please|tolong)$/i, "")
    .replace(/[.,;:!?]+$/, "")
    .trim();
  if (!t) return null;
  if (t.length > 60) t = t.slice(0, 60).trim();
  if (t.length < 3) return null;
  if (STOP_WORDS.has(t.toLowerCase())) return null;
  return t;
}

/** Extract the topic a single customer message asks to suppress, if any. */
export function detectSuppressionDirective(text: string | null | undefined): string | null {
  if (!text) return null;
  const line = text.trim();
  if (!line) return null;
  for (const pattern of DIRECTIVE_PATTERNS) {
    const match = pattern.exec(line);
    if (match) {
      const topic = cleanTopic(match[1]);
      if (topic) return topic;
    }
  }
  return null;
}

/** All topics suppressed so far in this conversation (customer messages only). */
export function collectSuppressedTopics(
  customerMessages: Array<string | null | undefined>,
): string[] {
  const topics: string[] = [];
  for (const body of customerMessages) {
    const topic = detectSuppressionDirective(body);
    if (topic && !topics.some((t) => t.toLowerCase() === topic.toLowerCase())) topics.push(topic);
  }
  return topics;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const REDACTION = "[topik disekat]";

/**
 * Remove suppressed topics from the model's context window.
 *
 * - The directive turns themselves are kept (so the model sees the request) but
 *   the term inside them is redacted.
 * - Older turns whose content is only about the suppressed topic are dropped.
 * - All other turns keep their content with the term redacted, so genuine Umrah
 *   context (pax, month, budget, packages, quotes, booking) is fully preserved.
 */
export function sanitizeHistory(
  history: ConversationTurn[],
  suppressedTopics: string[],
): ConversationTurn[] {
  if (!suppressedTopics.length) return history;
  const matchers = suppressedTopics.map((t) => new RegExp(escapeRegExp(t), "gi"));

  const out: ConversationTurn[] = [];
  for (const turn of history) {
    const mentions = matchers.some((re) => {
      re.lastIndex = 0;
      return re.test(turn.content);
    });
    if (!mentions) {
      out.push(turn);
      continue;
    }
    let redacted = turn.content;
    for (const re of matchers) redacted = redacted.replace(re, REDACTION);
    const withoutRedaction = redacted.split(REDACTION).join(" ").replace(/\s+/g, " ").trim();
    // Drop turns that carried nothing but the suppressed topic.
    if (withoutRedaction.length < 12) continue;
    out.push({ ...turn, content: redacted });
  }
  return out;
}

/** System-prompt block enforcing suppression behaviour for this conversation. */
export function suppressionInstruction(suppressedTopics: string[]): string | null {
  if (!suppressedTopics.length) return null;
  return [
    `TOPIC SUPPRESSION (this conversation only): the customer explicitly asked you to stop discussing ${suppressedTopics.length} topic(s). Those topics have been removed from your context window.`,
    "Absolute rules: do NOT repeat, name, spell out or hint at the suppressed topic; do NOT make it the subject of your reply; do NOT ask whether the customer meant it; do NOT continue that topic in any later turn of this conversation.",
    "If the customer asks you to remove or forget it, acknowledge briefly and truthfully about THIS conversation only — e.g. \"Baik. Saya tidak akan gunakan topik tersebut dalam perbualan ini. Kita teruskan dengan urusan Umrah.\" Never claim it was deleted from any system, database or permanent memory.",
    "After acknowledging (one short sentence), return immediately to the Umrah business context and continue helping with the customer's Umrah needs.",
  ].join("\n");
}
