-- Supprimer les anciennes politiques qui permettent l'accès aux informations clients
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Admins and service users can manage customers" ON public.customers;

-- Créer une nouvelle politique : seuls les admins peuvent gérer les clients
CREATE POLICY "Only admins can manage customers"
ON public.customers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));