import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, RefreshCw, ExternalLink, Search, Download, CheckCircle2,
  XCircle, Clock, ChevronDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Transaction {
  id: string;
  reference_code: string;
  tx_ref: string | null;
  flw_transaction_id: string | null;
  full_name: string;
  email: string;
  amount: number | string;
  currency: string | null;
  payment_status: "successful" | "pending" | "rejected" | "failed" | string;
  registration_type: string;
  created_at: string;
}

const STATUS_FILTERS = ["all", "successful", "pending", "rejected", "failed"] as const;

const AdminTransactions = () => {
  const qc = useQueryClient();
  const [search, setSearch]               = useState("");
  const [status, setStatus]               = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [verifying, setVerifying]         = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [markingAllPending, setMarkingAllPending] = useState(false);

  // ── Fetch transactions from local API ───────────────────────────────────
  const { data, isLoading, refetch } = useQuery<Transaction[]>({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const res = await apiFetch<{ data: Transaction[]; error: null }>("/admin/transactions");
      return res.data ?? [];
    },
  });

  // ── Filter & search ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = data || [];
    if (status !== "all") rows = rows.filter((r) => r.payment_status === status);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        [r.reference_code, r.tx_ref, r.flw_transaction_id, r.full_name, r.email]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      );
    }
    return rows;
  }, [data, status, search]);

  // ── Summary totals ──────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const rows = data || [];
    const ok = rows.filter((r) => r.payment_status === "successful");
    return {
      count:      rows.length,
      successful: ok.length,
      pending:    rows.filter((r) => r.payment_status === "pending").length,
      rejected:   rows.filter((r) => r.payment_status === "rejected").length,
      failed:     rows.filter((r) => r.payment_status === "failed").length,
      revenue:    ok.reduce((s, r) => s + Number(r.amount || 0), 0),
    };
  }, [data]);

  // ── Mark ALL pending as successful ─────────────────────────────────────
  const markAllPendingSuccessful = async () => {
    if (!window.confirm("Mark ALL pending registrations as successful? This cannot be undone.")) return;
    setMarkingAllPending(true);
    try {
      const res = await apiFetch<{ data: { success: boolean; total_successful: number }; error: null }>(
        "/admin/transactions/mark-pending-successful",
        { method: "POST" },
      );
      toast.success(`Done — ${res.data?.total_successful ?? 0} total successful registrations`);
      qc.invalidateQueries({ queryKey: ["admin-transactions"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to update statuses");
    } finally {
      setMarkingAllPending(false);
    }
  };

  // ── Manually set a single payment status ────────────────────────────────
  const markStatus = async (r: Transaction, newStatus: "successful" | "pending" | "rejected" | "failed") => {
    if (r.payment_status === newStatus) return;
    setChangingStatus(r.id);
    try {
      await apiFetch<{ data: { success: boolean; status: string }; error: null }>(
        `/admin/transactions/${r.id}/mark`,
        { method: "POST", body: JSON.stringify({ status: newStatus }) },
      );
      const label =
        newStatus === "successful" ? "Approved"
          : newStatus === "rejected" ? "Rejected"
          : newStatus === "failed" ? "Marked failed"
          : "Marked pending";
      toast.success(`${label}: ${r.full_name}`);
      qc.invalidateQueries({ queryKey: ["admin-transactions"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    } finally {
      setChangingStatus(null);
    }
  };

  // ── Verify via Flutterwave ───────────────────────────────────────────────
  const verify = async (r: Transaction) => {
    if (!r.flw_transaction_id || !r.tx_ref) {
      toast.error("No Flutterwave transaction reference on this record");
      return;
    }
    setVerifying(r.id);
    try {
      const res = await apiFetch<{ data: { success: boolean; status: string }; error: null }>(
        `/admin/transactions/${r.id}/verify`,
        { method: "POST" },
      );
      toast.success(`Verified: ${res.data?.status ?? "ok"}`);
      qc.invalidateQueries({ queryKey: ["admin-transactions"] });
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
    } finally {
      setVerifying(null);
    }
  };

  // ── CSV export ──────────────────────────────────────────────────────────
  const exportCsv = () => {
    if (!filtered.length) { toast.error("Nothing to export"); return; }
    const headers = ["Reference", "TX Ref", "Flutterwave ID", "Name", "Email", "Amount", "Currency", "Status", "Type", "Date"];
    const csv = [
      headers.join(","),
      ...filtered.map((r) =>
        [r.reference_code, r.tx_ref, r.flw_transaction_id, r.full_name, r.email,
          r.amount, r.currency || "NGN", r.payment_status, r.registration_type, r.created_at]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const badgeFor = (s: string) =>
    s === "successful" ? "bg-green-100 text-green-800 border-green-200"
      : s === "pending" ? "bg-yellow-100 text-yellow-800 border-yellow-200"
      : s === "rejected" ? "bg-orange-100 text-orange-800 border-orange-200"
      : "bg-red-100 text-red-800 border-red-200";

  const stats = [
    { label: "All Transactions",    value: totals.count },
    { label: "Successful",          value: totals.successful },
    { label: "Pending",             value: totals.pending },
    { label: "Rejected",            value: totals.rejected },
    { label: "Failed",              value: totals.failed },
    { label: "Total Revenue (NGN)", value: totals.revenue.toLocaleString() },
  ];

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 ml-64 p-4 md:p-8">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground mb-1">Transactions</h1>
              <p className="text-muted-foreground">View and manage payment status for all convention registrations.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </Button>
              {totals.pending > 0 && (
                <Button
                  variant="outline"
                  onClick={markAllPendingSuccessful}
                  disabled={markingAllPending}
                  className="gap-2 border-green-600 text-green-700 hover:bg-green-50"
                >
                  {markingAllPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CheckCircle2 className="w-4 h-4" />}
                  Approve All Pending ({totals.pending})
                </Button>
              )}
              <Button onClick={exportCsv} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Download className="w-4 h-4" /> Export CSV
              </Button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {stats.map((s) => (
              <div key={s.label} className="bg-card rounded-xl border border-border p-4">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-xl font-bold mt-1">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-card rounded-2xl border border-border">
            <div className="p-4 border-b border-border flex items-center gap-3 flex-wrap">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search reference, Flutterwave ID, name, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 focus-visible:ring-0 shadow-none flex-1 min-w-[220px]"
              />
              <div className="flex gap-1 text-xs">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`px-3 py-1 rounded-md capitalize ${
                      status === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
              </div>
            ) : !filtered.length ? (
              <div className="py-20 text-center text-muted-foreground">No transactions found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Flutterwave ID</TableHead>
                    <TableHead>Registrant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">
                        <div className="font-semibold">{r.reference_code}</div>
                        <div className="text-muted-foreground">{r.tx_ref}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.flw_transaction_id || "—"}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.full_name}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.currency || "NGN"} {Number(r.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={`border ${badgeFor(r.payment_status)}`}>
                          {r.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Quick approve / reject / pending buttons */}
                          {changingStatus === r.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant={r.payment_status === "successful" ? "default" : "outline"}
                                className={`h-7 px-2 gap-1 text-xs ${
                                  r.payment_status === "successful"
                                    ? "bg-green-600 hover:bg-green-700 text-white"
                                    : "border-green-300 text-green-700 hover:bg-green-50"
                                }`}
                                disabled={r.payment_status === "successful"}
                                onClick={() => markStatus(r, "successful")}
                                title="Approve payment"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant={r.payment_status === "pending" ? "default" : "outline"}
                                className={`h-7 px-2 gap-1 text-xs ${
                                  r.payment_status === "pending"
                                    ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                    : "border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                                }`}
                                disabled={r.payment_status === "pending"}
                                onClick={() => markStatus(r, "pending")}
                                title="Set to pending"
                              >
                                <Clock className="w-3 h-3" />
                                Pending
                              </Button>
                              <Button
                                size="sm"
                                variant={r.payment_status === "rejected" ? "default" : "outline"}
                                className={`h-7 px-2 gap-1 text-xs ${
                                  r.payment_status === "rejected"
                                    ? "bg-orange-600 hover:bg-orange-700 text-white"
                                    : "border-orange-300 text-orange-700 hover:bg-orange-50"
                                }`}
                                disabled={r.payment_status === "rejected"}
                                onClick={() => markStatus(r, "rejected")}
                                title="Reject payment"
                              >
                                <XCircle className="w-3 h-3" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant={r.payment_status === "failed" ? "default" : "outline"}
                                className={`h-7 px-2 gap-1 text-xs ${
                                  r.payment_status === "failed"
                                    ? "bg-red-600 hover:bg-red-700 text-white"
                                    : "border-red-300 text-red-700 hover:bg-red-50"
                                }`}
                                disabled={r.payment_status === "failed"}
                                onClick={() => markStatus(r, "failed")}
                                title="Mark payment failed"
                              >
                                <XCircle className="w-3 h-3" />
                                Failed
                              </Button>
                            </>
                          )}

                          {/* More options dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={!r.flw_transaction_id || verifying === r.id}
                                onClick={() => verify(r)}
                              >
                                {verifying === r.id
                                  ? <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                  : <RefreshCw className="w-3 h-3 mr-2" />}
                                Verify via Flutterwave
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/convention?ref=${encodeURIComponent(r.reference_code)}`}>
                                  <ExternalLink className="w-3 h-3 mr-2" /> View Registration
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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

export default AdminTransactions;
