"use client";

import { type ComponentType, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, IndianRupee, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { MonthPicker } from "@/components/shared/month-picker";
import { ResponsiveDetailSurface } from "@/components/shared/responsive-detail-surface";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";

type SalaryMode = "admin" | "self";

type SalaryComponent = {
  label: string;
  amount: string | number;
};

type PaymentHistoryRow = {
  salary_month: string;
  base_salary: string | number;
  deduction_amount: string | number;
  bonus_amount?: string | number;
  manual_deduction?: string | number;
  payable_salary: string | number;
  remarks?: string | null;
  status: "PAID";
  paid_at?: string | null;
  paid_by_name?: string | null;
};

type SalaryRow = {
  staff_user_id: number;
  full_name: string;
  email?: string | null;
  role_code: string;
  role_name?: string;
  join_date?: string | null;
  components: SalaryComponent[];
  base_salary: number;
  per_day_salary: number;
  deduction_days: number;
  deduction_amount: number;
  payable_salary: number;
  paid_days: number;
  days_in_month: number;
  working_days: number;
  elapsed_working_days: number;
  present_days: number;
  late_days: number;
  half_days: number;
  absent_days: number;
  leave_days: number;
  payout_id?: number | null;
  payout_status?: "PAID" | null;
  paid_amount?: number | null;
  paid_bonus?: number;
  paid_manual_deduction?: number;
  paid_remarks?: string;
  paid_at?: string | null;
  paid_by_name?: string | null;
  payment_history?: PaymentHistoryRow[];
};

type ExpenseRow = {
  salary_month: string;
  paid_count: number;
  paid_total: number;
  last_paid_at?: string | null;
};

type PaidHistoryRow = {
  id: number;
  staff_user_id: number;
  full_name: string;
  email?: string | null;
  role_code: string;
  role_name?: string;
  join_date?: string | null;
  salary_month: string;
  base_salary: number;
  deduction_amount: number;
  bonus_amount?: number;
  manual_deduction?: number;
  payable_salary: number;
  remarks?: string;
  status: "PAID";
  paid_at?: string | null;
  paid_by_name?: string | null;
};

type PayTarget = SalaryRow | "selected" | null;

type UnpaidSalaryRow = {
  staff_user_id: number;
  full_name: string;
  email?: string | null;
  role_code: string;
  role_name?: string;
  salary_month: string;
  base_salary: number;
  per_day_salary: number;
  paid_days: number;
  working_days: number;
  elapsed_working_days: number;
  deduction_days: number;
  deduction_amount: number;
  payable_salary: number;
};

type PayPlanRow = {
  staff_user_id: number;
  full_name: string;
  salary_month: string;
  per_day_salary: number;
  paid_days: number;
  working_days: number;
  deduction_amount: number;
  payable_salary: number;
  isPreviousDue: boolean;
};

type SalaryTab = {
  value: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function currency(value: number | string) {
  return Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function roleLabel(roleCode: string, roleName?: string) {
  if (roleName) return roleName;
  if (!roleCode) return "Staff";
  if (roleCode.toLowerCase() === "teacher") return "Teacher";
  if (roleCode.toLowerCase() === "driver") return "Driver";
  return roleCode
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SalarySkeleton({ columns = 7 }: { columns?: number }) {
  return (
    <>
      {Array.from({ length: 6 }, (_, index) => (
        <tr key={index} className="border-b border-border/70">
          {Array.from({ length: columns }, (_, cell) => (
            <td key={cell} className="px-4 py-3">
              <Skeleton className="h-5 w-full max-w-40" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function PaidHistorySkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <tr key={index} className="border-b border-border/70">
          {Array.from({ length: columns }, (_, cell) => (
            <td key={cell} className="px-4 py-3">
              <Skeleton className="h-5 w-full max-w-40" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "danger" | "success" }) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={tone === "danger" ? "text-lg font-semibold text-destructive" : tone === "success" ? "text-lg font-semibold text-emerald-200" : "text-lg font-semibold"}>
        {value}
      </div>
    </div>
  );
}

function AttendanceText({ row }: { row: SalaryRow }) {
  return (
    <div className="text-muted-foreground">
      <div className="flex items-center gap-1 text-foreground">
        <CalendarDays className="size-4" />
        Present {row.paid_days} / {row.working_days} working days
      </div>
      <div>
        Present {row.present_days + row.late_days}, Half {row.half_days}, Absent {row.absent_days}, Leave {row.leave_days}
      </div>
    </div>
  );
}

function SalaryComponents({ row }: { row: SalaryRow }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-background/40">
      {row.components.length ? row.components.map((component, index) => (
        <div
          key={`${component.label}-${index}`}
          className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-2.5 last:border-b"
        >
          <span>{component.label}</span>
          <span className="font-semibold">{currency(component.amount)}</span>
        </div>
      )) : (
        <div className="border-b border-border/70 p-3 text-sm text-muted-foreground">
          No salary components added.
        </div>
      )}
      <div className="flex items-center justify-between gap-3 bg-muted/30 px-3 py-2.5">
        <span className="font-medium text-foreground">Total salary structure</span>
        <span className="font-semibold">{currency(row.base_salary)}</span>
      </div>
    </div>
  );
}

function PaidHistoryTable({
  rows,
  loading,
  mode,
  onRowClick,
}: {
  rows: PaidHistoryRow[];
  loading: boolean;
  mode: SalaryMode;
  onRowClick: (row: PaidHistoryRow) => void;
}) {
  const columns = mode === "admin" ? 7 : 6;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-border bg-muted/30 text-left">
          <tr>
            {mode === "admin" && <th className="px-4 py-3">Staff</th>}
            <th className="px-4 py-3">Month</th>
            <th className="px-4 py-3">Base Salary</th>
            <th className="px-4 py-3">Deduction</th>
            <th className="px-4 py-3">Paid Amount</th>
            <th className="px-4 py-3">Paid By</th>
            <th className="px-4 py-3">Paid At</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <PaidHistorySkeleton columns={columns} />
          ) : rows.length ? rows.map((history) => (
            <tr
              key={history.id}
              className="cursor-pointer border-b border-border/70 align-top transition-colors hover:bg-muted/30"
              onClick={() => onRowClick(history)}
            >
              {mode === "admin" && (
                <td className="px-4 py-3">
                  <div className="font-semibold">{history.full_name}</div>
                  <div className="text-xs text-muted-foreground">{history.email}</div>
                </td>
              )}
              <td className="px-4 py-3 font-semibold">{formatMonth(history.salary_month)}</td>
              <td className="px-4 py-3">{currency(history.base_salary)}</td>
              <td className="px-4 py-3 text-destructive">{currency(history.deduction_amount)}</td>
              <td className="px-4 py-3 font-semibold text-emerald-200">{currency(history.payable_salary)}</td>
              <td className="px-4 py-3 text-muted-foreground">{history.paid_by_name || "-"}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDateTime(history.paid_at)}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={columns} className="px-4 py-12 text-center text-muted-foreground">
                No paid salary history found for this month.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PaidHistoryDetailSurface({
  row,
  open,
  onOpenChange,
}: {
  row: PaidHistoryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const title = row ? `${formatMonth(row.salary_month)} Salary Paid` : "Paid salary";
  const description = row
    ? `${row.full_name} salary payment details`
    : undefined;

  return (
    <ResponsiveDetailSurface
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      sheetClassName="sm:max-w-xl"
      drawerClassName="h-[88dvh] max-h-[88dvh]"
      bodyClassName="px-4 sm:px-6"
    >
      {row && (
        <div className="space-y-5 pb-6">
          <section className="grid grid-cols-2 gap-3">
            <StatCard label="Staff" value={row.full_name} />
            <StatCard label="Role" value={roleLabel(row.role_code)} />
            <StatCard label="Joining Date" value={formatDate(row.join_date)} />
            <StatCard label="Month" value={formatMonth(row.salary_month)} />
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Payment Summary</h3>
            <div className="overflow-hidden rounded-md border border-border bg-background/40">
              <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-2.5">
                <span className="text-muted-foreground">Base Salary</span>
                <span className="font-semibold">{currency(row.base_salary)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-2.5">
                <span className="text-muted-foreground">Attendance Deductions</span>
                <span className="font-semibold text-destructive">{currency(row.deduction_amount)}</span>
              </div>
              {Number(row.bonus_amount || 0) > 0 && (
                <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-2.5">
                  <span className="text-emerald-500 font-medium">+ Extra Bonus / Incentive</span>
                  <span className="font-semibold text-emerald-400">+{currency(row.bonus_amount || 0)}</span>
                </div>
              )}
              {Number(row.manual_deduction || 0) > 0 && (
                <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-2.5">
                  <span className="text-rose-500 font-medium">- Extra Manual Deduction</span>
                  <span className="font-semibold text-rose-400">-{currency(row.manual_deduction || 0)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 bg-muted/30 px-3 py-2.5">
                <span className="font-medium text-foreground">Net Paid Amount</span>
                <span className="font-semibold text-emerald-200">{currency(row.payable_salary)}</span>
              </div>
              {row.remarks && (
                <div className="border-t border-border/70 px-3 py-2.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Remarks: </span>
                  {row.remarks}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Payment Details</h3>
            <div className="space-y-3 rounded-md border border-border bg-background/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <Badge className="inline-flex rounded-md border-emerald-500/40 bg-emerald-500/15 text-emerald-200">
                  <CheckCircle2 className="size-3.5" />
                  Paid
                </Badge>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Paid by</span>
                <span className="max-w-56 text-right font-medium break-words">{row.paid_by_name || "-"}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Paid at</span>
                <span className="max-w-56 text-right text-muted-foreground break-words">{formatDateTime(row.paid_at)}</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </ResponsiveDetailSurface>
  );
}

function PaymentStatus({ row }: { row: SalaryRow }) {
  if (row.payout_status === "PAID") {
    return (
      <div className="space-y-1">
        <Badge className="inline-flex rounded-md border-emerald-500/40 bg-emerald-500/15 text-emerald-200">
          <CheckCircle2 className="size-3.5" />
          Paid
        </Badge>
        <div className="text-xs text-muted-foreground">{formatDateTime(row.paid_at)}</div>
      </div>
    );
  }
  return <Badge variant="outline" className="rounded-md">Unpaid</Badge>;
}

function SalaryTabButtons({
  tabs,
  value,
  onChange,
}: {
  tabs: SalaryTab[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.value === value;
            return (
              <Button
                key={tab.value}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                className="shrink-0"
                data-active-tab={active ? "true" : undefined}
                onClick={(event) => {
                  event.currentTarget.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "center",
                  });
                  onChange(tab.value);
                }}
              >
                <Icon className="size-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SalaryDetailSheet({
  row,
  month,
  open,
  onOpenChange,
}: {
  row: SalaryRow | null;
  month: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const title = row?.full_name ?? "Salary sheet";
  const description = row
    ? `${roleLabel(row.role_code)} salary sheet for ${formatMonth(month)}`
    : undefined;

  return (
    <ResponsiveDetailSurface
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      sheetClassName="sm:max-w-2xl"
      drawerClassName="h-[92dvh] max-h-[92dvh]"
      bodyClassName="px-4 sm:px-6"
    >
      {row && (
        <div className="space-y-5 pb-6">
              <section className="grid grid-cols-2 gap-3">
                <StatCard label="Joining Date" value={formatDate(row.join_date)} />
                <StatCard label="Role" value={roleLabel(row.role_code)} />
                <StatCard label="Working Days" value={`${row.working_days}`} />
                <StatCard label="Payable Days (Attendance)" value={`${row.paid_days}`} />
                <StatCard label="Deduction" value={currency(row.deduction_amount)} tone="danger" />
                <StatCard label="Payable" value={currency(row.payable_salary)} tone="success" />
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold">Salary Structure</h3>
                <SalaryComponents row={row} />
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold">This Month Attendance</h3>
                <div className="rounded-md border border-border bg-background/40 p-3">
                  <AttendanceText row={row} />
                  <div className="mt-2 text-xs text-muted-foreground">
                    Per working day: {currency(row.per_day_salary)}. Sundays and institute calendar holidays are excluded.
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold">This Month Payment</h3>
                <div className="space-y-3 rounded-md border border-border bg-background/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Status</span>
                    {row.payout_status === "PAID" ? (
                      <div className="min-w-0 text-right">
                        <Badge className="inline-flex rounded-md border-emerald-500/40 bg-emerald-500/15 text-emerald-200">
                          <CheckCircle2 className="size-3.5" />
                          Paid
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant="outline" className="rounded-md">Unpaid</Badge>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold text-emerald-200">{currency(row.payable_salary)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Paid at</span>
                    <span className="max-w-56 text-right text-sm text-muted-foreground break-words">
                      {formatDateTime(row.paid_at)}
                    </span>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="font-semibold">Payment History</h3>
                <div className="overflow-hidden rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/30 text-left">
                      <tr>
                        <th className="px-3 py-2">Month</th>
                        <th className="px-3 py-2">Paid</th>
                        <th className="px-3 py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.payment_history?.length ? row.payment_history.map((history) => (
                        <tr key={`${history.salary_month}-${history.paid_at}`} className="border-b border-border/70">
                          <td className="px-3 py-2">{formatMonth(history.salary_month)}</td>
                          <td className="px-3 py-2 font-semibold">{currency(history.payable_salary)}</td>
                          <td className="px-3 py-2 text-muted-foreground">{formatDateTime(history.paid_at)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                            No payment history found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
        </div>
      )}
    </ResponsiveDetailSurface>
  );
}

export function StaffSalaryClient({ mode }: { mode: SalaryMode }) {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const [month, setMonth] = useState(currentMonth());
  const [tab, setTab] = useState("salary");
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [paidHistory, setPaidHistory] = useState<PaidHistoryRow[]>([]);
  const [unpaidSalary, setUnpaidSalary] = useState<UnpaidSalaryRow[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [detailRow, setDetailRow] = useState<SalaryRow | null>(null);
  const [paidHistoryDetail, setPaidHistoryDetail] = useState<PaidHistoryRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payTarget, setPayTarget] = useState<PayTarget>(null);

  const authHeaders = useMemo(
    () => accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    [accessToken]
  );
  const institutionId = activeInstitution?.id ? String(activeInstitution.id) : "";

  const loadSalary = useCallback(async () => {
    if (!isReady || !authHeaders || !institutionId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ institutionId, month, mode });
      const res = await fetch(`/api/admin/staff/salary?${params.toString()}`, { headers: authHeaders });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load salary");
      setRows(json.salary || []);
      setExpenses(json.expenses || []);
      setPaidHistory(json.paidHistory || []);
      setUnpaidSalary(json.unpaidSalary || []);
      setSelectedIds([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load salary");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, institutionId, isReady, mode, month]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadSalary(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadSalary]);

  const filteredRows = useMemo(() => {
    if (mode === "self") return rows;
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.full_name, row.email, row.role_code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [mode, rows, search]);

  const selectedRows = useMemo(
    () => filteredRows.filter((row) => selectedIds.includes(row.staff_user_id)),
    [filteredRows, selectedIds]
  );

  const selectedPayableRows = useMemo(
    () => selectedRows.filter((row) => row.payout_status !== "PAID" && row.payable_salary > 0),
    [selectedRows]
  );

  const selectableRows = useMemo(
    () => filteredRows.filter((row) => row.payout_status !== "PAID" && row.payable_salary > 0),
    [filteredRows]
  );

  const allSelectableChecked = selectableRows.length > 0 && selectableRows.every((row) => selectedIds.includes(row.staff_user_id));
  const partiallySelected = selectedPayableRows.length > 0 && !allSelectableChecked;

  const filteredTotals = useMemo(
    () => filteredRows.reduce(
      (sum, row) => ({
        base: sum.base + row.base_salary,
        deductions: sum.deductions + row.deduction_amount,
        payable: sum.payable + row.payable_salary,
        paid: sum.paid + (row.payout_status === "PAID" ? row.payable_salary : 0),
      }),
      { base: 0, deductions: 0, payable: 0, paid: 0 }
    ),
    [filteredRows]
  );

  const [adjustments, setAdjustments] = useState<
    Record<string, { bonus: string; deduction: string; remarks: string }>
  >({});

  const payPlanRows = useMemo<PayPlanRow[]>(() => {
    if (!payTarget) return [];
    const targetRows = payTarget === "selected" ? selectedPayableRows : [payTarget];
    const targetIds = new Set(targetRows.map((row) => row.staff_user_id));
    const currentPayments = targetRows.map((row) => ({
      staff_user_id: row.staff_user_id,
      full_name: row.full_name,
      salary_month: month,
      per_day_salary: row.per_day_salary,
      paid_days: row.paid_days,
      working_days: row.working_days,
      deduction_amount: row.deduction_amount,
      payable_salary: row.payable_salary,
      isPreviousDue: false,
    }));
    const previousPayments = unpaidSalary
      .filter((row) => targetIds.has(row.staff_user_id))
      .map((row) => ({
        staff_user_id: row.staff_user_id,
        full_name: row.full_name,
        salary_month: row.salary_month,
        per_day_salary: row.per_day_salary,
        paid_days: row.paid_days,
        working_days: row.working_days,
        deduction_amount: row.deduction_amount,
        payable_salary: row.payable_salary,
        isPreviousDue: true,
      }));

    const uniqueRows = new Map<string, PayPlanRow>();
    [...previousPayments, ...currentPayments]
      .filter((row) => payTarget !== "selected" || row.payable_salary > 0)
      .forEach((row) => uniqueRows.set(`${row.staff_user_id}-${row.salary_month}`, row));
    return Array.from(uniqueRows.values()).sort((a, b) =>
      a.full_name.localeCompare(b.full_name) || a.salary_month.localeCompare(b.salary_month)
    );
  }, [month, payTarget, selectedPayableRows, unpaidSalary]);

  const getRowNetPayable = useCallback(
    (row: PayPlanRow) => {
      const key = `${row.staff_user_id}-${row.salary_month}`;
      const adj = adjustments[key] || { bonus: "", deduction: "" };
      const bonus = Number(adj.bonus) || 0;
      const deduction = Number(adj.deduction) || 0;
      return Math.max(0, Number((row.payable_salary + bonus - deduction).toFixed(2)));
    },
    [adjustments]
  );

  const payPlanTotal = useMemo(
    () => payPlanRows.reduce((sum, row) => sum + getRowNetPayable(row), 0),
    [payPlanRows, getRowNetPayable]
  );

  async function markPaid(target: Exclude<PayTarget, null>) {
    if (!authHeaders || !institutionId) return;
    const staffUserIds = target === "selected"
      ? selectedPayableRows.map((row) => row.staff_user_id)
      : [target.staff_user_id];
    const payments = payPlanRows.map((row) => {
      const key = `${row.staff_user_id}-${row.salary_month}`;
      const adj = adjustments[key] || { bonus: "", deduction: "", remarks: "" };
      const bonus = Math.max(0, Number(adj.bonus) || 0);
      const deduction = Math.max(0, Number(adj.deduction) || 0);
      const netPayable = Math.max(0, Number((row.payable_salary + bonus - deduction).toFixed(2)));
      return {
        staffUserId: row.staff_user_id,
        month: row.salary_month,
        bonusAmount: bonus,
        manualDeduction: deduction,
        customPayableSalary: netPayable,
        remarks: adj.remarks || undefined,
      };
    });
    if (payments.length === 0) return;

    setPaying(true);
    try {
      const res = await fetch("/api/admin/staff/salary", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: Number(institutionId),
          month,
          staffUserIds,
          payments,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to mark salary paid");
      toast.success(payments.length === 1 ? "Salary marked paid with adjustments." : "Selected salary payouts processed.");
      setPayTarget(null);
      setAdjustments({});
      setSelectedIds([]);
      void loadSalary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark salary paid");
    } finally {
      setPaying(false);
    }
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? selectableRows.map((row) => row.staff_user_id) : []);
  }

  function toggleRow(row: SalaryRow, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, row.staff_user_id]));
      return current.filter((id) => id !== row.staff_user_id);
    });
  }

  if (!activeInstitution) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
        Select an institution to view salary.
      </div>
    );
  }

  const selfRow = rows[0] ?? null;
  const selfTabs = [
    { value: "salary", label: "Salary Sheet", icon: IndianRupee },
    { value: "paid-history", label: "Paid History", icon: CalendarDays },
  ];
  const adminTabs = [
    { value: "salary", label: "Salary", icon: IndianRupee },
    { value: "expenses", label: "Track Expenses", icon: CalendarDays },
    { value: "paid-history", label: "Paid History", icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "self" ? "My Salary" : "Staff Salary"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "self"
              ? "View monthly attendance breakdown, salary deductions, and paid history."
              : "Review staff salary structure, calculate payouts from attendance, and track payment history."}
          </p>
        </div>
        <Badge variant="outline" className="rounded-md">{activeInstitution.name}</Badge>
      </div>

      {mode === "self" ? (
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SalaryTabButtons tabs={selfTabs} value={tab} onChange={setTab} />
            <div className="space-y-2">
              <Label>Month</Label>
              <MonthPicker value={month} onChange={setMonth} className="w-full sm:w-44" />
            </div>
          </div>

          <TabsContent value="salary">
            <div className="rounded-md border border-border bg-card">
              <div className="border-b border-border p-4">
                <h2 className="text-lg font-semibold">Salary Sheet</h2>
                <p className="text-sm text-muted-foreground">Sundays and institute holidays are excluded from working days.</p>
              </div>
              {loading ? (
                <div className="space-y-4 p-4">
                  <div className="grid gap-2 sm:grid-cols-4">
                    {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16 rounded-md" />)}
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Skeleton className="h-44 rounded-md" />
                    <Skeleton className="h-44 rounded-md" />
                  </div>
                </div>
              ) : selfRow ? (
                <div className="space-y-5 p-4">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <StatCard label="Base Salary" value={currency(selfRow.base_salary)} />
                    <StatCard label="Deductions" value={currency(selfRow.deduction_amount)} tone="danger" />
                    <StatCard label="Payable This Month" value={currency(selfRow.payable_salary)} tone="success" />
                    <StatCard label="Payment Status" value={selfRow.payout_status === "PAID" ? "Paid" : "Unpaid"} />
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <section className="space-y-2">
                      <h3 className="font-semibold">Salary Structure</h3>
                      <SalaryComponents row={selfRow} />
                    </section>
                    <section className="space-y-2">
                      <h3 className="font-semibold">Attendance & Payment</h3>
                      <div className="space-y-3 rounded-md border border-border bg-background/40 p-3">
                        <AttendanceText row={selfRow} />
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Per working day</span>
                          <span className="font-semibold">{currency(selfRow.per_day_salary)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Paid date</span>
                          <span>{formatDateTime(selfRow.paid_at)}</span>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              ) : (
                <div className="p-10 text-center text-muted-foreground">No salary record found for this month.</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="paid-history">
            <div className="rounded-md border border-border bg-card">
              <div className="border-b border-border p-4">
                <h2 className="text-lg font-semibold">Paid History</h2>
                <p className="text-sm text-muted-foreground">Paid salary records for the selected month.</p>
              </div>
              <PaidHistoryTable
                rows={paidHistory}
                loading={loading}
                mode={mode}
                onRowClick={setPaidHistoryDetail}
              />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <SalaryTabButtons tabs={adminTabs} value={tab} onChange={setTab} />

          <TabsContent value="salary" className="space-y-4">
            <div className="rounded-md border border-border bg-card">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-4">
                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                  <StatCard label="Base Salary" value={currency(filteredTotals.base)} />
                  <StatCard label="Deductions" value={currency(filteredTotals.deductions)} tone="danger" />
                  <StatCard label="Total Salary Payable" value={currency(filteredTotals.payable)} tone="success" />
                  <StatCard label="Paid This Month" value={currency(filteredTotals.paid)} />
                </div>
                <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-end">
                  <div className="space-y-2 sm:w-64">
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search staff..."
                        className="w-full pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <MonthPicker value={month} onChange={setMonth} className="w-full sm:w-44" />
                  </div>
                  <Button
                    onClick={() => setPayTarget("selected")}
                    disabled={loading || paying || selectedPayableRows.length === 0}
                    className="w-full sm:w-auto"
                  >
                    <IndianRupee className="size-4" />
                    Pay All {selectedPayableRows.length ? `(${selectedPayableRows.length})` : ""}
                  </Button>
                </div>
              </div>

              <div className="space-y-3 p-3 sm:hidden">
                {loading ? (
                  Array.from({ length: 5 }, (_, index) => (
                    <Skeleton key={index} className="h-32 rounded-md" />
                  ))
                ) : filteredRows.length ? filteredRows.map((row) => {
                  const canPay = row.payout_status !== "PAID" && row.payable_salary > 0;
                  return (
                    <div
                      key={row.staff_user_id}
                      className="rounded-md border border-border bg-background/40 p-3"
                      onClick={() => setDetailRow(row)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.includes(row.staff_user_id)}
                              disabled={!canPay}
                              onCheckedChange={(checked) => toggleRow(row, Boolean(checked))}
                              aria-label={`Select ${row.full_name}`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{row.full_name}</div>
                            <div className="truncate text-xs text-muted-foreground">{row.email}</div>
                            <Badge variant="outline" className="mt-2 rounded-md">{roleLabel(row.role_code)}</Badge>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-semibold text-emerald-200">{currency(row.payable_salary)}</div>
                          <div className="text-xs text-muted-foreground">{row.paid_days} days</div>
                        </div>
                      </div>
                      <div className="mt-3 rounded-md border border-border/70 bg-card/40 p-2 text-xs">
                        <AttendanceText row={row} />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <PaymentStatus row={row} />
                        <Button
                          size="sm"
                          variant={row.payout_status === "PAID" ? "outline" : "default"}
                          onClick={(event) => {
                            event.stopPropagation();
                            setPayTarget(row);
                          }}
                          disabled={paying}
                        >
                          <IndianRupee className="size-4" />
                          {row.payout_status === "PAID" ? "Re-mark Paid" : "Mark Paid"}
                        </Button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="rounded-md border border-dashed border-border px-3 py-8 text-center text-muted-foreground">
                    No salary records found for this month.
                  </div>
                )}
              </div>

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="border-b border-border bg-muted/30 text-left">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <Checkbox
                          checked={allSelectableChecked ? true : partiallySelected ? "indeterminate" : false}
                          onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                          aria-label="Select all payable salaries"
                        />
                      </th>
                      <th className="px-4 py-3">Staff</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Attendance</th>
                      <th className="px-4 py-3">Payable</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <SalarySkeleton columns={7} />
                    ) : filteredRows.length ? filteredRows.map((row) => {
                      const canPay = row.payout_status !== "PAID" && row.payable_salary > 0;
                      return (
                        <tr
                          key={row.staff_user_id}
                          className="cursor-pointer border-b border-border/70 align-top transition-colors hover:bg-muted/30"
                          onClick={() => setDetailRow(row)}
                        >
                          <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.includes(row.staff_user_id)}
                              disabled={!canPay}
                              onCheckedChange={(checked) => toggleRow(row, Boolean(checked))}
                              aria-label={`Select ${row.full_name}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold">{row.full_name}</div>
                            <div className="text-xs text-muted-foreground">{row.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="font-normal text-xs">
                              {roleLabel(row.role_code, row.role_name)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3"><AttendanceText row={row} /></td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-emerald-200">{currency(row.payable_salary)}</div>
                            <div className="text-xs text-muted-foreground">{row.paid_days} days x {currency(row.per_day_salary)}</div>
                          </td>
                          <td className="px-4 py-3"><PaymentStatus row={row} /></td>
                          <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                            <Button
                              size="sm"
                              variant={row.payout_status === "PAID" ? "outline" : "default"}
                              onClick={() => setPayTarget(row)}
                              disabled={paying}
                            >
                              <IndianRupee className="size-4" />
                              {row.payout_status === "PAID" ? "Re-mark Paid" : "Mark Paid"}
                            </Button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          No salary records found for this month.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="expenses">
            <div className="rounded-md border border-border bg-card">
              <div className="border-b border-border p-4">
                <h2 className="text-lg font-semibold">Salary Expenses</h2>
                <p className="text-sm text-muted-foreground">Month-wise paid salary amount for expense tracking.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b border-border bg-muted/30 text-left">
                    <tr>
                      <th className="px-4 py-3">Month</th>
                      <th className="px-4 py-3">Paid Staff</th>
                      <th className="px-4 py-3">Total Expense</th>
                      <th className="px-4 py-3">Last Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 4 }, (_, index) => (
                        <tr key={index} className="border-b border-border/70">
                          <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-28" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-40" /></td>
                        </tr>
                      ))
                    ) : expenses.length ? expenses.map((expense) => (
                      <tr key={expense.salary_month} className="border-b border-border/70">
                        <td className="px-4 py-3 font-semibold">{formatMonth(expense.salary_month)}</td>
                        <td className="px-4 py-3">{expense.paid_count}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-200">{currency(expense.paid_total)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDateTime(expense.last_paid_at)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                          No salary expenses tracked yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="paid-history">
            <div className="rounded-md border border-border bg-card">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-4">
                <div>
                  <h2 className="text-lg font-semibold">Paid History</h2>
                  <p className="text-sm text-muted-foreground">Staff salary payouts already marked paid for the selected month.</p>
                </div>
                <div className="space-y-2">
                  <Label>Month</Label>
                  <MonthPicker value={month} onChange={setMonth} className="w-full sm:w-44" />
                </div>
              </div>
              <PaidHistoryTable
                rows={paidHistory}
                loading={loading}
                mode={mode}
                onRowClick={setPaidHistoryDetail}
              />
            </div>
          </TabsContent>
        </Tabs>
      )}

      <SalaryDetailSheet
        row={detailRow}
        month={month}
        open={Boolean(detailRow)}
        onOpenChange={(open) => !open && setDetailRow(null)}
      />

      <PaidHistoryDetailSurface
        row={paidHistoryDetail}
        open={Boolean(paidHistoryDetail)}
        onOpenChange={(open) => !open && setPaidHistoryDetail(null)}
      />

      <AlertDialog open={Boolean(payTarget)} onOpenChange={(open) => !paying && !open && setPayTarget(null)}>
        <AlertDialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-xl">
          <AlertDialogHeader className="px-6 pb-4 pt-6">
            <AlertDialogTitle>
              {payTarget === "selected" ? "Pay selected salaries?" : "Process Staff Salary Payout"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild className="text-left">
              <div className="w-full space-y-4">
                <p className="text-sm text-muted-foreground">
                  {payTarget === "selected"
                    ? `Review and adjust payouts for ${payPlanRows.length} salary month(s) across ${selectedPayableRows.length} selected staff member(s).`
                    : `Confirm attendance calculation and add any manual bonus, incentives, or deductions for ${payTarget?.full_name ?? "this staff member"}.`}
                </p>
                {payPlanRows.some((row) => row.isPreviousDue) && (
                  <Alert variant="warning">
                    <AlertTitle>Previous unpaid month detected</AlertTitle>
                    <AlertDescription>
                      These rows had payable attendance salary but were not paid yet.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {payPlanRows.map((row) => {
                    const rowKey = `${row.staff_user_id}-${row.salary_month}`;
                    const adj = adjustments[rowKey] || { bonus: "", deduction: "", remarks: "" };
                    const netPayable = getRowNetPayable(row);

                    return (
                      <div
                        key={rowKey}
                        className="w-full rounded-lg border border-border bg-card/60 p-3.5 shadow-sm space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-foreground">{row.full_name}</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-medium text-foreground">{formatMonth(row.salary_month)}</span>
                              {row.isPreviousDue && (
                                <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-amber-100">
                                  Previous unpaid
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-[11px] text-muted-foreground">Attendance Pay</div>
                            <div className="font-semibold text-foreground">{currency(row.payable_salary)}</div>
                          </div>
                        </div>

                        <div className="rounded-md border border-border/70 bg-card/40 px-3 py-2 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                            <span>{row.paid_days} paid day(s) x {currency(row.per_day_salary)}</span>
                            <span className="text-muted-foreground">{row.working_days} working days</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                            <span className="text-emerald-400">
                              Calculated: {currency(row.payable_salary)}
                            </span>
                            <span className="text-destructive">
                              Attendance Deduction: {currency(row.deduction_amount)}
                            </span>
                          </div>
                        </div>

                        {/* Manual Extra Adjustments Section */}
                        <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 space-y-2">
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Manual Adjustments (Optional)
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-emerald-500 font-medium">
                                + Extra Bonus / Incentive (₹)
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0.00"
                                value={adj.bonus}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAdjustments((prev) => ({
                                    ...prev,
                                    [rowKey]: {
                                      bonus: val,
                                      deduction: prev[rowKey]?.deduction || "",
                                      remarks: prev[rowKey]?.remarks || "",
                                    },
                                  }));
                                }}
                                className="h-7 text-xs font-mono bg-background"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-rose-500 font-medium">
                                - Manual Deduction (₹)
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0.00"
                                value={adj.deduction}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAdjustments((prev) => ({
                                    ...prev,
                                    [rowKey]: {
                                      deduction: val,
                                      bonus: prev[rowKey]?.bonus || "",
                                      remarks: prev[rowKey]?.remarks || "",
                                    },
                                  }));
                                }}
                                className="h-7 text-xs font-mono bg-background"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Input
                              type="text"
                              placeholder="Notes / reason (e.g. Festival bonus, Advance recovery, Overtime)"
                              value={adj.remarks}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAdjustments((prev) => ({
                                  ...prev,
                                  [rowKey]: {
                                    remarks: val,
                                    bonus: prev[rowKey]?.bonus || "",
                                    deduction: prev[rowKey]?.deduction || "",
                                  },
                                }));
                              }}
                              className="h-7 text-[11px] bg-background"
                            />
                          </div>
                          <div className="flex items-center justify-between pt-1 text-xs font-medium">
                            <span className="text-muted-foreground">Net Payout to credit:</span>
                            <span className="font-semibold text-emerald-400 text-sm">
                              {currency(netPayable)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {payPlanRows.length === 0 && (
                    <Alert>
                      <AlertDescription className="text-center">
                        No payable salary months selected.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <Alert className="border-emerald-500/30 bg-emerald-500/10">
                  <div className="flex items-center justify-between gap-3">
                    <AlertTitle className="mb-0 text-foreground font-semibold">
                      Total Payout Amount
                    </AlertTitle>
                    <div className="shrink-0 font-bold text-base text-emerald-400">
                      {currency(payPlanTotal)}
                    </div>
                  </div>
                </Alert>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t border-border bg-muted/30 px-6 py-4">
            <AlertDialogCancel disabled={paying} onClick={() => setAdjustments({})}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={paying}
              onClick={(event) => {
                event.preventDefault();
                if (payTarget) void markPaid(payTarget);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {paying && <Loader2 className="size-4 animate-spin" />}
              Confirm & Mark Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
