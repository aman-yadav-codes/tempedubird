"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IndianRupee,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Printer,
  Trash2,
  Bus,
  GraduationCap,
  Calendar,
  CreditCard,
  Banknote,
  Landmark,
  Smartphone,
  FileText,
  Search,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatIndianDate } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import type { Student } from "../columns";

export type StudentFeeDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  accessToken: string | null;
  institutionId?: number | null;
  academicYearId?: number | null;
  onFeeUpdated?: () => void;
};

type FeePaymentItem = {
  id: number;
  student_user_id: number;
  enrollment_id: number;
  academic_year_id?: number | null;
  fee_title: string;
  subtotal_amount: number;
  discount_percent: number;
  discount_amount: number;
  late_fee_amount: number;
  total_amount: number;
  payment_method: string;
  transaction_id?: string | null;
  remarks?: string | null;
  status: "paid" | "verified" | "approved" | "pending" | "rejected";
  due_date?: string | null;
  received_at?: string | null;
  created_at: string;
  academic_year_name?: string | null;
  received_by_name?: string | null;
};

type EnrollmentFeeData = {
  id: number;
  program_id?: number;
  program_name?: string | null;
  section_id?: number;
  section_name?: string | null;
  academic_year_id?: number;
  academic_year_name?: string | null;
  roll_number?: string | null;
  status?: string | null;
  admission_date?: string | null;
  course_fee: number;
  has_transport: boolean;
  transport_fee: number;
  transport_zone?: string | null;
  pickup_address?: string | null;
  total_fee: number;
  institution_name?: string | null;
};

export type InstallmentItem = {
  installment_number: number;
  title: string;
  due_date: string;
  due_date_formatted: string;
  course_fee: number;
  transport_fee: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  status: "paid" | "partial" | "pending";
  is_overdue: boolean;
  days_status: string;
};

type FeeDetailsResponse = {
  student: {
    id: number;
    full_name: string;
    email: string;
    phone?: string | null;
    admission_number?: string | null;
  };
  active_enrollment?: EnrollmentFeeData | null;
  enrollments: EnrollmentFeeData[];
  summary: {
    course_fee: number;
    transport_fee: number;
    has_transport: boolean;
    transport_zone?: string | null;
    pickup_address?: string | null;
    total_fee: number;
    total_paid: number;
    total_pending: number;
    payment_status: "paid" | "partial" | "pending";
    paid_count: number;
    pending_count: number;
    pending_scheduled_amount: number;
    batch_name?: string | null;
    program_name?: string | null;
    payment_plan?: string | null;
    payment_plan_label?: string | null;
    installment_amount?: number | null;
    installments_count?: number | null;
    next_due_date?: string | null;
    next_due_formatted?: string | null;
    next_due_amount?: number | null;
    next_due_title?: string | null;
  };
  installments?: InstallmentItem[];
  history: FeePaymentItem[];
  pending_dues: FeePaymentItem[];
};

