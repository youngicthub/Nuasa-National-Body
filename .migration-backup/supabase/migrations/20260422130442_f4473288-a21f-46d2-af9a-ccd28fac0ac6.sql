CREATE TABLE public.post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_views_user_viewed ON public.post_views(user_id, viewed_at DESC);
CREATE INDEX idx_post_views_post ON public.post_views(post_id);

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own post views"
ON public.post_views
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own post views"
ON public.post_views
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own post views"
ON public.post_views
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all post views"
ON public.post_views
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));