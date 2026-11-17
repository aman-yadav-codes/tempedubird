"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Building2,
  Briefcase,
  Package,
  Layers,
  CheckCircle2,
  Clock,
  MessageSquare,
  Star,
  CreditCard,
  TrendingUp,
  Globe,
  Filter,
  RefreshCw,
  Plus,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  DollarSign,
  IndianRupee,
  Calendar,
  Eye,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

type DashboardData = {
  statistics: {
    totalUsers: number;
    totalCustomers: number;
    totalBusinessOwners: number;
    totalProfessionals: number;
    totalBusinessListings: number;
    totalProfessionalProfiles: number;
    totalMasterProducts: number;
    totalMasterServices: number;
    totalVerifiedListings: number;
    pendingApprovals: number;
    totalReviews: number;
    totalEnquiries: number;
    activeSubscriptions: number;
    totalRevenue: number;
  };
  countryAnalytics: {
    india: { businesses: number; professionals: number; products: number; services: number };
    usa: { businesses: number; professionals: number; products: number; services: number };
  };
  charts: Array<{
    month: string;
    registrations: number;
    businesses: number;
    professionals: number;
    enquiries: number;
    revenue: number;
  }>;
  recentActivity: {
    users: any[];
    businesses: any[];
    professionals: any[];
    verificationRequests: any[];
    enquiries: any[];
    reports: any[];
    payments: any[];
  };
};

