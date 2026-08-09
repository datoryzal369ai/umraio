# WhatsApp Post-Recovery Diagnostic (no changes made)

## A. Current state

| Item | Value |
|---|---|
| 1. Conversation `ai_enabled` | **false** (unchanged since the 07:18 escalation) |
| 2. Connection `auto_reply` | **true** |
| 3. Conversation status | `open`, `escalated_at` = 09 Aug 07:18:47 UTC |
| 4. Webhook received both new messages | **YES** |
| 5. Both messages persisted | **YES** ("Salam" 09:56:55 UTC / 17:56 MYT, "Helo" 09:57:12 UTC / 17:57 MYT) |
| 6. AI Gateway called | **NO** |
| 7. AI Gateway success | N/A — never called |
| 8. Meta send-message API attempted | **NO** |
| 9. Outgoing AI message created | **NO** |
| 10. Blocking gate | `ai_enabled === false` on the conversation |

## B. Evidence

- `conversations` row for external_id `60167559991`: `ai_enabled = false`, `escalation_reason = "Pelanggan bertanya apakah UMRAIO; pangkalan pengetahuan kosong…"`, `last_message_at = 2026-08-09 09:57:11Z`.
- `messages`: customer rows "Salam" (09:56:55Z) and "Helo" (09:57:12Z) stored; no `ai` sender row after 07:18:53Z.
- `activity_log`: "Inbound WhatsApp message received" at 09:56:55Z and 09:57:12Z; no "AI WhatsApp Executive replied" entries.
- `whatsapp_configs`: connected number `+60 11-1063 9996`, phone_number_id `1232996883231810`, token present, `auto_reply = true`, `last_inbound_at = 09:57:11Z` (proves the webhook ran and wrote through).
- AI Gateway logs 09:20Z–10:01Z: **0 requests** — confirms the AI step was never entered, so this is not a credit/model failure.

## C. Exact reply-blocking gate

In `src/routes/api/public/whatsapp.ts`, the condition `if (aiEnabled && config.auto_reply && config.access_token)` evaluates false because `aiEnabled` is false. The pipeline is healthy through ingestion (webhook → agency match → lead → conversation → message persisted); only the auto-reply branch is skipped, exactly as designed for human-takeover mode. Diagnosis is identical to the previous one — nothing has changed or regressed.

## D. Minimum safe fix

Re-enable AI on that one conversation: open **Conversations → the +6016-755 9991 thread → AI toggle ON** (or set `ai_enabled = true` on conversation `a3e7cd05-1b85-4c9d-88e2-7464dfc0ac5b`). The next inbound message will then be auto-answered.

To stop it recurring, add agency facts to the Knowledge Base ("What is UMRAIO", agency profile, packages, visa/hotel info) — the escalation was triggered by an empty knowledge base.

## E. Fix type

**Data / admin action.** No code change, no Meta configuration change, no token or webhook change required.

## Optional follow-up (only if you want it, not part of this diagnostic)

A product decision worth considering later: auto-clear escalation after a human replies, or auto-resume AI after N hours of no human response, so a single escalation does not silently mute the thread indefinitely.
