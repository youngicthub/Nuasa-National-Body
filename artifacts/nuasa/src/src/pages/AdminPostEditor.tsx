import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Link, useParams, useNavigate } from "react-router-dom";
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
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlogPostEditor } from "@/components/admin/BlogPostEditor";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AdminPostEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
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
                  {id ? "Edit Post" : "Create New Post"}
                </h1>
                <p className="text-muted-foreground">
                  {id ? "Update your blog post" : "Write and publish a new blog post"}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <BlogPostEditor
                post={post ? { ...post, status: post.status as "draft" | "published" } : undefined}
                onSuccess={() => navigate("/admin/dashboard")}
                onCancel={() => navigate("/admin/dashboard")}
              />
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminPostEditor;
