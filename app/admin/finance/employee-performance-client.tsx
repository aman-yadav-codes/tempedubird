"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BadgePercent,
  BarChart3,
  Briefcase,
  Building,
  CheckCircle2,
  ChevronRight,
  CreditCard,
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
  TrendingDown,
  TrendingUp,
  User,
  UserCheck,
  UsersRound,
  Wallet,
  XCircle,
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
import type { EmployeePerformanceRecord } from "@/app/api/admin/finance/employee-performance/route";

type ApiResponse = {
  success: boolean;
  timeframe: string;
  scope: string;
  summary: {
    total_staff_count: number;
    total_revenue_generated: number;
    total_staff_cost: number;
    total_commissions: number;
    total_allowances: number;
    net_value_generated: number;
    overall_roi: number;
  };
  top_performers: EmployeePerformanceRecord[];
  role_distribution: { role: string; staff_count: number; revenue: number; cost: number }[];
  employees: EmployeePerformanceRecord[];
};

export function EmployeePerformanceClient() {
  const pathname = usePathname();
  const { isReady, isForbidden } = useAdminGuard();
  const { user, accessToken } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isPlatformSection = pathname?.startsWith("/platformadmin");
  const targetInstitutionId = isPlatformSection ? null : activeInstitution?.id;

  const [timeframe, setTimeframe] = useState<"weekly" | "monthly" | "quarterly" | "yearly" | "all">("monthly");
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePerformanceRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!isReady || isForbidden) return;
    fetchEmployeePerformance();
  }, [isReady, isForbidden, timeframe, roleFilter, targetInstitutionId]);

  const fetchEmployeePerformance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("timeframe", timeframe);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (targetInstitutionId) {
        params.set("institution_id", String(targetInstitutionId));
      }

      const headers: Record<string, string> = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`/api/admin/finance/employee-performance?${params.toString()}`, { headers });
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
      } else {
        toast.error(json.error || "Failed to load employee financial performance stats.");
      }
    } catch (err) {
      console.error("Error loading performance data:", err);
      toast.error("Failed to load employee financial performance stats.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return [];
    if (!search.trim()) return data.employees;
    const query = search.toLowerCase().trim();
    return data.employees.filter(
      (e) =>
        e.full_name.toLowerCase().includes(query) ||
        (e.email && e.email.toLowerCase().includes(query)) ||
        e.role_name.toLowerCase().includes(query) ||
        (e.designation_title && e.designation_title.toLowerCase().includes(query))
    );
  }, [data?.employees, search]);

  const exportEmployeePerformanceCSV = () => {
    if (!data || filteredEmployees.length === 0) {
      toast.error("No employee data to export");
      return;
    }

    const headers = [
      "Employee Name",
      "Email",
      "Role",
      "Designation",
      "Institution",
      "Sales Count",
      "Revenue Generated (INR)",
      "Commissions Earned (INR)",
      "Allowances Received (INR)",
      "Base Salary (INR)",
      "Total Staff Cost (INR)",
      "Net Value Generated (INR)",
      "ROI (%)",
      "Performance Status",
    ];

    const rows = filteredEmployees.map((e) => [
      `"${e.full_name}"`,
      `"${e.email || ""}"`,
      `"${e.role_name}"`,
      `"${e.designation_title || ""}"`,
      `"${e.institution_name || ""}"`,
      e.sales_count,
      e.total_sales_revenue,
      e.total_commission_earned,
      e.total_allowances_received,
      e.base_salary,
      e.total_staff_cost,
      e.net_financial_contribution,
      `${e.roi_percentage}%`,
      e.performance_rating,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Employee_Finance_Performance_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredEmployees.length} employee performance records`);
  };

  const getStatusBadge = (rating: EmployeePerformanceRecord["performance_rating"]) => {
    switch (rating) {
      case "high_performer":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold gap-1">
            <Flame className="size-3 text-emerald-500" /> High Performer
          </Badge>
        );
      case "on_target":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold gap-1">
            <CheckCircle2 className="size-3 text-blue-500" /> On Target
          </Badge>
        );
      case "needs_attention":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold gap-1">
            <TrendingDown className="size-3 text-amber-500" /> Needs Review
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground font-semibold">
            Standard
          </Badge>
        );
    }
  };

  if (!isReady || isForbidden) return null;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <UsersRound className="size-6 text-primary" />
              Employee Financial Performance
            </h1>
            <Badge variant="outline" className="text-xs uppercase font-bold tracking-wider">
              {isPlatformSection || !targetInstitutionId ? "Platform Overview" : (activeInstitution?.name ?? "Institution Scope")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Audit staff-driven sales revenue, commission incentives, salary & allowance overheads, and net ROI contribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe Selector Pills */}
          <div className="inline-flex items-center rounded-xl border bg-muted/50 p-1 text-xs">
            <button
              onClick={() => setTimeframe("weekly")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer",
                timeframe === "weekly" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeframe("monthly")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer",
                timeframe === "monthly" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setTimeframe("quarterly")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer",
                timeframe === "quarterly" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Quarterly
            </button>
            <button
              onClick={() => setTimeframe("yearly")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer",
                timeframe === "yearly" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={exportEmployeePerformanceCSV}
            className="text-xs font-semibold gap-2 border-dashed shadow-2xs hover:border-primary"
          >
            <Download className="size-3.5 text-primary" />
            Export CSV
          </Button>

          <Button
            size="icon"
            variant="outline"
            onClick={fetchEmployeePerformance}
            disabled={loading}
            className="size-8"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue Generated */}
        <Card className="border-border/60 shadow-xs relative overflow-hidden bg-card/60 backdrop-blur-xs">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Staff Sales Revenue
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(data?.summary?.total_revenue_generated || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {data?.summary?.total_staff_count || 0} active
              </span>{" "}
              staff contributors
            </p>
          </CardContent>
        </Card>

        {/* Total Staff Cost */}
        <Card className="border-border/60 shadow-xs relative overflow-hidden bg-card/60 backdrop-blur-xs">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl -mr-6 -mt-6" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Staff Cost
            </CardTitle>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <CreditCard className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(data?.summary?.total_staff_cost || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              Salary + Allowances + Commissions
            </p>
          </CardContent>
        </Card>

        {/* Net Value Generated */}
        <Card className="border-border/60 shadow-xs relative overflow-hidden bg-card/60 backdrop-blur-xs">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-6 -mt-6" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Net Financial Gain
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <IndianRupee className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold tracking-tight",
              (data?.summary?.net_value_generated || 0) >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}>
              {formatCurrency(data?.summary?.net_value_generated || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              Net contribution after all staff expenses
            </p>
          </CardContent>
        </Card>

        {/* Overall Staff ROI */}
        <Card className="border-border/60 shadow-xs relative overflow-hidden bg-card/60 backdrop-blur-xs">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-6 -mt-6" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Cost Recovery / ROI
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BadgePercent className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {data?.summary?.overall_roi || 100}%
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {formatCurrency(data?.summary?.total_commissions || 0)}
              </span>{" "}
              commission payouts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Leaderboard Cards */}
      {data?.top_performers && data.top_performers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Award className="size-4 text-amber-500" />
              Top Revenue Generating Staff
            </h2>
            <span className="text-xs text-muted-foreground">Ranked by closed admissions & course sales</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.top_performers.slice(0, 5).map((performer, index) => (
              <Card
                key={performer.employee_id}
                onClick={() => {
                  setSelectedEmployee(performer);
                  setSheetOpen(true);
                }}
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md border-border/60 bg-card/70 group"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <Avatar className="size-10 border shadow-2xs">
                          <AvatarImage src={performer.avatar_url || ""} />
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                            {performer.full_name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-amber-500 text-[10px] font-black text-white grid place-items-center shadow-xs">
                          {index + 1}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {performer.full_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{performer.role_name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-border/50 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Revenue:</span>
                      <span className="font-bold text-foreground">{formatCurrency(performer.total_sales_revenue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Commission:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(performer.total_commission_earned)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Employee Table Section */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="p-4 sm:p-5 border-b space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Staff Financial Audit & Breakdown
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Itemized view of each staff member's financial generation vs. cost overheads.
              </CardDescription>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search staff name or role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="counsellor">Counsellors</SelectItem>
                  <SelectItem value="teacher">Teachers / Faculty</SelectItem>
                  <SelectItem value="admin">Administrators</SelectItem>
                  <SelectItem value="staff">Staff Members</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role & Institution</th>
                  <th className="py-3 px-4 text-right">Sales / Admissions</th>
                  <th className="py-3 px-4 text-right">Revenue Generated</th>
                  <th className="py-3 px-4 text-right">Commission</th>
                  <th className="py-3 px-4 text-right">Total Staff Cost</th>
                  <th className="py-3 px-4 text-right">Net Gain / Contribution</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="size-6 animate-spin text-primary" />
                        <span>Loading employee performance data...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      No staff records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isPositive = emp.net_financial_contribution >= 0;
                    return (
                      <tr
                        key={emp.employee_id}
                        className="hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setSheetOpen(true);
                        }}
                      >
                        {/* Staff Member */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8 border">
                              <AvatarImage src={emp.avatar_url || ""} />
                              <AvatarFallback className="text-[10px] font-bold bg-muted">
                                {emp.full_name?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-foreground text-xs group-hover:text-primary transition-colors">
                                {emp.full_name}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                                {emp.email || "No email"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role & Institution */}
                        <td className="py-3 px-4">
                          <p className="font-semibold text-foreground text-xs">{emp.role_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                            {emp.institution_name || emp.designation_title || "Campus Staff"}
                          </p>
                        </td>

                        {/* Sales Count */}
                        <td className="py-3 px-4 text-right font-medium text-foreground">
                          {emp.sales_count} closed
                        </td>

                        {/* Revenue Generated */}
                        <td className="py-3 px-4 text-right font-bold text-foreground">
                          {formatCurrency(emp.total_sales_revenue)}
                        </td>

                        {/* Commission */}
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(emp.total_commission_earned)}
                        </td>

                        {/* Total Cost */}
                        <td className="py-3 px-4 text-right font-medium text-muted-foreground">
                          {formatCurrency(emp.total_staff_cost)}
                        </td>

                        {/* Net Financial Gain */}
                        <td className="py-3 px-4 text-right font-bold">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              isPositive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            )}
                          >
                            {isPositive ? "+" : ""}
                            {formatCurrency(emp.net_financial_contribution)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          {getStatusBadge(emp.performance_rating)}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs font-semibold gap-1 group-hover:bg-primary/10 group-hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEmployee(emp);
                              setSheetOpen(true);
                            }}
                          >
                            Breakdown
                            <ChevronRight className="size-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Employee Breakdown Drill-Down Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto space-y-6">
          <SheetHeader className="border-b pb-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 border">
                <AvatarImage src={selectedEmployee?.avatar_url || ""} />
                <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                  {selectedEmployee?.full_name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-lg font-bold text-foreground">
                  {selectedEmployee?.full_name}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {selectedEmployee?.role_name} • {selectedEmployee?.institution_name || "Institution Staff"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {selectedEmployee && (
            <div className="space-y-6">
              {/* Financial Balance Overview */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border bg-muted/30 space-y-1">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Total Revenue Generated
                  </p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(selectedEmployee.total_sales_revenue)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    From {selectedEmployee.sales_count} admissions & sales
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border bg-muted/30 space-y-1">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Total Staff Cost (Overhead)
                  </p>
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(selectedEmployee.total_staff_cost)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Salary + Allowances + Commission
                  </p>
                </div>
              </div>

              {/* Cost Breakdown Details */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Staff Expense Breakdown
                </h3>
                <div className="rounded-lg border divide-y text-xs">
                  <div className="flex items-center justify-between p-2.5">
                    <span className="text-muted-foreground">Base Salary:</span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(selectedEmployee.base_salary)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5">
                    <span className="text-muted-foreground">Commission Incentives:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(selectedEmployee.total_commission_earned)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5">
                    <span className="text-muted-foreground">Operational Allowances:</span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(selectedEmployee.total_allowances_received)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-muted/20">
                    <span className="font-bold text-foreground">Net Value Generated:</span>
                    <span className={cn(
                      "font-bold",
                      selectedEmployee.net_financial_contribution >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    )}>
                      {formatCurrency(selectedEmployee.net_financial_contribution)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Sales Conversions */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Recent Sales Conversions & Admissions
                </h3>
                {selectedEmployee.recent_sales && selectedEmployee.recent_sales.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEmployee.recent_sales.map((sale) => (
                      <div
                        key={sale.id}
                        className="p-3 rounded-lg border bg-card/60 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{sale.course_title}</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(sale.sale_amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Student: {sale.student_name || "Direct Admission"}</span>
                          <span>Commission: {formatCurrency(sale.commission_amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic p-3 rounded-lg border text-center">
                    No individual sales conversion logs recorded for this period.
                  </p>
                )}
              </div>

              {/* Recent Allowances Distributed */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Operational Allowances Received
                </h3>
                {selectedEmployee.recent_allowances && selectedEmployee.recent_allowances.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEmployee.recent_allowances.map((allow) => (
                      <div
                        key={allow.id}
                        className="p-3 rounded-lg border bg-card/60 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{allow.description || "Operational Allowance"}</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            {formatCurrency(allow.amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Method: {allow.payment_method.toUpperCase()}</span>
                          <span>Date: {allow.allowance_date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic p-3 rounded-lg border text-center">
                    No allowance records found for this employee.
                  </p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
