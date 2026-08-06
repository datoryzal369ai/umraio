ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS package_interest text;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_reason text,
  ADD COLUMN IF NOT EXISTS first_response_ms integer;

CREATE INDEX IF NOT EXISTS conversations_agency_last_message_idx
  ON public.conversations (agency_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at);