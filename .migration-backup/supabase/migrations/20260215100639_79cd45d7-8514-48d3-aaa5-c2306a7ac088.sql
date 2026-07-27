
-- Drop and recreate policies as PERMISSIVE for blog_posts
DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can manage all posts" ON public.blog_posts;

CREATE POLICY "Published posts are viewable by everyone"
ON public.blog_posts FOR SELECT
USING ((status = 'published') OR (author_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all posts"
ON public.blog_posts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Drop and recreate policies as PERMISSIVE for library_resources
DROP POLICY IF EXISTS "Public resources are viewable by everyone" ON public.library_resources;
DROP POLICY IF EXISTS "Admins can manage all resources" ON public.library_resources;

CREATE POLICY "Public resources are viewable by everyone"
ON public.library_resources FOR SELECT
USING ((is_public = true) OR (auth.uid() IS NOT NULL));

CREATE POLICY "Admins can manage all resources"
ON public.library_resources FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix categories too
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "Categories are viewable by everyone"
ON public.categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories"
ON public.categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix tags
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON public.tags;
DROP POLICY IF EXISTS "Admins can manage tags" ON public.tags;

CREATE POLICY "Tags are viewable by everyone"
ON public.tags FOR SELECT USING (true);

CREATE POLICY "Admins can manage tags"
ON public.tags FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix blog_post_tags
DROP POLICY IF EXISTS "Post tags are viewable by everyone" ON public.blog_post_tags;
DROP POLICY IF EXISTS "Admins can manage post tags" ON public.blog_post_tags;

CREATE POLICY "Post tags are viewable by everyone"
ON public.blog_post_tags FOR SELECT USING (true);

CREATE POLICY "Admins can manage post tags"
ON public.blog_post_tags FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix library_resource_tags
DROP POLICY IF EXISTS "Resource tags are viewable by everyone" ON public.library_resource_tags;
DROP POLICY IF EXISTS "Admins can manage resource tags" ON public.library_resource_tags;

CREATE POLICY "Resource tags are viewable by everyone"
ON public.library_resource_tags FOR SELECT USING (true);

CREATE POLICY "Admins can manage resource tags"
ON public.library_resource_tags FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix saved_posts
DROP POLICY IF EXISTS "Users can manage their saved posts" ON public.saved_posts;

CREATE POLICY "Users can manage their saved posts"
ON public.saved_posts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix saved_resources
DROP POLICY IF EXISTS "Users can manage their saved resources" ON public.saved_resources;

CREATE POLICY "Users can manage their saved resources"
ON public.saved_resources FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fix user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
