import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Calendar, Clock, User, ArrowRight, Tag, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const Blog = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: categories } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .in("type", ["blog", "both"])
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(`*, category:categories(name, slug)`)
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;

      // Fetch author names
      const authorIds = [...new Set(data.map(p => p.author_id).filter(Boolean))];
      let authorMap: Record<string, string> = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", authorIds as string[]);
        if (profiles) {
          authorMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
        }
      }
      return data.map(p => ({ ...p, author_name: p.author_id ? authorMap[p.author_id] || "Admin" : "Admin" }));
    },
  });

  const { data: tags } = useQuery({
    queryKey: ["blog-tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredPosts = (posts || []).filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.excerpt || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || post.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredPost = (posts || []).find((p) => p.is_featured);
  const regularPosts = filteredPosts.filter((p) => !p.is_featured || selectedCategory !== "all");

  return (
    <Layout>
      <SEO
        title="Blog — NUASA National Body"
        description="Articles, insights, and updates from NUASA contributors on accounting, careers, exam prep, and student life across Nigeria."
        path="/blog"
      />
      {/* Header */}
      <section className="bg-primary py-16 md:py-24">
        <div className="content-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center text-primary-foreground"
          >
            <Badge className="mb-4 bg-accent/20 text-accent">Blog</Badge>
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              Insights & Articles
            </h1>
            <p className="text-lg opacity-90 mb-8">
              Stay updated with academic tips, opportunities, and NUASA news
            </p>

            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg bg-card text-foreground border-0 rounded-xl"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="section-padding bg-background">
        <div className="content-container">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Featured Post */}
                  {selectedCategory === "all" && featuredPost && (
                    <motion.article
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card rounded-2xl border border-border overflow-hidden card-hover group mb-8"
                    >
                      <div className="grid md:grid-cols-2">
                        <div className="aspect-video md:aspect-auto bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center relative">
                          {featuredPost.cover_image ? (
                            <img src={featuredPost.cover_image} alt={featuredPost.title} className="w-full h-full object-cover" />
                          ) : null}
                          <Badge className="absolute top-4 left-4 bg-accent text-accent-foreground">
                            Featured
                          </Badge>
                        </div>
                        <div className="p-6 md:p-8 flex flex-col justify-center">
                          <Badge variant="outline" className="mb-3 w-fit">
                            {featuredPost.category?.name || "Uncategorized"}
                          </Badge>
                          <h2 className="font-serif text-2xl font-bold text-foreground mb-3 group-hover:text-accent transition-colors">
                            <Link to={`/blog/${featuredPost.slug}`}>
                              {featuredPost.title}
                            </Link>
                          </h2>
                          <p className="text-muted-foreground mb-4">
                            {featuredPost.excerpt}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {featuredPost.author_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {featuredPost.published_at ? format(new Date(featuredPost.published_at), "MMM d, yyyy") : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {featuredPost.read_time} min read
                            </span>
                          </div>
                          <Button asChild className="w-fit gap-2">
                            <Link to={`/blog/${featuredPost.slug}`}>
                              Read Article
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </motion.article>
                  )}

                  {/* Posts Grid */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {regularPosts.map((post, index) => (
                      <motion.article
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-card rounded-2xl border border-border overflow-hidden card-hover group"
                      >
                        <div className="aspect-video bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden">
                          {post.cover_image && (
                            <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="p-6">
                          <Badge variant="outline" className="mb-3">
                            {post.category?.name || "Uncategorized"}
                          </Badge>
                          <h3 className="font-serif text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                            <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {post.excerpt}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {post.author_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {post.published_at ? format(new Date(post.published_at), "MMM d, yyyy") : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {post.read_time} min read
                            </span>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </div>

                  {filteredPosts.length === 0 && (
                    <div className="text-center py-12">
                      <Search className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                      <h3 className="font-semibold text-foreground mb-2">No posts found</h3>
                      <p className="text-muted-foreground">
                        Try adjusting your search or category filter
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sidebar */}
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:w-72 flex-shrink-0 space-y-6"
            >
              <div className="bg-card rounded-2xl border border-border p-6 sticky top-24">
                <h3 className="font-semibold text-foreground mb-4">Categories</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === "all"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>All Posts</span>
                  </button>
                  {categories?.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === category.id
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Popular Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags?.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </motion.aside>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Blog;
