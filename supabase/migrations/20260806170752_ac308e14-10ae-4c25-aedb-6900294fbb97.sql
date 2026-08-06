-- AI Executive Center: worker registry + task ledger

CREATE TYPE public.ai_worker_status AS ENUM ('active','idle','processing','completed','waiting_approval');
CREATE TYPE public.ai_task_status AS ENUM ('queued','processing','waiting_approval','completed','failed','rejected');

CREATE TABLE public.ai_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  worker_key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status public.ai_worker_status NOT NULL DEFAULT 'idle',
  is_enabled boolean NOT NULL DEFAULT true,
  autonomy text NOT NULL DEFAULT 'approval',
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, worker_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_workers TO authenticated;
GRANT ALL ON public.ai_workers TO service_role;
ALTER TABLE public.ai_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage ai workers" ON public.ai_workers
  FOR ALL TO authenticated
  USING (agency_id = private.current_agency_id())
  WITH CHECK (agency_id = private.current_agency_id());

CREATE TRIGGER update_ai_workers_updated_at BEFORE UPDATE ON public.ai_workers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  worker_key text NOT NULL,
  title text NOT NULL,
  kind text NOT NULL,
  status public.ai_task_status NOT NULL DEFAULT 'queued',
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb,
  summary text,
  error text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  requires_approval boolean NOT NULL DEFAULT true,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  minutes_saved integer NOT NULL DEFAULT 15,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_tasks TO authenticated;
GRANT ALL ON public.ai_tasks TO service_role;
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage ai tasks" ON public.ai_tasks
  FOR ALL TO authenticated
  USING (agency_id = private.current_agency_id())
  WITH CHECK (agency_id = private.current_agency_id());

CREATE TRIGGER update_ai_tasks_updated_at BEFORE UPDATE ON public.ai_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX ai_tasks_agency_created_idx ON public.ai_tasks (agency_id, created_at DESC);
CREATE INDEX ai_tasks_worker_idx ON public.ai_tasks (agency_id, worker_key, status);

-- Seed the four launch workers for every agency, now and in future
CREATE OR REPLACE FUNCTION public.seed_ai_workers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_workers (agency_id, worker_key, name, description, autonomy)
  VALUES
    (NEW.id, 'whatsapp', 'AI WhatsApp Executive', 'Handles inbound WhatsApp enquiries, qualifies leads and escalates to humans.', 'auto'),
    (NEW.id, 'marketing', 'AI Marketing Executive', 'Plans Facebook, TikTok and Google ad campaigns plus WhatsApp broadcasts.', 'approval'),
    (NEW.id, 'content', 'AI Content Executive', 'Writes social posts, blog articles, emails and video scripts.', 'approval'),
    (NEW.id, 'lead_intel', 'AI Lead Intelligence', 'Scores leads, predicts booking probability and recommends next actions.', 'auto')
  ON CONFLICT (agency_id, worker_key) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_ai_workers_on_agency AFTER INSERT ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.seed_ai_workers();

INSERT INTO public.ai_workers (agency_id, worker_key, name, description, autonomy)
SELECT a.id, w.worker_key, w.name, w.description, w.autonomy
FROM public.agencies a
CROSS JOIN (VALUES
  ('whatsapp','AI WhatsApp Executive','Handles inbound WhatsApp enquiries, qualifies leads and escalates to humans.','auto'),
  ('marketing','AI Marketing Executive','Plans Facebook, TikTok and Google ad campaigns plus WhatsApp broadcasts.','approval'),
  ('content','AI Content Executive','Writes social posts, blog articles, emails and video scripts.','approval'),
  ('lead_intel','AI Lead Intelligence','Scores leads, predicts booking probability and recommends next actions.','auto')
) AS w(worker_key, name, description, autonomy)
ON CONFLICT (agency_id, worker_key) DO NOTHING;