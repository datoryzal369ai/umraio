ALTER TABLE public.whatsapp_configs
  ADD COLUMN IF NOT EXISTS has_access_token boolean
  GENERATED ALWAYS AS (access_token IS NOT NULL AND length(btrim(access_token)) > 0) STORED;

REVOKE SELECT ON public.whatsapp_configs FROM authenticated;
REVOKE ALL ON public.whatsapp_configs FROM anon;

GRANT SELECT (
  id, agency_id, display_phone_number, phone_number_id, business_account_id,
  verify_token, is_connected, auto_reply, last_inbound_at, has_access_token,
  created_at, updated_at
) ON public.whatsapp_configs TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.whatsapp_configs TO authenticated;
GRANT ALL ON public.whatsapp_configs TO service_role;