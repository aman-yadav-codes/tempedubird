"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  Award,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Flame,
  HelpCircle,
  IndianRupee,
  Layers,
  Loader2,
  Percent,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  UserCheck,
  UsersRound,
  Wallet,
  XCircle,
  FileText,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import type { StaffPerformanceRecord } from "@/app/api/admin/staff/performance/route";

type ApiResponse = {
  success: boolean;
  timeframe: string;
  scope: string;
  summary: {
    total_staff_count: number;
    total_tasks_delivered: number;
    total_revenue_generated: number;
    total_staff_cost: number;
    total_commissions: number;
    total_allowances: number;
    net_value_generated: number;
    overall_roi: number;
    avg_attendance: number;
    top_performers_count: number;
  };
  top_performers: StaffPerformanceRecord[];
  role_distribution: { role: string; staff_count: number; tasks_done: number; revenue: number; cost: number }[];
  employees: StaffPerformanceRecord[];
};

export function StaffPerformanceClient() {
  const pathname = usePathname();
  const { isReady, isForbidden } = useAdminGuard();
  const { user, accessToken } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isPlatformSection = pathname?.startsWith("/platformadmin");

  const [timeframe, setTimeframe] = useState<"weekly" | "monthly" | "quarterly" | "yearly" | "all">("monthly");
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffPerformanceRecord | null>(null);
  const [masterDesignations, setMasterDesignations] = useState<Array<{ id: number; name: string }>>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  // Manual Points Adjustment Modal State
  const [adjustPointsModalOpen, setAdjustPointsModalOpen] = useState(false);
  const [adjustPointsStaff, setAdjustPointsStaff] = useState<StaffPerformanceRecord | null>(null);
  const [adjustPointsType, setAdjustPointsType] = useState<"manual_bonus" | "manual_penalty">("manual_bonus");
  const [adjustPointsValue, setAdjustPointsValue] = useState("25");
  const [adjustPointsReason, setAdjustPointsReason] = useState("");
  const [adjustingPoints, setAdjustingPoints] = useState(false);



  // Load designations from master-data table
  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/admin/master-data/designations?limit=100", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((resData) => {
        if (Array.isArray(resData.designations)) {
          setMasterDesignations(resData.designations);
        } else if (Array.isArray(resData.data)) {
          setMasterDesignations(resData.data);
        }
      })
      .catch(() => {});
  }, [accessToken]);

  const fetchData = useCallback(
    async (isManualRefresh = false) => {
      if (!accessToken) return;
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("timeframe", timeframe);
        if (roleFilter !== "all") params.set("role", roleFilter);
        if (search.trim()) params.set("search", search.trim());

        if (!isPlatformAdmin && activeInstitution?.id) {
          params.set("institution_id", String(activeInstitution.id));
        }

        const res = await fetch(`/api/admin/staff/performance?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load staff performance data");
        }

        setData(json);
      } catch (err: any) {
        toast.error(err.message || "Failed to fetch staff performance");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, timeframe, roleFilter, search, isPlatformAdmin, activeInstitution]
  );

  useEffect(() => {
    if (isReady && !isForbidden) {
      fetchData();
    }
  }, [isReady, isForbidden, fetchData]);

  const employees = useMemo(() => data?.employees || [], [data]);

  // Combined roles from designations table and active staff roles
  const availableRoles = useMemo(() => {
    const rolesSet = new Set<string>();
    masterDesignations.forEach((d) => {
      if (d.name) rolesSet.add(d.name);
    });
    if (data?.employees) {
      data.employees.forEach((e) => {
        if (e.role_name) rolesSet.add(e.role_name);
        if (e.designation_title) rolesSet.add(e.designation_title);
      });
    }
    return Array.from(rolesSet).filter(Boolean).sort();
  }, [data, masterDesignations]);

  // Search suggestions
  const searchSuggestions = useMemo(() => {
    if (!search.trim() || !data?.employees) return [];
    const q = search.trim().toLowerCase();
    return data.employees
      .filter(
        (e) =>
          e.full_name.toLowerCase().includes(q) ||
          (e.email && e.email.toLowerCase().includes(q)) ||
          (e.role_name && e.role_name.toLowerCase().includes(q)) ||
          (e.designation_title && e.designation_title.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [search, data]);

  const handleOpenAdjustPoints = (staff: StaffPerformanceRecord) => {
    setAdjustPointsStaff(staff);
    setAdjustPointsType("manual_bonus");
    setAdjustPointsValue("25");
    setAdjustPointsReason("");
    setAdjustPointsModalOpen(true);
  };

  const handleSaveAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustPointsStaff || !accessToken) return;

    const numPoints = parseFloat(adjustPointsValue);
    if (isNaN(numPoints) || numPoints <= 0) {
      toast.error("Please enter a valid points amount");
      return;
    }

    setAdjustingPoints(true);
    try {
      const res = await fetch("/api/admin/staff/points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          employee_id: adjustPointsStaff.employee_id,
          points: numPoints,
          action_type: adjustPointsType,
          reason: adjustPointsReason.trim() || (adjustPointsType === "manual_bonus" ? "Performance bonus awarded" : "Performance penalty deduction"),
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to adjust points");

      toast.success(resData.message || "Points updated successfully!");
      setAdjustPointsModalOpen(false);
      await fetchData(true);

      // Update selectedStaff if currently open
      if (selectedStaff && selectedStaff.employee_id === adjustPointsStaff.employee_id) {
        const signedPoints = adjustPointsType === "manual_penalty" ? -Math.abs(numPoints) : numPoints;
        setSelectedStaff((prev) => {
          if (!prev) return null;
          const updatedTotal = (prev.total_performance_points || 0) + signedPoints;
          const updatedPos = signedPoints > 0 ? (prev.positive_points_earned || 0) + signedPoints : (prev.positive_points_earned || 0);
          const updatedNeg = signedPoints < 0 ? (prev.penalty_points_deducted || 0) + Math.abs(signedPoints) : (prev.penalty_points_deducted || 0);
          const newEntry = {
            id: Date.now(),
            point_type: adjustPointsType,
            points: signedPoints,
            reason: adjustPointsReason.trim() || (adjustPointsType === "manual_bonus" ? "Performance bonus awarded" : "Performance penalty deduction"),
            date: new Date().toISOString().split("T")[0],
          };
          return {
            ...prev,
            total_performance_points: updatedTotal,
            positive_points_earned: updatedPos,
            penalty_points_deducted: updatedNeg,
            recent_points_history: [newEntry, ...(prev.recent_points_history || [])],
          };
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to adjust points");
    } finally {
      setAdjustingPoints(false);
    }
  };

  const exportCSV = () => {
    if (!employees.length) {
      toast.error("No employee data available to export");
      return;
    }

    const headers = [
      "Staff ID",
      "Full Name",
      "Role",
      "Designation",
      "Institution",
      "Tasks Completed",
      "On-time Delivery %",
      "Sales Count",
      "Total Revenue (₹)",
      "Total Staff Cost (₹)",
      "Net Value Generated (₹)",
      "ROI %",
      "Attendance %",
      "Rating (Out of 5)",
      "Performance Category",
    ];

    const rows = employees.map((e) => [
      e.employee_id,
      `"${e.full_name}"`,
      `"${e.role_name}"`,
      `"${e.designation_title || "-"}"`,
      `"${e.institution_name || (isPlatformAdmin ? "Platform Admin Staff" : "-")}"`,
      e.tasks_completed_count,
      `${e.tasks_on_time_rate}%`,
      e.sales_count,
      e.total_sales_revenue + e.tasks_billed_value,
      e.total_staff_cost,
      e.net_financial_contribution,
      `${e.roi_percentage}%`,
      `${e.attendance_rate}%`,
      e.rating_score,
      `"${e.performance_rating}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Staff_Performance_Report_${timeframe}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Staff performance report downloaded successfully");
  };

  const getRatingBadge = (rating: StaffPerformanceRecord["performance_rating"]) => {
    switch (rating) {
      case "top_performer":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[10px] font-bold">
            <Flame className="w-3 h-3 text-amber-500 fill-amber-500" /> Top Performer
          </Badge>
        );
      case "on_target":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1 text-[10px] font-bold">
            <Target className="w-3 h-3 text-blue-500" /> On Target
          </Badge>
        );
      case "needs_attention":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-[10px] font-bold">
            <AlertCircle className="w-3 h-3 text-amber-500" /> Needs Attention
          </Badge>
        );
      case "new_joiner":
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground gap-1 text-[10px] font-medium">
            <Sparkles className="w-3 h-3 text-primary" /> New Joiner
          </Badge>
        );
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted rounded-xl animate-pulse" />
            <div className="h-4 w-96 bg-muted/60 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted/40 rounded-2xl border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    total_staff_count: 0,
    total_tasks_delivered: 0,
    total_revenue_generated: 0,
    total_staff_cost: 0,
    total_commissions: 0,
    total_allowances: 0,
    net_value_generated: 0,
    overall_roi: 100,
    avg_attendance: 94,
    top_performers_count: 0,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Employee & Staff Performance
                {isPlatformAdmin ? (
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-bold">
                    Platform Staff
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-xs font-bold">
                    {activeInstitution?.name || "Institution Scope"}
                  </Badge>
                )}
              </h1>
              <p className="text-xs text-muted-foreground">
                Track deliverable milestones, task completion, financial ROI, commissions, and staff productivity metrics.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">


          {/* Timeframe Selector */}
          <Select value={timeframe} onValueChange={(v: any) => setTimeframe(v)}>
            <SelectTrigger className="h-9 text-xs w-32 bg-background font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly" className="text-xs">This Week</SelectItem>
              <SelectItem value="monthly" className="text-xs">This Month</SelectItem>
              <SelectItem value="quarterly" className="text-xs">This Quarter</SelectItem>
              <SelectItem value="yearly" className="text-xs">This Year</SelectItem>
              <SelectItem value="all" className="text-xs">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-primary")} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="h-9 gap-1.5 text-xs font-semibold bg-background"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Stats Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="rounded-2xl border bg-card/60 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Total Staff</span>
              <UsersRound className="w-4 h-4 text-primary" />
            </div>
            <div className="text-xl font-bold font-mono text-foreground">{summary.total_staff_count}</div>
            <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <span className="text-emerald-600 font-bold font-mono">{summary.top_performers_count}</span> Top Rated
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Tasks Delivered</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold font-mono text-foreground">{summary.total_tasks_delivered}</div>
            <p className="text-[10px] text-muted-foreground font-medium">Completed on-time</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Total Value</span>
              <IndianRupee className="w-4 h-4 text-primary" />
            </div>
            <div className="text-xl font-bold font-mono text-foreground">
              ₹{Math.round(summary.total_revenue_generated / 1000)}k
            </div>
            <p className="text-[10px] text-emerald-600 font-medium">Revenue & task billings</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Staff Cost</span>
              <Wallet className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold font-mono text-foreground">
              ₹{Math.round(summary.total_staff_cost / 1000)}k
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">Salary + Commissions</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Net ROI</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 font-mono">
              {summary.overall_roi}%
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">
              Net ₹{Math.round(summary.net_value_generated / 1000)}k
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Avg Attendance</span>
              <UserCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-bold font-mono text-foreground">{summary.avg_attendance}%</div>
            <p className="text-[10px] text-emerald-600 font-medium">Punctual & Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Spotlight Leaderboard */}
      {data?.top_performers && data.top_performers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Top Performers Leaderboard</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">Ranked by Deliverables & Value Contribution</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {data.top_performers.map((p, idx) => {
              const trophyColor =
                idx === 0
                  ? "bg-amber-500/20 text-amber-700 border-amber-500/30"
                  : idx === 1
                  ? "bg-slate-300/40 text-slate-700 border-slate-400/40"
                  : idx === 2
                  ? "bg-amber-700/20 text-amber-800 border-amber-700/30"
                  : "bg-muted text-muted-foreground border-border";

              return (
                <div
                  key={p.employee_id}
                  onClick={() => setSelectedStaff(p)}
                  className="p-3.5 rounded-2xl border bg-card/80 hover:border-primary/50 transition-all cursor-pointer shadow-2xs space-y-2.5 relative group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <Avatar className="w-10 h-10 border-2 border-primary/20">
                        <AvatarImage src={p.avatar_url || ""} alt={p.full_name} />
                        <AvatarFallback className="text-xs font-bold text-primary bg-primary/10">
                          {p.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          "absolute -top-1.5 -left-1.5 text-[9px] font-black w-4.5 h-4.5 rounded-full border flex items-center justify-center shadow-xs",
                          trophyColor
                        )}
                      >
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {p.full_name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground truncate">{p.role_name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t text-[11px]">
                    <div>
                      <span className="text-[9px] text-muted-foreground block">Tasks Done</span>
                      <span className="font-bold font-mono text-foreground">{p.tasks_completed_count}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground block">Value</span>
                      <span className="font-bold font-mono text-emerald-600">
                        ₹{(p.total_sales_revenue + p.tasks_billed_value).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter & Search Bar with Autocomplete Suggestions */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-muted/20 p-3 rounded-2xl border relative">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onFocus={() => setShowSearchSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 250)}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSearchSuggestions(true);
            }}
            placeholder="Search staff by name, role, email, or designation..."
            className="pl-9 bg-background h-10 text-xs rounded-xl"
          />

          {/* Autocomplete Suggestions Popup */}
          {showSearchSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-12 z-50 bg-popover/95 backdrop-blur-md border border-border shadow-xl rounded-2xl p-2 max-h-72 overflow-y-auto space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Matching Platform & Institution Staff</span>
                <span>{searchSuggestions.length} found</span>
              </div>
              {searchSuggestions.map((staff) => (
                <div
                  key={staff.employee_id}
                  onMouseDown={() => {
                    setSearch(staff.full_name);
                    setSelectedStaff(staff);
                    setShowSearchSuggestions(false);
                  }}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="w-8 h-8 border border-primary/20 shrink-0">
                      <AvatarImage src={staff.avatar_url || ""} />
                      <AvatarFallback className="text-[10px] font-bold text-primary bg-primary/10">
                        {staff.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{staff.full_name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>{staff.role_name}</span>
                        {staff.designation_title && (
                          <span className="text-primary font-medium">({staff.designation_title})</span>
                        )}
                        {staff.institution_name ? (
                          <span className="truncate">· {staff.institution_name}</span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">· EduBird Company</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <span className="text-[11px] font-bold font-mono text-emerald-600 block">
                      ₹{(staff.total_sales_revenue + staff.tasks_billed_value).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {staff.tasks_completed_count} tasks done
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Role Filter */}
        <div className="w-full sm:w-48">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-10 text-xs bg-background rounded-xl">
              <SelectValue placeholder="All Roles & Designations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-semibold">All Roles & Positions</SelectItem>
              {availableRoles.map((r) => (
                <SelectItem key={r} value={r} className="text-xs">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={cn(
              "p-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
              viewMode === "cards" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
            title="Grid Cards View"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "p-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
              viewMode === "table" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
            title="Detailed Table View"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Staff Performance Listing */}
      {employees.length === 0 ? (
        <Card className="rounded-2xl border border-dashed p-8 text-center bg-card/40">
          <p className="text-xs text-muted-foreground">No employee performance records found for this timeframe.</p>
        </Card>
      ) : viewMode === "cards" ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((staff) => {
            const totalValue = staff.total_sales_revenue + staff.tasks_billed_value;

            return (
              <Card
                key={staff.employee_id}
                className="rounded-2xl border bg-card/80 hover:border-primary/50 transition-all shadow-xs space-y-4 p-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar: Avatar, Name, Role, Rating Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-11 h-11 border-2 border-primary/20 shrink-0">
                        <AvatarImage src={staff.avatar_url || ""} alt={staff.full_name} />
                        <AvatarFallback className="text-xs font-bold text-primary bg-primary/10">
                          {staff.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-foreground truncate">{staff.full_name}</h4>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-medium text-muted-foreground">{staff.role_name}</span>
                          {staff.designation_title && (
                            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.2 rounded font-medium truncate max-w-[120px]">
                              {staff.designation_title}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {getRatingBadge(staff.performance_rating)}
                  </div>

                  {/* Institution tag if platform admin */}
                  {isPlatformAdmin && staff.institution_name && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 bg-muted/20 px-2.5 py-1 rounded-lg border">
                      <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{staff.institution_name}</span>
                    </div>
                  )}

                  {/* KPI Metrics Strip with Performance Points */}
                  <div className="grid grid-cols-4 gap-1.5 bg-muted/30 p-2.5 rounded-xl border text-center text-xs">
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Tasks Done</span>
                      <span className="font-bold text-foreground font-mono">{staff.tasks_completed_count}</span>
                    </div>
                    <div className="border-x">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Points XP</span>
                      <span className={cn(
                        "font-bold font-mono",
                        (staff.total_performance_points || 0) >= 0 ? "text-amber-600 dark:text-amber-400" : "text-rose-600"
                      )}>
                        {(staff.total_performance_points || 0) > 0 ? `+${staff.total_performance_points}` : staff.total_performance_points || 0}
                      </span>
                    </div>
                    <div className="border-r">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Total Value</span>
                      <span className="font-bold text-emerald-600 font-mono">₹{Math.round(totalValue / 1000)}k</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">ROI</span>
                      <span className="font-bold text-primary font-mono">{staff.roi_percentage}%</span>
                    </div>
                  </div>

                  {/* Progress Bars: On-Time Delivery & Attendance */}
                  <div className="space-y-2 pt-1 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Task Delivery Rate</span>
                        <span className="font-bold text-foreground font-mono">{staff.tasks_on_time_rate}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(100, staff.tasks_on_time_rate)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Attendance & Punctuality</span>
                        <span className="font-bold text-foreground font-mono">{staff.attendance_rate}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, staff.attendance_rate)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStaff(staff)}
                    className="w-full text-xs font-bold justify-between h-8 text-primary hover:text-primary hover:bg-primary/5"
                  >
                    <span>View Performance Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Detailed Table View */
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-bold">
                  <th className="p-3">Staff Member</th>
                  <th className="p-3">Role & Designation</th>
                  <th className="p-3 text-center">Tasks Done</th>
                  <th className="p-3 text-center">Points XP</th>
                  <th className="p-3 text-right">Total Value</th>
                  <th className="p-3 text-right">Staff Cost</th>
                  <th className="p-3 text-right">Net Value</th>
                  <th className="p-3 text-center">ROI %</th>
                  <th className="p-3 text-center">Attendance</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employees.map((staff) => {
                  const totalValue = staff.total_sales_revenue + staff.tasks_billed_value;

                  return (
                    <tr key={staff.employee_id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={staff.avatar_url || ""} />
                            <AvatarFallback className="text-[10px] font-bold text-primary bg-primary/10">
                              {staff.full_name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-bold text-foreground truncate">{staff.full_name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{staff.email || staff.phone || "-"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{staff.role_name}</div>
                        <div className="text-[10px] text-muted-foreground">{staff.designation_title || "-"}</div>
                      </td>
                      <td className="p-3 text-center font-bold font-mono">{staff.tasks_completed_count}</td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-mono font-bold text-[10px] px-1.5 py-0.5",
                            (staff.total_performance_points || 0) >= 0
                              ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
                              : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                          )}
                        >
                          {(staff.total_performance_points || 0) > 0 ? `+${staff.total_performance_points}` : staff.total_performance_points || 0} pts
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-bold font-mono text-emerald-600">
                        ₹{totalValue.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-right font-mono text-muted-foreground">
                        ₹{staff.total_staff_cost.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-right font-bold font-mono text-foreground">
                        ₹{staff.net_financial_contribution.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-center font-bold font-mono text-primary">{staff.roi_percentage}%</td>
                      <td className="p-3 text-center font-mono">{staff.attendance_rate}%</td>
                      <td className="p-3 text-center">{getRatingBadge(staff.performance_rating)}</td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedStaff(staff)}
                          className="h-7 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Detailed Breakdown Sheet / Modal */}
      <Sheet open={Boolean(selectedStaff)} onOpenChange={(open) => !open && setSelectedStaff(null)}>
        <SheetContent className="sm:max-w-[650px] w-[95vw] overflow-y-auto p-6 space-y-6">
          {selectedStaff && (
            <>
              <SheetHeader className="border-b pb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-14 h-14 border-2 border-primary/20">
                    <AvatarImage src={selectedStaff.avatar_url || ""} />
                    <AvatarFallback className="text-base font-bold text-primary bg-primary/10">
                      {selectedStaff.full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <SheetTitle className="text-lg font-bold text-foreground">{selectedStaff.full_name}</SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground">
                      {selectedStaff.role_name} {selectedStaff.designation_title ? `• ${selectedStaff.designation_title}` : ""}
                    </SheetDescription>
                    <div className="pt-1">{getRatingBadge(selectedStaff.performance_rating)}</div>
                  </div>
                </div>
              </SheetHeader>

              {/* KPI Score Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-3 rounded-xl bg-muted/30 border">
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">Tasks Completed</span>
                  <span className="text-lg font-bold font-mono text-foreground">{selectedStaff.tasks_completed_count}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border">
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">On-Time Rate</span>
                  <span className="text-lg font-bold font-mono text-emerald-600">{selectedStaff.tasks_on_time_rate}%</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border">
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">Net Contribution</span>
                  <span className="text-lg font-bold font-mono text-primary">
                    ₹{selectedStaff.net_financial_contribution.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border">
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">ROI Return</span>
                  <span className="text-lg font-bold font-mono text-emerald-600">{selectedStaff.roi_percentage}%</span>
                </div>
              </div>

              {/* Performance Points & Admin Points Adjustment Action */}
              <div className="p-4 rounded-2xl border bg-gradient-to-br from-amber-500/10 via-background to-emerald-500/10 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Performance Points (XP)
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Earned from completed tasks & positive admin reviews
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleOpenAdjustPoints(selectedStaff)}
                    className="h-8 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>➕ / ➖ Adjust Points</span>
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-background/80 border">
                    <span className="text-[10px] text-muted-foreground block font-medium">Net Points</span>
                    <span className={cn(
                      "text-lg font-bold font-mono",
                      (selectedStaff.total_performance_points || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {(selectedStaff.total_performance_points || 0) > 0 ? `+${selectedStaff.total_performance_points}` : selectedStaff.total_performance_points || 0}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-background/80 border">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-medium">Earned Rewards</span>
                    <span className="text-lg font-bold font-mono text-emerald-600">
                      +{selectedStaff.positive_points_earned || 0}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-background/80 border">
                    <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-medium">Penalties Deducted</span>
                    <span className="text-lg font-bold font-mono text-rose-600">
                      -{selectedStaff.penalty_points_deducted || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Points History Ledger */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span>Points Ledger & Penalty History</span>
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    {selectedStaff.recent_points_history?.length || 0} entries
                  </span>
                </div>

                {(!selectedStaff.recent_points_history || selectedStaff.recent_points_history.length === 0) ? (
                  <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border">
                    No points recorded yet. Points are automatically awarded when tasks are completed or manually adjusted by admins.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {selectedStaff.recent_points_history.map((entry) => {
                      const isPositive = Number(entry.points) > 0;
                      return (
                        <div
                          key={entry.id}
                          className="p-3 rounded-xl bg-background border text-xs flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-foreground truncate">{entry.reason}</div>
                            {entry.task_title && (
                              <div className="text-[10px] text-muted-foreground truncate">
                                Task: {entry.task_title}
                              </div>
                            )}
                            <div className="text-[10px] text-muted-foreground font-mono">{entry.date}</div>
                          </div>

                          <div className="text-right shrink-0">
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-mono font-bold text-xs px-2 py-0.5",
                                isPositive
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                              )}
                            >
                              {isPositive ? `+${entry.points}` : entry.points} PTS
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Tasks Completed */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Recent Operations Tasks & Deliverables</span>
                  </h4>
                  <span className="text-[11px] text-muted-foreground">{selectedStaff.recent_tasks.length} items</span>
                </div>

                {selectedStaff.recent_tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border">No recent assigned task history.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedStaff.recent_tasks.map((task, i) => (
                      <div key={i} className="p-3 rounded-xl bg-background border text-xs flex items-center justify-between gap-2 shadow-2xs">
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">{task.title}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{task.duration_hours}h estimated duration</div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold font-mono text-primary">₹{task.price?.toLocaleString("en-IN")}</span>
                          <span className="block text-[9px] uppercase font-bold text-emerald-600">{task.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Sales & Commissions */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <IndianRupee className="w-4 h-4 text-primary" />
                    <span>Sales, Admissions & Commissions</span>
                  </h4>
                  <span className="text-[11px] text-muted-foreground">{selectedStaff.recent_sales.length} records</span>
                </div>

                {selectedStaff.recent_sales.length === 0 ? (
                  <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border">No recent direct sales record.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedStaff.recent_sales.map((sale) => (
                      <div key={sale.id} className="p-3 rounded-xl bg-background border text-xs flex items-center justify-between gap-2 shadow-2xs">
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">{sale.course_title}</div>
                          <div className="text-[10px] text-muted-foreground">Student: {sale.student_name || "Enrolled Candidate"}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold font-mono text-emerald-600">₹{sale.sale_amount?.toLocaleString("en-IN")}</span>
                          <span className="block text-[10px] text-primary font-mono font-medium">+₹{sale.commission_amount} Comm.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* MODAL: Assign / Deduct Performance Points for Employee */}
      <Dialog open={adjustPointsModalOpen} onOpenChange={setAdjustPointsModalOpen}>
        <DialogContent className="sm:max-w-md w-[92vw] p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Adjust Performance Points</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Directly award bonus points or deduct penalty points for <strong>{adjustPointsStaff?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAdjustPoints} className="space-y-4 pt-1">
            {/* Action Type: Reward vs Penalty */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustPointsType("manual_bonus")}
                className={cn(
                  "p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer",
                  adjustPointsType === "manual_bonus"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="block text-base">➕</span>
                <span>Award Bonus (+PTS)</span>
              </button>

              <button
                type="button"
                onClick={() => setAdjustPointsType("manual_penalty")}
                className={cn(
                  "p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer",
                  adjustPointsType === "manual_penalty"
                    ? "bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 shadow-xs"
                    : "bg-muted/30 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="block text-base">➖</span>
                <span>Deduct Penalty (-PTS)</span>
              </button>
            </div>

            {/* Points Value */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Points Amount</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={adjustPointsValue}
                  onChange={(e) => setAdjustPointsValue(e.target.value)}
                  placeholder="25"
                  className="text-xs h-9 font-mono pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  PTS
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                {["10", "25", "50", "100"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAdjustPointsValue(preset)}
                    className="px-2 py-0.5 rounded-lg border text-[10px] font-mono bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {adjustPointsType === "manual_bonus" ? `+${preset}` : `-${preset}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason / Note */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason / Note *</Label>
              <Input
                required
                value={adjustPointsReason}
                onChange={(e) => setAdjustPointsReason(e.target.value)}
                placeholder={
                  adjustPointsType === "manual_bonus"
                    ? "e.g. Exceptional client presentation, zero escalation delivery"
                    : "e.g. Unannounced absence, delay in critical task submission"
                }
                className="text-xs h-9"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdjustPointsModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={adjustingPoints}
                className={cn(
                  "text-xs font-bold text-white",
                  adjustPointsType === "manual_bonus" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                )}
              >
                {adjustingPoints && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {adjustPointsType === "manual_bonus" ? `Award +${adjustPointsValue} Points` : `Deduct -${adjustPointsValue} Points`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
