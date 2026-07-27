
-- Create chapters table
CREATE TABLE public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  university TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  group_picture_url TEXT,
  location TEXT,
  established_year INTEGER,
  member_count INTEGER DEFAULT 0,
  contact_email TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active chapters are viewable by everyone"
  ON public.chapters FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage chapters"
  ON public.chapters FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_chapters_updated_at
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for chapter images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chapter-images', 'chapter-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chapter-images
CREATE POLICY "Chapter images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chapter-images');

CREATE POLICY "Admins can upload chapter images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chapter-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update chapter images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'chapter-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete chapter images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'chapter-images' AND has_role(auth.uid(), 'admin'::app_role));
