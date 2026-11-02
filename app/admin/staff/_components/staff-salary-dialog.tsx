"use client";

import { useEffect, useState, useMemo } from "react";
import {
  IndianRupee,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Building2,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  Plus,
  Pencil,
  Sparkles,
  Trash2,
  Wallet,
  Receipt,
  ShieldCheck,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveInstitution } from "@/hooks/use-active-institution";

type SalaryRecord = {
  id: number;
  staff_user_id: number;
  full_name: string;
  salary_month: string;
  base_salary: number;
  deduction_amount: number;
  bonus_amount: number;
  manual_deduction: number;
  payable_salary: number;
  status: string;
  paid_at?: string;
  paid_by_name?: string;
  remarks?: string;
};

type SalaryIncrement = {
  id: number;
  previous_base_salary: number;
  new_base_salary: number;
  increment_amount: number;
  increment_percentage: number;
  effective_date: string;
  reason?: string;
  approved_by_name?: string;
  created_at?: string;
};

type SalaryComponent = {
  label: string;
  amount: number;
  type: "EARNING" | "DEDUCTION";
};

type EditableComponent = {
  id?: string | number;
  label: string;
  amount: number | string;
  type: "EARNING" | "DEDUCTION";
  isCustom?: boolean;
};

type StaffSalaryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffUser: { id: number; full_name: string; email?: string } | null;
  accessToken: string | null;
};

const STANDARD_EARNINGS = [
  "Basic Pay",
  "House Rent Allowance (hra)",
  "Dearness Allowance (da)",
  "Special Allowance",
  "Conveyance Allowance",
  "Medical Allowance",
  "Performance Bonus",
];

const STANDARD_DEDUCTIONS = [
  "Provident Fund (pf)",
  "Employee State Insurance (esi)",
  "Professional Tax (pt)",
  "TDS / Income Tax",
];

