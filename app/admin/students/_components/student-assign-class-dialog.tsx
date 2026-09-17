"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bus,
  CalendarDays,
  Calculator,
  Check,
  Clock,
  CreditCard,
  GraduationCap,
  IndianRupee,
  Layers,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { readJsonResponse } from "@/lib/api/read-json-response";
import { useProgressiveSave } from "@/hooks/use-progressive-save";
import { ProgressiveSaveIndicator } from "@/components/shared/progressive-save-indicator";
import type { Student } from "../columns";

type FeeStructureForm = {
  withTransport: boolean;
  baseFee: string;
  transportZone: string;
  transportFeeOverride: string;
  concessionPercent: string;
  feeNote: string;
  pickupAddress: string;
  paymentMode?: string;
  paymentPlanTitle?: string;
  paymentUnitText?: string;
};

const blankFeeStructure = (): FeeStructureForm => ({
  withTransport: false,
  baseFee: "",
  transportZone: "",
  transportFeeOverride: "",
  concessionPercent: "",
  feeNote: "",
  pickupAddress: "",
  paymentMode: "monthly",
  paymentPlanTitle: "Monthly Plan",
  paymentUnitText: "/ month",
});

export type TransportSlabOption = {
  label: string;
  value: string;
  fee: number;
  monthly_fee?: number;
  quarterly_fee?: number | null;
  annual_fee?: number | null;
  min_km?: number;
  max_km?: number;
};

// Transport zone slabs based on distance from institution (km)
const TRANSPORT_SLABS: TransportSlabOption[] = [
  { label: "Zone A — 0–5 km",   value: "zone_a", fee: 500, monthly_fee: 500, quarterly_fee: 1500, annual_fee: 6000 },
  { label: "Zone B — 5–10 km",  value: "zone_b", fee: 800, monthly_fee: 800, quarterly_fee: 2400, annual_fee: 9600 },
  { label: "Zone C — 10–20 km", value: "zone_c", fee: 1200, monthly_fee: 1200, quarterly_fee: 3600, annual_fee: 14400 },
  { label: "Zone D — 20+ km",   value: "zone_d", fee: 1800, monthly_fee: 1800, quarterly_fee: 5400, annual_fee: 21600 },
];

type AcademicYearOption = {
  id: number;
  name: string;
};

type ProgramOption = {
  id: number;
  title: string;
  fee_amount?: string | number | null;
  fee_unit?: string | null;
  admission_fee?: string | number | null;
  fee_components?: Array<{
    id: number;
    title: string;
    amount: string | number;
    unit?: string | null;
    discount_type?: string | null;
    discount_value?: string | number | null;
    final_amount?: string | number | null;
  }>;
};

type BatchOption = {
  id?: number;
  batch_name?: string;
  name?: string;
  section_id?: number;
  section_ids?: number[];
  sections?: string[];
  section_name?: string;
  original_section_name?: string;
  enrolled_students_count?: number;
  price?: number | string | null;
  fee_amount?: number | string | null;
  discount_percent?: number | string | null;
  installments_count?: number | null;
  class_frequency?: string | null;
  academic_term?: string | null;
  duration?: string | null;
  module_details?: any;
};

type SectionOption = {
  id: number;
  name: string;
  batch_name?: string;
};

type InstitutionOption = {
  id: number;
  name: string;
};

type EnrollmentRecord = {
  id: number;
  institution_id?: number;
  academic_year_id?: number;
  program_id?: number;
  section_id?: number;
  program_name?: string;
  section_name?: string;
  academic_year_name?: string;
  roll_number?: string;
  status?: string;
  admission_date?: string;
  remarks?: string;
  is_current?: boolean;
  course_fee?: string | number | null;
  has_transport?: boolean;
  transport_fee?: string | number | null;
  transport_zone?: string | null;
  pickup_address?: string | null;
  total_fee?: string | number | null;
  program_fee_amount?: string | number | null;
  program_fee_unit?: string | null;
  program_admission_fee?: string | number | null;
};

type StudentAssignClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  accessToken: string | null;
  institutionId?: number | string | null;
  onAssignedSuccess?: () => void;
};

