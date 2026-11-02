"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  TrendingDown,
  Clock,
  Coins,
  Briefcase,
  UserPlus,
  ShieldCheck,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  User,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
  Layers,
  ChevronRight,
  Building,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { useAuthStore } from "@/store";

interface LeaderboardEntry {
  employee_id: number;
  employee_name: string;
  email: string;
  profile_picture_url?: string;
  department: string;
  designation: string;
  total_earned: number;
  total_deducted: number;
  net_points: number;
  total_activities: number;
  rank: number;
  categories: Record<string, { earned: number; deducted: number; net: number }>;
}

export default function PerformanceLeaderboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("this_month");
  const [department, setDepartment] = useState("all");
  const [designation, setDesignation] = useState("all");
  const [search, setSearch] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myPerformance, setMyPerformance] = useState<LeaderboardEntry | null>(null);
  const [metrics, setMetrics] = useState<any>(null);

  // Colleague modal state
  const [selectedColleague, setSelectedColleague] = useState<any | null>(null);
  const [colleagueModalOpen, setColleagueModalOpen] = useState(false);
  const [loadingColleague, setLoadingColleague] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (timeframe) params.set("timeframe", timeframe);
      if (department !== "all") params.set("department", department);
      if (designation !== "all") params.set("designation", designation);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/performance/leaderboard?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load leaderboard");

      setLeaderboard(data.leaderboard || []);
      setMyPerformance(data.myPerformance || null);
      setMetrics(data.metrics || null);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch leaderboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe, department, designation]);

  const handleOpenColleagueModal = async (empId: number) => {
    try {
      setLoadingColleague(true);
      setColleagueModalOpen(true);
      const res = await fetch(`/api/admin/performance/leaderboard?employeeId=${empId}&timeframe=${timeframe}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load employee details");

      setSelectedColleague(data);
    } catch (err: any) {
      toast.error(err.message || "Could not load colleague details");
      setColleagueModalOpen(false);
    } finally {
      setLoadingColleague(false);
    }
  };

  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    leaderboard.forEach((r) => {
      if (r.department) set.add(r.department);
    });
    return Array.from(set);
  }, [leaderboard]);

  const designationsList = useMemo(() => {
    const set = new Set<string>();
    leaderboard.forEach((r) => {
      if (r.designation) set.add(r.designation);
    });
    return Array.from(set);
  }, [leaderboard]);

  // Export to CSV
  const handleExportCSV = () => {
    if (leaderboard.length === 0) return;
    const headers = [
      "Rank",
      "Employee Name",
      "Email",
      "Department",
      "Designation",
      "Points Earned",
      "Points Deducted",
      "Net Performance Points",
      "Total Activities",
    ];
    const rows = leaderboard.map((r) => [
      r.rank,
      `"${r.employee_name}"`,
      r.email,
      `"${r.department}"`,
      `"${r.designation}"`,
      r.total_earned,
      r.total_deducted,
      r.net_points,
      r.total_activities,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `performance_leaderboard_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-xs font-black shadow-xs">
          <Trophy className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
          <span>#1</span>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-400/20 text-slate-700 dark:text-slate-300 border border-slate-400/40 text-xs font-black">
          <Medal className="w-3.5 h-3.5 fill-slate-400 text-slate-500" />
          <span>#2</span>
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-700/20 text-amber-800 dark:text-amber-400 border border-amber-700/40 text-xs font-black">
          <Medal className="w-3.5 h-3.5 fill-amber-700 text-amber-800" />
          <span>#3</span>
        </div>
      );
    }
    return (
      <span className="font-bold text-xs text-muted-foreground px-2">
        #{rank}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-md">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Performance Leaderboard
              <Badge variant="secondary" className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                Live Rankings
              </Badge>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Company-wide employee performance rankings calculated in real time across attendance, projects, finance, and recruitment.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeaderboard}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={leaderboard.length === 0}
            className="gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>

          <Button asChild size="sm" className="gap-1.5 text-xs bg-primary font-bold">
            <Link href="/admin/my-profile?tab=leaderboard">
              <User className="w-3.5 h-3.5" />
              My Performance
            </Link>
          </Button>
        </div>
      </div>

      {/* SECTION 1: Personal Performance Summary Card (Top Highlight) */}
      {myPerformance && (
        <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 via-background to-primary/5 shadow-md overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">
                  Your Current Performance Summary
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                Rank #{myPerformance.rank} of {leaderboard.length} Employees
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-card border shadow-2xs">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  Current Company Rank
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-foreground">
                    #{myPerformance.rank}
                  </span>
                  <span className="text-[10px] text-muted-foreground">in company</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-card border shadow-2xs">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  Points Earned
                </span>
                <div className="flex items-baseline gap-1 mt-1 text-emerald-600 dark:text-emerald-400">
                  <span className="text-2xl font-black">
                    +{myPerformance.total_earned.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] font-bold">pts</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-card border shadow-2xs">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  Points Deducted
                </span>
                <div className="flex items-baseline gap-1 mt-1 text-rose-600 dark:text-rose-400">
                  <span className="text-2xl font-black">
                    −{myPerformance.total_deducted.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] font-bold">pts</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 shadow-2xs">
                <span className="text-[11px] font-bold text-primary block">
                  Net Performance Score
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span
                    className={`text-2xl font-black ${
                      myPerformance.net_points >= 0
                        ? "text-primary"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {myPerformance.net_points > 0 ? "+" : ""}
                    {myPerformance.net_points.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] font-bold text-primary">pts</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 2: Filters & Timeframe Bar */}
      <Card className="border bg-card shadow-2xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Timeframe Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "today", label: "Today" },
                { id: "this_week", label: "This Week" },
                { id: "this_month", label: "This Month" },
                { id: "last_month", label: "Last Month" },
                { id: "this_year", label: "This Year" },
                { id: "all", label: "All Time" },
              ].map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setTimeframe(tf.id)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    timeframe === tf.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee, role, dept..."
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
          </div>

          {/* Department & Designation dropdown filters */}
          <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-border/50 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Department:</span>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="h-7 text-xs bg-muted/40 border rounded px-2 outline-none font-semibold cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departmentsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Designation:</span>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="h-7 text-xs bg-muted/40 border rounded px-2 outline-none font-semibold cursor-pointer"
              >
                <option value="all">All Designations</option>
                {designationsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-auto text-xs text-muted-foreground">
              Showing <strong>{leaderboard.length}</strong> active team members
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3: Leaderboard Table */}
      <Card className="border shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p>Calculating leaderboard rankings...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
              <Award className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="font-semibold text-foreground">No performance data found</p>
              <p>Try switching the timeframe filter above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department & Role</th>
                    <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                      Points Earned
                    </th>
                    <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                      Points Deducted
                    </th>
                    <th className="py-3 px-4 text-right font-black">
                      Net Performance Points
                    </th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leaderboard.map((entry) => {
                    const isMe = user?.id === entry.employee_id;
                    const isPositive = entry.net_points >= 0;

                    return (
                      <tr
                        key={entry.employee_id}
                        className={`transition-colors hover:bg-muted/30 ${
                          isMe
                            ? "bg-primary/5 font-medium border-l-4 border-l-primary"
                            : ""
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3 px-4 text-center">
                          {getRankBadge(entry.rank)}
                        </td>

                        {/* Employee Avatar & Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 border border-border">
                              <AvatarImage src={entry.profile_picture_url} />
                              <AvatarFallback className="text-[10px] font-bold uppercase bg-primary/10 text-primary">
                                {entry.employee_name?.slice(0, 2) || "EM"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-foreground flex items-center gap-1.5">
                                {entry.employee_name}
                                {isMe && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/30">
                                    You
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground block truncate max-w-xs">
                                {entry.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Dept & Designation */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">
                            {entry.designation}
                          </div>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {entry.department}
                          </span>
                        </td>

                        {/* Points Earned */}
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          +{entry.total_earned.toLocaleString("en-IN")}
                        </td>

                        {/* Points Deducted */}
                        <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                          {entry.total_deducted > 0
                            ? `−${entry.total_deducted.toLocaleString("en-IN")}`
                            : "0"}
                        </td>

                        {/* Net Performance Points */}
                        <td className="py-3 px-4 text-right font-black font-mono text-sm">
                          <span
                            className={
                              isPositive
                                ? "text-primary"
                                : "text-rose-600 dark:text-rose-400"
                            }
                          >
                            {isPositive && entry.net_points > 0 ? "+" : ""}
                            {entry.net_points.toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenColleagueModal(entry.employee_id)}
                            className="h-7 text-xs gap-1 text-primary hover:bg-primary/10 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 4: Colleague Performance Details Modal */}
      <Dialog open={colleagueModalOpen} onOpenChange={setColleagueModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/20 shrink-0">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Employee Performance Profile
            </DialogTitle>
            <DialogDescription className="text-xs">
              Performance breakdown and activity analytics.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {loadingColleague || !selectedColleague ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                Loading employee details...
              </div>
            ) : (
              <>
                {/* Employee Header */}
                <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/20">
                  <Avatar className="w-12 h-12 border">
                    <AvatarImage src={selectedColleague.employee?.profile_picture_url} />
                    <AvatarFallback className="font-bold text-sm bg-primary/10 text-primary">
                      {selectedColleague.employee?.full_name?.slice(0, 2) || "EM"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-foreground">
                      {selectedColleague.employee?.full_name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedColleague.employee?.designation} • {selectedColleague.employee?.department}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {selectedColleague.employee?.email}
                    </p>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border bg-card text-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                      Points Earned
                    </span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                      +{Number(selectedColleague.totals?.total_earned || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border bg-card text-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                      Points Deducted
                    </span>
                    <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5 block">
                      −{Number(selectedColleague.totals?.total_deducted || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border bg-primary/10 text-center border-primary/30">
                    <span className="text-[10px] font-semibold text-primary uppercase block">
                      Net Points
                    </span>
                    <span className="text-lg font-black text-primary font-mono mt-0.5 block">
                      {Number(selectedColleague.totals?.net_points || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Category-wise Breakdown */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Performance by Category
                  </h4>
                  <div className="space-y-2">
                    {(selectedColleague.categories || []).map((cat: any) => (
                      <div
                        key={cat.category}
                        className="p-3 rounded-lg border bg-card flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-foreground capitalize">
                            {cat.category.replace(/_/g, " ")}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {cat.activities_count} qualifying {cat.activities_count === 1 ? "activity" : "activities"}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-right font-mono">
                          <div>
                            <span className="text-[10px] text-emerald-600 block">
                              +{Number(cat.earned).toLocaleString("en-IN")}
                            </span>
                            {Number(cat.deducted) > 0 && (
                              <span className="text-[10px] text-rose-600 block">
                                −{Number(cat.deducted).toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className="font-bold text-xs bg-muted/50 min-w-16 justify-center"
                          >
                            {Number(cat.net) > 0 ? "+" : ""}
                            {Number(cat.net).toLocaleString("en-IN")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Private Transactions List (only visible if self or admin) */}
                {selectedColleague.isPrivateView && selectedColleague.transactions?.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Transaction Audit Trail</span>
                      <span className="text-[10px] font-normal lowercase">
                        (authorized private view)
                      </span>
                    </h4>
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {selectedColleague.transactions.map((tx: any) => (
                        <div
                          key={tx.id}
                          className="p-2.5 rounded-lg border bg-muted/10 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-semibold text-foreground">
                              {tx.description}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(tx.transaction_date).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              • By {tx.performed_by}
                            </span>
                          </div>
                          <div className="text-right font-mono font-bold">
                            {Number(tx.net_points) >= 0 ? (
                              <span className="text-emerald-600">
                                +{Number(tx.points_earned).toLocaleString("en-IN")} pts
                              </span>
                            ) : (
                              <span className="text-rose-600">
                                −{Number(tx.points_deducted).toLocaleString("en-IN")} pts
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

