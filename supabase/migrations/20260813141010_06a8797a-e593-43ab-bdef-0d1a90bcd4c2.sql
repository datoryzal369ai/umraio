CREATE TABLE public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  intent text not null check (intent in ('trial','demo','human')),
  full_name text,
  agency_name text,
  email text not null,
  whatsapp text,
  agency_size text,
  monthly_enquiries text,
  snapshot jsonb not null default '{}'::jsonb,
  source text not null default 'meet_executive'
);

CREATE UNIQUE INDEX demo_requests_email_intent_key ON public.demo_requests (lower(email), intent);

GRANT ALL ON public.demo_requests TO service_role;

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;