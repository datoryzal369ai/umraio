ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS detected_language text,
  ADD COLUMN IF NOT EXISTS language_confidence numeric,
  ADD COLUMN IF NOT EXISTS conversational_style text;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS conversation_state text,
  ADD COLUMN IF NOT EXISTS state_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS intelligence jsonb NOT NULL DEFAULT '{}'::jsonb;