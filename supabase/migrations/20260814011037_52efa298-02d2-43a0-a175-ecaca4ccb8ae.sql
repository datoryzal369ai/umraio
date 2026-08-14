CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  category text NOT NULL CHECK (category IN ('customer_reply','internal_operation','ai_task')),
  counts_against text NOT NULL DEFAULT 'none' CHECK (counts_against IN ('ai_replies','ai_tasks','none')),
  task_type text,
  operation text,
  source text,
  worker text,
  model text,
  provider text,
  correlation_id text,
  success boolean NOT NULL DEFAULT true,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX usage_events_event_key_uidx ON public.usage_events (event_key);
CREATE INDEX usage_events_agency_time_idx ON public.usage_events (agency_id, occurred_at DESC);
CREATE INDEX usage_events_agency_quota_idx ON public.usage_events (agency_id, counts_against, occurred_at DESC);

GRANT SELECT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members read their usage"
ON public.usage_events FOR SELECT TO authenticated
USING (agency_id = private.current_agency_id());

CREATE TABLE public.agency_entitlements (
  agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  effective_plan text NOT NULL DEFAULT 'founding',
  requested_plan text,
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'system',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agency_entitlements TO authenticated;
GRANT ALL ON public.agency_entitlements TO service_role;
ALTER TABLE public.agency_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members read their entitlement"
ON public.agency_entitlements FOR SELECT TO authenticated
USING (agency_id = private.current_agency_id());

CREATE TRIGGER agency_entitlements_updated_at
BEFORE UPDATE ON public.agency_entitlements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.public_demo_hits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  fingerprint text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX public_demo_hits_ip_time_idx ON public.public_demo_hits (ip_hash, created_at DESC);
CREATE INDEX public_demo_hits_time_idx ON public.public_demo_hits (created_at DESC);
CREATE INDEX public_demo_hits_fingerprint_idx ON public.public_demo_hits (fingerprint, created_at DESC);

GRANT ALL ON public.public_demo_hits TO service_role;
ALTER TABLE public.public_demo_hits ENABLE ROW LEVEL SECURITY;
