import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Library from "./pages/Library";
import ResourceView from "./pages/ResourceView";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminLogin from "./pages/AdminLogin";
import AdminRegister from "./pages/AdminRegister";
import AdminResetPassword from "./pages/AdminResetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminResourceUpload from "./pages/AdminResourceUpload";
import AdminPostEditor from "./pages/AdminPostEditor";
import AdminChapters from "./pages/AdminChapters";
import Chapters from "./pages/Chapters";
import Events from "./pages/Events";
import AdminEvents from "./pages/AdminEvents";
import AdminCategories from "./pages/AdminCategories";
import AdminSettings from "./pages/AdminSettings";
import NotFound from "./pages/NotFound";
import AdminVisitors from "./pages/AdminVisitors";
import AdminUsers from "./pages/AdminUsers";
import Convention from "./pages/Convention";
import AdminConvention from "./pages/AdminConvention";
import AdminTransactions from "./pages/AdminTransactions";
import Executives from "./pages/Executives";
import AdminExecutives from "./pages/AdminExecutives";
import { useVisitTracker } from "./hooks/useVisitTracker";

const queryClient = new QueryClient();

const VisitTrackerMount = () => {
  useVisitTracker();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <VisitTrackerMount />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/library" element={<Library />} />
            <Route path="/library/:id" element={<ResourceView />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<BlogPost />} />
            <Route path="/chapters" element={<Chapters />} />
            <Route path="/events" element={<Events />} />
            <Route path="/convention" element={<Convention />} />
            <Route path="/executives" element={<Executives />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/register" element={<AdminRegister />} />
            <Route path="/admin/reset-password" element={<AdminResetPassword />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* User dashboard routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/downloads" element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/saved" element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/history" element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/settings" element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/convention" element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } />

            {/* Admin routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/resources" element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/resources/new" element={
              <ProtectedRoute requireAdmin>
                <AdminResourceUpload />
              </ProtectedRoute>
            } />
            <Route path="/admin/posts" element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/posts/new" element={
              <ProtectedRoute requireAdmin>
                <AdminPostEditor />
              </ProtectedRoute>
            } />
            <Route path="/admin/posts/:id/edit" element={
              <ProtectedRoute requireAdmin>
                <AdminPostEditor />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute requireAdmin>
                <AdminUsers />
              </ProtectedRoute>
            } />
            <Route path="/admin/upload" element={
              <ProtectedRoute requireAdmin>
                <AdminResourceUpload />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute requireAdmin>
                <AdminSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/chapters" element={
              <ProtectedRoute requireAdmin>
                <AdminChapters />
              </ProtectedRoute>
            } />
            <Route path="/admin/events" element={
              <ProtectedRoute requireAdmin>
                <AdminEvents />
              </ProtectedRoute>
            } />
            <Route path="/admin/categories" element={
              <ProtectedRoute requireAdmin>
                <AdminCategories />
              </ProtectedRoute>
            } />
            <Route path="/admin/visitors" element={
              <ProtectedRoute requireAdmin>
                <AdminVisitors />
              </ProtectedRoute>
            } />
            <Route path="/admin/convention" element={
              <ProtectedRoute requireAdmin>
                <AdminConvention />
              </ProtectedRoute>
            } />
            <Route path="/admin/transactions" element={
              <ProtectedRoute requireAdmin>
                <AdminTransactions />
              </ProtectedRoute>
            } />
            <Route path="/admin/executives" element={
              <ProtectedRoute requireAdmin>
                <AdminExecutives />
              </ProtectedRoute>
            } />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
