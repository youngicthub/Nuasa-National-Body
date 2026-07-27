import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  FileText,
  Download,
  Bookmark,
  Clock,
  User,
  Settings,
  LogOut,
  ChevronRight,
  Eye,
  TrendingUp,
  Loader2,
  Save,
  Award,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  LayoutDashboard,
  GraduationCap,
  Shield,
  Camera,
  KeyRound,
  EyeOff,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function formatRelative(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

const routeToTab = (path: string) => {
  if (path.endsWith("/downloads")) return "downloads";
  if (path.endsWith("/saved")) return "saved";
  if (path.endsWith("/settings")) return "settings";
  if (path.endsWith("/convention")) return "convention";
  return "activity";
};

const REGISTRATION_LABELS: Record<string, string> = {
  student: "Student",
  graduate: "Graduate",
  chapter: "Chapter",
};

const UserDashboard = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const tab = routeToTab(location.pathname);

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const { data: recentlyViewed = [], isLoading: viewsLoading } = useQuery({
    queryKey: ["recently-viewed", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("resource_views")
        .select("id, viewed_at, resource_id, library_resources(id, title, file_type)")
        .eq("user_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const seen = new Set<string>();
      const unique: typeof data = [];
      for (const row of data || []) {
        if (row.resource_id && !seen.has(row.resource_id) && row.library_resources) {
          seen.add(row.resource_id);
          unique.push(row);
        }
      }
      return unique.slice(0, 10);
    },
    enabled: !!user,
  });

  const { data: recentlyRead = [], isLoading: readsLoading } = useQuery({
    queryKey: ["recently-read-posts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("post_views")
        .select("id, viewed_at, post_id, blog_posts(id, title, slug, read_time)")
        .eq("user_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const seen = new Set<string>();
      const unique: typeof data = [];
      for (const row of data || []) {
        if (row.post_id && !seen.has(row.post_id) && row.blog_posts) {
          seen.add(row.post_id);
          unique.push(row);
        }
      }
      return unique.slice(0, 5);
    },
    enabled: !!user,
  });

  const { data: downloads = [], isLoading: downloadsLoading } = useQuery({
    queryKey: ["my-downloads", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("resource_downloads")
        .select("id, downloaded_at, resource_id, library_resources(id, title, file_type, file_size, file_url)")
        .eq("user_id", user.id)
        .order("downloaded_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: saved = [], isLoading: savedLoading } = useQuery({
    queryKey: ["my-saved", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("saved_resources")
        .select("id, created_at, resource_id, library_resources(id, title, file_type, category_id, categories:category_id(name))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const downloadsCount = downloads.length;
  const savedCount = saved.length;
  const viewedCount = recentlyViewed.length;

  const { data: conventionRegs = [], isLoading: convLoading } = useQuery({
    queryKey: ["my-convention-regs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("convention_registrations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const confirmedConvReg = conventionRegs.find((r: any) => r.payment_status === "successful");

  const [form, setForm] = useState({ full_name: "", institution: "", academic_level: "" });
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        institution: profile.institution || "",
        academic_level: profile.academic_level || "",
      });
    }
  }, [profile]);

  // Passport / avatar upload
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { toast.error("Please upload a JPG, PNG, or WEBP image."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB."); return; }
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);
    try {
      const token = localStorage.getItem("nuasa_local_access_token");
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Upload failed");
      const publicUrl: string = data.publicUrl || `/api/uploads/${data.path}`;
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user!.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Passport photo updated!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setAvatarPreview(null);
    } finally {
      setAvatarUploading(false);
    }
  };

  // Change password
  const [pwForm, setPwForm] = useState({ newPw: "", confirmPw: "" });
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (pwForm.newPw !== pwForm.confirmPw) { toast.error("Passwords do not match"); return; }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
      if (error) throw error;
      toast.success("Password updated successfully!");
      setPwForm({ newPw: "", confirmPw: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setPwLoading(false);
    }
  };

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: form.full_name, institution: form.institution, academic_level: form.academic_level })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => { await refreshProfile(); toast.success("Profile updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  const removeSaved = async (id: string) => {
    await supabase.from("saved_resources").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["my-saved", user?.id] });
    toast.success("Removed from saved");
  };

  const navItems = [
    { to: "/dashboard", tab: "activity", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/dashboard/downloads", tab: "downloads", icon: Download, label: "My Downloads" },
    { to: "/dashboard/saved", tab: "saved", icon: Bookmark, label: "Saved Resources" },
    { to: "/dashboard/convention", tab: "convention", icon: Award, label: "Convention", badge: confirmedConvReg },
    { to: "/dashboard/settings", tab: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-muted/30">
        {/* Top header bar */}
        <div className="bg-primary text-primary-foreground">
          <div className="content-container py-4 flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/60 text-xs uppercase tracking-widest font-medium mb-0.5">Member Portal</p>
              <h1 className="font-serif text-xl font-bold">Welcome back, {firstName}</h1>
            </div>
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 hidden sm:flex">
              <Link to="/library">Explore Library</Link>
            </Button>
          </div>
        </div>

        <div className="content-container py-8">
          <div className="grid lg:grid-cols-12 gap-6">

            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <motion.aside
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:col-span-3"
            >
              <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm sticky top-24">
                {/* Profile header */}
                <div className="bg-gradient-to-br from-primary to-primary/80 p-5 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center mx-auto mb-3 overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-white/80" />
                    )}
                  </div>
                  <h3 className="font-semibold text-white text-sm leading-tight">{profile?.full_name || "Member"}</h3>
                  <p className="text-white/60 text-xs mt-0.5 truncate px-2">{profile?.email || ""}</p>
                  {profile?.academic_level && (
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 text-[11px]">
                      {profile.academic_level}
                    </span>
                  )}
                </div>

                {/* Stats strip */}
                <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                  {[
                    { icon: Download, count: downloadsCount, label: "Downloads" },
                    { icon: Bookmark, count: savedCount, label: "Saved" },
                    { icon: Eye, count: viewedCount, label: "Viewed" },
                  ].map(({ icon: Icon, count, label }) => (
                    <div key={label} className="text-center py-3 px-1">
                      <div className="font-bold text-foreground text-base">{count}</div>
                      <div className="text-[10px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Nav */}
                <nav className="p-2">
                  {navItems.map(({ to, tab: t, icon: Icon, label, badge }) => (
                    <Link
                      key={to}
                      to={to}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                        tab === t
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{label}</span>
                      {badge && <CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/8 transition-colors mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </nav>
              </div>
            </motion.aside>

            {/* ── Main Content ─────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="lg:col-span-9"
            >
              <Tabs value={tab} onValueChange={(v) => navigate(v === "activity" ? "/dashboard" : `/dashboard/${v}`)} className="space-y-5">
                <TabsList className="bg-card border border-border shadow-sm flex-wrap h-auto gap-1 p-1 rounded-xl">
                  <TabsTrigger value="activity" className="rounded-lg text-sm gap-1.5">
                    <LayoutDashboard className="w-3.5 h-3.5" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="downloads" className="rounded-lg text-sm gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Downloads
                  </TabsTrigger>
                  <TabsTrigger value="saved" className="rounded-lg text-sm gap-1.5">
                    <Bookmark className="w-3.5 h-3.5" /> Saved
                  </TabsTrigger>
                  <TabsTrigger value="convention" className="rounded-lg text-sm gap-1.5">
                    <Award className="w-3.5 h-3.5" /> Convention
                    {confirmedConvReg && <CheckCircle2 className="w-3 h-3 text-accent" />}
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="rounded-lg text-sm gap-1.5">
                    <Settings className="w-3.5 h-3.5" /> Settings
                  </TabsTrigger>
                </TabsList>

                {/* ── Overview ── */}
                <TabsContent value="activity" className="space-y-5">
                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: Eye, label: "Resources Viewed", count: viewedCount, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
                      { icon: Download, label: "Downloaded", count: downloadsCount, color: "text-accent", bg: "bg-accent/10" },
                      { icon: Bookmark, label: "Bookmarked", count: savedCount, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
                      { icon: Award, label: "Convention", count: confirmedConvReg ? "✓" : "—", color: confirmedConvReg ? "text-accent" : "text-muted-foreground", bg: confirmedConvReg ? "bg-accent/10" : "bg-muted" },
                    ].map(({ icon: Icon, label, count, color, bg }) => (
                      <div key={label} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                          <Icon className={`w-4.5 h-4.5 ${color}`} />
                        </div>
                        <div className={`text-2xl font-bold ${color}`}>{count}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Recently Viewed */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-accent" /> Recently Viewed
                      </h3>
                      <Link to="/library" className="text-xs text-accent hover:underline">Browse Library →</Link>
                    </div>
                    {viewsLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : recentlyViewed.length === 0 ? (
                      <div className="py-10 text-center px-5">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                          <Eye className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">No resources previewed yet.</p>
                        <Button asChild size="sm" variant="outline"><Link to="/library">Explore Library</Link></Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {recentlyViewed.slice(0, 5).map((item) => {
                          const resource = item.library_resources;
                          if (!resource) return null;
                          return (
                            <Link key={item.id} to={`/library/${resource.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors group">
                              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4 h-4 text-accent" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-foreground truncate">{resource.title}</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatRelative(new Date(item.viewed_at))}
                                  {resource.file_type && ` · ${resource.file_type.toUpperCase()}`}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground flex-shrink-0" />
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Recently Read Articles */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-accent" /> Recently Read Articles
                      </h3>
                      <Link to="/blog" className="text-xs text-accent hover:underline">Browse Blog →</Link>
                    </div>
                    {readsLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : recentlyRead.length === 0 ? (
                      <div className="py-10 text-center px-5">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                          <BookOpen className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">No articles read yet.</p>
                        <Button asChild size="sm" variant="outline"><Link to="/blog">Explore Blog</Link></Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {recentlyRead.map((item) => {
                          const post = item.blog_posts;
                          if (!post) return null;
                          return (
                            <Link key={item.id} to={`/blog/${post.slug}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors group">
                              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-4 h-4 text-accent" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-foreground truncate">{post.title}</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatRelative(new Date(item.viewed_at))}
                                  {post.read_time ? ` · ${post.read_time} min read` : ""}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground flex-shrink-0" />
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── Downloads ── */}
                <TabsContent value="downloads">
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="px-5 pt-5 pb-3 border-b border-border">
                      <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                        <Download className="w-4 h-4 text-accent" /> My Downloads
                        {!downloadsLoading && <Badge variant="secondary" className="ml-1">{downloadsCount}</Badge>}
                      </h3>
                    </div>
                    {downloadsLoading ? (
                      <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : downloads.length === 0 ? (
                      <div className="py-14 text-center px-5">
                        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                          <Download className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">No downloads yet</p>
                        <p className="text-xs text-muted-foreground mb-4">Resources you download will appear here.</p>
                        <Button asChild size="sm"><Link to="/library">Browse Library</Link></Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {downloads.map((item) => {
                          const r = item.library_resources;
                          if (!r) return null;
                          return (
                            <div key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                <Download className="w-4 h-4 text-accent" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-foreground truncate">{r.title}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {formatRelative(new Date(item.downloaded_at))}
                                  {r.file_type && ` · ${r.file_type.toUpperCase()}`}
                                </p>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => window.open(r.file_url, "_blank")}>
                                Re-download
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── Saved ── */}
                <TabsContent value="saved">
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="px-5 pt-5 pb-3 border-b border-border">
                      <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                        <Bookmark className="w-4 h-4 text-accent" /> Saved Resources
                        {!savedLoading && <Badge variant="secondary" className="ml-1">{savedCount}</Badge>}
                      </h3>
                    </div>
                    {savedLoading ? (
                      <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : saved.length === 0 ? (
                      <div className="py-14 text-center px-5">
                        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                          <Bookmark className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">No saved resources</p>
                        <p className="text-xs text-muted-foreground mb-4">Bookmark resources to find them quickly later.</p>
                        <Button asChild size="sm"><Link to="/library">Browse Library</Link></Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {saved.map((item) => {
                          const r = item.library_resources;
                          if (!r) return null;
                          const cat = (r as { categories?: { name?: string } }).categories;
                          return (
                            <div key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                <Bookmark className="w-4 h-4 text-accent" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-foreground truncate">{r.title}</h4>
                                {cat?.name && <Badge variant="secondary" className="mt-1 text-[10px]">{cat.name}</Badge>}
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button asChild variant="outline" size="sm"><Link to={`/library/${r.id}`}>View</Link></Button>
                                <Button variant="ghost" size="sm" onClick={() => removeSaved(item.id)} className="text-muted-foreground hover:text-destructive">Remove</Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ── Convention ── */}
                <TabsContent value="convention" className="space-y-5">
                  {convLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  ) : conventionRegs.length === 0 ? (
                    <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <Award className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">Not registered yet</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
                        Secure your spot at the NUASA National Convention as a Student, Graduate, or Chapter.
                      </p>
                      <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                        <Link to="/convention">Register Now</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {conventionRegs.map((r: any) => {
                        const isConfirmed = r.payment_status === "successful";
                        const categoryLabel = REGISTRATION_LABELS[r.registration_type] || r.registration_type;
                        return (
                          <div key={r.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                            {/* Status bar */}
                            <div className={`px-6 py-3 flex items-center justify-between ${isConfirmed ? "bg-accent/10 border-b border-accent/20" : "bg-muted border-b border-border"}`}>
                              <div className="flex items-center gap-2">
                                {isConfirmed
                                  ? <CheckCircle2 className="w-4 h-4 text-accent" />
                                  : <AlertCircle className="w-4 h-4 text-muted-foreground" />}
                                <span className={`text-sm font-semibold ${isConfirmed ? "text-accent" : "text-muted-foreground"}`}>
                                  {isConfirmed ? "Registration Confirmed" : `Payment ${r.payment_status}`}
                                </span>
                              </div>
                              {/* Category badge — prominent, no amount */}
                              <Badge className={`${isConfirmed ? "bg-accent text-accent-foreground" : "bg-muted-foreground/20 text-foreground"} px-3 py-1 text-xs font-semibold rounded-full`}>
                                <GraduationCap className="w-3 h-3 mr-1.5" />
                                {categoryLabel}
                              </Badge>
                            </div>

                            <div className="p-6 space-y-5">
                              {/* Registration ID */}
                              <div className="text-center">
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 font-medium">Convention Registration ID</p>
                                <div className="font-mono text-lg font-bold tracking-wider bg-muted rounded-xl py-3 px-4 text-primary border border-border">
                                  {r.reference_code}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1.5">Present this ID at the convention check-in desk</p>
                              </div>

                              {/* Details grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                  { label: "Full Name", value: r.full_name },
                                  { label: "Email", value: r.email },
                                  { label: "Phone", value: r.phone },
                                  r.institution && { label: "Institution", value: r.institution },
                                ].filter(Boolean).map((field: any) => (
                                  <div key={field.label} className="bg-muted/40 rounded-xl p-3">
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">{field.label}</p>
                                    <p className="text-sm font-medium text-foreground truncate">{field.value}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Breakout session — highlighted */}
                              {r.breakout_session && (
                                <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3.5 flex items-start gap-3">
                                  <Sparkles className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-[10px] text-accent font-semibold uppercase tracking-wider mb-0.5">Your Breakout Session</p>
                                    <p className="text-sm font-semibold text-foreground">{r.breakout_session}</p>
                                  </div>
                                </div>
                              )}

                              <div className="text-xs text-muted-foreground border-t border-border pt-3">
                                Registered on {r.created_at ? new Date(r.created_at).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                              </div>

                              {isConfirmed && (
                                <Button asChild variant="outline" size="sm" className="w-full">
                                  <Link to="/convention">View Full Receipt & Print</Link>
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* ── Settings ── */}
                <TabsContent value="settings" className="space-y-5">

                  {/* Passport / Profile Photo */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="px-6 pt-5 pb-3 border-b border-border">
                      <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                        <Camera className="w-4 h-4 text-accent" /> Passport Photo
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Upload a clear passport-style photo. JPG, PNG or WEBP · max 5 MB.</p>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-5">
                        {/* Preview */}
                        <div className="relative flex-shrink-0">
                          <div className="w-20 h-20 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
                            {avatarPreview || profile?.avatar_url ? (
                              <img
                                src={avatarPreview || profile!.avatar_url!}
                                alt="Passport photo"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-9 h-9 text-muted-foreground/50" />
                            )}
                          </div>
                          {avatarUploading && (
                            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                        {/* Upload button */}
                        <div className="flex-1">
                          <label htmlFor="avatar-upload" className="cursor-pointer">
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted hover:bg-muted/70 text-sm font-medium transition-colors ${avatarUploading ? "opacity-50 pointer-events-none" : ""}`}>
                              <Camera className="w-4 h-4 text-accent" />
                              {avatarPreview || profile?.avatar_url ? "Change photo" : "Upload photo"}
                            </div>
                            <input
                              id="avatar-upload"
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              className="sr-only"
                              onChange={handleAvatarChange}
                              disabled={avatarUploading}
                            />
                          </label>
                          <p className="text-xs text-muted-foreground mt-2">
                            Your photo appears on your profile and convention badge.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile Information */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="px-6 pt-5 pb-3 border-b border-border">
                      <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-accent" /> Profile Information
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Update the details shown on your dashboard.</p>
                    </div>
                    <div className="p-6">
                      <form onSubmit={(e) => { e.preventDefault(); saveProfile.mutate(); }} className="space-y-5 max-w-xl">
                        <div className="space-y-2">
                          <Label htmlFor="full_name">Full Name</Label>
                          <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" value={profile?.email || ""} disabled className="bg-muted/50" />
                          <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="institution">Institution</Label>
                            <Input id="institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="e.g. University of Lagos" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="level">Academic Level</Label>
                            <Select value={form.academic_level} onValueChange={(v) => setForm({ ...form, academic_level: v })}>
                              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                              <SelectContent>
                                {["100 Level","200 Level","300 Level","400 Level","500 Level","Postgraduate"].map((l) => (
                                  <SelectItem key={l} value={l}>{l}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button type="submit" disabled={saveProfile.isPending} className="gap-2">
                          {saveProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save changes
                        </Button>
                      </form>
                    </div>
                  </div>

                  {/* Change Password */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="px-6 pt-5 pb-3 border-b border-border">
                      <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                        <KeyRound className="w-4 h-4 text-accent" /> Change Password
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Choose a new password for your account. At least 8 characters.</p>
                    </div>
                    <div className="p-6">
                      <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
                        <div className="space-y-2">
                          <Label htmlFor="new-pw">New Password</Label>
                          <div className="relative">
                            <Input
                              id="new-pw"
                              type={showPw ? "text" : "password"}
                              placeholder="••••••••"
                              value={pwForm.newPw}
                              onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                              className="pr-10"
                              minLength={8}
                              required
                              disabled={pwLoading}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPw(!showPw)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-pw">Confirm New Password</Label>
                          <Input
                            id="confirm-pw"
                            type={showPw ? "text" : "password"}
                            placeholder="••••••••"
                            value={pwForm.confirmPw}
                            onChange={(e) => setPwForm({ ...pwForm, confirmPw: e.target.value })}
                            minLength={8}
                            required
                            disabled={pwLoading}
                          />
                        </div>
                        <Button type="submit" disabled={pwLoading} className="gap-2">
                          {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                          Update password
                        </Button>
                      </form>
                    </div>
                  </div>

                  {/* Account / Sign out */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="px-6 pt-5 pb-3 border-b border-border">
                      <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                        <Shield className="w-4 h-4 text-accent" /> Account
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Manage your account session.</p>
                    </div>
                    <div className="p-6">
                      <Button variant="destructive" onClick={handleLogout} className="gap-2">
                        <LogOut className="w-4 h-4" /> Sign Out
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UserDashboard;
