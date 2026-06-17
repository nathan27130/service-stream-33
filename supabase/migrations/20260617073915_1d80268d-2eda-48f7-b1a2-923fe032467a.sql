
-- Tighten order-attachments storage policies to enforce service-level ownership.
-- Path convention: <order_id>/<filename>

DROP POLICY IF EXISTS "Authenticated users can view order attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins and service users can upload order attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins and service users can update order attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete order attachments" ON storage.objects;

CREATE POLICY "View order attachments scoped by service"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'order-attachments'
    AND auth.role() = 'authenticated'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id::text = (storage.foldername(name))[1]
          AND (
            o.service_id = public.get_user_service(auth.uid())
            OR has_role(auth.uid(), 'readonly'::app_role)
          )
      )
    )
  );

CREATE POLICY "Upload order attachments scoped by service"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'order-attachments'
    AND auth.role() = 'authenticated'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR (
        has_role(auth.uid(), 'service'::app_role)
        AND EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id::text = (storage.foldername(name))[1]
            AND o.service_id = public.get_user_service(auth.uid())
        )
      )
    )
  );

CREATE POLICY "Update order attachments scoped by service"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'order-attachments'
    AND auth.role() = 'authenticated'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR (
        has_role(auth.uid(), 'service'::app_role)
        AND EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id::text = (storage.foldername(name))[1]
            AND o.service_id = public.get_user_service(auth.uid())
        )
      )
    )
  );

CREATE POLICY "Admins can delete order attachments"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'order-attachments'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Make INSERT/DELETE intent explicit on company_settings (admin only).
CREATE POLICY "Admins can insert company settings"
  ON public.company_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete company settings"
  ON public.company_settings
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
