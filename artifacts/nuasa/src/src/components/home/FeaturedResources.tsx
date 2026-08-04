import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Download, Eye, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const FeaturedResources = () => {
  const { data: resources, isLoading } = useQuery({
    queryKey: ["home-featured-resources"],
    queryFn: async () => {
      // Try featured first, fall back to most recent
      const { data: featured, error } = await supabase
        .from("library_resources")
        .select(`*, category:categories(name, slug)`)
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      if (featured && featured.length > 0) return featured;

      const { data: recent } = await supabase
        .from("library_resources")
        .select(`*, category:categories(name, slug)`)
        .order("created_at", { ascending: false })
        .limit(4);
      return recent || [];
    },
  });

  return (
    <section className="section-padding bg-background">
      <div className="content-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="ornament-divider"><span>E-Library</span></div>
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-4 text-balance">
            Featured <span className="italic text-gradient">Resources</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover our most popular academic materials, curated for excellence
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : !resources || resources.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground mb-8">
            No resources available yet.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {resources.map((resource, index) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-2xl border border-border overflow-hidden card-hover group"
              >
                <Link to={`/library/${resource.id}`}>
                  <div className="aspect-[4/3] bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center overflow-hidden">
                    {resource.cover_image ? (
                      <img
                        src={resource.cover_image}
                        alt={resource.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-12 h-12 text-primary/30 group-hover:text-accent/50 transition-colors" />
                    )}
                  </div>
                  <div className="p-5">
                    {resource.category && (
                      <Badge variant="outline" className="mb-3 text-xs">
                        {resource.category.name}
                      </Badge>
                    )}
                    <h3 className="font-medium text-foreground mb-3 line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                      {resource.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {(resource.view_count || 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          {(resource.download_count || 0).toLocaleString()}
                        </span>
                      </div>
                      {resource.file_type && (
                        <Badge className="bg-accent/10 text-accent text-xs uppercase">
                          {resource.file_type.split("/").pop()?.slice(0, 4)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <div className="text-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/library">
              Browse All Resources
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
