"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  Eye,
  Filter,
  Globe,
  HelpCircle,
  History,
  Layers,
  Loader2,
  MapPin,
  Maximize2,
  MousePointerClick,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { useActiveInstitution } from "@/hooks/use-active-institution";

import { useSearchParams } from "next/navigation";

export default function AnalyticsDashboardPage() {
  const { user, accessToken } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const searchParams = useSearchParams();

  const activeTab = searchParams.get("tab") || "overview";
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  // Overview Data
  const [overviewSummary, setOverviewSummary] = useState({
    total_clicks: 0,
    total_views: 0,
    total_impressions: 0,
    total_searches: 0,
    total_visitors: 0,
  });
  const [topClicks, setTopClicks] = useState<any[]>([]);
  const [topViews, setTopViews] = useState<any[]>([]);
  const [topSearches, setTopSearches] = useState<any[]>([]);
  const [topLocations, setTopLocations] = useState<any[]>([]);

  // List Data for Clicks, Views, Impressions, Searches, Journeys
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [journeysList, setJourneysList] = useState<any[]>([]);

  // Journey Detail Modal
  const [selectedVisitor, setSelectedVisitor] = useState<any | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [journeyModalOpen, setJourneyModalOpen] = useState(false);

  const authHeader = useCallback(() => {
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    return headers;
  }, [accessToken]);

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab: activeTab,
        page: String(page),
        limit: "15",
      });
      if (search.trim()) params.set("search", search.trim());
      if (activeInstitutionId) params.set("institutionId", String(activeInstitutionId));

      const res = await fetch(`/api/admin/analytics?${params.toString()}`, {
        headers: authHeader(),
      });

      if (res.ok) {
        const json = await res.json();
        if (activeTab === "overview") {
          setOverviewSummary(json.summary || {});
          setTopClicks(json.topClicks || []);
          setTopViews(json.topViews || []);
          setTopSearches(json.topSearches || []);
          setTopLocations(json.topLocations || []);
        } else if (activeTab === "journeys") {
          setJourneysList(json.data || []);
          setTotalRows(json.total || 0);
          setPageCount(json.pageCount || 1);
        } else {
          setEventsList(json.data || []);
          setTotalRows(json.total || 0);
          setPageCount(json.pageCount || 1);
        }
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, search, activeInstitutionId, authHeader]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const handleOpenJourneyModal = async (visitor: any) => {
    setSelectedVisitor(visitor);
    setJourneyModalOpen(true);
    setTimelineLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?tab=journey_detail&anonymousId=${encodeURIComponent(visitor.anonymous_id)}`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const json = await res.json();
        setTimelineEvents(json.timeline || []);
      }
    } catch (err) {
      console.error("Error loading visitor journey:", err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getTabMeta = () => {
    switch (activeTab) {
      case "clicks":
        return {
          title: "Option Clicks Telemetry",
          desc: "Track interactive button clicks, CTAs, enquiry triggers, and the keywords that helped users reach them.",
          icon: MousePointerClick,
          iconColor: "text-amber-500",
        };
      case "views":
        return {
          title: "Page Views Analytics",
          desc: "Live audit of visited courses, notes, exams, vendor listings, and institute profiles.",
          icon: Eye,
          iconColor: "text-blue-500",
        };
      case "impressions":
        return {
          title: "Impression Records",
          desc: "Visibility and display frequency of course and product cards on user screens.",
          icon: Layers,
          iconColor: "text-purple-500",
        };
      case "searches":
        return {
          title: "Search Query History",
          desc: "Keywords, phrases, and topics entered by prospective students and parents.",
          icon: Search,
          iconColor: "text-emerald-500",
        };
      case "journeys":
        return {
          title: "Visitor User Journeys",
          desc: "End-to-end chronological path tracking for each registered or anonymous visitor ID.",
          icon: Compass,
          iconColor: "text-rose-500",
        };
      default:
        return {
          title: "Traffic Analytics & User Journeys",
          desc: "Monitor real-time option clicks, page views, impressions, search queries, and visitor paths.",
          icon: BarChart3,
          iconColor: "text-primary",
        };
    }
  };

  const meta = getTabMeta();
  const HeaderIcon = meta.icon;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {isPlatformAdmin ? "Platform Telemetry & User Journey" : "Institution Traffic Analytics"}
            </Badge>
            <span className="text-xs text-muted-foreground">Live Telemetry</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mt-1 flex items-center gap-2">
            <HeaderIcon className={`h-7 w-7 ${meta.iconColor}`} /> {meta.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meta.desc}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeTab !== "overview" && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by keyword, IP, URL..."
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalyticsData}
            disabled={loading}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Main Content Rendered Directly Based on Sidebar Selection */}
      <div className="space-y-6">

        {/* 1. OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-4 rounded-2xl shadow-2xs border-border bg-card">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Total Clicks</span>
                <MousePointerClick className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {overviewSummary.total_clicks?.toLocaleString() || 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Button & CTA Actions</p>
            </Card>

            <Card className="p-4 rounded-2xl shadow-2xs border-border bg-card">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Page Views</span>
                <Eye className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {overviewSummary.total_views?.toLocaleString() || 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Content Screen Visits</p>
            </Card>

            <Card className="p-4 rounded-2xl shadow-2xs border-border bg-card">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Impressions</span>
                <Layers className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {overviewSummary.total_impressions?.toLocaleString() || 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Listing Card Displays</p>
            </Card>

            <Card className="p-4 rounded-2xl shadow-2xs border-border bg-card">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Search Queries</span>
                <Search className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {overviewSummary.total_searches?.toLocaleString() || 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Keywords Searched</p>
            </Card>

            <Card className="p-4 rounded-2xl shadow-2xs border-border bg-card col-span-2 md:col-span-1">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Unique Journeys</span>
                <Users className="h-4 w-4 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {overviewSummary.total_visitors?.toLocaleString() || 0}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Tracked Visitors</p>
            </Card>
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Clicked Actions */}
            <Card className="rounded-2xl shadow-2xs">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4 text-amber-500" /> Most Clicked Buttons & CTAs
                </CardTitle>
                <CardDescription className="text-xs">Interaction frequency across listing pages</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {topClicks.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No click events recorded yet.</p>
                ) : (
                  topClicks.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-xs text-foreground">{item.button_name}</span>
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs">{item.count} clicks</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Most Visited Pages */}
            <Card className="rounded-2xl shadow-2xs">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" /> Top Visited Pages & Content
                </CardTitle>
                <CardDescription className="text-xs">Most viewed sections across EduBird</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {topViews.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No page views recorded yet.</p>
                ) : (
                  topViews.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40">
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground truncate">{item.page_name || "Page"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{item.page_url}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs shrink-0">{item.count} views</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Top Search Keywords */}
            <Card className="rounded-2xl shadow-2xs">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Search className="h-4 w-4 text-emerald-500" /> Keywords Helping Users Reach Content
                </CardTitle>
                <CardDescription className="text-xs">Top discovery queries and search intents</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {topSearches.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No search keywords recorded yet.</p>
                ) : (
                  topSearches.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40">
                      <div className="flex items-center gap-2">
                        <Tag className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-xs text-foreground">"{item.keywords}"</span>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-xs font-mono">
                        {item.count} searches
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Top Visitor Locations */}
            <Card className="rounded-2xl shadow-2xs">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-rose-500" /> Geographic Footprint (IP & Locations)
                </CardTitle>
                <CardDescription className="text-xs">Cities and regions from where visitors browse</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {topLocations.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No location footprints recorded yet.</p>
                ) : (
                  topLocations.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span className="font-semibold text-xs text-foreground">{item.location}</span>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">{item.count} events</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
          </div>
        )}

        {/* 2. OPTION CLICKS TAB */}
        {activeTab === "clicks" && (
          <div className="space-y-4">
          <Card className="rounded-2xl shadow-2xs overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                    <th className="p-3.5">Button / Action Name</th>
                    <th className="p-3.5">Page URL</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">IP Address</th>
                    <th className="p-3.5">Location</th>
                    <th className="p-3.5">Keywords Helped Reach</th>
                    <th className="p-3.5">Visitor / User ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /> Loading click events...
                      </td>
                    </tr>
                  ) : eventsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No click events matching criteria.
                      </td>
                    </tr>
                  ) : (
                    eventsList.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 font-bold">
                          <Badge className="bg-amber-500/15 text-amber-800 border-amber-500/30 text-xs gap-1 py-1">
                            <MousePointerClick className="h-3 w-3" /> {row.button_name || "Action Click"}
                          </Badge>
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <a
                            href={row.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline flex items-center gap-1 truncate"
                            title={row.page_url}
                          >
                            <span className="truncate">{row.page_url}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </td>
                        <td className="p-3.5 text-muted-foreground whitespace-nowrap">{formatDate(row.created_at)}</td>
                        <td className="p-3.5 font-mono text-[11px]">{row.ip_address}</td>
                        <td className="p-3.5 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                            {row.location || "India"}
                          </span>
                        </td>
                        <td className="p-3.5 max-w-[200px]">
                          {row.keywords ? (
                            <Badge variant="outline" className="text-[11px] font-normal truncate max-w-full">
                              "{row.keywords}"
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/60 italic">Direct / Navigation</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-[11px]">
                          <span className="text-foreground font-semibold">{row.user_name || row.anonymous_id}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

        {/* 3. VIEWS TAB */}
        {activeTab === "views" && (
          <div className="space-y-4">
          <Card className="rounded-2xl shadow-2xs overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                    <th className="p-3.5">Page Name</th>
                    <th className="p-3.5">Page URL</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">IP Address</th>
                    <th className="p-3.5">Location</th>
                    <th className="p-3.5">Keywords Helped Reach</th>
                    <th className="p-3.5">Visitor / User ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /> Loading page views...
                      </td>
                    </tr>
                  ) : eventsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No page views matching criteria.
                      </td>
                    </tr>
                  ) : (
                    eventsList.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 font-bold text-foreground max-w-[220px] truncate">
                          {row.page_name || "Page View"}
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <a
                            href={row.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline flex items-center gap-1 truncate"
                            title={row.page_url}
                          >
                            <span className="truncate">{row.page_url}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </td>
                        <td className="p-3.5 text-muted-foreground whitespace-nowrap">{formatDate(row.created_at)}</td>
                        <td className="p-3.5 font-mono text-[11px]">{row.ip_address}</td>
                        <td className="p-3.5 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                            {row.location || "India"}
                          </span>
                        </td>
                        <td className="p-3.5 max-w-[200px]">
                          {row.keywords ? (
                            <Badge variant="outline" className="text-[11px] font-normal truncate max-w-full">
                              "{row.keywords}"
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/60 italic">Direct / Navigation</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-[11px]">
                          <span className="text-foreground font-semibold">{row.user_name || row.anonymous_id}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

        {/* 4. IMPRESSIONS TAB */}
        {activeTab === "impressions" && (
          <div className="space-y-4">
          <Card className="rounded-2xl shadow-2xs overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                    <th className="p-3.5">URL / Listing Card</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">IP Address</th>
                    <th className="p-3.5">Location</th>
                    <th className="p-3.5">Keywords Helped Reach</th>
                    <th className="p-3.5">Device</th>
                    <th className="p-3.5">Visitor ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /> Loading impressions...
                      </td>
                    </tr>
                  ) : eventsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No impressions matching criteria.
                      </td>
                    </tr>
                  ) : (
                    eventsList.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 max-w-xs">
                          <p className="font-bold text-foreground truncate">{row.page_name || "Listing Card"}</p>
                          <a
                            href={row.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-muted-foreground hover:text-primary truncate block"
                          >
                            {row.page_url}
                          </a>
                        </td>
                        <td className="p-3.5 text-muted-foreground whitespace-nowrap">{formatDate(row.created_at)}</td>
                        <td className="p-3.5 font-mono text-[11px]">{row.ip_address}</td>
                        <td className="p-3.5 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                            {row.location || "India"}
                          </span>
                        </td>
                        <td className="p-3.5 max-w-[200px]">
                          {row.keywords ? (
                            <Badge variant="outline" className="text-[11px] font-normal truncate max-w-full">
                              "{row.keywords}"
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/60 italic">Search Listing Impression</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <Badge variant="secondary" className="capitalize text-[10px]">{row.device_type || "desktop"}</Badge>
                        </td>
                        <td className="p-3.5 font-mono text-[11px]">
                          <span className="text-foreground font-semibold">{row.user_name || row.anonymous_id}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

        {/* 5. SEARCH HISTORY TAB */}
        {activeTab === "searches" && (
          <div className="space-y-4">
          <Card className="rounded-2xl shadow-2xs overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                    <th className="p-3.5">Search Query / Keyword</th>
                    <th className="p-3.5">Page URL / Section</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">IP Address</th>
                    <th className="p-3.5">Location</th>
                    <th className="p-3.5">Visitor / User ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /> Loading search queries...
                      </td>
                    </tr>
                  ) : eventsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No search queries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    eventsList.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 font-bold text-foreground">
                          <Badge className="bg-emerald-500/15 text-emerald-800 border-emerald-500/30 text-xs gap-1.5 py-1">
                            <Search className="h-3 w-3" /> "{row.keywords || "Search"}"
                          </Badge>
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <span className="font-medium text-foreground block truncate">{row.page_name || "Search"}</span>
                          <span className="text-[11px] text-muted-foreground truncate block">{row.page_url}</span>
                        </td>
                        <td className="p-3.5 text-muted-foreground whitespace-nowrap">{formatDate(row.created_at)}</td>
                        <td className="p-3.5 font-mono text-[11px]">{row.ip_address}</td>
                        <td className="p-3.5 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                            {row.location || "India"}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[11px]">
                          <span className="text-foreground font-semibold">{row.user_name || row.anonymous_id}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

        {/* 6. USER JOURNEY TAB */}
        {activeTab === "journeys" && (
          <div className="space-y-4">
          <Card className="rounded-2xl shadow-2xs overflow-hidden border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                    <th className="p-3.5">Unique Visitor ID</th>
                    <th className="p-3.5">User Identity</th>
                    <th className="p-3.5">IP Address & Location</th>
                    <th className="p-3.5">First Seen / Last Active</th>
                    <th className="p-3.5">Total Steps</th>
                    <th className="p-3.5">Recent Journey Path</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /> Loading visitor journeys...
                      </td>
                    </tr>
                  ) : journeysList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No visitor journeys found.
                      </td>
                    </tr>
                  ) : (
                    journeysList.map((visitor) => (
                      <tr key={visitor.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 font-mono text-[11px] font-bold text-primary">
                          {visitor.anonymous_id}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 font-semibold text-foreground">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{visitor.user_name || "Logged-out Visitor"}</span>
                          </div>
                          {visitor.user_id ? (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-400/30 mt-0.5">
                              Registered User #{visitor.user_id}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] mt-0.5">
                              Anonymous Visitor
                            </Badge>
                          )}
                        </td>
                        <td className="p-3.5 space-y-0.5">
                          <div className="font-mono text-[11px] text-foreground">{visitor.ip_address}</div>
                          <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
                            <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                            <span>{visitor.location || "India"}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-muted-foreground whitespace-nowrap text-[11px]">
                          <div><span className="font-semibold text-foreground">Active:</span> {formatDate(visitor.last_seen_at)}</div>
                          <div className="text-[10px] text-muted-foreground/80">Started: {formatDate(visitor.first_seen_at)}</div>
                        </td>
                        <td className="p-3.5">
                          <Badge variant="outline" className="font-mono font-bold text-xs bg-primary/5 text-primary border-primary/20">
                            {visitor.total_events || 1} Actions
                          </Badge>
                        </td>
                        <td className="p-3.5 max-w-xs">
                          {Array.isArray(visitor.recent_steps) && visitor.recent_steps.length > 0 ? (
                            <div className="flex items-center gap-1 overflow-hidden truncate">
                              {visitor.recent_steps.slice(0, 3).map((step: any, sIdx: number) => (
                                <React.Fragment key={sIdx}>
                                  <Badge
                                    variant="secondary"
                                    className={`text-[9px] px-1.5 py-0.5 shrink-0 ${
                                      step.event_type === "click"
                                        ? "bg-amber-100 text-amber-800"
                                        : step.event_type === "search"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {step.button_name || step.page_name || step.event_type}
                                  </Badge>
                                  {sIdx < 2 && sIdx < visitor.recent_steps.length - 1 && (
                                    <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">Direct Visit</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleOpenJourneyModal(visitor)}
                            className="h-8 px-2.5 text-xs font-semibold gap-1"
                          >
                            <Compass className="h-3.5 w-3.5" /> Full Journey
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

        {/* Pagination controls for list tabs */}
        {activeTab !== "overview" && pageCount > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Showing Page {page} of {pageCount} ({totalRows} records)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 text-xs font-semibold"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
                className="h-8 text-xs font-semibold"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* User Journey Full Timeline Modal */}
      <Dialog open={journeyModalOpen} onOpenChange={setJourneyModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Compass className="h-5 w-5 text-rose-500" />
              Visitor End-to-End Journey Timeline
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete step-by-step audit of page visits, search keywords, clicks, and conversion points.
            </DialogDescription>
          </DialogHeader>

          {selectedVisitor && (
            <div className="space-y-4">
              {/* Visitor Metadata Banner */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Unique Anonymous ID</span>
                    <span className="font-mono font-bold text-primary">{selectedVisitor.anonymous_id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">User Name / Status</span>
                    <span className="font-semibold text-foreground">{selectedVisitor.user_name || "Logged Out"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">IP & Location</span>
                    <span className="font-medium text-foreground">{selectedVisitor.ip_address} • {selectedVisitor.location}</span>
                  </div>
                </div>
                {selectedVisitor.referrer && (
                  <div className="text-xs pt-1 border-t border-border/40">
                    <span className="text-muted-foreground text-[10px]">Traffic Inflow Referrer: </span>
                    <span className="font-mono text-muted-foreground text-[11px]">{selectedVisitor.referrer}</span>
                  </div>
                )}
              </div>

              {/* Chronological Timeline */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Chronological Path
                </h4>

                {timelineLoading ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary mb-2" />
                    Assembling journey timeline...
                  </div>
                ) : timelineEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No timeline events recorded.</p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {timelineEvents.map((ev, idx) => {
                      const isClick = ev.event_type === "click";
                      const isSearch = ev.event_type === "search";
                      const isImpression = ev.event_type === "impression";

                      return (
                        <div key={ev.id || idx} className="relative group">
                          {/* Dot Icon */}
                          <div
                            className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-xs ${
                              isClick
                                ? "bg-amber-500"
                                : isSearch
                                ? "bg-emerald-500"
                                : isImpression
                                ? "bg-purple-500"
                                : "bg-blue-500"
                            }`}
                          >
                            {idx + 1}
                          </div>

                          <div className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  className={`text-[10px] uppercase font-bold px-1.5 py-0.2 ${
                                    isClick
                                      ? "bg-amber-500/10 text-amber-800 border-amber-500/30"
                                      : isSearch
                                      ? "bg-emerald-500/10 text-emerald-800 border-emerald-500/30"
                                      : isImpression
                                      ? "bg-purple-500/10 text-purple-800 border-purple-500/30"
                                      : "bg-blue-500/10 text-blue-800 border-blue-500/30"
                                  }`}
                                >
                                  {ev.event_type}
                                </Badge>
                                <span className="font-bold text-xs text-foreground">
                                  {isClick
                                    ? `Clicked "${ev.button_name}"`
                                    : isSearch
                                    ? `Searched "${ev.keywords}"`
                                    : ev.page_name || "Page View"}
                                </span>
                              </div>

                              <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                                {formatDate(ev.created_at)}
                              </span>
                            </div>

                            <a
                              href={ev.page_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-primary hover:underline block truncate"
                            >
                              {ev.page_url}
                            </a>

                            {ev.keywords && !isSearch && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-0.5">
                                <Tag className="h-2.5 w-2.5 text-emerald-600" />
                                <span>Referred by keyword: <strong>"{ev.keywords}"</strong></span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
