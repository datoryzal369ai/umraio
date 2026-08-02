CREATE TYPE public.lead_temperature AS ENUM ('hot','warm','cold');

ALTER TABLE public.leads
  ADD COLUMN temperature public.lead_temperature NOT NULL DEFAULT 'warm',
  ADD COLUMN tags text[] NOT NULL DEFAULT '{}';

UPDATE public.leads SET temperature = CASE WHEN score >= 70 THEN 'hot' WHEN score >= 40 THEN 'warm' ELSE 'cold' END::public.lead_temperature;

CREATE TABLE public.lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_notes TO authenticated;
GRANT ALL ON public.lead_notes TO service_role;

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members manage lead notes" ON public.lead_notes
  TO authenticated
  USING (agency_id = public.current_agency_id())
  WITH CHECK (agency_id = public.current_agency_id());

CREATE INDEX lead_notes_lead_id_created_at_idx ON public.lead_notes (lead_id, created_at DESC);

CREATE TRIGGER lead_notes_updated_at BEFORE UPDATE ON public.lead_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();