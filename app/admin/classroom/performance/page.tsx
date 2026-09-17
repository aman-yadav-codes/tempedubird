"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  GraduationCap,
  HelpCircle,
  Hourglass,
  Layers,
  LineChart,
  Loader2,
  RefreshCw,
  School,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
  FileCheck,
  AlertTriangle,
  ArrowUpRight,
  BookMarked,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

type PerformanceData = {
  enrollment: {
    id: number;
    student_id: number;
    institution_id: number;
    program_id: number;
    section_id: number | null;
    academic_year_id: number;
  } | null;
  overall: {
    score: number;
    grade: string;
    status: string;
    color: string;
    summary: string;
  };
  pillars: {
    practice_exams: {
      name: string;
      score: number;
      weight: number;
      metrics: {
        total_available?: number;
        total_attempted?: number;
        attempt_rate?: number;
        avg_percentage?: number;
        accuracy_rate?: number;
        total_correct?: number;
        total_wrong?: number;
        total_unanswered?: number;
        total_time_taken_seconds?: number;
      };
      history: any[];
    };
    attendance: {
      name: string;
      score: number;
      weight: number;
      metrics: {
        total_days?: number;
        present_days?: number;
        absent_days?: number;
        late_days?: number;
        leave_days?: number;
        attendance_percentage?: number;
      };
      history: any[];
    };
    results: {
      name: string;
      score: number;
      weight: number;
      metrics: {
        total_exams?: number;
        exams_appeared?: number;
        avg_percentage?: number;
        highest_score?: number;
        total_obtained?: number;
        total_possible?: number;
        result_cards_count?: number;
        grade?: string;
      };
      history: any[];
      result_cards?: any[];
    };
    assignments: {
      name: string;
      score: number;
      weight: number;
      metrics: {
        total_assigned?: number;
        submitted_count?: number;
        pending_count?: number;
        overdue_count?: number;
        completion_rate?: number;
        avg_grade?: number;
      };
      history: any[];
    };
    notes_reading: {
      name: string;
      score: number;
      weight: number;
      metrics: {
        total_notes_available?: number;
        notes_read_count?: number;
        completed_notes_count?: number;
        total_reading_seconds?: number;
        total_reading_minutes?: number;
        total_reading_hours?: number;
        avg_minutes_per_note?: number;
      };
      history: any[];
    };
  };
  insights: Array<{
    type: "strength" | "opportunity" | "tip";
    title: string;
    message: string;
  }>;
};

