"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  ArrowUpDown,
  CalendarDays,
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  FileText,
  GraduationCap,
  Hash,
  IdCard,
  IndianRupee,
  Loader2,
  Mail,
  MapPin,
  Phone,
  QrCode,
  RefreshCw,
  Sparkles,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { CardTemplateTryout } from "@/components/card-templates/card-template-tryout";
import {
  TemplateResizableHandle,
  TemplateResizablePanel,
  TemplateResizablePanelGroup,
} from "@/components/card-templates/template-resizable";
import { DebouncedSearchInput } from "@/components/shared/debounced-search-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useActiveAcademicYearId } from "@/hooks/use-active-academic-year-id";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePersistedState } from "@/hooks/use-persisted-state";
import {
  getApiErrorMessage,
  readJsonResponse,
} from "@/lib/auth/client-permission-errors";
import { formatIndianDate } from "@/lib/format-time";
import type { DocumentTemplateRow } from "@/lib/types/document-template";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import {
  getDefaultStudentFilters,
  isStudentFilters,
  StudentFiltersDrawer,
  type StudentFilters,
} from "../_components/student-filters-drawer";

const FEE_DETAIL_DRAWER_COLLAPSED = 0.5;
const FEE_DETAIL_DRAWER_EXPANDED = 1;
const FEE_DETAIL_DRAWER_SNAP_POINTS: (number | string)[] = [
  FEE_DETAIL_DRAWER_COLLAPSED,
  FEE_DETAIL_DRAWER_EXPANDED,
];

type FeeStudent = {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  institutions: string[];
};

type FeeComponent = {
  id: number;
  title: string | null;
  amount: string | number | null;
  unit: string | null;
};

type FeePeriod = {
  index: number;
  start_date: string;
  end_date: string;
  duration_label: string;
  amount: number;
  paid_amount?: number;
  remaining_amount?: number;
  is_paid?: boolean;
  payment?: {
    id: number;
    period_indexes: number[] | string | null;
    payment_method: string | null;
    subtotal_amount: string | number | null;
    discount_percent: string | number | null;
    discount_amount: string | number | null;
    total_amount: string | number | null;
    transaction_id: string | null;
    remarks: string | null;
    received_at: string | null;
  } | null;
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
  current_period: FeePeriod | null;
  current_period_amount: number;
  current_period_paid_amount: number;
  current_period_remaining_amount: number;
  periods: FeePeriod[];
};

type FeeEnrollment = {
  id: number;
  institution_id: number | null;
  program_id: number | null;
  program_name: string | null;
  institution_name: string | null;
  academic_year_name: string | null;
  class_category_name: string | null;
  section_name: string | null;
  roll_number: string | null;
  admission_date: string | null;
  status: string | null;
  remarks: string | null;
  duration_value: number | string | null;
  duration_unit: string | null;
  fee_components: FeeComponent[];
  fee_summary: FeeSummary | null;
};

type PaymentSettings = {
  id: number;
  scope_type: string;
  institution_id: number | null;
  upi_id: string | null;
  qr_image_url: string | null;
  is_active: boolean;
};

type PaymentRequest = {
  id: number;
  student_user_id: number;
  student_profile_id: number;
  enrollment_id: number;
  institution_id: number;
  period_indexes: number[] | string | null;
  period_labels: FeePeriod[] | string | null;
  payment_method: string | null;
  subtotal_amount: string | number | null;
  discount_percent: string | number | null;
  discount_amount: string | number | null;
  total_amount: string | number | null;
  transaction_id: string | null;
  screenshot_url: string | null;
  screenshot_public_id: string | null;
  screenshot_resource_type: string | null;
  remarks: string | null;
  status: string | null;
  created_at: string | null;
  student_name: string | null;
  student_email: string | null;
  admission_number: string | null;
  institution_name: string | null;
  program_name: string | null;
  academic_year_name: string | null;
  class_category_name: string | null;
  section_name: string | null;
  search_text?: string;
};

type Guardian = {
  id: number;
  guardian_user_id: number;
  guardian_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  relationship: string | null;
  is_primary: boolean;
};

type FeeStudentDetail = {
  id: number;
  student_profile_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  gender: string | null;
  address: string | null;
  admission_number: string | null;
  apar_id: string | null;
  date_of_birth: string | null;
  enrollments: FeeEnrollment[];
  guardians: Guardian[];
  payment_settings: PaymentSettings | null;
};

type PaymentMethod = "upi" | "qr" | "cash";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return formatIndianDate(value);
}

