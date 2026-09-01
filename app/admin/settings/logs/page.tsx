"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Activity,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Code2,
  Database,
  Edit,
  Eye,
  FileCheck2,
  FileClock,
  FileText,
  Filter,
  History,
  Layers,
  Loader2,
  MapPin,
  Maximize2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

const ACTION_FILTERS = [
  { id: "ALL", label: "All Logs" },
  { id: "UPDATE", label: "Modifications (Updates)" },
  { id: "DELETE", label: "Deletions" },
  { id: "CREATE", label: "Creations" },
  { id: "RESTORE", label: "Restores" },
  { id: "STATUS_CHANGE", label: "Status Changes" },
];

export default function SystemAuditLogsPage() {
  const { user, accessToken } = useAuthStore();
  const isPlatformAdmin = isPlatformAdminUser(user);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  const [summary, setSummary] = useState({
    total_logs: 0,
    total_updates: 0,
    total_deletes: 0,
    total_creates: 0,
    total_restores: 0,
    total_status_changes: 0,
  });
  const [logs, setLogs] = useState<any[]>([]);

  // Log Detail Modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const authHeader = useCallback(() => {
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    return headers;
  }, [accessToken]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
      });
      if (search.trim()) params.set("search", search.trim());
      if (actionType !== "ALL") params.set("actionType", actionType);

      const res = await fetch(`/api/admin/settings/logs?${params.toString()}`, {
        headers: authHeader(),
      });

      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
        setSummary(json.summary || {});
        setTotalRows(json.total || 0);
        setPageCount(json.pageCount || 1);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, actionType, authHeader]);

  useEffect(() => {
    setPage(1);
  }, [search, actionType]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "UPDATE":
        return <Badge className="bg-amber-500/15 text-amber-800 border-amber-500/30 text-[10px] font-bold">MODIFIED</Badge>;
      case "DELETE":
        return <Badge className="bg-rose-500/15 text-rose-800 border-rose-500/30 text-[10px] font-bold">DELETED</Badge>;
      case "CREATE":
        return <Badge className="bg-emerald-500/15 text-emerald-800 border-emerald-500/30 text-[10px] font-bold">CREATED</Badge>;
      case "RESTORE":
        return <Badge className="bg-blue-500/15 text-blue-800 border-blue-500/30 text-[10px] font-bold">RESTORED</Badge>;
      case "STATUS_CHANGE":
        return <Badge className="bg-purple-500/15 text-purple-800 border-purple-500/30 text-[10px] font-bold">STATUS CHANGED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{action}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {isPlatformAdmin ? "Platform Audit & Telemetry" : "Institution Activity Logs"}
            </Badge>
            <span className="text-xs text-muted-foreground">Immutable Audit Trail</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mt-1 flex items-center gap-2">
            <History className="h-7 w-7 text-primary" /> System & Data Modification Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Audit history of all record modifications, creations, deletions, and administrative actions with previous and new data states.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user, entity, IP, description..."
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 rounded-2xl shadow-2xs border-border bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold">Total Logged</span>
            <FileClock className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {Number(summary.total_logs || 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground">System events</p>
        </Card>

        <Card className="p-3.5 rounded-2xl shadow-2xs border-border bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold">Modifications</span>
            <Edit className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {Number(summary.total_updates || 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground">Data updates</p>
        </Card>

        <Card className="p-3.5 rounded-2xl shadow-2xs border-border bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold">Deletions</span>
            <Trash2 className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">
            {Number(summary.total_deletes || 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground">Removed items</p>
        </Card>

        <Card className="p-3.5 rounded-2xl shadow-2xs border-border bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold">Creations</span>
            <Plus className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {Number(summary.total_creates || 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground">New records</p>
        </Card>

        <Card className="p-3.5 rounded-2xl shadow-2xs border-border bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold">Restored</span>
            <RotateCcw className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600">
            {Number(summary.total_restores || 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground">From Recycle Bin</p>
        </Card>

        <Card className="p-3.5 rounded-2xl shadow-2xs border-border bg-card">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold">Status Changes</span>
            <Activity className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600">
            {Number(summary.total_status_changes || 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground">Workflow transitions</p>
        </Card>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {ACTION_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActionType(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              actionType === f.id
                ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                : "bg-card border border-border hover:border-primary/40 text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Logs DataTable */}
      <Card className="rounded-2xl shadow-2xs overflow-hidden border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Actor / User</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Module / Resource</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5">IP & Scope</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary mb-1.5" /> Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3.5 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                      <div className="font-semibold text-foreground">{formatDate(log.created_at)}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center">
                          {log.user_name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-xs leading-none">{log.user_name || "System Actor"}</p>
                          <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{log.user_role?.replace("_", " ") || "Admin"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      {getActionBadge(log.action_type)}
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-foreground text-xs">{log.resource_type}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[140px] font-mono">
                        {log.resource_name || `#${log.resource_id || "N/A"}`}
                      </p>
                    </td>
                    <td className="p-3.5 max-w-sm">
                      <p className="text-foreground text-xs line-clamp-2 leading-relaxed">{log.description}</p>
                    </td>
                    <td className="p-3.5 space-y-0.5">
                      <div className="font-mono text-[11px] text-foreground">{log.ip_address || "127.0.0.1"}</div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {log.institution_name || "Platform Scope"}
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedLog(log);
                          setDetailModalOpen(true);
                        }}
                        className="h-7 px-2 text-[11px] font-semibold gap-1"
                      >
                        <Code2 className="h-3 w-3" /> Diff / Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Showing Page {page} of {pageCount} ({totalRows} records)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 text-xs font-semibold"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              className="h-8 text-xs font-semibold"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Log Details & Data Diff Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <FileClock className="h-5 w-5 text-primary" />
              Audit Log Record Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete metadata and side-by-side data state before and after modification.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 text-xs">
              {/* Header Info */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Action Type</span>
                  <div className="mt-0.5">{getActionBadge(selectedLog.action_type)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Actor Name</span>
                  <span className="font-semibold text-foreground">{selectedLog.user_name || "System"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Timestamp</span>
                  <span className="font-mono text-foreground">{formatDate(selectedLog.created_at)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Resource Entity</span>
                  <span className="font-bold text-primary">{selectedLog.resource_type} (#{selectedLog.resource_id})</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">IP Address</span>
                  <span className="font-mono text-foreground">{selectedLog.ip_address || "127.0.0.1"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Institution Scope</span>
                  <span className="text-foreground">{selectedLog.institution_name || "EduBird Platform"}</span>
                </div>
              </div>

              {/* Description */}
              <div className="p-3 rounded-xl bg-card border border-border/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Description of Changes</span>
                <p className="text-foreground leading-relaxed">{selectedLog.description}</p>
              </div>

              {/* Data Diff Comparison */}
              <div className="space-y-2 pt-1">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-primary" /> Data State Comparison (Previous vs New)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Previous State */}
                  <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1.5">
                    <span className="font-bold text-rose-700 text-[11px] block">Previous Data State</span>
                    <pre className="text-[10px] font-mono p-2 rounded-lg bg-card/80 border border-border overflow-x-auto text-muted-foreground max-h-48 leading-tight">
                      {JSON.stringify(selectedLog.previous_data || {}, null, 2)}
                    </pre>
                  </div>

                  {/* New State */}
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                    <span className="font-bold text-emerald-700 text-[11px] block">New Data State</span>
                    <pre className="text-[10px] font-mono p-2 rounded-lg bg-card/80 border border-border overflow-x-auto text-foreground max-h-48 leading-tight">
                      {JSON.stringify(selectedLog.new_data || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
