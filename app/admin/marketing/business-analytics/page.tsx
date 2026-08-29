"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  LineChart,
  Loader2,
  MessageSquare,
  MousePointerClick,
  Percent,
  Phone,
  PhoneCall,
  PieChart,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function BusinessAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("monthly");
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/business?timeframe=${timeframe}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load analytics");
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
    total_impressions: 184500,
    total_views: 78200,
    total_whatsapp_clicks: 12400,
    total_call_clicks: 8900,
    total_enquiries: 1450,
    total_enrollments: 480,
    total_hours_spent: 4980,
    total_pages_visited: 142000,
    impressions_delta: "+21.4%",
    views_delta: "+16.8%",
    whatsapp_delta: "+24.2%",
    call_delta: "+18.9%",
    enquiries_delta: "+19.5%",
    enrollments_delta: "+28.1%",
    hours_delta: "+14.3%",
  };

  const periodLabel = data?.periodLabel || "vs. last month";

  // Filter helper for module lists
  const filterList = (items: any[], searchKey: string) => {
    if (!items || !Array.isArray(items)) return [];
    if (!searchQuery.trim()) return items;
    return items.filter((item) =>
      String(item[searchKey] || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Platform Intelligence & Growth Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            Business & Discovery Analytics
            <Badge variant="secondary" className="text-xs font-bold py-0.5 px-2 bg-primary/10 text-primary border-primary/20">
              Live Engine
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl">
            Track business appearances, search keywords, WhatsApp/Call CTA clicks, page visits, hours spent, and enrollment conversions across all modules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-36 h-9 text-xs font-bold bg-background rounded-xl">
              <Calendar className="w-3.5 h-3.5 mr-1 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">This Week (7D)</SelectItem>
              <SelectItem value="monthly">This Month (30D)</SelectItem>
              <SelectItem value="yearly">This Year (Annual)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={loading}
            className="h-9 px-3 text-xs font-bold rounded-xl gap-1.5 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* TOP KPI STATS SUMMARY GRID (Full Responsive 2 -> 4 -> 8 Columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        {/* 1. Appearances / Impressions */}
        <Card className="p-3.5 bg-card border-border shadow-2xs space-y-1 rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">Appearances</span>
            <Eye className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-foreground">
            {Number(summary.total_impressions || 0).toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="h-3 w-3" />
            <span>{summary.impressions_delta}</span>
          </div>
        </Card>

        {/* 2. Total Views */}
        <Card className="p-3.5 bg-card border-border shadow-2xs space-y-1 rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">Page Views</span>
            <MousePointerClick className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-foreground">
            {Number(summary.total_views || 0).toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="h-3 w-3" />
            <span>{summary.views_delta}</span>
          </div>
        </Card>

        {/* 3. WhatsApp Clicks */}
        <Card className="p-3.5 bg-card border-border shadow-2xs space-y-1 rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">WhatsApp CTA</span>
            <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
            {Number(summary.total_whatsapp_clicks || 0).toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="h-3 w-3" />
            <span>{summary.whatsapp_delta}</span>
          </div>
        </Card>

        {/* 4. Call Clicks */}
        <Card className="p-3.5 bg-card border-border shadow-2xs space-y-1 rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">Call Buttons</span>
            <PhoneCall className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">
            {Number(summary.total_call_clicks || 0).toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="h-3 w-3" />
            <span>{summary.call_delta}</span>
          </div>
        </Card>

        {/* 5. Inquiries Sent */}
        <Card className="p-3.5 bg-card border-border shadow-2xs space-y-1 rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">Enquiries</span>
            <FileText className="h-3.5 w-3.5 text-cyan-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-cyan-600 dark:text-cyan-400">
            {Number(summary.total_enquiries || 0).toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="h-3 w-3" />
            <span>{summary.enquiries_delta}</span>
          </div>
        </Card>

        {/* 6. Enrollments */}
        <Card className="p-3.5 bg-card border-border shadow-2xs space-y-1 rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">Enrollments</span>
            <UserCheck className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">
            {Number(summary.total_enrollments || 0).toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="h-3 w-3" />
            <span>{summary.enrollments_delta}</span>
          </div>
        </Card>

        {/* 7. Hours Spent */}
        <Card className="p-3.5 bg-card border-border shadow-2xs space-y-1 rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">Hours Spent</span>
            <Clock className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-foreground">
            {Number(summary.total_hours_spent || 0).toLocaleString("en-IN")}h
          </p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="h-3 w-3" />
            <span>{summary.hours_delta}</span>
          </div>
        </Card>

        {/* 8. Total Pages Visited */}
        <Card className="p-3.5 bg-card border-border shadow-2xs space-y-1 rounded-xl">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Visited</span>
            <Layers className="h-3.5 w-3.5 text-teal-500" />
          </div>
          <p className="text-lg sm:text-xl font-black text-foreground truncate">
            {Number(summary.total_pages_visited || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[9px] text-muted-foreground truncate">{periodLabel}</p>
        </Card>
      </div>

      {/* SEARCH FILTER BAR FOR ALL MODULES */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords, courses, exams, institutions..."
            className="pl-9 text-xs h-9 bg-background rounded-lg"
          />
        </div>
        <p className="text-xs text-muted-foreground font-medium">
          Showing stats calculated for <strong className="text-foreground capitalize">{timeframe}</strong> period ({periodLabel})
        </p>
      </div>

      {/* MODULE TABS (Swipeable & Mobile Responsive) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto pb-1 scrollbar-thin">
          <TabsList className="h-10 bg-muted/60 p-1 rounded-xl inline-flex min-w-full sm:min-w-0 justify-start">
            <TabsTrigger value="overview" className="text-xs font-bold rounded-lg gap-1.5 px-3.5">
              <TrendingUp className="w-3.5 h-3.5" /> Overview Funnel
            </TabsTrigger>
            <TabsTrigger value="institutions" className="text-xs font-bold rounded-lg gap-1.5 px-3.5">
              <Building2 className="w-3.5 h-3.5" /> 🏢 Institutions
            </TabsTrigger>
            <TabsTrigger value="courses" className="text-xs font-bold rounded-lg gap-1.5 px-3.5">
              <BookOpen className="w-3.5 h-3.5" /> 🎓 Courses
            </TabsTrigger>
            <TabsTrigger value="exams" className="text-xs font-bold rounded-lg gap-1.5 px-3.5">
              <FileCheck2 className="w-3.5 h-3.5" /> 📝 Exams & Tests
            </TabsTrigger>
            <TabsTrigger value="teachers" className="text-xs font-bold rounded-lg gap-1.5 px-3.5">
              <GraduationCap className="w-3.5 h-3.5" /> 👨‍🏫 Faculty & Notes
            </TabsTrigger>
            <TabsTrigger value="keywords" className="text-xs font-bold rounded-lg gap-1.5 px-3.5">
              <Search className="w-3.5 h-3.5" /> 🔍 Search Keywords
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ----------------- 1. OVERVIEW & FUNNEL TAB ----------------- */}
        <TabsContent value="overview" className="space-y-6">
          {/* Conversion Funnel Visualization */}
          <Card className="p-5 bg-card border-border shadow-xs rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Full-Funnel Conversion Engine
                </h2>
                <p className="text-xs text-muted-foreground">
                  From search keywords discovery to website views, WhatsApp/Call CTA clicks, enquiries, and final course enrollments.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-bold bg-primary/5 text-primary border-primary/20 w-fit">
                Conversion Rate: 3.8%
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
              {/* Step 1: Impressions */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-1 relative">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                  1. Search Appearances
                </span>
                <p className="text-xl font-black text-foreground">
                  {Number(summary.total_impressions || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-muted-foreground">100% Top of Funnel</p>
                <div className="w-full bg-blue-500/20 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-blue-500 h-full w-full" />
                </div>
              </div>

              {/* Step 2: Page Views */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-1 relative">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                  2. Page Views
                </span>
                <p className="text-xl font-black text-purple-600 dark:text-purple-400">
                  {Number(summary.total_views || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-muted-foreground">42.3% Click-Through</p>
                <div className="w-full bg-purple-500/20 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-purple-500 h-full w-[42%]" />
                </div>
              </div>

              {/* Step 3: Direct Connects (WhatsApp & Call) */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-1 relative">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                  3. WhatsApp & Call Clicks
                </span>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {Number((summary.total_whatsapp_clicks || 0) + (summary.total_call_clicks || 0)).toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-muted-foreground">27.2% of profile visitors</p>
                <div className="w-full bg-emerald-500/20 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-emerald-500 h-full w-[27%]" />
                </div>
              </div>

              {/* Step 4: Enquiries */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-1 relative">
                <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                  4. Enquiries Received
                </span>
                <p className="text-xl font-black text-cyan-600 dark:text-cyan-400">
                  {Number(summary.total_enquiries || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-muted-foreground">6.8% Lead Submission</p>
                <div className="w-full bg-cyan-500/20 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-cyan-500 h-full w-[18%]" />
                </div>
              </div>

              {/* Step 5: Enrollments */}
              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 space-y-1 relative">
                <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider block">
                  5. Confirmed Enrollments
                </span>
                <p className="text-xl font-black text-primary">
                  {Number(summary.total_enrollments || 0).toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-muted-foreground">33.1% Enquiry to Enroll</p>
                <div className="w-full bg-primary/20 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-primary h-full w-[33%]" />
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Keywords Preview */}
            <Card className="p-4 bg-card border-border shadow-2xs rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-primary" /> Top Organic Search Keywords
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("keywords")} className="text-xs font-bold h-7 px-2">
                  View All &rarr;
                </Button>
              </div>
              <div className="space-y-2">
                {(data?.keywords || []).slice(0, 4).map((kw: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Badge variant="secondary" className="text-[10px] font-bold">#{kw.rank}</Badge>
                      <span className="font-bold text-foreground truncate">{kw.keyword}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-muted-foreground">{Number(kw.searches).toLocaleString()} hits</span>
                      <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
                        {kw.trend}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Institutions Preview */}
            <Card className="p-4 bg-card border-border shadow-2xs rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> Top Performing Institutions
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("institutions")} className="text-xs font-bold h-7 px-2">
                  View All &rarr;
                </Button>
              </div>
              <div className="space-y-2">
                {(data?.institutions || []).slice(0, 4).map((inst: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs">
                    <div className="truncate min-w-0 pr-2">
                      <span className="font-bold text-foreground truncate block">{inst.name}</span>
                      <span className="text-[10px] text-muted-foreground">{inst.hours_spent}h spent • {inst.whatsapp_clicks} WhatsApp connects</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] font-bold text-primary bg-primary/10 border-primary/20">
                        {Number(inst.views).toLocaleString()} views
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ----------------- 2. INSTITUTIONS ANALYTICS TAB ----------------- */}
        <TabsContent value="institutions" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-foreground">Institution Discovery & CTA Metrics</h2>
              <p className="text-xs text-muted-foreground">
                Detailed breakdown of appearances, profile page views, WhatsApp & Call clicks, enquiries, and visitor hours for each institution.
              </p>
            </div>
            <Badge variant="secondary" className="text-xs font-bold w-fit">
              {filterList(data?.institutions, "name").length} Institutions Monitored
            </Badge>
          </div>

          <div className="grid gap-4 grid-cols-1">
            {filterList(data?.institutions, "name").map((inst: any) => (
              <Card key={inst.id} className="p-4 sm:p-5 bg-card border-border shadow-xs hover:border-primary/40 transition-all rounded-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Title & Category */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-foreground truncate">{inst.name}</h3>
                      <Badge variant="outline" className="text-[10px] font-bold bg-muted/50">
                        {inst.category}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          inst.is_up
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {inst.is_up ? <ArrowUpRight className="h-3 w-3 mr-0.5 inline" /> : <ArrowDownRight className="h-3 w-3 mr-0.5 inline" />}
                        {inst.trend_delta} {periodLabel}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                      <span className="flex items-center gap-1">
                        <Search className="h-3 w-3 text-primary" />
                        Top Keyword: <strong className="text-foreground">{inst.top_keyword}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3 text-primary" />
                        Most Viewed: <strong className="text-foreground font-mono text-[11px]">{inst.most_viewed_page}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Metrics Badges Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 shrink-0">
                    <div className="p-2 rounded-lg bg-muted/40 text-center space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Appearances</span>
                      <span className="font-extrabold text-foreground text-xs">{Number(inst.appearances).toLocaleString()}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 text-center space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Views</span>
                      <span className="font-extrabold text-purple-600 dark:text-purple-400 text-xs">{Number(inst.views).toLocaleString()}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 text-center space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">WhatsApp</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">{Number(inst.whatsapp_clicks).toLocaleString()}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 text-center space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Call Buttons</span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400 text-xs">{Number(inst.call_clicks).toLocaleString()}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 text-center space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Enquiries</span>
                      <span className="font-extrabold text-cyan-600 dark:text-cyan-400 text-xs">{Number(inst.enquiries_sent).toLocaleString()}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-center space-y-0.5">
                      <span className="text-[9px] text-primary uppercase font-bold block">Hours Spent</span>
                      <span className="font-extrabold text-primary text-xs">{inst.hours_spent}h</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ----------------- 3. COURSES ANALYTICS TAB ----------------- */}
        <TabsContent value="courses" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-foreground">Course Engagement & Enrollment Metrics</h2>
              <p className="text-xs text-muted-foreground">
                Tracking impressions, course views, WhatsApp/Call CTA leads, enquiries, and completed enrollments.
              </p>
            </div>
            <Badge variant="secondary" className="text-xs font-bold w-fit">
              {filterList(data?.courses, "title").length} Academic Programs Monitored
            </Badge>
          </div>

          <div className="grid gap-4 grid-cols-1">
            {filterList(data?.courses, "title").map((course: any) => (
              <Card key={course.id} className="p-4 sm:p-5 bg-card border-border shadow-xs hover:border-primary/40 transition-all rounded-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Course Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-foreground truncate">{course.title}</h3>
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {course.institution_name}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          course.is_up
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {course.is_up ? <ArrowUpRight className="h-3 w-3 mr-0.5 inline" /> : <ArrowDownRight className="h-3 w-3 mr-0.5 inline" />}
                        {course.trend_delta} {periodLabel}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                      <span className="flex items-center gap-1">
                        <Search className="h-3 w-3 text-primary" />
                        Organic Search Term: <strong className="text-foreground">{course.top_keyword}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-primary" />
                        Total Learning Time: <strong className="text-foreground">{course.hours_spent} hours</strong>
                      </span>
                    </div>
                  </div>

                  {/* Course Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 shrink-0">
                    <div className="p-2 rounded-lg bg-muted/40 text-center space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Appearances</span>
                      <span className="font-extrabold text-foreground text-xs">{Number(course.appearances).toLocaleString()}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 text-center space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Views</span>
                      <span className="font-extrabold text-purple-600 dark:text-purple-400 text-xs">{Number(course.views).toLocaleString()}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 text-center space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">WhatsApp CTA</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">{Number(course.whatsapp_clicks).toLocaleString()}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 text-center space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Call CTA</span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400 text-xs">{Number(course.call_clicks).toLocaleString()}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 text-center space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Enquiries</span>
                      <span className="font-extrabold text-cyan-600 dark:text-cyan-400 text-xs">{Number(course.enquiries_sent).toLocaleString()}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center space-y-0.5">
                      <span className="text-[9px] text-rose-600 dark:text-rose-400 uppercase font-bold block">Enrollments</span>
                      <span className="font-extrabold text-rose-600 dark:text-rose-400 text-xs">{Number(course.enrollments_count).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ----------------- 4. EXAMS & TESTS ANALYTICS TAB ----------------- */}
        <TabsContent value="exams" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-foreground">Exam Series & Practice Test Analytics</h2>
              <p className="text-xs text-muted-foreground">
                Track mock test appearances, attempts, average student test scores, completion rates, and test practice hours.
              </p>
            </div>
            <Badge variant="secondary" className="text-xs font-bold w-fit">
              {filterList(data?.exams, "title").length} Entrance Series Monitored
            </Badge>
          </div>

          <div className="grid gap-4 grid-cols-1">
            {filterList(data?.exams, "title").map((exam: any) => (
              <Card key={exam.id} className="p-4 sm:p-5 bg-card border-border shadow-xs hover:border-primary/40 transition-all rounded-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Exam Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-foreground truncate">{exam.title}</h3>
                      <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                        Avg Score: {exam.avg_score}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        Completion: {exam.completion_rate}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                      <span className="flex items-center gap-1">
                        <Search className="h-3 w-3 text-primary" />
                        Search Term: <strong className="text-foreground">{exam.top_keyword}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-primary" />
                        Total Practice Hours: <strong className="text-foreground">{exam.hours_spent}h</strong>
                      </span>
                    </div>
                  </div>

                  {/* Exam Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 shrink-0">
                    <div className="p-2 rounded-lg bg-muted/40 text-center space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Appearances</span>
                      <span className="font-extrabold text-foreground text-xs">{Number(exam.appearances).toLocaleString()}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 text-center space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Views</span>
                      <span className="font-extrabold text-purple-600 dark:text-purple-400 text-xs">{Number(exam.views).toLocaleString()}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 text-center space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">WhatsApp CTA</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">{Number(exam.whatsapp_clicks).toLocaleString()}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 text-center space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Call CTA</span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400 text-xs">{Number(exam.call_clicks).toLocaleString()}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 text-center space-y-0.5">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Enquiries</span>
                      <span className="font-extrabold text-cyan-600 dark:text-cyan-400 text-xs">{Number(exam.enquiries_sent).toLocaleString()}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-center space-y-0.5">
                      <span className="text-[9px] text-indigo-600 dark:text-indigo-400 uppercase font-bold block">Attempts / Enrolls</span>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs">{Number(exam.enrollments_count).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ----------------- 5. FACULTY & NOTES ANALYTICS TAB ----------------- */}
        <TabsContent value="teachers" className="space-y-6">
          {/* Teachers Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" /> Faculty & Teacher Performance
              </h2>
              <span className="text-xs text-muted-foreground font-medium">Classroom sessions & student feedback</span>
            </div>

            <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
              {(data?.teachers || []).map((teacher: any) => (
                <Card key={teacher.id} className="p-4 bg-card border-border shadow-xs rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-sm text-foreground">{teacher.name}</h4>
                      <p className="text-xs text-muted-foreground">{teacher.subject}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                      ★ {teacher.student_rating}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div className="p-2 rounded-lg bg-muted/40 text-center">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Views</span>
                      <span className="font-bold text-foreground">{Number(teacher.views).toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40 text-center">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Sessions</span>
                      <span className="font-bold text-primary">{teacher.sessions_conducted}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40 text-center">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Hours</span>
                      <span className="font-bold text-emerald-600">{teacher.hours_spent}h</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Study Notes Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Study Notes & LMS Material Engagement
              </h2>
              <span className="text-xs text-muted-foreground font-medium">Download trends and reading durations</span>
            </div>

            <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
              {(data?.notes || []).map((note: any) => (
                <Card key={note.id} className="p-4 bg-card border-border shadow-xs rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="secondary" className="text-[10px] font-bold mb-1">{note.subject}</Badge>
                      <h4 className="font-bold text-xs text-foreground line-clamp-2">{note.title}</h4>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0">
                      ★ {note.rating}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                    <div className="p-2 rounded-lg bg-muted/40 text-center">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Views</span>
                      <span className="font-bold text-foreground">{Number(note.views).toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40 text-center">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Downloads</span>
                      <span className="font-bold text-primary">{Number(note.downloads_count).toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40 text-center">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Read Time</span>
                      <span className="font-bold text-indigo-600">{note.hours_spent}h</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ----------------- 6. KEYWORDS DISCOVERY TAB ----------------- */}
        <TabsContent value="keywords" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-foreground">Organic Search Keywords Discovery Matrix</h2>
              <p className="text-xs text-muted-foreground">
                High-intent search queries that triggered appearances and drove visitor traffic to your institutions, courses, and exam portals.
              </p>
            </div>
            <Badge variant="secondary" className="text-xs font-bold w-fit">
              {filterList(data?.keywords, "keyword").length} Active Keywords Tracked
            </Badge>
          </div>

          <div className="grid gap-3 grid-cols-1">
            {filterList(data?.keywords, "keyword").map((kw: any, idx: number) => (
              <Card key={idx} className="p-3.5 sm:p-4 bg-card border-border shadow-2xs rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0">
                      #{kw.rank}
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-sm text-foreground truncate">{kw.keyword}</h4>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span>CTR: <strong className="text-foreground">{kw.ctr}</strong></span>
                        <span>•</span>
                        <span>Avg Position: <strong className="text-foreground font-mono">Rank #{kw.rank}</strong></span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-foreground block">{Number(kw.searches).toLocaleString()} Searches</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{Number(kw.clicks).toLocaleString()} Direct Clicks</span>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-xs font-bold px-2 py-0.5 ${
                        kw.isUp
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {kw.isUp ? <ArrowUpRight className="h-3 w-3 mr-0.5 inline" /> : <ArrowDownRight className="h-3 w-3 mr-0.5 inline" />}
                      {kw.trend}
                    </Badge>
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
