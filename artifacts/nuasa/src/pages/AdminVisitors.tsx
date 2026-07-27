import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Eye, Loader2, TrendingUp, Globe, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const AdminVisitors = () => {
  const queryClient = useQueryClient();
  const [clearScope, setClearScope] = useState<"7" | "30" | "all">("30");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-visitors"],
    queryFn: async () => {
      const since30 = new Date(); since30.setDate(since30.getDate() - 30);
      const since7 = new Date(); since7.setDate(since7.getDate() - 7);
      const since1 = new Date(); since1.setDate(since1.getDate() - 1);

      const { data: visits, error } = await supabase
        .from("site_visits")
        .select("id, user_id, session_id, path, referrer, user_agent, created_at")
        .gte("created_at", since30.toISOString())
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;

      const all = visits || [];
      const sessions = new Set(all.map(v => v.session_id));
      const last7 = all.filter(v => new Date(v.created_at) >= since7);
      const last1 = all.filter(v => new Date(v.created_at) >= since1);
      const sessions7 = new Set(last7.map(v => v.session_id));
      const sessions1 = new Set(last1.map(v => v.session_id));

      const pathCounts = new Map<string, number>();
      all.forEach(v => pathCounts.set(v.path, (pathCounts.get(v.path) || 0) + 1));
      const topPages = [...pathCounts.entries()]
        .sort((a,b) => b[1]-a[1]).slice(0,8)
        .map(([path, count]) => ({ path, count }));

      const refCounts = new Map<string, number>();
      all.forEach(v => {
        if (!v.referrer) return;
        try {
          const host = new URL(v.referrer).hostname;
          refCounts.set(host, (refCounts.get(host) || 0) + 1);
        } catch { /* ignore */ }
      });
      const topReferrers = [...refCounts.entries()]
        .sort((a,b) => b[1]-a[1]).slice(0,5)
        .map(([host, count]) => ({ host, count }));

      return {
        total30: all.length,
        sessions30: sessions.size,
        visits7: last7.length,
        sessions7: sessions7.size,
        visits1: last1.length,
        sessions1: sessions1.size,
        topPages,
        topReferrers,
        recent: all.slice(0, 50),
      };
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      let query = supabase.from("site_visits").delete();
      if (clearScope === "all") {
        // Match every row
        query = query.not("id", "is", null);
      } else {
        const days = Number(clearScope);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        // Delete records older than cutoff
        query = query.lt("created_at", cutoff.toISOString());
      }
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        clearScope === "all"
          ? "All visitor records cleared."
          : `Cleared visits older than ${clearScope} days.`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-visitors"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to clear visitors"),
  });

  const stats = [
    { label: "Visits (24h)", value: data?.visits1 ?? 0, icon: Eye },
    { label: "Unique Visitors (24h)", value: data?.sessions1 ?? 0, icon: Users },
    { label: "Visits (7d)", value: data?.visits7 ?? 0, icon: TrendingUp },
    { label: "Visits (30d)", value: data?.total30 ?? 0, icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar />

        <main className="flex-1 ml-64 p-8">
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Visitor Analytics</h1>
              <p className="text-muted-foreground">Track who's visiting your site over the last 30 days.</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={clearScope} onValueChange={(v: any) => setClearScope(v)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Older than 7 days</SelectItem>
                  <SelectItem value="30">Older than 30 days</SelectItem>
                  <SelectItem value="all">All visitor records</SelectItem>
                </SelectContent>
              </Select>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2" disabled={clearMutation.isPending}>
                    <Trash2 className="w-4 h-4" />
                    {clearMutation.isPending ? "Clearing…" : "Clear Visitors"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear visitor records?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {clearScope === "all"
                        ? "This will permanently delete every visitor record. This cannot be undone."
                        : `This will permanently delete visits older than ${clearScope} days. This cannot be undone.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => clearMutation.mutate()}
                    >
                      Yes, clear
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((s) => (
                  <div key={s.label} className="bg-card rounded-2xl border border-border p-6">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-accent mb-4">
                      <s.icon className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">{s.value.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-card rounded-2xl border border-border">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold">Top Pages (30d)</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {data?.topPages.length ? data.topPages.map((p) => (
                      <div key={p.path} className="p-4 flex items-center justify-between gap-4">
                        <span className="font-mono text-sm truncate">{p.path}</span>
                        <Badge variant="outline">{p.count}</Badge>
                      </div>
                    )) : <div className="p-6 text-sm text-muted-foreground text-center">No data yet</div>}
                  </div>
                </div>
                <div className="bg-card rounded-2xl border border-border">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold">Top Referrers (30d)</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {data?.topReferrers.length ? data.topReferrers.map((r) => (
                      <div key={r.host} className="p-4 flex items-center justify-between gap-4">
                        <span className="text-sm truncate">{r.host}</span>
                        <Badge variant="outline">{r.count}</Badge>
                      </div>
                    )) : <div className="p-6 text-sm text-muted-foreground text-center">No external referrers yet</div>}
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-border">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold">Recent Visits</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Visitor</TableHead>
                      <TableHead>Referrer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.recent.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{v.path}</TableCell>
                        <TableCell>
                          {v.user_id ? <Badge>Signed-in</Badge> : <Badge variant="outline">Anonymous</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {v.referrer || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminVisitors;