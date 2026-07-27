-- Track per-user resource views with timestamps
CREATE TABLE public.resource_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  resource_id UUID NOT NULL REFERENCES public.library_resources(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_resource_views_user_viewed ON public.resource_views(user_id, viewed_at DESC);
CREATE INDEX idx_resource_views_resource ON public.resource_views(resource_id);

ALTER TABLE public.resource_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own resource views"
ON public.resource_views
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resource views"
ON public.resource_views
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resource views"
ON public.resource_views
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all resource views"
ON public.resource_views
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
