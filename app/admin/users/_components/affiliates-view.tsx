"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import {
  Users,
  IndianRupee,
  Share2,
  TrendingUp,
  Search,
  RefreshCw,
  Gift,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  PlusCircle,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface AffiliateRecord {
  id: number;
  user_id: number;
  affiliate_code: string;
  total_referrals: number;
  total_earnings: number;
  pending_earnings: number;
  withdrawn_earnings: number;
  commission_rate: number;
  status: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_avatar?: string;
  user_role?: string;
}

interface PlatformAffiliateResponse {
  stats: {
    totalAffiliates: number;
    totalReferrals: number;
    totalEarnings: number;
    totalWithdrawn: number;
  };
  affiliates: AffiliateRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AffiliateDetailData {
  affiliate: AffiliateRecord;
  referrals: Array<{
    id: number;
    referred_user_id: number;
    referral_code: string;
    status: string;
    reward_amount: number;
    joined_at: string;
    referred_name?: string;
    referred_email?: string;
    referred_phone?: string;
    referred_avatar?: string;
    referred_role?: string;
  }>;
  earnings: Array<{
    id: number;
    source_type: string;
    amount: number;
    status: string;
    description?: string;
    created_at: string;
    referred_name?: string;
  }>;
}

export function AffiliatesView() {
  const { accessToken } = useAuthStore();
  const [data, setData] = useState<PlatformAffiliateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Detail Modal
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<AffiliateDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  // Bonus Credit Modal
  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusAffiliate, setBonusAffiliate] = useState<AffiliateRecord | null>(null);
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusDesc, setBonusDesc] = useState("");
  const [bonusSubmitting, setBonusSubmitting] = useState(false);

  const [copiedCodeId, setCopiedCodeId] = useState<number | null>(null);

  const fetchAffiliates = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/affiliates?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to load platform affiliates");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      toast.error(err?.message || "Error fetching affiliates");
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, search, statusFilter]);

  useEffect(() => {
    fetchAffiliates();
  }, [fetchAffiliates]);

  const handleViewDetail = async (affiliateId: number) => {
    setSelectedAffiliateId(affiliateId);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/affiliates?affiliateId=${affiliateId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to load affiliate details");
      const json = await res.json();
      setDetailData(json);
    } catch (err: any) {
      toast.error(err?.message || "Error loading affiliate details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreditBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bonusAffiliate || !bonusAmount || isNaN(Number(bonusAmount))) {
      toast.error("Please enter a valid bonus amount");
      return;
    }

    setBonusSubmitting(true);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "credit_bonus",
          affiliateId: bonusAffiliate.id,
          amount: Number(bonusAmount),
          description: bonusDesc.trim() || "Platform Admin Referral Bonus",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to credit bonus");
      }

      toast.success(`?${bonusAmount} bonus credited to ${bonusAffiliate.user_name || "affiliate"}`);
      setBonusOpen(false);
      setBonusAmount("");
      setBonusDesc("");
      fetchAffiliates();
    } catch (err: any) {
      toast.error(err?.message || "Bonus credit failed");
    } finally {
      setBonusSubmitting(false);
    }
  };

  const handleCopyCode = (affiliateId: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(affiliateId);
    toast.success("Affiliate Code copied");
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const stats = data?.stats || {
    totalAffiliates: 0,
    totalReferrals: 0,
    totalEarnings: 0,
    totalWithdrawn: 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 shadow-xs rounded-2xl bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Registered Affiliates
              </p>
              <p className="text-3xl font-black text-slate-900">{stats.totalAffiliates}</p>
              <p className="text-[11px] font-bold text-slate-500">Across all user roles</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-rose-50 text-[#D91B1B] flex items-center justify-center font-bold">
              <Share2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-xs rounded-2xl bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Total People Joined
              </p>
              <p className="text-3xl font-black text-slate-900">{stats.totalReferrals}</p>
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Affiliate-driven registrations
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-xs rounded-2xl bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Total Referral Rewards
              </p>
              <p className="text-3xl font-black text-slate-900">
                ?{Number(stats.totalEarnings).toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Generated commissions
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <IndianRupee className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-xs rounded-2xl bg-white">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Avg Referrals / User
              </p>
              <p className="text-3xl font-black text-slate-900">
                {stats.totalAffiliates > 0
                  ? (stats.totalReferrals / stats.totalAffiliates).toFixed(1)
                  : "0.0"}
              </p>
              <p className="text-[11px] font-bold text-purple-600 flex items-center gap-1">
                <Award className="h-3 w-3" />
                Network virality
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Gift className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table & Filter Card */}
      <Card className="border-slate-200/80 shadow-xs rounded-2xl overflow-hidden bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Gift className="h-5 w-5 text-[#D91B1B]" />
              All Registered Affiliates & Records
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Platform-wide affiliate profiles, their mobile affiliate codes, and joined member metrics
            </CardDescription>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search name, phone, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-32 rounded-xl text-xs bg-slate-50 border-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={fetchAffiliates}
              disabled={loading}
              className="h-9 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#D91B1B]" />
              Loading affiliate records...
            </div>
          ) : (data?.affiliates || []).length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No affiliate records match your search</p>
              <p className="text-xs text-slate-500">
                Registered affiliates will show up here automatically when users join the platform.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Affiliate / User</th>
                    <th className="py-3 px-4">Affiliate Code (Mobile)</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">People Joined</th>
                    <th className="py-3 px-4">Total Earnings</th>
                    <th className="py-3 px-4">Commission %</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {(data?.affiliates || []).map((aff) => (
                    <tr key={aff.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-rose-100 text-[#D91B1B] font-black text-xs flex items-center justify-center shrink-0">
                            {aff.user_name ? aff.user_name[0].toUpperCase() : "U"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{aff.user_name || "EduBird User"}</p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              {aff.user_phone || aff.user_email || `ID: ${aff.user_id}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Affiliate Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {aff.affiliate_code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(aff.id, aff.affiliate_code)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                            title="Copy Code"
                          >
                            {copiedCodeId === aff.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-[10px] font-bold capitalize bg-slate-50">
                          {aff.user_role || "User"}
                        </Badge>
                      </td>

                      {/* People Joined */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-slate-900">
                            {aff.total_referrals}
                          </span>
                          <span className="text-[11px] text-slate-500">joined</span>
                        </div>
                      </td>

                      {/* Total Earnings */}
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          ?{Number(aff.total_earnings).toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* Commission Rate */}
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {aff.commission_rate}%
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] font-bold capitalize">
                          {aff.status || "Active"}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetail(aff.id)}
                            className="h-8 rounded-xl text-[11px] font-bold border-slate-200 hover:bg-slate-100 gap-1 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View ({aff.total_referrals})
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setBonusAffiliate(aff);
                              setBonusOpen(true);
                            }}
                            className="h-8 rounded-xl text-[11px] font-bold text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 border-emerald-200 gap-1 cursor-pointer"
                          >
                            <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
                            Bonus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drill-down Dialog for Affiliate Details & Referral List */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl bg-white rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Gift className="h-5 w-5 text-[#D91B1B]" />
              Affiliate Details: {detailData?.affiliate?.user_name || "Partner"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Affiliate Code: <span className="font-mono font-bold text-slate-800">{detailData?.affiliate?.affiliate_code}</span> | Role: {detailData?.affiliate?.user_role || "Member"}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#D91B1B]" />
              Loading referral history...
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-[11px] font-extrabold uppercase text-slate-500">Total Referrals</p>
                  <p className="text-2xl font-black text-slate-900">{detailData?.referrals?.length || 0}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-center">
                  <p className="text-[11px] font-extrabold uppercase text-emerald-700">Total Earnings</p>
                  <p className="text-2xl font-black text-emerald-700">
                    ?{Number(detailData?.affiliate?.total_earnings || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 text-center">
                  <p className="text-[11px] font-extrabold uppercase text-purple-700">Commission Rate</p>
                  <p className="text-2xl font-black text-purple-700">{detailData?.affiliate?.commission_rate || 10}%</p>
                </div>
              </div>

              {/* People Joined List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  People Joined via Code ({detailData?.referrals?.length || 0})
                </h4>
                {(detailData?.referrals || []).length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl text-center">
                    No members have joined with this code yet.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="p-2.5 px-3">Name</th>
                          <th className="p-2.5 px-3">Role</th>
                          <th className="p-2.5 px-3">Date</th>
                          <th className="p-2.5 px-3">Reward Credited</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailData?.referrals.map((r) => (
                          <tr key={r.id}>
                            <td className="p-2.5 px-3 font-bold text-slate-900">
                              {r.referred_name || "User"}
                              <span className="block text-[10px] font-normal text-slate-500">{r.referred_phone || r.referred_email}</span>
                            </td>
                            <td className="p-2.5 px-3 capitalize">{r.referred_role || "Student"}</td>
                            <td className="p-2.5 px-3 text-slate-500">
                              {r.joined_at ? new Date(r.joined_at).toLocaleDateString("en-IN") : "Recent"}
                            </td>
                            <td className="p-2.5 px-3 font-bold text-emerald-600">
                              +?{Number(r.reward_amount || 50).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Earnings Ledger */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Earnings & Reward History ({detailData?.earnings?.length || 0})
                </h4>
                {(detailData?.earnings || []).length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl text-center">
                    No transaction entries recorded.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="p-2.5 px-3">Type</th>
                          <th className="p-2.5 px-3">Description</th>
                          <th className="p-2.5 px-3">Date</th>
                          <th className="p-2.5 px-3">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailData?.earnings.map((e) => (
                          <tr key={e.id}>
                            <td className="p-2.5 px-3 font-bold uppercase text-[10px] text-slate-700">
                              {e.source_type?.replace("_", " ")}
                            </td>
                            <td className="p-2.5 px-3 text-slate-800">{e.description || "Referral reward"}</td>
                            <td className="p-2.5 px-3 text-slate-500">
                              {e.created_at ? new Date(e.created_at).toLocaleDateString("en-IN") : "Recent"}
                            </td>
                            <td className="p-2.5 px-3 font-bold text-emerald-600">
                              +?{Number(e.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Credit Bonus Dialog */}
      <Dialog open={bonusOpen} onOpenChange={setBonusOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              Credit Affiliate Bonus
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Add a custom monetary bonus reward to {bonusAffiliate?.user_name || "affiliate"}&apos;s account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreditBonus} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Bonus Amount (?) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 500"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                disabled={bonusSubmitting}
                className="rounded-xl h-10 text-sm font-bold text-slate-900 bg-slate-50 border-slate-200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Reason / Description</Label>
              <Input
                type="text"
                placeholder="e.g. Top monthly performer bonus"
                value={bonusDesc}
                onChange={(e) => setBonusDesc(e.target.value)}
                disabled={bonusSubmitting}
                className="rounded-xl h-10 text-xs text-slate-900 bg-slate-50 border-slate-200"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBonusOpen(false)}
                className="rounded-xl text-xs font-bold h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={bonusSubmitting}
                className="rounded-xl text-xs font-bold h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {bonusSubmitting ? "Crediting..." : "Confirm & Credit Bonus"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
