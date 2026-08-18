CREATE OR REPLACE FUNCTION public.seed_ai_workers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_workers (agency_id, worker_key, name, description, autonomy, status)
  VALUES
    (NEW.id, 'whatsapp', 'AI WhatsApp Executive', 'Handles inbound WhatsApp enquiries, qualifies leads and escalates to humans.', 'auto', 'idle'),
    (NEW.id, 'marketing', 'AI Marketing Executive', 'Plans Facebook, TikTok and Google ad campaigns plus WhatsApp broadcasts.', 'approval', 'idle'),
    (NEW.id, 'content', 'AI Content Executive', 'Writes social posts, blog articles, emails and video scripts.', 'approval', 'idle'),
    (NEW.id, 'lead_intel', 'AI Lead Intelligence', 'Scores leads, predicts booking probability and recommends next actions.', 'auto', 'idle'),
    (NEW.id, 'sales_elite', 'AI SALES ELITE™', 'Elite sales intelligence and closing engine: qualification, objection handling, buying-signal detection, next best action and human handoff briefs.', 'auto', 'active')
  ON CONFLICT (agency_id, worker_key) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.seed_ai_workers() FROM PUBLIC, anon, authenticated;

INSERT INTO public.ai_workers (agency_id, worker_key, name, description, autonomy, status)
SELECT a.id, 'sales_elite', 'AI SALES ELITE™',
       'Elite sales intelligence and closing engine: qualification, objection handling, buying-signal detection, next best action and human handoff briefs.',
       'auto', 'active'
FROM public.agencies a
ON CONFLICT (agency_id, worker_key) DO NOTHING;

UPDATE public.ai_workers
SET name = 'AI SALES ELITE™', status = 'active', is_enabled = true
WHERE worker_key = 'sales_elite';