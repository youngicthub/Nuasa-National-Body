DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='resource_downloads_resource_id_fkey') THEN
    ALTER TABLE public.resource_downloads ADD CONSTRAINT resource_downloads_resource_id_fkey
      FOREIGN KEY (resource_id) REFERENCES public.library_resources(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='saved_resources_resource_id_fkey') THEN
    ALTER TABLE public.saved_resources ADD CONSTRAINT saved_resources_resource_id_fkey
      FOREIGN KEY (resource_id) REFERENCES public.library_resources(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='post_views_post_id_fkey') THEN
    ALTER TABLE public.post_views ADD CONSTRAINT post_views_post_id_fkey
      FOREIGN KEY (post_id) REFERENCES public.blog_posts(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='saved_posts_post_id_fkey') THEN
    ALTER TABLE public.saved_posts ADD CONSTRAINT saved_posts_post_id_fkey
      FOREIGN KEY (post_id) REFERENCES public.blog_posts(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='library_resources_category_id_fkey') THEN
    ALTER TABLE public.library_resources ADD CONSTRAINT library_resources_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
END $$;