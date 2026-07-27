import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, User, ArrowLeft, Share2, Tag, Loader2, Eye } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import DOMPurify from "dompurify";

const BlogPost = () => {
  const { id: slug } = useParams();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: () => apiFetch<any>(`/posts/${slug}`),
    enabled: !!slug,
  });

  const { data: postTags } = useQuery({
    queryKey: ["post-tags", post?.id],
    queryFn: () => apiFetch<any[]>(`/posts/${post!.id}/tags`),
    enabled: !!post?.id,
  });

  const { data: relatedPosts } = useQuery({
    queryKey: ["related-posts", post?.category_id, post?.id],
    queryFn: () =>
      apiFetch<any[]>(`/posts/${post!.id}/related?categoryId=${post!.category_id}`),
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
            <Button asChild>
              <Link to="/blog">Back to Blog</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Simple markdown-like rendering for content
  const renderContent = (content: string) => {
    const escaped = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
    const html = escaped
      .replace(/## (.*?)$/gm, "<h2>$1</h2>")
      .replace(/### (.*?)$/gm, "<h3>$1</h3>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^- (.*?)$/gm, "<li>$1</li>")
      .replace(/^> (.*?)$/gm, "<blockquote>$1</blockquote>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^/, "<p>")
      .replace(/$/, "</p>");
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
                    {postTags.map(
                      (tag) =>
                        tag && (
                          <Badge key={tag.id} variant="secondary">
                            {tag.name}
                          </Badge>
                        ),
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success("Link copied!");
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
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
                    <p className="font-medium text-foreground">{post.author_name}</p>
                    <p className="text-sm text-muted-foreground">NUASA Contributor</p>
                  </div>
                </div>
              </div>

              {relatedPosts && relatedPosts.length > 0 && (
                <div className="bg-card rounded-2xl border border-border p-6">
                  <h2 className="font-semibold text-foreground mb-4">Related Articles</h2>
                  <div className="space-y-3">
                    {relatedPosts.map((related) => (
                      <Link
                        key={related.id}
                        to={`/blog/${related.slug}`}
                        className="block text-sm font-medium text-foreground hover:text-accent transition-colors"
                      >
                        {related.title}
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {related.read_time} min read
                        </span>
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
