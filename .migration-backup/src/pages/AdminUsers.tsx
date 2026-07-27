import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import nuasaLogo from "@/assets/nuasa-logo.jpeg";
import {
  BookOpen, FileText, Users, Upload, Settings, LogOut, BarChart3,
  Calendar, Loader2, Globe, Search, Shield, Trash2, Ticket,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const AdminUsers = () => {
  const navigate = useNavigate();
  const { signOut, user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("id, user_id, full_name, email, institution, academic_level, avatar_url, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));
      return (profiles || []).map(p => ({ ...p, role: roleMap.get(p.user_id) || "user" }));
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase().trim();
    if (!q) return data;
    return data.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.institution?.toLowerCase().includes(q)
    );
  }, [data, search]);

  const adminCount = data?.filter(u => u.role === "admin").length ?? 0;

  const handleLogout = async () => { await signOut(); navigate("/admin/login"); };

  const handleDelete = async (userId: string) => {
    setDeletingId(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: userId } });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any).error);
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin-users-list"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar />

        <main className="flex-1 ml-64 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Registered Users</h1>
              <p className="text-muted-foreground">All accounts created on the platform.</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-card rounded-xl border border-border px-5 py-3">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-xl font-bold">{data?.length ?? 0}</div>
              </div>
              <div className="bg-card rounded-xl border border-border px-5 py-3">
                <div className="text-xs text-muted-foreground">Admins</div>
                <div className="text-xl font-bold">{adminCount}</div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or institution..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 focus-visible:ring-0 shadow-none"
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
            ) : !filtered.length ? (
              <div className="py-20 text-center text-muted-foreground">No users found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="text-sm">{u.institution || "—"}</TableCell>
                      <TableCell className="text-sm">{u.academic_level || "—"}</TableCell>
                      <TableCell>
                        {u.role === "admin" ? (
                          <Badge className="gap-1"><Shield className="w-3 h-3" /> Admin</Badge>
                        ) : (
                          <Badge variant="outline">User</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(u.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {u.user_id !== currentUser?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deletingId === u.user_id}>
                                {deletingId === u.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This permanently removes {u.full_name} ({u.email}), their profile and role. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(u.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminUsers;