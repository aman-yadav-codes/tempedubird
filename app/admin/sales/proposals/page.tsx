"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  FileSignature,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Send,
  Eye,
  DollarSign,
  TrendingUp,
  Award,
  RefreshCw,
  Building,
  GraduationCap,
  XCircle,
  Share2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProgressiveSave } from "@/hooks/use-progressive-save";
import { ProgressiveSaveIndicator } from "@/components/shared/progressive-save-indicator";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";

type Proposal = {
  id: number;
  institution_id?: number | null;
  title: string;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  course_title?: string | null;
  base_amount: number;
  discount_percentage: number;
  final_amount: number;
  currency: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  valid_until?: string | null;
  notes?: string | null;
  created_by_name?: string | null;
  created_at: string;
};

export default function SalesProposalsPage() {
  const { user } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    totalValue: 0,
    acceptedCount: 0,
    acceptedValue: 0,
    pendingCount: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create Proposal Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [baseAmount, setBaseAmount] = useState("50000");
  const [discountPercentage, setDiscountPercentage] = useState("10");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Proposal["status"]>("draft");
  const [saving, setSaving] = useState(false);

  // View Proposal Preview State
  const [previewProposal, setPreviewProposal] = useState<Proposal | null>(null);

  const proposalFormState = useMemo(() => ({
    title,
    clientName,
    clientEmail,
    clientPhone,
    courseTitle,
    baseAmount,
    discountPercentage,
    validUntil,
    status,
    notes,
  }), [title, clientName, clientEmail, clientPhone, courseTitle, baseAmount, discountPercentage, validUntil, status, notes]);

  const { saveStatus: proposalSaveStatus, clearDraft: clearProposalDraft } = useProgressiveSave({
    formKey: "sales_proposal:new",
    formState: proposalFormState,
    enabled: dialogOpen,
    onRestore: (draft) => {
      if (draft.title) setTitle(draft.title);
      if (draft.clientName) setClientName(draft.clientName);
      if (draft.clientEmail) setClientEmail(draft.clientEmail);
      if (draft.clientPhone) setClientPhone(draft.clientPhone);
      if (draft.courseTitle) setCourseTitle(draft.courseTitle);
      if (draft.baseAmount) setBaseAmount(draft.baseAmount);
      if (draft.discountPercentage) setDiscountPercentage(draft.discountPercentage);
      if (draft.validUntil) setValidUntil(draft.validUntil);
      if (draft.notes) setNotes(draft.notes);
      if (draft.status) setStatus(draft.status);
    },
  });

  const resolvedInstId = activeInstitutionId || user?.memberships?.[0]?.institution_id;

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (resolvedInstId) params.set("institutionId", String(resolvedInstId));
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/sales/proposals?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProposals(data.proposals || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error("Error fetching sales proposals:", e);
    } finally {
      setLoading(false);
    }
  }, [resolvedInstId, searchQuery, statusFilter]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const computedFinalAmount =
    Number(baseAmount || 0) - (Number(baseAmount || 0) * Number(discountPercentage || 0)) / 100;

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientName.trim()) {
      toast.error("Please fill in Proposal Title and Client Name.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/sales/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution_id: resolvedInstId,
          title: title.trim(),
          client_name: clientName.trim(),
          client_email: clientEmail.trim() || null,
          client_phone: clientPhone.trim() || null,
          course_title: courseTitle.trim() || null,
          base_amount: Number(baseAmount),
          discount_percentage: Number(discountPercentage),
          final_amount: computedFinalAmount,
          valid_until: validUntil || null,
          notes: notes.trim() || null,
          status,
        }),
      });

      if (res.ok) {
        toast.success("Sales proposal created successfully!");
        setDialogOpen(false);
        resetForm();
        fetchProposals();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to create proposal");
      }
    } catch {
      toast.error("Network error while creating proposal");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setCourseTitle("");
    setBaseAmount("50000");
    setDiscountPercentage("10");
    setValidUntil("");
    setNotes("");
    setStatus("draft");
  };

  const handleUpdateStatus = async (id: number, newStatus: Proposal["status"]) => {
    try {
      const res = await fetch("/api/admin/sales/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Proposal status marked as ${newStatus.toUpperCase()}`);
        fetchProposals();
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Network error updating proposal status");
    }
  };

  const handleDeleteProposal = async (id: number) => {
    if (!confirm("Are you sure you want to delete this proposal?")) return;
    try {
      const res = await fetch(`/api/admin/sales/proposals?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Proposal deleted");
        fetchProposals();
      } else {
        toast.error("Failed to delete proposal");
      }
    } catch {
      toast.error("Failed to delete proposal");
    }
  };

  const getStatusBadge = (st: Proposal["status"]) => {
    switch (st) {
      case "accepted":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Accepted</Badge>;
      case "sent":
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Sent / In Review</Badge>;
      case "rejected":
        return <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30">Rejected</Badge>;
      case "expired":
        return <Badge className="bg-slate-500/15 text-slate-600 border-slate-500/30">Expired</Badge>;
      default:
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider mb-1.5">
            <FileSignature className="h-3.5 w-3.5" />
            <span>Sales & Commercial Quotes</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Sales Proposals & Quotes
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Create, send, and track commercial course proposals, institutional bulk admission quotes, and student contracts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchProposals} disabled={loading} className="gap-1.5 h-9">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 shadow-sm gap-1.5"
          >
            <Plus className="h-4 w-4" /> Create New Proposal
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 rounded-2xl border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase">Pipeline Proposal Value</span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            ₹{stats.totalValue.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-muted-foreground">Across {stats.totalCount} active proposals</p>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase">Accepted Value</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            ₹{stats.acceptedValue.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-emerald-600/80">{stats.acceptedCount} closed deals</p>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase">Pending Responses</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {stats.pendingCount}
          </div>
          <p className="text-[11px] text-amber-600/80">Awaiting client approval</p>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase">Win / Conversion Rate</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            {stats.conversionRate}%
          </div>
          <p className="text-[11px] text-muted-foreground">Proposals to admission win rate</p>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-muted/30 p-3 rounded-2xl border">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search proposal by title, client name, email, or course..."
            className="pl-9 bg-background h-10 text-xs rounded-xl"
          />
        </div>

        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 text-xs bg-background rounded-xl">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent / In Review</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Proposals Table */}
      <Card className="rounded-2xl border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 font-bold text-muted-foreground uppercase text-[10px]">
                <th className="p-3.5">Proposal Title & Target Program</th>
                <th className="p-3.5">Client / Organization</th>
                <th className="p-3.5 text-right">Base Amount</th>
                <th className="p-3.5 text-center">Disc. %</th>
                <th className="p-3.5 text-right">Quotation (₹)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Valid Until</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Loading sales proposals...
                  </td>
                </tr>
              ) : proposals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground space-y-3">
                    <FileSignature className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                    <p className="font-semibold text-foreground">No sales proposals found</p>
                    <p className="text-xs max-w-sm mx-auto">
                      Create commercial admission quotes, corporate sponsorship offers, or institutional discount packages.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        resetForm();
                        setDialogOpen(true);
                      }}
                      className="font-bold text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Create Proposal
                    </Button>
                  </td>
                </tr>
              ) : (
                proposals.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-foreground hover:text-primary cursor-pointer" onClick={() => setPreviewProposal(p)}>
                        {p.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <GraduationCap className="w-3 h-3 text-primary shrink-0" />
                        <span>{p.course_title || "General Admission Package"}</span>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-foreground">{p.client_name}</div>
                      {(p.client_email || p.client_phone) && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {[p.client_email, p.client_phone].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 text-right font-mono text-muted-foreground">
                      ₹{Number(p.base_amount).toLocaleString("en-IN")}
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {p.discount_percentage}%
                      </Badge>
                    </td>

                    <td className="p-3.5 text-right font-mono font-black text-foreground text-sm">
                      ₹{Number(p.final_amount).toLocaleString("en-IN")}
                    </td>

                    <td className="p-3.5 text-center">{getStatusBadge(p.status)}</td>

                    <td className="p-3.5 text-muted-foreground">
                      {p.valid_until
                        ? new Date(p.valid_until).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "No expiry"}
                    </td>

                    <td className="p-3.5 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewProposal(p)}
                        className="h-7 text-[10px] font-semibold"
                        title="View Proposal Breakdown"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                      </Button>

                      {p.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(p.id, "sent")}
                          className="h-7 text-[10px] font-semibold text-blue-600 border-blue-500/40 hover:bg-blue-50"
                        >
                          <Send className="w-3 h-3 mr-1" /> Mark Sent
                        </Button>
                      )}

                      {p.status !== "accepted" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(p.id, "accepted")}
                          className="h-7 text-[10px] font-semibold text-emerald-600 border-emerald-500/40 hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Won
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteProposal(p.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE PROPOSAL DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleCreateProposal}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-primary" /> Create Sales Proposal / Quotation
              </DialogTitle>
              <DialogDescription className="text-xs">
                Draft a commercial quote or personalized fee package for students, sponsors, or enterprise cohorts.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="space-y-1.5">
                <Label className="font-semibold">Proposal Title *</Label>
                <Input
                  required
                  placeholder="e.g. B.Tech CS Merit Scholarship Offer - 2026 Batch"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Client / Candidate / Company Name *</Label>
                  <Input
                    required
                    placeholder="e.g. Rahul Sharma or TechCorp Solutions"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold">Target Program / Course</Label>
                  <Input
                    placeholder="e.g. Master of Business Administration (MBA)"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Client Email Address</Label>
                  <Input
                    type="email"
                    placeholder="client@example.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold">Client Phone / WhatsApp</Label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/40 border">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Standard Fee (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={baseAmount}
                    onChange={(e) => setBaseAmount(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold">Discount %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold">Final Offer Quote (₹)</Label>
                  <div className="h-9 px-3 rounded-md bg-background border flex items-center font-mono font-bold text-primary">
                    ₹{computedFinalAmount.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Offer Validity Until</Label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold">Initial Status</Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent to Client</SelectItem>
                      <SelectItem value="accepted">Accepted / Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold">Deliverables, Special Terms & Notes</Label>
                <Textarea
                  rows={3}
                  placeholder="e.g. Includes semester 1 tuition, laptop bundle, hostel accommodation waiver, and certification exam vouchers..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <ProgressiveSaveIndicator status={proposalSaveStatus} />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    clearProposalDraft();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Create Proposal"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW PROPOSAL PREVIEW DIALOG */}
      <Dialog open={Boolean(previewProposal)} onOpenChange={(open) => !open && setPreviewProposal(null)}>
        <DialogContent className="sm:max-w-md">
          {previewProposal && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base font-bold">{previewProposal.title}</DialogTitle>
                  {getStatusBadge(previewProposal.status)}
                </div>
                <DialogDescription className="text-xs">
                  Proposal summary and fee structure breakdown.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 p-4 rounded-xl bg-muted/30 border text-xs">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground font-semibold">Client Name:</span>
                  <span className="font-bold text-foreground">{previewProposal.client_name}</span>
                </div>
                {previewProposal.client_email && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground font-semibold">Email:</span>
                    <span>{previewProposal.client_email}</span>
                  </div>
                )}
                {previewProposal.client_phone && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground font-semibold">Phone:</span>
                    <span>{previewProposal.client_phone}</span>
                  </div>
                )}
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground font-semibold">Course:</span>
                  <span className="font-bold">{previewProposal.course_title || "General"}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground font-semibold">Standard Tuition Fee:</span>
                  <span className="line-through text-muted-foreground font-mono">
                    ₹{Number(previewProposal.base_amount).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2 text-emerald-600 font-semibold">
                  <span>Special Discount Offered:</span>
                  <span>{previewProposal.discount_percentage}% OFF</span>
                </div>
                <div className="flex justify-between items-center pt-1 text-sm">
                  <span className="font-black text-foreground">Total Quoted Amount:</span>
                  <span className="font-mono font-black text-primary text-base">
                    ₹{Number(previewProposal.final_amount).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {previewProposal.notes && (
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-foreground">Terms & Deliverables:</span>
                  <p className="p-3 rounded-lg bg-muted/20 border text-muted-foreground leading-relaxed">
                    {previewProposal.notes}
                  </p>
                </div>
              )}

              <DialogFooter className="flex-row sm:justify-between items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Proposal: ${previewProposal.title}\nClient: ${previewProposal.client_name}\nQuoted Fee: ₹${Number(previewProposal.final_amount).toLocaleString("en-IN")}`
                    );
                    toast.success("Proposal summary copied to clipboard!");
                  }}
                  className="gap-1 text-xs"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Summary
                </Button>
                <Button type="button" size="sm" onClick={() => setPreviewProposal(null)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