export function StaffSalaryDialog({
  open,
  onOpenChange,
  staffUser,
  accessToken,
}: StaffSalaryDialogProps) {
  const { activeInstitutionId } = useActiveInstitution();
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [paidHistory, setPaidHistory] = useState<SalaryRecord[]>([]);
  const [increments, setIncrements] = useState<SalaryIncrement[]>([]);
  const [monthlySalary, setMonthlySalary] = useState<any[]>([]);
  const [salaryStructure, setSalaryStructure] = useState<{
    base: number;
    components: SalaryComponent[];
    frequency?: string;
  }>({ base: 0, components: [] });

  // Update Salary / Add Increment & Allowances dialog state
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"earnings" | "deductions" | "meta">("earnings");
  const [editableEarnings, setEditableEarnings] = useState<EditableComponent[]>([]);
  const [editableDeductions, setEditableDeductions] = useState<EditableComponent[]>([]);
  const [incrementReason, setIncrementReason] = useState("");
  const [incrementEffectiveDate, setIncrementEffectiveDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [updatingSalary, setUpdatingSalary] = useState(false);

  const loadData = async () => {
    if (!staffUser || !accessToken) return;
    setLoading(true);
    try {
      // 1. Fetch user profile for their configured salary structure
      const resUser = await fetch(`/api/admin/users/detail?id=${staffUser.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userJson = await resUser.json();

      // 2. Fetch monthly salary calculations, paid records, and increments
      const instQuery = activeInstitutionId ? `&institutionId=${activeInstitutionId}` : "";
      const resSalary = await fetch(
        `/api/admin/staff/salary?mode=self&staffUserId=${staffUser.id}&month=${currentMonth}${instQuery}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const salaryJson = await resSalary.json();
      if (resSalary.ok) {
        setPaidHistory(salaryJson.paidHistory || []);
        setMonthlySalary(salaryJson.salary || []);
        setIncrements(salaryJson.increments || []);

        const rawComps = (Array.isArray(salaryJson.components) && salaryJson.components.length > 0)
          ? salaryJson.components
          : (userJson?.data?.salary_components || salaryJson.salary?.[0]?.components || []);

        const normalizedComps: SalaryComponent[] = rawComps.map((c: any) => ({
          label: c.label,
          amount: Number(c.amount) || 0,
          type: String(c.type || c.component_type || "EARNING").toUpperCase() === "DEDUCTION" ? "DEDUCTION" : "EARNING",
        }));

        const totalEarnings = normalizedComps
          .filter((c) => c.type !== "DEDUCTION")
          .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

        const totalDeductions = normalizedComps
          .filter((c) => c.type === "DEDUCTION")
          .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

        const netTakeHome = Math.max(0, totalEarnings - totalDeductions);

        setSalaryStructure({
          base: netTakeHome || totalEarnings,
          components: normalizedComps,
          frequency: userJson?.data?.salary_frequency || "MONTHLY",
        });
      }
    } catch (err) {
      console.error("Failed to load staff salary records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && staffUser && accessToken) {
      loadData();
    }
  }, [open, staffUser, accessToken, currentMonth, activeInstitutionId]);

  const handleOpenUpdateSalary = () => {
    const existingMap = new Map(
      salaryStructure.components.map((c) => [c.label.toLowerCase().trim(), c])
    );

    // Build earnings list: standard + existing custom
    const earningsList: EditableComponent[] = [];
    const seenEarnings = new Set<string>();

    STANDARD_EARNINGS.forEach((label) => {
      const match = existingMap.get(label.toLowerCase());
      seenEarnings.add(label.toLowerCase());
      earningsList.push({
        label,
        amount: match ? match.amount : 0,
        type: "EARNING",
        isCustom: false,
      });
    });

    salaryStructure.components.forEach((c) => {
      if (c.type === "EARNING" && !seenEarnings.has(c.label.toLowerCase())) {
        earningsList.push({
          label: c.label,
          amount: c.amount,
          type: "EARNING",
          isCustom: true,
        });
      }
    });

    // Build deductions list: standard + existing custom
    const deductionsList: EditableComponent[] = [];
    const seenDeductions = new Set<string>();

    STANDARD_DEDUCTIONS.forEach((label) => {
      const match = existingMap.get(label.toLowerCase());
      seenDeductions.add(label.toLowerCase());
      deductionsList.push({
        label,
        amount: match ? match.amount : 0,
        type: "DEDUCTION",
        isCustom: false,
      });
    });

    salaryStructure.components.forEach((c) => {
      if (c.type === "DEDUCTION" && !seenDeductions.has(c.label.toLowerCase())) {
        deductionsList.push({
          label: c.label,
          amount: c.amount,
          type: "DEDUCTION",
          isCustom: true,
        });
      }
    });

    setEditableEarnings(earningsList);
    setEditableDeductions(deductionsList);
    setIncrementEffectiveDate(new Date().toISOString().split("T")[0]);
    setIncrementReason(
      salaryStructure.base > 0
        ? "Annual Performance Appraisal / Revision"
        : "Initial Joining Salary & Compensation Setup"
    );
    setActiveTab("earnings");
    setUpdateDialogOpen(true);
  };

  // Add custom earning/allowance
  const handleAddCustomEarning = () => {
    setEditableEarnings((prev) => [
      ...prev,
      {
        id: `custom_earn_${Date.now()}`,
        label: "",
        amount: 0,
        type: "EARNING",
        isCustom: true,
      },
    ]);
  };

  // Add custom deduction
  const handleAddCustomDeduction = () => {
    setEditableDeductions((prev) => [
      ...prev,
      {
        id: `custom_deduct_${Date.now()}`,
        label: "",
        amount: 0,
        type: "DEDUCTION",
        isCustom: true,
      },
    ]);
  };

  const handleSaveSalaryUpdate = async () => {
    if (!staffUser || !accessToken) return;

    // Check basic pay has an amount
    const basicPay = editableEarnings.find((c) => c.label.toLowerCase().includes("basic"));
    const numBasic = parseFloat(String(basicPay?.amount || 0));
    if (isNaN(numBasic) || numBasic < 0) {
      toast.error("Please enter a valid Basic Salary amount");
      return;
    }

    const validEarnings = editableEarnings
      .filter((c) => c.label.trim() && (parseFloat(String(c.amount)) > 0 || c.label.toLowerCase().includes("basic")))
      .map((c) => ({
        label: c.label.trim(),
        amount: parseFloat(String(c.amount)) || 0,
        type: "EARNING" as const,
      }));

    const validDeductions = editableDeductions
      .filter((c) => c.label.trim() && parseFloat(String(c.amount)) > 0)
      .map((c) => ({
        label: c.label.trim(),
        amount: parseFloat(String(c.amount)) || 0,
        type: "DEDUCTION" as const,
      }));

    const totalGross = validEarnings.reduce((sum, c) => sum + c.amount, 0);
    const totalDeduct = validDeductions.reduce((sum, c) => sum + c.amount, 0);
    const netSalary = Math.max(0, totalGross - totalDeduct);

    if (totalGross <= 0) {
      toast.error("Total gross salary must be greater than zero");
      return;
    }

    setUpdatingSalary(true);
    try {
      const res = await fetch(`/api/admin/staff/salary`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_salary",
          staffUserId: staffUser.id,
          newBaseSalary: netSalary,
          effectiveDate: incrementEffectiveDate,
          reason: incrementReason.trim() || (salaryStructure.base > 0 ? "Salary Increment / Revision" : "Joining Salary & Allowances Setup"),
          institutionId: activeInstitutionId,
          components: [...validEarnings, ...validDeductions],
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update salary");

      toast.success("Compensation structure and allowances saved successfully!");
      setUpdateDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update salary");
    } finally {
      setUpdatingSalary(false);
    }
  };

  // Generate last 6 months options safely with day 1
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });

  const activeMonthCalculation = monthlySalary[0];
  const currentBase = Number(salaryStructure.base || 0);

  // Live modal totals
  const calcGrossSalary = useMemo(() => {
    return editableEarnings.reduce((sum, c) => sum + (parseFloat(String(c.amount)) || 0), 0);
  }, [editableEarnings]);

  const calcTotalDeductions = useMemo(() => {
    return editableDeductions.reduce((sum, c) => sum + (parseFloat(String(c.amount)) || 0), 0);
  }, [editableDeductions]);

  const calcNetSalary = Math.max(0, calcGrossSalary - calcTotalDeductions);
  const diffAmt = calcNetSalary - currentBase;
  const diffPct = currentBase > 0 ? ((diffAmt / currentBase) * 100).toFixed(1) : "0";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <IndianRupee className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Salary Records: {staffUser?.full_name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    View compensation structure, attendance-linked payouts, and historical increments
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleOpenUpdateSalary}
                  className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  {currentBase > 0 ? "Update Salary" : "Setup Joining Salary"}
                </Button>

                <Select value={currentMonth} onValueChange={setCurrentMonth}>
                  <SelectTrigger className="h-8 text-xs w-36">
                    <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {new Date(m + "-01").toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
              <p className="text-xs text-muted-foreground font-medium">Fetching salary records...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pt-3 space-y-4 pr-1">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card/60 p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium">Configured Base</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleOpenUpdateSalary}
                      className="h-6 px-1.5 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1 font-bold"
                    >
                      <Pencil className="h-2.5 w-2.5" /> Edit
                    </Button>
                  </div>
                  <div className="mt-1 text-xl font-bold text-foreground font-mono">
                    ₹{Number(salaryStructure.base || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    Payout: <span className="font-semibold uppercase">{salaryStructure.frequency}</span>
                  </div>
                </div>

                <div className="rounded-xl border bg-card/60 p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium">This Month Payable</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div className="mt-1.5 text-xl font-bold text-foreground font-mono">
                    ₹{Number(activeMonthCalculation?.payable_salary || salaryStructure.base || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                    <span>Deductions: ₹{Number(activeMonthCalculation?.deduction_amount || 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="rounded-xl border bg-card/60 p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium">Payout Status ({currentMonth})</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {paidHistory.length > 0 ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs px-2 py-0.5 font-bold">
                        PAID
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-500/20 text-xs px-2 py-0.5 font-bold">
                        UNPAID / PENDING
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {paidHistory.length > 0
                      ? `Disbursed on ${new Date(paidHistory[0].paid_at || "").toLocaleDateString()}`
                      : "Not yet processed for this month"}
                  </div>
                </div>
              </div>

              {/* Salary Breakdown Components */}
              <div className="rounded-xl border bg-card/60 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    Salary Components Breakdown
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenUpdateSalary}
                    className="h-6 px-2.5 text-[11px] font-bold text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1 cursor-pointer"
                  >
                    <Pencil className="h-3 w-3" /> Configure Allowances
                  </Button>
                </div>

                {salaryStructure.components.length === 0 || salaryStructure.base === 0 ? (
                  <div className="rounded-xl border border-dashed p-5 text-center bg-emerald-500/5 space-y-2">
                    <Building2 className="mx-auto h-7 w-7 text-emerald-600/50" />
                    <div>
                      <p className="text-xs font-bold text-foreground">No joining salary records configured yet</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Add initial basic salary, HRA, special allowance, and deductions for {staffUser?.full_name}.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleOpenUpdateSalary}
                      className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Setup Joining Salary & Allowances
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                    {salaryStructure.components.map((comp, i) => {
                      const isDeduction = comp.type === "DEDUCTION";
                      return (
                        <div
                          key={i}
                          className={`p-2.5 rounded-xl border text-xs space-y-1 transition-colors ${
                            isDeduction
                              ? "bg-rose-500/5 border-rose-500/20"
                              : "bg-emerald-500/5 border-emerald-500/20"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-semibold text-foreground truncate capitalize">
                              {comp.label}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1 py-0 uppercase font-bold shrink-0 ${
                                isDeduction
                                  ? "text-rose-600 border-rose-300"
                                  : "text-emerald-700 border-emerald-300"
                              }`}
                            >
                              {isDeduction ? "- Deduct" : "+ Earning"}
                            </Badge>
                          </div>
                          <div
                            className={`text-sm font-bold font-mono ${
                              isDeduction ? "text-rose-700 dark:text-rose-400" : "text-foreground"
                            }`}
                          >
                            {isDeduction ? "-" : ""}₹{Number(comp.amount || 0).toLocaleString("en-IN")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Historical Salary Increments Section */}
              <div className="rounded-xl border bg-card/60 p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    Historical Salary Increments ({staffUser?.full_name})
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenUpdateSalary}
                    className="h-6 px-2 text-[11px] font-bold text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add Increment
                  </Button>
                </div>

                {increments.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center bg-muted/5">
                    <TrendingUp className="mx-auto h-7 w-7 text-muted-foreground/40 mb-1.5" />
                    <p className="text-xs font-medium text-foreground">No historical salary increments recorded yet</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Use the &quot;Update Salary&quot; button to record compensation increases, appraisals, or revisions.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y rounded-lg border bg-background">
                    {increments.map((inc) => {
                      const isPositive = inc.increment_amount >= 0;
                      return (
                        <div key={inc.id} className="p-3 flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">
                                Effective: {new Date(inc.effective_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 font-bold gap-1 ${
                                  isPositive
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                }`}
                              >
                                {isPositive ? <TrendingUp className="w-2.5 h-2.5 text-emerald-600" /> : <TrendingDown className="w-2.5 h-2.5 text-rose-600" />}
                                {isPositive ? "+" : ""}₹{Number(inc.increment_amount).toLocaleString("en-IN")} ({isPositive ? "+" : ""}{inc.increment_percentage}%)
                              </Badge>
                            </div>
                            {inc.reason && (
                              <p className="text-[11px] text-muted-foreground">
                                <span className="font-semibold text-foreground/80">Reason:</span> {inc.reason}
                              </p>
                            )}
                            {inc.approved_by_name && (
                              <p className="text-[10px] text-muted-foreground/70">
                                Approved by {inc.approved_by_name}
                              </p>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-foreground font-mono">
                              ₹{Number(inc.new_base_salary).toLocaleString("en-IN")}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Prev: ₹{Number(inc.previous_base_salary).toLocaleString("en-IN")}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Disbursement / Payout History */}
              <div className="rounded-xl border bg-card/60 p-4 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Historical Salary Payouts ({staffUser?.full_name})
                </h4>

                {paidHistory.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center bg-muted/5">
                    <CreditCard className="mx-auto h-7 w-7 text-muted-foreground/40 mb-1.5" />
                    <p className="text-xs font-medium text-foreground">No payout records found for {currentMonth}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Payout transactions recorded by the institution will be listed here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y rounded-lg border bg-background">
                    {paidHistory.map((record) => (
                      <div key={record.id} className="p-3 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">
                              Month: {record.salary_month}
                            </span>
                            <Badge className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 font-bold">
                              {record.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Paid on {record.paid_at ? new Date(record.paid_at).toLocaleString() : "N/A"}{" "}
                            {record.paid_by_name && `by ${record.paid_by_name}`}
                          </p>
                          {record.remarks && (
                            <p className="text-[10px] text-muted-foreground italic">Note: {record.remarks}</p>
                          )}
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            ₹{Number(record.payable_salary || 0).toLocaleString("en-IN")}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            Base: ₹{Number(record.base_salary || 0).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sub-Dialog: Comprehensive Salary & Allowances Setup */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              {currentBase > 0 ? "Update Salary & Compensation Structure" : "Setup Joining Salary & Allowances"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure basic pay, allowances (HRA, DA, Special, etc.), and statutory deductions for {staffUser?.full_name}.
            </DialogDescription>
          </DialogHeader>

          {/* Top Live Calculations Summary Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-muted/20 border rounded-2xl">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Gross Earnings</span>
              <p className="text-sm sm:text-base font-mono font-bold text-emerald-600">
                ₹{calcGrossSalary.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Deductions</span>
              <p className="text-sm sm:text-base font-mono font-bold text-rose-600">
                -₹{calcTotalDeductions.toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-primary block">Net Take-Home</span>
              <p className="text-sm sm:text-base font-mono font-bold text-foreground">
                ₹{calcNetSalary.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Revision Change</span>
              <p className={`text-sm sm:text-base font-mono font-bold ${diffAmt >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {diffAmt >= 0 ? "+" : ""}₹{diffAmt.toLocaleString("en-IN")}
                {currentBase > 0 && <span className="text-[10px] font-semibold block text-muted-foreground">({diffPct}%)</span>}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 pt-1 space-y-4">
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
              <TabsList className="grid grid-cols-3 w-full h-9 rounded-xl bg-muted/40 p-1">
                <TabsTrigger value="earnings" className="text-xs font-bold gap-1.5 cursor-pointer">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Earnings & Allowances</span>
                </TabsTrigger>
                <TabsTrigger value="deductions" className="text-xs font-bold gap-1.5 cursor-pointer">
                  <Receipt className="w-3.5 h-3.5 text-rose-600" />
                  <span>Deductions & Taxes</span>
                </TabsTrigger>
                <TabsTrigger value="meta" className="text-xs font-bold gap-1.5 cursor-pointer">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Effective Date & Notes</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Earnings & Allowances */}
              <TabsContent value="earnings" className="space-y-3 pt-3">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                      Monthly Earnings & Allowances Breakdown
                    </h5>
                    <p className="text-[11px] text-muted-foreground">Specify the base compensation and applicable company allowances</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddCustomEarning}
                    className="h-7 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Custom Allowance
                  </Button>
                </div>

                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {editableEarnings.map((comp, idx) => (
                    <div
                      key={comp.id || idx}
                      className="flex items-center gap-2 p-2.5 rounded-xl border bg-card hover:border-emerald-500/40 transition-colors shadow-2xs"
                    >
                      <div className="flex-1 min-w-[160px]">
                        {comp.isCustom ? (
                          <Input
                            value={comp.label}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditableEarnings((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, label: val } : item))
                              );
                            }}
                            placeholder="Allowance Name (e.g. Food, Overtime)"
                            className="h-8 text-xs font-medium"
                          />
                        ) : (
                          <div className="px-1">
                            <span className="text-xs font-bold text-foreground capitalize block truncate">
                              {comp.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {comp.label.toLowerCase().includes("basic") ? "Primary fixed salary" : "Company allowance"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="w-36 shrink-0 relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          value={comp.amount === 0 ? "" : comp.amount}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                            setEditableEarnings((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, amount: val } : item))
                            );
                          }}
                          placeholder="0"
                          className="h-8 pl-6 text-xs font-mono font-bold text-right"
                        />
                      </div>

                      {comp.isCustom && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditableEarnings((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                          title="Remove custom allowance"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Tab 2: Deductions & Taxes */}
              <TabsContent value="deductions" className="space-y-3 pt-3">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-rose-600" />
                      Monthly Deductions & Statutory Contributions
                    </h5>
                    <p className="text-[11px] text-muted-foreground">PF, ESI, Professional Tax, TDS or company advance deductions</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddCustomDeduction}
                    className="h-7 text-xs font-bold text-rose-700 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Custom Deduction
                  </Button>
                </div>

                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {editableDeductions.map((comp, idx) => (
                    <div
                      key={comp.id || idx}
                      className="flex items-center gap-2 p-2.5 rounded-xl border bg-card hover:border-rose-500/40 transition-colors shadow-2xs"
                    >
                      <div className="flex-1 min-w-[160px]">
                        {comp.isCustom ? (
                          <Input
                            value={comp.label}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditableDeductions((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, label: val } : item))
                              );
                            }}
                            placeholder="Deduction Name (e.g. Loan, Advance)"
                            className="h-8 text-xs font-medium"
                          />
                        ) : (
                          <div className="px-1">
                            <span className="text-xs font-bold text-foreground capitalize block truncate">
                              {comp.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">Statutory / policy deduction</span>
                          </div>
                        )}
                      </div>

                      <div className="w-36 shrink-0 relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-600">-₹</span>
                        <Input
                          type="number"
                          value={comp.amount === 0 ? "" : comp.amount}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                            setEditableDeductions((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, amount: val } : item))
                            );
                          }}
                          placeholder="0"
                          className="h-8 pl-7 text-xs font-mono font-bold text-right text-rose-700 dark:text-rose-400"
                        />
                      </div>

                      {comp.isCustom && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditableDeductions((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                          title="Remove custom deduction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Tab 3: Effective Date & Notes */}
              <TabsContent value="meta" className="space-y-4 pt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Effective Date *</Label>
                  <Input
                    type="date"
                    value={incrementEffectiveDate}
                    onChange={(e) => setIncrementEffectiveDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">Date from which this salary structure or revision applies</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Reason / Appraisal Note</Label>
                  <Input
                    value={incrementReason}
                    onChange={(e) => setIncrementReason(e.target.value)}
                    placeholder="e.g. Joining Offer Compensation, Annual Appraisal, Promotion"
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">Recorded permanently in the employee's compensation revision log</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="border-t pt-3 gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUpdateDialogOpen(false)}
              disabled={updatingSalary}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSalaryUpdate}
              disabled={updatingSalary}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs text-xs"
            >
              {updatingSalary && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {currentBase > 0 ? "Save & Apply Increment" : "Save Joining Salary Structure"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
