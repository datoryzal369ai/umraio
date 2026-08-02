CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.current_agency_id() SET SCHEMA private;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;

REVOKE EXECUTE ON FUNCTION private.current_agency_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_agency_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

ALTER FUNCTION private.current_agency_id() SET search_path = public;
ALTER FUNCTION private.has_role(uuid, public.app_role) SET search_path = public;