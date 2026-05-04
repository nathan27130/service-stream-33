
-- Tighten order_items SELECT policy to mirror orders access control
DROP POLICY IF EXISTS "Users can view order items if they can view the order" ON public.order_items;

CREATE POLICY "Users can view order items if they can view the order"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'readonly'::app_role)
        OR (
          public.has_role(auth.uid(), 'service'::app_role)
          AND o.service_id = public.get_user_service(auth.uid())
        )
      )
  )
);

-- Restrict Realtime broadcasts on orders to authorized recipients
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive authorized order events" ON realtime.messages;

CREATE POLICY "Authenticated users can receive authorized order events"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'readonly'::app_role)
  OR public.has_role(auth.uid(), 'service'::app_role)
);
