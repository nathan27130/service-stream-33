-- Add default_address to customers table
ALTER TABLE public.customers 
ADD COLUMN default_address TEXT;

-- Add attachments array to orders table (stores file URLs/paths)
ALTER TABLE public.orders 
ADD COLUMN attachments TEXT[];

-- Create templates table
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  default_service_id UUID REFERENCES public.services(id),
  items_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY "Admins can manage templates"
  ON public.templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service users can view templates"
  ON public.templates
  FOR SELECT
  USING (has_role(auth.uid(), 'service'::app_role) OR has_role(auth.uid(), 'readonly'::app_role));

-- Add trigger for templates updated_at
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create storage bucket for order attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-attachments', 'order-attachments', false);

-- Storage policies for order attachments
CREATE POLICY "Authenticated users can view order attachments"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'order-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Admins and service users can upload order attachments"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'order-attachments' 
    AND auth.role() = 'authenticated'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'service'::app_role))
  );

CREATE POLICY "Admins and service users can update order attachments"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'order-attachments' 
    AND auth.role() = 'authenticated'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'service'::app_role))
  );

CREATE POLICY "Admins can delete order attachments"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'order-attachments' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );