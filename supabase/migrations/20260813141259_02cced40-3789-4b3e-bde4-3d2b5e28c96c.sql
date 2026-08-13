DROP INDEX IF EXISTS public.demo_requests_email_intent_key;
ALTER TABLE public.demo_requests ADD CONSTRAINT demo_requests_email_intent_unique UNIQUE (email, intent);