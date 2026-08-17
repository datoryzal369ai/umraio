-- UMRAIO Phase 2: revenue conversion foundation (additive only)

-- 1. Agency-approved deposit rule + quotation validity
ALTER TABLE public.agency_settings
  ADD COLUMN IF NOT EXISTS deposit_rule text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS deposit_fixed_myr numeric,
  ADD COLUMN IF NOT EXISTS deposit_percent numeric,
  ADD COLUMN IF NOT EXISTS quotation_validity_days integer NOT NULL DEFAULT 7;

ALTER TABLE public.agency_settings
  DROP CONSTRAINT IF EXISTS agency_settings_deposit_rule_check;
ALTER TABLE public.agency_settings
  ADD CONSTRAINT agency_settings_deposit_rule_check
  CHECK (deposit_rule IN ('none','fixed','percent'));

-- 2. Structured quotation entity
CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  quotation_number text NOT NULL,
  public_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'MYR',
  customer_name text,
  customer_phone text,
  travel_date date,
  travel_month text,
  number_of_pilgrims integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  deposit_rule text NOT NULL DEFAULT 'none',
  deposit_amount numeric,
  balance_amount numeric,
  package_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  CONSTRAINT quotations_status_check CHECK (status IN (
    'draft','ready','sent','viewed','discussing','accepted',
    'deposit_pending','deposit_paid','booked','rejected','expired','cancelled'
  )),
  CONSTRAINT quotations_number_unique UNIQUE (agency_id, quotation_number),
  CONSTRAINT quotations_token_unique UNIQUE (public_token)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agency members manage quotations" ON public.quotations;
CREATE POLICY "agency members manage quotations" ON public.quotations
  FOR ALL TO authenticated
  USING (agency_id = private.current_agency_id())
  WITH CHECK (agency_id = private.current_agency_id());

CREATE INDEX IF NOT EXISTS quotations_agency_created_idx ON public.quotations (agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quotations_lead_idx ON public.quotations (lead_id);

DROP TRIGGER IF EXISTS quotations_updated_at ON public.quotations;
CREATE TRIGGER quotations_updated_at BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Auditable conversion events
CREATE TABLE IF NOT EXISTS public.conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  stage text NOT NULL,
  actor text NOT NULL DEFAULT 'ai',
  reason text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.conversion_events TO authenticated;
GRANT ALL ON public.conversion_events TO service_role;
ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agency members read conversion events" ON public.conversion_events;
CREATE POLICY "agency members read conversion events" ON public.conversion_events
  FOR SELECT TO authenticated
  USING (agency_id = private.current_agency_id());
CREATE INDEX IF NOT EXISTS conversion_events_agency_idx ON public.conversion_events (agency_id, created_at DESC);

-- 4. Follow-up dispatch fields (extend existing infrastructure)
ALTER TABLE public.followup_jobs
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS skip_reason text,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS context jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 5. Booking foundation linked to an accepted quotation
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deposit_amount_myr numeric,
  ADD COLUMN IF NOT EXISTS balance_myr numeric,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS bookings_updated_at ON public.bookings;
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();