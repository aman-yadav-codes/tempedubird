"use client";

import { useState, useMemo } from "react";
import {
  CreditCard,
  Percent,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronDown,
  Tag,
  Wallet,
  Building2,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type FeePlanOption = {
  id: string;
  title: string;
  type: "standard" | "component" | "batch";
  amount: number;
  originalAmount?: number;
  unit?: string | null;
  paymentMode?: string | null;
  discountType?: string | null;
  discountValue?: number | null;
  installmentsCount?: number | null;
  batchName?: string | null;
  sectionName?: string | null;
  description?: string | null;
};

interface Props {
  course: any;
  basePrice: string | number;
  feeComponents?: any[];
  batches?: any[];
}

function formatInr(val: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

export function CoursePriceDropdown({
  course,
  basePrice,
  feeComponents = [],
  batches = [],
}: Props) {
  // Parse base price
  const parsedBasePrice = useMemo(() => {
    if (typeof basePrice === "number") return basePrice;
    if (typeof basePrice === "string") {
      const cleaned = basePrice.replace(/[^0-9.]/g, "");
      const num = parseFloat(cleaned);
      return isNaN(num) ? 25000 : num;
    }
    return 25000;
  }, [basePrice]);

  // Build list of all selectable fee plans
  const planOptions = useMemo<FeePlanOption[]>(() => {
    const plans: FeePlanOption[] = [];

    // 1. Primary Tuition Fee Plan
    plans.push({
      id: "standard-tuition",
      title: "Course Tuition Fee (Full / One-Time)",
      type: "standard",
      amount: parsedBasePrice,
      originalAmount: parsedBasePrice,
      unit: "full course",
      paymentMode: "one_time",
      installmentsCount: 1,
      description: "Complete course tuition with access to all study materials and classroom sessions.",
    });

    // 2. Add Fee Components from Program
    if (Array.isArray(feeComponents)) {
      feeComponents.forEach((fee, idx) => {
        const origVal = Number(fee.amount);
        if (!isNaN(origVal) && origVal > 0) {
          const discountVal = Number(fee.discount_value) || 0;
          const finalVal =
            fee.final_amount != null
              ? Number(fee.final_amount)
              : discountVal > 0 && fee.discount_type === "percentage"
              ? origVal * (1 - discountVal / 100)
              : origVal - discountVal;

          plans.push({
            id: `fee-comp-${fee.id || idx}`,
            title: fee.title || `Fee Option ${idx + 1}`,
            type: "component",
            amount: finalVal,
            originalAmount: origVal,
            unit: fee.unit || "term",
            paymentMode: fee.payment_mode || (fee.unit ? "installment" : "one_time"),
            discountType: fee.discount_type,
            discountValue: discountVal,
            installmentsCount: fee.installments_count || 1,
            description: fee.unit ? `Billed per ${fee.unit}` : undefined,
          });
        }
      });
    }

    // 3. Add Batch-Specific Plans from active batches
    if (Array.isArray(batches)) {
      batches.forEach((b, idx) => {
        const batchPrice = b.price != null ? Number(b.price) : (b.fee_amount != null ? Number(b.fee_amount) : null);
        if (batchPrice != null && !isNaN(batchPrice) && batchPrice > 0) {
          const discountPct = Number(b.discount_percent) || 0;
          const finalBatchPrice = discountPct > 0 ? batchPrice * (1 - discountPct / 100) : batchPrice;
          const batchLabel = b.batch_name || b.name || `Batch ${idx + 1}`;
          const sectionLabel = b.section_name || b.original_section_name || "Section";

          plans.push({
            id: `batch-fee-${b.id || `${b.program_id}-${b.section_id}`}`,
            title: `${batchLabel} (${sectionLabel})`,
            type: "batch",
            amount: finalBatchPrice,
            originalAmount: batchPrice,
            unit: b.academic_term || "batch fee",
            paymentMode: b.installments_count && b.installments_count > 1 ? "installment" : "one_time",
            discountType: "percentage",
            discountValue: discountPct,
            installmentsCount: b.installments_count || 1,
            batchName: batchLabel,
            sectionName: sectionLabel,
            description: `${b.teaching_method || "Classroom"} • ${b.class_frequency || "Regular Schedule"} • ${b.start_time && b.end_time ? `${b.start_time} - ${b.end_time}` : "Flexible Shifts"}`,
          });
        }
      });
    }

    return plans;
  }, [parsedBasePrice, feeComponents, batches]);

  // Selected Plan state
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    planOptions[0]?.id || "standard-tuition"
  );

  const selectedPlan = useMemo(() => {
    return planOptions.find((p) => p.id === selectedPlanId) || planOptions[0];
  }, [planOptions, selectedPlanId]);

  const hasDiscount = Boolean(
    selectedPlan &&
    selectedPlan.originalAmount &&
    selectedPlan.originalAmount > selectedPlan.amount
  );

  const installmentAmount = useMemo(() => {
    if (!selectedPlan || !selectedPlan.installmentsCount || selectedPlan.installmentsCount <= 1) {
      return null;
    }
    return Math.round(selectedPlan.amount / selectedPlan.installmentsCount);
  }, [selectedPlan]);

  return (
    <div className="space-y-4 pt-1">
      {/* Price Plan Selector Dropdown */}
      <div className="space-y-1.5">
        <label className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-foreground">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            Select Fee Structure / Plan
          </span>
          {planOptions.length > 1 && (
            <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30 py-0">
              {planOptions.length} Plans Available
            </Badge>
          )}
        </label>

        <div className="relative">
          <select
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            aria-label="Select Fee Structure / Plan"
            className="w-full appearance-none rounded-xl border border-primary/30 bg-background px-3.5 py-2.5 pr-9 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-primary focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            {planOptions.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title} — {formatInr(plan.amount)}
                {plan.unit ? ` (${plan.unit})` : ""}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Prominent Dynamic Price Display */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {selectedPlan?.title || "Course Fee"}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-primary">
                {formatInr(selectedPlan?.amount || parsedBasePrice)}
              </span>
              {selectedPlan?.unit && (
                <span className="text-xs font-semibold text-muted-foreground">
                  / {selectedPlan.unit}
                </span>
              )}
            </div>
          </div>

          {hasDiscount && (
            <div className="text-right">
              <span className="text-xs font-semibold text-muted-foreground line-through block">
                {formatInr(selectedPlan.originalAmount!)}
              </span>
              <Badge className="bg-emerald-600 text-white font-bold text-[10px] mt-0.5">
                {selectedPlan.discountValue
                  ? selectedPlan.discountType === "percentage"
                    ? `${selectedPlan.discountValue}% OFF`
                    : `₹${selectedPlan.discountValue} OFF`
                  : "DISCOUNTED"}
              </Badge>
            </div>
          )}
        </div>

        {/* Installment / EMI Estimate */}
        {installmentAmount != null && (
          <div className="flex items-center gap-1.5 pt-1.5 border-t border-primary/15 text-xs text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>
              Pay in <strong className="text-foreground">{selectedPlan.installmentsCount} installments</strong> of{" "}
              <strong className="text-primary">{formatInr(installmentAmount)}</strong> / term
            </span>
          </div>
        )}

        {/* Plan Description / Batch Details */}
        {selectedPlan?.description && (
          <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
            {selectedPlan.description}
          </p>
        )}
      </div>
    </div>
  );
}
