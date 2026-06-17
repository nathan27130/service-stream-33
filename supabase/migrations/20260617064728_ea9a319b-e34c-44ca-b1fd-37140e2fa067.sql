
-- Restrict services SELECT to authenticated users
DROP POLICY IF EXISTS "Everyone can view services" ON public.services;
CREATE POLICY "Authenticated users can view services"
ON public.services
FOR SELECT
TO authenticated
USING (true);

-- Revoke EXECUTE on SECURITY DEFINER functions from anon (and PUBLIC)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_service(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_company_code() FROM PUBLIC, anon, authenticated;

-- has_role and get_user_service are required by RLS policies; keep EXECUTE for authenticated only
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_service(uuid) TO authenticated, service_role;
-- has_company_code is not called from the client; only service_role may invoke it
GRANT EXECUTE ON FUNCTION public.has_company_code() TO service_role;
