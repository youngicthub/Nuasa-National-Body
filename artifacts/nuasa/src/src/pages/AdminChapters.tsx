import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  FileText,
  Users,
  Upload,
  Settings,
  LogOut,
  BarChart3,
  Shield,
  ArrowLeft,
  Building2,
  Trash2,
  Loader2,
  Calendar,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChapterUploadForm } from "@/components/admin/ChapterUploadForm";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminChapters = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: chapters, isLoading } = useQuery({
    queryKey: ["admin-chapters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const handleDelete = async (id: string, imageUrl: string | null) => {
    if (!confirm("Delete this chapter?")) return;
    try {
      // Try removing image from storage if present
      if (imageUrl) {
        const path = imageUrl.split("/chapter-images/")[1];
        if (path) {
          await supabase.storage.from("chapter-images").remove([path]);
        }
      }
      const { error } = await supabase.from("chapters").delete().eq("id", id);
      if (error) throw error;
      toast.success("Chapter deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-chapters"] });
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete chapter");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar />

        <main className="flex-1 ml-64 p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-4 mb-8">
              <Button asChild variant="ghost" size="icon">
                <Link to="/admin/dashboard">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="font-serif text-3xl font-bold text-foreground mb-1">
                  Manage Chapters
                </h1>
                <p className="text-muted-foreground">
                  Add chapter information and group pictures from universities nationwide
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h2 className="font-serif text-xl font-bold text-foreground mb-4">
                  Add New Chapter
                </h2>
                <div className="bg-card rounded-2xl border border-border p-6">
                  <ChapterUploadForm
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ["admin-chapters"] });
                      queryClient.invalidateQueries({ queryKey: ["chapters"] });
                    }}
                  />
                </div>
              </div>

              <div>
                <h2 className="font-serif text-xl font-bold text-foreground mb-4">
                  Existing Chapters ({chapters?.length || 0})
                </h2>
                <div className="bg-card rounded-2xl border border-border p-4 max-h-[800px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-accent" />
                    </div>
                  ) : !chapters || chapters.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p>No chapters yet. Add your first chapter on the left.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chapters.map((chapter) => (
                        <div
                          key={chapter.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent transition-colors"
                        >
                          <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                            {chapter.group_picture_url ? (
                              <img
                                src={chapter.group_picture_url}
                                alt={chapter.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {chapter.name}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {chapter.university}
                            </p>
                            {!chapter.is_active && (
                              <span className="text-xs text-warning">Inactive</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(chapter.id, chapter.group_picture_url)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminChapters;
