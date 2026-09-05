"use client";

import { useState } from "react";
import {
  Layers,
  Clock,
  CalendarDays,
  Languages,
  Building2,
  Users,
  PhoneCall,
  Send,
  CreditCard,
  ChevronDown,
  Tag,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseEnquiryDialog } from "@/components/public/course-enquiry-dialog";

export interface ProgramBatch {
  id: number;
  program_id: number;
  section_id: number;
  batch_name?: string | null;
  name?: string | null;
  section_name?: string | null;
  original_section_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  class_frequency?: string | null;
  language_title?: string | null;
  language_name?: string | null;
  teaching_method?: string | null;
  seats_available?: number | null;
  enrolled_students_count?: number | null;
  price?: number | string | null;
  fee_amount?: number | string | null;
  discount_percent?: number | string | null;
  academic_term?: string | null;
  semester_number?: number | null;
  academic_year_number?: number | null;
  attendance_setup_title?: string | null;
  installments_count?: number | null;
  duration?: string | null;
}

export interface FeeModeOption {
  id: string;
  label: string;
  amount: number;
  originalAmount?: number;
  unitText?: string;
  installmentsCount?: number;
  installmentAmount?: number;
  mode: "one_time" | "installment" | "semester" | "monthly" | "annual";
  description?: string;
}

function formatBatchTime(timeStr?: string | null) {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }
  return trimmed;
}

function formatInr(val: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

function buildBatchFeeModes(
  batch: ProgramBatch,
  courseBasePrice: number,
  feeComponents: any[] = []
): FeeModeOption[] {
  const options: FeeModeOption[] = [];

  const rawBatchPrice =
    batch.price != null
      ? Number(batch.price)
      : batch.fee_amount != null
      ? Number(batch.fee_amount)
      : courseBasePrice || 25000;

  const baseAmount = rawBatchPrice > 0 ? rawBatchPrice : courseBasePrice || 25000;
  const discountPct = Number(batch.discount_percent) || 0;
  const finalFullAmount =
    discountPct > 0 ? Math.round(baseAmount * (1 - discountPct / 100)) : baseAmount;

  // 1. One-Time Full Payment Mode
  options.push({
    id: "mode-one-time",
    label: "One-Time Payment (Full Course)",
    amount: finalFullAmount,
    originalAmount: discountPct > 0 ? baseAmount : undefined,
    unitText: "full course",
    mode: "one_time",
    installmentsCount: 1,
    description: "Complete tuition with immediate full access to all lectures & study materials.",
  });

  // 2. Custom Batch Installment Mode if configured
  const batchInstallments = batch.installments_count ? Number(batch.installments_count) : 0;
  if (batchInstallments > 1) {
    const instAmt = Math.round(finalFullAmount / batchInstallments);
    options.push({
      id: `mode-batch-inst-${batchInstallments}`,
      label: `Installment Plan (${batchInstallments} Equal Terms)`,
      amount: finalFullAmount,
      originalAmount: discountPct > 0 ? baseAmount : undefined,
      unitText: `${instAmt}/term`,
      mode: "installment",
      installmentsCount: batchInstallments,
      installmentAmount: instAmt,
      description: `Pay in ${batchInstallments} easy term installments of ${formatInr(instAmt)}.`,
    });
  } else {
    // Standard 2-term installment option
    const term2Amt = Math.round(finalFullAmount / 2);
    options.push({
      id: "mode-2-installments",
      label: "2-Term Installment Plan",
      amount: finalFullAmount,
      unitText: `${term2Amt}/term`,
      mode: "installment",
      installmentsCount: 2,
      installmentAmount: term2Amt,
      description: `Pay 50% at admission (${formatInr(term2Amt)}) and remainder in next term.`,
    });

    // Standard 4-term quarterly installment option
    const term4Amt = Math.round(finalFullAmount / 4);
    options.push({
      id: "mode-4-installments",
      label: "4-Quarterly Installment Plan",
      amount: finalFullAmount,
      unitText: `${term4Amt}/quarter`,
      mode: "installment",
      installmentsCount: 4,
      installmentAmount: term4Amt,
      description: `Flexible quarterly fee schedule (${formatInr(term4Amt)} per quarter).`,
    });
  }

  // 3. Monthly / Subscription Mode
  const monthlyAmt = Math.round(finalFullAmount / 10);
  options.push({
    id: "mode-monthly",
    label: "Monthly Subscription Plan",
    amount: monthlyAmt,
    unitText: "month",
    mode: "monthly",
    installmentsCount: 10,
    installmentAmount: monthlyAmt,
    description: `Convenient monthly fee billing of ${formatInr(monthlyAmt)} per month.`,
  });

  // 4. Batch module_details configured fee structures (if present)
  if ((batch as any).module_details) {
    try {
      const details = (batch as any).module_details;
      const parsed = typeof details === "string" ? JSON.parse(details) : details;
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any, i: number) => {
          const itemAmt = Number(item.amount || item.price || item.fee);
          if (!isNaN(itemAmt) && itemAmt > 0) {
            options.push({
              id: `module-mode-${i}`,
              label: item.title || item.name || item.plan_name || item.fee_type || `Plan ${i + 1}`,
              amount: itemAmt,
              unitText: item.unit || item.frequency || "plan",
              mode: item.mode || "installment",
              installmentsCount: item.installments_count || item.installments || 1,
              installmentAmount: item.installment_amount || (item.installments_count ? Math.round(itemAmt / item.installments_count) : itemAmt),
              description: item.description || "Custom fee structure for this batch.",
            });
          }
        });
      } else if (typeof parsed === "object" && parsed !== null) {
        if (Array.isArray(parsed.fee_plans)) {
          parsed.fee_plans.forEach((item: any, i: number) => {
            const itemAmt = Number(item.amount || item.price || item.fee);
            if (!isNaN(itemAmt) && itemAmt > 0) {
              options.push({
                id: `batch-plan-${i}`,
                label: item.title || item.name || item.plan_name || `Plan ${i + 1}`,
                amount: itemAmt,
                unitText: item.unit || "term",
                mode: item.mode || "installment",
                installmentsCount: item.installments_count || 1,
                installmentAmount: item.installment_amount,
                description: item.description || "Custom fee plan.",
              });
            }
          });
        }
      }
    } catch {
      // ignore invalid json
    }
  }

  // 5. Append fee components if any
  if (Array.isArray(feeComponents)) {
    feeComponents.forEach((fc, idx) => {
      const orig = Number(fc.amount);
      if (!isNaN(orig) && orig > 0) {
        const disc = Number(fc.discount_value) || 0;
        const final =
          fc.final_amount != null
            ? Number(fc.final_amount)
            : disc > 0 && fc.discount_type === "percentage"
            ? orig * (1 - disc / 100)
            : orig - disc;

        options.push({
          id: `fc-mode-${fc.id || idx}`,
          label: fc.title || `Special Fee Component ${idx + 1}`,
          amount: Math.round(final),
          originalAmount: disc > 0 ? orig : undefined,
          unitText: fc.unit || "fee component",
          mode: fc.payment_mode || "one_time",
          installmentsCount: fc.installments_count || 1,
          description: fc.description || `Special institutional fee plan.`,
        });
      }
    });
  }

  return options;
}

