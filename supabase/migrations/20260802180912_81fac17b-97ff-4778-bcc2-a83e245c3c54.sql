ALTER TYPE public.lead_stage ADD VALUE IF NOT EXISTS 'negotiation' AFTER 'proposal';
ALTER TYPE public.lead_stage ADD VALUE IF NOT EXISTS 'completed' AFTER 'booked';