"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
  Building2,
  Calendar,
  CalendarDays,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  IndianRupee,
  Loader2,
  PieChart,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { useAuthStore } from "@/store";

type PerformanceData = {
  timeframe: "weekly" | "monthly" | "yearly";
  scope: "platform" | "institution";
  summary: {
    gross_income: number;
    total_expense: number;
    net_income: number;
    profit_margin: number;
    is_profitable: boolean;
    income_growth_percentage: number;
    expense_growth_percentage: number;
    net_profit_growth_percentage: number;
  };
  chart_data: {
    period: string;
    gross_income: number;
    total_expense: number;
    net_income: number;
    profit_margin: number;
  }[];
  breakdown: {
    income_sources: { category: string; amount: number; percentage: number }[];
    expense_sources: { category: string; amount: number; percentage: number }[];
  };
};

export function PerformanceClient() {
  const pathname = usePathname();
  const { isReady, isForbidden } = useAdminGuard();
  const { user, accessToken } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isPlatformSection = pathname?.startsWith("/platformadmin");
  const targetInstitutionId = isPlatformSection ? null : activeInstitution?.id;

  const [timeframe, setTimeframe] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady || isForbidden) return;
    fetchPerformanceData();
  }, [isReady, isForbidden, timeframe, targetInstitutionId]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("timeframe", timeframe);
      if (targetInstitutionId) {
        params.set("institution_id", String(targetInstitutionId));
      }

      const headers: Record<string, string> = {};
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`/api/admin/finance/performance?${params.toString()}`, { headers });
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
      } else {
        toast.error(json.error || "Failed to load financial performance stats.");
      }
    } catch (err) {
      console.error("Error loading performance data:", err);
      toast.error("Failed to load financial performance stats.");
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

  const exportPnLReport = () => {
    if (!data) return;
    const headers = ["Period", "Gross Income (INR)", "Total Expense (INR)", "Net Profit / Loss (INR)", "Margin (%)"];
    const rows = data.chart_data.map((item) => [
      item.period,
      item.gross_income,
      item.total_expense,
      item.net_income,
      `${item.profit_margin}%`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PnL_Report_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${timeframe.toUpperCase()} Profit & Loss Report CSV`);
  };

  if (!isReady || isForbidden) return null;

  const maxVal = data?.chart_data?.reduce((max, item) => Math.max(max, item.gross_income, item.total_expense), 1000) || 1000;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Financial Performance & P&L Audit</h1>
            <Badge variant="outline" className="text-xs uppercase font-bold tracking-wider">
              {isPlatformSection || !targetInstitutionId ? "Platform Overview" : (activeInstitution?.name ?? "Institution Scope")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time Profit & Loss statement, Gross Income, Total Expenses, Net Margin, and time-series audit.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe Selector Pills */}
          <div className="inline-flex items-center rounded-xl border bg-muted/50 p-1 text-xs">
            <button
              onClick={() => setTimeframe("weekly")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeframe === "weekly" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeframe("monthly")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeframe === "monthly" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setTimeframe("yearly")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timeframe === "yearly" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={exportPnLReport}
            disabled={loading || !data}
            className="text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export P&L CSV</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchPerformanceData}
            disabled={loading}
            className="text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs">Calculating Financial Performance & P&L metrics...</span>
        </div>
      ) : data ? (
        <>
          {/* 4 Summary KPI Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Gross Income */}
            <Card className="border-emerald-500/20 bg-card shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Gross Income ({timeframe})
                </CardTitle>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-extrabold text-foreground">
                  {formatCurrency(data.summary.gross_income)}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>+{data.summary.income_growth_percentage}% vs prev period</span>
                </div>
              </CardContent>
            </Card>

            {/* 2. Total Expense */}
            <Card className="border-rose-500/20 bg-card shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total Expenses ({timeframe})
                </CardTitle>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
                  <CreditCard className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-extrabold text-foreground">
                  {formatCurrency(data.summary.total_expense)}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>+{data.summary.expense_growth_percentage}% operational spend</span>
                </div>
              </CardContent>
            </Card>

            {/* 3. Net Income / Profit Loss */}
            <Card className={`border bg-card shadow-2xs ${data.summary.is_profitable ? "border-emerald-500/30" : "border-rose-500/30"}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Net Income (Profit / Loss)
                </CardTitle>
                <div className={`p-2 rounded-xl ${data.summary.is_profitable ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                  <Wallet className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className={`text-2xl font-extrabold ${data.summary.is_profitable ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatCurrency(data.summary.net_income)}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Badge variant={data.summary.is_profitable ? "default" : "destructive"} className="text-[10px] py-0 px-1.5">
                    {data.summary.is_profitable ? "PROFIT" : "LOSS"}
                  </Badge>
                  <span className="text-muted-foreground">+{data.summary.net_profit_growth_percentage}% Net Yield</span>
                </div>
              </CardContent>
            </Card>

            {/* 4. Profit Margin */}
            <Card className="border-indigo-500/20 bg-card shadow-2xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Profit Margin %
                </CardTitle>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                  <BarChart3 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-extrabold text-indigo-600">
                  {data.summary.profit_margin}%
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  Operating Profit Ratio
                </div>
              </CardContent>
            </Card>
          </div>

          {/* PROFIT & LOSS FORMAL STATEMENT CARD */}
          <Card className="border bg-card shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                  Profit & Loss (P&L) Statement — {timeframe.toUpperCase()} REPORT
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Official itemized financial statement of revenues, costs, and net income performance.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-muted/40">
                Timeframe: {timeframe}
              </Badge>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              <div className="rounded-xl border border-border/60 overflow-hidden bg-background">
                {/* Statement Header */}
                <div className="bg-muted/50 px-4 py-3 border-b text-xs font-bold flex items-center justify-between text-muted-foreground uppercase tracking-wider">
                  <span>Financial Statement Item</span>
                  <span>Amount (INR)</span>
                </div>

                <div className="divide-y text-xs">
                  {/* REVENUE SECTION */}
                  <div className="p-4 bg-emerald-500/5 space-y-2">
                    <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-between">
                      <span>I. GROSS OPERATING REVENUE</span>
                      <span>{formatCurrency(data.summary.gross_income)}</span>
                    </div>
                    <div className="pl-4 space-y-1.5 text-muted-foreground">
                      {data.breakdown.income_sources.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span>• {item.category}</span>
                          <span className="font-semibold text-foreground">{formatCurrency(item.amount)} ({item.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* OPERATING EXPENSES SECTION */}
                  <div className="p-4 bg-rose-500/5 space-y-2">
                    <div className="font-extrabold text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between">
                      <span>II. TOTAL OPERATING EXPENSES (OPEX)</span>
                      <span>{formatCurrency(data.summary.total_expense)}</span>
                    </div>
                    <div className="pl-4 space-y-1.5 text-muted-foreground">
                      {data.breakdown.expense_sources.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span>• {item.category}</span>
                          <span className="font-semibold text-foreground">{formatCurrency(item.amount)} ({item.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* NET OPERATING PROFIT / LOSS */}
                  <div className={`p-4 ${data.summary.is_profitable ? "bg-emerald-500/10" : "bg-rose-500/10"} space-y-2`}>
                    <div className="font-black text-base flex items-center justify-between">
                      <span className={data.summary.is_profitable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                        III. NET OPERATING PROFIT / LOSS (NET INCOME)
                      </span>
                      <span className={data.summary.is_profitable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                        {formatCurrency(data.summary.net_income)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                      <span>Net Operating Profit Margin Ratio:</span>
                      <Badge variant={data.summary.is_profitable ? "default" : "destructive"} className="text-xs px-2 py-0.5">
                        {data.summary.profit_margin}% ({data.summary.is_profitable ? "PROFITABLE" : "OPERATING LOSS"})
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PERIODIC PROFIT & LOSS BREAKDOWN TABLE */}
          <Card className="border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Periodic Profit & Loss Audit Table ({timeframe.toUpperCase()})
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Breakdown of revenues, expenses, and net profit per {timeframe === "weekly" ? "week" : timeframe === "yearly" ? "year" : "month"}.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b text-muted-foreground font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="p-3">Period</th>
                      <th className="p-3">Gross Income (₹)</th>
                      <th className="p-3">Total Expense (₹)</th>
                      <th className="p-3">Net Income / (Loss) (₹)</th>
                      <th className="p-3">Profit Margin</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium">
                    {data.chart_data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-extrabold text-foreground">{row.period}</td>
                        <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(row.gross_income)}</td>
                        <td className="p-3 font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(row.total_expense)}</td>
                        <td className={`p-3 font-extrabold ${row.net_income >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {formatCurrency(row.net_income)}
                        </td>
                        <td className="p-3 font-bold text-foreground">{row.profit_margin}%</td>
                        <td className="p-3 text-right">
                          <Badge variant={row.net_income >= 0 ? "outline" : "destructive"} className={`text-[10px] font-bold ${row.net_income >= 0 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : ""}`}>
                            {row.net_income >= 0 ? "Profit" : "Loss"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* FINANCIAL PERFORMANCE CHART REPRESENTATION */}
          <Card className="border bg-card shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Financial Performance Representation ({timeframe.toUpperCase()})
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Comparative bar & net profit margin breakdown across {data.chart_data.length} periods.
                </CardDescription>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-emerald-500 shrink-0"></span>
                  <span className="text-foreground">Gross Income</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-xs bg-rose-500 shrink-0"></span>
                  <span className="text-foreground">Total Expense</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-indigo-500 shrink-0"></span>
                  <span className="text-foreground">Net Profit</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Visual Multi-Bar Chart Container */}
              <div className="space-y-6">
                <div className="grid gap-4 overflow-x-auto pb-4">
                  <div className="min-w-[640px] space-y-5">
                    {data.chart_data.map((item, i) => {
                      const incomePercent = Math.min(100, Math.round((item.gross_income / maxVal) * 100));
                      const expensePercent = Math.min(100, Math.round((item.total_expense / maxVal) * 100));

                      return (
                        <div key={i} className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-foreground">{item.period}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-emerald-600">Income: {formatCurrency(item.gross_income)}</span>
                              <span className="text-rose-600">Expense: {formatCurrency(item.total_expense)}</span>
                              <Badge
                                variant={item.net_income >= 0 ? "outline" : "destructive"}
                                className={`text-[10px] font-extrabold ${item.net_income >= 0 ? "border-emerald-500 text-emerald-600 bg-emerald-500/10" : ""}`}
                              >
                                Net: {formatCurrency(item.net_income)} ({item.profit_margin}%)
                              </Badge>
                            </div>
                          </div>

                          {/* Dual Bars Container */}
                          <div className="space-y-1">
                            {/* Income Bar */}
                            <div className="h-3.5 w-full bg-muted rounded-full overflow-hidden flex items-center">
                              <div
                                style={{ width: `${incomePercent}%` }}
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              ></div>
                            </div>

                            {/* Expense Bar */}
                            <div className="h-3.5 w-full bg-muted rounded-full overflow-hidden flex items-center">
                              <div
                                style={{ width: `${expensePercent}%` }}
                                className="h-full bg-rose-500 rounded-full transition-all duration-500"
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown Tables: Income Sources vs Expense Categories */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Income Sources Breakdown */}
            <Card className="border bg-card shadow-2xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Gross Income Sources Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {data.breakdown.income_sources.map((src, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{src.category}</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(src.amount)} ({src.percentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        style={{ width: `${src.percentage}%` }}
                        className="h-full bg-emerald-500 rounded-full"
                      ></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Expense Categories Breakdown */}
            <Card className="border bg-card shadow-2xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-rose-500" />
                  Total Operational Expense Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {data.breakdown.expense_sources.map((exp, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{exp.category}</span>
                      <span className="font-bold text-rose-600">{formatCurrency(exp.amount)} ({exp.percentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        style={{ width: `${exp.percentage}%` }}
                        className="h-full bg-rose-500 rounded-full"
                      ></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
