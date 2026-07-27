import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, User, ArrowLeft, Share2, Bookmark, Tag, Loader2, Eye } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import DOMPurify from "dompurify";

const BlogPost = () => {
  const { id: slug } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(`*, category:categories(name, slug)`)
        .eq("slug", slug)
        .single();
      if (error) throw error;

      // Fetch author name
      let author_name = "Admin";
      if (data.author_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", data.author_id)
          .maybeSingle();
        if (profile) author_name = profile.full_name;
      }

      // Increment views
      await supabase
        .from("blog_posts")
        .update({ views: (data.views || 0) + 1 })
        .eq("id", data.id);

      return { ...data, author_name };
    },
    enabled: !!slug,
  });

  // Track per-user reading history
  useEffect(() => {
    if (!user || !post?.id) return;
    (async () => {
      await supabase.from("post_views").insert({ user_id: user.id, post_id: post.id });
      queryClient.invalidateQueries({ queryKey: ["recently-read-posts"] });
    })();
  }, [user, post?.id, queryClient]);

  const { data: postTags } = useQuery({
    queryKey: ["post-tags", post?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_post_tags")
        .select("tag:tags(id, name)")
        .eq("post_id", post!.id);
      if (error) throw error;
      return data?.map((t) => t.tag) || [];
    },
    enabled: !!post?.id,
  });

  const { data: isSaved } = useQuery({
    queryKey: ["saved-post", post?.id, user?.id],
    queryFn: async () => {
      if (!user || !post) return false;
      const { data } = await supabase
        .from("saved_posts")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!post?.id && !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !post) throw new Error("Not authenticated");
      if (isSaved) {
        await supabase.from("saved_posts").delete().eq("post_id", post.id).eq("user_id", user.id);
      } else {
        await supabase.from("saved_posts").insert({ post_id: post.id, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-post", post?.id] });
      toast.success(isSaved ? "Removed from saved" : "Post saved!");
    },
  });

  const { data: relatedPosts } = useQuery({
    queryKey: ["related-posts", post?.category_id, post?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, read_time")
        .eq("status", "published")
        .eq("category_id", post!.category_id!)
        .neq("id", post!.id)
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!post?.category_id,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Post Not Found</h2>
            <Button asChild><Link to="/blog">Back to Blog</Link></Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Simple markdown-like rendering for content
  const renderContent = (content: string) => {
    // Escape HTML first to prevent stored XSS, then apply minimal markdown.
    const escaped = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
    const html = escaped
      .replace(/## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*?)$/gm, '<li>$1</li>')
      .replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
    return DOMPurify.sanitize(html);
  };

  return (
    <Layout>
      <SEO
        title={`${post.title} — NUASA Blog`}
        description={(post.excerpt || post.title || "").slice(0, 160)}
        path={`/blog/${post.slug}`}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          datePublished: post.published_at,
          author: { "@type": "Person", name: post.author_name },
          description: post.excerpt || undefined,
        }}
      />
      {/* Hero */}
      <section className="bg-primary py-16 md:py-24">
        <div className="content-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>
            <Badge className="mb-4 bg-accent/20 text-accent">
              {post.category?.name || "Uncategorized"}
            </Badge>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-primary-foreground/80">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {post.author_name}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {post.published_at ? format(new Date(post.published_at), "MMM d, yyyy") : ""}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {post.read_time} min read
              </span>
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {(post.views || 0).toLocaleString()} views
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding bg-background">
        <div className="content-container">
          <div className="grid lg:grid-cols-12 gap-8">
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-8"
            >
              <div className="bg-card rounded-2xl border border-border p-6 md:p-10">
                <div
                  className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-accent"
                  dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
                />

                <Separator className="my-8" />

                {/* Tags */}
                {postTags && postTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    {postTags.map((tag) => tag && (
                      <Badge key={tag.id} variant="secondary">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied!");
                  }}>
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                  {user && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => saveMutation.mutate()}
                    >
                      <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                      {isSaved ? "Saved" : "Save"}
                    </Button>
                  )}
                </div>
              </div>
            </motion.article>

            {/* Sidebar */}
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-4 space-y-6"
            >
              <div className="bg-card rounded-2xl border border-border p-6 sticky top-24">
                <h2 className="font-semibold text-foreground mb-4">About the Author</h2>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{post.author_name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">NUASA Contributor</p>
                  </div>
                </div>
              </div>

              {relatedPosts && relatedPosts.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h2 className="font-semibold text-foreground mb-4">Related Articles</h2>
                  <div className="space-y-4">
                    {relatedPosts.map((rp) => (
                      <Link key={rp.id} to={`/blog/${rp.slug}`} className="block group">
                        <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                          {rp.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{rp.read_time} min read</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </motion.aside>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default BlogPost;
