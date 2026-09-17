"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  AlertCircle,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
  UsersRound,
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store";

interface SubjectScore {
  subject: string;
  score: number;
}

interface StudentPerformanceRecord {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  admissionNumber: string;
  rollNumber: string;
  programName: string;
  sectionName: string;
  institutionName?: string;
  attendancePercent: number;
  totalSessions: number;
  presentSessions: number;
  examPercent: number;
  examsAttempted: number;
  grade: string;
  status: "TOP_PERFORMER" | "GOOD" | "AVERAGE" | "NEEDS_ATTENTION";
  trend: "improving" | "stable" | "declining";
  subjects: SubjectScore[];
}

interface PerformanceMetrics {
  totalStudents: number;
  avgScore: number;
  avgAttendance: number;
  topPerformersCount: number;
  needsAttentionCount: number;
}

export function StudentsPerformanceClient() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalStudents: 0,
    avgScore: 0,
    avgAttendance: 0,
    topPerformersCount: 0,
    needsAttentionCount: 0,
  });
  const [students, setStudents] = useState<StudentPerformanceRecord[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentPerformanceRecord | null>(null);

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/students/performance?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load student performance");
      }

      setMetrics(json.metrics || {
        totalStudents: 0,
        avgScore: 0,
        avgAttendance: 0,
        topPerformersCount: 0,
        needsAttentionCount: 0,
      });
      setStudents(json.students || []);
    } catch (err: any) {
      toast.error(err.message || "Could not retrieve student performance data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportCSV = () => {
    if (!students.length) {
      toast.error("No data available to export");
      return;
    }
    const headers = [
      "Student Name",
      "Roll No",
      "Admission No",
      "Program / Class",
      "Section",
      "Academic Score (%)",
      "Grade",
      "Attendance (%)",
      "Status",
    ];
    const rows = students.map((s) => [
      `"${s.name}"`,
      `"${s.rollNumber}"`,
      `"${s.admissionNumber}"`,
      `"${s.programName}"`,
      `"${s.sectionName}"`,
      s.examPercent,
      s.grade,
      s.attendancePercent,
      s.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `students_performance_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Students performance report exported successfully!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "TOP_PERFORMER":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-semibold">
            <Award className="size-3 text-emerald-600 dark:text-emerald-400" /> Top Performer
          </Badge>
        );
      case "GOOD":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1 font-semibold">
            <CheckCircle2 className="size-3 text-blue-600 dark:text-blue-400" /> Good
          </Badge>
        );
      case "AVERAGE":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 font-semibold">
            Average
          </Badge>
        );
      case "NEEDS_ATTENTION":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1 font-semibold">
            <AlertCircle className="size-3 text-rose-600 dark:text-rose-400" /> Needs Attention
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAttendanceBadgeColor = (percent: number) => {
    if (percent >= 85) return "text-emerald-600 dark:text-emerald-400";
    if (percent >= 75) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400 font-bold";
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <GraduationCap className="size-7 text-primary" /> Students Performance
            </h1>
            <Badge variant="secondary" className="font-semibold text-xs">
              Institution Admin
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor holistic student academic growth, attendance records, exam results, and identify at-risk learners.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
          >
            <FileSpreadsheet className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Students */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tracked Students
            </CardTitle>
            <UsersRound className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{metrics.totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">Active enrolled student cohort</p>
          </CardContent>
        </Card>

        {/* Average Academic Score */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Average Academic Score
            </CardTitle>
            <BarChart3 className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
              {metrics.avgScore}%
            </div>
            <div className="mt-2">
              <Progress value={metrics.avgScore} className="h-1.5 bg-blue-100 dark:bg-blue-950" />
            </div>
          </CardContent>
        </Card>

        {/* Average Attendance Rate */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Average Attendance
            </CardTitle>
            <Calendar className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {metrics.avgAttendance}%
            </div>
            <div className="mt-2">
              <Progress value={metrics.avgAttendance} className="h-1.5 bg-emerald-100 dark:bg-emerald-950" />
            </div>
          </CardContent>
        </Card>

        {/* High Performers vs Needs Attention */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Performers Overview
            </CardTitle>
            <Sparkles className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">Top Rankers: </span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {metrics.topPerformersCount}
                </span>
              </div>
              <div className="border-l pl-3">
                <span className="text-xs text-muted-foreground">At Risk: </span>
                <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {metrics.needsAttentionCount}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Evaluation across recent terms</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name, roll no, admission no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
              <TabsList className="bg-muted/70 p-1">
                <TabsTrigger value="ALL" className="text-xs font-semibold">
                  All Students
                </TabsTrigger>
                <TabsTrigger value="TOP_PERFORMER" className="text-xs font-semibold">
                  Top Performers
                </TabsTrigger>
                <TabsTrigger value="GOOD" className="text-xs font-semibold">
                  Good
                </TabsTrigger>
                <TabsTrigger value="NEEDS_ATTENTION" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Needs Attention
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Students Performance Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Class & Section</th>
                <th className="py-3 px-4">Academic Score</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Trend</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading students performance records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No student performance records found matching your filters.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 border border-border/70">
                          <AvatarImage src={student.avatarUrl || ""} alt={student.name} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                            {student.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">{student.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Roll: {student.rollNumber}</span>
                            <span>•</span>
                            <span>Adm: {student.admissionNumber}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-foreground">{student.programName}</p>
                      <p className="text-xs text-muted-foreground">{student.sectionName}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{student.examPercent}%</span>
                        <Badge variant="outline" className="text-xs font-bold px-1.5 py-0 border-primary/40 text-primary">
                          {student.grade}
                        </Badge>
                      </div>
                      <Progress value={student.examPercent} className="h-1.5 w-24 mt-1" />
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-sm font-bold ${getAttendanceBadgeColor(student.attendancePercent)}`}>
                        {student.attendancePercent}%
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {student.presentSessions}/{student.totalSessions} days
                      </p>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(student.status)}</td>
                    <td className="py-3.5 px-4 text-center">
                      {student.trend === "improving" && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          <TrendingUp className="size-4" /> Up
                        </span>
                      )}
                      {student.trend === "stable" && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                          Stable
                        </span>
                      )}
                      {student.trend === "declining" && (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                          <TrendingDown className="size-4" /> Down
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedStudent(student)}
                        className="gap-1.5 text-xs font-semibold"
                      >
                        <Eye className="size-3.5" /> View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Student Detailed Performance Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-xl">
          {selectedStudent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="size-12 border-2 border-primary/30">
                    <AvatarImage src={selectedStudent.avatarUrl || ""} alt={selectedStudent.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {selectedStudent.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl font-bold">{selectedStudent.name}</DialogTitle>
                    <DialogDescription className="text-xs mt-0.5">
                      Roll: {selectedStudent.rollNumber} | Admission: {selectedStudent.admissionNumber} | {selectedStudent.programName} ({selectedStudent.sectionName})
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Highlights */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
                    <span className="text-xs text-muted-foreground uppercase font-bold">Academic Aggregate</span>
                    <div className="text-2xl font-extrabold text-primary mt-1">
                      {selectedStudent.examPercent}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Grade: <span className="font-bold text-foreground">{selectedStudent.grade}</span> ({selectedStudent.examsAttempted} exams assessed)
                    </p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
                    <span className="text-xs text-muted-foreground uppercase font-bold">Attendance Record</span>
                    <div className={`text-2xl font-extrabold mt-1 ${getAttendanceBadgeColor(selectedStudent.attendancePercent)}`}>
                      {selectedStudent.attendancePercent}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Present {selectedStudent.presentSessions} of {selectedStudent.totalSessions} recorded sessions
                    </p>
                  </div>
                </div>

                {/* Subject-Wise Breakdown */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Subject-Wise Assessment
                  </h4>
                  <div className="space-y-2">
                    {selectedStudent.subjects.map((sub, idx) => (
                      <div key={idx} className="p-2.5 bg-background border rounded-lg">
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span>{sub.subject}</span>
                          <span className={sub.score >= 75 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-foreground"}>
                            {sub.score}%
                          </span>
                        </div>
                        <Progress value={sub.score} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact & Status */}
                <div className="flex items-center justify-between text-xs border-t pt-3 text-muted-foreground">
                  <div>
                    <span>Email: </span>
                    <span className="font-medium text-foreground">{selectedStudent.email}</span>
                  </div>
                  <div>
                    <span>Phone: </span>
                    <span className="font-medium text-foreground">{selectedStudent.phone}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
