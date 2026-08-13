ALTER TABLE public.agency_settings
  ADD COLUMN IF NOT EXISTS autonomy_mode text NOT NULL DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS autonomy_cooldown_minutes integer NOT NULL DEFAULT 15;

ALTER TABLE public.agency_settings
  DROP CONSTRAINT IF EXISTS agency_settings_autonomy_mode_check;
ALTER TABLE public.agency_settings
  ADD CONSTRAINT agency_settings_autonomy_mode_check
  CHECK (autonomy_mode IN ('off','assisted','autonomous'));

ALTER TABLE public.agency_settings
  DROP CONSTRAINT IF EXISTS agency_settings_autonomy_cooldown_check;
ALTER TABLE public.agency_settings
  ADD CONSTRAINT agency_settings_autonomy_cooldown_check
  CHECK (autonomy_cooldown_minutes BETWEEN 5 AND 1440);

CREATE TABLE IF NOT EXISTS public.executive_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  correlation_id text,
  trigger_type text NOT NULL CHECK (trigger_type IN ('manual','scheduled_autonomous')),
  autonomy_mode text NOT NULL,
  status text NOT NULL CHECK (status IN ('running','completed','failed','skipped')),
  skipped_reason text,
  outcome text,
  error text,
  opportunities_considered integer NOT NULL DEFAULT 0,
  actions_attempted integer NOT NULL DEFAULT 0,
  actions_executed integer NOT NULL DEFAULT 0,
  actions_rejected integer NOT NULL DEFAULT 0,
  actions_awaiting_approval integer NOT NULL DEFAULT 0,
  actions_failed integer NOT NULL DEFAULT 0,
  limit_reached boolean NOT NULL DEFAULT false,
  decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.executive_cycles TO authenticated;
GRANT ALL ON public.executive_cycles TO service_role;

ALTER TABLE public.executive_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency members view executive cycles" ON public.executive_cycles;
CREATE POLICY "agency members view executive cycles"
  ON public.executive_cycles FOR SELECT TO authenticated
  USING (agency_id = private.current_agency_id());

CREATE UNIQUE INDEX IF NOT EXISTS executive_cycles_one_running_per_agency
  ON public.executive_cycles (agency_id) WHERE status = 'running';

CREATE INDEX IF NOT EXISTS executive_cycles_agency_started_idx
  ON public.executive_cycles (agency_id, started_at DESC);