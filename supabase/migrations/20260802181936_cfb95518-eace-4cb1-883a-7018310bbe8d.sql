CREATE TABLE public.whatsapp_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  display_phone_number text,
  phone_number_id text UNIQUE,
  business_account_id text,
  access_token text,
  verify_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_connected boolean NOT NULL DEFAULT false,
  auto_reply boolean NOT NULL DEFAULT true,
  last_inbound_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_configs TO authenticated;
GRANT ALL ON public.whatsapp_configs TO service_role;

ALTER TABLE public.whatsapp_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members manage whatsapp config"
ON public.whatsapp_configs FOR ALL TO authenticated
USING (agency_id = current_agency_id())
WITH CHECK (agency_id = current_agency_id());

CREATE TRIGGER update_whatsapp_configs_updated_at
BEFORE UPDATE ON public.whatsapp_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();