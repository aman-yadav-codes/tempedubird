"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  GraduationCap,
  IndianRupee,
  Loader2,
  QrCode,
  ReceiptText,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  TemplateResizableHandle,
  TemplateResizablePanel,
  TemplateResizablePanelGroup,
} from "@/components/card-templates/template-resizable";
import {
  DocumentFileUpload,
  type UploadedDocumentFile,
} from "@/components/shared/document-file-upload";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getApiErrorMessage,
  readJsonResponse,
} from "@/lib/auth/client-permission-errors";
import { useAuthStore } from "@/store";

type FeeComponent = {
  id: number;
  title: string | null;
  amount: string | number | null;
  unit: string | null;
};

type FeePayment = {
  id: number;
  period_indexes: number[] | string | null;
  payment_method: string | null;
  status?: string | null;
  subtotal_amount: string | number | null;
  discount_percent: string | number | null;
  discount_amount: string | number | null;
  total_amount: string | number | null;
  transaction_id: string | null;
  remarks: string | null;
  rejection_reason?: string | null;
  screenshot_url?: string | null;
  screenshot_public_id?: string | null;
  screenshot_resource_type?: string | null;
  received_at: string | null;
  created_at?: string | null;
};

type FeePeriod = {
  index: number;
  start_date: string;
  end_date: string;
  duration_label: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  is_paid: boolean;
  payment: FeePayment | null;
  pending_payment?: FeePayment | null;
  rejected_payment?: FeePayment | null;
};

type FeeSummary = {
  duration_value: number | null;
  duration_unit: string | null;
  duration_label: string | null;
  recurring_amount: number;
  one_time_amount: number;
  total_payable: number;
  paid_amount: number;
  due_amount: number;
  periods: FeePeriod[];
};

type ClassroomFee = {
  id: number;
  institution_id: number | null;
  student_profile_id: number | null;
  student_user_id: number | null;
  student_name: string | null;
  student_email: string | null;
  admission_number: string | null;
  program_id: number | null;
  program_name: string | null;
  institution_name: string | null;
  academic_year_name: string | null;
  class_category_name: string | null;
  section_name: string | null;
  roll_number: string | null;
  admission_date: string | null;
  status: string | null;
  duration_value: number | string | null;
  duration_unit: string | null;
  fee_components: FeeComponent[];
  fee_summary: FeeSummary;
  payment_settings?: PaymentSettings | null;
  search_text?: string;
};

type PaymentSettings = {
  id: number;
  scope_type: string;
  institution_id: number | null;
  upi_id: string | null;
  qr_image_url: string | null;
  is_active: boolean;
};

function formatAmount(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "Rs. 0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const [datePart] = String(value).split("T");
  const parts = datePart.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(parts[0], parts[1] - 1, parts[2]));
}

function periodLabel(period: FeePeriod) {
  return `${formatDate(period.start_date)} - ${formatDate(period.end_date)}`;
}

function statusBadge(value: string | null | undefined) {
  return (
    <Badge
      variant="outline"
      className={
        String(value ?? "").toLowerCase() === "active"
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
          : "border-muted-foreground/30 text-muted-foreground"
      }
    >
      {value ? value[0].toUpperCase() + value.slice(1) : "Unknown"}
    </Badge>
  );
}

function paymentMethodLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "upi") return "UPI";
  if (normalized === "qr") return "QR Code";
  if (normalized === "cash") return "Cash";
  return "-";
}

