import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Filter, FileText, Download, Eye, BookOpen, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

const Library = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");

  const { data: categories } = useQuery({
    queryKey: ["library-categories"],
    queryFn: () => apiFetch<any[]>("/categories?type=library"),
  });

  const { data: resources, isLoading } = useQuery({
    queryKey: ["library-resources"],
    queryFn: () => apiFetch<any[]>("/resources"),
  });

  const filteredResources = (resources || []).filter((resource) => {
    const matchesSearch =
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (resource.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || resource.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedResources = [...filteredResources].sort((a, b) => {
    if (sortBy === "popular") return (b.download_count || 0) - (a.download_count || 0);
    if (sortBy === "views") return (b.view_count || 0) - (a.view_count || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleDownload = async (resource: (typeof sortedResources)[0]) => {
    apiFetch(`/resources/${resource.id}/download`, { method: "POST" }).catch(() => {});
    window.open(resource.file_url, "_blank");
    toast.success("Download started!");
  };

  return (
    <Layout>
      <SEO
        title="E-Library — NUASA National Body"
        description="Search and download accounting resources, research papers, past questions, and study guides across Auditing, Taxation, Public Sector and more."
        path="/library"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "NUASA National Body E-Library",
          description: "Searchable collection of accounting resources for Nigerian students.",
          url: "https://nuasa-nationalbodyblog.lovable.app/library",
        }}
      />
      {/* Header */}
      <section className="bg-primary py-16 md:py-24">
        <div className="content-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center text-primary-foreground"
          >
            <Badge className="mb-4 bg-accent/20 text-accent">E-Library</Badge>
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              Digital Resource Library
            </h1>
            <p className="text-lg opacity-90 mb-8">
              Access thousands of academic resources, research papers, and study materials
            </p>

            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for resources..."
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
            {/* Sidebar - Categories */}
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:w-64 flex-shrink-0"
            >
              <div className="bg-card rounded-2xl border border-border p-6 sticky top-24">
                <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Categories
                </h2>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === "all"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    All Resources
                  </button>
                  {categories?.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === category.id
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.aside>

            {/* Resources Grid */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <p className="text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{sortedResources.length}</span> resources
                </p>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most Downloaded</SelectItem>
                    <SelectItem value="views">Most Viewed</SelectItem>
                    <SelectItem value="recent">Most Recent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {sortedResources.map((resource, index) => (
                    <motion.div
                      key={resource.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card rounded-2xl border border-border overflow-hidden card-hover group"
                    >
                      <div className="aspect-[3/1] bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center relative">
                        <FileText className="w-10 h-10 text-primary/20" />
                        <Badge className="absolute top-3 right-3 bg-accent/10 text-accent">
                          {resource.file_type?.toUpperCase() || "PDF"}
                        </Badge>
                      </div>
                      <div className="p-5">
                        <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-accent transition-colors">
                          {resource.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {resource.description || "No description"}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                          <span>{resource.category?.name || "Uncategorized"}</span>
                          <span>{resource.file_size ? `${(resource.file_size / (1024 * 1024)).toFixed(1)} MB` : ""}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button asChild size="sm" variant="outline" className="flex-1 gap-2">
                            <Link to={`/library/${resource.id}`}>
                              <Eye className="w-3 h-3" />
                              Preview
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                            onClick={() => handleDownload(resource)}
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </Button>
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {(resource.view_count || 0).toLocaleString()} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {(resource.download_count || 0).toLocaleString()} downloads
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {!isLoading && sortedResources.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h2 className="font-semibold text-foreground mb-2">No resources found</h2>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Library;
