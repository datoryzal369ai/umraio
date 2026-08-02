ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS registration_no text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS website text;

CREATE TABLE public.agency_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL UNIQUE REFERENCES public.agencies(id) ON DELETE CASCADE,
  business_hours jsonb NOT NULL DEFAULT '{
    "mon": {"open": "09:00", "close": "18:00", "closed": false},
    "tue": {"open": "09:00", "close": "18:00", "closed": false},
    "wed": {"open": "09:00", "close": "18:00", "closed": false},
    "thu": {"open": "09:00", "close": "18:00", "closed": false},
    "fri": {"open": "09:00", "close": "18:00", "closed": false},
    "sat": {"open": "10:00", "close": "14:00", "closed": false},
    "sun": {"open": "10:00", "close": "14:00", "closed": true}
  }'::jsonb,
  ai_name text NOT NULL DEFAULT 'UMRAIO',
  ai_personality text NOT NULL DEFAULT 'professional',
  ai_tone text NOT NULL DEFAULT 'warm',
  ai_reply_length text NOT NULL DEFAULT 'balanced',
  ai_language text NOT NULL DEFAULT 'auto',
  ai_custom_instructions text NOT NULL DEFAULT '',
  ai_emoji boolean NOT NULL DEFAULT true,
  kb_strict_mode boolean NOT NULL DEFAULT true,
  kb_auto_use boolean NOT NULL DEFAULT true,
  kb_max_articles integer NOT NULL DEFAULT 4,
  kb_escalate_when_unknown boolean NOT NULL DEFAULT true,
  notify_new_lead boolean NOT NULL DEFAULT true,
  notify_hot_lead boolean NOT NULL DEFAULT true,
  notify_booking boolean NOT NULL DEFAULT true,
  notify_followup_due boolean NOT NULL DEFAULT true,
  notify_daily_summary boolean NOT NULL DEFAULT false,
  notify_email boolean NOT NULL DEFAULT true,
  notify_whatsapp boolean NOT NULL DEFAULT false,
  plan text NOT NULL DEFAULT 'trial',
  plan_status text NOT NULL DEFAULT 'active',
  seats integer NOT NULL DEFAULT 3,
  renews_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_settings TO authenticated;
GRANT ALL ON public.agency_settings TO service_role;

ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members manage settings"
ON public.agency_settings FOR ALL TO authenticated
USING (agency_id = current_agency_id())
WITH CHECK (agency_id = current_agency_id());

CREATE TRIGGER update_agency_settings_updated_at
BEFORE UPDATE ON public.agency_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'API key',
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  last_used_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members view api keys"
ON public.api_keys FOR SELECT TO authenticated
USING (agency_id = current_agency_id());

CREATE POLICY "agency members create api keys"
ON public.api_keys FOR INSERT TO authenticated
WITH CHECK (agency_id = current_agency_id());

CREATE POLICY "agency members update api keys"
ON public.api_keys FOR UPDATE TO authenticated
USING (agency_id = current_agency_id())
WITH CHECK (agency_id = current_agency_id());

CREATE POLICY "owners and admins delete api keys"
ON public.api_keys FOR DELETE TO authenticated
USING (agency_id = current_agency_id()
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));