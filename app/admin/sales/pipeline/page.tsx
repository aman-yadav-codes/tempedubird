"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  BadgeDollarSign,
  BookOpen,
  CircleDollarSign,
  Globe,
  IndianRupee,
  MoreHorizontal,
  Plus,
  Search,
  TrendingUp,
  Columns,
  LayoutGrid,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { readJsonResponse } from "@/lib/api/read-json-response";

export type SalesProgramOption = {
  id: number;
  title: string;
  duration_value?: number | null;
  duration_unit?: string | null;
  seats_available?: number | null;
  teaching_method?: string | null;
  languages?: string | null;
  categories?: string | null;
  board_name?: string | null;
  fee_components?: Array<{
    id?: number;
    title: string;
    amount: number;
    unit?: string | null;
    payment_mode?: string | null;
    discount_type?: string | null;
    discount_value?: number | null;
    final_amount?: number | null;
    installments_count?: number | null;
  }> | null;
};

type PipelineStage =
  | "new"
  | "qualified"
  | "garbage"
  | "contacted"
  | "waiting_for_response"
  | "negotiation"
  | "won"
  | "lost";

type DealRecord = {
  id: number;
  raw_id?: number;
  title: string;
  contact_name: string;
  email?: string | null;
  phone?: string | null;
  preferred_program?: string | null;
  value: number;
  stage: PipelineStage;
  probability: number;
  expected_close_date?: string | null;
  notes?: string | null;
  created_at: string;
};