export default function MyPerformancePage() {
  const { user } = useAuthStore();
  const { isReady } = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<PerformanceData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "practice" | "attendance" | "results" | "assignments" | "notes">("overview");

  const loadPerformance = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/admin/classroom/performance");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load performance metrics");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load performance metrics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPerformance();
  }, [loadPerformance]);

  if (loading || !isReady) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-52 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  const overall = data?.overall || {
    score: 0,
    grade: "N/A",
    status: "No Data",
    color: "muted",
    summary: "Performance data is not currently available.",
  };

  const pillars = data?.pillars;
  const insights = data?.insights || [];

  const getScoreColorClass = (score: number) => {
    if (score >= 85) return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 70) return "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20";
    if (score >= 55) return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  const getProgressColor = (score: number) => {
    if (score >= 85) return "bg-emerald-500";
    if (score >= 70) return "bg-blue-500";
    if (score >= 55) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold border-primary/30 text-primary">
              <Sparkles className="h-3 w-3 mr-1 text-primary" /> My Classroom
            </Badge>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs font-medium text-muted-foreground">Comprehensive Performance Tracker</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-primary" />
            My Performance
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time evaluation calculated across practice exams, attendance, results, assignments, and notes reading timing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPerformance(true)}
            disabled={refreshing}
            className="gap-2 shadow-sm"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin text-primary")} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Hero: Composite Performance Card */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-muted/40 p-6 md:p-8 shadow-sm">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Radial Score Meter */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-background/60 backdrop-blur rounded-xl border">
            <div className="relative flex items-center justify-center">
              <svg className="w-36 h-36 transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="58"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-muted/30"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="58"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 58}
                  strokeDashoffset={2 * Math.PI * 58 * (1 - (overall.score || 0) / 100)}
                  strokeLinecap="round"
                  className={cn(
                    "transition-all duration-1000 ease-out",
                    overall.score >= 85 ? "text-emerald-500" :
                    overall.score >= 70 ? "text-blue-500" :
                    overall.score >= 55 ? "text-amber-500" : "text-rose-500"
                  )}
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold tracking-tight">
                  {overall.score}%
                </span>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Index
                </span>
              </div>
            </div>

            <div className="mt-3 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-primary/10 text-primary border-primary/20">
                <Award className="h-3.5 w-3.5" />
                Grade {overall.grade} • {overall.status}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                Overall Composite Performance Index
              </p>
            </div>
          </div>

          {/* Performance Summary & 4 Quick Stats */}
          <div className="lg:col-span-8 flex flex-col justify-between h-full space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Academic Performance Summary
                </h2>
                <Badge variant="secondary" className="text-xs font-medium">
                  5 Pillars Evaluated
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {overall.summary}
              </p>
            </div>

            {/* 4 Stat Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-background/80 border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                  <Calendar className="h-3.5 w-3.5 text-blue-500" /> Attendance
                </div>
                <div className="text-lg font-bold">
                  {pillars?.attendance.metrics.attendance_percentage ?? 0}%
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {pillars?.attendance.metrics.present_days ?? 0} days present
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                  <Award className="h-3.5 w-3.5 text-purple-500" /> Official Exams
                </div>
                <div className="text-lg font-bold">
                  {pillars?.results.metrics.avg_percentage ?? 0}%
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Grade {pillars?.results.metrics.grade || "N/A"}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Assignments
                </div>
                <div className="text-lg font-bold">
                  {pillars?.assignments.metrics.completion_rate ?? 0}%
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {pillars?.assignments.metrics.submitted_count ?? 0} submitted
                </div>
              </div>

              <div className="p-3 rounded-xl bg-background/80 border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                  <Clock className="h-3.5 w-3.5 text-amber-500" /> Study Reading
                </div>
                <div className="text-lg font-bold">
                  {pillars?.notes_reading.metrics.total_reading_hours ?? 0} hrs
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {pillars?.notes_reading.metrics.notes_read_count ?? 0} notes read
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Core Pillars Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              The 5 Performance Pillars
            </h2>
            <p className="text-xs text-muted-foreground">
              Detailed metrics calculated according to your activities and coursework submissions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Practice Exams */}
          <div
            onClick={() => setActiveTab("practice")}
            className={cn(
              "p-4 rounded-xl border bg-card cursor-pointer transition-all hover:shadow-md",
              activeTab === "practice" ? "border-primary ring-1 ring-primary/30" : "hover:border-primary/40"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Target className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                20% Weight
              </span>
            </div>
            <div className="text-xs font-semibold text-foreground">Practice Exams</div>
            <div className="text-2xl font-bold mt-1 text-foreground">
              {pillars?.practice_exams.score ?? 0}%
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={cn("h-full transition-all duration-500", getProgressColor(pillars?.practice_exams.score ?? 0))}
                style={{ width: `${Math.min(100, pillars?.practice_exams.score ?? 0)}%` }}
              />
            </div>
            <div className="mt-3 pt-2 border-t text-[11px] flex justify-between text-muted-foreground">
              <span>Attempted: {pillars?.practice_exams.metrics.total_attempted ?? 0}/{pillars?.practice_exams.metrics.total_available ?? 0}</span>
              <span>Accuracy: {pillars?.practice_exams.metrics.accuracy_rate ?? 0}%</span>
            </div>
          </div>

          {/* 2. Attendance */}
          <div
            onClick={() => setActiveTab("attendance")}
            className={cn(
              "p-4 rounded-xl border bg-card cursor-pointer transition-all hover:shadow-md",
              activeTab === "attendance" ? "border-primary ring-1 ring-primary/30" : "hover:border-primary/40"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Calendar className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                20% Weight
              </span>
            </div>
            <div className="text-xs font-semibold text-foreground">Attendance</div>
            <div className="text-2xl font-bold mt-1 text-foreground">
              {pillars?.attendance.score ?? 0}%
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={cn("h-full transition-all duration-500", getProgressColor(pillars?.attendance.score ?? 0))}
                style={{ width: `${Math.min(100, pillars?.attendance.score ?? 0)}%` }}
              />
            </div>
            <div className="mt-3 pt-2 border-t text-[11px] flex justify-between text-muted-foreground">
              <span>Present: {pillars?.attendance.metrics.present_days ?? 0}</span>
              <span>Total: {pillars?.attendance.metrics.total_days ?? 0} sessions</span>
            </div>
          </div>

          {/* 3. Results (Official Exams) */}
          <div
            onClick={() => setActiveTab("results")}
            className={cn(
              "p-4 rounded-xl border bg-card cursor-pointer transition-all hover:shadow-md",
              activeTab === "results" ? "border-primary ring-1 ring-primary/30" : "hover:border-primary/40"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Award className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                25% Weight
              </span>
            </div>
            <div className="text-xs font-semibold text-foreground">Official Results</div>
            <div className="text-2xl font-bold mt-1 text-foreground">
              {pillars?.results.score ?? 0}%
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={cn("h-full transition-all duration-500", getProgressColor(pillars?.results.score ?? 0))}
                style={{ width: `${Math.min(100, pillars?.results.score ?? 0)}%` }}
              />
            </div>
            <div className="mt-3 pt-2 border-t text-[11px] flex justify-between text-muted-foreground">
              <span>Exams: {pillars?.results.metrics.exams_appeared ?? 0} appeared</span>
              <span>Cards: {pillars?.results.metrics.result_cards_count ?? 0}</span>
            </div>
          </div>

          {/* 4. Assignments */}
          <div
            onClick={() => setActiveTab("assignments")}
            className={cn(
              "p-4 rounded-xl border bg-card cursor-pointer transition-all hover:shadow-md",
              activeTab === "assignments" ? "border-primary ring-1 ring-primary/30" : "hover:border-primary/40"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileCheck className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                20% Weight
              </span>
            </div>
            <div className="text-xs font-semibold text-foreground">Assignments</div>
            <div className="text-2xl font-bold mt-1 text-foreground">
              {pillars?.assignments.score ?? 0}%
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={cn("h-full transition-all duration-500", getProgressColor(pillars?.assignments.score ?? 0))}
                style={{ width: `${Math.min(100, pillars?.assignments.score ?? 0)}%` }}
              />
            </div>
            <div className="mt-3 pt-2 border-t text-[11px] flex justify-between text-muted-foreground">
              <span>Done: {pillars?.assignments.metrics.submitted_count ?? 0}/{pillars?.assignments.metrics.total_assigned ?? 0}</span>
              <span>Pending: {pillars?.assignments.metrics.pending_count ?? 0}</span>
            </div>
          </div>

          {/* 5. Notes Reading Timing */}
          <div
            onClick={() => setActiveTab("notes")}
            className={cn(
              "p-4 rounded-xl border bg-card cursor-pointer transition-all hover:shadow-md",
              activeTab === "notes" ? "border-primary ring-1 ring-primary/30" : "hover:border-primary/40"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                15% Weight
              </span>
            </div>
            <div className="text-xs font-semibold text-foreground">Notes Reading Timing</div>
            <div className="text-2xl font-bold mt-1 text-foreground">
              {pillars?.notes_reading.score ?? 0}%
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={cn("h-full transition-all duration-500", getProgressColor(pillars?.notes_reading.score ?? 0))}
                style={{ width: `${Math.min(100, pillars?.notes_reading.score ?? 0)}%` }}
              />
            </div>
            <div className="mt-3 pt-2 border-t text-[11px] flex justify-between text-muted-foreground">
              <span>Time: {pillars?.notes_reading.metrics.total_reading_minutes ?? 0}m</span>
              <span>Read: {pillars?.notes_reading.metrics.notes_read_count ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Deep Dive Detail */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 border-b pb-2">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("overview")}
            className="rounded-lg text-xs"
          >
            Overview & Comparison
          </Button>
          <Button
            variant={activeTab === "practice" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("practice")}
            className="rounded-lg text-xs"
          >
            Practice Exams ({pillars?.practice_exams.metrics.total_attempted ?? 0})
          </Button>
          <Button
            variant={activeTab === "attendance" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("attendance")}
            className="rounded-lg text-xs"
          >
            Attendance Logs ({pillars?.attendance.metrics.total_days ?? 0})
          </Button>
          <Button
            variant={activeTab === "results" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("results")}
            className="rounded-lg text-xs"
          >
            Official Exams ({pillars?.results.metrics.exams_appeared ?? 0})
          </Button>
          <Button
            variant={activeTab === "assignments" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("assignments")}
            className="rounded-lg text-xs"
          >
            Assignments ({pillars?.assignments.metrics.submitted_count ?? 0})
          </Button>
          <Button
            variant={activeTab === "notes" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("notes")}
            className="rounded-lg text-xs"
          >
            Notes Reading Time ({pillars?.notes_reading.metrics.total_reading_minutes ?? 0} mins)
          </Button>
        </div>

        {/* Tab 1: Overview & Weights */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 rounded-xl border bg-card space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-primary" />
                  Pillar Contribution to Final Index
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Official Exams & Results", weight: 25, score: pillars?.results.score ?? 0, color: "bg-purple-500" },
                    { label: "Attendance", weight: 20, score: pillars?.attendance.score ?? 0, color: "bg-blue-500" },
                    { label: "Practice Exams", weight: 20, score: pillars?.practice_exams.score ?? 0, color: "bg-indigo-500" },
                    { label: "Assignments & Homework", weight: 20, score: pillars?.assignments.score ?? 0, color: "bg-emerald-500" },
                    { label: "Notes Reading Timing", weight: 15, score: pillars?.notes_reading.score ?? 0, color: "bg-amber-500" },
                  ].map((p, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span>{p.label} <span className="text-muted-foreground font-normal">({p.weight}% weight)</span></span>
                        <span className="font-bold">{p.score}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", p.color)}
                          style={{ width: `${Math.min(100, p.score)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick links to sections */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/student/classroom/practice-exams"
                  className="p-3.5 rounded-xl border bg-card hover:bg-muted/50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground group-hover:text-primary">Take Practice Exams</div>
                      <div className="text-[11px] text-muted-foreground">Boost score & test accuracy</div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </Link>

                <Link
                  href="/notes"
                  className="p-3.5 rounded-xl border bg-card hover:bg-muted/50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground group-hover:text-primary">Read Revision Notes</div>
                      <div className="text-[11px] text-muted-foreground">Accumulate study reading minutes</div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </Link>
              </div>
            </div>

            {/* Smart Insights & AI Guidance */}
            <div className="p-5 rounded-xl border bg-card space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Smart Recommendations
              </h3>

              <div className="space-y-3">
                {insights.map((ins, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-3.5 rounded-xl border text-xs leading-relaxed space-y-1",
                      ins.type === "strength" && "bg-emerald-500/5 border-emerald-500/20 text-emerald-950 dark:text-emerald-200",
                      ins.type === "opportunity" && "bg-amber-500/5 border-amber-500/20 text-amber-950 dark:text-amber-200",
                      ins.type === "tip" && "bg-blue-500/5 border-blue-500/20 text-blue-950 dark:text-blue-200"
                    )}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      {ins.type === "strength" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                      {ins.type === "opportunity" && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                      {ins.type === "tip" && <Sparkles className="h-3.5 w-3.5 text-blue-600" />}
                      {ins.title}
                    </div>
                    <p className="text-muted-foreground font-normal">
                      {ins.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Practice Exams */}
        {activeTab === "practice" && (
          <div className="p-5 rounded-xl border bg-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-bold">Practice Exams Evaluation</h3>
                <p className="text-xs text-muted-foreground">Detailed history of mock tests and question solving accuracy.</p>
              </div>
              <Link href="/student/classroom/practice-exams">
                <Button size="sm" variant="outline" className="text-xs gap-1.5">
                  <span>Go to Practice Exams</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
              <div className="p-3 rounded-lg bg-muted/40 border text-center">
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {pillars?.practice_exams.metrics.avg_percentage ?? 0}%
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Average Score</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border text-center">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {pillars?.practice_exams.metrics.total_correct ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Correct Answers</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border text-center">
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {pillars?.practice_exams.metrics.total_wrong ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Wrong Answers</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border text-center">
                <div className="text-lg font-bold text-foreground">
                  {pillars?.practice_exams.metrics.accuracy_rate ?? 0}%
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Overall Accuracy</div>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="p-3">Exam Title</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Score %</th>
                    <th className="p-3">Correct / Wrong</th>
                    <th className="p-3">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(pillars?.practice_exams.history || []).map((h, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="p-3 font-semibold text-foreground">{h.title}</td>
                      <td className="p-3">
                        <Badge variant={h.attempt_status === "completed" ? "outline" : "secondary"} className="text-[11px]">
                          {h.attempt_status || "Pending"}
                        </Badge>
                      </td>
                      <td className="p-3 font-bold">
                        {h.percentage !== null && h.percentage !== undefined ? `${h.percentage}%` : "—"}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {h.correct_answers || 0} / {h.wrong_answers || 0}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {h.submitted_at ? new Date(h.submitted_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {(pillars?.practice_exams.history || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        No practice exams attempted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Attendance Logs */}
        {activeTab === "attendance" && (
          <div className="p-5 rounded-xl border bg-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-bold">Attendance Record</h3>
                <p className="text-xs text-muted-foreground">Summary of attendance compliance in this academic term.</p>
              </div>
              <Link href="/student/classroom/attendance">
                <Button size="sm" variant="outline" className="text-xs gap-1.5">
                  <span>Full Attendance Details</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {pillars?.attendance.metrics.present_days ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Present Days</div>
              </div>
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {pillars?.attendance.metrics.absent_days ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Absent Days</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {pillars?.attendance.metrics.late_days ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Late Days</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {pillars?.attendance.metrics.attendance_percentage ?? 0}%
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Attendance Rate</div>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(pillars?.attendance.history || []).map((h, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="p-3 font-medium">{h.attendance_date}</td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px]",
                            String(h.status).toUpperCase() === "PRESENT" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                            String(h.status).toUpperCase() === "ABSENT" && "bg-rose-500/10 text-rose-600 border-rose-500/20",
                            String(h.status).toUpperCase() === "LATE" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                            String(h.status).toUpperCase() === "LEAVE" && "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          )}
                        >
                          {h.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{h.mode || "FULL_DAY"}</td>
                      <td className="p-3 text-muted-foreground">{h.remarks || "—"}</td>
                    </tr>
                  ))}
                  {(pillars?.attendance.history || []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        No attendance records found for this term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Results (Official Exams) */}
        {activeTab === "results" && (
          <div className="p-5 rounded-xl border bg-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-bold">Official Exam Results & Grade Cards</h3>
                <p className="text-xs text-muted-foreground">Scores from official term assessments and generated result documents.</p>
              </div>
              <Link href="/student/classroom/exams">
                <Button size="sm" variant="outline" className="text-xs gap-1.5">
                  <span>View All Exams & Cards</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
              <div className="p-3 rounded-lg bg-muted/40 border text-center">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {pillars?.results.metrics.avg_percentage ?? 0}%
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Average Exam Score</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border text-center">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {pillars?.results.metrics.highest_score ?? 0}%
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Highest Score</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border text-center">
                <div className="text-lg font-bold text-foreground">
                  Grade {pillars?.results.metrics.grade || "N/A"}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Current Grade</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border text-center">
                <div className="text-lg font-bold text-foreground">
                  {pillars?.results.metrics.result_cards_count ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Result Cards Issued</div>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="p-3">Assessment Title</th>
                    <th className="p-3">Total Marks</th>
                    <th className="p-3">Obtained Marks</th>
                    <th className="p-3">Percentage</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(pillars?.results.history || []).map((h, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="p-3 font-semibold text-foreground">{h.title}</td>
                      <td className="p-3 text-muted-foreground">{h.total_marks || 100}</td>
                      <td className="p-3 font-medium">{h.obtained_marks ?? "—"}</td>
                      <td className="p-3 font-bold text-purple-600 dark:text-purple-400">
                        {h.percentage !== null && h.percentage !== undefined ? `${h.percentage}%` : "—"}
                      </td>
                      <td className="p-3">
                        <Badge variant={h.attempt_status === "completed" ? "outline" : "secondary"} className="text-[11px]">
                          {h.attempt_status || "Pending"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(pillars?.results.history || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        No official exams published yet for this term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Result Cards If Any */}
            {(pillars?.results.result_cards || []).length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Official Generated Result Cards
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pillars?.results.result_cards?.map((card, i) => (
                    <div key={i} className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold">{card.title || card.template_name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Issued on {new Date(card.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {card.pdf_url && (
                        <a href={card.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="text-xs gap-1 h-7">
                            <span>View PDF</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Assignments */}
        {activeTab === "assignments" && (
          <div className="p-5 rounded-xl border bg-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-bold">Assignments & Coursework Submissions</h3>
                <p className="text-xs text-muted-foreground">Evaluation of homework submission deadlines and marks obtained.</p>
              </div>
              <Link href="/student/classroom/assignments">
                <Button size="sm" variant="outline" className="text-xs gap-1.5">
                  <span>Go to Assignments</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {pillars?.assignments.metrics.submitted_count ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Submitted</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border text-center">
                <div className="text-lg font-bold text-foreground">
                  {pillars?.assignments.metrics.pending_count ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Pending</div>
              </div>
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {pillars?.assignments.metrics.overdue_count ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Overdue</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {pillars?.assignments.metrics.completion_rate ?? 0}%
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Completion Rate</div>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="p-3">Assignment Title</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Total Marks</th>
                    <th className="p-3">Obtained Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(pillars?.assignments.history || []).map((h, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="p-3 font-semibold text-foreground">{h.title}</td>
                      <td className="p-3 text-muted-foreground">
                        {h.submission_date ? new Date(h.submission_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px]",
                            ["submitted", "checked"].includes(String(h.submission_status).toLowerCase())
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {h.submission_status || "Pending"}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{h.total_marks || "—"}</td>
                      <td className="p-3 font-semibold">
                        {h.obtained_marks !== null && h.obtained_marks !== undefined ? h.obtained_marks : "—"}
                      </td>
                    </tr>
                  ))}
                  {(pillars?.assignments.history || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        No assignments assigned yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 6: Notes Reading Timing */}
        {activeTab === "notes" && (
          <div className="p-5 rounded-xl border bg-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-bold">Notes Reading Timing & Study Duration</h3>
                <p className="text-xs text-muted-foreground">Minutes and hours logged studying course material and PDF revision notes.</p>
              </div>
              <Link href="/notes">
                <Button size="sm" variant="outline" className="text-xs gap-1.5">
                  <span>Browse Revision Notes</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {pillars?.notes_reading.metrics.total_reading_hours ?? 0} hrs
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Total Study Time</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border text-center">
                <div className="text-lg font-bold text-foreground">
                  {pillars?.notes_reading.metrics.total_reading_minutes ?? 0} mins
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Total Minutes</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border text-center">
                <div className="text-lg font-bold text-foreground">
                  {pillars?.notes_reading.metrics.notes_read_count ?? 0}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Notes Reviewed</div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {pillars?.notes_reading.metrics.avg_minutes_per_note ?? 0} mins
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">Avg Time per Note</div>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="p-3">Note Title</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Reading Duration</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Last Read At</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(pillars?.notes_reading.history || []).map((h, i) => {
                    const mins = Math.round(Number(h.reading_time_seconds || 0) / 60);
                    return (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="p-3 font-semibold text-foreground">
                          <Link href={`/notes/${h.note_id}`} className="hover:text-primary transition-colors">
                            {h.title}
                          </Link>
                        </td>
                        <td className="p-3 text-muted-foreground">{h.subject_name || "General"}</td>
                        <td className="p-3 font-bold text-amber-600 dark:text-amber-400">
                          {mins} mins ({h.reading_time_seconds}s)
                        </td>
                        <td className="p-3">
                          <Badge variant={h.is_completed ? "default" : "outline"} className="text-[11px]">
                            {h.is_completed ? "Completed" : "In Progress"}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {h.last_read_at ? new Date(h.last_read_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {(pillars?.notes_reading.history || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">
                        No reading time recorded yet. Open revision notes to begin tracking study duration.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
