"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Mail,
  Users,
  Calendar,
  Sparkles,
  Search,
  ExternalLink,
  Copy,
  Trash2,
  Download,
  RefreshCw,
  CheckCircle2,
  Globe,
  FileSpreadsheet,
  AlertCircle,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SubscriberItem {
  id: number;
  email: string;
  page_name: string;
  page_url: string;
  referrer: string | null;
  status: string;
  subscribe_count: number;
  created_at: string;
  updated_at: string;
}

interface SubscribersStats {
  total: number;
  today: number;
  thisWeek: number;
  active: number;
}

interface TopPageStat {
  page_name: string;
  count: number;
}

export function PlatformSubscribersManager() {
  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [stats, setStats] = useState<SubscribersStats>({ total: 0, today: 0, thisWeek: 0, active: 0 });
  const [topPages, setTopPages] = useState<TopPageStat[]>([]);
  const [distinctPages, setDistinctPages] = useState<string[]>([]);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPage, setSelectedPage] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const loadSubscribers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "25");
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedPage && selectedPage !== "all") params.set("page_name", selectedPage);
      if (selectedStatus && selectedStatus !== "all") params.set("status", selectedStatus);

      const res = await fetch(`/api/platformadmin/subscribers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load subscribers");
      const json = await res.json();

      if (json.success) {
        setSubscribers(json.data || []);
        if (json.stats) setStats(json.stats);
        if (json.topPages) setTopPages(json.topPages);
        if (json.distinctPages) setDistinctPages(json.distinctPages);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages || 1);
          setTotalCount(json.pagination.total || 0);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, selectedPage, selectedStatus]);

  useEffect(() => {
    loadSubscribers();
  }, [loadSubscribers]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this subscriber?")) return;
    try {
      const res = await fetch(`/api/platformadmin/subscribers?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Subscriber removed successfully");
        loadSubscribers();
      } else {
        toast.error(json.error || "Failed to delete subscriber");
      }
    } catch {
      toast.error("Failed to delete subscriber");
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success(`Copied "${email}" to clipboard`);
  };

  const handleExportCSV = () => {
    if (!subscribers.length) {
      toast.error("No subscriber data to export");
      return;
    }

    const headers = ["ID", "Email", "Subscribed From Page", "Page URL", "Times Subscribed", "Status", "Subscribed Date"];
    const rows = subscribers.map((s) => [
      s.id,
      `"${s.email}"`,
      `"${s.page_name || "General"}"`,
      `"${s.page_url || "/"}"`,
      s.subscribe_count || 1,
      s.status || "active",
      `"${new Date(s.created_at).toLocaleString()}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `143panda_subscribers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Subscribers list exported as CSV");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Mail className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                <span>Subscribed Users</span>
                <Badge variant="outline" className="text-[11px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                  {stats.total} Total
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track all visitors who subscribed to 143Panda updates with the exact page they subscribed from.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSubscribers}
            disabled={loading}
            className="text-xs font-semibold gap-1.5 h-9"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={handleExportCSV}
            size="sm"
            className="text-xs font-bold gap-1.5 bg-[#0070f3] hover:bg-blue-600 text-white shadow-xs h-9"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Subscribers */}
        <div className="p-4 rounded-xl border border-border/70 bg-card shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Total Subscribers</span>
            <div className="text-2xl font-black text-foreground">{stats.total}</div>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="size-3" />
              Verified Email Audience
            </span>
          </div>
          <div className="size-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="size-5.5" />
          </div>
        </div>

        {/* Subscribed Today */}
        <div className="p-4 rounded-xl border border-border/70 bg-card shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Subscribed Today</span>
            <div className="text-2xl font-black text-emerald-600">+{stats.today}</div>
            <span className="text-[10px] text-muted-foreground">New today</span>
          </div>
          <div className="size-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Sparkles className="size-5.5" />
          </div>
        </div>

        {/* Subscribed This Week */}
        <div className="p-4 rounded-xl border border-border/70 bg-card shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Last 7 Days</span>
            <div className="text-2xl font-black text-indigo-600">+{stats.thisWeek}</div>
            <span className="text-[10px] text-muted-foreground">Weekly growth</span>
          </div>
          <div className="size-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Calendar className="size-5.5" />
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="p-4 rounded-xl border border-border/70 bg-card shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Active Audience</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.active}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 100}% Active Rate
            </span>
          </div>
          <div className="size-11 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Globe className="size-5.5" />
          </div>
        </div>
      </div>

      {/* Top Pages Source Breakdown Banner */}
      {topPages.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 dark:bg-blue-950/20 p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <Globe className="size-3.5 text-blue-600" />
              <span>Top Converting Pages (Where Users Subscribed)</span>
            </span>
            <span className="text-[11px] text-blue-600 font-medium">Distribution</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {topPages.map((tp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedPage(selectedPage === tp.page_name ? "all" : tp.page_name);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  selectedPage === tp.page_name
                    ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                    : "bg-white dark:bg-card text-slate-700 dark:text-slate-300 border-blue-200 hover:border-blue-400"
                }`}
              >
                <span className="truncate max-w-[200px]">{tp.page_name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  selectedPage === tp.page_name ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                }`}>
                  {tp.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-3.5 rounded-xl border border-border/70 bg-card shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, page name..."
            className="pl-9 h-9 text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Page Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium shrink-0">Page:</span>
            <select
              value={selectedPage}
              onChange={(e) => {
                setSelectedPage(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 text-xs bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-[180px] truncate"
            >
              <option value="all">All Pages ({stats.total})</option>
              {distinctPages.map((p, idx) => (
                <option key={idx} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium shrink-0">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 text-xs bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </div>

          {(selectedPage !== "all" || selectedStatus !== "all" || debouncedSearch) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedPage("all");
                setSelectedStatus("all");
                setPage(1);
              }}
              className="text-xs h-9 text-muted-foreground hover:text-foreground"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Subscriber Email</th>
                <th className="py-3 px-4">Subscribed From Page</th>
                <th className="py-3 px-4 text-center">Signups</th>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading subscriber records...</span>
                  </td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground space-y-2">
                    <Mail className="size-10 mx-auto text-muted-foreground/40" />
                    <p className="text-sm font-semibold text-foreground">No subscribers found</p>
                    <p className="text-xs max-w-sm mx-auto">
                      {debouncedSearch || selectedPage !== "all"
                        ? "Try clearing your search query or page filters."
                        : "When users enter their email in the Subscribe Now strip on public pages, they will appear here with the page name."}
                    </p>
                  </td>
                </tr>
              ) : (
                subscribers.map((item, index) => {
                  const itemIndex = (page - 1) * 25 + index + 1;
                  const dateStr = new Date(item.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const timeStr = new Date(item.created_at).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      {/* Index */}
                      <td className="py-3 px-4 text-center text-muted-foreground font-mono text-[11px]">
                        {itemIndex}
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-xs select-all">
                            {item.email}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyEmail(item.email)}
                            title="Copy Email"
                            className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <Copy className="size-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Page Name & Clickable URL */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200"
                            >
                              {item.page_name || "General"}
                            </Badge>
                          </div>
                          {item.page_url && (
                            <Link
                              href={item.page_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors truncate max-w-xs"
                              title={`Open ${item.page_url}`}
                            >
                              <span className="truncate">{item.page_url}</span>
                              <ExternalLink className="size-3 shrink-0" />
                            </Link>
                          )}
                        </div>
                      </td>

                      {/* Subscribe Count */}
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-bold px-2 py-0.5"
                        >
                          {item.subscribe_count || 1}x
                        </Badge>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-xs text-foreground font-medium">{dateStr}</div>
                        <div className="text-[10px] text-muted-foreground">{timeStr}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold capitalize ${
                            item.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-neutral-100 text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300"
                          }`}
                        >
                          {item.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyEmail(item.email)}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Copy email"
                          >
                            <Copy className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete subscriber"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20 text-xs">
            <span className="text-muted-foreground">
              Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, totalCount)} of {totalCount} subscribers
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="h-8 text-xs"
              >
                Previous
              </Button>
              <span className="font-semibold px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="h-8 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