function CourseFeeSheet({
  fee,
  open,
  onOpenChange,
  onPayNow,
}: {
  fee: ClassroomFee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPayNow: (fee: ClassroomFee) => void;
}) {
  const [activePeriod, setActivePeriod] = useState<FeePeriod | null>(null);
  const [feeStructureOpen, setFeeStructureOpen] = useState(false);
  const [programFeeOpen, setProgramFeeOpen] = useState(false);
  if (!fee) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-4xl">
          <SheetHeader className="border-b px-6 py-5 text-left">
            <SheetTitle className="flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              Fee Details
            </SheetTitle>
            <SheetDescription>
              {fee.student_name ?? "Student"} - {fee.program_name ?? "Course fee"}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-6 py-5">
            <section className="overflow-hidden rounded-md border bg-card">
              <div className="space-y-4 border-b p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="size-4" />
                    {fee.institution_name ?? "Institution"}
                  </div>
                  <h2 className="mt-1 truncate text-xl font-semibold">{fee.program_name ?? "Course"}</h2>
                  <p className="text-sm text-muted-foreground">
                    {fee.class_category_name ?? "Class"} {fee.section_name ? `- Section ${fee.section_name}` : ""}
                    {fee.academic_year_name ? ` - ${fee.academic_year_name}` : ""}
                  </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-10 min-w-28 justify-center"
                    onClick={() => onPayNow(fee)}
                    disabled={fee.fee_summary.due_amount <= 0}
                  >
                    <CreditCard className="size-4" />
                    Pay Now
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="min-w-0 rounded-md border bg-background/40 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Paid Yet</p>
                    <p className="truncate text-lg font-semibold leading-tight">{formatAmount(fee.fee_summary.paid_amount)}</p>
                  </div>
                  <div className="min-w-0 rounded-md border bg-background/40 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Total Fee</p>
                    <p className="truncate text-lg font-semibold leading-tight">{formatAmount(fee.fee_summary.total_payable)}</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 p-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Admission No.</p>
                  <p className="font-medium">{fee.admission_number || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Roll Number</p>
                  <p className="font-medium">{fee.roll_number || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Duration</p>
                  <p className="font-medium">{fee.fee_summary.duration_label ?? "-"}</p>
                </div>
              </div>
            </section>

            <Collapsible open={feeStructureOpen} onOpenChange={setFeeStructureOpen}>
              <section className="overflow-hidden rounded-md border bg-card">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30"
                  >
                    <span className="flex min-w-0 items-center gap-2 font-semibold">
                      <ReceiptText className="size-4 text-primary" />
                      <span className="truncate">Student Fee Structure</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                      {fee.fee_summary.periods.length} month(s)
                      <ChevronDown className="size-4 transition-transform data-[state=open]:rotate-180" />
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t">
                    <div className="grid grid-cols-[1fr_6.5rem_7rem_7rem] px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
                      <span>Period</span>
                      <span>Status</span>
                      <span>Duration</span>
                      <span className="text-right">Fee</span>
                    </div>
                    <div className="max-h-[22rem] overflow-y-auto">
                      {fee.fee_summary.periods.length ? (
                        fee.fee_summary.periods.map((period) => (
                          <button
                            key={period.index}
                            type="button"
                            className="grid w-full cursor-pointer grid-cols-[1fr_6.5rem_7rem_7rem] items-center border-t px-4 py-2.5 text-left hover:bg-muted/35"
                            onClick={() => setActivePeriod(period)}
                          >
                            <span className="font-medium">{periodLabel(period)}</span>
                            <span>
                              {period.is_paid ? (
                                <Badge variant="outline" className="h-6 border-emerald-500/40 bg-emerald-500/15 px-2 text-emerald-300">
                                  <CheckCircle2 className="mr-1 size-3" />
                                  Paid
                                </Badge>
                              ) : period.pending_payment ? (
                                <Badge variant="outline" className="h-6 border-amber-500/40 bg-amber-500/15 px-2 text-amber-300">
                                  <Clock3 className="mr-1 size-3" />
                                  Pending
                                </Badge>
                              ) : period.rejected_payment ? (
                                <Badge variant="outline" className="h-6 border-destructive/40 bg-destructive/15 px-2 text-destructive">
                                  <X className="mr-1 size-3" />
                                  Rejected
                                </Badge>
                              ) : (
                                <span className="flex h-6 items-center gap-1 text-sm text-muted-foreground">
                                  <Clock3 className="size-3" />
                                  Pending
                                </span>
                              )}
                            </span>
                            <span className="text-sm text-muted-foreground">{period.duration_label}</span>
                            <span className="text-right font-semibold">{formatAmount(period.amount)}</span>
                          </button>
                        ))
                      ) : (
                        <div className="border-t p-6 text-center text-sm text-muted-foreground">
                          Fee periods are not configured for this course.
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </section>
            </Collapsible>

            <Collapsible open={programFeeOpen} onOpenChange={setProgramFeeOpen}>
              <section className="overflow-hidden rounded-md border bg-card">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30"
                  >
                    <span className="flex min-w-0 items-center gap-2 font-semibold">
                      <IndianRupee className="size-4 text-primary" />
                      <span className="truncate">Program Enrolled & Fee Structure</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                      {fee.fee_components.length} row(s)
                      <ChevronDown className="size-4 transition-transform data-[state=open]:rotate-180" />
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="max-h-72 overflow-y-auto border-t">
                    {fee.fee_components.length ? (
                      fee.fee_components.map((component) => (
                        <div key={component.id} className="flex items-center justify-between gap-3 border-b px-4 py-2.5 last:border-b-0">
                          <span className="min-w-0 truncate font-medium">{component.title ?? "Fee"}</span>
                          <span className="shrink-0 text-right text-muted-foreground">
                            {formatAmount(component.amount)}
                            {component.unit ? ` / ${component.unit}` : ""}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        No fee components configured.
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </section>
            </Collapsible>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(activePeriod)} onOpenChange={(next) => !next && setActivePeriod(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fee Period Details</DialogTitle>
            <DialogDescription>
              {activePeriod ? periodLabel(activePeriod) : "Fee period"}
            </DialogDescription>
          </DialogHeader>
          {activePeriod && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Status</p>
                  <p className="font-medium">
                    {activePeriod.is_paid
                      ? "Paid"
                      : activePeriod.pending_payment
                        ? "Pending verification"
                        : activePeriod.rejected_payment
                          ? "Rejected"
                          : "Pending"}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Fee</p>
                  <p className="font-medium">{formatAmount(activePeriod.amount)}</p>
                </div>
              </div>
              {activePeriod.payment ? (
                <div className="rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Payment</p>
                  <p className="font-medium">{formatAmount(activePeriod.payment.total_amount)}</p>
                  <p className="text-muted-foreground">Method: {paymentMethodLabel(activePeriod.payment.payment_method)}</p>
                  <p className="text-muted-foreground">Transaction: {activePeriod.payment.transaction_id || "-"}</p>
                  <p className="text-muted-foreground">Date: {formatDate(activePeriod.payment.received_at)}</p>
                  {activePeriod.payment.remarks && (
                    <p className="text-muted-foreground">Remarks: {activePeriod.payment.remarks}</p>
                  )}
                </div>
              ) : activePeriod.pending_payment ? (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-xs font-semibold uppercase text-amber-300">Pending verification</p>
                  <p className="font-medium">{formatAmount(activePeriod.pending_payment.total_amount)}</p>
                  <p className="text-muted-foreground">Transaction: {activePeriod.pending_payment.transaction_id || "-"}</p>
                  <p className="text-muted-foreground">Submitted: {formatDate(activePeriod.pending_payment.created_at)}</p>
                  {activePeriod.pending_payment.screenshot_url && (
                    <a
                      href={activePeriod.pending_payment.screenshot_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      View screenshot
                    </a>
                  )}
                </div>
              ) : activePeriod.rejected_payment ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-xs font-semibold uppercase text-destructive">Rejected</p>
                  <p className="font-medium">{formatAmount(activePeriod.rejected_payment.total_amount)}</p>
                  <p className="text-muted-foreground">Transaction: {activePeriod.rejected_payment.transaction_id || "-"}</p>
                  <p className="text-muted-foreground">Submitted: {formatDate(activePeriod.rejected_payment.created_at)}</p>
                  <p className="mt-2 font-medium text-destructive">
                    Reason: {activePeriod.rejected_payment.rejection_reason || "No reason provided."}
                  </p>
                  {activePeriod.rejected_payment.screenshot_url && (
                    <a
                      href={activePeriod.rejected_payment.screenshot_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      View screenshot
                    </a>
                  )}
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-3 text-muted-foreground">
                  No payment has been recorded for this period.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StudentPayNowDialog({
  fee,
  open,
  onOpenChange,
  onSubmitted,
}: {
  fee: ClassroomFee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}) {
  const { accessToken } = useAuthStore();
  const initialPeriodIndex = fee?.fee_summary.periods.find((period) => !period.is_paid && !period.pending_payment)?.index;
  const [selectedPeriodIndexes, setSelectedPeriodIndexes] = useState<number[]>(
    () => initialPeriodIndex ? [initialPeriodIndex] : [],
  );
  const [transactionId, setTransactionId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [screenshots, setScreenshots] = useState<UploadedDocumentFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const periods = fee?.fee_summary.periods ?? [];
  const selectedPeriods = periods.filter((period) => selectedPeriodIndexes.includes(period.index));
  const totalAmount = selectedPeriods.reduce((sum, period) => sum + (Number(period.amount) || 0), 0);
  const paymentSettings = fee?.payment_settings ?? null;
  const canPayOnline = Boolean(paymentSettings?.upi_id || paymentSettings?.qr_image_url);
  const selectedPeriodLabel = selectedPeriods.length
    ? selectedPeriods.map((period) => periodLabel(period)).join(", ")
    : "No month selected";
  const isMobile = useIsMobile();
  const splitDirection = isMobile ? "vertical" : "horizontal";

  const togglePeriod = (period: FeePeriod, checked: boolean) => {
    if (period.is_paid || period.pending_payment) return;
    setSelectedPeriodIndexes((current) => {
      if (checked) return Array.from(new Set([...current, period.index])).sort((a, b) => a - b);
      return current.filter((item) => item !== period.index);
    });
  };

  const submitRequest = async () => {
    if (!fee || !accessToken) return;
    if (!canPayOnline) {
      toast.error("Payment settings are not configured for this institution.");
      return;
    }
    if (!selectedPeriods.length) {
      toast.error("Select at least one fee month.");
      return;
    }
    if (!transactionId.trim()) {
      toast.error("Enter the transaction ID.");
      return;
    }
    if (!screenshots[0]?.url) {
      toast.error("Upload the payment screenshot.");
      return;
    }

    setSubmitting(true);
    try {
      const screenshot = screenshots[0];
      const res = await fetch("/api/admin/classroom/fees", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enrollmentId: fee.id,
          periodIndexes: selectedPeriodIndexes,
          transactionId: transactionId.trim(),
          screenshotUrl: screenshot.url,
          screenshotPublicId: screenshot.publicId,
          screenshotResourceType: screenshot.resourceType,
          remarks: remarks.trim(),
        }),
      });
      const json = await readJsonResponse(res);
      if (!res.ok) {
        throw new Error(getApiErrorMessage(json, "Failed to submit payment request"));
      }
      toast.success("Payment request submitted for admin verification.");
      onOpenChange(false);
      onSubmitted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit payment request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!flex h-[calc(100dvh-1rem)] max-h-[900px] !w-[calc(100vw-1rem)] !max-w-[1400px] flex-col gap-0 overflow-hidden rounded-lg border bg-background p-0 text-foreground sm:h-[90dvh] sm:!w-[94vw] sm:p-0"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="flex h-14 shrink-0 flex-row items-center justify-between border-b bg-background px-5 text-foreground">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-4 text-primary" />
            Pay Now
          </DialogTitle>
          <DialogDescription className="sr-only">
            Select month, pay by QR or UPI, then submit transaction proof.
          </DialogDescription>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon">
              <X className="size-4" />
              <span className="sr-only">Close payment dialog</span>
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="min-h-0 flex-1">
          <TemplateResizablePanelGroup
            id="student-pay-now-request-dialog"
            direction={splitDirection}
            className="h-full w-full"
          >
            <TemplateResizablePanel
              id="student-pay-now-fields"
              defaultSize={isMobile ? "46%" : "34%"}
              minSize={isMobile ? "18%" : "24%"}
            >
              <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-7">
                  <div>
                    <h3 className="text-xl font-semibold">Payment Fields</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Select fee month, enter transaction ID, and upload payment proof.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fee Month(s)</label>
                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border bg-muted/10 p-2">
                      {periods.length ? periods.map((period) => {
                        const checked = selectedPeriodIndexes.includes(period.index);
                        const locked = period.is_paid || Boolean(period.pending_payment);
                        return (
                          <label
                            key={period.index}
                            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                              checked
                                ? "border-destructive/60 bg-destructive/15"
                                : "bg-background/70 hover:bg-destructive/10"
                            } ${locked ? "cursor-not-allowed opacity-60 hover:bg-background/70" : ""}`}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={locked}
                              onCheckedChange={(value) => togglePeriod(period, value === true)}
                              className="mt-1"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{periodLabel(period)}</span>
                              <span className="block text-xs text-muted-foreground">
                                {period.is_paid ? "Paid" : period.pending_payment ? "Pending verification" : period.duration_label}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold">{formatAmount(period.amount)}</span>
                          </label>
                        );
                      }) : (
                        <p className="p-3 text-sm text-muted-foreground">No fee schedule found.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border bg-muted/20 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Amount to pay</p>
                    <p className="text-2xl font-bold">{formatAmount(totalAmount)}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Transaction ID</label>
                    <Input
                      value={transactionId}
                      onChange={(event) => setTransactionId(event.target.value)}
                      placeholder="Enter transaction ID"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment screenshot</label>
                    <DocumentFileUpload
                      accessToken={accessToken}
                      files={screenshots}
                      onFilesChange={setScreenshots}
                      maxFiles={1}
                      buttonLabel="Upload screenshot"
                      emptyText="Upload payment screenshot"
                      compact
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Remarks</label>
                    <Textarea
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                      placeholder="Optional remarks..."
                      className="min-h-20 resize-none"
                    />
                  </div>
                </div>

                <div className="shrink-0 border-t p-5 md:px-7">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void submitRequest()}
                      disabled={submitting || !canPayOnline || !selectedPeriods.length}
                    >
                      {submitting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                      Submit Request
                    </Button>
                  </div>
                </div>
              </div>
            </TemplateResizablePanel>

            <TemplateResizableHandle id="student-pay-now-separator" />

            <TemplateResizablePanel
              id="student-pay-now-preview"
              defaultSize={isMobile ? "54%" : "66%"}
              minSize={isMobile ? "18%" : "40%"}
            >
              <section className="h-full min-w-0 overflow-y-auto bg-background p-5 sm:p-6">
                <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-start space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment for</p>
                      <h3 className="mt-1 text-2xl font-semibold">{fee?.student_name ?? "Student"}</h3>
                      <p className="text-sm text-muted-foreground">
                        {fee?.program_name ?? "Course"} · Admission No. {fee?.admission_number || "-"}
                      </p>
                    </div>
                    <div className="min-w-56 rounded-md border bg-muted/10 px-5 py-4 text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount to pay</p>
                      <p className="text-3xl font-bold">{formatAmount(totalAmount)}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-md border bg-muted/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subtotal</p>
                      <p className="mt-1 text-lg font-semibold">{formatAmount(totalAmount)}</p>
                    </div>
                    <div className="rounded-md border bg-muted/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transaction</p>
                      <p className="mt-1 truncate text-lg font-semibold">{transactionId.trim() || "Enter on left"}</p>
                    </div>
                    <div className="rounded-md border bg-muted/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected</p>
                      <p className="mt-1 text-lg font-semibold">{selectedPeriods.length} month(s)</p>
                    </div>
                  </div>

                  <div className="rounded-md border bg-card p-4">
                    <h4 className="mb-4 flex items-center gap-2 font-semibold">
                      <CalendarDays className="size-4 text-primary" />
                      {selectedPeriodLabel}
                    </h4>
                    <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
                      <div className="flex min-h-72 items-center justify-center rounded-md border bg-muted/20 p-4">
                        {paymentSettings?.qr_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={paymentSettings.qr_image_url}
                            alt="Payment QR code"
                            className="max-h-64 rounded-md object-contain"
                          />
                        ) : (
                          <div className="text-center text-sm text-muted-foreground">
                            <QrCode className="mx-auto mb-2 size-10" />
                            No QR code configured
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="rounded-md border bg-background/60 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">UPI ID</p>
                          <p className="mt-1 text-base font-semibold">{paymentSettings?.upi_id || "-"}</p>
                        </div>
                        <div className="rounded-md border bg-background/60 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transaction ID</p>
                          <p className="mt-1 break-words text-base font-semibold">{transactionId.trim() || "Enter transaction ID on left"}</p>
                        </div>
                        <div className="rounded-md border bg-background/60 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Screenshot</p>
                          <p className="mt-1 text-base font-semibold">
                            {screenshots[0]?.name || (screenshots[0]?.url ? "Uploaded" : "Upload screenshot on left")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </TemplateResizablePanel>
          </TemplateResizablePanelGroup>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ClassroomFeesPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const [fees, setFees] = useState<ClassroomFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFee, setSelectedFee] = useState<ClassroomFee | null>(null);
  const [payFee, setPayFee] = useState<ClassroomFee | null>(null);

  const loadFees = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/classroom/fees", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      const payload = (await readJsonResponse(response)) as { data?: ClassroomFee[] };
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Unable to load fees"));
      setFees(
        (payload.data ?? []).map((fee) => ({
          ...fee,
          search_text: [
            fee.program_name,
            fee.institution_name,
            fee.academic_year_name,
            fee.class_category_name,
            fee.section_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        })),
      );
      setSelectedFee((current) => {
        if (!current) return null;
        return (payload.data ?? []).find((fee) => fee.id === current.id) ?? current;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load fees");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => {
      void loadFees();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [isReady, loadFees]);

  const columns = useMemo<ColumnDef<ClassroomFee>[]>(
    () => [
      {
        accessorKey: "program_name",
        header: ({ column }) => (
          <button className="flex items-center gap-2" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Course <ArrowUpDown className="size-4" />
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-semibold">{row.original.program_name ?? "Course"}</div>
            <div className="text-sm text-muted-foreground">
              {row.original.class_category_name ?? "Class"}
              {row.original.section_name ? ` - Section ${row.original.section_name}` : ""}
              {row.original.academic_year_name ? ` - ${row.original.academic_year_name}` : ""}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "institution_name",
        header: "Institution",
        cell: ({ row }) => row.original.institution_name ?? "-",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        id: "paid",
        header: "Paid Yet",
        cell: ({ row }) => formatAmount(row.original.fee_summary?.paid_amount),
      },
      {
        id: "total",
        header: "Total Fee",
        cell: ({ row }) => formatAmount(row.original.fee_summary?.total_payable),
      },
      {
        id: "due",
        header: "Due",
        cell: ({ row }) => formatAmount(row.original.fee_summary?.due_amount),
      },
    ],
    [],
  );

  if (!isReady) {
    return <div className="space-y-4"><Skeleton className="h-20" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Fee</h1>
          <p className="text-muted-foreground">
            View enrolled course fees, payment status, and fee periods.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadFees()} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <CalendarDays className="size-4" />}
          Refresh
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={fees}
        loading={loading}
        searchKey="program_name"
        filterPlaceholder="Search course, institution, class..."
        emptyText="No fee records found."
        onRowClick={(fee) => setSelectedFee(fee)}
      />

      <CourseFeeSheet
        fee={selectedFee}
        open={Boolean(selectedFee)}
        onOpenChange={(open) => !open && setSelectedFee(null)}
        onPayNow={setPayFee}
      />

      <StudentPayNowDialog
        key={payFee?.id ?? "pay-now"}
        fee={payFee}
        open={Boolean(payFee)}
        onOpenChange={(open) => !open && setPayFee(null)}
        onSubmitted={() => void loadFees()}
      />
    </div>
  );
}