function formatDateOnly(value?: string | null) {
  if (!value) return "-";
  const [datePart] = String(value).split("T");
  const parts = datePart.split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return formatDate(value);
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatAmount(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "Rs. 0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatFee(fee: FeeComponent) {
  const unit = fee.unit?.trim();
  return `${formatAmount(fee.amount)}${unit ? ` / ${unit}` : ""}`;
}

function formatDateRange(start?: string | null, end?: string | null) {
  return `${formatDateOnly(start)} - ${formatDateOnly(end)}`;
}

function formatLabelValue(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) return "-";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

function formatTemplateDate(value?: string | null) {
  if (!value) return "";
  return String(value).split("T")[0] ?? "";
}

function templateAmount(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "";
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

function getPrimaryGuardian(detail: FeeStudentDetail | null) {
  if (!detail?.guardians.length) return null;
  return detail.guardians.find((guardian) => guardian.is_primary) ?? detail.guardians[0] ?? null;
}

function buildInvoiceFieldValues(
  detail: FeeStudentDetail,
  enrollment: FeeEnrollment,
  period: FeePeriod,
): Record<string, string> {
  const guardian = getPrimaryGuardian(detail);
  const components = enrollment.fee_components.filter((fee) => Number(fee.amount ?? 0) > 0);
  const componentTotal = components.reduce((sum, fee) => sum + (Number(fee.amount ?? 0) || 0), 0);
  const payment = period.payment;
  const storedDiscountPercent = Number(payment?.discount_percent ?? 0) || 0;
  const storedDiscountAmount = Number(payment?.discount_amount ?? 0) || 0;
  const subtotal = Number(payment?.subtotal_amount ?? 0) || componentTotal || Number(period.amount ?? 0) || 0;
  const discountAmount = storedDiscountAmount || (storedDiscountPercent ? (subtotal * storedDiscountPercent) / 100 : 0);
  const discountPercent =
    storedDiscountPercent || (subtotal > 0 && discountAmount > 0 ? (discountAmount / subtotal) * 100 : 0);
  const totalAmount = Number(payment?.total_amount ?? 0) || Math.max(0, subtotal - discountAmount);
  const classSection = [
    enrollment.program_name || enrollment.class_category_name,
    enrollment.section_name ? `Section ${enrollment.section_name}` : null,
  ].filter(Boolean).join(" - ");
  const values: Record<string, string> = {
    studentName: detail.full_name,
    guardianName: guardian?.guardian_name ?? "",
    fatherName: guardian?.relationship?.toLowerCase() === "father" ? guardian.guardian_name ?? "" : guardian?.guardian_name ?? "",
    motherName: guardian?.relationship?.toLowerCase() === "mother" ? guardian.guardian_name ?? "" : "",
    contactNo: detail.phone ?? guardian?.guardian_phone ?? "",
    contactNumber: detail.phone ?? guardian?.guardian_phone ?? "",
    phone: detail.phone ?? guardian?.guardian_phone ?? "",
    classAndSection: classSection,
    classSection,
    className: enrollment.program_name ?? enrollment.class_category_name ?? "",
    sectionName: enrollment.section_name ?? "",
    admissionNo: detail.admission_number ?? "",
    admissionNumber: detail.admission_number ?? "",
    rollNo: enrollment.roll_number ?? "",
    rollNumber: enrollment.roll_number ?? "",
    academicSession: enrollment.academic_year_name ?? "",
    session: enrollment.academic_year_name ?? "",
    feeType: period.duration_label || enrollment.fee_summary?.duration_label || "",
    dueDate: formatTemplateDate(period.end_date),
    slipDate: formatTemplateDate(payment?.received_at ?? new Date().toISOString()),
    paymentDate: formatTemplateDate(payment?.received_at ?? new Date().toISOString()),
    slipNumber: payment?.id ? `MPES-${payment.id}` : `MPES-${detail.id}-${period.index}`,
    paymentMode: formatLabelValue(payment?.payment_method),
    paymentMethod: formatLabelValue(payment?.payment_method),
    transactionId: payment?.transaction_id ?? "",
    bankName: payment?.payment_method === "cash" ? "NA" : "",
    remarks: payment?.remarks ?? "",
    paymentStatus: "PAID",
    totalFee: templateAmount(subtotal),
    subtotalAmount: templateAmount(subtotal),
    concessionPercent: templateAmount(discountPercent),
    discountPercent: templateAmount(discountPercent),
    concessionAmount: templateAmount(discountAmount),
    discountAmount: templateAmount(discountAmount),
    netAmountPayable: templateAmount(totalAmount),
    paymentAmount: templateAmount(totalAmount),
    totalAmount: templateAmount(totalAmount),
    paidAmount: templateAmount(totalAmount),
    paymentAmountWords: "",
  };

  for (let index = 1; index <= 20; index += 1) {
    const component = components[index - 1];
    values[`feeItem${index}Name`] = component?.title?.trim() || "NA";
    values[`feeItem${index}Amount`] = component ? templateAmount(component.amount) : "NA";
  }

  return values;
}

function parsePaymentRequestPeriodLabels(value: PaymentRequest["period_labels"]) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function PaymentRequestDetailSurface({
  request,
  open,
  isMobile,
  approving,
  rejecting,
  onOpenChange,
  onAccept,
  onReject,
}: {
  request: PaymentRequest | null;
  open: boolean;
  isMobile: boolean;
  approving: boolean;
  rejecting: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (request: PaymentRequest) => void;
  onReject: (request: PaymentRequest) => void;
}) {
  const labels = request ? parsePaymentRequestPeriodLabels(request.period_labels) : [];
  const content = request ? (
    <div className="space-y-5">
      <section className="rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Student</p>
            <h3 className="mt-1 text-xl font-semibold">{request.student_name ?? "Student"}</h3>
            <p className="text-sm text-muted-foreground">{request.student_email ?? "-"}</p>
          </div>
          <div className="rounded-md border bg-background/60 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Amount</p>
            <p className="text-xl font-bold">{formatAmount(request.total_amount)}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <DetailField label="Course" value={[
            request.program_name,
            request.section_name ? `Section ${request.section_name}` : null,
            request.academic_year_name,
          ].filter(Boolean).join(" - ") || "-"} />
          <DetailField label="Institution" value={request.institution_name ?? "-"} />
          <DetailField label="Transaction ID" value={request.transaction_id || "-"} />
          <DetailField label="Submitted" value={formatDate(request.created_at)} />
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="font-semibold">Month(s)</h4>
        <div className="overflow-hidden rounded-md border">
          {labels.length ? labels.map((period) => (
            <div key={period.index} className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0">
              <div>
                <p className="font-medium">{formatDateRange(period.start_date, period.end_date)}</p>
                <p className="text-sm text-muted-foreground">{period.duration_label}</p>
              </div>
              <p className="font-semibold">{formatAmount(period.amount)}</p>
            </div>
          )) : (
            <div className="p-4 text-sm text-muted-foreground">No period details found.</div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="font-semibold">Payment Screenshot</h4>
        {request.screenshot_url ? (
          <a
            href={request.screenshot_url}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-md border bg-muted/20"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={request.screenshot_url}
              alt="Payment screenshot"
              className="max-h-96 w-full object-contain"
            />
          </a>
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No screenshot was uploaded.
          </div>
        )}
      </section>

      {request.remarks && (
        <section className="rounded-md border bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Remarks</p>
          <p className="mt-1 text-sm">{request.remarks}</p>
        </section>
      )}
    </div>
  ) : null;

  const footer = request ? (
    <div className="flex flex-col-reverse gap-2 border-t bg-background p-4 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={approving || rejecting}>
        Cancel
      </Button>
      <Button
        type="button"
        variant="destructive"
        onClick={() => onReject(request)}
        disabled={approving || rejecting}
      >
        {rejecting ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
        Reject
      </Button>
      <Button type="button" onClick={() => onAccept(request)} disabled={approving || rejecting}>
        <CheckCircle2 className="size-4" />
        Accept Payment
      </Button>
    </div>
  ) : null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92dvh]">
          <DrawerHeader>
            <DrawerTitle>Payment Request</DrawerTitle>
            <DrawerDescription>
              Review transaction details and screenshot before accepting.
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {content}
          </div>
          <DrawerFooter>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto p-0">
        <SheetHeader className="border-b px-6 py-5 text-left">
          <SheetTitle>Payment Request</SheetTitle>
          <SheetDescription>
            Review transaction details and screenshot before accepting.
          </SheetDescription>
        </SheetHeader>
        <div className="px-6 py-5">{content}</div>
        {footer}
      </SheetContent>
    </Sheet>
  );
}

function getEnrollmentLabel(enrollment?: FeeEnrollment | null) {
  if (!enrollment) return "-";
  return [
    enrollment.program_name,
    enrollment.section_name ? `Section ${enrollment.section_name}` : null,
    enrollment.academic_year_name,
  ].filter(Boolean).join(" - ") || "-";
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium">{value || "-"}</div>
    </div>
  );
}

function DetailCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-md border bg-muted/10 p-3 ${className}`}>
      {children}
    </div>
  );
}

function DetailStackCard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 divide-y divide-border rounded-md border bg-muted/10 p-3 [&>*+*]:pt-3 [&>*:not(:last-child)]:pb-3">
      {children}
    </div>
  );
}

function getDefaultPaymentMethod(settings?: PaymentSettings | null): PaymentMethod {
  if (settings?.upi_id) return "upi";
  if (settings?.qr_image_url) return "qr";
  return "cash";
}

function PayNowDialog({
  detail,
  enrollment,
  open,
  onOpenChange,
  onPaymentRecorded,
}: {
  detail: FeeStudentDetail | null;
  enrollment: FeeEnrollment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded: () => void;
}) {
  const { accessToken } = useAuthStore();
  const isMobile = useIsMobile();
  const [selectedPeriodIndexes, setSelectedPeriodIndexes] = useState<number[]>([]);
  const [discountPercent, setDiscountPercent] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [transactionId, setTransactionId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const summary = enrollment?.fee_summary ?? null;
  const paymentSettings = detail?.payment_settings ?? null;
  const periods = useMemo(() => summary?.periods ?? [], [summary?.periods]);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      const preferredPeriod =
        (summary?.current_period && !summary.current_period.is_paid ? summary.current_period : null) ??
        periods.find((period) => !period.is_paid) ??
        null;
      setSelectedPeriodIndexes(preferredPeriod ? [preferredPeriod.index] : []);
      const availableDiscountPercent =
        Number(preferredPeriod?.payment?.discount_percent ?? 0) ||
        Number(periods.find((period) => Number(period.payment?.discount_percent ?? 0) > 0)?.payment?.discount_percent ?? 0);
      setDiscountPercent(availableDiscountPercent ? String(availableDiscountPercent) : "");
      setPaymentMethod(getDefaultPaymentMethod(paymentSettings));
      setTransactionId("");
      setRemarks("");
      setConfirmOpen(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [open, paymentSettings, periods, summary?.current_period]);

  const selectedPeriods = useMemo(
    () => periods.filter((period) => selectedPeriodIndexes.includes(period.index)),
    [periods, selectedPeriodIndexes],
  );
  const paidDetailPeriod =
    selectedPeriods.length === 1 && selectedPeriods[0]?.is_paid ? selectedPeriods[0] : null;
  const payablePeriods = selectedPeriods.filter((period) => !period.is_paid);
  const discountValue = Math.min(Math.max(Number(discountPercent || 0) || 0, 0), 100);
  const subtotal = payablePeriods.reduce((sum, period) => sum + (Number(period.amount) || 0), 0);
  const discountAmount = (subtotal * discountValue) / 100;
  const totalAmount = Math.max(subtotal - discountAmount, 0);
  const selectedPeriodLabel = selectedPeriods.length
    ? selectedPeriods.map((period) => formatDateRange(period.start_date, period.end_date)).join(", ")
    : "No month selected";
  const canUseDigitalPayment = Boolean(paymentSettings?.upi_id || paymentSettings?.qr_image_url);
  const requiresTransaction = paymentMethod === "upi" || paymentMethod === "qr";
  const splitDirection = isMobile ? "vertical" : "horizontal";
  const canSubmit =
    Boolean(detail && enrollment && payablePeriods.length && !paidDetailPeriod) &&
    (!requiresTransaction || Boolean(transactionId.trim())) &&
    (paymentMethod === "cash" || canUseDigitalPayment) &&
    !submitting;

  const togglePeriod = (periodIndex: number, checked: boolean) => {
    const period = periods.find((item) => item.index === periodIndex);
    if (period?.is_paid) {
      setSelectedPeriodIndexes([periodIndex]);
      return;
    }
    setSelectedPeriodIndexes((current) => {
      const withoutPaidPeriods = current.filter(
        (index) => !periods.find((item) => item.index === index)?.is_paid,
      );
      if (checked) return Array.from(new Set([...withoutPaidPeriods, periodIndex])).sort((a, b) => a - b);
      return current.filter((item) => item !== periodIndex);
    });
  };

  const validateBeforeConfirm = () => {
    if (!selectedPeriods.length) {
      toast.error("Select at least one fee month.");
      return;
    }
    if (requiresTransaction && !transactionId.trim()) {
      toast.error("Enter the transaction ID before confirming payment.");
      return;
    }
    if (paymentMethod !== "cash" && !canUseDigitalPayment) {
      toast.error("Payment settings are not configured for this institution.");
      return;
    }
    setConfirmOpen(true);
  };

  const submitPayment = async () => {
    if (!detail || !enrollment || !accessToken) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/students/fee-management", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: detail.id,
          enrollmentId: enrollment.id,
          institutionId: enrollment.institution_id,
          periodIndexes: selectedPeriodIndexes,
          discountPercent: discountValue,
          paymentMethod,
          transactionId: transactionId.trim(),
          remarks: remarks.trim(),
        }),
      });
      const json = await readJsonResponse(res);
      if (!res.ok) {
        throw new Error(getApiErrorMessage(json, "Failed to confirm payment"));
      }
      toast.success("Payment recorded successfully.");
      setConfirmOpen(false);
      onOpenChange(false);
      onPaymentRecorded();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[calc(100dvh-1rem)] max-h-[900px] w-[calc(100vw-1rem)] max-w-[1400px] flex-col gap-0 overflow-hidden rounded-lg border bg-background p-0 text-foreground sm:h-[90dvh] sm:w-[94vw] sm:max-w-[1400px] sm:p-0"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="flex h-14 shrink-0 flex-row items-center justify-between border-b bg-background px-5 text-foreground">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              Pay Now
            </DialogTitle>
            <DialogDescription className="sr-only">
              Select fee months, review payment details, and confirm collection.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon">
              <X className="size-4" />
              <span className="sr-only">Close payment dialog</span>
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="min-h-0 flex-1">
          <TemplateResizablePanelGroup
            id="student-fee-payment-dialog"
            direction={splitDirection}
            className="h-full w-full"
          >
            <TemplateResizablePanel
              id="student-fee-payment-fields"
              defaultSize={isMobile ? "42%" : "34%"}
              minSize={isMobile ? "16%" : "24%"}
            >
              <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:space-y-5 sm:px-5 sm:py-5 md:px-7">
              <div className="hidden sm:block">
                <h3 className="text-lg font-semibold sm:text-xl">Payment Fields</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select fee month, discount, and payment method before confirming collection.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fee Month(s)</label>
                <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border bg-muted/10 p-2 sm:max-h-64">
                  {periods.length ? (
                    periods.map((period) => {
                      const checked = selectedPeriodIndexes.includes(period.index);
                      const isPaid = Boolean(period.is_paid);
                      return (
                        <div
                          key={period.index}
                          role="button"
                          tabIndex={0}
                          onClick={() => togglePeriod(period.index, !checked)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              togglePeriod(period.index, !checked);
                            }
                          }}
                          className={`flex items-start gap-2 rounded-md border p-2.5 transition sm:gap-3 sm:p-3 ${
                            isPaid
                              ? `cursor-pointer bg-muted/30 text-muted-foreground hover:bg-green-500/10 ${checked ? "border-green-500/50 bg-green-500/10" : ""}`
                              : checked
                                ? "cursor-pointer border-destructive/50 bg-destructive/15"
                                : "cursor-pointer bg-background/70 hover:bg-destructive/10"
                          }`}
                        >
                          {isPaid ? (
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-500" />
                          ) : (
                            <Checkbox
                              checked={checked}
                              onClick={(event) => event.stopPropagation()}
                              onCheckedChange={(value) => togglePeriod(period.index, value === true)}
                              className="mt-0.5"
                            />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">
                              {formatDateRange(period.start_date, period.end_date)}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {isPaid ? "Paid" : period.duration_label}
                            </span>
                          </span>
                          <span className="font-mono text-xs font-semibold sm:text-sm">{formatAmount(period.amount)}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="p-3 text-sm text-muted-foreground">No fee schedule found.</p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount</label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={discountPercent}
                      onChange={(event) => setDiscountPercent(event.target.value)}
                      placeholder="0"
                      className="pr-10"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="flex min-w-0 items-center gap-2">
                          <WalletCards className="size-4 shrink-0" />
                          <span className="truncate">
                            {paymentMethod === "upi" ? "UPI" : paymentMethod === "qr" ? "QR Code" : "Cash"}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">Change</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      side="top"
                      sideOffset={6}
                      collisionPadding={12}
                      className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
                    >
                      <DropdownMenuLabel>Payment method</DropdownMenuLabel>
                      {(["upi", "qr", "cash"] as PaymentMethod[]).map((method) => (
                        <DropdownMenuCheckboxItem
                          key={method}
                          checked={paymentMethod === method}
                          onCheckedChange={() => setPaymentMethod(method)}
                        >
                          {method === "upi" ? "UPI" : method === "qr" ? "QR Code" : "Cash"}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {requiresTransaction && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Transaction ID</label>
                    <Input
                      value={transactionId}
                      onChange={(event) => setTransactionId(event.target.value)}
                      placeholder="Enter transaction ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Remarks</label>
                    <Textarea
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                      placeholder="Optional payment remarks..."
                      className="min-h-20 resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="shrink-0 border-t p-3 sm:p-5 md:px-7">
              <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              {paymentMethod !== "cash" && !paidDetailPeriod && (
                <Button onClick={validateBeforeConfirm} disabled={!canSubmit}>
                  {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Confirm Payment
                </Button>
              )}
              </div>
            </div>
              </div>
            </TemplateResizablePanel>

            <TemplateResizableHandle id="student-fee-payment-separator" />

            <TemplateResizablePanel
              id="student-fee-payment-preview"
              defaultSize={isMobile ? "58%" : "66%"}
              minSize={isMobile ? "16%" : "40%"}
            >
          <section className="h-full min-w-0 overflow-y-auto bg-background p-3 sm:p-6">
            <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-start">
              <div className="space-y-3 sm:space-y-4">
                {paidDetailPeriod ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b pb-3 sm:pb-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment Received</p>
                        <h3 className="mt-0.5 text-base font-semibold sm:mt-1 sm:text-xl">{detail?.full_name || "Student"}</h3>
                        <p className="text-xs text-muted-foreground sm:text-sm">
                          {formatDateRange(paidDetailPeriod.start_date, paidDetailPeriod.end_date)}
                        </p>
                      </div>
                      <div className="shrink-0 rounded-md border border-green-500/40 bg-green-500/10 px-2.5 py-2 text-right sm:px-4 sm:py-3">
                        <p className="text-[10px] uppercase tracking-wide text-green-400 sm:text-xs">Paid Amount</p>
                        <p className="text-lg font-bold text-green-400 sm:text-2xl">
                          {formatAmount(paidDetailPeriod.payment?.total_amount ?? paidDetailPeriod.paid_amount ?? 0)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="rounded-md border bg-muted/10 p-2.5 sm:p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment ID</p>
                        <p className="mt-1 font-semibold">
                          {paidDetailPeriod.payment?.id ? `#${paidDetailPeriod.payment.id}` : "-"}
                        </p>
                      </div>
                      <div className="rounded-md border bg-muted/10 p-2.5 sm:p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Method</p>
                        <p className="mt-1 font-semibold">{formatLabelValue(paidDetailPeriod.payment?.payment_method)}</p>
                      </div>
                      <div className="rounded-md border bg-muted/10 p-2.5 sm:p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Subtotal</p>
                        <p className="mt-1 font-semibold">{formatAmount(paidDetailPeriod.payment?.subtotal_amount ?? paidDetailPeriod.amount)}</p>
                      </div>
                      <div className="rounded-md border bg-muted/10 p-2.5 sm:p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Discount</p>
                        <p className="mt-1 font-semibold">
                          {formatAmount(paidDetailPeriod.payment?.discount_amount ?? 0)} ({Number(paidDetailPeriod.payment?.discount_percent ?? 0) || 0}%)
                        </p>
                      </div>
                      <div className="rounded-md border bg-muted/10 p-2.5 sm:p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Received</p>
                        <p className="mt-1 font-semibold">{formatDate(paidDetailPeriod.payment?.received_at)}</p>
                      </div>
                    </div>

                    <div className="grid gap-2 lg:grid-cols-2">
                      <div className="rounded-md border bg-muted/10 p-2.5 sm:p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Transaction ID</p>
                        <p className="mt-1 break-all font-semibold">{paidDetailPeriod.payment?.transaction_id || "-"}</p>
                      </div>
                      <div className="rounded-md border bg-muted/10 p-2.5 sm:p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Remarks</p>
                        <p className="mt-1 text-sm font-medium">{paidDetailPeriod.payment?.remarks || "-"}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                <div className="flex items-start justify-between gap-3 border-b pb-3 sm:pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment For</p>
                    <h3 className="mt-0.5 text-base font-semibold sm:mt-1 sm:text-xl">{detail?.full_name || "Student"}</h3>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      {enrollment?.program_name || "Program"} · Admission No. {detail?.admission_number || "-"}
                    </p>
                  </div>
                      <div className="shrink-0 rounded-md border bg-muted/10 px-2.5 py-2 text-right sm:px-4 sm:py-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">Amount To Collect</p>
                    <p className="text-lg font-bold sm:text-2xl">{formatAmount(totalAmount)}</p>
                  </div>
                </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-md border bg-muted/10 p-2.5 sm:p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Subtotal</p>
                    <p className="text-sm font-semibold sm:text-base">{formatAmount(subtotal)}</p>
                  </div>
                  <div className="rounded-md border bg-muted/10 p-2.5 sm:p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Discount</p>
                    <p className="text-sm font-semibold sm:text-base">{formatAmount(discountAmount)} ({discountValue}%)</p>
                  </div>
                  <div className="rounded-md border bg-muted/10 p-2.5 sm:p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected</p>
                    <p className="text-sm font-semibold sm:text-base">{payablePeriods.length} month(s)</p>
                  </div>
                </div>

                    <div className="rounded-md border bg-muted/10 p-3 sm:p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <CalendarCheck className="size-4 text-primary" />
                    {selectedPeriodLabel}
                  </p>

                  {paymentMethod === "cash" ? (
                    <div className="space-y-3">
                      <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4">
                        <p className="font-semibold text-green-400">Cash collection</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Click Cash Received after collecting the full amount from the student.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Remarks</label>
                        <Textarea
                          value={remarks}
                          onChange={(event) => setRemarks(event.target.value)}
                          placeholder="Optional cash payment remarks..."
                          className="min-h-20 resize-none bg-background"
                        />
                      </div>
                      <Button className="w-full" onClick={validateBeforeConfirm} disabled={!canSubmit}>
                        <IndianRupee className="mr-2 size-4" />
                        Cash Received
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                      <div className="flex min-h-48 items-center justify-center rounded-md border bg-background p-3">
                        {paymentSettings?.qr_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={paymentSettings.qr_image_url}
                            alt="Payment QR code"
                            className="max-h-44 max-w-full rounded-md object-contain"
                          />
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <QrCode className="mx-auto mb-2 size-10" />
                            <p className="text-sm">QR code not set</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="rounded-md border bg-background p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">UPI ID</p>
                          <p className="mt-1 break-all font-semibold">{paymentSettings?.upi_id || "UPI ID not set"}</p>
                        </div>
                        <div className="rounded-md border bg-background p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Transaction ID</p>
                          <p className="mt-1 break-all font-semibold">{transactionId.trim() || "Enter transaction ID on left"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                  </>
                )}
              </div>
            </div>
          </section>
            </TemplateResizablePanel>
          </TemplateResizablePanelGroup>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm payment?</AlertDialogTitle>
              <AlertDialogDescription>
                Record {formatAmount(totalAmount)} for {detail?.full_name || "this student"} for {selectedPeriodLabel}.
                {paymentMethod === "cash"
                  ? " Confirm only after cash is received."
                  : " Confirm only after verifying the transaction ID."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={submitPayment} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

function buildFeeStudentColumns(): ColumnDef<FeeStudent>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={Boolean(row.getIsSelected())}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "full_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 px-3"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.getValue("full_name")}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 px-3"
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("email")}</span>
      ),
    },
    {
      accessorKey: "institutions",
      header: "Institution",
      cell: ({ row }) => {
        const institutions = row.getValue("institutions") as string[];
        return (
          <span className="text-muted-foreground">
            {institutions?.length ? institutions.join(", ") : "-"}
          </span>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 px-3"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean;
        return (
          <Badge
            variant="default"
            className={
              isActive
                ? "bg-green-100 text-green-700 hover:bg-green-100"
                : "bg-red-100 text-red-700 hover:bg-red-100"
            }
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 px-3"
        >
          Joined
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatIndianDate(row.getValue("created_at"))}
        </span>
      ),
    },
  ];
}

