-- Create table to store company settings including the company code
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view company settings
CREATE POLICY "Only admins can view company settings"
ON public.company_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update company settings
CREATE POLICY "Only admins can update company settings"
ON public.company_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to check if company code exists
CREATE OR REPLACE FUNCTION public.has_company_code()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM company_settings LIMIT 1);
$$;