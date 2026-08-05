import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2, Search, Download, Eye, ShieldCheck, RefreshCw, DollarSign,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const TYPE_LABEL: Record<string, string> = { student: "Student", graduate: "Graduate", chapter: "Chapter" };

type Registration = {
  id: string;
  reference_code: string;
  tx_ref: string;
  flw_transaction_id: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  amount: string | number;
  currency: string;
  payment_status: string;
  registration_type: string;
  institution: string;
  department: string;
  matric_number: string;
  graduation_year: string;
  chapter_name: string;
  delegates_count: number;
  accommodation_request: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
  created_at: string;
};

const AdminConvention = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "successful" | "pending" | "failed">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "student" | "graduate" | "chapter">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Registration | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-convention-regs"],
    queryFn: async () => {
      const result = await apiFetch<{ data: Registration[]; error: null }>("/admin/transactions");
      return result.data;
    },
  });

  const { data: loginLog } = useQuery({
    queryKey: ["admin-login-log"],
    queryFn: async () => {
      const result = await apiFetch<{ data: { id: string; user_id: string; user_agent: string; ip_address: string; created_at: string }[]; error: null }>("/admin/login-log");
      return result.data;
    },
  });

  const stats = useMemo(() => {
    const all = data || [];
    const ok = all.filter(r => r.payment_status === "successful");
    const revenue = ok.reduce((s, r) => s + Number(r.amount), 0);
    const totalAmount = all.reduce((s, r) => s + Number(r.amount || 0), 0);
    const sumBy = (t: string) =>
      ok.filter(r => r.registration_type === t).reduce((s, r) => s + Number(r.amount), 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      total: all.length,
      successful: ok.length,
      pending: all.filter(r => r.payment_status === "pending").length,
      failed: all.filter(r => r.payment_status === "failed").length,
      revenue,
      totalAmount,
      students: ok.filter(r => r.registration_type === "student").length,
      studentsRev: sumBy("student"),
      graduates: ok.filter(r => r.registration_type === "graduate").length,
      graduatesRev: sumBy("graduate"),
      chapters: ok.filter(r => r.registration_type === "chapter").length,
      chaptersRev: sumBy("chapter"),
      today: all.filter(r => new Date(r.created_at) >= today).length,
      month: all.filter(r => new Date(r.created_at) >= startMonth).length,
    };
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data || [];
    if (filter !== "all") rows = rows.filter(r => r.payment_status === filter);
    if (typeFilter !== "all") rows = rows.filter(r => r.registration_type === typeFilter);
    if (dateFrom) rows = rows.filter(r => new Date(r.created_at) >= new Date(dateFrom));
    if (dateTo) {
      const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
      rows = rows.filter(r => new Date(r.created_at) <= end);
    }
    const q = search.toLowerCase().trim();
    if (q) rows = rows.filter(r =>
      r.full_name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.phone?.toLowerCase().includes(q) ||
      r.institution?.toLowerCase().includes(q) ||
      r.id?.toLowerCase().includes(q) ||
      r.reference_code?.toLowerCase().includes(q) ||
      r.chapter_name?.toLowerCase().includes(q)
    );
    return rows;
  }, [data, search, filter, typeFilter, dateFrom, dateTo]);

  const buildRows = (rows: Registration[]) => rows.map(r => ({
    "Registration ID": r.id,
    "Reference": r.reference_code,
    "Name": r.full_name,
    "Email": r.email,
    "Phone": r.phone,
    "Gender": r.gender || "",
    "Type": r.registration_type,
    "Institution": r.institution || "",
    "Department": r.department || "",
    "Matric Number": r.matric_number || "",
    "Graduation Year": r.graduation_year || "",
    "Chapter": r.chapter_name || "",
    "Delegates": r.delegates_count || 1,
    "Accommodation": r.accommodation_request || "",
    "Emergency Contact": r.emergency_contact_name || "",
    "Emergency Phone": r.emergency_contact_phone || "",
    "Amount (NGN)": r.amount,
    "Payment Status": r.payment_status,
    "Flutterwave TX": r.flw_transaction_id || "",
    "Date": r.created_at,
  }));

  const exportCsv = (rows: Registration[], name: string) => {
    const data = buildRows(rows);
    if (!data.length) { toast.error("Nothing to export"); return; }
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map(r => headers.map(h => `"${String((r as any)[h] ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${name}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportXlsx = (rows: Registration[], name: string) => {
    const data = buildRows(rows);
    if (!data.length) { toast.error("Nothing to export"); return; }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registrations");
    XLSX.writeFile(wb, `${name}-${Date.now()}.xlsx`);
  };

  const verifyPayment = async (r: Registration) => {
    if (!r.flw_transaction_id || !r.tx_ref) { toast.error("No Flutterwave transaction on this record"); return; }
    setVerifying(r.id);
    try {
      const result = await apiFetch<{ data: { success: boolean; status: string }; error: null }>(
        `/admin/transactions/${r.id}/verify`,
        { method: "POST" },
      );
      toast.success(`Status: ${result.data?.status ?? "manual verification required"}`);
      qc.invalidateQueries({ queryKey: ["admin-convention-regs"] });
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
    } finally {
      setVerifying(null);
    }
  };

  const handleLogout = async () => { await signOut(); navigate("/admin/login"); };

  const statusCards = [
    { label: "Total Registrations", value: stats.total, className: "bg-card" },
    { label: "Successful", value: stats.successful, className: "bg-green-50 border-green-200 text-green-800" },
    { label: "Pending", value: stats.pending, className: "bg-yellow-50 border-yellow-200 text-yellow-800" },
    { label: "Failed", value: stats.failed, className: "bg-red-50 border-red-200 text-red-800" },
    { label: "Today", value: stats.today, className: "bg-card" },
    { label: "This Month", value: stats.month, className: "bg-card" },
  ];

  const typeCards = [
    { label: "Students", value: `${stats.students}`, sub: `NGN ${stats.studentsRev.toLocaleString()}` },
    { label: "Graduates", value: `${stats.graduates}`, sub: `NGN ${stats.graduatesRev.toLocaleString()}` },
    { label: "Chapters", value: `${stats.chapters}`, sub: `NGN ${stats.chaptersRev.toLocaleString()}` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar />

        <main className="flex-1 ml-64 p-4 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Convention Management</h1>
              <p className="text-muted-foreground">Registrations, payments and admin activity.</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"><Download className="w-4 h-4" /> Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportCsv(data || [], "all-registrations")}>All — CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportXlsx(data || [], "all-registrations")}>All — Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCsv(filtered, "filtered-registrations")}>Filtered — CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportXlsx(filtered, "filtered-registrations")}>Filtered — Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Revenue summary — prominently at the top */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="bg-accent/10 border border-accent/30 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-accent" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Revenue Collected (Successful)</div>
                <div className="text-3xl font-bold text-accent">NGN {stats.revenue.toLocaleString()}</div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Amount Registered (All Statuses)</div>
                <div className="text-3xl font-bold text-foreground">NGN {stats.totalAmount.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {statusCards.map(s => (
              <div key={s.label} className={`rounded-xl border p-4 ${s.className}`}>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-xl font-bold mt-1">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Type breakdown */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {typeCards.map(s => (
              <div key={s.label} className="bg-card rounded-xl border border-border p-4">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-xl font-bold mt-1">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          <Tabs defaultValue="registrations">
            <TabsList>
              <TabsTrigger value="registrations">Registrations</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="activity">Admin Login Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="registrations" className="mt-4">
              <div className="bg-card rounded-2xl border border-border">
                <div className="p-4 border-b border-border flex items-center gap-3 flex-wrap">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search by name, email, phone, institution, reference, ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="border-0 focus-visible:ring-0 shadow-none flex-1 min-w-[220px]" />
                </div>
                <div className="p-4 border-b border-border flex gap-3 flex-wrap items-center text-xs">
                  <div className="flex gap-1">
                    {(["all", "successful", "pending", "failed"] as const).map(s => (
                      <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1 rounded-md capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}>{s}</button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {(["all", "student", "graduate", "chapter"] as const).map(s => (
                      <button key={s} onClick={() => setTypeFilter(s)} className={`px-3 py-1 rounded-md capitalize ${typeFilter === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}>{s}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">From</span>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-auto" />
                    <span className="text-muted-foreground">To</span>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-auto" />
                  </div>
                  {(dateFrom || dateTo || filter !== "all" || typeFilter !== "all" || search) && (
                    <button onClick={() => { setDateFrom(""); setDateTo(""); setFilter("all"); setTypeFilter("all"); setSearch(""); }} className="text-accent hover:underline">Clear filters</button>
                  )}
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
                ) : !filtered.length ? (
                  <div className="py-20 text-center text-muted-foreground">No registrations found.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((r) => (
                        <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                          <TableCell className="font-mono text-xs">{r.reference_code}</TableCell>
                          <TableCell>
                            <div className="font-medium">{r.full_name}</div>
                            {r.chapter_name && <div className="text-xs text-muted-foreground">{r.chapter_name}</div>}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{TYPE_LABEL[r.registration_type] || r.registration_type}</Badge></TableCell>
                          <TableCell className="text-xs">
                            <div>{r.email}</div>
                            <div className="text-muted-foreground">{r.phone}</div>
                          </TableCell>
                          <TableCell className="font-medium">NGN {Number(r.amount).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className={r.payment_status === "successful" ? "bg-accent text-accent-foreground" : r.payment_status === "pending" ? "bg-muted text-foreground" : "bg-destructive text-destructive-foreground"}>
                              {r.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                          <TableCell><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(r); }}><Eye className="w-4 h-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              <div className="bg-card rounded-2xl border border-border">
                <div className="p-4 border-b border-border text-sm text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Re-verify Flutterwave transactions and monitor payment health.
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Flutterwave TX</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data || []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.reference_code}<div className="text-muted-foreground">{r.tx_ref}</div></TableCell>
                        <TableCell className="font-mono text-xs">{r.flw_transaction_id || "—"}</TableCell>
                        <TableCell>{r.full_name}</TableCell>
                        <TableCell>NGN {Number(r.amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={r.payment_status === "successful" ? "bg-accent text-accent-foreground" : r.payment_status === "pending" ? "bg-muted text-foreground" : "bg-destructive text-destructive-foreground"}>
                            {r.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" disabled={!r.flw_transaction_id || verifying === r.id} onClick={() => verifyPayment(r)} className="gap-1">
                            {verifying === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Verify
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <div className="bg-card rounded-2xl border border-border">
                <div className="p-4 border-b border-border text-sm text-muted-foreground">Last 50 admin sign-ins.</div>
                {!loginLog?.length ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">No login activity yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>User Agent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginLog.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs">{format(new Date(l.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                          <TableCell className="text-xs">{l.user_id || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-md">{l.user_agent}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registration Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                <div>
                  <div className="text-xs text-muted-foreground">Reference</div>
                  <div className="font-mono font-bold">{selected.reference_code}</div>
                </div>
                <Badge className={selected.payment_status === "successful" ? "bg-accent text-accent-foreground" : selected.payment_status === "pending" ? "bg-muted text-foreground" : "bg-destructive text-destructive-foreground"}>
                  {selected.payment_status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["Registration ID", selected.id],
                  ["Full Name", selected.full_name],
                  ["Email", selected.email],
                  ["Phone", selected.phone],
                  ["Gender", selected.gender],
                  ["Category", TYPE_LABEL[selected.registration_type] || selected.registration_type],
                  ["Institution", selected.institution],
                  ["Department", selected.department],
                  ["Matric Number", selected.matric_number],
                  ["Graduation Year", selected.graduation_year],
                  ["Chapter Name", selected.chapter_name],
                  ["Delegates", selected.delegates_count],
                  ["Payment Amount", `NGN ${Number(selected.amount).toLocaleString()}`],
                  ["Flutterwave TX ID", selected.flw_transaction_id],
                  ["TX Ref", selected.tx_ref],
                  ["Registered", format(new Date(selected.created_at), "PPpp")],
                  ["Accommodation", selected.accommodation_request],
                  ["Emergency Contact", selected.emergency_contact_name],
                  ["Emergency Phone", selected.emergency_contact_phone],
                ] as [string, any][]).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-xs text-muted-foreground">{k}</div>
                    <div className="font-medium break-words">{v || "—"}</div>
                  </div>
                ))}
              </div>
              {selected.notes && (
                <div>
                  <div className="text-xs text-muted-foreground">Notes</div>
                  <div className="bg-muted p-3 rounded">{selected.notes}</div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {selected.flw_transaction_id && (
                  <Button size="sm" variant="outline" disabled={verifying === selected.id} onClick={() => verifyPayment(selected)} className="gap-1">
                    {verifying === selected.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Re-verify payment
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminConvention;