const PIPELINE_STAGES: Array<{
  id: PipelineStage;
  label: string;
  color: string;
  badgeBg: string;
  borderColor: string;
  headerBg: string;
}> = [
  { id: "new", label: "New Enquiry", color: "text-sky-600 dark:text-sky-400", badgeBg: "bg-sky-50 text-sky-700 border-sky-200", borderColor: "border-sky-500", headerBg: "bg-sky-50/50" },
  { id: "qualified", label: "Qualified", color: "text-indigo-600 dark:text-indigo-400", badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200", borderColor: "border-indigo-500", headerBg: "bg-indigo-50/50" },
  { id: "garbage", label: "Garbage", color: "text-zinc-600 dark:text-zinc-400", badgeBg: "bg-zinc-50 text-zinc-700 border-zinc-200", borderColor: "border-zinc-500", headerBg: "bg-zinc-50/50" },
  { id: "contacted", label: "Contacted", color: "text-blue-600 dark:text-blue-400", badgeBg: "bg-blue-50 text-blue-700 border-blue-200", borderColor: "border-blue-500", headerBg: "bg-blue-50/50" },
  { id: "waiting_for_response", label: "Waiting for Response", color: "text-amber-600 dark:text-amber-400", badgeBg: "bg-amber-50 text-amber-700 border-amber-200", borderColor: "border-amber-500", headerBg: "bg-amber-50/50" },
  { id: "negotiation", label: "Negotiation", color: "text-purple-600 dark:text-purple-400", badgeBg: "bg-purple-50 text-purple-700 border-purple-200", borderColor: "border-purple-500", headerBg: "bg-purple-50/50" },
  { id: "won", label: "Won", color: "text-emerald-600 dark:text-emerald-400", badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200", borderColor: "border-emerald-500", headerBg: "bg-emerald-50/50" },
  { id: "lost", label: "Lost", color: "text-rose-600 dark:text-rose-400", badgeBg: "bg-rose-50 text-rose-700 border-rose-200", borderColor: "border-rose-500", headerBg: "bg-rose-50/50" },
];

const defaultProbabilities: Record<PipelineStage, number> = {
  new: 20,
  qualified: 40,
  garbage: 0,
  contacted: 40,
  waiting_for_response: 60,
  negotiation: 80,
  won: 100,
  lost: 0,
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SalesPipelinePage() {
  useAdminGuard();
  const { accessToken } = useAuthStore();

  const [deals, setDeals] = useState<DealRecord[]>([
    { id: 1, title: "Class 11 Science Admission - Amit Kumar", contact_name: "Ramesh Kumar", email: "ramesh@example.com", phone: "+91 98765 11111", value: 45000, stage: "new", probability: 20, expected_close_date: "2026-08-30", notes: "Interested in hostel facility", created_at: new Date().toISOString() },
    { id: 2, title: "School Management Inquiry - Green Valley", contact_name: "Sunita Roy", email: "sunita@greenvalley.edu", phone: "+91 98123 22222", value: 120000, stage: "qualified", probability: 40, expected_close_date: "2026-09-05", notes: "Demo scheduled for next week", created_at: new Date().toISOString() },
    { id: 3, title: "Class 12 Commerce - Vikram Malhotra", contact_name: "Vikram Malhotra", email: "vikram@example.com", phone: "+91 98456 33333", value: 50000, stage: "waiting_for_response", probability: 60, expected_close_date: "2026-08-25", notes: "Proposal sent via email", created_at: new Date().toISOString() },
    { id: 4, title: "Annual Fee Package - Sanya Gupta", contact_name: "Deepak Gupta", email: "deepak@example.com", phone: "+91 98789 44444", value: 65000, stage: "negotiation", probability: 80, expected_close_date: "2026-08-20", notes: "Requesting 5% sibling discount", created_at: new Date().toISOString() },
    { id: 5, title: "B.Tech CS Enrolment - Aniket Singh", contact_name: "Aniket Singh", email: "aniket@example.com", phone: "+91 98999 55555", value: 95000, stage: "won", probability: 100, expected_close_date: "2026-08-15", notes: "First installment paid", created_at: new Date().toISOString() },
  ]);

  const [loading, setLoading] = useState(false);

  const fetchEnquiries = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sales/enquiries?limit=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJsonResponse<{ data?: Array<{ id: number; student_name: string; phone?: string; email?: string; preferred_program?: string; source?: string; status?: string; pipeline_stage?: string; estimated_value?: number | string; notes?: string; created_at: string }>; error?: string }>(res);
      if (res.ok && json.data) {
        const enquiryDeals: DealRecord[] = json.data.map((eq) => {
          const stageMap: Record<string, PipelineStage> = {
            new: "new",
            qualified: "qualified",
            garbage: "garbage",
            contacted: "contacted",
            waiting_for_response: "waiting_for_response",
            negotiation: "negotiation",
            won: "won",
            lost: "lost",
            in_progress: "contacted",
            admission_taken: "won",
            closed: "lost",
          };
          const stage: PipelineStage = (eq.pipeline_stage as PipelineStage) || stageMap[eq.status || "new"] || "new";
          const val = Number(eq.estimated_value) || 25000;
          return {
            id: 10000 + eq.id,
            raw_id: eq.id,
            title: `${eq.preferred_program ? eq.preferred_program + " - " : "Admission Enquiry - "}${eq.student_name}`,
            contact_name: eq.student_name,
            email: eq.email || null,
            phone: eq.phone || null,
            preferred_program: eq.preferred_program || null,
            value: val,
            stage,
            probability: defaultProbabilities[stage] ?? 50,
            expected_close_date: null,
            notes: eq.notes || null,
            created_at: eq.created_at || new Date().toISOString(),
          };
        });
        setDeals(enquiryDeals);
      }
    } catch {
      // Fallback sample data
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const [programsOptions, setProgramsOptions] = useState<SalesProgramOption[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const fetchPrograms = useCallback(async () => {
    if (!accessToken) return;
    setLoadingPrograms(true);
    try {
      const res = await fetch(`/api/admin/institutions/programs?limit=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJsonResponse<{ data?: SalesProgramOption[]; error?: string }>(res);
      if (res.ok && json.data) {
        setProgramsOptions(json.data);
      }
    } catch {
      // fallback
    } finally {
      setLoadingPrograms(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const [activeTab, setActiveTab] = useState<string>("new");
  const [viewMode, setViewMode] = useState<"tabs" | "board">("board");
  const [search, setSearch] = useState("");
  const [timeframe, setTimeframe] = useState<"all" | "weekly" | "monthly" | "yearly">("all");

  // Modal dialog state for New Deal
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formProgram, setFormProgram] = useState("");
  const [formSource, setFormSource] = useState("Walk-in");
  const [formValue, setFormValue] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const selectedProgramObj = useMemo(() => {
    return programsOptions.find((p) => p.title === formProgram || String(p.id) === formProgram);
  }, [programsOptions, formProgram]);

  // Selected Deal Detail Sheet
  const [selectedDeal, setSelectedDeal] = useState<DealRecord | null>(null);

  const handleCreateDeal = async () => {
    if (!formName.trim()) {
      toast.error("Please enter applicant / student name");
      return;
    }
    if (!formPhone.trim()) {
      toast.error("Please enter contact phone number");
      return;
    }
    setSaving(true);
    try {
      if (accessToken) {
        await fetch(`/api/admin/sales/enquiries`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_name: formName,
            phone: formPhone,
            email: formEmail,
            preferred_program: formProgram,
            source: formSource,
            estimated_value: Number(formValue) || 25000,
            pipeline_stage: "new",
            notes: formNotes,
          }),
        });
      }

      const val = Number(formValue) || 25000;
      const newDeal: DealRecord = {
        id: Date.now(),
        title: `${formProgram ? formProgram + " - " : "Admission Enquiry - "}${formName}`,
        contact_name: formName,
        phone: formPhone || null,
        email: formEmail || null,
        value: val,
        stage: "new",
        probability: 20,
        notes: `Source: ${formSource}${formNotes ? ' | ' + formNotes : ''}`,
        created_at: new Date().toISOString(),
      };

      setDeals((prev) => [newDeal, ...prev]);
      toast.success("New deal added to sales pipeline!");
      setCreateOpen(false);
      setFormName("");
      setFormPhone("");
      setFormEmail("");
      setFormProgram("");
      setFormSource("Walk-in");
      setFormValue("");
      setFormNotes("");
      fetchEnquiries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record deal");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStage = async (dealId: number, nextStage: PipelineStage) => {
    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId
          ? {
              ...d,
              stage: nextStage,
              probability: nextStage === "won" ? 100 : nextStage === "lost" ? 0 : d.probability,
            }
          : d
      )
    );
    toast.success("Deal stage updated!");

    const targetDeal = deals.find((d) => d.id === dealId);
    const dbId = targetDeal?.raw_id || (dealId > 10000 ? dealId - 10000 : null);
    if (dbId && accessToken) {
      try {
        await fetch(`/api/admin/sales/enquiries/${dbId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pipeline_stage: nextStage,
          }),
        });
      } catch {
        // silent catch
      }
    }
  };

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || d.title.toLowerCase().includes(q) || d.contact_name.toLowerCase().includes(q);

      let matchesTimeframe = true;
      if (timeframe !== "all" && d.created_at) {
        const date = new Date(d.created_at);
        if (!isNaN(date.getTime())) {
          const diffMs = Date.now() - date.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (timeframe === "weekly") matchesTimeframe = diffDays <= 7;
          else if (timeframe === "monthly") matchesTimeframe = diffDays <= 30;
          else if (timeframe === "yearly") matchesTimeframe = diffDays <= 365;
        }
      }

      return matchesSearch && matchesTimeframe;
    });
  }, [deals, search, timeframe]);

  const stats = useMemo(() => {
    const totalVal = deals.reduce((acc, d) => acc + d.value, 0);
    const wonVal = deals.filter((d) => d.stage === "won").reduce((acc, d) => acc + d.value, 0);
    const activeCount = deals.filter((d) => d.stage !== "won" && d.stage !== "lost").length;
    const winRate = deals.length > 0 ? Math.round((deals.filter((d) => d.stage === "won").length / deals.length) * 100) : 0;
    return { totalVal, wonVal, activeCount, winRate };
  }, [deals]);

  const currentStageInfo = PIPELINE_STAGES.find((s) => s.id === activeTab);
  const activeTabDeals = filteredDeals.filter((d) => activeTab === "all" || d.stage === activeTab);
  const activeTabSum = activeTabDeals.reduce((sum, d) => sum + d.value, 0);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-[#D91B1B]" />
              Sales — Pipeline
            </h1>
            <p className="text-sm font-medium text-slate-500">
              Track deal stages, manage active sales pipeline, and forecast revenue conversions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCreateOpen(true)}
              className="gap-2 bg-[#D91B1B] hover:bg-[#b01414] text-white font-bold rounded-xl cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add New Deal</span>
            </Button>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pipeline Value</CardTitle>
              <IndianRupee className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">{formatCurrency(stats.totalVal)}</div>
              <p className="text-xs text-slate-500 font-medium">Across all stages</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Deals</CardTitle>
              <TrendingUp className="h-4 w-4 text-sky-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-sky-600">{stats.activeCount}</div>
              <p className="text-xs text-slate-500 font-medium">In active pipeline</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Closed Won Revenue</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-emerald-600">{formatCurrency(stats.wonVal)}</div>
              <p className="text-xs text-slate-500 font-medium">Converted revenue</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Win Conversion Rate</CardTitle>
              <BadgeDollarSign className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-amber-600">{stats.winRate}%</div>
              <p className="text-xs text-slate-500 font-medium">Closed won ratio</p>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Tabs for Pipeline Stages */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            {/* Stage Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              {PIPELINE_STAGES.map((s) => {
                const stageDealsCount = filteredDeals.filter((d) => d.stage === s.id).length;
                const stageSumVal = filteredDeals.filter((d) => d.stage === s.id).reduce((sum, d) => sum + d.value, 0);
                const isActive = activeTab === s.id && viewMode === "tabs";

                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveTab(s.id);
                      setViewMode("tabs");
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap border ${
                      isActive
                        ? "bg-white text-slate-900 border-slate-300 shadow-xs"
                        : "bg-transparent text-slate-600 hover:bg-slate-200/60 border-transparent"
                    }`}
                  >
                    <span className={s.color}>{s.label}</span>
                    <Badge variant="secondary" className="text-[10px] font-black px-1.5 py-0 bg-slate-100">
                      {stageDealsCount}
                    </Badge>
                    {stageSumVal > 0 && (
                      <span className="text-[11px] font-bold text-slate-400">
                        ({formatCurrency(stageSumVal)})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* View Mode Toggle, Timeframe Filter & Search */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <Select value={timeframe} onValueChange={(val) => setTimeframe(val as any)}>
                <SelectTrigger className="w-[145px] h-9 text-xs font-extrabold bg-white border-slate-300 rounded-xl shrink-0">
                  <Calendar className="h-3.5 w-3.5 mr-1 text-slate-500" />
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="weekly">Weekly (7 Days)</SelectItem>
                  <SelectItem value="monthly">Monthly (30 Days)</SelectItem>
                  <SelectItem value="yearly">Yearly (365 Days)</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1 md:w-56">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search deals..."
                  className="pl-9 h-9 text-xs font-semibold bg-white"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode("tabs")}
                  title="Tab View"
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "tabs" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("board")}
                  title="Kanban Board View"
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "board" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Columns className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* TAB VIEW CONTENT */}
          {viewMode === "tabs" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className={`text-base font-black ${currentStageInfo?.color || "text-slate-900"}`}>
                    {currentStageInfo?.label || "Deals"}
                  </h2>
                  <Badge variant="outline" className="text-xs font-extrabold">
                    {activeTabDeals.length} Deals ({formatCurrency(activeTabSum)})
                  </Badge>
                </div>
              </div>

              {activeTabDeals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                  <p className="text-sm font-bold text-slate-500">No deals found in this stage.</p>
                  <p className="text-xs text-slate-400 mt-1">Move a deal to this stage or record a new deal.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeTabDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="group relative flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#D91B1B] hover:shadow-md transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className="font-black text-base text-slate-900 hover:underline cursor-pointer leading-snug"
                            onClick={() => setSelectedDeal(deal)}
                          >
                            {deal.title}
                          </h3>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Move Stage</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {PIPELINE_STAGES.filter((s) => s.id !== deal.stage).map((s) => (
                                <DropdownMenuItem key={s.id} onClick={() => handleMoveStage(deal.id, s.id)}>
                                  Move to {s.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="space-y-1 text-xs text-slate-600 font-medium">
                          <p className="flex items-center gap-1.5 font-bold text-slate-800">
                            <span>Contact:</span> {deal.contact_name}
                          </p>
                          {deal.phone && (
                            <p className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span>{deal.phone}</span>
                            </p>
                          )}
                          {deal.email && (
                            <p className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span>{deal.email}</span>
                            </p>
                          )}
                        </div>

                        {deal.notes && (
                          <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                            "{deal.notes}"
                          </p>
                        )}
                      </div>

                      {/* Value & Probability */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Estimated Value</span>
                          <span className="text-lg font-black text-slate-900">{formatCurrency(deal.value)}</span>
                        </div>
                        <Badge variant="outline" className="font-extrabold text-xs px-2.5 py-1 bg-slate-50">
                          {deal.probability}% Win Prob.
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* KANBAN BOARD VIEW CONTENT - ALL 8 STAGES ALIGNED IN 1 ROW */}
          {viewMode === "board" && (
            <div className="flex gap-4 overflow-x-auto pb-4 w-full min-w-full scrollbar-thin">
              {PIPELINE_STAGES.map((stage) => {
                const stageDeals = filteredDeals.filter((d) => d.stage === stage.id);
                const stageSum = stageDeals.reduce((sum, d) => sum + d.value, 0);

                return (
                  <div key={stage.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 min-w-[250px] max-w-[270px] shrink-0">
                    <div className={`rounded-xl p-3 border ${stage.borderColor} ${stage.headerBg}`}>
                      <div className="flex items-center justify-between">
                        <h3 className={`font-extrabold text-xs ${stage.color}`}>{stage.label}</h3>
                        <Badge variant="secondary" className="text-[10px] font-bold bg-white/80">
                          {stageDeals.length}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-black text-slate-700 mt-1">{formatCurrency(stageSum)}</p>
                    </div>

                    <div className="space-y-2.5 flex-1">
                      {stageDeals.length === 0 ? (
                        <div className="p-4 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/50">
                          No deals
                        </div>
                      ) : (
                        stageDeals.map((deal) => (
                          <div
                            key={deal.id}
                            className="group relative flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-3 shadow-xs hover:border-[#D91B1B] transition-all"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <h4
                                className="font-extrabold text-xs text-slate-900 leading-snug hover:underline cursor-pointer"
                                onClick={() => setSelectedDeal(deal)}
                              >
                                {deal.title}
                              </h4>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 cursor-pointer">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuLabel className="text-[10px] font-bold text-slate-400">Move Stage</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {PIPELINE_STAGES.filter((s) => s.id !== deal.stage).map((s) => (
                                    <DropdownMenuItem key={s.id} onClick={() => handleMoveStage(deal.id, s.id)} className="text-xs font-semibold">
                                      Move to {s.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <p className="text-[11px] font-semibold text-slate-500">{deal.contact_name}</p>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                              <span className="font-black text-slate-900">{formatCurrency(deal.value)}</span>
                              <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0">
                                {deal.probability}%
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add New Deal Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#D91B1B]" />
                Add New Sales Deal
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Record a new deal or walk-in enquiry into your sales pipeline.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-3 sm:grid-cols-2 text-xs">
              <div className="space-y-1.5 sm:col-span-1">
                <label className="font-extrabold text-slate-700">Student / Applicant Name *</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <label className="font-extrabold text-slate-700">Contact Phone Number *</label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <label className="font-extrabold text-slate-700">Email Address</label>
                <Input
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="applicant@example.com"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <label className="font-extrabold text-slate-700">Preferred Program / Class</label>
                <Select
                  value={formProgram}
                  onValueChange={(val) => {
                    setFormProgram(val);
                    const p = programsOptions.find((opt) => opt.title === val || String(opt.id) === val);
                    if (p && p.fee_components && p.fee_components[0]?.amount) {
                      setFormValue(String(p.fee_components[0].amount));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingPrograms ? "Loading programs..." : "Select Program / Course"} />
                  </SelectTrigger>
                  <SelectContent>
                    {programsOptions.length > 0 ? (
                      programsOptions.map((p) => (
                        <SelectItem key={p.id} value={p.title}>
                          {p.title}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="General Enquiry">General Enquiry</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Live Program Info Preview Card in New Deal Modal */}
              {selectedProgramObj && (
                <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-[#D91B1B]" />
                      {selectedProgramObj.title}
                    </span>
                    {selectedProgramObj.teaching_method && (
                      <Badge variant="outline" className="text-[10px] font-bold bg-white">
                        🏫 {selectedProgramObj.teaching_method}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">⏱️ Duration</span>
                      <span className="font-bold text-slate-800">
                        {selectedProgramObj.duration_value ? `${selectedProgramObj.duration_value} ${selectedProgramObj.duration_unit || "Yr"}` : "Standard"}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">🪑 Available Seats</span>
                      <span className="font-bold text-slate-800">
                        {selectedProgramObj.seats_available != null ? `${selectedProgramObj.seats_available} Seats` : "Open Intake"}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">🏫 Mode</span>
                      <span className="font-bold text-slate-800 truncate block">
                        {selectedProgramObj.teaching_method || "Classroom / Offline"}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">🌐 Languages</span>
                      <span className="font-bold text-slate-800 truncate block">
                        {selectedProgramObj.languages || "English, Hindi"}
                      </span>
                    </div>
                  </div>

                  {/* Fee Structure Preview */}
                  {selectedProgramObj.fee_components && selectedProgramObj.fee_components.length > 0 && (
                    <div className="pt-1.5 border-t border-slate-200/60 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        💰 Fee Breakdown:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedProgramObj.fee_components.map((f, i) => {
                          const numAmt = Number(f.amount) || 0;
                          const numDisc = Number(f.discount_value) || 0;
                          const hasDisc = numDisc > 0;
                          const deduction = hasDisc
                            ? f.discount_type === "percentage" ? (numAmt * Math.min(100, numDisc)) / 100 : Math.min(numAmt, numDisc)
                            : 0;
                          const net = Math.max(0, numAmt - deduction);
                          return (
                            <Badge key={i} variant="secondary" className="text-[10.5px] font-semibold py-0.5 px-2 bg-white border border-slate-200">
                              <strong>{f.title || "Fee"}:</strong>&nbsp;
                              {hasDisc && <span className="line-through text-slate-400 mr-1">₹{numAmt.toLocaleString()}</span>}
                              <span className="text-[#D91B1B] font-bold">₹{net.toLocaleString()}</span>
                              <span className="text-slate-400 ml-0.5">/{f.unit || "month"}</span>
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5 sm:col-span-1">
                <label className="font-extrabold text-slate-700">Enquiry Source</label>
                <Select value={formSource} onValueChange={setFormSource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Walk-in">Walk-in</SelectItem>
                    <SelectItem value="Phone Call">Phone Call</SelectItem>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="EduBird">EduBird</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <label className="font-extrabold text-slate-700">Estimate Value (₹)</label>
                <Input
                  type="number"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder="e.g. 25000"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-extrabold text-slate-700">Enquiry Notes & Details</label>
                <Textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Enter details of what the parent/student asked..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl cursor-pointer">
                Cancel
              </Button>
              <Button onClick={handleCreateDeal} disabled={saving} className="bg-[#D91B1B] hover:bg-[#b01414] text-white font-bold rounded-xl cursor-pointer">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Deal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deal Detail Sheet */}
        <Sheet open={!!selectedDeal} onOpenChange={(o) => !o && setSelectedDeal(null)}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-base font-black text-slate-900">{selectedDeal?.title}</SheetTitle>
              <SheetDescription className="text-xs text-slate-500">Sales Pipeline Deal Overview</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4 text-xs">
              <div className="rounded-xl border border-slate-200 p-4 space-y-2.5 bg-slate-50/50">
                <p className="font-extrabold text-slate-900 text-sm">Deal Details</p>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Deal Value:</span>
                  <strong className="text-slate-900 font-extrabold">{selectedDeal ? formatCurrency(selectedDeal.value) : ""}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Stage:</span>
                  <Badge variant="outline" className="font-bold text-[10px] uppercase">
                    {selectedDeal?.stage}
                  </Badge>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Probability:</span>
                  <strong className="text-slate-900 font-bold">{selectedDeal?.probability}%</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Contact:</span>
                  <strong className="text-slate-900 font-bold">{selectedDeal?.contact_name}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-medium text-slate-800">{selectedDeal?.phone || "N/A"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-800">{selectedDeal?.email || "N/A"}</span>
                </div>
                {selectedDeal?.preferred_program && (
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Program / Class:</span>
                    <strong className="text-slate-900 font-bold">{selectedDeal.preferred_program}</strong>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Created:</span>
                  <span className="text-slate-600">{selectedDeal?.created_at ? new Date(selectedDeal.created_at).toLocaleDateString("en-IN") : "N/A"}</span>
                </div>
              </div>

              {/* Matched Program Details Card */}
              {(() => {
                const prog = programsOptions.find(
                  (p) => p.title.toLowerCase() === (selectedDeal?.preferred_program || "").toLowerCase() || String(p.id) === selectedDeal?.preferred_program
                );
                if (!prog) return null;
                return (
                  <div className="rounded-xl border border-slate-200 p-4 space-y-2.5 bg-white shadow-2xs">
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs">
                        <BookOpen className="h-4 w-4 text-[#D91B1B]" />
                        {prog.title}
                      </p>
                      {prog.teaching_method && (
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {prog.teaching_method}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">⏱️ Duration</span>
                        <span className="font-semibold">{prog.duration_value ? `${prog.duration_value} ${prog.duration_unit || "Yr"}` : "Standard"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">🪑 Seats</span>
                        <span className="font-semibold">{prog.seats_available != null ? `${prog.seats_available} Seats` : "Open"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">🏫 Mode</span>
                        <span className="font-semibold">{prog.teaching_method || "Classroom / Offline"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">🌐 Languages</span>
                        <span className="font-semibold">{prog.languages || "English, Hindi"}</span>
                      </div>
                    </div>
                    {prog.fee_components && prog.fee_components.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-100 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">💰 Fee Options:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {prog.fee_components.map((f, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] py-0.5 px-2 bg-slate-50">
                              {f.title}: <strong>₹{Number(f.amount).toLocaleString()}</strong>/{f.unit || "mo"}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {selectedDeal?.notes && (
                <div className="rounded-xl border border-slate-200 p-4 space-y-1 bg-white">
                  <p className="font-bold text-slate-900">Deal Notes</p>
                  <p className="text-slate-600 text-xs font-medium">{selectedDeal.notes}</p>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
