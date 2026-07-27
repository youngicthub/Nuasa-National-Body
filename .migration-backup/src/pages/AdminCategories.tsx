import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, FileText, Upload, Settings, LogOut, BarChart3, Shield,
  ArrowLeft, Calendar, Trash2, Loader2, Building2, FolderTree, Pencil, Check, X, Ticket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

const AdminCategories = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "", description: "", type: "library" });
  const [form, setForm] = useState({ name: "", description: "", type: "library" });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleLogout = async () => { await signOut(); navigate("/admin/login"); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    setSubmitting(true);
    const { error } = await supabase.from("categories").insert({
      name: form.name.trim(),
      slug: slugify(form.name),
      description: form.description || null,
      type: form.type,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Category added");
    setForm({ name: "", description: "", type: "library" });
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    queryClient.invalidateQueries({ queryKey: ["library-categories"] });
  };

  const startEdit = (c: any) => {
    setEditingId(c.id);
    setEditForm({ name: c.name, slug: c.slug, description: c.description || "", type: c.type });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim()) return toast.error("Name is required");
    const { error } = await supabase.from("categories").update({
      name: editForm.name.trim(),
      slug: editForm.slug.trim() || slugify(editForm.name),
      description: editForm.description || null,
      type: editForm.type,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Category updated");
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    queryClient.invalidateQueries({ queryKey: ["library-categories"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Category deleted");
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    queryClient.invalidateQueries({ queryKey: ["library-categories"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar />

        <main className="flex-1 ml-64 p-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-4 mb-8">
              <Button asChild variant="ghost" size="icon">
                <Link to="/admin/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
              </Button>
              <div>
                <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Manage Categories</h1>
                <p className="text-muted-foreground">Add, edit and remove library and blog categories</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h2 className="font-serif text-xl font-bold text-foreground mb-4">Add New Category</h2>
                <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                  </div>
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="library">Library</SelectItem>
                        <SelectItem value="blog">Blog</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Add Category
                  </Button>
                </form>
              </div>

              <div>
                <h2 className="font-serif text-xl font-bold text-foreground mb-4">All Categories ({categories?.length || 0})</h2>
                <div className="bg-card rounded-2xl border border-border p-4 max-h-[800px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
                  ) : !categories || categories.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p>No categories yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {categories.map((c) => (
                        <div key={c.id} className="p-3 rounded-lg border border-border hover:border-accent transition-colors">
                          {editingId === c.id ? (
                            <div className="space-y-2">
                              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Name" />
                              <Input value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })} placeholder="slug" />
                              <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" rows={2} />
                              <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="library">Library</SelectItem>
                                  <SelectItem value="blog">Blog</SelectItem>
                                  <SelectItem value="both">Both</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => saveEdit(c.id)} className="bg-accent text-accent-foreground hover:bg-accent/90"><Check className="w-4 h-4" /></Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-foreground truncate">{c.name}</p>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">{c.type}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">/{c.slug}</p>
                                {c.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => startEdit(c)}><Pencil className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          )}
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

export default AdminCategories;