export function StudentFeeDetailsDialog({
  open,
  onOpenChange,
  student,
  accessToken,
  institutionId,
  academicYearId,
  onFeeUpdated,
}: StudentFeeDetailsDialogProps) {
  const [data, setData] = useState<FeeDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "breakdown" | "collect">("history");
  const [searchFilter, setSearchFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  // Collect / Record Payment Form state
  const [collectFeeTitle, setCollectFeeTitle] = useState("Tuition Fee Installment");
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMethod, setCollectMethod] = useState("cash");
  const [collectTxId, setCollectTxId] = useState("");
  const [collectStatus, setCollectStatus] = useState<"paid" | "pending">("paid");
  const [collectDueDate, setCollectDueDate] = useState("");
  const [collectRemarks, setCollectRemarks] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  // Receipt Modal State
  const [receiptItem, setReceiptItem] = useState<FeePaymentItem | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const fetchFeeDetails = useCallback(async () => {
    if (!student?.id || !accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${student.id}/fees`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load fee details");
      setData(json.data);

      // Pre-fill collect amount and due date from next upcoming due if available
      const nextDue = json.data?.installments?.find((s: InstallmentItem) => s.status !== "paid");
      if (nextDue) {
        setCollectFeeTitle(nextDue.title);
        setCollectAmount(String(nextDue.pending_amount > 0 ? nextDue.pending_amount : nextDue.total_amount));
        setCollectDueDate(nextDue.due_date || "");
      } else if (json.data?.summary?.total_pending > 0) {
        setCollectAmount(String(json.data.summary.total_pending));
      }
    } catch (err: any) {
      console.error("Error loading fee details:", err);
      toast.error(err.message || "Failed to load fee details");
    } finally {
      setLoading(false);
    }
  }, [student?.id, accessToken]);

  const handleChangePlan = async (newPlan: string) => {
    if (!student?.id || !accessToken) return;
    setUpdatingPlan(true);
    try {
      let planTitle = "Quarterly Plan";
      if (newPlan === "monthly") planTitle = "Monthly Plan";
      if (newPlan === "semester") planTitle = "Semester Plan";
      if (newPlan === "yearly") planTitle = "Yearly / Annual Plan";
      if (newPlan === "one_time") planTitle = "One-Time Payment";

      const res = await fetch(`/api/admin/students/${student.id}/fees`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentPlan: newPlan,
          paymentPlanTitle: planTitle,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update fee plan");

      toast.success(`Switched fee plan to ${planTitle}. Installments & due dates recalculated!`);
      await fetchFeeDetails();
      onFeeUpdated?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to change fee plan");
    } finally {
      setUpdatingPlan(false);
    }
  };

  const handleSelectDueToCollect = (inst: InstallmentItem) => {
    setCollectFeeTitle(inst.title);
    setCollectAmount(String(inst.pending_amount > 0 ? inst.pending_amount : inst.total_amount));
    setCollectDueDate(inst.due_date || "");
    setActiveTab("collect");
  };

  useEffect(() => {
    if (open && student?.id) {
      void fetchFeeDetails();
      setActiveTab("history");
      setSearchFilter("");
      setMethodFilter("all");
      setCollectRemarks("");
      setCollectTxId("");
    } else {
      setData(null);
    }
  }, [open, student?.id, fetchFeeDetails]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Number(collectAmount);
    if (!student?.id || !accessToken || Number.isNaN(numAmt) || numAmt <= 0) {
      toast.error("Please enter a valid amount greater than 0.");
      return;
    }

    setSavingPayment(true);
    try {
      const res = await fetch(`/api/admin/students/${student.id}/fees`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enrollmentId: data?.active_enrollment?.id,
          feeTitle: collectFeeTitle,
          amount: numAmt,
          paymentMethod: collectMethod,
          transactionId: collectTxId || null,
          status: collectStatus,
          dueDate: collectDueDate || null,
          remarks: collectRemarks || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record payment");

      toast.success(
        collectStatus === "paid"
          ? `Recorded payment of ₹${numAmt.toLocaleString("en-IN")} successfully!`
          : `Created pending fee entry of ₹${numAmt.toLocaleString("en-IN")}.`
      );

      // Reset form
      setCollectTxId("");
      setCollectRemarks("");
      setCollectDueDate("");

      // Refresh data
      await fetchFeeDetails();
      onFeeUpdated?.();
      setActiveTab("history");
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!student?.id || !accessToken) return;
    if (!window.confirm("Are you sure you want to delete this payment record? This will adjust the student's pending balance.")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/students/${student.id}/fees?paymentId=${paymentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete payment");

      toast.success("Payment record deleted.");
      await fetchFeeDetails();
      onFeeUpdated?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete payment");
    }
  };

  const handlePrintReceipt = (item: FeePaymentItem) => {
    setReceiptItem(item);
    setReceiptOpen(true);
  };

  const filteredHistory = useMemo(() => {
    if (!data?.history) return [];
    return data.history.filter((item) => {
      const matchesSearch =
        !searchFilter ||
        item.fee_title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (item.transaction_id && item.transaction_id.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (item.remarks && item.remarks.toLowerCase().includes(searchFilter.toLowerCase()));

      const matchesMethod =
        methodFilter === "all" ||
        item.payment_method.toLowerCase() === methodFilter.toLowerCase();

      return matchesSearch && matchesMethod;
    });
  }, [data?.history, searchFilter, methodFilter]);

  const summary = data?.summary || {
    course_fee: 0,
    transport_fee: 0,
    has_transport: false,
    total_fee: 0,
    total_paid: 0,
    total_pending: 0,
    payment_status: "pending",
    paid_count: 0,
    pending_count: 0,
    pending_scheduled_amount: 0,
  };

  const activeEnrollment = data?.active_enrollment;

  const getMethodBadge = (method: string) => {
    switch (method.toLowerCase()) {
      case "upi":
      case "qr":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Smartphone className="size-3" />
            {method.toUpperCase()}
          </span>
        );
      case "cash":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Banknote className="size-3" />
            Cash
          </span>
        );
      case "card":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <CreditCard className="size-3" />
            Card
          </span>
        );
      case "net_banking":
      case "bank_transfer":
      case "cheque":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <Landmark className="size-3" />
            {method.replace("_", " ").toUpperCase()}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted text-muted-foreground border">
            {method.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl md:max-w-4xl max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl border bg-background shadow-2xl">
          {/* Header */}
          <div className="p-6 pb-4 border-b bg-muted/20">
            <DialogHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs shrink-0">
                    <IndianRupee className="size-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                        Fee Details & History
                      </DialogTitle>
                      {summary.payment_status === "paid" && (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" />
                          Fully Paid
                        </Badge>
                      )}
                      {summary.payment_status === "partial" && (
                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold flex items-center gap-1">
                          <Clock className="size-3.5" />
                          Partially Paid (₹{summary.total_pending.toLocaleString("en-IN")} Pending)
                        </Badge>
                      )}
                      {summary.payment_status === "pending" && (
                        <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs font-bold flex items-center gap-1">
                          <AlertCircle className="size-3.5" />
                          Payment Pending
                        </Badge>
                      )}
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Student: <span className="font-bold text-foreground">{student?.full_name}</span>
                      {(activeEnrollment?.roll_number || student?.roll_number) && (
                        <span> • Roll: <span className="font-semibold text-foreground">{activeEnrollment?.roll_number || student?.roll_number}</span></span>
                      )}
                      {(activeEnrollment?.program_name || student?.program_name) && (
                        <span> • Class: <span className="font-semibold text-foreground">{activeEnrollment?.program_name || student?.program_name}</span></span>
                      )}
                      {(activeEnrollment?.section_name || student?.section_name) && (
                        <span> ({activeEnrollment?.section_name || student?.section_name})</span>
                      )}
                      {(activeEnrollment?.academic_year_name || student?.academic_year_name) && (
                        <span> • Session: <span className="font-semibold text-foreground">{activeEnrollment?.academic_year_name || student?.academic_year_name}</span></span>
                      )}
                    </DialogDescription>

                    {/* Batch and Payment Plan Selector Badges */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                        <GraduationCap className="size-3.5" />
                        Batch: {summary.batch_name || "Default Batch"}
                      </span>

                      <div className="flex items-center gap-1.5 text-xs bg-muted/40 px-2 py-0.5 rounded-lg border border-border/70">
                        <span className="text-muted-foreground font-medium text-[11px]">Plan:</span>
                        <Select
                          value={summary.payment_plan || "quarterly"}
                          onValueChange={handleChangePlan}
                          disabled={updatingPlan}
                        >
                          <SelectTrigger className="h-6 text-xs font-semibold w-[165px] bg-background border-border/80 px-2 py-0">
                            <SelectValue placeholder="Payment Plan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="quarterly">Quarterly (4 Terms)</SelectItem>
                            <SelectItem value="monthly">Monthly (12 Flex Months)</SelectItem>
                            <SelectItem value="semester">Semester (2 Terms)</SelectItem>
                            <SelectItem value="yearly">Annual / Yearly (1 Term)</SelectItem>
                            <SelectItem value="one_time">One-Time Lump Sum</SelectItem>
                          </SelectContent>
                        </Select>
                        {updatingPlan ? (
                          <Loader2 className="size-3.5 animate-spin text-primary ml-1" />
                        ) : summary.installment_amount ? (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                            ₹{summary.installment_amount.toLocaleString("en-IN")} / term
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchFeeDetails}
                    disabled={loading}
                    className="h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (summary.total_pending > 0) {
                        setCollectAmount(String(summary.total_pending));
                      }
                      setActiveTab("collect");
                    }}
                    className="h-8 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="size-3.5" />
                    Record Payment
                  </Button>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Top KPI Cards Grid */}
          <div className="p-6 pb-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Total Fee Card */}
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <GraduationCap className="size-4 text-blue-500" />
                    Total Enrolled Fee
                  </span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">
                    {summary.payment_plan_label ? summary.payment_plan_label.split("(")[0] : "Course + Transport"}
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-foreground tracking-tight">
                  ₹{summary.total_fee.toLocaleString("en-IN")}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  Tuition: ₹{summary.course_fee.toLocaleString("en-IN")}
                  {summary.has_transport && ` • Transport: ₹${summary.transport_fee.toLocaleString("en-IN")}`}
                </p>
              </div>

              {/* Total Paid Card */}
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    Total Fee Paid
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-600/80 tracking-wider">
                    Cleared
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                  ₹{summary.total_paid.toLocaleString("en-IN")}
                </div>
                <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90 font-medium">
                  {summary.paid_count} payment transaction(s) recorded
                </p>
              </div>

              {/* Total Pending Card */}
              <div className={cn(
                "rounded-xl border p-4 space-y-1.5 shadow-2xs transition-all",
                summary.total_pending > 0
                  ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10"
                  : "border-border/70 bg-card"
              )}>
                <div className="flex items-center justify-between text-amber-700 dark:text-amber-300">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <Clock className="size-4 text-amber-500" />
                    Pending Balance Due
                  </span>
                  <span className="text-[10px] uppercase font-bold text-amber-600/80 tracking-wider">
                    Outstanding
                  </span>
                </div>
                <div className={cn(
                  "text-2xl font-extrabold tracking-tight",
                  summary.total_pending > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                )}>
                  ₹{summary.total_pending.toLocaleString("en-IN")}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {summary.total_pending > 0 ? (
                    summary.next_due_formatted ? (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 truncate">
                        <Clock className="size-3 shrink-0" />
                        Next due: {summary.next_due_formatted} (₹{summary.next_due_amount?.toLocaleString("en-IN")})
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        Balance to be collected
                      </span>
                    )
                  ) : (
                    "All enrolled fees fully settled"
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b px-6 bg-muted/10 flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap",
                activeTab === "history"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="size-4" />
              Fee Payment History
              {data?.history && (
                <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  {data.history.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("breakdown")}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap",
                activeTab === "breakdown"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Receipt className="size-4" />
              Pending Dues & Breakdown
              {summary.total_pending > 0 && (
                <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                  ₹{summary.total_pending.toLocaleString("en-IN")} Due
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (summary.total_pending > 0 && !collectAmount) {
                  setCollectAmount(String(summary.total_pending));
                }
                setActiveTab("collect");
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap",
                activeTab === "collect"
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Plus className="size-4" />
              Collect / Record Payment
            </button>
          </div>

          {/* Tab Contents */}
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-xs font-medium">Loading student fee records...</p>
              </div>
            ) : (
              <>
                {/* 1. FEE PAYMENT HISTORY TAB */}
                {activeTab === "history" && (
                  <div className="space-y-4">
                    {/* Filters & Search */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          placeholder="Search fee title, transaction ID..."
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          className="h-9 pl-9 text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Select value={methodFilter} onValueChange={setMethodFilter}>
                          <SelectTrigger className="h-9 text-xs w-[140px]">
                            <SelectValue placeholder="All Methods" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Methods</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="upi">UPI / QR</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="net_banking">Net Banking</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          size="sm"
                          onClick={() => setActiveTab("collect")}
                          className="h-9 text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
                        >
                          <Plus className="size-3.5" />
                          Add Payment
                        </Button>
                      </div>
                    </div>

                    {/* Transactions List */}
                    {filteredHistory.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/80 p-10 text-center space-y-3">
                        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto">
                          <Receipt className="size-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-foreground">No Payment Records Found</h4>
                          <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            {searchFilter || methodFilter !== "all"
                              ? "No payment records match your filters."
                              : "No fee payments have been recorded for this student yet. Click below to record their first payment."}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setActiveTab("collect")}
                          className="mt-2 text-xs font-semibold gap-1.5 cursor-pointer"
                        >
                          <Plus className="size-3.5" />
                          Record First Payment
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border/70 overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                              <tr>
                                <th className="p-3 pl-4">Receipt / Date</th>
                                <th className="p-3">Fee Title</th>
                                <th className="p-3">Method</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 pr-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {filteredHistory.map((item) => (
                                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                  <td className="p-3 pl-4">
                                    <div className="font-semibold text-foreground">
                                      {item.transaction_id || `REC-${item.id.toString().padStart(5, "0")}`}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                      {item.received_at
                                        ? formatIndianDate(item.received_at)
                                        : formatIndianDate(item.created_at)}
                                    </div>
                                  </td>

                                  <td className="p-3">
                                    <div className="font-medium text-foreground">
                                      {item.fee_title}
                                    </div>
                                    {item.remarks && (
                                      <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                                        {item.remarks}
                                      </div>
                                    )}
                                    {item.received_by_name && (
                                      <div className="text-[10px] text-muted-foreground/70">
                                        Received by {item.received_by_name}
                                      </div>
                                    )}
                                  </td>

                                  <td className="p-3">
                                    {getMethodBadge(item.payment_method)}
                                  </td>

                                  <td className="p-3 text-right">
                                    <span className="font-bold text-foreground text-sm">
                                      ₹{Number(item.total_amount).toLocaleString("en-IN")}
                                    </span>
                                  </td>

                                  <td className="p-3 text-center">
                                    {["paid", "verified", "approved"].includes(item.status) ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle2 className="size-3" />
                                        Paid
                                      </span>
                                    ) : item.status === "pending" ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                        <Clock className="size-3" />
                                        Pending
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                        {item.status.toUpperCase()}
                                      </span>
                                    )}
                                  </td>

                                  <td className="p-3 pr-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handlePrintReceipt(item)}
                                        title="View & Print Receipt"
                                        className="h-8 px-2 text-xs font-semibold cursor-pointer hover:text-primary"
                                      >
                                        <Printer className="size-3.5 mr-1" />
                                        Receipt
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeletePayment(item.id)}
                                        title="Delete Payment Record"
                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. PENDING DUES & BREAKDOWN TAB */}
                {activeTab === "breakdown" && (
                  <div className="space-y-5">
                    {/* A. Batch Installment Schedule & Due Dates */}
                    {data?.installments && data.installments.length > 0 && (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3.5 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="space-y-0.5">
                            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                              <Calendar className="size-4 text-primary" />
                              Batch Payment Schedule & Due Dates
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {summary.batch_name ? `Batch: ${summary.batch_name} • ` : ""}
                              {summary.payment_plan_label || "Quarterly Plan"}
                              {summary.installment_amount ? ` (≈ ₹${summary.installment_amount.toLocaleString("en-IN")}/installment)` : ""}
                            </p>
                          </div>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-background border border-primary/30 text-primary font-bold self-start sm:self-auto">
                            {data.installments.length} Scheduled Installments
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {data.installments.map((inst) => (
                            <div
                              key={inst.installment_number}
                              className={cn(
                                "rounded-xl border p-3.5 bg-card space-y-2.5 shadow-2xs transition-all",
                                inst.status === "paid"
                                  ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
                                  : inst.is_overdue
                                  ? "border-rose-500/30 bg-rose-500/5"
                                  : "border-border/80 hover:border-primary/50"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                    {inst.title}
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 font-medium">
                                    <Calendar className="size-3 shrink-0 text-muted-foreground" />
                                    <span>Due: <span className="font-semibold text-foreground">{inst.due_date_formatted}</span></span>
                                  </div>
                                </div>

                                {inst.status === "paid" ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 text-[10px] font-bold shrink-0">
                                    <CheckCircle2 className="size-3 mr-1" />
                                    Paid
                                  </Badge>
                                ) : inst.is_overdue ? (
                                  <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25 text-[10px] font-bold shrink-0">
                                    <AlertCircle className="size-3 mr-1" />
                                    {inst.days_status}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25 text-[10px] font-bold shrink-0">
                                    <Clock className="size-3 mr-1" />
                                    {inst.days_status}
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                                <div className="text-[11px] text-muted-foreground">
                                  <span>Tuition: ₹{inst.course_fee.toLocaleString("en-IN")}</span>
                                  {inst.transport_fee > 0 && <span> + Bus: ₹{inst.transport_fee.toLocaleString("en-IN")}</span>}
                                </div>
                                <div className="text-right">
                                  <span className="font-extrabold text-foreground text-sm">
                                    ₹{inst.total_amount.toLocaleString("en-IN")}
                                  </span>
                                </div>
                              </div>

                              {inst.status !== "paid" ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleSelectDueToCollect(inst)}
                                  className="w-full h-7 text-xs font-semibold gap-1.5 cursor-pointer"
                                >
                                  <IndianRupee className="size-3" />
                                  Collect This Due (₹{inst.pending_amount.toLocaleString("en-IN")}) →
                                </Button>
                              ) : (
                                <div className="text-center py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-md">
                                  ✓ Installment Fully Cleared
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* B. Structure Breakdown Card */}
                    <div className="rounded-xl border border-border/70 bg-card p-5 space-y-4 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Receipt className="size-4 text-primary" />
                          Fee Structure Breakdown
                        </h4>
                        {activeEnrollment?.program_name && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                            {activeEnrollment.program_name}
                          </span>
                        )}
                      </div>

                      <div className="divide-y divide-border/60 text-sm">
                        <div className="flex items-center justify-between py-2 text-muted-foreground">
                          <span className="flex items-center gap-2">
                            <GraduationCap className="size-4 text-muted-foreground" />
                            Base Tuition / Course Fee
                          </span>
                          <span className="font-semibold text-foreground">
                            ₹{summary.course_fee.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-2 text-muted-foreground">
                          <span className="flex items-center gap-2">
                            <Bus className="size-4 text-muted-foreground" />
                            Transportation Service Fee
                            {summary.has_transport && summary.transport_zone && (
                              <span className="text-[11px] text-muted-foreground/80">
                                ({summary.transport_zone})
                              </span>
                            )}
                          </span>
                          <span className="font-semibold text-foreground">
                            {summary.has_transport
                              ? `₹${summary.transport_fee.toLocaleString("en-IN")}`
                              : "Without Transport (₹0)"}
                          </span>
                        </div>

                        {summary.has_transport && summary.pickup_address && (
                          <div className="flex items-center justify-between py-2 text-xs text-muted-foreground">
                            <span>Pickup / Drop Point:</span>
                            <span className="font-medium text-foreground">{summary.pickup_address}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between py-2.5 text-base font-bold text-foreground">
                          <span>Total Enrolled Fee Payable</span>
                          <span className="text-primary font-extrabold text-lg">
                            ₹{summary.total_fee.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="size-4" />
                            Total Amount Paid
                          </span>
                          <span>₹{summary.total_paid.toLocaleString("en-IN")}</span>
                        </div>

                        <div className="flex items-center justify-between py-3 text-base font-extrabold">
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-2">
                            <Clock className="size-5" />
                            Pending Outstanding Due
                          </span>
                          <span className="text-amber-600 dark:text-amber-400 text-xl font-black">
                            ₹{summary.total_pending.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      {summary.total_pending > 0 && (
                        <div className="pt-2 flex justify-end">
                          <Button
                            onClick={() => {
                              setCollectAmount(String(summary.total_pending));
                              setCollectFeeTitle("Outstanding Balance Payment");
                              setActiveTab("collect");
                            }}
                            className="text-xs font-semibold gap-2 cursor-pointer shadow-xs"
                          >
                            <IndianRupee className="size-4" />
                            Collect Remaining ₹{summary.total_pending.toLocaleString("en-IN")}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* C. Other Scheduled Pending Dues (if any) */}
                    {data?.pending_dues && data.pending_dues.length > 0 && (
                      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 space-y-3">
                        <h4 className="text-sm font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                          <AlertCircle className="size-4 text-amber-500" />
                          Custom Pending Dues ({data.pending_dues.length})
                        </h4>
                        <div className="divide-y divide-amber-500/20">
                          {data.pending_dues.map((p) => (
                            <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-semibold text-foreground">{p.fee_title}</span>
                                {p.due_date && (
                                  <span className="text-muted-foreground ml-2">
                                    Due by {formatIndianDate(p.due_date)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                                  ₹{Number(p.total_amount).toLocaleString("en-IN")}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setCollectFeeTitle(p.fee_title);
                                    setCollectAmount(String(p.total_amount));
                                    setCollectDueDate(p.due_date || "");
                                    setActiveTab("collect");
                                  }}
                                  className="h-7 text-xs cursor-pointer border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                                >
                                  Collect
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. COLLECT / RECORD PAYMENT TAB */}
                {activeTab === "collect" && (
                  <form onSubmit={handleRecordPayment} className="space-y-4">
                    <div className="rounded-xl border border-border/70 bg-card p-5 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Plus className="size-4 text-primary" />
                          Record New Payment Entry
                        </h4>
                        {summary.total_pending > 0 && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                            Pending Balance: ₹{summary.total_pending.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      {/* Quick-Select from Batch Installments */}
                      {data?.installments && data.installments.length > 0 && (
                        <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Calendar className="size-3.5 text-primary" />
                              Quick-Fill From Batch Plan Schedule:
                            </Label>
                            <span className="text-[11px] font-semibold text-primary">
                              {summary.payment_plan_label}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                            {data.installments.map((inst) => (
                              <button
                                key={inst.installment_number}
                                type="button"
                                onClick={() => handleSelectDueToCollect(inst)}
                                className={cn(
                                  "flex items-center justify-between p-2.5 rounded-lg border text-xs text-left transition-all cursor-pointer",
                                  collectFeeTitle === inst.title
                                    ? "border-primary bg-background shadow-xs ring-2 ring-primary/20"
                                    : "border-border/70 hover:border-primary/50 bg-background/80 hover:bg-background"
                                )}
                              >
                                <div>
                                  <div className="font-semibold text-foreground flex items-center gap-1">
                                    {inst.title}
                                    {inst.status === "paid" ? (
                                      <CheckCircle2 className="size-3 text-emerald-500" />
                                    ) : inst.is_overdue ? (
                                      <AlertCircle className="size-3 text-rose-500" />
                                    ) : null}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    Due: <span className="font-medium text-foreground">{inst.due_date_formatted}</span>
                                    <span className={cn(
                                      "ml-1.5 font-semibold",
                                      inst.status === "paid" ? "text-emerald-600" : inst.is_overdue ? "text-rose-600" : "text-amber-600"
                                    )}>
                                      • {inst.days_status}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <div className="font-bold text-foreground">
                                    ₹{inst.total_amount.toLocaleString("en-IN")}
                                  </div>
                                  <div className="text-[10px] text-primary font-semibold">
                                    {collectFeeTitle === inst.title ? "✓ Selected" : "Select →"}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Fee Title */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs font-semibold">Fee Title / Description *</Label>
                          <div className="flex gap-2">
                            <Select value={collectFeeTitle} onValueChange={setCollectFeeTitle}>
                              <SelectTrigger className="h-10 text-xs flex-1">
                                <SelectValue placeholder="Select or type description" />
                              </SelectTrigger>
                              <SelectContent>
                                {data?.installments?.map((inst) => (
                                  <SelectItem key={inst.installment_number} value={inst.title}>
                                    {inst.title} (Due: {inst.due_date_formatted})
                                  </SelectItem>
                                ))}
                                <SelectItem value="Tuition Fee Installment">Tuition Fee Installment</SelectItem>
                                <SelectItem value="1st Term Fee">1st Term Fee</SelectItem>
                                <SelectItem value="2nd Term Fee">2nd Term Fee</SelectItem>
                                <SelectItem value="Monthly Course Fee">Monthly Course Fee</SelectItem>
                                <SelectItem value="Transport Fee">Transport Fee</SelectItem>
                                <SelectItem value="Admission & Registration Fee">Admission & Registration Fee</SelectItem>
                                <SelectItem value="Full Academic Fee Settlement">Full Academic Fee Settlement</SelectItem>
                                <SelectItem value="Other Miscellaneous Fee">Other Miscellaneous Fee</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              value={collectFeeTitle}
                              onChange={(e) => setCollectFeeTitle(e.target.value)}
                              placeholder="Or type custom description..."
                              className="h-10 text-xs flex-1"
                              required
                            />
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Payment Amount (₹) *</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-bold">
                              ₹
                            </span>
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              required
                              value={collectAmount}
                              onChange={(e) => setCollectAmount(e.target.value)}
                              placeholder="e.g. 5000"
                              className="h-10 pl-8 text-sm font-bold"
                            />
                          </div>
                          {summary.total_pending > 0 && (
                            <div className="flex gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => setCollectAmount(String(summary.total_pending))}
                                className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
                              >
                                Full Due (₹{summary.total_pending.toLocaleString("en-IN")})
                              </button>
                              {summary.installment_amount && summary.installment_amount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setCollectAmount(String(summary.installment_amount))}
                                  className="text-[11px] px-2 py-0.5 rounded bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors cursor-pointer"
                                >
                                  1 Term (₹{summary.installment_amount.toLocaleString("en-IN")})
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Due Date (ALWAYS VISIBLE) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold flex items-center gap-1.5">
                              <Calendar className="size-3.5 text-primary" />
                              Installment Due Date
                            </Label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setCollectDueDate(new Date().toISOString().split("T")[0])}
                                className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground font-medium cursor-pointer"
                              >
                                Today
                              </button>
                              {summary.next_due_date && (
                                <button
                                  type="button"
                                  onClick={() => setCollectDueDate(summary.next_due_date!)}
                                  className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold hover:bg-primary/20 cursor-pointer"
                                >
                                  Next Due
                                </button>
                              )}
                            </div>
                          </div>
                          <Input
                            type="date"
                            value={collectDueDate}
                            onChange={(e) => setCollectDueDate(e.target.value)}
                            className="h-10 text-xs font-medium"
                          />
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Payment Method *</Label>
                          <Select value={collectMethod} onValueChange={setCollectMethod}>
                            <SelectTrigger className="h-10 text-xs">
                              <SelectValue placeholder="Select Payment Mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="upi">UPI / QR Code</SelectItem>
                              <SelectItem value="card">Debit / Credit Card</SelectItem>
                              <SelectItem value="net_banking">Net Banking (IMPS/NEFT)</SelectItem>
                              <SelectItem value="cheque">Bank Cheque / DD</SelectItem>
                              <SelectItem value="bank_transfer">Direct Bank Transfer</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Transaction / Reference ID */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">
                            Transaction / Ref #{" "}
                            <span className="text-muted-foreground font-normal">(optional)</span>
                          </Label>
                          <Input
                            value={collectTxId}
                            onChange={(e) => setCollectTxId(e.target.value)}
                            placeholder="e.g. UPI/345678 or Cheque #12345"
                            className="h-10 text-xs"
                          />
                        </div>

                        {/* Status */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs font-semibold">Entry Status</Label>
                          <Select
                            value={collectStatus}
                            onValueChange={(val) => setCollectStatus(val as "paid" | "pending")}
                          >
                            <SelectTrigger className="h-10 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="paid">Paid & Cleared (Immediate Receipt)</SelectItem>
                              <SelectItem value="pending">Mark as Pending Due (Collect Later)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Remarks */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs font-semibold">
                            Payment Notes / Remarks{" "}
                            <span className="text-muted-foreground font-normal">(optional)</span>
                          </Label>
                          <Textarea
                            value={collectRemarks}
                            onChange={(e) => setCollectRemarks(e.target.value)}
                            placeholder="e.g. Paid in full via cash at admin counter"
                            rows={2}
                            className="text-xs resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab("history")}
                        className="text-xs cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={savingPayment}
                        className="text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                      >
                        {savingPayment ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            Recording Payment...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-3.5" />
                            Confirm & Save Payment
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PRINTABLE RECEIPT MODAL */}
      {receiptItem && (
        <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
          <DialogContent className="sm:max-w-lg p-0 gap-0 rounded-2xl border bg-background shadow-2xl overflow-hidden">
            <div className="p-6 bg-card space-y-6" id="printable-student-fee-receipt">
              {/* Receipt Top Header */}
              <div className="border-b pb-4 text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <GraduationCap className="size-5 text-primary" />
                  <h3 className="font-extrabold text-base tracking-tight text-foreground">
                    {activeEnrollment?.institution_name || "Educational Institution"}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Official Student Fee Receipt</p>
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20 mt-1">
                  ✓ Payment Confirmed
                </div>
              </div>

              {/* Receipt Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3.5 rounded-xl border border-border/60">
                <div>
                  <span className="text-muted-foreground">Receipt Number:</span>
                  <p className="font-bold text-foreground">
                    {receiptItem.transaction_id || `REC-${receiptItem.id.toString().padStart(5, "0")}`}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-bold text-foreground">
                    {formatIndianDate(receiptItem.received_at || receiptItem.created_at)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Student Name:</span>
                  <p className="font-bold text-foreground">{student?.full_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Class / Section:</span>
                  <p className="font-bold text-foreground">
                    {activeEnrollment?.program_name || student?.program_name || "-"}
                    {activeEnrollment?.section_name && ` (${activeEnrollment.section_name})`}
                  </p>
                </div>
                {activeEnrollment?.roll_number && (
                  <div>
                    <span className="text-muted-foreground">Roll Number:</span>
                    <p className="font-bold text-foreground">{activeEnrollment.roll_number}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Payment Mode:</span>
                  <p className="font-bold text-foreground uppercase">{receiptItem.payment_method}</p>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border rounded-xl overflow-hidden text-xs">
                <div className="bg-muted/50 p-2.5 font-semibold text-muted-foreground border-b flex justify-between">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-foreground">{receiptItem.fee_title}</p>
                    {receiptItem.remarks && (
                      <p className="text-[11px] text-muted-foreground">{receiptItem.remarks}</p>
                    )}
                  </div>
                  <span className="font-bold text-foreground text-sm">
                    ₹{Number(receiptItem.total_amount).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="bg-primary/5 p-3 border-t flex justify-between items-center text-sm font-extrabold text-foreground">
                  <span>Total Paid</span>
                  <span className="text-primary text-base font-black">
                    ₹{Number(receiptItem.total_amount).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="pt-4 border-t text-center space-y-1 text-[11px] text-muted-foreground">
                <p>This is a computer generated receipt and does not require a physical signature.</p>
                {receiptItem.received_by_name && (
                  <p className="font-semibold text-foreground">Collected by: {receiptItem.received_by_name}</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReceiptOpen(false)}
                className="text-xs cursor-pointer"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  window.print();
                }}
                className="text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="size-3.5" />
                Print Receipt
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
