"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import {
  Share2,
  Copy,
  Check,
  Users,
  IndianRupee,
  Gift,
  TrendingUp,
  Sparkles,
  QrCode,
  ExternalLink,
  MessageCircle,
  Send,
  Mail,
  ShieldCheck,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Info,
  ChevronRight,
  Award,
  BadgePercent,
  Search,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AffiliateData {
  affiliate: {
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
  };
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

export default function AffiliatePage() {
  const { user, accessToken } = useAuthStore();
  const [data, setData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [qrOpen, setQrOpen] = useState(false);

  const fetchAffiliateData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/affiliate/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to load affiliate data");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load affiliate dashboard");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchAffiliateData();
  }, [fetchAffiliateData]);

  const affiliateCode = data?.affiliate?.affiliate_code || user?.phone || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://edubird.in";
  const referralLink = `${origin}/?ref=${encodeURIComponent(affiliateCode)}`;

  const handleCopyCode = () => {
    if (!affiliateCode) return;
    navigator.clipboard.writeText(affiliateCode);
    setCopiedCode(true);
    toast.success("Affiliate Code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast.success("Referral Link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareText = `Join EduBird to prepare for competitive exams, study materials & online courses! Use my Referral / Affiliate Code: ${affiliateCode} or click: ${referralLink}`;

  const handleShareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const handleShareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const handleShareEmail = () => {
    window.open(`mailto:?subject=Join EduBird with my referral code&body=${encodeURIComponent(shareText)}`, "_blank");
  };

  const filteredReferrals = (data?.referrals || []).filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.referred_name && r.referred_name.toLowerCase().includes(term)) ||
      (r.referred_email && r.referred_email.toLowerCase().includes(term)) ||
      (r.referred_phone && r.referred_phone.includes(term)) ||
      (r.referred_role && r.referred_role.toLowerCase().includes(term))
    );
  });

  const totalReferrals = data?.affiliate?.total_referrals || (data?.referrals?.length || 0);
  const totalEarnings = data?.affiliate?.total_earnings || 0;
  const pendingEarnings = data?.affiliate?.pending_earnings || 0;
  const commissionRate = data?.affiliate?.commission_rate || 10;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="h-3.5 w-3.5 text-rose-400" />
              EduBird Partner & Affiliate Program
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              Share, Refer & <span className="text-rose-400">Earn Together</span>
            </h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl font-medium leading-relaxed">
              Every member is an affiliate! Share your unique affiliate code (your mobile number) with students, guardians, and educators. Earn ?50 bonus on every join plus up to {commissionRate}% commission on courses.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={fetchAffiliateData}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl h-10 text-xs font-bold gap-2 cursor-pointer backdrop-blur-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#D91B1B] hover:bg-[#b01414] text-white rounded-xl h-10 text-xs font-bold shadow-lg shadow-rose-900/40 gap-2 cursor-pointer">
                  <QrCode className="h-4 w-4" />
                  Show QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white rounded-2xl">
                <DialogHeader className="text-center">
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    Scan to Join with Affiliate Code
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Anyone who scans this QR code will register directly with your affiliate code prefilled.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-6 space-y-4">
                  <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-inner flex items-center justify-center">
                    {/* QR Placeholder representation with clean SVG */}
                    <div className="w-48 h-48 bg-slate-900 p-2 rounded-xl flex flex-col items-center justify-center text-white text-center space-y-2">
                      <QrCode className="h-28 w-28 text-rose-400 animate-pulse" />
                      <span className="text-[11px] font-mono font-bold tracking-wider">{affiliateCode}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-extrabold text-slate-800">Your Affiliate Code</p>
                    <p className="text-lg font-black text-[#D91B1B] font-mono">{affiliateCode}</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Affiliate Code & Referral Link Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-rose-100 text-[#D91B1B] flex items-center justify-center font-bold">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Your Affiliate Code & Link</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Your mobile number is your permanent referral & affiliate code
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold text-[10px] px-2.5 py-0.5">
                Active Partner
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Affiliate Code Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Affiliate Code (Mobile Number)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200">
                  <span className="text-base font-black tracking-wider text-slate-900 font-mono">
                    {affiliateCode || "Loading..."}
                  </span>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                    10-Digit Mobile Code
                  </span>
                </div>
                <Button
                  onClick={handleCopyCode}
                  className="rounded-xl h-11 px-4 bg-[#D91B1B] hover:bg-[#b01414] text-white font-bold text-xs gap-1.5 cursor-pointer shadow-sm"
                >
                  {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedCode ? "Copied" : "Copy Code"}
                </Button>
              </div>
            </div>

            {/* Direct Referral Link Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Direct Shareable Referral URL
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 truncate px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 font-mono">
                  {referralLink}
                </div>
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="rounded-xl h-11 px-4 border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs gap-1.5 cursor-pointer"
                >
                  {copiedLink ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
                  {copiedLink ? "Link Copied" : "Copy Link"}
                </Button>
              </div>
            </div>

            {/* Quick Social Share Buttons */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-500 mb-2.5">Share directly on social platforms:</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  onClick={handleShareWhatsApp}
                  className="rounded-xl h-9 text-xs font-bold text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/80 border-emerald-200 gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShareTelegram}
                  className="rounded-xl h-9 text-xs font-bold text-sky-700 bg-sky-50/50 hover:bg-sky-100/80 border-sky-200 gap-1.5 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5 text-sky-600" />
                  Telegram
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShareEmail}
                  className="rounded-xl h-9 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200 gap-1.5 cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5 text-slate-600" />
                  Email
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Affiliate Reward Breakdown Card */}
        <Card className="lg:col-span-5 border-slate-200/80 shadow-sm rounded-2xl bg-gradient-to-br from-rose-50/60 via-amber-50/40 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="h-5 w-5 text-[#D91B1B]" />
                How You Earn
              </CardTitle>
              <span className="text-xs font-extrabold text-[#D91B1B] bg-rose-100/70 px-2 py-0.5 rounded-md">
                Tier 1 Affiliate
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-2 space-y-3.5 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/80 border border-rose-100 shadow-2xs">
              <div className="h-7 w-7 rounded-lg bg-rose-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                1
              </div>
              <div>
                <p className="font-bold text-slate-900">?50 Instant Join Bonus</p>
                <p className="text-slate-500 text-[11px] leading-snug">
                  Earn ?50 reward credited instantly when a student, guardian, or institution signs up with your mobile number.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/80 border border-amber-100 shadow-2xs">
              <div className="h-7 w-7 rounded-lg bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                2
              </div>
              <div>
                <p className="font-bold text-slate-900">{commissionRate}% Course Commission</p>
                <p className="text-slate-500 text-[11px] leading-snug">
                  Earn up to {commissionRate}% recurring commission whenever your referred students enroll in premium courses & packages.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/80 border border-emerald-100 shadow-2xs">
              <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                3
              </div>
              <div>
                <p className="font-bold text-slate-900">Direct Bank & UPI Payouts</p>
                <p className="text-slate-500 text-[11px] leading-snug">
                  Withdraw your accrued earnings seamlessly via UPI or Bank Transfer once reaching minimum balance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: People Joined */}
        <Card className="border-slate-200/80 shadow-sm rounded-2xl bg-white hover:border-slate-300 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">People Joined</p>
              <p className="text-3xl font-black text-slate-900">{totalReferrals}</p>
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Joined via your code
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-rose-50 text-[#D91B1B] flex items-center justify-center font-bold">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Earnings */}
        <Card className="border-slate-200/80 shadow-sm rounded-2xl bg-white hover:border-slate-300 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Total Earnings</p>
              <p className="text-3xl font-black text-slate-900">?{Number(totalEarnings).toLocaleString("en-IN")}</p>
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Accrued commissions
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <IndianRupee className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Pending Earnings */}
        <Card className="border-slate-200/80 shadow-sm rounded-2xl bg-white hover:border-slate-300 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Pending Clearance</p>
              <p className="text-3xl font-black text-slate-900">?{Number(pendingEarnings).toLocaleString("en-IN")}</p>
              <p className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Processing payouts
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Commission Rate */}
        <Card className="border-slate-200/80 shadow-sm rounded-2xl bg-white hover:border-slate-300 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Commission Rate</p>
              <p className="text-3xl font-black text-slate-900">{commissionRate}%</p>
              <p className="text-[11px] font-bold text-purple-600 flex items-center gap-1">
                <BadgePercent className="h-3 w-3" />
                Per course conversion
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <BadgePercent className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section: People Joined vs Earnings History */}
      <Tabs defaultValue="referrals" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-10">
            <TabsTrigger
              value="referrals"
              className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs px-4"
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              People Joined ({totalReferrals})
            </TabsTrigger>
            <TabsTrigger
              value="earnings"
              className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs px-4"
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
              Earnings History ({data?.earnings?.length || 0})
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search referrals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200"
            />
          </div>
        </div>

        {/* Tab 1: People Joined Table */}
        <TabsContent value="referrals">
          <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                People Joined Using Your Code
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                List of all members and students who registered using your mobile affiliate code
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredReferrals.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Users className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No referrals found yet</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Share your code <span className="font-mono font-bold text-slate-800">{affiliateCode}</span> with your friends & students to start earning rewards!
                  </p>
                  <Button
                    onClick={handleCopyLink}
                    className="bg-[#D91B1B] hover:bg-[#b01414] text-white rounded-xl text-xs font-bold h-9 px-4 gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Copy & Share Link
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Member Name</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Joined Date</th>
                        <th className="py-3 px-4">Affiliate Code Used</th>
                        <th className="py-3 px-4">Reward Earned</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {filteredReferrals.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-rose-100 text-[#D91B1B] font-bold text-xs flex items-center justify-center shrink-0">
                                {item.referred_name ? item.referred_name[0].toUpperCase() : "U"}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{item.referred_name || "New Member"}</p>
                                <p className="text-[11px] text-slate-500">
                                  {item.referred_phone ? item.referred_phone.slice(0, 3) + "****" + item.referred_phone.slice(-3) : item.referred_email || "Registered User"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="outline" className="text-[10px] font-bold capitalize bg-slate-50">
                              {item.referred_role || "Student"}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {item.joined_at ? new Date(item.joined_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }) : "Recent"}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            {item.referral_code}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              +?{Number(item.reward_amount || 50).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] font-bold capitalize">
                              {item.status || "Active"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Earnings History Table */}
        <TabsContent value="earnings">
          <Card className="border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Earnings & Commission Ledger
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Detailed transaction log of all referral rewards and course commission credits
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {(data?.earnings || []).length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No earnings recorded yet</p>
                  <p className="text-xs text-slate-500">
                    Your commissions and referral join bonuses will be listed here automatically.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Transaction ID</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {(data?.earnings || []).map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                            #TXN-{entry.id}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="outline" className="text-[10px] font-bold capitalize">
                              {entry.source_type?.replace("_", " ") || "Referral"}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-slate-800">
                            {entry.description || "Referral signup reward"}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {entry.created_at ? new Date(entry.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }) : "Recent"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-emerald-600">
                              +?{Number(entry.amount).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] font-bold capitalize">
                              {entry.status || "Completed"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