export function PlatformAnalyticsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState("all");
  const [chartMetric, setChartMetric] = useState<"growth" | "revenue" | "interactions">("growth");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/analytics/dashboard", window.location.origin);
      if (countryFilter !== "all") url.searchParams.set("country", countryFilter);
      const res = await fetch(url.toString());
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load dashboard data");
      setData(json);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [countryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = data?.statistics || {
    totalUsers: 0,
    totalCustomers: 0,
    totalBusinessOwners: 0,
    totalProfessionals: 0,
    totalBusinessListings: 0,
    totalProfessionalProfiles: 0,
    totalMasterProducts: 0,
    totalMasterServices: 0,
    totalVerifiedListings: 0,
    pendingApprovals: 0,
    totalReviews: 0,
    totalEnquiries: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">System Dashboard & Analytics</h1>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              Live DB Aggregations
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time multi-country ecosystem metrics, verified listings, profiles, and activity.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-background border rounded-md px-2 py-1 text-xs">
            <Globe className="size-3.5 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Country:</span>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="h-7 border-0 p-0 text-xs shadow-none w-24">
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Global (All)</SelectItem>
                <SelectItem value="IN">India (₹)</SelectItem>
                <SelectItem value="US">USA ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-8 gap-1.5 text-xs">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Actions Toolbar */}
      <Card className="bg-muted/30 border shadow-none">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Admin Quick Actions:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                <Link href="/admin/categories?type=business">
                  <Plus className="size-3" /> Add Category
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                <Link href="/admin/catalog/products">
                  <Package className="size-3" /> Add Product
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                <Link href="/admin/catalog/services">
                  <Briefcase className="size-3" /> Add Service
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                <Link href="/admin/profiles?type=business">
                  <Building2 className="size-3" /> Manage Businesses
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                <Link href="/admin/profiles?type=professional">
                  <ShieldCheck className="size-3" /> Manage Professionals
                </Link>
              </Button>
              <Button asChild size="sm" variant="secondary" className="h-7 text-xs gap-1">
                <Link href="/admin/profiles?status=pending">
                  <Clock className="size-3 text-amber-500" /> Verify Pending ({stats.pendingApprovals})
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 14 Core Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <Card className="p-3 border-l-4 border-l-blue-500 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Total Users</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-xl font-bold">{stats.totalUsers.toLocaleString()}</h3>
            <Users className="size-4 text-blue-500 opacity-80" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{stats.totalCustomers} customers</p>
        </Card>

        <Card className="p-3 border-l-4 border-l-indigo-500 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Business Owners</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-xl font-bold">{stats.totalBusinessOwners.toLocaleString()}</h3>
            <Building2 className="size-4 text-indigo-500 opacity-80" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{stats.totalBusinessListings} active listings</p>
        </Card>

        <Card className="p-3 border-l-4 border-l-purple-500 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Professionals</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-xl font-bold">{stats.totalProfessionals.toLocaleString()}</h3>
            <Briefcase className="size-4 text-purple-500 opacity-80" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{stats.totalProfessionalProfiles} profiles</p>
        </Card>

        <Card className="p-3 border-l-4 border-l-emerald-500 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Master Products</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-xl font-bold">{stats.totalMasterProducts.toLocaleString()}</h3>
            <Package className="size-4 text-emerald-500 opacity-80" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Catalog benchmark</p>
        </Card>

        <Card className="p-3 border-l-4 border-l-teal-500 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Master Services</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-xl font-bold">{stats.totalMasterServices.toLocaleString()}</h3>
            <Layers className="size-4 text-teal-500 opacity-80" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Service catalog</p>
        </Card>

        <Card className="p-3 border-l-4 border-l-green-600 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Verified Listings</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-xl font-bold text-green-700 dark:text-green-400">{stats.totalVerifiedListings}</h3>
            <CheckCircle2 className="size-4 text-green-600" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Badge issued</p>
        </Card>

        <Card className="p-3 border-l-4 border-l-amber-500 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Pending Approvals</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-xl font-bold text-amber-600">{stats.pendingApprovals}</h3>
            <Clock className="size-4 text-amber-500" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Needs admin action</p>
        </Card>

        <Card className="p-3 border-l-4 border-l-yellow-500 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Reviews</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-xl font-bold">{stats.totalReviews.toLocaleString()}</h3>
            <Star className="size-4 text-yellow-500" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Customer feedback</p>
        </Card>

        <Card className="p-3 border-l-4 border-l-sky-500 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Enquiries</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-xl font-bold">{stats.totalEnquiries.toLocaleString()}</h3>
            <MessageSquare className="size-4 text-sky-500" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Lead submissions</p>
        </Card>

        <Card className="p-3 border-l-4 border-l-rose-500 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Subscriptions</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-xl font-bold">{stats.activeSubscriptions}</h3>
            <CreditCard className="size-4 text-rose-500" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Active tier plans</p>
        </Card>

        <Card className="p-3 border-l-4 border-l-emerald-600 shadow-sm col-span-2">
          <p className="text-xs text-muted-foreground font-medium">Recorded Platform Revenue</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-xl font-bold text-emerald-600">
              ₹{stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <TrendingUp className="size-4 text-emerald-600" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Settled income receipts</p>
        </Card>
      </div>

      {/* Country Breakdown Cards & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Country Breakdown Cards */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇮🇳</span>
                  <div>
                    <CardTitle className="text-base">India Network</CardTitle>
                    <CardDescription className="text-xs">INR (₹) Ecosystem</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2 text-xs">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Registered Businesses</span>
                <span className="font-semibold">{data?.countryAnalytics.india.businesses || 0}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Individual Professionals</span>
                <span className="font-semibold">{data?.countryAnalytics.india.professionals || 0}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Catalog Products (IN)</span>
                <span className="font-semibold">{data?.countryAnalytics.india.products || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Catalog Services (IN)</span>
                <span className="font-semibold">{data?.countryAnalytics.india.services || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇺🇸</span>
                  <div>
                    <CardTitle className="text-base">United States Network</CardTitle>
                    <CardDescription className="text-xs">USD ($) Ecosystem</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2 text-xs">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Registered Businesses</span>
                <span className="font-semibold">{data?.countryAnalytics.usa.businesses || 0}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Individual Professionals</span>
                <span className="font-semibold">{data?.countryAnalytics.usa.professionals || 0}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Catalog Products (US)</span>
                <span className="font-semibold">{data?.countryAnalytics.usa.products || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Catalog Services (US)</span>
                <span className="font-semibold">{data?.countryAnalytics.usa.services || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Growth & Trend Charts */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Ecosystem Growth Trends</CardTitle>
              <CardDescription className="text-xs">
                Historical monthly trajectory for listings, users, and transactions
              </CardDescription>
            </div>
            <div className="flex gap-1 bg-muted p-0.5 rounded-md text-xs">
              <button
                type="button"
                onClick={() => setChartMetric("growth")}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  chartMetric === "growth" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                Registrations
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("interactions")}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  chartMetric === "interactions" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                Enquiries
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("revenue")}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  chartMetric === "revenue" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                Revenue
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="h-64 w-full">
              {data?.charts && data.charts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartMetric === "revenue" ? (
                    <BarChart data={data.charts}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, "Revenue"]} />
                      <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Income Revenue" />
                    </BarChart>
                  ) : chartMetric === "interactions" ? (
                    <AreaChart data={data.charts}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Area type="monotone" dataKey="enquiries" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} name="Customer Enquiries" />
                    </AreaChart>
                  ) : (
                    <AreaChart data={data.charts}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="registrations" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} name="Users" />
                      <Area type="monotone" dataKey="businesses" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} name="Businesses" />
                      <Area type="monotone" dataKey="professionals" stroke="#a855f7" fill="#a855f7" fillOpacity={0.15} name="Professionals" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No time series data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Live Stream */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Recent Platform Activity Stream</CardTitle>
          <CardDescription className="text-xs">
            Latest events across registrations, businesses, approvals, and inquiries
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <Tabs defaultValue="businesses" className="w-full">
            <TabsList className="grid grid-cols-5 w-full max-w-xl text-xs h-8">
              <TabsTrigger value="businesses" className="text-xs">Businesses</TabsTrigger>
              <TabsTrigger value="professionals" className="text-xs">Professionals</TabsTrigger>
              <TabsTrigger value="approvals" className="text-xs">Approvals</TabsTrigger>
              <TabsTrigger value="enquiries" className="text-xs">Enquiries</TabsTrigger>
              <TabsTrigger value="reports" className="text-xs">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="businesses" className="pt-3">
              <div className="divide-y text-xs">
                {data?.recentActivity?.businesses?.length ? (
                  data.recentActivity.businesses.map((b) => (
                    <div key={b.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-indigo-500" />
                        <div>
                          <p className="font-semibold text-foreground">{b.name}</p>
                          <p className="text-muted-foreground text-[11px]">{b.city || "Unknown City"} • {b.country_code || "IN"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {b.is_verified ? (
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Verified</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Unverified</Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-muted-foreground text-xs">No recent businesses</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="professionals" className="pt-3">
              <div className="divide-y text-xs">
                {data?.recentActivity?.professionals?.length ? (
                  data.recentActivity.professionals.map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Briefcase className="size-4 text-purple-500" />
                        <div>
                          <p className="font-semibold text-foreground">{p.name}</p>
                          <p className="text-muted-foreground text-[11px]">{p.profession_type || "Professional"} • {p.city || "Remote"}</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-muted-foreground text-xs">No recent professionals</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="approvals" className="pt-3">
              <div className="divide-y text-xs">
                {data?.recentActivity?.verificationRequests?.length ? (
                  data.recentActivity.verificationRequests.map((req, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-amber-500" />
                        <div>
                          <p className="font-semibold text-foreground">{req.name}</p>
                          <p className="text-muted-foreground text-[11px]">{req.type === "business" ? "Business Listing" : "Professional Profile"} pending review</p>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="h-6 text-[11px]">
                        <Link href={`/admin/profiles?type=${req.type}`}>Review</Link>
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-muted-foreground text-xs">No pending verification requests</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="enquiries" className="pt-3">
              <div className="divide-y text-xs">
                {data?.recentActivity?.enquiries?.length ? (
                  data.recentActivity.enquiries.map((enq) => (
                    <div key={enq.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-4 text-sky-500" />
                        <div>
                          <p className="font-semibold text-foreground">{enq.customer_name || "Customer"}</p>
                          <p className="text-muted-foreground text-[11px] line-clamp-1">{enq.message}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{enq.status || "new"}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-muted-foreground text-xs">No recent enquiries</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reports" className="pt-3">
              <div className="divide-y text-xs">
                {data?.recentActivity?.reports?.length ? (
                  data.recentActivity.reports.map((rep) => (
                    <div key={rep.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="size-4 text-rose-500" />
                        <div>
                          <p className="font-semibold text-foreground">{rep.report_reason || "Misleading Listing"}</p>
                          <p className="text-muted-foreground text-[11px]">Reported by {rep.reporter_name || "Anonymous"}</p>
                        </div>
                      </div>
                      <Badge variant="destructive" className="text-[10px]">{rep.status || "pending"}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-muted-foreground text-xs">No active reports</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

