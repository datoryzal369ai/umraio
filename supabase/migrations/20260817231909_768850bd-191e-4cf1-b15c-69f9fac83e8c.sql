ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS do_not_contact boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS do_not_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS do_not_contact_reason text,
  ADD COLUMN IF NOT EXISTS total_budget_myr numeric,
  ADD COLUMN IF NOT EXISTS budget_basis text,
  ADD COLUMN IF NOT EXISTS traveller_needs text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS leads_do_not_contact_idx ON public.leads (agency_id, do_not_contact);