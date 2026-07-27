import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, FileText, Users, Upload, Settings, LogOut, BarChart3, Shield,
  ArrowLeft, Calendar, Trash2, Loader2, Building2, Eye, EyeOff, Ticket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const AdminEvents = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", location: "", cover_image: "",
    link: "", start_time: "", end_time: "", is_published: true,
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events").select("*").order("start_time", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleLogout = async () => { await signOut(); navigate("/admin/login"); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.start_time) {
      toast.error("Title and start time are required");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("events").insert({
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      cover_image: form.cover_image || null,
      link: form.link || null,
      start_time: new Date(form.start_time).toISOString(),
      end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
      is_published: form.is_published,
      created_by: user?.id,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Event created");
    setForm({ title: "", description: "", location: "", cover_image: "", link: "", start_time: "", end_time: "", is_published: true });
    queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Event deleted");
    queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const handleTogglePublish = async (id: string, current: boolean) => {
    const { error } = await supabase.from("events").update({ is_published: !current }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(!current ? "Event published" : "Event unpublished");
    queryClient.invalidateQueries({ queryKey: ["admin-events"] });
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
                <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Manage Events</h1>
                <p className="text-muted-foreground">Create upcoming events and manage past ones</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h2 className="font-serif text-xl font-bold text-foreground mb-4">Add New Event</h2>
                <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="start_time">Start *</Label>
                      <Input id="start_time" type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
                    </div>
                    <div>
                      <Label htmlFor="end_time">End</Label>
                      <Input id="end_time" type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="cover_image">Cover image URL</Label>
                    <Input id="cover_image" value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} placeholder="https://..." />
                  </div>
                  <div>
                    <Label htmlFor="link">Registration / info link</Label>
                    <Input id="link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_published">Published</Label>
                    <Switch id="is_published" checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Event
                  </Button>
                </form>
              </div>

              <div>
                <h2 className="font-serif text-xl font-bold text-foreground mb-4">All Events ({events?.length || 0})</h2>
                <div className="bg-card rounded-2xl border border-border p-4 max-h-[800px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
                  ) : !events || events.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p>No events yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {events.map((ev) => {
                        const isPast = new Date(ev.end_time || ev.start_time) < new Date();
                        return (
                          <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-accent transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-foreground truncate">{ev.title}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isPast ? "bg-muted text-muted-foreground" : "bg-accent/10 text-accent"}`}>
                                  {isPast ? "Past" : "Upcoming"}
                                </span>
                                {!ev.is_published && <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">Draft</span>}
                              </div>
                              <p className="text-sm text-muted-foreground">{format(new Date(ev.start_time), "PPP p")}</p>
                              {ev.location && <p className="text-xs text-muted-foreground truncate">{ev.location}</p>}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleTogglePublish(ev.id, ev.is_published)} title={ev.is_published ? "Unpublish" : "Publish"}>
                              {ev.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(ev.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
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

export default AdminEvents;
