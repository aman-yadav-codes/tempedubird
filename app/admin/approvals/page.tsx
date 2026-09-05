"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  FileText,
  StickyNote,
  GraduationCap,
  Sparkles,
  BookOpen,
  Eye,
  Building2,
  User,
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowUpDown,
  Filter,
  ShieldCheck,
  Check,
  X,
  Loader2,
  DollarSign,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { formatIndianDate } from "@/lib/format-time";

type ApprovalItem = {
  item_type: "assignment" | "note" | "practice_exam" | "exam" | "teacher";
  id: number;
  title: string;
  description: string;
  is_public: boolean;
  marketplace_requested: boolean;
  marketplace_requested_at: string | null;
  marketplace_requested_by: number | null;
  requester_name: string | null;
  requester_email: string | null;
  marketplace_approved: boolean;
  marketplace_approved_at: string | null;
  approver_name: string | null;
  marketplace_rejection_reason: string | null;
  marketplace_rejected_at: string | null;
  is_paid: boolean;
  price: number;
  total_marks: number;
  items_count: number;
  institution_name: string;
  institution_id: number | null;
  author_name: string;
  author_email: string;
  author_id: number;
  created_at: string;
  updated_at: string;
};

type SummaryCounts = {
  assignments: { pending: number; approved: number; declined: number };
  notes: { pending: number; approved: number; declined: number };
  practice_exams: { pending: number; approved: number; declined: number };
  exams: { pending: number; approved: number; declined: number };
  teachers: { pending: number; approved: number; declined: number };
  total_pending: number;
};

