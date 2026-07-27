-- Convention registrations
CREATE TABLE public.convention_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  registration_type TEXT NOT NULL CHECK (registration_type IN ('student','delegate','chapter')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  institution TEXT,
  chapter_name TEXT,
  delegates_count INTEGER DEFAULT 1,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','successful','failed')),
  tx_ref TEXT NOT NULL UNIQUE,
  flw_transaction_id TEXT,
  reference_code TEXT NOT NULL UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.convention_registrations TO authenticated;
GRANT ALL ON public.convention_registrations TO service_role;

ALTER TABLE public.convention_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own registrations"
  ON public.convention_registrations FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own registrations"
  ON public.convention_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pending registrations"
  ON public.convention_registrations FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage registrations"
  ON public.convention_registrations FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_convention_registrations_updated_at
  BEFORE UPDATE ON public.convention_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_conv_reg_user ON public.convention_registrations(user_id);
CREATE INDEX idx_conv_reg_status ON public.convention_registrations(payment_status);
