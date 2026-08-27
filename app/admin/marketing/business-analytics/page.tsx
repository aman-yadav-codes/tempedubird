"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building,
  Building2,
  Clock,
  Eye,
  FileCheck2,
  GraduationCap,
  Layers,
  LineChart,
  Loader2,
  MousePointerClick,
  PieChart,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

export default function BusinessAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("monthly");
  const [activeTab, setActiveTab] = useState("overview");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/business?timeframe=${timeframe}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load business analytics");
      setData(json);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const summary = data?.summary || {
    total_institutions: 12,
    total_courses: 48,
    total_students: 320,
    total_teachers: 24,
    total_exams: 18,
    total_impressions: 184500,
    total_views: 78200,
    total_clicks: 22400,
    total_hours_spent: 4980,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Platform Intelligence & Growth</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Business Analytics Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deep-dive metrics across institutions, courses, practice exams, notes engagement, teacher productivity, and search keyword trends.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-36 h-9 text-xs font-bold bg-background rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">This Week</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="quarterly">This Quarter</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading} className="gap-1.5 h-9">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Top Level Big Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-2xl border bg-card shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Total Impressions</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground">{summary.total_impressions.toLocaleString("en-IN")}</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
            <TrendingUp className="w-3.5 h-3.5" /> +24.8% from last period
          </div>
        </Card>

        <Card className="p-5 rounded-2xl border bg-card shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Total Page Views</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground">{summary.total_views.toLocaleString("en-IN")}</div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
            <TrendingUp className="w-3.5 h-3.5" /> +18.4% engagement
          </div>
        </Card>

        <Card className="p-5 rounded-2xl border bg-card shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Total Clicks & Actions</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {summary.total_clicks.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-muted-foreground">28.6% Avg click-through rate</p>
        </Card>

        <Card className="p-5 rounded-2xl border bg-card shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Total Study Hours Spent</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {summary.total_hours_spent.toLocaleString("en-IN")} hrs
          </div>
          <p className="text-[11px] text-muted-foreground">Across video lectures & practice exams</p>
        </Card>
      </div>

      {/* Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/60 p-1 flex-wrap">
          <TabsTrigger value="overview" className="text-xs font-bold gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="keywords" className="text-xs font-bold gap-1.5">
            <Search className="w-3.5 h-3.5" /> Keyword Search Intelligence
          </TabsTrigger>
          <TabsTrigger value="institutions" className="text-xs font-bold gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Institutions
          </TabsTrigger>
          <TabsTrigger value="courses" className="text-xs font-bold gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" /> Courses & Programs
          </TabsTrigger>
          <TabsTrigger value="exams" className="text-xs font-bold gap-1.5">
            <FileCheck2 className="w-3.5 h-3.5" /> Exams & Practice Notes
          </TabsTrigger>
          <TabsTrigger value="teachers" className="text-xs font-bold gap-1.5">
            <Users className="w-3.5 h-3.5" /> Teachers & Mentors
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Keywords Card */}
            <Card className="rounded-2xl border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Top Trending Student Keywords</h3>
                  <p className="text-xs text-muted-foreground">Highest searched curriculum and preparation terms</p>
                </div>
                <Badge variant="outline" className="text-xs font-bold text-primary">Live</Badge>
              </div>

              <div className="space-y-2.5">
                {(data?.keywords || []).slice(0, 4).map((kw: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground">{kw.keyword}</span>
                      <p className="text-[11px] text-muted-foreground">{kw.searches.toLocaleString()} searches • {kw.ctr} CTR</p>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                      {kw.trend}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Performing Courses Card */}
            <Card className="rounded-2xl border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Top Enrolled Courses</h3>
                  <p className="text-xs text-muted-foreground">Leading programs by views and admission closure</p>
                </div>
                <Badge variant="outline" className="text-xs font-bold text-primary">Top 4</Badge>
              </div>

              <div className="space-y-2.5">
                {(data?.courses || []).map((course: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border text-xs">
                    <div className="space-y-0.5 max-w-[260px]">
                      <span className="font-bold text-foreground truncate block">{course.title}</span>
                      <p className="text-[11px] text-muted-foreground">{course.views.toLocaleString()} views • {course.hours_spent} hrs studied</p>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
                      {course.enrollments} Enrolled
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords" className="space-y-4">
          <Card className="rounded-2xl border overflow-hidden">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold">Search Keywords Intelligence</CardTitle>
              <CardDescription>
                Search queries typed by students and parents across the platform with click-through and momentum trends.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-y text-muted-foreground uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3.5 pl-5">Search Query / Keyword</th>
                      <th className="p-3.5">Total Searches</th>
                      <th className="p-3.5">CTR (%)</th>
                      <th className="p-3.5">Momentum Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(data?.keywords || []).map((kw: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="p-3.5 pl-5 font-bold text-foreground">{kw.keyword}</td>
                        <td className="p-3.5 font-mono">{kw.searches.toLocaleString()}</td>
                        <td className="p-3.5 font-mono text-primary font-bold">{kw.ctr}</td>
                        <td className="p-3.5">
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                            {kw.trend}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Institutions Tab */}
        <TabsContent value="institutions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data?.institutions || []).map((inst: any, idx: number) => (
              <Card key={idx} className="rounded-2xl border p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{inst.name}</h4>
                    <span className="text-[11px] text-muted-foreground">Affiliated Campus Partner</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                    {inst.enquiries} Enquiries
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center text-xs">
                  <div className="p-2 bg-muted/30 rounded-xl">
                    <p className="text-[10px] text-muted-foreground font-semibold">Impressions</p>
                    <p className="font-black text-foreground">{inst.impressions.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded-xl">
                    <p className="text-[10px] text-muted-foreground font-semibold">Profile Views</p>
                    <p className="font-black text-foreground">{inst.views.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded-xl">
                    <p className="text-[10px] text-muted-foreground font-semibold">Hours Studied</p>
                    <p className="font-black text-amber-600">{inst.hours_spent}h</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data?.courses || []).map((c: any, idx: number) => (
              <Card key={idx} className="rounded-2xl border p-5 space-y-3">
                <h4 className="font-bold text-sm text-foreground">{c.title}</h4>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center text-xs">
                  <div className="p-2 bg-muted/30 rounded-xl">
                    <p className="text-[10px] text-muted-foreground font-semibold">Views</p>
                    <p className="font-black text-foreground">{c.views.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded-xl">
                    <p className="text-[10px] text-muted-foreground font-semibold">Time Spent</p>
                    <p className="font-black text-amber-600">{c.hours_spent}h</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded-xl">
                    <p className="text-[10px] text-muted-foreground font-semibold">Enrollments</p>
                    <p className="font-black text-emerald-600">{c.enrollments}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Exams & Notes Tab */}
        <TabsContent value="exams" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(data?.exams || []).map((ex: any, idx: number) => (
              <Card key={idx} className="rounded-2xl border p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-foreground leading-snug">{ex.title}</h4>
                  <Badge variant="outline" className="text-[10px] font-bold text-primary mt-2">
                    Completion: {ex.completion_rate}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-center text-xs">
                  <div className="p-2 bg-muted/30 rounded-xl">
                    <p className="text-[10px] text-muted-foreground font-semibold">Attempts</p>
                    <p className="font-black text-foreground">{ex.attempts.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded-xl">
                    <p className="text-[10px] text-muted-foreground font-semibold">Avg Score</p>
                    <p className="font-black text-emerald-600">{ex.avg_score}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Teachers Tab */}
        <TabsContent value="teachers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(data?.teachers || []).map((t: any, idx: number) => (
              <Card key={idx} className="rounded-2xl border p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{t.name}</h4>
                    <p className="text-xs text-muted-foreground">{t.subject}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{t.student_rating}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center text-xs">
                  <div className="p-2 bg-muted/30 rounded-xl">
                    <p className="text-[10px] text-muted-foreground font-semibold">Sessions</p>
                    <p className="font-black text-foreground">{t.sessions_conducted}</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded-xl">
                    <p className="text-[10px] text-muted-foreground font-semibold">Hours Taught</p>
                    <p className="font-black text-amber-600">{t.hours_taught}h</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded-xl">
                    <p className="text-[10px] text-muted-foreground font-semibold">Students</p>
                    <p className="font-black text-primary">{t.active_students}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
