import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourceUploadForm } from "@/components/admin/ResourceUploadForm";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const AdminResourceUpload = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

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
                  Upload Resource
                </h1>
                <p className="text-muted-foreground">
                  Add a new resource to the E-Library
                </p>
              </div>
            </div>

            <div className="max-w-2xl">
              <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
                <ResourceUploadForm 
                  onSuccess={() => navigate("/admin/dashboard")} 
                />
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminResourceUpload;
