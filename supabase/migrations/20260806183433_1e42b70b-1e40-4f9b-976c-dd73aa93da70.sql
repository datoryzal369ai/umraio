
-- Move ai_tasks.status from enum to text with a wider lifecycle
ALTER TABLE public.ai_tasks ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.ai_tasks ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE public.ai_tasks ALTER COLUMN status SET DEFAULT 'queued';
ALTER TABLE public.ai_tasks ADD CONSTRAINT ai_tasks_status_check CHECK (status IN (
  'queued','analysing','planning','running','processing','waiting_approval','completed','failed','rejected','cancelled'
));

ALTER TABLE public.ai_tasks
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approval_reason text,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE public.ai_tasks ADD CONSTRAINT ai_tasks_priority_check CHECK (priority IN ('low','normal','high','critical'));

CREATE INDEX IF NOT EXISTS ai_tasks_agency_status_idx ON public.ai_tasks (agency_id, status, created_at DESC);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  entity text,
  entity_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members view notifications" ON public.notifications
  FOR SELECT TO authenticated USING (agency_id = private.current_agency_id());
CREATE POLICY "agency members insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (agency_id = private.current_agency_id());
CREATE POLICY "agency members update notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (agency_id = private.current_agency_id())
  WITH CHECK (agency_id = private.current_agency_id());

CREATE INDEX IF NOT EXISTS notifications_agency_idx ON public.notifications (agency_id, created_at DESC);