const TYPE_CONFIG = {
  assignment: {
    label: "Assignment",
    plural: "Assignments",
    icon: FileText,
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  note: {
    label: "Notes",
    plural: "Notes",
    icon: StickyNote,
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  practice_exam: {
    label: "Practice Exam",
    plural: "Practice Exams",
    icon: GraduationCap,
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  exam: {
    label: "Exam Paper",
    plural: "Exams",
    icon: BookOpen,
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  teacher: {
    label: "Teacher / Faculty",
    plural: "Teachers",
    icon: User,
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
};

export default function ApprovalsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const isPlatformAdmin = isPlatformAdminUser(user);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [counts, setCounts] = useState<SummaryCounts>({
    assignments: { pending: 0, approved: 0, declined: 0 },
    notes: { pending: 0, approved: 0, declined: 0 },
    practice_exams: { pending: 0, approved: 0, declined: 0 },
    exams: { pending: 0, approved: 0, declined: 0 },
    teachers: { pending: 0, approved: 0, declined: 0 },
    total_pending: 0,
  });

  const [activeType, setActiveType] = useState<string>("all");
  const [activeStatus, setActiveStatus] = useState<string>("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [declineItem, setDeclineItem] = useState<ApprovalItem | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [previewItem, setPreviewItem] = useState<ApprovalItem | null>(null);

  const authHeaders = useCallback(() => {
    return {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  }, [accessToken]);

  const fetchApprovals = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: activeType,
        status: activeStatus,
        search,
        page: String(page),
        limit: "20",
      });

      const res = await fetch(`/api/admin/approvals?${params.toString()}`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load requests");

      setItems(json.data || []);
      if (json.counts) setCounts(json.counts);
      setPageCount(json.pageCount || 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeType, activeStatus, search, page, authHeaders]);

  useEffect(() => {
    if (isReady && isPlatformAdmin) {
      fetchApprovals();
    }
  }, [isReady, isPlatformAdmin, fetchApprovals]);

  const handleAction = async (
    item: ApprovalItem,
    action: "allow" | "decline",
    reason?: string
  ) => {
    if (!accessToken) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/approvals/action", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          itemType: item.item_type,
          itemId: item.id,
          action,
          reason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed to ${action} item`);

      if (action === "allow") {
        toast.success(`"${item.title}" approved! Author has been notified.`);
      } else {
        toast.info(`"${item.title}" declined. Author has been notified.`);
      }

      setDeclineItem(null);
      setDeclineReason("");
      fetchApprovals();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (!isPlatformAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-3">
        <AlertCircle className="size-12 text-destructive" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          The Content & Teacher Approvals Hub is reserved for Platform Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Approvals & Moderation Hub</h1>
            {counts.total_pending > 0 && (
              <Badge variant="destructive" className="animate-pulse px-2 py-0.5 text-xs font-bold">
                {counts.total_pending} Pending
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Review and allow or decline marketplace requests for assignments, notes, practice exams, exams, and teachers with automated author notifications.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchApprovals()}
          disabled={loading}
          className="gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card
          onClick={() => {
            setActiveType("all");
            setPage(1);
          }}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeType === "all" ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03]" : ""
          }`}
        >
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">All Requests</span>
              <Layers className="size-4 text-primary" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{counts.total_pending}</span>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">pending action</p>
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => {
            setActiveType("assignment");
            setPage(1);
          }}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeType === "assignment" ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03]" : ""
          }`}
        >
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Assignments</span>
              <FileText className="size-4 text-blue-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{counts.assignments.pending}</span>
              <p className="text-[11px] text-muted-foreground">{counts.assignments.approved} approved</p>
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => {
            setActiveType("note");
            setPage(1);
          }}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeType === "note" ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03]" : ""
          }`}
        >
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Notes</span>
              <StickyNote className="size-4 text-amber-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{counts.notes.pending}</span>
              <p className="text-[11px] text-muted-foreground">{counts.notes.approved} approved</p>
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => {
            setActiveType("practice_exam");
            setPage(1);
          }}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeType === "practice_exam" ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03]" : ""
          }`}
        >
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Practice</span>
              <GraduationCap className="size-4 text-emerald-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{counts.practice_exams.pending}</span>
              <p className="text-[11px] text-muted-foreground">{counts.practice_exams.approved} approved</p>
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => {
            setActiveType("exam");
            setPage(1);
          }}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeType === "exam" ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03]" : ""
          }`}
        >
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Exams</span>
              <BookOpen className="size-4 text-purple-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{counts.exams.pending}</span>
              <p className="text-[11px] text-muted-foreground">{counts.exams.approved} approved</p>
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => {
            setActiveType("teacher");
            setPage(1);
          }}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeType === "teacher" ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03]" : ""
          }`}
        >
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Teachers</span>
              <User className="size-4 text-rose-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{counts.teachers.pending}</span>
              <p className="text-[11px] text-muted-foreground">{counts.teachers.approved} verified</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-muted/30 p-3 rounded-2xl border border-border/70">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={activeStatus === "pending" ? "default" : "outline"}
            onClick={() => {
              setActiveStatus("pending");
              setPage(1);
            }}
            className="text-xs h-8"
          >
            <Clock className="size-3.5 mr-1" />
            Pending Requests
          </Button>

          <Button
            size="sm"
            variant={activeStatus === "approved" ? "default" : "outline"}
            onClick={() => {
              setActiveStatus("approved");
              setPage(1);
            }}
            className="text-xs h-8"
          >
            <CheckCircle2 className="size-3.5 mr-1 text-emerald-500" />
            Allowed / Live
          </Button>

          <Button
            size="sm"
            variant={activeStatus === "declined" ? "default" : "outline"}
            onClick={() => {
              setActiveStatus("declined");
              setPage(1);
            }}
            className="text-xs h-8"
          >
            <XCircle className="size-3.5 mr-1 text-destructive" />
            Declined
          </Button>

          <Button
            size="sm"
            variant={activeStatus === "all" ? "default" : "outline"}
            onClick={() => {
              setActiveStatus("all");
              setPage(1);
            }}
            className="text-xs h-8"
          >
            All History
          </Button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search title, institution, author..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Main Content List / Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm">Fetching requested content and teacher submissions...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-2xl text-center p-6 space-y-3 bg-muted/10">
          <ShieldCheck className="size-12 text-muted-foreground/50" />
          <h3 className="text-base font-semibold">No requests found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {activeStatus === "pending"
              ? "All submitted content and teacher profiles are up to date. There are no pending requests waiting for your review."
              : "No items match your filter criteria."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const config = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.assignment;
            const IconComponent = config.icon;
            const isApproved = item.marketplace_approved;
            const isDeclined = Boolean(item.marketplace_rejected_at && !item.marketplace_approved);

            return (
              <div
                key={`${item.item_type}-${item.id}`}
                className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/40 transition-all gap-4 shadow-2xs"
              >
                {/* Left: Info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className={`p-2.5 rounded-xl shrink-0 ${config.badgeColor} border`}>
                    <IconComponent className="size-5" />
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] font-bold ${config.badgeColor}`}>
                        {config.label}
                      </Badge>

                      <h3 className="text-sm font-bold text-foreground truncate max-w-md">
                        {item.title}
                      </h3>

                      {isApproved ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold gap-1">
                          <CheckCircle2 className="size-3" /> Live on Marketplace
                        </Badge>
                      ) : isDeclined ? (
                        <Badge variant="destructive" className="text-[10px] font-semibold gap-1">
                          <XCircle className="size-3" /> Declined
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-semibold gap-1 animate-pulse">
                          <Clock className="size-3" /> Pending Review
                        </Badge>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3.5 text-primary/70" />
                        <span className="font-medium text-foreground">{item.institution_name}</span>
                      </span>

                      <span>•</span>

                      <span className="flex items-center gap-1">
                        <User className="size-3.5 text-muted-foreground" />
                        <span>Author: <strong className="text-foreground">{item.author_name || item.requester_name}</strong></span>
                      </span>

                      <span>•</span>

                      <span>
                        Requested: {formatIndianDate(item.marketplace_requested_at || item.created_at)}
                      </span>

                      {item.is_paid && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            ₹{item.price}
                          </span>
                        </>
                      )}

                      {item.items_count > 0 && (
                        <>
                          <span>•</span>
                          <span className="font-medium">
                            {item.items_count} {item.item_type === "teacher" ? "Subjects" : item.item_type === "note" ? "Files" : "Questions"}
                          </span>
                        </>
                      )}
                    </div>

                    {isDeclined && item.marketplace_rejection_reason && (
                      <div className="mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-1.5">
                        <AlertCircle className="size-4 shrink-0 mt-0.5" />
                        <div>
                          <strong>Reason for decline:</strong> {item.marketplace_rejection_reason}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewItem(item)}
                    className="h-8 text-xs gap-1"
                  >
                    <Eye className="size-3.5" />
                    Preview
                  </Button>

                  {!isApproved && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAction(item, "allow")}
                      disabled={actionLoading}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 shadow-xs"
                    >
                      <Check className="size-3.5" />
                      Allow & Publish
                    </Button>
                  )}

                  {!isDeclined && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDeclineItem(item);
                        setDeclineReason("");
                      }}
                      disabled={actionLoading}
                      className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 gap-1"
                    >
                      <X className="size-3.5" />
                      Decline
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decline Feedback Modal */}
      <Dialog open={Boolean(declineItem)} onOpenChange={(open) => !open && setDeclineItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="size-5" />
              Decline Marketplace Request
            </DialogTitle>
            <DialogDescription>
              Provide feedback or a reason for declining <strong>{declineItem?.title}</strong>. The author ({declineItem?.author_name || declineItem?.requester_name}) will be immediately notified with this explanation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="declineReason" className="text-xs font-semibold">
              Reason / Feedback for Author *
            </Label>
            <Textarea
              id="declineReason"
              placeholder="e.g. Please update question 4 with complete answer keys, or add higher quality cover image..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={4}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeclineItem(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => declineItem && handleAction(declineItem, "decline", declineReason)}
              disabled={actionLoading || !declineReason.trim()}
              className="gap-1 font-semibold"
            >
              {actionLoading && <Loader2 className="size-3.5 animate-spin" />}
              Confirm Decline & Notify Author
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={Boolean(previewItem)} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-5 text-primary" />
              Content Submission Details
            </DialogTitle>
          </DialogHeader>

          {previewItem && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={TYPE_CONFIG[previewItem.item_type]?.badgeColor}>
                    {TYPE_CONFIG[previewItem.item_type]?.label}
                  </Badge>
                  <span className="text-muted-foreground font-mono">
                    ID #{previewItem.id}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-foreground">{previewItem.title}</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{previewItem.description || "No description provided."}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border bg-card space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Institution</span>
                  <p className="font-semibold text-foreground">{previewItem.institution_name}</p>
                </div>

                <div className="p-3 rounded-xl border bg-card space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Author / Submitter</span>
                  <p className="font-semibold text-foreground">{previewItem.author_name || previewItem.requester_name}</p>
                  <p className="text-[11px] text-muted-foreground">{previewItem.author_email || previewItem.requester_email}</p>
                </div>

                <div className="p-3 rounded-xl border bg-card space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Pricing & Access</span>
                  <p className="font-semibold text-foreground">
                    {previewItem.is_paid ? `Paid • ₹${previewItem.price}` : "Free for Everyone"}
                  </p>
                </div>

                <div className="p-3 rounded-xl border bg-card space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Submission Date</span>
                  <p className="font-semibold text-foreground">
                    {formatIndianDate(previewItem.marketplace_requested_at || previewItem.created_at)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewItem(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
