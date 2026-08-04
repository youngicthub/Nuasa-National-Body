import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Trash2, Loader2, FolderTree, Pencil, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: "library" | "blog" | "both";
  created_at: string;
}

type CategoryForm = { name: string; description: string; type: string };
type EditForm     = CategoryForm & { slug: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

const TYPE_LABEL: Record<string, string> = {
  library: "Library",
  blog: "Blog",
  both: "Both",
};

const TYPE_COLOR: Record<string, string> = {
  library: "bg-blue-500/10 text-blue-600",
  blog:    "bg-emerald-500/10 text-emerald-600",
  both:    "bg-accent/10 text-accent",
};

// ── Data helpers using /api/data/:table ──────────────────────────────────────

async function fetchCategories(): Promise<Category[]> {
  const res = await apiFetch<{ data: Category[] }>("/data/categories?order=name");
  return res.data ?? [];
}

async function createCategory(body: Omit<Category, "id" | "created_at">) {
  const res = await apiFetch<{ data: Category; error: null }>("/data/categories", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if ((res as any).error) throw new Error((res as any).error.message);
  return res.data;
}

async function updateCategory(id: string, body: Partial<Omit<Category, "id" | "created_at">>) {
  await apiFetch(`/data/categories?eq.id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

async function deleteCategory(id: string) {
  await apiFetch(`/data/categories?eq.id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ── Component ────────────────────────────────────────────────────────────────

const EMPTY_FORM: CategoryForm = { name: "", description: "", type: "library" };

const AdminCategories = () => {
  const queryClient = useQueryClient();

  const [form, setForm]           = useState<CategoryForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm]   = useState<EditForm>({ name: "", slug: "", description: "", type: "library" });

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    queryFn: fetchCategories,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    queryClient.invalidateQueries({ queryKey: ["library-categories"] });
    queryClient.invalidateQueries({ queryKey: ["blog-categories"] });
  };

  // ── Mutations ───────────────────────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: () =>
      createCategory({
        name:        form.name.trim(),
        slug:        slugify(form.name),
        description: form.description.trim() || null,
        type:        form.type as Category["type"],
      }),
    onSuccess: () => {
      toast.success("Category added");
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to add category"),
  });

  const editMutation = useMutation({
    mutationFn: (id: string) =>
      updateCategory(id, {
        name:        editForm.name.trim(),
        slug:        editForm.slug.trim() || slugify(editForm.name),
        description: editForm.description.trim() || null,
        type:        editForm.type as Category["type"],
      }),
    onSuccess: () => {
      toast.success("Category updated");
      setEditingId(null);
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update category"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => { toast.success("Category deleted"); invalidate(); },
    onError:   (err: Error) => toast.error(err.message || "Failed to delete category"),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return void toast.error("Name is required");
    addMutation.mutate();
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditForm({ name: c.name, slug: c.slug, description: c.description ?? "", type: c.type });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this category? Resources/posts in this category will become uncategorised.")) return;
    deleteMutation.mutate(id);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar />

        <main className="flex-1 ml-64 p-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Button asChild variant="ghost" size="icon">
                <Link to="/admin/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
              </Button>
              <div>
                <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Manage Categories</h1>
                <p className="text-muted-foreground">Add, edit and remove Library and Blog categories</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">

              {/* ── Add Form ─────────────────────────────────────────────── */}
              <div>
                <h2 className="font-serif text-xl font-bold text-foreground mb-4">Add New Category</h2>
                <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">

                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. National Magazine"
                      required
                    />
                    {form.name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Slug: <span className="font-mono">{slugify(form.name)}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Short description (optional)"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Visible in</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="library">E-Library only</SelectItem>
                        <SelectItem value="blog">Blog only</SelectItem>
                        <SelectItem value="both">Both E-Library &amp; Blog</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    disabled={addMutation.isPending}
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Add Category
                  </Button>
                </form>

                {/* Legend */}
                <div className="mt-4 bg-muted/40 rounded-xl p-4 text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground mb-2">Category types</p>
                  <p><span className="font-mono bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded text-xs">Library</span> — shows in the E-Library sidebar filter</p>
                  <p><span className="font-mono bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded text-xs">Blog</span> — shows in the Blog sidebar filter</p>
                  <p><span className="font-mono bg-accent/10 text-accent px-1.5 py-0.5 rounded text-xs">Both</span> — appears in both</p>
                </div>
              </div>

              {/* ── Category List ─────────────────────────────────────────── */}
              <div>
                <h2 className="font-serif text-xl font-bold text-foreground mb-4">
                  All Categories <span className="text-muted-foreground font-normal text-base">({categories.length})</span>
                </h2>

                <div className="bg-card rounded-2xl border border-border p-4 max-h-[800px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-accent" />
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p>No categories yet. Add one on the left.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {categories.map((c) => (
                        <div key={c.id} className="p-3 rounded-lg border border-border hover:border-accent/50 transition-colors">

                          {/* ── Edit mode ─── */}
                          {editingId === c.id ? (
                            <div className="space-y-2">
                              <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                placeholder="Name"
                              />
                              <Input
                                value={editForm.slug}
                                onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                                placeholder="slug (auto-generated if blank)"
                              />
                              <Textarea
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                placeholder="Description"
                                rows={2}
                              />
                              <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="library">E-Library only</SelectItem>
                                  <SelectItem value="blog">Blog only</SelectItem>
                                  <SelectItem value="both">Both E-Library &amp; Blog</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => editMutation.mutate(c.id)}
                                  disabled={editMutation.isPending}
                                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                                >
                                  {editMutation.isPending
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Check className="w-4 h-4" />}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                          ) : (
                            /* ── View mode ─── */
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-foreground truncate">{c.name}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[c.type] ?? "bg-muted text-muted-foreground"}`}>
                                    {TYPE_LABEL[c.type] ?? c.type}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground font-mono">/{c.slug}</p>
                                {c.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                                )}
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => startEdit(c)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(c.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
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
