"use client";

import React, { useState, useEffect } from "react";
import {
  Trophy,
  Medal,
  Award,
  CheckCircle2,
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
  Target,
  FileText,
  AlertCircle,
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
import { useAuthStore } from "@/store";

export function ProfileLeaderboardTab() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("this_month");
  const [search, setSearch] = useState("");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myPerformance, setMyPerformance] = useState<any | null>(null);
  const [myTransactions, setMyTransactions] = useState<any[]>([]);
  const [myDetails, setMyDetails] = useState<any | null>(null);

  // Colleague modal state
  const [selectedColleague, setSelectedColleague] = useState<any | null>(null);
  const [colleagueModalOpen, setColleagueModalOpen] = useState(false);
  const [loadingColleague, setLoadingColleague] = useState(false);

  const fetchProfileLeaderboardData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (timeframe) params.set("timeframe", timeframe);
      if (search) params.set("search", search);

      // 1. Fetch leaderboard
      const lbRes = await fetch(`/api/admin/performance/leaderboard?${params.toString()}`);
      const lbData = await lbRes.json();
      if (!lbRes.ok) throw new Error(lbData.error || "Failed to load leaderboard");

      setLeaderboard(lbData.leaderboard || []);
      setMyPerformance(lbData.myPerformance || null);

      // 2. Fetch logged-in user's detailed performance breakdown & transactions
      if (user?.id) {
        const myRes = await fetch(
          `/api/admin/performance/leaderboard?employeeId=${user.id}&timeframe=${timeframe}`
        );
        const myData = await myRes.json();
        if (myRes.ok) {
          setMyDetails(myData);
          setMyTransactions(myData.transactions || []);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch leaderboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileLeaderboardData();
  }, [timeframe, user?.id]);

  const handleOpenColleagueModal = async (empId: number) => {
    try {
      setLoadingColleague(true);
      setColleagueModalOpen(true);
      const res = await fetch(
        `/api/admin/performance/leaderboard?employeeId=${empId}&timeframe=${timeframe}`
      );
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

  // Calculations for comparisons
  const topRank1 = leaderboard.length > 0 ? leaderboard[0] : null;
  const myRank = myPerformance?.rank || 1;
  const highestScore = topRank1 ? Number(topRank1.net_points) : 0;
  const myScore = myPerformance ? Number(myPerformance.net_points) : 0;
  const gapToFirst = highestScore - myScore;

  // Person directly ahead in rank
  const personAhead =
    myRank > 1 ? leaderboard.find((r) => r.rank === myRank - 1) : null;
  const pointsToNextRank = personAhead
    ? Math.max(1, Number(personAhead.net_points) - myScore + 1)
    : 0;

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
    <div className="space-y-6">
      {/* SECTION 1: Personal Performance Dashboard (Top Section) */}
      <Card className="border-2 border-primary/40 bg-gradient-to-r from-primary/5 via-background to-primary/5 shadow-md overflow-hidden relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <CardHeader className="pb-3 pt-5 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Trophy className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg font-bold">
                  My Performance Overview
                </CardTitle>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                  Company Rank #{myRank}
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">
                Real-time tracking of points earned, deductions, and your company ranking standings.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* Timeframe Chips */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
                {[
                  { id: "this_month", label: "This Month" },
                  { id: "last_month", label: "Last Month" },
                  { id: "this_year", label: "This Year" },
                  { id: "all", label: "All Time" },
                ].map((tf) => (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => setTimeframe(tf.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      timeframe === tf.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchProfileLeaderboardData}
                disabled={loading}
                className="h-8 text-xs gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-1 space-y-4">
          {/* Main 4 Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-card border shadow-2xs">
              <span className="text-xs font-semibold text-muted-foreground block">
                Company Rank
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-3xl font-black text-foreground">
                  #{myRank}
                </span>
                <span className="text-xs text-muted-foreground">
                  of {leaderboard.length} staff
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border shadow-2xs">
              <span className="text-xs font-semibold text-muted-foreground block">
                Points Earned
              </span>
              <div className="flex items-baseline gap-1 mt-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="text-3xl font-black font-mono">
                  +{Number(myPerformance?.total_earned || 0).toLocaleString("en-IN")}
                </span>
                <span className="text-xs font-bold">pts</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border shadow-2xs">
              <span className="text-xs font-semibold text-muted-foreground block">
                Points Deducted
              </span>
              <div className="flex items-baseline gap-1 mt-1.5 text-rose-600 dark:text-rose-400">
                <span className="text-3xl font-black font-mono">
                  −{Number(myPerformance?.total_deducted || 0).toLocaleString("en-IN")}
                </span>
                <span className="text-xs font-bold">pts</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 shadow-2xs">
              <span className="text-xs font-bold text-primary block">
                Net Performance Points
              </span>
              <div className="flex items-baseline gap-1 mt-1.5 font-mono">
                <span
                  className={`text-3xl font-black ${
                    myScore >= 0 ? "text-primary" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {myScore > 0 ? "+" : ""}
                  {myScore.toLocaleString("en-IN")}
                </span>
                <span className="text-xs font-bold text-primary">pts</span>
              </div>
            </div>
          </div>

          {/* Rank Insights & Target Projections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-muted-foreground">Highest Ranked (#1):</span>
              </div>
              <div className="text-right font-medium">
                <span className="font-bold text-foreground">
                  {topRank1 ? topRank1.employee_name : "N/A"}
                </span>{" "}
                <span className="text-muted-foreground font-mono">
                  ({highestScore.toLocaleString("en-IN")} pts)
                </span>
                {myRank > 1 && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 block font-semibold">
                    Gap: −{gapToFirst.toLocaleString("en-IN")} pts
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                <span className="text-muted-foreground">To Reach Next Rank:</span>
              </div>
              <div className="text-right">
                {myRank > 1 && personAhead ? (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    Need +{pointsToNextRank.toLocaleString("en-IN")} pts{" "}
                    <span className="text-muted-foreground font-normal">
                      to pass #{personAhead.rank} ({personAhead.employee_name})
                    </span>
                  </span>
                ) : (
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    🏆 You are holding Rank #1 in the company!
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: Company-Wide Performance Leaderboard */}
      <Card className="border shadow-xs">
        <CardHeader className="pb-3 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Company-Wide Leaderboard
              </CardTitle>
              <CardDescription className="text-xs">
                Official company performance standings. Click on any colleague to view their public performance category analytics.
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team member..."
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
              Loading rankings...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-y bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-4 w-16 text-center">Rank</th>
                    <th className="py-2.5 px-4">Employee</th>
                    <th className="py-2.5 px-4">Department & Role</th>
                    <th className="py-2.5 px-4 text-right text-emerald-600">Earned</th>
                    <th className="py-2.5 px-4 text-right text-rose-600">Deducted</th>
                    <th className="py-2.5 px-4 text-right font-black">Net Points</th>
                    <th className="py-2.5 px-4 text-center">Action</th>
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
                            ? "bg-primary/10 font-medium border-l-4 border-l-primary"
                            : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          {getRankBadge(entry.rank)}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-7 h-7 border border-border">
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

                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">
                            {entry.designation}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {entry.department}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          +{Number(entry.total_earned).toLocaleString("en-IN")}
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                          {Number(entry.total_deducted) > 0
                            ? `−${Number(entry.total_deducted).toLocaleString("en-IN")}`
                            : "0"}
                        </td>

                        <td className="py-3 px-4 text-right font-black font-mono text-sm">
                          <span
                            className={
                              isPositive
                                ? "text-primary"
                                : "text-rose-600 dark:text-rose-400"
                            }
                          >
                            {isPositive && entry.net_points > 0 ? "+" : ""}
                            {Number(entry.net_points).toLocaleString("en-IN")}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenColleagueModal(entry.employee_id)}
                            className="h-7 text-xs gap-1 text-primary hover:bg-primary/10 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Summary
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

      {/* SECTION 3: Private Transaction History (Visible ONLY for Current Employee) */}
      <Card className="border shadow-xs">
        <CardHeader className="pb-3 px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                My Performance Transactions History
              </CardTitle>
              <CardDescription className="text-xs">
                Private ledger of all individual rewards and deductions recorded for your account. This log is confidential and only accessible by you and authorized administrators.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {myTransactions.length} Total Records
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {myTransactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
              <CheckCircle2 className="w-6 h-6 mx-auto text-muted-foreground/40 mb-1" />
              <p className="font-semibold text-foreground">No performance transactions logged yet</p>
              <p>Qualifying attendance, finance, and task activities will automatically appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-y bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Activity Description</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Awarded By</th>
                    <th className="py-2.5 px-4 text-right">Points Earned</th>
                    <th className="py-2.5 px-4 text-right">Points Deducted</th>
                    <th className="py-2.5 px-4 text-right font-black">Net Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {myTransactions.map((tx) => {
                    const isNetPositive = Number(tx.net_points) >= 0;

                    return (
                      <tr key={tx.id} className="hover:bg-muted/20">
                        <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap font-mono">
                          {new Date(tx.transaction_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        <td className="py-2.5 px-4 font-semibold text-foreground">
                          {tx.description}
                        </td>

                        <td className="py-2.5 px-4 capitalize">
                          <Badge variant="outline" className="text-[10px] font-medium bg-muted/30">
                            {tx.category?.replace(/_/g, " ")}
                          </Badge>
                        </td>

                        <td className="py-2.5 px-4 text-muted-foreground">
                          {tx.performed_by || "System Automation"}
                        </td>

                        <td className="py-2.5 px-4 text-right font-bold text-emerald-600 font-mono">
                          {Number(tx.points_earned) > 0
                            ? `+${Number(tx.points_earned).toLocaleString("en-IN")}`
                            : "—"}
                        </td>

                        <td className="py-2.5 px-4 text-right font-bold text-rose-600 font-mono">
                          {Number(tx.points_deducted) > 0
                            ? `−${Number(tx.points_deducted).toLocaleString("en-IN")}`
                            : "—"}
                        </td>

                        <td className="py-2.5 px-4 text-right font-black font-mono">
                          <span
                            className={
                              isNetPositive ? "text-emerald-600" : "text-rose-600"
                            }
                          >
                            {isNetPositive && Number(tx.net_points) > 0 ? "+" : ""}
                            {Number(tx.net_points).toLocaleString("en-IN")}
                          </span>
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

      {/* Colleague Public Summary Modal */}
      <Dialog open={colleagueModalOpen} onOpenChange={setColleagueModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" /> Colleague Performance Summary
            </DialogTitle>
            <DialogDescription className="text-xs">
              Public performance statistics and category distribution.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {loadingColleague || !selectedColleague ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                Loading stats...
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20">
                  <Avatar className="w-10 h-10 border">
                    <AvatarImage src={selectedColleague.employee?.profile_picture_url} />
                    <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                      {selectedColleague.employee?.full_name?.slice(0, 2) || "EM"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      {selectedColleague.employee?.full_name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {selectedColleague.employee?.designation} • {selectedColleague.employee?.department}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                      Earned
                    </span>
                    <span className="text-base font-black text-emerald-600 font-mono">
                      +{Number(selectedColleague.totals?.total_earned || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                      Deducted
                    </span>
                    <span className="text-base font-black text-rose-600 font-mono">
                      −{Number(selectedColleague.totals?.total_deducted || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg border bg-primary/10 border-primary/30">
                    <span className="text-[10px] text-primary font-bold block uppercase">
                      Net Score
                    </span>
                    <span className="text-base font-black text-primary font-mono">
                      {Number(selectedColleague.totals?.net_points || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Breakdown by Category
                  </h5>
                  <div className="space-y-1.5">
                    {(selectedColleague.categories || []).map((cat: any) => (
                      <div
                        key={cat.category}
                        className="p-2.5 rounded-lg border bg-card flex items-center justify-between text-xs"
                      >
                        <span className="font-medium capitalize">
                          {cat.category?.replace(/_/g, " ")}
                        </span>
                        <span className="font-mono font-bold text-primary">
                          {Number(cat.net) > 0 ? "+" : ""}
                          {Number(cat.net).toLocaleString("en-IN")} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