// Single Batch Row Card Component
function BatchRowItem({
  batch,
  idx,
  defaultMedium,
  courseDuration,
  courseBasePrice,
  feeComponents,
  rawPhone,
  programName,
  instituteName,
  onOpenEnquiry,
}: {
  batch: ProgramBatch;
  idx: number;
  defaultMedium?: string | null;
  courseDuration?: string | null;
  courseBasePrice: number;
  feeComponents: any[];
  rawPhone: string;
  programName: string;
  instituteName: string;
  onOpenEnquiry: (batch: ProgramBatch, selectedFee: FeeModeOption) => void;
}) {
  const feeModes = buildBatchFeeModes(batch, courseBasePrice, feeComponents);
  const [selectedModeId, setSelectedModeId] = useState<string>(feeModes[0]?.id || "mode-one-time");

  const selectedFeeMode = feeModes.find((m) => m.id === selectedModeId) || feeModes[0];

  const batchTitle = batch.batch_name || batch.name || `Batch ${idx + 1}`;
  const sectionName = batch.section_name || batch.original_section_name || "Section A";
  const startTimeFormatted = formatBatchTime(batch.start_time);
  const endTimeFormatted = formatBatchTime(batch.end_time);
  const timingText =
    startTimeFormatted && endTimeFormatted
      ? `${startTimeFormatted} - ${endTimeFormatted}`
      : startTimeFormatted || endTimeFormatted || "Flexible Daily Shift";

  const frequencyText = batch.class_frequency || "Regular Classes (Mon - Sat)";
  const languageText =
    batch.language_title || batch.language_name || defaultMedium || "English Medium";
  const teachingMethod = batch.teaching_method || "Classroom / Offline";
  const seatsAvailable = batch.seats_available;
  const enrolledCount = batch.enrolled_students_count || 0;

  // Duration resolution: Batch-specific duration -> Course duration -> Fallback
  const durationText =
    batch.duration ||
    courseDuration ||
    batch.academic_term ||
    "1 Year / Full Academic Session";

  // WhatsApp link
  const phoneForWhatsApp = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone || "919999999999";
  const whatsappMessage = `Hello, I want to inquire about batch "${batchTitle}" (${sectionName}) with plan "${selectedFeeMode?.label}" for course "${programName}" at ${instituteName}.`;
  const whatsappUrl = `https://wa.me/${phoneForWhatsApp}?text=${encodeURIComponent(whatsappMessage)}`;

  // Call URL
  const callUrl = `tel:${rawPhone.length === 10 ? `+91${rawPhone}` : `+${rawPhone}`}`;

  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-border bg-card/95 shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-md">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />

      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Top Header Row: Batch Name, Section, Badges & Seats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="text-xs font-bold bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5"
            >
              {sectionName}
            </Badge>

            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
              {batchTitle}
            </h3>

            {batch.academic_term && (
              <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
                {batch.academic_term}
              </Badge>
            )}
            {batch.semester_number && (
              <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
                Semester {batch.semester_number}
              </Badge>
            )}
            {batch.academic_year_number && (
              <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
                Year {batch.academic_year_number}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1.5 py-1 px-2.5"
            >
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Admissions Open
            </Badge>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold rounded-lg bg-muted/40 px-2.5 py-1">
              <Users className="size-3.5 text-primary shrink-0" />
              <span>
                {seatsAvailable != null ? `${seatsAvailable} Seats Available` : "Open Seats"}
              </span>
              {enrolledCount > 0 && (
                <span className="text-muted-foreground font-normal">({enrolledCount} enrolled)</span>
              )}
            </div>
          </div>
        </div>

        {/* Schedule & Batch Specs Grid in 1 Row (Responsive 2x2 or 4 Columns) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 rounded-xl border border-border/70 bg-muted/20 p-3.5 text-xs">
          {/* 1. Duration */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
              <Clock className="size-3.5 text-primary shrink-0" />
              <span>Duration</span>
            </div>
            <p className="font-bold text-foreground pl-5">{durationText}</p>
          </div>

          {/* 2. Class Timing */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
              <Clock className="size-3.5 text-emerald-600 shrink-0" />
              <span>Class Timing</span>
            </div>
            <p className="font-bold text-foreground pl-5">{timingText}</p>
          </div>

          {/* 3. Days / Frequency */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
              <CalendarDays className="size-3.5 text-primary shrink-0" />
              <span>Days / Frequency</span>
            </div>
            <p className="font-bold text-foreground pl-5">{frequencyText}</p>
          </div>

          {/* 4. Medium */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
              <Languages className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Medium</span>
            </div>
            <p className="font-bold text-foreground pl-5">{languageText}</p>
          </div>

          {/* 5. Learning Mode */}
          <div className="space-y-1 col-span-2 md:col-span-1">
            <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
              <Building2 className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Learning Mode</span>
            </div>
            <p className="font-bold text-foreground pl-5">{teachingMethod}</p>
          </div>
        </div>

        {batch.attendance_setup_title && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Attendance Shift:</span>
            <span className="truncate">{batch.attendance_setup_title}</span>
          </div>
        )}

        {/* Fee Mode Dropdown & Price Calculation + Action CTAs Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3 border-t border-border/70">
          {/* Left: Fee Mode Dropdown */}
          <div className="flex-1 max-w-xl space-y-1.5">
            <label className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-foreground">
                <Wallet className="size-3.5 text-primary" />
                Select Fee Mode / Payment Plan:
              </span>
              <span className="text-[11px] font-semibold text-primary">
                {feeModes.length} Modes Available
              </span>
            </label>

            <div className="relative">
              <select
                value={selectedModeId}
                onChange={(e) => setSelectedModeId(e.target.value)}
                aria-label="Select Fee Mode"
                className="w-full appearance-none rounded-xl border border-primary/30 bg-background px-3.5 py-2 pr-9 text-xs font-semibold text-foreground shadow-2xs transition-all hover:border-primary focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                {feeModes.map((fm) => (
                  <option key={fm.id} value={fm.id}>
                    {fm.label} — {formatInr(fm.amount)}
                    {fm.unitText && !fm.label.includes(fm.unitText) ? ` (${fm.unitText})` : ""}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <ChevronDown className="size-4" />
              </div>
            </div>

            {selectedFeeMode?.description && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                <span>{selectedFeeMode.description}</span>
              </p>
            )}
          </div>

          {/* Middle: Prominent Dynamic Price Display */}
          <div className="flex items-center gap-3 lg:border-l lg:border-border/70 lg:pl-4">
            <div className="text-left lg:text-right">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                {selectedFeeMode?.unitText ? `Fee (${selectedFeeMode.unitText})` : "Total Batch Fee"}
              </span>
              <div className="flex items-baseline gap-1.5 justify-start lg:justify-end">
                {selectedFeeMode?.originalAmount && (
                  <span className="text-xs line-through text-muted-foreground">
                    {formatInr(selectedFeeMode.originalAmount)}
                  </span>
                )}
                <span className="text-2xl font-black text-primary">
                  {formatInr(selectedFeeMode?.amount || courseBasePrice)}
                </span>
              </div>
              {selectedFeeMode?.installmentAmount && (
                <span className="text-[10px] font-semibold text-muted-foreground block">
                  {formatInr(selectedFeeMode.installmentAmount)} × {selectedFeeMode.installmentsCount} terms
                </span>
              )}
            </div>
          </div>

          {/* Right: WhatsApp, Call, and Enquiry CTA Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs font-bold border-emerald-500/40 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/50 rounded-xl h-10 px-3.5 gap-1.5 cursor-pointer shadow-2xs"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>WhatsApp</span>
              </a>
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs font-bold border-sky-500/40 bg-sky-50/80 hover:bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-700/50 rounded-xl h-10 px-3.5 gap-1.5 cursor-pointer shadow-2xs"
            >
              <a href={callUrl}>
                <PhoneCall className="size-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>Call</span>
              </a>
            </Button>

            <Button
              size="sm"
              onClick={() => onOpenEnquiry(batch, selectedFeeMode)}
              className="text-xs font-bold bg-[#800000] hover:bg-[#600000] text-white rounded-xl h-10 px-4 gap-1.5 cursor-pointer shadow-2xs"
            >
              <Send className="size-3.5 shrink-0" />
              <span>Enquiry</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CourseBatchesSection({
  batches,
  defaultMedium,
  course,
  programName,
  feeComponents = [],
}: {
  batches: ProgramBatch[];
  defaultMedium?: string | null;
  course: any;
  programName: string;
  feeComponents?: any[];
}) {
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProgramBatch | null>(null);
  const [selectedFee, setSelectedFee] = useState<FeeModeOption | null>(null);

  const instituteName = course?.institute || "Institution";
  const rawPhone = (
    course?.phone ||
    course?.institution_phone ||
    course?.contact_phone ||
    course?.institute_phone ||
    "919999999999"
  ).replace(/[^0-9]/g, "");

  const parsedBasePrice =
    typeof course?.price === "number"
      ? course.price
      : typeof course?.price === "string"
      ? parseFloat(course.price.replace(/[^0-9.]/g, "")) || 25000
      : 25000;

  const handleOpenEnquiry = (batch: ProgramBatch, feeMode: FeeModeOption) => {
    setSelectedBatch(batch);
    setSelectedFee(feeMode);
    setEnquiryOpen(true);
  };

  return (
    <section id="batches" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Layers className="size-4" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Batches & Class Schedules</h2>
            <Badge className="bg-emerald-600 text-white font-bold text-[11px]">
              {batches.length > 0
                ? `${batches.length} ${batches.length === 1 ? "Batch" : "Batches"} Available`
                : "Flexible Batches"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {batches.length > 0
              ? `Choose your preferred batch shift, class timing, section, and fee payment mode offered by ${instituteName}.`
              : `Explore flexible class timings and batch options tailored for ${programName}.`}
          </p>
        </div>
      </div>

      {/* 1 Batch In 1 Row List Layout (grid-cols-1) */}
      {batches.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {batches.map((batch, idx) => (
            <BatchRowItem
              key={`batch-row-${batch.id || idx}-${batch.program_id}-${batch.section_id}-${idx}`}
              batch={batch}
              idx={idx}
              defaultMedium={defaultMedium}
              courseDuration={course?.duration}
              courseBasePrice={parsedBasePrice}
              feeComponents={feeComponents}
              rawPhone={rawPhone}
              programName={programName}
              instituteName={instituteName}
              onOpenEnquiry={handleOpenEnquiry}
            />
          ))}
        </div>
      ) : (
        <Card className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 sm:p-8">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
              <Layers className="size-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Flexible Batch Timings Available</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Batch schedules (Morning, Afternoon, and Evening sessions) and section allocations are
              customized during admission counselling based on student convenience.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <Badge
                variant="secondary"
                className="text-xs font-semibold bg-background border border-border"
              >
                ✓ Morning & Evening Shifts
              </Badge>
              <Badge
                variant="secondary"
                className="text-xs font-semibold bg-background border border-border"
              >
                ✓ Small Interactive Batches
              </Badge>
              <Badge
                variant="secondary"
                className="text-xs font-semibold bg-background border border-border"
              >
                ✓ 1-on-1 Doubt Clearing
              </Badge>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs font-bold border-emerald-500/40 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl h-9 gap-1.5 cursor-pointer"
              >
                <a
                  href={`https://wa.me/${
                    rawPhone.length === 10 ? `91${rawPhone}` : rawPhone || "919999999999"
                  }?text=${encodeURIComponent(
                    `Hello, I want to inquire about batches and timings for "${programName}" at ${instituteName}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppIcon className="size-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </a>
              </Button>

              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs font-bold border-sky-500/40 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl h-9 gap-1.5 cursor-pointer"
              >
                <a href={`tel:${rawPhone.length === 10 ? `+91${rawPhone}` : `+${rawPhone}`}`}>
                  <PhoneCall className="size-3.5 text-sky-600" />
                  <span>Call</span>
                </a>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setSelectedBatch(null);
                  setSelectedFee(null);
                  setEnquiryOpen(true);
                }}
                className="text-xs font-bold bg-[#800000] hover:bg-[#600000] text-white rounded-xl h-9 gap-1.5 cursor-pointer"
              >
                <Send className="size-3.5" />
                <span>Enquire Now</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Course & Batch Enquiry Dialog */}
      <CourseEnquiryDialog
        open={enquiryOpen}
        onOpenChange={setEnquiryOpen}
        course={{
          id: course?.id || 1,
          title: selectedBatch
            ? `${programName} - ${selectedBatch.batch_name || selectedBatch.name || "Batch"} (${
                selectedBatch.section_name || selectedBatch.original_section_name || "Section A"
              }) [${selectedFee?.label || "Standard Fee"}]`
            : programName,
          institute: instituteName,
          institution_id: course?.institutionId || course?.institution_id,
          price: selectedFee ? formatInr(selectedFee.amount) : course?.price,
        }}
      />
    </section>
  );
}
