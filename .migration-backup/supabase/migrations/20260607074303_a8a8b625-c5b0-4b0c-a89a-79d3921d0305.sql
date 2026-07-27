DROP POLICY IF EXISTS "Users update own pending registrations" ON public.convention_registrations;
CREATE POLICY "Users update own pending registrations"
ON public.convention_registrations
FOR UPDATE
USING (
  ((auth.uid() = user_id) AND payment_status = 'pending')
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  ((auth.uid() = user_id) AND payment_status = 'pending')
  OR has_role(auth.uid(), 'admin'::app_role)
);