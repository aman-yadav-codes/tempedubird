"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  Briefcase,
  Layers,
  MapPin,
  ExternalLink,
  Download,
  Printer,
  Sparkles,
  Building2,
  Tag,
  UserCheck,
  AlertCircle,
  FolderGit2,
  CheckSquare,
  ShieldCheck,
  Target,
  ArrowRight,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface SystemWorkLogItem {
  id: string;
  timestamp: string;
  time_display: string;
  date_display: string;
  module: "operation" | "finance" | "sales" | "manage_staff" | "admin";
  action: string;
  action_label: string;
  title: string;
  details?: string | null;
  badge_color: "emerald" | "blue" | "amber" | "rose" | "purple" | "zinc";
  user_id?: string | number | null;
  user_name: string;
  user_role?: string | null;
  user_avatar?: string | null;
  task_id?: number | null;
  task_title?: string | null;
  subtask_id?: string | null;
  subtask_title?: string | null;
  client_id?: number | null;
  client_name?: string | null;
  institution_id?: number | null;
  amount?: number | null;
  category_name?: string | null;
  payment_method?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  location?: {
    latitude: number;
    longitude: number;
    address?: string | null;
  } | null;
  duration_minutes?: number | null;
  points?: number | null;
}

interface WorkLogsSummary {
  total_activities: number;
  tasks_worked_on: number;
  subtasks_completed: number;
  total_income: number;
  total_expense: number;
  active_staff_count: number;
  files_uploaded: number;
}

