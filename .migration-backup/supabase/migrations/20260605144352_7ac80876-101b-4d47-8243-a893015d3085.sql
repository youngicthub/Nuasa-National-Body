
ALTER TABLE public.convention_registrations
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS matric_number text,
  ADD COLUMN IF NOT EXISTS graduation_year integer,
  ADD COLUMN IF NOT EXISTS accommodation_request text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

CREATE TABLE IF NOT EXISTS public.admin_login_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_login_log TO authenticated;
GRANT ALL ON public.admin_login_log TO service_role;

ALTER TABLE public.admin_login_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view login log"
  ON public.admin_login_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert own login record"
  ON public.admin_login_log FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));
