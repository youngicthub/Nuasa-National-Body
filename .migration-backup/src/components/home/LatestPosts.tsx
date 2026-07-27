import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, User, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const LatestPosts = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["home-latest-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(`*, category:categories(name, slug)`)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;

      const authorIds = [...new Set((data || []).map((p) => p.author_id).filter(Boolean))];
      let authorMap: Record<string, string> = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", authorIds as string[]);
        if (profiles) {
          authorMap = Object.fromEntries(profiles.map((p) => [p.user_id, p.full_name]));
        }
      }
      return (data || []).map((p) => ({
        ...p,
        author_name: p.author_id ? authorMap[p.author_id] || "Admin" : "Admin",
      }));
    },
  });

  const featuredPost = posts?.[0];
  const otherPosts = (posts || []).slice(1);

  return (
    <section className="section-padding bg-muted/50">
      <div className="content-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12"
        >
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-accent" />
              <span className="text-accent text-xs tracking-[0.3em] uppercase font-medium">Journal</span>
            </div>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-foreground text-balance">
              Latest <span className="italic text-gradient">Articles</span>
            </h2>
          </div>
          <Button asChild variant="ghost" className="gap-2 self-start md:self-auto">
            <Link to="/blog">
              View All Posts
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : !featuredPost ? (
          <div className="text-center py-12 text-muted-foreground">
            No blog posts yet. Check back soon!
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl border border-border overflow-hidden card-hover group"
            >
              <div className="aspect-video bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center relative overflow-hidden">
                {featuredPost.cover_image ? (
                  <img
                    src={featuredPost.cover_image}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-accent/10" />
                )}
                <Badge className="absolute top-4 left-4 bg-accent text-accent-foreground">
                  Featured
                </Badge>
              </div>
              <div className="p-6 md:p-8">
                {featuredPost.category && (
                  <Badge variant="outline" className="mb-3">
                    {featuredPost.category.name}
                  </Badge>
                )}
                <h3 className="font-serif text-xl md:text-2xl font-bold text-foreground mb-3 group-hover:text-accent transition-colors">
                  <Link to={`/blog/${featuredPost.slug}`}>{featuredPost.title}</Link>
                </h3>
                <p className="text-muted-foreground mb-4 line-clamp-2">
                  {featuredPost.excerpt}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {featuredPost.author_name}
                  </span>
                  {featuredPost.published_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(featuredPost.published_at), "MMM d, yyyy")}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {featuredPost.read_time || 5} min read
                  </span>
                </div>
              </div>
            </motion.article>

            <div className="space-y-6">
              {otherPosts.map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card rounded-2xl border border-border p-6 card-hover group"
                >
                  {post.category && (
                    <Badge variant="outline" className="mb-3">
                      {post.category.name}
                    </Badge>
                  )}
                  <h3 className="font-serif text-lg font-bold text-foreground mb-2 group-hover:text-accent transition-colors">
                    <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {post.author_name}
                    </span>
                    {post.published_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(post.published_at), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
