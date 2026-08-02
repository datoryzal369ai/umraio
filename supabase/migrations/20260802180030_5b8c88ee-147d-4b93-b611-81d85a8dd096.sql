CREATE TYPE public.kb_category AS ENUM ('faq','travel_guide','package_info','visa_info','hotel_info','general');

CREATE TABLE public.knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  category public.kb_category NOT NULL DEFAULT 'general',
  summary text,
  content text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  file_name text,
  file_path text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_articles TO authenticated;
GRANT ALL ON public.knowledge_articles TO service_role;

ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members manage knowledge" ON public.knowledge_articles
  FOR ALL TO authenticated
  USING (agency_id = public.current_agency_id())
  WITH CHECK (agency_id = public.current_agency_id());

CREATE TRIGGER update_knowledge_articles_updated_at
  BEFORE UPDATE ON public.knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX knowledge_articles_agency_idx ON public.knowledge_articles(agency_id, is_active);

CREATE POLICY "agency members read knowledge files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'knowledge' AND (storage.foldername(name))[1] = public.current_agency_id()::text);

CREATE POLICY "agency members upload knowledge files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'knowledge' AND (storage.foldername(name))[1] = public.current_agency_id()::text);

CREATE POLICY "agency members update knowledge files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'knowledge' AND (storage.foldername(name))[1] = public.current_agency_id()::text);

CREATE POLICY "agency members delete knowledge files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'knowledge' AND (storage.foldername(name))[1] = public.current_agency_id()::text);