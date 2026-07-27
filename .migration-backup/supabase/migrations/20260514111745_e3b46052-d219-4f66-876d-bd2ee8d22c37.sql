
CREATE TABLE public.resource_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_id uuid NOT NULL,
  downloaded_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.resource_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own resource downloads"
  ON public.resource_downloads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own resource downloads"
  ON public.resource_downloads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resource downloads"
  ON public.resource_downloads FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all resource downloads"
  ON public.resource_downloads FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_resource_downloads_user ON public.resource_downloads(user_id, downloaded_at DESC);