function getTodayKolkata(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function getShiftedDate(baseDate: string, days: number): string {
  try {
    const d = new Date(baseDate + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  } catch {
    return getTodayKolkata();
  }
}

const MODULE_TABS = [
  { id: "all", label: "All Logs", icon: Layers },
  { id: "operation", label: "Operation", icon: Briefcase },
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "sales", label: "Sales", icon: Target },
  { id: "manage_staff", label: "Manage Staff", icon: UserCheck },
  { id: "admin", label: "Admin", icon: ShieldCheck },
];

export default function DailyWorkLogsPage() {
  const pathname = usePathname();
  const { accessToken } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();
  const isPlatformRoute = Boolean(pathname?.startsWith("/platformadmin"));
  const tasksUrl = isPlatformRoute ? "/platformadmin/operations/tasks" : "/admin/operations/tasks";

  const todayStr = useMemo(() => getTodayKolkata(), []);
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);

  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [viewMode, setViewMode] = useState<"stream" | "by_module" | "by_client">("stream");

  const [loading, setLoading] = useState<boolean>(true);
  const [logs, setLogs] = useState<SystemWorkLogItem[]>([]);
  const [summary, setSummary] = useState<WorkLogsSummary>({
    total_activities: 0,
    tasks_worked_on: 0,
    subtasks_completed: 0,
    total_income: 0,
    total_expense: 0,
    active_staff_count: 0,
    files_uploaded: 0,
  });
  const [staffOptions, setStaffOptions] = useState<{ id: string; name: string }[]>([]);
  const [clientOptions, setClientOptions] = useState<{ id: string; name: string }[]>([]);

  const fetchLogs = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("from_date", fromDate);
      params.set("to_date", toDate);
      if (moduleFilter !== "all") params.set("module", moduleFilter);
      if (staffFilter !== "all") params.set("staff_id", staffFilter);
      if (clientFilter !== "all") params.set("client_id", clientFilter);
      if (search.trim()) params.set("search", search.trim());
      if (!isPlatformRoute && activeInstitutionId) {
        params.set("institution_id", String(activeInstitutionId));
      }

      const res = await fetch(`/api/admin/operations/work-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load work logs");

      setLogs(data.items || []);
      setSummary(
        data.summary || {
          total_activities: 0,
          tasks_worked_on: 0,
          subtasks_completed: 0,
          total_income: 0,
          total_expense: 0,
          active_staff_count: 0,
          files_uploaded: 0,
        }
      );
      if (Array.isArray(data.filters?.staff_options)) {
        setStaffOptions(data.filters.staff_options);
      }
      if (Array.isArray(data.filters?.client_options)) {
        setClientOptions(data.filters.client_options);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch work logs");
    } finally {
      setLoading(false);
    }
  }, [accessToken, fromDate, toDate, moduleFilter, staffFilter, clientFilter, search, isPlatformRoute, activeInstitutionId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Quick Date Presets
  const handleSetPreset = (preset: "today" | "yesterday" | "last7" | "this_month") => {
    const today = getTodayKolkata();
    if (preset === "today") {
      setFromDate(today);
      setToDate(today);
    } else if (preset === "yesterday") {
      const yest = getShiftedDate(today, -1);
      setFromDate(yest);
      setToDate(yest);
    } else if (preset === "last7") {
      setFromDate(getShiftedDate(today, -6));
      setToDate(today);
    } else if (preset === "this_month") {
      const firstDay = today.slice(0, 8) + "01";
      setFromDate(firstDay);
      setToDate(today);
    }
  };

  const handleShiftRange = (days: number) => {
    setFromDate((prev) => getShiftedDate(prev, days));
    setToDate((prev) => getShiftedDate(prev, days));
  };

  const handlePrint = () => {
    window.print();
  };

  // Group by Module
  const groupedByModule = useMemo(() => {
    const order: Array<SystemWorkLogItem["module"]> = ["operation", "finance", "sales", "manage_staff", "admin"];
    const labels: Record<SystemWorkLogItem["module"], { title: string; desc: string; icon: any; color: string }> = {
      operation: {
        title: "Operations & Tasks",
        desc: "Projects, subtasks, deliverables, files, comments, and timer activities",
        icon: Briefcase,
        color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
      },
      finance: {
        title: "Finance & Accounts",
        desc: "Invoices generated, customer payments received, expenses, and transaction records",
        icon: DollarSign,
        color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      },
      sales: {
        title: "Sales & Clients",
        desc: "New client registrations, leads, quotations, pipeline milestones, and deals",
        icon: Target,
        color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
      },
      manage_staff: {
        title: "Manage Staff & Attendance",
        desc: "Daily punch-ins, staff check-ins, attendance logs, and hours worked",
        icon: UserCheck,
        color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
      },
      admin: {
        title: "Admin & Settings",
        desc: "System configurations, category additions, permissions, and audit logs",
        icon: ShieldCheck,
        color: "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
      },
    };

    const map = new Map<SystemWorkLogItem["module"], SystemWorkLogItem[]>();
    for (const mod of order) {
      map.set(mod, []);
    }
    for (const item of logs) {
      const arr = map.get(item.module) || [];
      arr.push(item);
      map.set(item.module, arr);
    }

    return order
      .filter((mod) => (map.get(mod)?.length || 0) > 0 || moduleFilter === mod)
      .map((mod) => ({
        module: mod,
        meta: labels[mod],
        items: map.get(mod) || [],
      }));
  }, [logs, moduleFilter]);

  // Group by Client
  const groupedByClient = useMemo(() => {
    const map = new Map<string, { client_name: string; items: SystemWorkLogItem[] }>();
    for (const item of logs) {
      const key = item.client_id ? String(item.client_id) : item.client_name || "General / Internal";
      if (!map.has(key)) {
        map.set(key, {
          client_name: item.client_name || "General / Internal",
          items: [],
        });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [logs]);

  const getBadgeClass = (color: string) => {
    switch (color) {
      case "emerald":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
      case "blue":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20";
      case "amber":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
      case "rose":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";
      case "purple":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20";
    }
  };

  const getModuleIcon = (mod: string) => {
    switch (mod) {
      case "operation":
        return <Briefcase className="w-3.5 h-3.5 text-blue-500" />;
      case "finance":
        return <DollarSign className="w-3.5 h-3.5 text-emerald-500" />;
      case "sales":
        return <Target className="w-3.5 h-3.5 text-purple-500" />;
      case "manage_staff":
        return <UserCheck className="w-3.5 h-3.5 text-amber-500" />;
      case "admin":
        return <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-zinc-500" />;
    }
  };

  const getModuleBadge = (mod: string) => {
    switch (mod) {
      case "operation":
        return (
          <Badge variant="outline" className="text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
            Operation
          </Badge>
        );
      case "finance":
        return (
          <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
            Finance
          </Badge>
        );
      case "sales":
        return (
          <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20">
            Sales
          </Badge>
        );
      case "manage_staff":
        return (
          <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
            Manage Staff
          </Badge>
        );
      case "admin":
        return (
          <Badge variant="outline" className="text-[10px] font-bold bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20">
            Admin
          </Badge>
        );
      default:
        return null;
    }
  };

  const isToday = fromDate === todayStr && toDate === todayStr;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Date Filter Bar */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-blue-500/5 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>System-Wide Work Logs & Audit Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Daily Work Logs & Activity Hub
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Track and audit all changes, tasks, subtask updates, deliverable files, income, expenses, sales leads, and staff punch-ins module-wise date by date.
            </p>
          </div>

          {/* Date Range Selector Controls ("from to date needed as well") */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 bg-background/90 p-2.5 rounded-xl border shadow-2xs backdrop-blur-xs">
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer shrink-0"
                onClick={() => handleShiftRange(-1)}
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {/* From Date */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/40 rounded-lg border text-xs">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">From</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    const newFrom = e.target.value;
                    setFromDate(newFrom);
                    if (newFrom > toDate) setToDate(newFrom);
                  }}
                  className="bg-transparent text-xs font-bold outline-none cursor-pointer text-foreground"
                />
              </div>

              {/* To Date */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/40 rounded-lg border text-xs">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">To</span>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-transparent text-xs font-bold outline-none cursor-pointer text-foreground"
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer shrink-0"
                onClick={() => handleShiftRange(1)}
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1 overflow-x-auto pt-1 sm:pt-0">
              <Button
                variant={isToday ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs font-bold cursor-pointer"
                onClick={() => handleSetPreset("today")}
              >
                Today
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold cursor-pointer"
                onClick={() => handleSetPreset("yesterday")}
              >
                Yesterday
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold cursor-pointer"
                onClick={() => handleSetPreset("last7")}
              >
                Last 7D
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground shrink-0"
                onClick={fetchLogs}
                title="Refresh Logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5 cursor-pointer ml-1"
                onClick={handlePrint}
                title="Print Work Logs Report"
              >
                <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="hidden xl:inline">Print</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Date human display */}
        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-medium">
            <span>Viewing logs:</span>
            <span className="font-bold text-foreground">
              {fromDate === toDate
                ? new Date(fromDate + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : `${new Date(fromDate + "T00:00:00").toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })} → ${new Date(toDate + "T00:00:00").toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}`}
            </span>
            <span className="text-muted-foreground text-[11px] font-mono">
              (Times displayed in India Standard Time • IST)
            </span>
          </div>
          <Link
            href={tasksUrl}
            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
          >
            <span>Open Task Board</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <Card className="rounded-xl border shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Layers className="w-3 h-3 text-primary" /> Total Activities
            </span>
            <p className="text-xl font-black text-foreground">{summary.total_activities}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-blue-500" /> Tasks Worked On
            </span>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400">{summary.tasks_worked_on}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Subtasks Done
            </span>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {summary.subtasks_completed}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" /> Total Income
            </span>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              ₹{Number(summary.total_income || 0).toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-rose-500" /> Total Expenses
            </span>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400">
              ₹{Number(summary.total_expense || 0).toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-500" /> Active Staff
            </span>
            <p className="text-xl font-black text-purple-600 dark:text-purple-400">
              {summary.active_staff_count}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3 text-amber-500" /> Files / Proofs
            </span>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400">
              {summary.files_uploaded}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and View Mode Control Strip */}
      <div className="bg-card p-4 rounded-xl border shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Module Filter Tabs: All Logs, Operation, Finance, Sales, Manage Staff, Admin */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {MODULE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = moduleFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setModuleFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle: Timeline Stream | Group by Module | Group by Client (Group by Staff removed as requested) */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("stream")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                viewMode === "stream" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Timeline Stream
            </button>
            <button
              type="button"
              onClick={() => setViewMode("by_module")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                viewMode === "by_module" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Group by Module
            </button>
            <button
              type="button"
              onClick={() => setViewMode("by_client")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                viewMode === "by_client" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Group by Client
            </button>
          </div>
        </div>

        {/* Secondary Filters: Search, Staff Dropdown, Client Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by staff, task, client, notes, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs pl-8 bg-background font-medium"
            />
          </div>

          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="h-8 text-xs bg-background">
              <Users className="w-3.5 h-3.5 text-muted-foreground mr-1" />
              <SelectValue placeholder="All Staff Members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff Members</SelectItem>
              {staffOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="h-8 text-xs bg-background">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground mr-1" />
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clientOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-semibold">Aggregating work logs across all modules...</p>
        </div>
      ) : logs.length === 0 ? (
        <Card className="rounded-2xl border border-dashed p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No Activity Found for this Date Range</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            No changes, task updates, income, expense, sales, or attendance records were recorded between{" "}
            {fromDate} and {toDate}.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() => handleSetPreset("today")}>
              Go to Today
            </Button>
            <Button size="sm" variant="ghost" onClick={fetchLogs}>
              Refresh
            </Button>
          </div>
        </Card>
      ) : viewMode === "stream" ? (
        /* Stream / Timeline View */
        <div className="space-y-3">
          {logs.map((item) => (
            <div
              key={item.id}
              className="bg-card hover:bg-card/80 p-4 rounded-xl border border-border/70 hover:border-border transition-all shadow-2xs space-y-2.5"
            >
              {/* Header: User, Time, Module Badge, Action Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Avatar className="w-7 h-7 text-xs font-bold">
                    {item.user_avatar && <AvatarImage src={item.user_avatar} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                      {item.user_name?.slice(0, 2).toUpperCase() || "SY"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground text-xs">{item.user_name}</span>
                      {item.user_role && (
                        <span className="text-[10px] text-muted-foreground font-medium capitalize">
                          ({item.user_role.replace(/_/g, " ")})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {getModuleBadge(item.module)}

                  <Badge variant="outline" className={`text-[10px] font-bold py-0.5 px-2 border ${getBadgeClass(item.badge_color)}`}>
                    {getModuleIcon(item.module)}
                    <span className="ml-1 capitalize">{item.action_label}</span>
                  </Badge>

                  <div className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md font-semibold">
                    <Clock className="w-3 h-3 text-primary/70" />
                    <span>{item.time_display}</span>
                  </div>
                </div>
              </div>

              {/* Title & Entity Association */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground leading-snug">
                  {item.title}
                </p>

                {/* Sub-meta tags: Task, Subtask, Client, Amount, Category */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] pt-0.5">
                  {item.task_title && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium">
                      <Briefcase className="w-3 h-3 text-blue-500" />
                      <span>Task: {item.task_title}</span>
                    </span>
                  )}

                  {item.subtask_title && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 font-medium">
                      <CheckSquare className="w-3 h-3 text-purple-500" />
                      <span>Sub-task: {item.subtask_title}</span>
                    </span>
                  )}

                  {item.client_name && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
                      <Building2 className="w-3 h-3 text-amber-500" />
                      <span>Client: {item.client_name}</span>
                    </span>
                  )}

                  {typeof item.amount === "number" && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold ${
                        item.action.includes("income")
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      <DollarSign className="w-3 h-3" />
                      <span>₹{item.amount.toLocaleString("en-IN")}</span>
                    </span>
                  )}

                  {item.category_name && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                      <Tag className="w-3 h-3" />
                      <span>Category: {item.category_name}</span>
                    </span>
                  )}

                  {item.duration_minutes && item.duration_minutes > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 font-mono font-medium">
                      <Clock className="w-3 h-3" />
                      <span>Duration: {item.duration_minutes} min</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Work update notes or details */}
              {item.details && (
                <div className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/50 leading-relaxed whitespace-pre-wrap">
                  {item.details}
                </div>
              )}

              {/* Attachments / Deliverables / Proof files / GPS Location */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {item.file_url && (
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>View Deliverable Attachment</span>
                  </a>
                )}

                {item.location && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                    <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                    <span>{item.location.address || `${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}`}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "by_module" ? (
        /* Grouped by Module View ("task details needed modules wise") */
        <div className="space-y-6">
          {groupedByModule.map((group) => {
            const Icon = group.meta.icon;
            return (
              <Card key={group.module} className="rounded-2xl border shadow-xs overflow-hidden">
                <div className="bg-muted/40 px-5 py-3.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl border ${group.meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-foreground flex items-center gap-2">
                        <span>{group.meta.title}</span>
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {group.items.length} {group.items.length === 1 ? "activity" : "activities"}
                        </Badge>
                      </h3>
                      <p className="text-[11px] text-muted-foreground">{group.meta.desc}</p>
                    </div>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3 divide-y divide-border/40">
                  {group.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-3 text-center">
                      No logs recorded for {group.meta.title} in selected period.
                    </p>
                  ) : (
                    group.items.map((item) => (
                      <div key={item.id} className="pt-3 first:pt-0 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{item.title}</span>
                            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${getBadgeClass(item.badge_color)}`}>
                              {item.action_label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                            <span>{item.date_display}</span>
                            <span className="font-bold text-foreground">{item.time_display}</span>
                          </div>
                        </div>

                        {/* Associated Entities */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="text-muted-foreground font-medium">By: {item.user_name}</span>
                          {item.task_title && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium">
                              <Briefcase className="w-3 h-3 text-blue-500" />
                              Task: {item.task_title}
                            </span>
                          )}
                          {item.subtask_title && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 font-medium">
                              <CheckSquare className="w-3 h-3 text-purple-500" />
                              Subtask: {item.subtask_title}
                            </span>
                          )}
                          {item.client_name && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
                              <Building2 className="w-3 h-3 text-amber-500" />
                              Client: {item.client_name}
                            </span>
                          )}
                          {typeof item.amount === "number" && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold">
                              ₹{item.amount.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>

                        {item.details && (
                          <p className="text-xs text-muted-foreground leading-relaxed pl-2.5 border-l-2 border-primary/30">
                            {item.details}
                          </p>
                        )}

                        {item.file_url && (
                          <div className="pt-0.5">
                            <a
                              href={item.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                            >
                              <Download className="w-3 h-3" />
                              <span>View attachment / proof</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Grouped by Client View */
        <div className="space-y-4">
          {groupedByClient.map((group) => (
            <Card key={group.client_name} className="rounded-2xl border shadow-xs overflow-hidden">
              <div className="bg-muted/30 px-5 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{group.client_name}</h3>
                    <span className="text-[11px] text-muted-foreground">Client Activity Trail</span>
                  </div>
                </div>

                <Badge variant="secondary" className="text-xs font-bold">
                  {group.items.length} {group.items.length === 1 ? "activity" : "activities"}
                </Badge>
              </div>

              <CardContent className="p-4 space-y-2.5 divide-y divide-border/40">
                {group.items.map((item) => (
                  <div key={item.id} className="pt-2.5 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{item.title}</span>
                        {getModuleBadge(item.module)}
                        <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${getBadgeClass(item.badge_color)}`}>
                          {item.action_label}
                        </Badge>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-muted-foreground">{item.time_display}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>By: {item.user_name}</span>
                      {item.task_title && <span>• Project: {item.task_title}</span>}
                      {item.subtask_title && <span>• Sub-task: {item.subtask_title}</span>}
                    </div>

                    {item.details && (
                      <p className="text-xs text-muted-foreground leading-relaxed pl-2 border-l-2 border-amber-500/30">
                        {item.details}
                      </p>
                    )}

                    {item.file_url && (
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline pt-0.5"
                      >
                        <Download className="w-3 h-3" />
                        <span>View Attachment</span>
                      </a>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