export function StudentAssignClassDialog({
  open,
  onOpenChange,
  student,
  accessToken,
  institutionId,
  onAssignedSuccess,
}: StudentAssignClassDialogProps) {
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [selectedBatchName, setSelectedBatchName] = useState<string>("ALL");
  const [allSections, setAllSections] = useState<SectionOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);

  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>(
    institutionId ? String(institutionId) : ""
  );
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>("");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [rollNumber, setRollNumber] = useState<string>("");
  const [status, setStatus] = useState<string>("active");
  const [admissionDate, setAdmissionDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [remarks, setRemarks] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"assignment" | "transport" | "fee_details">("assignment");
  const [feeStructure, setFeeStructure] = useState<FeeStructureForm>(blankFeeStructure);
  const [transportSlabs, setTransportSlabs] = useState<TransportSlabOption[]>([
    ...TRANSPORT_SLABS,
  ]);

  const selectedProgram = useMemo(() => {
    return programs.find((p) => String(p.id) === String(selectedProgramId)) || null;
  }, [programs, selectedProgramId]);

  const uniqueBatches = useMemo(() => {
    const map = new Map<string, { batch_name: string; studentCount: number }>();
    for (const b of batches) {
      const name = (b.batch_name || b.name || "Default Batch").trim();
      if (!name) continue;
      const existing = map.get(name);
      if (existing) {
        existing.studentCount += b.enrolled_students_count || 0;
      } else {
        map.set(name, {
          batch_name: name,
          studentCount: b.enrolled_students_count || 0,
        });
      }
    }
    for (const s of allSections) {
      if (s.batch_name && !map.has(s.batch_name)) {
        map.set(s.batch_name, {
          batch_name: s.batch_name,
          studentCount: 0,
        });
      }
    }
    return Array.from(map.values());
  }, [batches, allSections]);

  const activeBatch = useMemo(() => {
    if (selectedSectionId) {
      const sec = allSections.find((s) => String(s.id) === String(selectedSectionId));
      if (sec?.batch_name) {
        const match = batches.find((b) => (b.batch_name || b.name) === sec.batch_name);
        if (match) return match;
      }
    }
    if (selectedBatchName && selectedBatchName !== "ALL") {
      const match = batches.find((b) => (b.batch_name || b.name) === selectedBatchName);
      if (match) return match;
    }
    return batches[0] || null;
  }, [batches, allSections, selectedSectionId, selectedBatchName]);

  interface PaymentPlanOption {
    id: string;
    title: string;
    badge?: string;
    amount: number;
    originalAmount?: number;
    unitText: string;
    billingFrequency: "one_time" | "yearly" | "semester" | "quarterly" | "monthly" | "batch_custom";
    displaySubtitle: string;
    decidedFee: number;
    isBatchSpecial?: boolean;
  }

  const paymentPlans = useMemo<PaymentPlanOption[]>(() => {
    if (!selectedProgram && !activeBatch) return [];

    const rawBatchPrice =
      activeBatch?.price != null && Number(activeBatch.price) > 0
        ? Number(activeBatch.price)
        : activeBatch?.fee_amount != null && Number(activeBatch.fee_amount) > 0
        ? Number(activeBatch.fee_amount)
        : null;

    const programFee = selectedProgram ? Number(selectedProgram.fee_amount) || 0 : 0;
    const baseAmount = rawBatchPrice ?? programFee;
    const discountPct = Number(activeBatch?.discount_percent) || 0;
    const effectiveAmount =
      discountPct > 0 ? Math.round(baseAmount * (1 - discountPct / 100)) : baseAmount;

    if (effectiveAmount <= 0) {
      return [
        {
          id: "custom",
          title: "Custom / Free Fee",
          badge: "Direct",
          amount: 0,
          unitText: "/ month",
          billingFrequency: "monthly",
          displaySubtitle: "Enter custom fee manually",
          decidedFee: 0,
        },
      ];
    }

    const feeUnit = (selectedProgram?.fee_unit || "year").toLowerCase();
    const isUnitMonthly = feeUnit.includes("month");

    const annualFee = isUnitMonthly ? effectiveAmount * 12 : effectiveAmount;
    const monthlyFee = isUnitMonthly ? effectiveAmount : Math.max(1, Math.round(annualFee / 12));
    const semesterFee = Math.round(annualFee / 2);
    const quarterlyFee = Math.round(annualFee / 4);

    const plans: PaymentPlanOption[] = [];

    // 1. One-Time Full Payment
    plans.push({
      id: "one_time",
      title: "One-Time Payment",
      badge: "Full Course",
      amount: annualFee,
      originalAmount: discountPct > 0 ? baseAmount : undefined,
      unitText: "full course",
      billingFrequency: "one_time",
      displaySubtitle: "Full tuition paid in a single lump-sum",
      decidedFee: annualFee,
    });

    // 2. Yearly / Annual Plan
    plans.push({
      id: "yearly",
      title: "Yearly / Annual Plan",
      badge: "12 Months",
      amount: annualFee,
      originalAmount: discountPct > 0 ? baseAmount : undefined,
      unitText: "/ year",
      billingFrequency: "yearly",
      displaySubtitle: `Annual rate (≈ ₹${monthlyFee.toLocaleString("en-IN")}/mo)`,
      decidedFee: annualFee,
    });

    // 3. Semester (2 Terms)
    plans.push({
      id: "semester",
      title: "Semester Plan",
      badge: "2 Terms",
      amount: semesterFee,
      unitText: "/ semester",
      billingFrequency: "semester",
      displaySubtitle: "Pay in 2 equal semester installments",
      decidedFee: semesterFee,
    });

    // 4. Quarterly (4 Terms)
    plans.push({
      id: "quarterly",
      title: "Quarterly Plan",
      badge: "4 Quarters",
      amount: quarterlyFee,
      unitText: "/ quarter",
      billingFrequency: "quarterly",
      displaySubtitle: "Pay in 4 equal quarterly installments",
      decidedFee: quarterlyFee,
    });

    // 5. Monthly Subscription Plan
    plans.push({
      id: "monthly",
      title: "Monthly Plan",
      badge: "Monthly Flex",
      amount: monthlyFee,
      unitText: "/ month",
      billingFrequency: "monthly",
      displaySubtitle: "Standard monthly fee billing",
      decidedFee: monthlyFee,
    });

    // 6. Batch-configured custom installments count
    const batchInstallments = activeBatch?.installments_count ? Number(activeBatch.installments_count) : 0;
    if (batchInstallments > 1 && batchInstallments !== 2 && batchInstallments !== 4 && batchInstallments !== 12) {
      const termAmt = Math.round(annualFee / batchInstallments);
      plans.push({
        id: `batch_inst_${batchInstallments}`,
        title: activeBatch.batch_name ? `${activeBatch.batch_name} Plan` : `${batchInstallments}-Term Plan`,
        badge: `${batchInstallments} Terms`,
        amount: termAmt,
        unitText: `/ term`,
        billingFrequency: "batch_custom",
        displaySubtitle: `Pay in ${batchInstallments} batch installments`,
        decidedFee: termAmt,
        isBatchSpecial: true,
      });
    }

    // 7. Batch module_details custom plans
    if (activeBatch?.module_details) {
      try {
        const details =
          typeof activeBatch.module_details === "string"
            ? JSON.parse(activeBatch.module_details)
            : activeBatch.module_details;
        if (Array.isArray(details)) {
          details.forEach((item: any, idx: number) => {
            const itemAmt = Number(item.amount || item.price || item.fee);
            if (!Number.isNaN(itemAmt) && itemAmt > 0) {
              plans.push({
                id: `batch_mod_${idx}`,
                title: item.title || item.name || item.plan_name || `Batch Plan ${idx + 1}`,
                badge: "Batch Custom",
                amount: itemAmt,
                unitText: item.unit ? `/${item.unit}` : "total",
                billingFrequency: "batch_custom",
                displaySubtitle: item.description || "Configured batch fee option",
                decidedFee: itemAmt,
                isBatchSpecial: true,
              });
            }
          });
        }
      } catch {
        // ignore
      }
    }

    return plans;
  }, [selectedProgram, activeBatch]);

  const selectedPlan = useMemo(() => {
    if (feeStructure.paymentMode) {
      const found = paymentPlans.find((p) => p.id === feeStructure.paymentMode);
      if (found) return found;
    }
    const matched = paymentPlans.find((p) => String(p.decidedFee) === feeStructure.baseFee);
    return matched || paymentPlans[0] || null;
  }, [paymentPlans, feeStructure.paymentMode, feeStructure.baseFee]);

  // Selected transportation slab
  const selectedSlab = useMemo(() => {
    if (!feeStructure.transportZone) return null;
    return (
      transportSlabs.find((s) => s.value === feeStructure.transportZone) ||
      TRANSPORT_SLABS.find((s) => s.value === feeStructure.transportZone) ||
      transportSlabs.find(
        (s) =>
          s.value.includes(feeStructure.transportZone) ||
          feeStructure.transportZone.includes(s.value)
      ) ||
      null
    );
  }, [transportSlabs, feeStructure.transportZone]);

  // Base monthly rate for the chosen zone or manual override
  const baseMonthlyTransportRate = useMemo(() => {
    if (!feeStructure.withTransport) return 0;
    if (feeStructure.transportFeeOverride && !Number.isNaN(Number(feeStructure.transportFeeOverride))) {
      return Math.max(0, Number(feeStructure.transportFeeOverride));
    }
    return selectedSlab ? Number(selectedSlab.monthly_fee ?? selectedSlab.fee) || 0 : 0;
  }, [feeStructure.withTransport, feeStructure.transportFeeOverride, selectedSlab]);

  // Transportation multiplier (in months) according to the selected plan
  const { transportMultiplier, transportPeriodLabel } = useMemo(() => {
    const freq = selectedPlan?.billingFrequency || feeStructure.paymentMode || "";
    const unit = (selectedPlan?.unitText || feeStructure.paymentUnitText || "").toLowerCase();

    if (freq === "monthly" || unit.includes("month")) {
      return { transportMultiplier: 1, transportPeriodLabel: "1 month" };
    }
    if (freq === "quarterly" || unit.includes("quarter")) {
      return { transportMultiplier: 3, transportPeriodLabel: "3 months" };
    }
    if (freq === "semester" || unit.includes("semester") || (unit.includes("term") && unit.includes("2"))) {
      return { transportMultiplier: 6, transportPeriodLabel: "6 months" };
    }
    if (freq === "yearly" || unit.includes("year") || unit.includes("annual")) {
      return { transportMultiplier: 12, transportPeriodLabel: "12 months" };
    }
    if (freq === "one_time" || unit.includes("full") || unit.includes("course") || unit.includes("lump")) {
      return { transportMultiplier: 12, transportPeriodLabel: "full course (12 mo)" };
    }
    if (freq === "batch_custom") {
      const batchInstallments = activeBatch?.installments_count ? Number(activeBatch.installments_count) : 0;
      if (batchInstallments > 0) {
        const m = Math.max(1, Math.round(12 / batchInstallments));
        return { transportMultiplier: m, transportPeriodLabel: `${m} months` };
      }
    }
    return { transportMultiplier: 1, transportPeriodLabel: "1 month" };
  }, [selectedPlan, feeStructure.paymentMode, feeStructure.paymentUnitText, activeBatch]);

  // Transportation fee calculated according to selected plan (e.g. monthly: 1 mo, quarterly: 3 mo, semester: 6 mo, yearly: 12 mo)
  const transportFee = useMemo(() => {
    if (!feeStructure.withTransport || baseMonthlyTransportRate <= 0) return 0;
    return baseMonthlyTransportRate * transportMultiplier;
  }, [feeStructure.withTransport, baseMonthlyTransportRate, transportMultiplier]);

  const baseFeeAmount = useMemo(() => {
    const n = Number(feeStructure.baseFee);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  }, [feeStructure.baseFee]);

  const concessionAmount = useMemo(() => {
    const pct = Number(feeStructure.concessionPercent);
    if (Number.isNaN(pct) || pct <= 0) return 0;
    return Math.round(((baseFeeAmount + transportFee) * Math.min(pct, 100)) / 100);
  }, [baseFeeAmount, transportFee, feeStructure.concessionPercent]);

  const totalFee = useMemo(() => {
    return Math.max(0, baseFeeAmount + transportFee - concessionAmount);
  }, [baseFeeAmount, transportFee, concessionAmount]);

  const handleSelectPaymentPlan = useCallback((plan: PaymentPlanOption) => {
    setFeeStructure((prev) => ({
      ...prev,
      paymentMode: plan.id,
      paymentPlanTitle: plan.title,
      paymentUnitText: plan.unitText,
      baseFee: String(plan.decidedFee),
      feeNote: `Payment Plan: ${plan.title} (${plan.amount > 0 ? `₹${plan.amount.toLocaleString("en-IN")} ${plan.unitText}` : "Free"})`,
    }));
  }, []);

  const applyProgramFee = useCallback((prog: ProgramOption, overrideUserValues = false) => {
    const rawFee = Number(prog.fee_amount) || 0;
    const unit = (prog.fee_unit || "year").toLowerCase();
    const monthlyFee =
      rawFee > 0
        ? unit.includes("year") || unit.includes("annual")
          ? Math.round(rawFee / 12)
          : Math.round(rawFee)
        : 0;

    let discountPct = "";
    if (Array.isArray(prog.fee_components) && prog.fee_components.length > 0) {
      const compWithDiscount = prog.fee_components.find((c) => Number(c.discount_value) > 0);
      if (compWithDiscount) {
        if (compWithDiscount.discount_type === "percent") {
          discountPct = String(compWithDiscount.discount_value);
        } else if (compWithDiscount.amount && Number(compWithDiscount.amount) > 0) {
          discountPct = String(
            Math.round((Number(compWithDiscount.discount_value) / Number(compWithDiscount.amount)) * 100)
          );
        }
      }
    }

    setFeeStructure((prev) => {
      const shouldSetBaseFee = overrideUserValues || !prev.baseFee || prev.baseFee === "0";
      const shouldSetDiscount = overrideUserValues || !prev.concessionPercent;
      return {
        ...prev,
        baseFee: shouldSetBaseFee
          ? monthlyFee > 0
            ? String(monthlyFee)
            : rawFee > 0
            ? String(rawFee)
            : prev.baseFee
          : prev.baseFee,
        concessionPercent:
          shouldSetDiscount && discountPct ? discountPct : prev.concessionPercent,
        feeNote:
          prev.feeNote ||
          (rawFee > 0
            ? `Auto-filled from ${prog.title} (Standard: ₹${rawFee.toLocaleString("en-IN")}/${prog.fee_unit || "year"})`
            : prev.feeNote),
      };
    });
  }, []);

  // When selectedProgram is loaded/resolved, ensure fee is populated if baseFee is currently empty
  useEffect(() => {
    if (selectedProgram && (!feeStructure.baseFee || feeStructure.baseFee === "0")) {
      applyProgramFee(selectedProgram, false);
    }
  }, [selectedProgram, feeStructure.baseFee, applyProgramFee]);

  const enrollmentFormState = {
    selectedInstitutionId,
    selectedAcademicYearId,
    selectedProgramId,
    selectedBatchName,
    selectedSectionId,
    rollNumber,
    status,
    admissionDate,
    remarks,
  };
  const enrollmentFormKey = `enrollment:${student?.id ?? "new"}`;
  const { saveStatus } = useProgressiveSave({
    formKey: enrollmentFormKey,
    formState: enrollmentFormState,
    enabled: open,
  });

  const activeEnrollmentRef = useRef<EnrollmentRecord | null>(null);

  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingAcademicYears, setLoadingAcademicYears] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load Institutions on demand
  const loadInstitutions = useCallback(async () => {
    if (!accessToken || loadingInstitutions) return;
    setLoadingInstitutions(true);
    try {
      const res = await fetch(`/api/admin/institutions/profiles?page=1&limit=50`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJsonResponse<{ data?: any[] }>(res);
      if (Array.isArray(json.data) && json.data.length > 0) {
        const list = json.data.map((inst: any) => ({
          id: inst.id,
          name: inst.name,
        }));
        setInstitutions(list);
      }
    } catch (err) {
      console.error("Failed to load institutions:", err);
    } finally {
      setLoadingInstitutions(false);
    }
  }, [accessToken, loadingInstitutions]);

  // Load Academic Years on demand
  const loadAcademicYears = useCallback(async (instId?: string) => {
    if (!accessToken) return;
    const targetInstId = instId || selectedInstitutionId || (institutionId ? String(institutionId) : "");
    setLoadingAcademicYears(true);
    try {
      const url = targetInstId
        ? `/api/admin/institutions/academic-years?institutionId=${targetInstId}&limit=100`
        : `/api/admin/institutions/academic-years?limit=100`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJsonResponse<{ data?: AcademicYearOption[] }>(res);
      if (Array.isArray(json.data)) {
        setAcademicYears(json.data);
      }
    } catch (err) {
      console.error("Failed to load academic years:", err);
    } finally {
      setLoadingAcademicYears(false);
    }
  }, [accessToken, selectedInstitutionId, institutionId]);

  // Load Programs on demand with full fee details
  const loadPrograms = useCallback(async (instId?: string) => {
    if (!accessToken) return;
    const targetInstId = instId || selectedInstitutionId || (institutionId ? String(institutionId) : "");
    setLoadingPrograms(true);
    try {
      const url = targetInstId
        ? `/api/admin/institutions/programs?institutionId=${targetInstId}&limit=100`
        : `/api/admin/institutions/programs?limit=100`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJsonResponse<{ data?: any[] }>(res);
      if (Array.isArray(json.data)) {
        const list: ProgramOption[] = json.data.map((p: any) => ({
          id: p.id,
          title: p.title || p.name,
          fee_amount: p.fee_amount,
          fee_unit: p.fee_unit,
          admission_fee: p.admission_fee,
          fee_components: p.fee_components,
        }));
        setPrograms(list);
      }
    } catch (err) {
      console.error("Failed to load programs:", err);
    } finally {
      setLoadingPrograms(false);
    }
  }, [accessToken, selectedInstitutionId, institutionId]);

  // Load Batches & Sections on demand
  const loadBatchesAndSections = useCallback(async (progId?: string, preferredSectionId?: number | null) => {
    const targetProgId = progId || selectedProgramId;
    if (!accessToken || !targetProgId) return;
    setLoadingSections(true);
    try {
      const batchRes = await fetch(`/api/admin/institutions/programs/${targetProgId}/batches`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const batchJson = await readJsonResponse<any>(batchRes);
      const rawBatches: BatchOption[] = Array.isArray(batchJson?.data) ? batchJson.data : [];
      setBatches(rawBatches);

      const secList: SectionOption[] = [];
      if (rawBatches.length > 0) {
        for (const b of rawBatches) {
          const bName = (b.batch_name || b.name || "Default Batch").trim();
          if (b.section_ids && Array.isArray(b.section_ids) && b.section_ids.length > 0) {
            b.section_ids.forEach((sId: number, idx: number) => {
              const sName = b.sections?.[idx] || `Section ${sId}`;
              if (!secList.some((existing) => existing.id === sId && existing.batch_name === bName)) {
                secList.push({
                  id: sId,
                  name: sName,
                  batch_name: bName,
                });
              }
            });
          }
          const directSecId = b.section_id || (b.id && b.id > 0 ? b.id : null);
          if (directSecId) {
            const sName = (b.section_name || b.original_section_name || (b.name !== bName ? b.name : "") || `Section ${directSecId}`).trim();
            if (!secList.some((existing) => existing.id === directSecId && existing.batch_name === bName)) {
              secList.push({
                id: directSecId,
                name: sName,
                batch_name: bName,
              });
            }
          }
        }
      }

      const targetSecId = preferredSectionId ?? (selectedSectionId ? Number(selectedSectionId) : null);
      if (targetSecId && !secList.some((s) => s.id === targetSecId)) {
        const fallbackName = activeEnrollmentRef.current?.section_name || `Section ${targetSecId}`;
        secList.unshift({
          id: targetSecId,
          name: fallbackName,
          batch_name: selectedBatchName !== "ALL" ? selectedBatchName : "Current Section",
        });
      }

      setAllSections(secList);

      if (targetSecId) {
        const matched = secList.find((s) => s.id === targetSecId);
        if (matched?.batch_name) {
          setSelectedBatchName(matched.batch_name);
          const filtered = secList.filter((s) => s.batch_name === matched.batch_name);
          setSections(filtered.length > 0 ? filtered : secList);
          setSelectedSectionId(String(targetSecId));
          return;
        }
      }

      if (selectedBatchName && selectedBatchName !== "ALL") {
        const filtered = secList.filter((s) => s.batch_name === selectedBatchName);
        setSections(filtered.length > 0 ? filtered : secList);
        if (filtered.length > 0 && !filtered.some((s) => String(s.id) === selectedSectionId)) {
          setSelectedSectionId(String(filtered[0].id));
        }
      } else {
        setSections(secList);
        if (secList.length === 1 && !selectedSectionId) {
          setSelectedSectionId(String(secList[0].id));
        }
      }
    } catch (err) {
      console.error("Error loading batches & sections:", err);
    } finally {
      setLoadingSections(false);
    }
  }, [accessToken, selectedProgramId, selectedSectionId, selectedBatchName]);

  // Fetch student's existing enrollments (only 1 request on dialog open)
  const fetchStudentEnrollments = useCallback(async () => {
    if (!student?.id || !accessToken) return;

    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(`progressive_draft:enrollment:${student.id}`);
      }
    } catch {
      // ignore
    }

    try {
      const res = await fetch(`/api/admin/students/${student.id}/enrollments`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJsonResponse<{ data?: EnrollmentRecord[] }>(res);
      if (res.ok && Array.isArray(json.data) && json.data.length > 0) {
        setEnrollments(json.data);
        const activeEnr = json.data.find((e) => e.is_current) || json.data[0];
        if (activeEnr) {
          activeEnrollmentRef.current = activeEnr;
          if (activeEnr.institution_id) {
            setSelectedInstitutionId(String(activeEnr.institution_id));
          }
          if (activeEnr.program_id) {
            setSelectedProgramId(String(activeEnr.program_id));
            void loadBatchesAndSections(String(activeEnr.program_id), activeEnr.section_id);
            if (activeEnr.program_name) {
              setPrograms((prev) => {
                const exists = prev.find((p) => p.id === activeEnr.program_id);
                if (exists) return prev;
                return [
                  {
                    id: activeEnr.program_id!,
                    title: activeEnr.program_name!,
                    fee_amount: activeEnr.program_fee_amount,
                    fee_unit: activeEnr.program_fee_unit,
                    admission_fee: activeEnr.program_admission_fee,
                  },
                  ...prev,
                ];
              });
            }
          }
          if (activeEnr.section_id) {
            setSelectedSectionId(String(activeEnr.section_id));
            if (activeEnr.section_name) {
              setSections([{ id: activeEnr.section_id, name: activeEnr.section_name }]);
              setAllSections([{ id: activeEnr.section_id, name: activeEnr.section_name }]);
            }
          }
          if (activeEnr.academic_year_id) {
            setSelectedAcademicYearId(String(activeEnr.academic_year_id));
            if (activeEnr.academic_year_name) {
              setAcademicYears([{ id: activeEnr.academic_year_id, name: activeEnr.academic_year_name }]);
            }
          }
          if (activeEnr.roll_number) {
            setRollNumber(activeEnr.roll_number);
          } else {
            setRollNumber("");
          }
          if (activeEnr.status) {
            setStatus(activeEnr.status);
          }
          if (activeEnr.admission_date) {
            try {
              const formattedDate = new Date(activeEnr.admission_date).toISOString().split("T")[0];
              if (formattedDate && !isNaN(new Date(formattedDate).getTime())) {
                setAdmissionDate(formattedDate);
              }
            } catch {
              // ignore invalid date
            }
          }
          if (activeEnr.remarks) {
            setRemarks(activeEnr.remarks);
          } else {
            setRemarks("");
          }

          // Restore or auto-calculate student fee structure
          if (activeEnr.course_fee && Number(activeEnr.course_fee) > 0) {
            setFeeStructure((prev) => ({
              ...prev,
              baseFee: String(Number(activeEnr.course_fee)),
              withTransport: Boolean(activeEnr.has_transport),
              transportZone: activeEnr.transport_zone || "",
              transportFeeOverride: activeEnr.transport_fee ? String(Number(activeEnr.transport_fee)) : "",
            }));
          } else if (activeEnr.program_fee_amount && Number(activeEnr.program_fee_amount) > 0) {
            const pFee = Number(activeEnr.program_fee_amount);
            const pUnit = (activeEnr.program_fee_unit || "year").toLowerCase();
            const monthly = pUnit.includes("year") || pUnit.includes("annual") ? Math.round(pFee / 12) : Math.round(pFee);
            setFeeStructure((prev) => ({
              ...prev,
              baseFee: String(monthly),
              feeNote: prev.feeNote || `Auto-filled from ${activeEnr.program_name || "Program"} (₹${pFee.toLocaleString("en-IN")}/${pUnit})`,
            }));
          }
        }
      } else {
        activeEnrollmentRef.current = null;
        setEnrollments([]);
        setSelectedProgramId("");
        setSelectedSectionId("");
        setSelectedAcademicYearId("");
        setRollNumber("");
        setStatus("active");
        setAdmissionDate(new Date().toISOString().split("T")[0]);
        setRemarks("");
      }
    } catch {
      // ignore
    }
  }, [accessToken, student?.id]);

  // Load institution's configured transportation fee slabs
  const loadTransportSlabs = useCallback(async (instId?: string) => {
    if (!accessToken) return;
    const targetInstId = instId || selectedInstitutionId || (institutionId ? String(institutionId) : "");
    try {
      const url = targetInstId
        ? `/api/admin/finance/transportation-fees?institutionId=${targetInstId}`
        : `/api/admin/finance/transportation-fees`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJsonResponse<{ data?: any[] }>(res);
      if (Array.isArray(json?.data) && json.data.length > 0) {
        const mapped: TransportSlabOption[] = json.data
          .filter((s: any) => s.is_active)
          .map((s: any) => ({
            label: `${s.slab_name} (${s.min_km}–${s.max_km} km)`,
            value: `slab_${s.id}`,
            fee: Number(s.monthly_fee) || 0,
            monthly_fee: Number(s.monthly_fee) || 0,
            quarterly_fee: s.quarterly_fee != null ? Number(s.quarterly_fee) : null,
            annual_fee: s.annual_fee != null ? Number(s.annual_fee) : null,
            min_km: s.min_km,
            max_km: s.max_km,
          }));
        if (mapped.length > 0) {
          setTransportSlabs(mapped);
        }
      }
    } catch {
      // fallback to standard TRANSPORT_SLABS
    }
  }, [accessToken, selectedInstitutionId, institutionId]);

  // Sync when dialog opens
  useEffect(() => {
    if (!open) {
      activeEnrollmentRef.current = null;
      return;
    }

    const targetInstId = institutionId ? String(institutionId) : selectedInstitutionId;
    if (targetInstId) {
      setSelectedInstitutionId(String(targetInstId));
    }

    void loadPrograms(targetInstId || undefined);
    void loadAcademicYears(targetInstId || undefined);
    void loadTransportSlabs(targetInstId || undefined);
    void fetchStudentEnrollments();
  }, [open, institutionId, fetchStudentEnrollments, loadPrograms, loadAcademicYears, loadTransportSlabs]);

  const handleBatchChange = (batchName: string) => {
    setSelectedBatchName(batchName);
    if (batchName === "ALL") {
      setSections(allSections);
      if (allSections.length > 0 && !allSections.some((s) => String(s.id) === selectedSectionId)) {
        setSelectedSectionId(String(allSections[0].id));
      }
    } else {
      const filtered = allSections.filter((s) => (s.batch_name || "Default Batch") === batchName);
      setSections(filtered);
      if (filtered.length > 0) {
        if (!filtered.some((s) => String(s.id) === selectedSectionId)) {
          setSelectedSectionId(String(filtered[0].id));
        }
      } else {
        setSelectedSectionId("");
      }
    }
  };

  const handleSaveEnrollment = async () => {
    const studentInstId = (student as any)?.institution_id || (student as any)?.institutionId;
    const targetInstId =
      selectedInstitutionId ||
      (institutionId ? String(institutionId) : "") ||
      (studentInstId ? String(studentInstId) : "") ||
      (institutions[0]?.id ? String(institutions[0].id) : "");
    if (!targetInstId) {
      toast.error("Please select an Institution / School.");
      return;
    }
    if (!selectedProgramId) {
      toast.error("Please select a Program / Class.");
      return;
    }
    if (!selectedAcademicYearId) {
      toast.error("Please select an Academic Year / Session.");
      return;
    }
    if (!student?.id || !accessToken) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/students/${student.id}/enrollments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institutionId: Number(targetInstId),
          programId: Number(selectedProgramId),
          academicYearId: Number(selectedAcademicYearId),
          sectionId: selectedSectionId ? Number(selectedSectionId) : null,
          rollNumber: rollNumber.trim() || null,
          status,
          admissionDate,
          remarks,
          hasTransport: feeStructure.withTransport,
          transportFee: transportFee,
          transportZone: feeStructure.transportZone || null,
          pickupAddress: feeStructure.pickupAddress || null,
          courseFee: baseFeeAmount,
          totalFee: totalFee,
          paymentPlan: feeStructure.paymentMode || "quarterly",
          paymentPlanTitle: feeStructure.paymentPlanTitle || "Quarterly Plan",
          installmentAmount: baseFeeAmount,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to assign class");

      toast.success(`Assigned class to ${student.full_name} successfully!`);
      setSelectedProgramId("");
      setSelectedBatchName("ALL");
      setSelectedSectionId("");
      setRollNumber("");
      setRemarks("");
      void fetchStudentEnrollments();
      onAssignedSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to assign class");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border bg-background shadow-2xl">
        {/* Dialog Header */}
        <div className="p-6 pb-4 border-b bg-muted/20">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <GraduationCap className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                  Assign Program & Class
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Assigning class, batch, section, session, and roll number for <span className="font-semibold text-foreground">{student?.full_name}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Tab Navigation */}
        <div className="border-b px-6 bg-muted/10 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("assignment")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap",
              activeTab === "assignment"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <GraduationCap className="size-4" />
            Program & Class
            {selectedProgram && (
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium max-w-[120px] truncate">
                {selectedProgram.title}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("transport")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap",
              activeTab === "transport"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Bus className="size-4" />
            Transportation
            {feeStructure.withTransport ? (
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                ₹{transportFee.toLocaleString()} {feeStructure.paymentUnitText || "/mo"}
              </span>
            ) : (
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                None
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("fee_details")}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap",
              activeTab === "fee_details"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <IndianRupee className="size-4" />
            Fee Details & Structure
            {(totalFee > 0 || baseFeeAmount > 0) && (
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                ₹{(totalFee > 0 ? totalFee : baseFeeAmount).toLocaleString()} {feeStructure.paymentUnitText || "/mo"}
              </span>
            )}
          </button>
        </div>

        <div className="p-6 space-y-6">
          {activeTab === "assignment" && (
            <>
              {/* Existing enrollments history */}
              {enrollments.length > 0 && (
                <div className="rounded-xl border bg-muted/30 p-4 space-y-2.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Current Enrollments ({enrollments.length})
                  </p>
                  <div className="space-y-2">
                    {enrollments.map((enr) => (
                      <div key={enr.id} className="flex items-center justify-between text-sm rounded-lg bg-card p-3 border shadow-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <span>{enr.program_name || "Program"}</span>
                            {enr.section_name && (
                              <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-normal">
                                Section {enr.section_name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-3">
                            <span>Session: {enr.academic_year_name || "—"}</span>
                            {enr.roll_number && <span>• Roll: {enr.roll_number}</span>}
                          </div>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${enr.is_current ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-muted text-muted-foreground"}`}>
                          {enr.is_current ? "Current" : enr.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form fields */}
              <div className="rounded-xl border bg-card p-5 space-y-5 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Program / Class */}
                  <div className="space-y-1.5">
                    <Label htmlFor="assign-program" className="text-xs font-semibold">Program / Class *</Label>
                    <Select
                      value={selectedProgramId}
                      onValueChange={(val) => {
                        setSelectedProgramId(val);
                        setSelectedBatchName("ALL");
                        setSelectedSectionId("");
                        setBatches([]);
                        setAllSections([]);
                        setSections([]);
                        void loadBatchesAndSections(val);

                        const prog = programs.find((p) => String(p.id) === String(val));
                        if (prog) {
                          applyProgramFee(prog, true);
                        }
                      }}
                      onOpenChange={(isOpen) => {
                        if (isOpen && programs.length <= 1) {
                          void loadPrograms(selectedInstitutionId);
                        }
                      }}
                    >
                      <SelectTrigger id="assign-program" className="w-full h-10 text-sm">
                        <SelectValue
                          placeholder={
                            loadingPrograms
                              ? "Loading classes..."
                              : "Select program / class..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingPrograms ? (
                          <div className="flex items-center justify-center p-3 text-xs text-muted-foreground">
                            <Loader2 className="size-4 animate-spin mr-2" /> Loading classes...
                          </div>
                        ) : (
                          programs.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              <div className="flex items-center justify-between gap-3 w-full">
                                <span>{p.title}</span>
                                {Number(p.fee_amount) > 0 && (
                                  <span className="text-[11px] font-semibold text-primary/80">
                                    ₹{Number(p.fee_amount).toLocaleString("en-IN")}/{p.fee_unit || "yr"}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Batch */}
                  <div className="space-y-1.5">
                    <Label htmlFor="assign-batch" className="text-xs font-semibold">Batch</Label>
                    <Select
                      value={selectedBatchName}
                      onValueChange={handleBatchChange}
                      onOpenChange={(isOpen) => {
                        if (isOpen && batches.length === 0 && selectedProgramId) {
                          void loadBatchesAndSections(selectedProgramId);
                        }
                      }}
                      disabled={!selectedProgramId || loadingSections}
                    >
                      <SelectTrigger id="assign-batch" className="w-full h-10 text-sm">
                        <SelectValue
                          placeholder={
                            loadingSections
                              ? "Loading batches..."
                              : selectedProgramId
                              ? (uniqueBatches.length === 0 ? "No batches available" : "Select batch...")
                              : "Select program first"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Batches ({uniqueBatches.length || (allSections.length > 0 ? 1 : 0)})</SelectItem>
                        {uniqueBatches.map((batch) => (
                          <SelectItem key={batch.batch_name} value={batch.batch_name}>
                            {batch.batch_name} {batch.studentCount > 0 ? `(${batch.studentCount} std)` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Section */}
                  <div className="space-y-1.5">
                    <Label htmlFor="assign-section" className="text-xs font-semibold">Section</Label>
                    <Select
                      value={selectedSectionId}
                      onValueChange={setSelectedSectionId}
                      onOpenChange={(isOpen) => {
                        if (isOpen && allSections.length === 0 && selectedProgramId) {
                          void loadBatchesAndSections(selectedProgramId);
                        }
                      }}
                      disabled={!selectedProgramId || loadingSections}
                    >
                      <SelectTrigger id="assign-section" className="w-full h-10 text-sm">
                        <SelectValue
                          placeholder={
                            loadingSections
                              ? "Loading sections..."
                              : selectedProgramId
                              ? (sections.length === 0 ? "No sections available" : "Select section...")
                              : "Select program first"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((s) => (
                          <SelectItem key={`${s.id}-${s.batch_name || ""}`} value={String(s.id)}>
                            {s.name} {s.batch_name && selectedBatchName === "ALL" ? `(${s.batch_name})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Academic Year / Session */}
                  <div className="space-y-1.5">
                    <Label htmlFor="assign-ay" className="text-xs font-semibold">Academic Year / Session *</Label>
                    <Select
                      value={selectedAcademicYearId}
                      onValueChange={setSelectedAcademicYearId}
                      onOpenChange={(isOpen) => {
                        if (isOpen && academicYears.length <= 1) {
                          void loadAcademicYears(selectedInstitutionId);
                        }
                      }}
                    >
                      <SelectTrigger id="assign-ay" className="w-full h-10 text-sm">
                        <SelectValue placeholder={loadingAcademicYears ? "Loading sessions..." : "Select academic year"} />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingAcademicYears ? (
                          <div className="flex items-center justify-center p-3 text-xs text-muted-foreground">
                            <Loader2 className="size-4 animate-spin mr-2" /> Loading sessions...
                          </div>
                        ) : (
                          academicYears.map((ay) => (
                            <SelectItem key={ay.id} value={String(ay.id)}>
                              {ay.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Roll Number */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="assign-roll" className="text-xs font-semibold">Roll Number</Label>
                    <Input
                      id="assign-roll"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="Enter roll number"
                      className="w-full h-10 text-sm"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "transport" && (
            <div className="space-y-5">
              {/* Transport Service Option */}
              <div className="rounded-xl border border-border/70 bg-card p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Bus className="size-4 text-primary" />
                    Transport Service Option
                  </h4>
                  {feeStructure.withTransport ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium border border-amber-500/20">
                      ₹{transportFee.toLocaleString()}/mo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-muted text-muted-foreground font-medium">
                      No Transport
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                  <label
                    htmlFor="assign-transport-none"
                    className={cn(
                      "flex flex-1 cursor-pointer select-none items-center gap-3 rounded-lg border p-4 transition-all duration-200",
                      !feeStructure.withTransport
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-border/80"
                    )}
                  >
                    <input
                      id="assign-transport-none"
                      type="radio"
                      name="assign-transport-option"
                      className="accent-primary"
                      checked={!feeStructure.withTransport}
                      onChange={() =>
                        setFeeStructure((prev) => ({
                          ...prev,
                          withTransport: false,
                          transportZone: "",
                          transportFeeOverride: "",
                        }))
                      }
                    />
                    <div>
                      <p className="text-sm font-semibold">Without Transport</p>
                      <p className="text-xs text-muted-foreground">Student commutes independently (₹0/mo)</p>
                    </div>
                  </label>

                  <label
                    htmlFor="assign-transport-yes"
                    className={cn(
                      "flex flex-1 cursor-pointer select-none items-center gap-3 rounded-lg border p-4 transition-all duration-200",
                      feeStructure.withTransport
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-border/80"
                    )}
                  >
                    <input
                      id="assign-transport-yes"
                      type="radio"
                      name="assign-transport-option"
                      className="accent-primary"
                      checked={feeStructure.withTransport}
                      onChange={() =>
                        setFeeStructure((prev) => ({
                          ...prev,
                          withTransport: true,
                          transportZone: prev.transportZone || "zone_a",
                        }))
                      }
                    />
                    <div>
                      <p className="text-sm font-semibold">With Transport</p>
                      <p className="text-xs text-muted-foreground">School bus / van service provided</p>
                    </div>
                  </label>
                </div>

                {/* Zone picker & details — only when transport is selected */}
                {feeStructure.withTransport && (
                  <div className="space-y-4 pt-4 border-t">
                    {/* Active Plan Cycle & Calculated Transport Fee banner */}
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Bus className="size-4 text-primary" />
                        <span className="font-semibold text-foreground">
                          Selected Plan: <span className="text-primary font-bold">{selectedPlan?.title || "Monthly Plan"}</span>
                        </span>
                        <span className="text-muted-foreground font-normal">
                          ({transportPeriodLabel})
                        </span>
                      </div>
                      <div className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                        <span>Calculated Transport Charge:</span>
                        <span className="text-primary font-extrabold text-sm">₹{transportFee.toLocaleString()}</span>
                        <span className="text-muted-foreground font-normal">({feeStructure.paymentUnitText || "/cycle"})</span>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="assign-transport-zone" className="text-xs font-semibold">Distance Zone *</Label>
                        <Select
                          value={feeStructure.transportZone}
                          onValueChange={(val) =>
                            setFeeStructure((prev) => ({
                              ...prev,
                              transportZone: val,
                              transportFeeOverride: "",
                            }))
                          }
                        >
                          <SelectTrigger id="assign-transport-zone" className="h-10 text-sm">
                            <SelectValue placeholder="Select zone based on distance from school" />
                          </SelectTrigger>
                          <SelectContent>
                            {(transportSlabs.length > 0 ? transportSlabs : TRANSPORT_SLABS).map((slab) => {
                              const slabRate = Number(slab.monthly_fee ?? slab.fee) || 0;
                              const periodSlabFee = slabRate * transportMultiplier;
                              return (
                                <SelectItem key={slab.value} value={slab.value}>
                                  {slab.label} — ₹{slabRate.toLocaleString()}/mo
                                  {transportMultiplier > 1 && (
                                    <span className="text-muted-foreground ml-1">
                                      (₹{periodSlabFee.toLocaleString()} {feeStructure.paymentUnitText || "/cycle"})
                                    </span>
                                  )}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="assign-transport-override" className="text-xs font-semibold">
                          Custom Monthly Transport Fee{" "}
                          <span className="font-normal text-muted-foreground">
                            (overrides zone rate{transportMultiplier > 1 ? ` • multiplied by ${transportMultiplier} mo` : ""})
                          </span>
                        </Label>
                        <InputGroup>
                          <InputGroupAddon>₹</InputGroupAddon>
                          <InputGroupInput
                            id="assign-transport-override"
                            type="number"
                            min="0"
                            step="50"
                            value={feeStructure.transportFeeOverride}
                            onChange={(e) =>
                              setFeeStructure((prev) => ({
                                ...prev,
                                transportFeeOverride: e.target.value,
                              }))
                            }
                            placeholder="Leave blank to use zone rate"
                          />
                        </InputGroup>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="assign-pickup-address" className="text-xs font-semibold flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-muted-foreground" />
                        Pickup / Drop Point Address
                      </Label>
                      <Input
                        id="assign-pickup-address"
                        value={feeStructure.pickupAddress}
                        onChange={(e) =>
                          setFeeStructure((prev) => ({
                            ...prev,
                            pickupAddress: e.target.value,
                          }))
                        }
                        placeholder="e.g. Sector 4 Main Gate, Green Park Bus Stop"
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "fee_details" && (
            <div className="space-y-5">
              {/* Course / Base Fee */}
              {(() => {
                const progFeeAmount = selectedProgram ? Number(selectedProgram.fee_amount) || 0 : 0;
                const progFeeUnit = selectedProgram?.fee_unit || "year";
                const progMonthlyEquiv =
                  progFeeAmount > 0
                    ? progFeeUnit.toLowerCase().includes("month")
                    ? Math.round(progFeeAmount)
                    : Math.round(progFeeAmount / 12)
                    : 0;
                const progAdmissionFee = selectedProgram ? Number(selectedProgram.admission_fee) || 0 : 0;

                return (
                  <div className="rounded-xl border border-border/70 bg-card p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h4 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Calculator className="size-4 text-primary" />
                        Fee Details
                      </h4>
                      {selectedProgram && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                          <Sparkles className="size-3" />
                          Auto-synced from {selectedProgram.title}
                        </span>
                      )}
                    </div>

                    {/* Course Fee info card if selectedProgram has fee details */}
                    {selectedProgram && (progFeeAmount > 0 || progAdmissionFee > 0) && (
                      <div className="rounded-lg bg-muted/40 border border-border/80 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 font-semibold text-foreground">
                            <span>Standard Course Fee:</span>
                            <span className="text-primary font-bold text-sm">
                              ₹{progFeeAmount.toLocaleString("en-IN")}
                            </span>
                            <span className="text-muted-foreground font-normal">/ {progFeeUnit}</span>
                            {progFeeUnit.toLowerCase().includes("year") && progMonthlyEquiv > 0 && (
                              <span className="text-muted-foreground font-normal">
                                (≈ ₹{progMonthlyEquiv.toLocaleString("en-IN")}/month)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {progAdmissionFee > 0 && `One-time Admission: ₹${progAdmissionFee.toLocaleString("en-IN")} • `}
                            Class: <span className="font-medium text-foreground">{selectedProgram.title}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => applyProgramFee(selectedProgram, true)}
                          className="text-xs px-2.5 py-1 rounded-md bg-background border hover:bg-muted font-medium text-foreground transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>↻</span> Reset to Course Default
                        </button>
                      </div>
                    )}

                    {/* Available Payment Options in Batch */}
                    {paymentPlans.length > 0 && (
                      <div className="space-y-2.5 pt-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <Label className="text-xs font-bold tracking-tight text-foreground flex items-center gap-2">
                            <CreditCard className="size-4 text-primary" />
                            Available Payment Options in Batch / Class
                            {activeBatch?.batch_name && (
                              <span className="text-[11px] font-normal text-muted-foreground">
                                ({activeBatch.batch_name})
                              </span>
                            )}
                          </Label>
                          <span className="text-[11px] text-muted-foreground">
                            Click an option to automatically decide the fee
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {paymentPlans.map((plan) => {
                            const isSelected =
                              feeStructure.paymentMode === plan.id ||
                              (!feeStructure.paymentMode && feeStructure.baseFee === String(plan.decidedFee));
                            return (
                              <button
                                key={plan.id}
                                type="button"
                                onClick={() => handleSelectPaymentPlan(plan)}
                                className={cn(
                                  "relative flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer group shadow-2xs",
                                  isSelected
                                    ? "border-primary bg-primary/5 ring-2 ring-primary/25 shadow-xs"
                                    : "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30"
                                )}
                              >
                                <div className="space-y-1.5 w-full">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5 truncate">
                                      <span
                                        className={cn(
                                          "size-3 rounded-full border flex items-center justify-center shrink-0 transition-all",
                                          isSelected
                                            ? "border-primary bg-primary"
                                            : "border-muted-foreground/40 group-hover:border-primary"
                                        )}
                                      >
                                        {isSelected && <span className="size-1.5 rounded-full bg-primary-foreground" />}
                                      </span>
                                      <span className="truncate">{plan.title}</span>
                                    </span>
                                    {plan.badge && (
                                      <span
                                        className={cn(
                                          "text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0",
                                          isSelected
                                            ? "bg-primary text-primary-foreground"
                                            : plan.isBatchSpecial
                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                            : "bg-muted text-muted-foreground"
                                        )}
                                      >
                                        {plan.badge}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-baseline gap-1.5 pt-0.5">
                                    <span className="text-base sm:text-lg font-black tracking-tight text-foreground">
                                      ₹{plan.amount.toLocaleString("en-IN")}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-normal">
                                      {plan.unitText}
                                    </span>
                                  </div>
                                </div>

                                <p className="mt-2 text-[11px] text-muted-foreground line-clamp-1">
                                  {plan.displaySubtitle}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <Label htmlFor="assign-base-fee" className="text-xs font-semibold">
                            Decided Base Fee{" "}
                            <span className="text-muted-foreground font-normal">
                              ({feeStructure.paymentUnitText || "per billing cycle"})
                            </span>
                          </Label>
                          {selectedPlan && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <Check className="size-3" /> Set by {selectedPlan.title}
                            </span>
                          )}
                        </div>
                        <InputGroup>
                          <InputGroupAddon>₹</InputGroupAddon>
                          <InputGroupInput
                            id="assign-base-fee"
                            type="number"
                            min="0"
                            step="100"
                            value={feeStructure.baseFee}
                            onChange={(e) =>
                              setFeeStructure((prev) => ({ ...prev, baseFee: e.target.value }))
                            }
                            placeholder="e.g. 2000"
                          />
                        </InputGroup>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <Label htmlFor="assign-concession-pct" className="text-xs font-semibold">
                            Concession / Scholarship %
                          </Label>
                          {Number(feeStructure.concessionPercent) > 0 && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              -₹{concessionAmount.toLocaleString()} discount
                            </span>
                          )}
                        </div>
                        <InputGroup>
                          <InputGroupInput
                            id="assign-concession-pct"
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={feeStructure.concessionPercent}
                            onChange={(e) =>
                              setFeeStructure((prev) => ({ ...prev, concessionPercent: e.target.value }))
                            }
                            placeholder="e.g. 10"
                          />
                          <InputGroupAddon>%</InputGroupAddon>
                        </InputGroup>
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="assign-fee-note" className="text-xs font-semibold">Fee Note / Remarks</Label>
                        <Input
                          id="assign-fee-note"
                          value={feeStructure.feeNote}
                          onChange={(e) =>
                            setFeeStructure((prev) => ({ ...prev, feeNote: e.target.value }))
                          }
                          placeholder="e.g. Yearly plan with 10% merit discount"
                          className="h-10 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Live Fee Summary */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                    <IndianRupee className="size-4 text-primary" />
                    Fee Summary & Breakdown
                  </h4>
                  {selectedPlan && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20 flex items-center gap-1.5">
                      <CreditCard className="size-3.5" />
                      {selectedPlan.title}
                    </span>
                  )}
                </div>

                <div className="divide-y divide-border/60 text-sm">
                  <div className="flex items-center justify-between py-2 text-muted-foreground">
                    <span>Selected Payment Option</span>
                    <span className="font-semibold text-foreground">
                      {selectedPlan?.title || "Custom Plan"}
                      <span className="text-xs text-muted-foreground font-normal ml-1">
                        ({feeStructure.paymentUnitText || "per cycle"})
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2 text-muted-foreground">
                    <span>Base Course Fee</span>
                    <span className="font-medium text-foreground">
                      ₹{baseFeeAmount.toLocaleString()} {feeStructure.paymentUnitText || ""}
                    </span>
                  </div>

                  {feeStructure.withTransport ? (
                    <div className="flex items-center justify-between py-2 text-muted-foreground">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Bus className="size-3.5 text-primary shrink-0" />
                        <span className="font-medium text-foreground">Transport Fee</span>
                        {selectedSlab && !feeStructure.transportFeeOverride && (
                          <span className="text-[11px] text-muted-foreground/80">
                            ({selectedSlab.label})
                          </span>
                        )}
                        {feeStructure.transportFeeOverride && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400">
                            (Custom Rate)
                          </span>
                        )}
                        <span className="text-[10px] font-semibold tracking-wide text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                          {transportPeriodLabel}
                          {transportMultiplier > 1 && baseMonthlyTransportRate > 0 && ` • ₹${baseMonthlyTransportRate.toLocaleString()}/mo`}
                        </span>
                      </div>
                      <span className="font-semibold text-foreground whitespace-nowrap">
                        ₹{transportFee.toLocaleString()}
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                          {feeStructure.paymentUnitText || "/mo"}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-2 text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Bus className="size-3.5 text-muted-foreground" />
                        Transport Option
                      </span>
                      <span className="text-xs text-muted-foreground">Without Transport (₹0)</span>
                    </div>
                  )}

                  {concessionAmount > 0 && (
                    <div className="flex items-center justify-between py-2 text-emerald-600 dark:text-emerald-400">
                      <span>Concession ({feeStructure.concessionPercent}%)</span>
                      <span className="font-medium">− ₹{concessionAmount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 text-base font-bold text-foreground">
                    <span>Total Payable</span>
                    <span className="text-primary text-lg font-extrabold">
                      ₹{totalFee.toLocaleString()}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        {feeStructure.paymentUnitText || "/month"}
                      </span>
                    </span>
                  </div>
                </div>

                {!feeStructure.baseFee && (
                  <p className="text-xs text-muted-foreground">Select a payment option above to see the fee breakdown.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="p-6 pt-4 border-t bg-muted/20 flex items-center justify-between">
          <ProgressiveSaveIndicator status={saveStatus} />
          <div className="flex gap-2.5">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {activeTab === "assignment" && (
              <Button type="button" variant="secondary" onClick={() => setActiveTab("transport")}>
                Next: Transportation →
              </Button>
            )}
            {activeTab === "transport" && (
              <>
                <Button type="button" variant="secondary" onClick={() => setActiveTab("assignment")}>
                  ← Back to Program
                </Button>
                <Button type="button" variant="secondary" onClick={() => setActiveTab("fee_details")}>
                  Next: Fee Details →
                </Button>
              </>
            )}
            {activeTab === "fee_details" && (
              <Button type="button" variant="secondary" onClick={() => setActiveTab("transport")}>
                ← Back to Transportation
              </Button>
            )}
            <Button onClick={handleSaveEnrollment} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Save Enrollment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
