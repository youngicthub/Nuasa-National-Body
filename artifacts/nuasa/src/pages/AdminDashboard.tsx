import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import nuasaLogo from "@/assets/nuasa-logo.jpeg";
import {
  BookOpen,
  FileText,
  Users,
  Upload,
  Settings,
  LogOut,
  Plus,
  MoreHorizontal,
  Eye,
  EyeOff,
  Download,
  Edit,
  Trash2,
  BarChart3,
  Loader2,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Globe,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, resources, posts, downloads] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("library_resources").select("id", { count: "exact", head: true }),
        supabase.from("blog_posts").select("id", { count: "exact", head: true }),
        supabase.from("library_resources").select("download_count"),
      ]);
      const totalDownloads = (downloads.data || []).reduce(
        (sum, r) => sum + (r.download_count || 0),
        0
      );
      return {
        users: users.count || 0,
        resources: resources.count || 0,
        posts: posts.count || 0,
        downloads: totalDownloads,
      };
    },
  });

  const { data: recentResources, isLoading: resourcesLoading } = useQuery({
    queryKey: ["admin-recent-resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_resources")
        .select("id, title, download_count, is_public, category:categories(name)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: recentPosts, isLoading: postsLoading } = useQuery({
    queryKey: ["admin-recent-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, views, status")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: mostViewed, isLoading: mostViewedLoading } = useQuery({
    queryKey: ["admin-most-viewed-resources"],
    queryFn: async () => {
      // Aggregate views from resource_views (last 30 days window for trending)
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const { data: views, error: viewsError } = await supabase
        .from("resource_views")
        .select("resource_id, viewed_at")
        .gte("viewed_at", since.toISOString());
      if (viewsError) throw viewsError;

      const counts = new Map<string, { total: number; unique: Set<string>; last: string }>();
      const allViews = views || [];
      // We also need user_id for unique counts — refetch with user_id
      const { data: viewsWithUser, error: e2 } = await supabase
        .from("resource_views")
        .select("resource_id, user_id, viewed_at")
        .gte("viewed_at", since.toISOString())
        .order("viewed_at", { ascending: false });
      if (e2) throw e2;

      (viewsWithUser || []).forEach((v) => {
        const entry = counts.get(v.resource_id) || { total: 0, unique: new Set<string>(), last: v.viewed_at };
        entry.total += 1;
        entry.unique.add(v.user_id);
        if (v.viewed_at > entry.last) entry.last = v.viewed_at;
        counts.set(v.resource_id, entry);
      });

      const ranked = Array.from(counts.entries())
        .map(([resource_id, v]) => ({
          resource_id,
          total: v.total,
          uniqueUsers: v.unique.size,
          last: v.last,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      if (!ranked.length) return [];

      const ids = ranked.map((r) => r.resource_id);
      const { data: resources, error: rErr } = await supabase
        .from("library_resources")
        .select("id, title, category:categories(name)")
        .in("id", ids);
      if (rErr) throw rErr;

      const byId = new Map((resources || []).map((r) => [r.id, r]));
      const maxTotal = ranked[0]?.total || 1;

      return ranked.map((r) => ({
        ...r,
        title: byId.get(r.resource_id)?.title || "Untitled resource",
        category: byId.get(r.resource_id)?.category?.name || "Uncategorized",
        percent: Math.round((r.total / maxTotal) * 100),
      }));
    },
  });

  const handleDeletePost = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Post deleted");
    queryClient.invalidateQueries({ queryKey: ["admin-recent-posts"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const handleTogglePostStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("blog_posts")
      .update({
        status: newStatus,
        published_at: newStatus === "published" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(newStatus === "published" ? "Post published — now visible to users" : "Post unpublished — hidden from users");
    queryClient.invalidateQueries({ queryKey: ["admin-recent-posts"] });
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm("Delete this resource?")) return;
    const { error } = await supabase.from("library_resources").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Resource deleted");
    queryClient.invalidateQueries({ queryKey: ["admin-recent-resources"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const handleToggleResourceVisibility = async (id: string, currentIsPublic: boolean) => {
    const { error } = await supabase
      .from("library_resources")
      .update({ is_public: !currentIsPublic })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(!currentIsPublic ? "Resource published — visible to everyone" : "Resource unpublished — hidden from public");
    queryClient.invalidateQueries({ queryKey: ["admin-recent-resources"] });
  };

  const statCards = [
    { label: "Total Users", value: stats?.users ?? 0, icon: Users, color: "text-blue-500" },
    { label: "Resources", value: stats?.resources ?? 0, icon: BookOpen, color: "text-green-500" },
    { label: "Blog Posts", value: stats?.posts ?? 0, icon: FileText, color: "text-purple-500" },
    { label: "Downloads", value: stats?.downloads ?? 0, icon: Download, color: "text-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar />

        <main className="flex-1 ml-64 p-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-serif text-3xl font-bold text-foreground mb-1">
                  Dashboard
                </h1>
                <p className="text-muted-foreground">
                  Welcome back, Admin! Here's what's happening with NUASA.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button asChild variant="outline">
                  <Link to="/admin/posts/new" className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Post
                  </Link>
                </Button>
                <Button asChild className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link to="/admin/resources/new">
                    <Upload className="w-4 h-4" />
                    Upload Resource
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card rounded-2xl border border-border p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {stat.value.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card rounded-2xl border border-border mb-8"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Most Viewed Resources</h3>
                    <p className="text-xs text-muted-foreground">Top 5 by previews in the last 30 days</p>
                  </div>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/resources">View All</Link>
                </Button>
              </div>
              {mostViewedLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              ) : !mostViewed?.length ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No resource views recorded yet. Once users start previewing resources, you'll see analytics here.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {mostViewed.map((item, idx) => (
                    <div key={item.resource_id} className="p-4 flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <Link
                            to={`/library/${item.resource_id}`}
                            className="font-medium text-foreground hover:text-accent truncate"
                          >
                            {item.title}
                          </Link>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {item.total.toLocaleString()} views
                            </span>
                            <span className="hidden sm:flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {item.uniqueUsers} {item.uniqueUsers === 1 ? "user" : "users"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all"
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            <Tabs defaultValue="resources" className="space-y-6">
              <TabsList className="bg-muted">
                <TabsTrigger value="resources">Recent Resources</TabsTrigger>
                <TabsTrigger value="posts">Recent Posts</TabsTrigger>
              </TabsList>

              <TabsContent value="resources">
                <div className="bg-card rounded-2xl border border-border">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">E-Library Resources</h3>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/admin/resources">View All</Link>
                    </Button>
                  </div>
                  {resourcesLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-accent" />
                    </div>
                  ) : !recentResources?.length ? (
                    <div className="py-12 text-center text-muted-foreground">
                      No resources yet. Upload your first one!
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Downloads</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentResources.map((resource) => (
                          <TableRow key={resource.id}>
                            <TableCell className="font-medium">
                              <Link to={`/library/${resource.id}`} className="hover:text-accent">
                                {resource.title}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {resource.category?.name || "Uncategorized"}
                              </Badge>
                            </TableCell>
                            <TableCell>{(resource.download_count || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={resource.is_public ? "default" : "secondary"}>
                                {resource.is_public ? "Public" : "Private"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link to={`/library/${resource.id}`}>
                                      <Eye className="w-4 h-4 mr-2" />
                                      View
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleToggleResourceVisibility(resource.id, !!resource.is_public)}
                                  >
                                    {resource.is_public ? (
                                      <>
                                        <EyeOff className="w-4 h-4 mr-2" />
                                        Unpublish
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Publish
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeleteResource(resource.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="posts">
                <div className="bg-card rounded-2xl border border-border">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Blog Posts</h3>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/admin/posts">View All</Link>
                    </Button>
                  </div>
                  {postsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-accent" />
                    </div>
                  ) : !recentPosts?.length ? (
                    <div className="py-12 text-center text-muted-foreground">
                      No posts yet. Create your first one!
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Views</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentPosts.map((post) => (
                          <TableRow key={post.id}>
                            <TableCell className="font-medium">{post.title}</TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {(post.views || 0).toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={post.status === "published" ? "default" : "secondary"}>
                                {post.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link to={`/admin/posts/${post.id}/edit`}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleTogglePostStatus(post.id, post.status)}
                                  >
                                    {post.status === "published" ? (
                                      <>
                                        <EyeOff className="w-4 h-4 mr-2" />
                                        Unpublish
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Publish
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleDeletePost(post.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
