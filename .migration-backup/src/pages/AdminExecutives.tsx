import { useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, User } from "lucide-react";
import { z } from "zod";

type Executive = {
  id: string;
  full_name: string;
  position: string;
  bio: string | null;
  image_url: string | null;
  email: string | null;
  phone: string | null;
  sort_order: number;
  is_active: boolean;
};

const blank: Omit<Executive, "id"> = {
  full_name: "",
  position: "",
  bio: "",
  image_url: "",
  email: "",
  phone: "",
  sort_order: 0,
  is_active: true,
};

const normalizeOptionalText = (value: string | null) => {
  const trimmed = (value || "").trim();
  return trimmed || null;
};

const normalizeExecutivePhone = (value: string | null) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return `+234${digits.slice(1)}`;
  if (digits.length === 13 && digits.startsWith("234")) return `+${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return trimmed;
};

const isValidOptionalPhone = (value: string | null) => !value || /^\+[1-9]\d{7,14}$/.test(value);

const executiveSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(120, "Full name is too long"),
  position: z.string().trim().min(2, "Position / portfolio is required").max(120, "Position is too long"),
  bio: z.string().trim().max(600, "Bio is too long").transform((value) => value || null),
  image_url: z.string().trim().url("Image URL is invalid").or(z.literal("")).nullable().transform(normalizeOptionalText),
  email: z.string().trim().toLowerCase().email("Enter a valid email").or(z.literal("")).nullable().transform(normalizeOptionalText),
  phone: z.string().nullable().transform(normalizeExecutivePhone).refine(isValidOptionalPhone, "Enter a valid phone number"),
  sort_order: z.coerce.number().int().min(0).max(999),
  is_active: z.boolean(),
});

const setupMessage = (message: string) => {
  const lower = message.toLowerCase();
  if (
    lower.includes("relation \"public.executives\" does not exist") ||
    lower.includes("could not find the table") ||
    lower.includes("bucket not found") ||
    lower.includes("row-level security") ||
    lower.includes("permission denied")
  ) {
    return "Executives setup is not active yet. Run database/2026_06_16_delegates_and_executives.sql in your SQL Editor, then try again.";
  }
  return message;
};

const AdminExecutives = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Executive | null>(null);
  const [form, setForm] = useState<Omit<Executive, "id">>(blank);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-executives"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("executives")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as Executive[];
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm(blank);
    setFile(null);
    setOpen(true);
  };

  const openEdit = (e: Executive) => {
    setEditing(e);
    setForm({
      full_name: e.full_name,
      position: e.position,
      bio: e.bio || "",
      image_url: e.image_url || "",
      email: e.email || "",
      phone: e.phone || "",
      sort_order: e.sort_order,
      is_active: e.is_active,
    });
    setFile(null);
    setOpen(true);
  };

  const handleSave = async () => {
    const parsed = executiveSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Please check the executive details");
      return;
    }
    setSaving(true);
    try {
      let image_url = parsed.data.image_url;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("executives").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("executives").getPublicUrl(path);
        image_url = pub.publicUrl;
      }

      const payload = { ...parsed.data, image_url, updated_at: new Date().toISOString() };

      if (editing) {
        const { error } = await (supabase as any).from("executives").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Executive updated");
      } else {
        const { error } = await (supabase as any).from("executives").insert(payload);
        if (error) throw error;
        toast.success("Executive added");
      }

      qc.invalidateQueries({ queryKey: ["admin-executives"] });
      qc.invalidateQueries({ queryKey: ["public-executives"] });
      setOpen(false);
    } catch (e: any) {
      toast.error(setupMessage(e.message || "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: Executive) => {
    if (!confirm(`Remove ${e.full_name}?`)) return;
    const { error } = await (supabase as any).from("executives").delete().eq("id", e.id);
    if (error) { toast.error(setupMessage(error.message)); return; }
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["admin-executives"] });
    qc.invalidateQueries({ queryKey: ["public-executives"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 ml-64 p-4 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Executives</h1>
              <p className="text-muted-foreground">Manage the National Executives shown on the public Executives page.</p>
            </div>
            <Button onClick={openNew} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="w-4 h-4" /> Add Executive
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
          ) : !data?.length ? (
            <Card className="p-10 text-center text-muted-foreground">
              No executives yet. Click "Add Executive" to add the first one.
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map(e => (
                <Card key={e.id} className="overflow-hidden">
                  <div className="aspect-[4/3] bg-muted overflow-hidden">
                    {e.image_url ? (
                      <img src={e.image_url} alt={e.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <User className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{e.full_name}</h3>
                        <p className="text-xs text-accent">{e.position}</p>
                      </div>
                      {!e.is_active && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">Hidden</span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEdit(e)}>
                        <Pencil className="w-3 h-3" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(e)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Executive" : "Add Executive"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div>
                  <Label>Position / Portfolio *</Label>
                  <Input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="e.g. Vice President, General Secretary" />
                </div>
                <div>
                  <Label>Photo</Label>
                  <Input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
                  {form.image_url && !file && (
                    <img src={form.image_url} alt="" className="mt-2 w-24 h-24 object-cover rounded" />
                  )}
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea value={form.bio || ""} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <Label>Sort Order</Label>
                    <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-2">
                    <Label className="text-sm">Active</Label>
                    <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Update" : "Add"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
};

export default AdminExecutives;
