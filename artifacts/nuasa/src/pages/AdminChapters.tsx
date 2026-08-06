import { useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { motion } from "framer-motion";
import {
  Building2,
  Trash2,
  Loader2,
  Plus,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChapterUploadForm } from "@/components/admin/ChapterUploadForm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dbClient } from "@/lib/db-client";
import { toast } from "sonner";

type Chapter = {
  id: string;
  name: string;
  university: string;
  slug: string;
  description?: string | null;
  location?: string | null;
  established_year?: number | null;
  member_count?: number;
  contact_email?: string | null;
  group_picture_url?: string | null;
  is_active: boolean;
  display_order?: number | null;
  created_at?: string;
};

const AdminChapters = () => {
  const queryClient = useQueryClient();
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editForm, setEditForm] = useState<Partial<Chapter>>({});
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: chapters, isLoading } = useQuery({
    queryKey: ["admin-chapters"],
    queryFn: async () => {
      const { data, error } = await dbClient
        .from("chapters")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Chapter[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-chapters"] });
    queryClient.invalidateQueries({ queryKey: ["chapters"] });
  };

  const openEdit = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setEditForm({
      name: chapter.name,
      university: chapter.university,
      description: chapter.description || "",
      location: chapter.location || "",
      established_year: chapter.established_year ?? undefined,
      member_count: chapter.member_count ?? 0,
      contact_email: chapter.contact_email || "",
      is_active: chapter.is_active,
      display_order: chapter.display_order ?? undefined,
    });
  };

  const handleUpdate = async () => {
    if (!editingChapter) return;
    setSaving(true);
    try {
      const { error } = await (dbClient as any)
        .from("chapters")
        .update({
          name: editForm.name,
          university: editForm.university,
          description: editForm.description || null,
          location: editForm.location || null,
          established_year: editForm.established_year || null,
          member_count: editForm.member_count || 0,
          contact_email: editForm.contact_email || null,
          is_active: editForm.is_active,
          display_order: editForm.display_order ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingChapter.id);

      if (error) throw error;
      toast.success("Chapter updated");
      setEditingChapter(null);
      invalidate();
    } catch (e: any) {
      toast.error(e.message || "Failed to update chapter");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, imageUrl: string | null | undefined) => {
    if (!confirm("Delete this chapter? This cannot be undone.")) return;
    try {
      const { error } = await dbClient.from("chapters").delete().eq("id", id);
      if (error) throw error;
      toast.success("Chapter deleted");
      invalidate();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete chapter");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 ml-64 p-4 md:p-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Manage Chapters</h1>
                <p className="text-muted-foreground">
                  Add, edit, and manage university chapters shown on the public Chapters page.
                </p>
              </div>
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="w-4 h-4" />
                {showAddForm ? "Hide Form" : "Add Chapter"}
              </Button>
            </div>

            {/* Add form — collapsible */}
            {showAddForm && (
              <div className="bg-card rounded-2xl border border-border p-6 mb-8">
                <h2 className="font-serif text-xl font-bold text-foreground mb-4">Add New Chapter</h2>
                <ChapterUploadForm
                  onSuccess={() => {
                    invalidate();
                    setShowAddForm(false);
                  }}
                />
              </div>
            )}

            {/* Chapter list */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <h2 className="font-serif text-xl font-bold text-foreground mb-4 px-2">
                Chapters ({chapters?.length || 0})
              </h2>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              ) : !chapters?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No chapters yet. Click "Add Chapter" to create the first one.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/50 transition-colors"
                    >
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">
                        {chapter.group_picture_url ? (
                          <img
                            src={chapter.group_picture_url}
                            alt={chapter.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{chapter.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{chapter.university}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {!chapter.is_active && (
                            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">
                              Hidden
                            </span>
                          )}
                          {chapter.location && (
                            <span className="text-xs text-muted-foreground">{chapter.location}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => openEdit(chapter)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(chapter.id, chapter.group_picture_url)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </main>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingChapter} onOpenChange={(open) => { if (!open) setEditingChapter(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Chapter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Chapter Name *</Label>
                <Input
                  value={editForm.name || ""}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label>University *</Label>
                <Input
                  value={editForm.university || ""}
                  onChange={(e) => setEditForm({ ...editForm, university: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={editForm.description || ""}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Location</Label>
                <Input
                  value={editForm.location || ""}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder="e.g. Lagos, Nigeria"
                />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={editForm.contact_email || ""}
                  onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Est. Year</Label>
                <Input
                  type="number"
                  value={editForm.established_year || ""}
                  onChange={(e) => setEditForm({ ...editForm, established_year: parseInt(e.target.value) || undefined })}
                />
              </div>
              <div>
                <Label>Members</Label>
                <Input
                  type="number"
                  value={editForm.member_count ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, member_count: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={editForm.display_order ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, display_order: parseInt(e.target.value) || undefined })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="font-medium">Active</Label>
                <p className="text-xs text-muted-foreground">Show on public Chapters page</p>
              </div>
              <Switch
                checked={editForm.is_active ?? true}
                onCheckedChange={(v) => setEditForm({ ...editForm, is_active: v })}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditingChapter(null)}>Cancel</Button>
              <Button
                onClick={handleUpdate}
                disabled={saving || !editForm.name || !editForm.university}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminChapters;