function FeeDetailSheet({
  detail,
  loading,
  open,
  onOpenChange,
  onPaymentRecorded,
  surfaceMode = "sheet",
}: {
  detail: FeeStudentDetail | null;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded: () => void;
  surfaceMode?: "drawer" | "sheet";
}) {
  const { accessToken } = useAuthStore();
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paymentEnrollmentId, setPaymentEnrollmentId] = useState<number | null>(null);
  const [selectedFeePeriod, setSelectedFeePeriod] = useState<{
    enrollment: FeeEnrollment;
    period: FeePeriod;
  } | null>(null);
  const [invoiceTemplatePicker, setInvoiceTemplatePicker] = useState<{
    enrollment: FeeEnrollment;
    period: FeePeriod;
  } | null>(null);
  const [invoiceTemplates, setInvoiceTemplates] = useState<DocumentTemplateRow[]>([]);
  const [invoiceTemplatesLoading, setInvoiceTemplatesLoading] = useState(false);
  const [invoiceTemplateDetailLoadingId, setInvoiceTemplateDetailLoadingId] = useState<number | null>(null);
  const [invoiceTryout, setInvoiceTryout] = useState<{
    template: DocumentTemplateRow;
    enrollment: FeeEnrollment;
    period: FeePeriod;
  } | null>(null);
  const isMobile = useIsMobile();
  const shouldUseDrawer = surfaceMode === "drawer" || isMobile;
  const [drawerSnapPoint, setDrawerSnapPoint] = useState<number | string | null>(
    FEE_DETAIL_DRAWER_COLLAPSED,
  );
  const primaryEnrollment = detail?.enrollments?.[0] ?? null;
  const paymentEnrollment =
    detail?.enrollments.find((enrollment) => enrollment.id === paymentEnrollmentId) ??
    primaryEnrollment;
  const normalizedEnrollmentStatus = primaryEnrollment?.status?.trim().toLowerCase();
  const showEnrollmentStatus = Boolean(
    normalizedEnrollmentStatus && normalizedEnrollmentStatus !== "active",
  );

  const loadInvoiceTemplates = useCallback(
    async (institutionId: number | null) => {
      if (!accessToken || !institutionId) {
        setInvoiceTemplates([]);
        return;
      }
      setInvoiceTemplatesLoading(true);
      try {
        const params = new URLSearchParams({
          view: "my",
          search: "invoice",
          limit: "50",
          institutionId: String(institutionId),
        });
        const res = await fetch(`/api/admin/master-data/card-templates?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await readJsonResponse(res);
        if (!res.ok) throw new Error(getApiErrorMessage(json, "Failed to load invoice templates"));
        const templates = ((json.data ?? []) as DocumentTemplateRow[]).filter((template) => {
          const text = `${template.name} ${template.category_name}`.toLowerCase();
          return text.includes("invoice");
        });
        setInvoiceTemplates(templates);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setInvoiceTemplatesLoading(false);
      }
    },
    [accessToken],
  );

  const openInvoiceTemplatePicker = useCallback(
    (enrollment: FeeEnrollment, period: FeePeriod) => {
      setInvoiceTemplatePicker({ enrollment, period });
      void loadInvoiceTemplates(enrollment.institution_id);
    },
    [loadInvoiceTemplates],
  );

  const openInvoiceTryout = useCallback(
    async (template: DocumentTemplateRow) => {
      if (!accessToken || !invoiceTemplatePicker) return;
      setInvoiceTemplateDetailLoadingId(template.id);
      try {
        const params = new URLSearchParams({
          action: "detail",
          id: String(template.id),
        });
        if (invoiceTemplatePicker.enrollment.institution_id) {
          params.set("institutionId", String(invoiceTemplatePicker.enrollment.institution_id));
        }
        const res = await fetch(`/api/admin/master-data/card-templates?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await readJsonResponse(res);
        if (!res.ok) throw new Error(getApiErrorMessage(json, "Failed to open invoice template"));
        setInvoiceTryout({
          template: json.data as DocumentTemplateRow,
          enrollment: invoiceTemplatePicker.enrollment,
          period: invoiceTemplatePicker.period,
        });
        setInvoiceTemplatePicker(null);
        setSelectedFeePeriod(null);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setInvoiceTemplateDetailLoadingId(null);
      }
    },
    [accessToken, invoiceTemplatePicker],
  );
  const invoiceFieldValues = useMemo(() => {
    if (!invoiceTryout || !detail) return undefined;
    return buildInvoiceFieldValues(detail, invoiceTryout.enrollment, invoiceTryout.period);
  }, [
    detail,
    invoiceTryout?.enrollment.id,
    invoiceTryout?.period.index,
    invoiceTryout?.template.id,
  ]);

  const invoiceSurfaces = (
    <>
      <Dialog
        open={Boolean(invoiceTemplatePicker)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setInvoiceTemplatePicker(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              Choose Invoice Template
            </DialogTitle>
            <DialogDescription>
              Select an invoice template for this paid fee period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {invoiceTemplatesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-md" />
                <Skeleton className="h-14 w-full rounded-md" />
              </div>
            ) : invoiceTemplates.length ? (
              invoiceTemplates.map((template) => {
                const loadingTemplate = invoiceTemplateDetailLoadingId === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-md border bg-card p-3 text-left transition hover:bg-destructive/10 focus-visible:bg-destructive/10 focus-visible:outline-none"
                    onClick={() => void openInvoiceTryout(template)}
                    disabled={loadingTemplate}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{template.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {template.category_name || "Invoice"}
                      </span>
                    </span>
                    {loadingTemplate ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : (
                      <FileText className="size-4 text-primary" />
                    )}
                  </button>
                );
              })
            ) : (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No invoice templates are assigned to this institution yet.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(invoiceTryout)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setInvoiceTryout(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex h-[90dvh] max-h-[900px] w-[94vw] max-w-[1400px] flex-col gap-0 overflow-hidden rounded-lg border p-0 sm:max-w-[1400px] sm:p-0"
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="flex h-14 shrink-0 flex-row items-center justify-between border-b bg-background px-5 text-foreground">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Try {invoiceTryout?.template.name ?? "Invoice Template"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Generate a paid invoice from this student fee payment.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon">
                <X className="size-4" />
                <span className="sr-only">Close invoice tryout</span>
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="min-h-0 flex-1">
            {invoiceTryout && detail && (
              <CardTemplateTryout
                key={`${invoiceTryout.template.id}-${detail.id}-${invoiceTryout.enrollment.id}-${invoiceTryout.period.index}`}
                template={invoiceTryout.template}
                accessToken={accessToken}
                isInstitutionTryout
                institutionId={invoiceTryout.enrollment.institution_id}
                initialStudentId={detail.student_profile_id}
                initialStudentName={detail.full_name}
                initialFieldValues={invoiceFieldValues}
                lockStudentSelection
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  useEffect(() => {
    if (open) return;
    const timeout = window.setTimeout(() => setSelectedFeePeriod(null), 0);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open || !shouldUseDrawer) return;
    const timeout = window.setTimeout(() => {
      setDrawerSnapPoint(FEE_DETAIL_DRAWER_COLLAPSED);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [open, shouldUseDrawer]);

  const expandDrawer = useCallback(() => {
    setDrawerSnapPoint((current) =>
      current === FEE_DETAIL_DRAWER_EXPANDED ? current : FEE_DETAIL_DRAWER_EXPANDED,
    );
  }, []);

  if (shouldUseDrawer) {
    return (
      <>
        <Drawer
          direction="bottom"
          open={open}
          onOpenChange={(nextOpen) => {
            if (nextOpen) setDrawerSnapPoint(FEE_DETAIL_DRAWER_COLLAPSED);
            onOpenChange(nextOpen);
          }}
          snapPoints={FEE_DETAIL_DRAWER_SNAP_POINTS}
          activeSnapPoint={drawerSnapPoint}
          setActiveSnapPoint={setDrawerSnapPoint}
          fadeFromIndex={1}
        >
          <DrawerContent className="h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-hidden border-x-0 bg-background p-0">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Student Fee Details</DrawerTitle>
              <DrawerDescription>Quick profile and fee schedule.</DrawerDescription>
            </DrawerHeader>
            <div
              className="flex h-full flex-col overflow-hidden"
              onTouchStartCapture={expandDrawer}
              onTouchMoveCapture={expandDrawer}
              onWheelCapture={expandDrawer}
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 pb-3 pt-2">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <CreditCard className="size-4 text-primary" />
                    Student Fee Details
                  </h2>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    Profile, payments, and fee schedule.
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                  <X className="size-4" />
                  <span className="sr-only">Close fee details</span>
                </Button>
              </div>

              {loading ? (
                <div className="space-y-3 overflow-y-auto px-4 py-3" onScrollCapture={expandDrawer}>
                  <Skeleton className="h-24 w-full rounded-md" />
                  <Skeleton className="h-40 w-full rounded-md" />
                  <Skeleton className="h-56 w-full rounded-md" />
                </div>
              ) : detail ? (
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-8" onScrollCapture={expandDrawer}>
                  <div className="space-y-4">
                    <section className="rounded-md border p-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="size-12">
                          <AvatarImage src={detail.avatar_url ?? undefined} />
                          <AvatarFallback>{initials(detail.full_name) || "S"}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h2 className="truncate text-lg font-semibold">{detail.full_name}</h2>
                              <p className="truncate text-xs text-muted-foreground">{getEnrollmentLabel(primaryEnrollment)}</p>
                            </div>
                            <Badge
                              className={
                                detail.is_active
                                  ? "bg-green-100 text-green-700 hover:bg-green-100"
                                  : "bg-red-100 text-red-700 hover:bg-red-100"
                              }
                            >
                              {detail.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                              <DetailField label="Phone" value={<span className="flex items-center gap-1.5"><Phone className="size-3.5 text-muted-foreground" /> {detail.phone || "-"}</span>} />
                              <DetailField label="Roll" value={<span className="flex items-center gap-1.5"><Hash className="size-3.5 text-muted-foreground" /> {primaryEnrollment?.roll_number || "-"}</span>} />
                            </div>
                            <DetailField label="Email" value={<span className="flex min-w-0 items-center gap-1.5"><Mail className="size-3.5 shrink-0 text-muted-foreground" /> <span className="truncate">{detail.email}</span></span>} />
                            <DetailField label="Address" value={<span className="flex items-start gap-1.5"><MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /> <span>{detail.address || "-"}</span></span>} />
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-2">
                      <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <GraduationCap className="size-4" />
                        Student Fee Structure
                      </h3>
                      {detail.enrollments.length ? (
                        <div className="space-y-3">
                          {detail.enrollments.map((enrollment) => {
                            const summary = enrollment.fee_summary;
                            return (
                              <div key={`mobile-schedule-${enrollment.id}`} className="rounded-md border">
                                <div className="space-y-3 border-b p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate font-semibold">{enrollment.program_name || "Program"}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Duration: {summary?.duration_label || "Not set"}
                                      </p>
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setPaymentEnrollmentId(enrollment.id);
                                        setPayDialogOpen(true);
                                      }}
                                    >
                                      Pay Now
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-md border bg-muted/10 px-3 py-2">
                                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Paid Yet</p>
                                      <p className="text-sm font-semibold">{formatAmount(summary?.paid_amount ?? 0)}</p>
                                    </div>
                                    <div className="rounded-md border bg-muted/10 px-3 py-2">
                                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Fee</p>
                                      <p className="text-sm font-semibold">{formatAmount(summary?.total_payable ?? 0)}</p>
                                    </div>
                                  </div>
                                </div>
                                {summary?.periods?.length ? (
                                  <div className="divide-y">
                                    {summary.periods.map((period) => {
                                      const isPaid = Boolean(period.is_paid);
                                      return (
                                        <div
                                          key={period.index}
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => setSelectedFeePeriod({ enrollment, period })}
                                          onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                              event.preventDefault();
                                              setSelectedFeePeriod({ enrollment, period });
                                            }
                                          }}
                                          className={cn(
                                            "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-3 text-left text-sm transition hover:bg-destructive/10",
                                            isPaid && "bg-muted/20 text-muted-foreground hover:bg-green-500/10",
                                          )}
                                        >
                                          <span className="min-w-0">
                                            <span className="block font-medium">{formatDateRange(period.start_date, period.end_date)}</span>
                                            <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                              {isPaid ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-green-400">
                                                  <CheckCircle2 className="size-3" />
                                                  Paid
                                                </span>
                                              ) : (
                                                "Pending"
                                              )}
                                              <span>{period.duration_label}</span>
                                            </span>
                                          </span>
                                          <span className="flex flex-col items-end gap-2">
                                            <span className="font-mono font-semibold">{formatAmount(period.amount)}</span>
                                            {isPaid && (
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-8"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  openInvoiceTemplatePicker(enrollment, period);
                                                }}
                                              >
                                                <FileText className="mr-1 size-3.5" />
                                                Invoice
                                              </Button>
                                            )}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="p-3 text-sm text-muted-foreground">
                                    Fee schedule will appear after course duration and admission date are set.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">No student fee schedule found.</p>
                      )}
                    </section>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-6 text-sm text-muted-foreground">No student selected.</div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
        <PayNowDialog
          detail={detail}
          enrollment={paymentEnrollment}
          open={payDialogOpen}
          onOpenChange={setPayDialogOpen}
          onPaymentRecorded={onPaymentRecorded}
        />
        <Dialog
          open={Boolean(selectedFeePeriod)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setSelectedFeePeriod(null);
          }}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                Fee Month Details
              </DialogTitle>
              <DialogDescription>Quick view of this fee period and payment status.</DialogDescription>
            </DialogHeader>
            {selectedFeePeriod && (
              <div className="space-y-3">
                <div className="rounded-md border bg-muted/10 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Period</p>
                  <p className="mt-1 font-semibold">
                    {formatDateRange(selectedFeePeriod.period.start_date, selectedFeePeriod.period.end_date)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedFeePeriod.enrollment.program_name || "Program"} · {selectedFeePeriod.period.duration_label}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border bg-muted/10 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Fee</p>
                    <p className="font-semibold">{formatAmount(selectedFeePeriod.period.amount)}</p>
                  </div>
                  <div className="rounded-md border bg-muted/10 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                    <p className="font-semibold">{selectedFeePeriod.period.is_paid ? "Paid" : "Pending"}</p>
                  </div>
                </div>
                {selectedFeePeriod.period.is_paid && (
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() =>
                      openInvoiceTemplatePicker(selectedFeePeriod.enrollment, selectedFeePeriod.period)
                    }
                  >
                    <FileText className="mr-2 size-4" />
                    Generate Invoice
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
        {invoiceSurfaces}
      </>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="h-dvh w-full gap-0 overflow-hidden p-0 sm:max-w-4xl"
        defaultSize={900}
        minSize={520}
        resizeStorageKey="admin.students.fee-management.detail-sheet"
      >
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="flex items-center gap-2">
            <CreditCard className="size-5 text-primary" />
            Student Fee Details
          </SheetTitle>
          <SheetDescription>
            Quick profile, enrollment details, and program fee structure.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <Skeleton className="h-28 w-full rounded-md" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>
            <Skeleton className="h-64 w-full rounded-md" />
          </div>
        ) : detail ? (
          <div className="h-full overflow-y-auto px-6 py-5 pb-10">
            <div className="space-y-6">
              <section className="space-y-4 rounded-md border p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <Avatar size="lg" className="size-16">
                    <AvatarImage src={detail.avatar_url ?? undefined} />
                    <AvatarFallback>{initials(detail.full_name) || "S"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <h2 className="truncate text-xl font-semibold">{detail.full_name}</h2>
                      <p className="text-sm text-muted-foreground">{getEnrollmentLabel(primaryEnrollment)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        className={
                          detail.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : "bg-red-100 text-red-700 hover:bg-red-100"
                        }
                      >
                        {detail.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {showEnrollmentStatus && primaryEnrollment?.status && (
                        <Badge variant="outline" className="capitalize">
                          {primaryEnrollment.status}
                        </Badge>
                      )}
                      {detail.admission_number && (
                        <Badge variant="outline">{detail.admission_number}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 border-t pt-4 sm:grid-cols-2 xl:grid-cols-4">
                  <DetailStackCard>
                    <DetailField label="Email" value={<span className="flex min-w-0 items-center gap-2"><Mail className="size-4 shrink-0 text-muted-foreground" /> <span className="truncate">{detail.email}</span></span>} />
                    <DetailField label="Phone" value={<span className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" /> {detail.phone || "-"}</span>} />
                  </DetailStackCard>
                  <DetailStackCard>
                    <DetailField label="Admission Number" value={<span className="flex items-center gap-2"><IdCard className="size-4 text-muted-foreground" /> {detail.admission_number || "-"}</span>} />
                    <DetailField label="APAR ID" value={<span className="flex items-center gap-2"><IdCard className="size-4 text-muted-foreground" /> {detail.apar_id || "-"}</span>} />
                  </DetailStackCard>
                  <DetailStackCard>
                    <DetailField label="Admission Date" value={<span className="flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground" /> {formatDate(primaryEnrollment?.admission_date)}</span>} />
                    <DetailField label="Date of Birth" value={<span className="flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground" /> {formatDate(detail.date_of_birth)}</span>} />
                  </DetailStackCard>
                  <DetailStackCard>
                    <DetailField label="Gender" value={<span className="flex items-center gap-2"><UserRound className="size-4 text-muted-foreground" /> {formatLabelValue(detail.gender)}</span>} />
                    <DetailField label="Roll Number" value={<span className="flex items-center gap-2"><Hash className="size-4 text-muted-foreground" /> {primaryEnrollment?.roll_number || "-"}</span>} />
                  </DetailStackCard>
                  <DetailCard className="sm:col-span-2 xl:col-span-4">
                    <DetailField
                      label="Address"
                      value={<span className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> <span>{detail.address || "-"}</span></span>}
                    />
                  </DetailCard>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <UsersRound className="size-4" />
                  Parents / Guardians
                </h3>
                {detail.guardians.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {detail.guardians.map((guardian) => (
                      <div key={guardian.id} className="rounded-md border p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{guardian.guardian_name || "Guardian"}</p>
                            <p className="truncate text-sm text-muted-foreground">{guardian.guardian_email || "-"}</p>
                            <p className="text-sm text-muted-foreground">{guardian.guardian_phone || "-"}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{guardian.relationship || "Parent"}</Badge>
                            {guardian.is_primary && <Badge>Primary</Badge>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No parents or guardians linked.</p>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <GraduationCap className="size-4" />
                  Student Fee Structure
                </h3>
                {detail.enrollments.length ? (
                  <div className="space-y-3">
                    {detail.enrollments.map((enrollment) => {
                      const summary = enrollment.fee_summary;
                      return (
                        <div key={`schedule-${enrollment.id}`} className="rounded-md border">
                          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="font-semibold">{enrollment.program_name || "Program"}</p>
                              <p className="text-sm text-muted-foreground">
                                Course duration: {summary?.duration_label || "Not set"}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <div className="rounded-md border bg-muted/10 px-3 py-2">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Paid Yet</p>
                                <p className="font-semibold">{formatAmount(summary?.paid_amount ?? 0)}</p>
                              </div>
                              <div className="rounded-md border bg-muted/10 px-3 py-2">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Fee To Pay</p>
                                <p className="font-semibold">{formatAmount(summary?.total_payable ?? 0)}</p>
                              </div>
                              <Button
                                onClick={() => {
                                  setPaymentEnrollmentId(enrollment.id);
                                  setPayDialogOpen(true);
                                }}
                              >
                                Pay Now
                              </Button>
                            </div>
                          </div>
                          {summary?.periods?.length ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
                                  <tr>
                                    <th className="px-4 py-3 text-left">Period</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Duration</th>
                                    <th className="px-4 py-3 text-right">Fee</th>
                                    <th className="px-4 py-3 text-right">Invoice</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {summary.periods.map((period) => {
                                    const isPaid = Boolean(period.is_paid);
                                    return (
                                      <tr
                                        key={period.index}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedFeePeriod({ enrollment, period })}
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            setSelectedFeePeriod({ enrollment, period });
                                          }
                                        }}
                                        className={cn(
                                          "cursor-pointer transition hover:bg-destructive/10 focus-visible:bg-destructive/10 focus-visible:outline-none",
                                          isPaid && "bg-muted/20 text-muted-foreground hover:bg-green-500/10 focus-visible:bg-green-500/10",
                                        )}
                                      >
                                        <td className="px-4 py-3 font-medium">{formatDateRange(period.start_date, period.end_date)}</td>
                                        <td className="px-4 py-3">
                                          {isPaid ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                                              <CheckCircle2 className="size-3.5" />
                                              Paid
                                            </span>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">Pending</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{period.duration_label}</td>
                                        <td className="px-4 py-3 text-right font-mono">{formatAmount(period.amount)}</td>
                                        <td className="px-4 py-3 text-right">
                                          {isPaid ? (
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                openInvoiceTemplatePicker(enrollment, period);
                                              }}
                                            >
                                              <FileText className="mr-1 size-3.5" />
                                              Invoice
                                            </Button>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="p-4 text-sm text-muted-foreground">
                              Fee schedule will appear after course duration and admission date are set.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No student fee schedule found.</p>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <GraduationCap className="size-4" />
                  Program Enrolled & Fee Structure
                </h3>
                {detail.enrollments.length ? (
                  <div className="space-y-3">
                    {detail.enrollments.map((enrollment) => {
                      const enrollmentTotal = enrollment.fee_components.reduce(
                        (sum, fee) => sum + (Number(fee.amount ?? 0) || 0),
                        0,
                      );
                      return (
                        <div key={enrollment.id} className="rounded-md border">
                          <div className="border-b p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-semibold">{enrollment.program_name || "Program"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {[enrollment.institution_name, enrollment.section_name ? `Section ${enrollment.section_name}` : null, enrollment.academic_year_name].filter(Boolean).join(" - ") || "-"}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Duration: {enrollment.fee_summary?.duration_label || "Not set"}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className="w-fit border-green-500/40 bg-green-500/10 text-green-400"
                              >
                                {formatAmount(enrollmentTotal)}
                              </Badge>
                            </div>
                          </div>
                          {enrollment.fee_components.length ? (
                            <div className="divide-y">
                              {enrollment.fee_components.map((fee) => (
                                <div key={fee.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                                  <span className="font-medium">{fee.title || "Fee"}</span>
                                  <span className="font-mono text-muted-foreground">{formatFee(fee)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="p-4 text-sm text-muted-foreground">No fee structure added for this program.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No program enrollment found.</p>
                )}
              </section>
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 text-sm text-muted-foreground">No student selected.</div>
        )}
      </SheetContent>
      <PayNowDialog
        detail={detail}
        enrollment={paymentEnrollment}
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        onPaymentRecorded={onPaymentRecorded}
      />
      <Dialog
        open={Boolean(selectedFeePeriod)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedFeePeriod(null);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              Fee Month Details
            </DialogTitle>
            <DialogDescription>
              Quick view of this fee period and payment status.
            </DialogDescription>
          </DialogHeader>

          {selectedFeePeriod && (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Period</p>
                    <p className="mt-1 font-semibold">
                      {formatDateRange(selectedFeePeriod.period.start_date, selectedFeePeriod.period.end_date)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedFeePeriod.enrollment.program_name || "Program"} · {selectedFeePeriod.period.duration_label}
                    </p>
                  </div>
                  {selectedFeePeriod.period.is_paid ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="w-fit border-green-500/40 bg-green-500/10 text-green-400"
                      >
                        <CheckCircle2 className="mr-1 size-3.5" />
                        Paid
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          openInvoiceTemplatePicker(selectedFeePeriod.enrollment, selectedFeePeriod.period)
                        }
                      >
                        <FileText className="mr-1.5 size-4" />
                        Generate Invoice
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="outline" className="w-fit">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border bg-muted/10 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Fee Amount</p>
                  <p className="mt-1 font-semibold">{formatAmount(selectedFeePeriod.period.amount)}</p>
                </div>
                <div className="rounded-md border bg-muted/10 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Paid Amount</p>
                  <p className="mt-1 font-semibold">
                    {formatAmount(selectedFeePeriod.period.paid_amount ?? 0)}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/10 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Remaining</p>
                  <p className="mt-1 font-semibold">
                    {formatAmount(selectedFeePeriod.period.remaining_amount ?? selectedFeePeriod.period.amount)}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/10 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment ID</p>
                  <p className="mt-1 font-semibold">
                    {selectedFeePeriod.period.payment?.id ? `#${selectedFeePeriod.period.payment.id}` : "-"}
                  </p>
                </div>
              </div>

              {selectedFeePeriod.period.payment && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border bg-muted/10 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Method</p>
                    <p className="mt-1 font-semibold">
                      {formatLabelValue(selectedFeePeriod.period.payment.payment_method)}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/10 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Received Date</p>
                    <p className="mt-1 font-semibold">
                      {formatDate(selectedFeePeriod.period.payment.received_at)}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/10 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Discount</p>
                    <p className="mt-1 font-semibold">
                      {formatAmount(selectedFeePeriod.period.payment.discount_amount ?? 0)} (
                      {Number(selectedFeePeriod.period.payment.discount_percent ?? 0) || 0}%)
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/10 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Transaction ID</p>
                    <p className="mt-1 break-all font-semibold">
                      {selectedFeePeriod.period.payment.transaction_id || "-"}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/10 p-3 sm:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Remarks</p>
                    <p className="mt-1 text-sm font-medium">
                      {selectedFeePeriod.period.payment.remarks || "-"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {invoiceSurfaces}
    </Sheet>
  );
}

export default function FeeManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { accessToken, clearAuth } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const activeAcademicYearId = useActiveAcademicYearId(activeInstitution?.id);
  const [students, setStudents] = useState<FeeStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedStudents, setHasLoadedStudents] = useState(false);
  const [pageCount, setPageCount] = useState(-1);
  const [totalRows, setTotalRows] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSurfaceMode, setDetailSurfaceMode] = useState<"drawer" | "sheet">("sheet");
  const [selectedStudent, setSelectedStudent] = useState<FeeStudentDetail | null>(null);
  const activeTab: "fees" | "requests" =
    searchParams.get("tab") === "payment_requests" ? "requests" : "fees";
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [requestSearch, setRequestSearch] = useState("");
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [approvalRequest, setApprovalRequest] = useState<PaymentRequest | null>(null);
  const [rejectionRequest, setRejectionRequest] = useState<PaymentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvingRequest, setApprovingRequest] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState(false);
  const [filters, setFilters] = usePersistedState<StudentFilters>(
    "admin.students.fee-management.filters",
    getDefaultStudentFilters,
    { version: 1, validate: isStudentFilters },
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const fetchStudentsRequestIdRef = useRef(0);
  const fetchStudentsAbortRef = useRef<AbortController | null>(null);
  const fetchDetailRequestIdRef = useRef(0);
  const fetchRequestsRequestIdRef = useRef(0);

  const updateActiveTab = useCallback((tab: "fees" | "requests") => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "requests") {
      params.set("tab", "payment_requests");
    } else {
      params.delete("tab");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  const authHeader = useCallback(
    () => ({
      Authorization: `Bearer ${accessToken}`,
    }),
    [accessToken],
  );

  const handleAuthError = useCallback(() => {
    clearAuth();
    toast.error("Session expired. Please log in again.");
    router.push("/");
  }, [clearAuth, router]);

  const fetchStudents = useCallback(async () => {
    if (!accessToken) return;

    const requestId = ++fetchStudentsRequestIdRef.current;
    fetchStudentsAbortRef.current?.abort();
    const abortController = new AbortController();
    fetchStudentsAbortRef.current = abortController;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (filters.search.trim()) params.set("search", filters.search.trim());
      if (filters.programId) params.set("programId", filters.programId);
      if (filters.sectionId) params.set("sectionId", filters.sectionId);
      if (activeAcademicYearId) params.set("academicYearId", String(activeAcademicYearId));
      if (activeInstitution) {
        params.set("institutionId", String(activeInstitution.id));
      }

      const res = await fetch(`/api/admin/students/fee-management?${params.toString()}`, {
        headers: authHeader(),
        signal: abortController.signal,
      });
      if (requestId !== fetchStudentsRequestIdRef.current) return;
      const json = await readJsonResponse(res);

      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        if (res.status === 403) {
          throw new Error(
            getApiErrorMessage(
              json,
              "You don't have permission to view fee management.",
            ),
          );
        }
        throw new Error(getApiErrorMessage(json, "Failed to fetch students"));
      }

      if (requestId !== fetchStudentsRequestIdRef.current) return;
      setStudents(json.data ?? []);
      setPageCount(json.pageCount ?? -1);
      setTotalRows(Number(json.total ?? 0));
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (requestId !== fetchStudentsRequestIdRef.current) return;
      toast.error(getErrorMessage(err));
    } finally {
      if (requestId === fetchStudentsRequestIdRef.current) {
        setLoading(false);
        setHasLoadedStudents(true);
        fetchStudentsAbortRef.current = null;
      }
    }
  }, [
    accessToken,
    activeInstitution,
    activeAcademicYearId,
    authHeader,
    filters,
    handleAuthError,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  const openStudentDetail = useCallback(async (student: FeeStudent) => {
    if (!accessToken) return;
    const requestId = ++fetchDetailRequestIdRef.current;
    const nextSurfaceMode =
      typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
        ? "drawer"
        : "sheet";
    setDetailSurfaceMode(nextSurfaceMode);
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedStudent(null);
    try {
      const params = new URLSearchParams({
        action: "detail",
        studentId: String(student.id),
      });
      if (activeInstitution) {
        params.set("institutionId", String(activeInstitution.id));
      }
      const res = await fetch(`/api/admin/students/fee-management?${params.toString()}`, {
        headers: authHeader(),
      });
      const json = await readJsonResponse(res);
      if (requestId !== fetchDetailRequestIdRef.current) return;
      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(getApiErrorMessage(json, "Failed to load fee details"));
      }
      setSelectedStudent(json.data ?? null);
    } catch (err: unknown) {
      if (requestId === fetchDetailRequestIdRef.current) {
        toast.error(getErrorMessage(err));
        setSelectedStudent(null);
      }
    } finally {
      if (requestId === fetchDetailRequestIdRef.current) setDetailLoading(false);
    }
  }, [accessToken, activeInstitution, authHeader, handleAuthError]);

  const fetchPaymentRequests = useCallback(async () => {
    if (!accessToken) return;
    const requestId = ++fetchRequestsRequestIdRef.current;
    setRequestsLoading(true);
    try {
      const params = new URLSearchParams({ action: "payment_requests" });
      if (activeInstitution) {
        params.set("institutionId", String(activeInstitution.id));
      }
      const res = await fetch(`/api/admin/students/fee-management?${params.toString()}`, {
        headers: authHeader(),
        cache: "no-store",
      });
      const json = await readJsonResponse(res);
      if (requestId !== fetchRequestsRequestIdRef.current) return;
      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(getApiErrorMessage(json, "Failed to fetch payment requests"));
      }
      setPaymentRequests(
        (json.data ?? []).map((request: PaymentRequest) => ({
          ...request,
          search_text: [
            request.student_name,
            request.student_email,
            request.program_name,
            request.institution_name,
            request.transaction_id,
            request.admission_number,
            request.class_category_name,
            request.section_name,
            request.academic_year_name,
          ].filter(Boolean).join(" ").toLowerCase(),
        })),
      );
    } catch (err: unknown) {
      if (requestId === fetchRequestsRequestIdRef.current) {
        toast.error(getErrorMessage(err));
      }
    } finally {
      if (requestId === fetchRequestsRequestIdRef.current) {
        setRequestsLoading(false);
      }
    }
  }, [accessToken, activeInstitution, authHeader, handleAuthError]);

  const approvePaymentRequest = useCallback(async () => {
    if (!accessToken || !approvalRequest) return;
    setApprovingRequest(true);
    try {
      const res = await fetch("/api/admin/students/fee-management", {
        method: "POST",
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "approve_payment_request",
          paymentRequestId: approvalRequest.id,
        }),
      });
      const json = await readJsonResponse(res);
      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(getApiErrorMessage(json, "Failed to approve payment request"));
      }
      toast.success("Payment verified and reflected in student fees.");
      setApprovalRequest(null);
      setSelectedRequest(null);
      await fetchPaymentRequests();
      void fetchStudents();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setApprovingRequest(false);
    }
  }, [accessToken, approvalRequest, authHeader, fetchPaymentRequests, fetchStudents, handleAuthError]);

  const rejectPaymentRequest = useCallback(async () => {
    if (!accessToken || !rejectionRequest) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      toast.error("Enter a rejection reason.");
      return;
    }
    setRejectingRequest(true);
    try {
      const res = await fetch("/api/admin/students/fee-management", {
        method: "POST",
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reject_payment_request",
          paymentRequestId: rejectionRequest.id,
          rejectionReason: reason,
        }),
      });
      const json = await readJsonResponse(res);
      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(getApiErrorMessage(json, "Failed to reject payment request"));
      }
      toast.success("Payment request rejected.");
      setRejectionRequest(null);
      setRejectionReason("");
      setSelectedRequest(null);
      await fetchPaymentRequests();
      void fetchStudents();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setRejectingRequest(false);
    }
  }, [
    accessToken,
    authHeader,
    fetchPaymentRequests,
    fetchStudents,
    handleAuthError,
    rejectionReason,
    rejectionRequest,
  ]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPagination((prev) =>
        prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
      );
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [
    activeInstitution?.id,
    activeAcademicYearId,
    filters.academicYearId,
    filters.programId,
    filters.search,
    filters.sectionId,
  ]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchStudents();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fetchStudents]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchPaymentRequests();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fetchPaymentRequests]);

  const updateFilters = useCallback((nextFilters: StudentFilters) => {
    setFilters(nextFilters);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [setFilters]);

  const resetFilters = useCallback(() => {
    setFilters((current) => ({
      ...getDefaultStudentFilters(),
      search: current.search,
    }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [setFilters]);

  const activeFilterCount = useMemo(
    () => [
      filters.programId,
      filters.sectionId,
      filters.academicYearId,
    ].filter(Boolean).length,
    [filters.academicYearId, filters.programId, filters.sectionId],
  );

  const filteredPaymentRequests = useMemo(() => {
    const search = requestSearch.trim().toLowerCase();
    if (!search) return paymentRequests;
    return paymentRequests.filter((request) =>
      [
        request.student_name,
        request.transaction_id,
        request.student_email,
        request.program_name,
      ].filter(Boolean).join(" ").toLowerCase().includes(search),
    );
  }, [paymentRequests, requestSearch]);

  const studentColumns = useMemo(() => buildFeeStudentColumns(), []);

  const paymentRequestColumns = useMemo<ColumnDef<PaymentRequest>[]>(
    () => [
      {
        accessorKey: "student_name",
        header: "Student",
        cell: ({ row }) => (
          <div>
            <div className="font-semibold">{row.original.student_name ?? "Student"}</div>
            <div className="text-sm text-muted-foreground">{row.original.student_email ?? "-"}</div>
          </div>
        ),
      },
      {
        id: "course",
        header: "Course",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.program_name ?? "Course"}</div>
            <div className="text-sm text-muted-foreground">
              {[
                row.original.class_category_name,
                row.original.section_name ? `Section ${row.original.section_name}` : null,
                row.original.academic_year_name,
              ].filter(Boolean).join(" - ") || row.original.institution_name || "-"}
            </div>
          </div>
        ),
      },
      {
        id: "periods",
        header: "Month(s)",
        cell: ({ row }) => {
          const labels = parsePaymentRequestPeriodLabels(row.original.period_labels);
          return (
            <div className="max-w-72 space-y-1">
              {labels.length ? labels.map((period) => (
                <div key={period.index} className="text-sm">
                  {formatDateRange(period.start_date, period.end_date)}
                </div>
              )) : "-"}
            </div>
          );
        },
      },
      {
        accessorKey: "total_amount",
        header: "Amount",
        cell: ({ row }) => <span className="font-semibold">{formatAmount(row.original.total_amount)}</span>,
      },
      {
        accessorKey: "transaction_id",
        header: "Transaction ID",
        cell: ({ row }) => row.original.transaction_id || "-",
      },
      {
        id: "screenshot",
        header: "Screenshot",
        cell: ({ row }) => row.original.screenshot_url ? (
          <a
            href={row.original.screenshot_url}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline-offset-4 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            View
          </a>
        ) : "-",
      },
      {
        id: "submitted",
        header: "Submitted",
        cell: ({ row }) => formatDate(row.original.created_at),
      },
    ],
    [],
  );

  if (loading && !hasLoadedStudents) {
    return (
      <div className="space-y-4">
        <div>
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fee Management</h1>
        <p className="text-muted-foreground">
          Manage student fees, payments, and dues from enrolled student records.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={activeTab === "fees" ? "default" : "outline"}
          onClick={() => updateActiveTab("fees")}
        >
          <CreditCard className="size-4" />
          Fee Management
        </Button>
        <Button
          type="button"
          variant={activeTab === "requests" ? "default" : "outline"}
          className="relative pr-8"
          onClick={() => updateActiveTab("requests")}
        >
          <WalletCards className="size-4" />
          Payment Requests
          {paymentRequests.length > 0 && (
            <Badge className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold leading-none text-white shadow-sm ring-2 ring-background hover:bg-red-500">
              {paymentRequests.length}
            </Badge>
          )}
        </Button>
      </div>

      <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:overflow-visible sm:px-0">
        {activeTab === "fees" ? (
          <DataTable
            columns={studentColumns}
            data={students}
            totalRows={totalRows}
            toolbarLeft={
              <>
                <div className="flex w-full min-w-0 gap-2 sm:w-auto">
                  <DebouncedSearchInput
                    value={filters.search}
                    onValueChange={(search) => updateFilters({ ...filters, search })}
                    placeholder="Search name, ID, roll, email..."
                    className="min-w-0 flex-1 sm:w-80 sm:flex-none"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => void fetchStudents()}
                    disabled={loading}
                    aria-label="Refresh fee students"
                  >
                    <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                  </Button>
                </div>
                <div className="min-w-0 flex-1 sm:flex-none">
                  <StudentFiltersDrawer
                    filters={filters}
                    activeCount={activeFilterCount}
                    accessToken={accessToken}
                    institutionId={activeInstitution?.id}
                    onApply={updateFilters}
                    onReset={resetFilters}
                  />
                </div>
              </>
            }
            manualPagination
            pageCount={pageCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            loading={loading}
            emptyText={
              filters.search.trim()
                ? `No students match "${filters.search.trim()}". Clear the search to view all students.`
                : "No students found."
            }
            onRowClick={openStudentDetail}
          />
        ) : (
          <DataTable
            columns={paymentRequestColumns}
            data={filteredPaymentRequests}
            toolbarLeft={
              <div className="flex w-full min-w-0 gap-2 sm:w-auto">
                <DebouncedSearchInput
                  value={requestSearch}
                  onValueChange={setRequestSearch}
                  placeholder="Search student or transaction ID..."
                  className="min-w-0 flex-1 sm:w-80 sm:flex-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => void fetchPaymentRequests()}
                  disabled={requestsLoading}
                  aria-label="Refresh payment requests"
                >
                  <RefreshCw className={cn("size-4", requestsLoading && "animate-spin")} />
                </Button>
              </div>
            }
            loading={requestsLoading}
            emptyText="No pending payment requests."
            onRowClick={(request) => setSelectedRequest(request)}
          />
        )}
      </div>

      <FeeDetailSheet
        detail={selectedStudent}
        loading={detailLoading}
        open={detailOpen}
        surfaceMode={detailSurfaceMode}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelectedStudent(null);
            setDetailLoading(false);
          }
        }}
        onPaymentRecorded={() => {
          if (!selectedStudent) return;
          const student = students.find((item) => item.id === selectedStudent.id);
          if (student) {
            void openStudentDetail(student);
          }
        }}
      />

      <PaymentRequestDetailSurface
        request={selectedRequest}
        open={Boolean(selectedRequest)}
        isMobile={isMobile}
        approving={approvingRequest}
        rejecting={rejectingRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
        onAccept={(request) => setApprovalRequest(request)}
        onReject={(request) => {
          setRejectionReason("");
          setRejectionRequest(request);
        }}
      />

      <AlertDialog open={Boolean(approvalRequest)} onOpenChange={(open) => !open && setApprovalRequest(null)}>
        <AlertDialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <AlertDialogHeader className="shrink-0 border-b px-5 py-4">
            <AlertDialogTitle>Verify payment request?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm only after matching the screenshot and transaction ID with the received payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {approvalRequest && (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Student</p>
                  <p className="font-semibold">{approvalRequest.student_name ?? "Student"}</p>
                  <p className="text-muted-foreground">{approvalRequest.student_email ?? "-"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Amount</p>
                  <p className="font-semibold">{formatAmount(approvalRequest.total_amount)}</p>
                  <p className="text-muted-foreground">Transaction ID: {approvalRequest.transaction_id || "-"}</p>
                </div>
              </div>
              {approvalRequest.screenshot_url ? (
                <a
                  href={approvalRequest.screenshot_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex max-h-[40dvh] items-center justify-center overflow-hidden rounded-md border bg-muted/20"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={approvalRequest.screenshot_url}
                    alt="Payment screenshot"
                    className="max-h-[40dvh] w-full object-contain"
                  />
                </a>
              ) : (
                <div className="rounded-md border border-dashed p-4 text-muted-foreground">
                  No screenshot was uploaded.
                </div>
              )}
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                Are you sure you verified this transaction ID and want to confirm the payment?
              </div>
            </div>
          )}
          <AlertDialogFooter className="shrink-0 border-t bg-background px-5 py-4">
            <AlertDialogCancel disabled={approvingRequest}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={approvingRequest}
              onClick={(event) => {
                event.preventDefault();
                void approvePaymentRequest();
              }}
            >
              {approvingRequest ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(rejectionRequest)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectionRequest(null);
            setRejectionReason("");
          }
        }}
      >
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Reject payment request?</AlertDialogTitle>
            <AlertDialogDescription>
              Add the reason clearly. This reason will be shown to the student and parent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {rejectionRequest && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Student</p>
                  <p className="font-semibold">{rejectionRequest.student_name ?? "Student"}</p>
                  <p className="text-muted-foreground">{rejectionRequest.student_email ?? "-"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Amount</p>
                  <p className="font-semibold">{formatAmount(rejectionRequest.total_amount)}</p>
                  <p className="text-muted-foreground">Transaction ID: {rejectionRequest.transaction_id || "-"}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="payment-rejection-reason">
                  Reject reason *
                </label>
                <Textarea
                  id="payment-rejection-reason"
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Example: Transaction ID does not match the payment screenshot."
                  rows={4}
                  disabled={rejectingRequest}
                />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejectingRequest}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={rejectingRequest || !rejectionReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void rejectPaymentRequest();
              }}
            >
              {rejectingRequest ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
              Reject Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
