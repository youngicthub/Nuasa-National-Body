import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  Calendar, 
  FileText, 
  User,
  Bookmark,
  Share2,
  Loader2 
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PDFViewer } from "@/components/library/PDFViewer";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResourceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showPDF, setShowPDF] = useState(false);

  const recordView = async () => {
    if (!user || !id) return;
    await supabase.from("resource_views").insert({ user_id: user.id, resource_id: id });
    queryClient.invalidateQueries({ queryKey: ["recently-viewed", user.id] });
  };

  const openPreview = () => {
    setShowPDF(true);
    recordView();
  };

  const { data: resource, isLoading } = useQuery({
    queryKey: ["resource", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_resources")
        .select(`
          *,
          category:categories(name, slug)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      
      // Increment view count
      await supabase
        .from("library_resources")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", id);
      
      return data;
    },
    enabled: !!id,
  });

  const { data: isSaved } = useQuery({
    queryKey: ["saved-resource", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("saved_resources")
        .select("id")
        .eq("resource_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!id && !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("Not authenticated");
      
      if (isSaved) {
        await supabase
          .from("saved_resources")
          .delete()
          .eq("resource_id", id)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("saved_resources")
          .insert({ resource_id: id, user_id: user.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-resource", id] });
      toast.success(isSaved ? "Removed from saved" : "Saved to library");
    },
  });

  const handleDownload = async () => {
    if (!resource) return;
    
    // Increment download count
    await supabase
      .from("library_resources")
      .update({ download_count: (resource.download_count || 0) + 1 })
      .eq("id", id);

    // Record per-user download history
    if (user && id) {
      await supabase.from("resource_downloads").insert({ user_id: user.id, resource_id: id });
      queryClient.invalidateQueries({ queryKey: ["my-downloads", user.id] });
    }
    
    // Open file in new tab for download
    window.open(resource.file_url, "_blank");
    toast.success("Download started!");
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!resource) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Resource Not Found</h2>
            <Button asChild>
              <Link to="/library">Back to Library</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <section className="bg-primary py-12 md:py-16">
        <div className="content-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            <Link
              to="/library"
              className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Library
            </Link>
            
            {resource.category && (
              <Badge className="mb-4 bg-accent/20 text-accent">
                {resource.category.name}
              </Badge>
            )}
            
            <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">
              {resource.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-primary-foreground/80">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(resource.created_at).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {resource.file_type?.toUpperCase()} • {((resource.file_size || 0) / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding bg-background">
        <div className="content-container">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2"
            >
              {/* Preview Area */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden mb-6">
                <div className="aspect-video bg-gradient-to-br from-primary/5 to-accent/5 flex flex-col items-center justify-center p-8">
                  <FileText className="w-16 h-16 text-primary/30 mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Preview this document in your browser
                  </p>
                  <Button 
                    onClick={openPreview} 
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Open Preview
                  </Button>
                </div>
              </div>

              {/* Description */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="font-semibold text-foreground mb-4">Description</h2>
                <p className="text-muted-foreground">
                  {resource.description || "No description provided."}
                </p>
                
                {(resource.course || resource.level) && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex flex-wrap gap-4">
                      {resource.course && (
                        <div>
                          <span className="text-sm text-muted-foreground">Course:</span>
                          <p className="font-medium">{resource.course}</p>
                        </div>
                      )}
                      {resource.level && (
                        <div>
                          <span className="text-sm text-muted-foreground">Level:</span>
                          <p className="font-medium capitalize">{resource.level}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Actions Card */}
              <div className="bg-card rounded-2xl border border-border p-6 space-y-4 sticky top-24">
                <Button 
                  onClick={handleDownload}
                  className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Download className="w-4 h-4" />
                  Download Resource
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={openPreview}
                >
                  <Eye className="w-4 h-4" />
                  Read Online
                </Button>

                <div className="flex gap-2">
                  {user && (
                    <Button 
                      variant="outline" 
                      className="flex-1 gap-2"
                      onClick={() => saveMutation.mutate()}
                    >
                      <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                      {isSaved ? "Saved" : "Save"}
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1 gap-2">
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </div>

                {/* Stats */}
                <div className="pt-4 border-t border-border">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-foreground">
                        {(resource.view_count || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Views</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">
                        {(resource.download_count || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Downloads</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.aside>
          </div>
        </div>
      </section>

      {/* PDF Viewer Modal */}
      <PDFViewer
        url={resource.file_url}
        title={resource.title}
        isOpen={showPDF}
        onClose={() => setShowPDF(false)}
        onDownload={handleDownload}
      />
    </Layout>
  );
};

export default ResourceView;
