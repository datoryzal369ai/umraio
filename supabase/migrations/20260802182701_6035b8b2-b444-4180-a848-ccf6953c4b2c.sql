CREATE POLICY "agency members read branding"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'branding' AND (storage.foldername(name))[1] = public.current_agency_id()::text);

CREATE POLICY "agency members upload branding"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding' AND (storage.foldername(name))[1] = public.current_agency_id()::text);

CREATE POLICY "agency members update branding"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'branding' AND (storage.foldername(name))[1] = public.current_agency_id()::text)
WITH CHECK (bucket_id = 'branding' AND (storage.foldername(name))[1] = public.current_agency_id()::text);

CREATE POLICY "agency members delete branding"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'branding' AND (storage.foldername(name))[1] = public.current_agency_id()::text);