"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Heart,
  IndianRupee,
  Layers,
  Loader2,
  Percent,
  Plus,
  Receipt,
  Sparkles,
  User,
  Users,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type InitialFeeCollectData = {
  studentUserId?: number;
  enrollmentId?: number;
  feeTitle?: string;
  amount?: number;
  dueDate?: string;
  status?: "paid" | "pending";
};

export type AddFeeRecordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institutionId?: number | null;
  academicYearId?: number | null;
  accessToken: string | null;
  onSuccess?: () => void;
  initialData?: InitialFeeCollectData | null;
};

type FormProgram = {
  id: number;
  title: string;
  institution_id: number;
  fee_amount?: string | number | null;
  fee_unit?: string | null;
  admission_fee?: string | number | null;
};

type FormSection = {
  id: number;
  name: string;
};

type FormProgramSection = {
  program_id: number;
  section_id: number;
  batch_name: string;
  section_name: string;
  original_section_name?: string;
};

type FormStudent = {
  enrollment_id: number;
  program_id: number | null;
  section_id: number | null;
  academic_year_id: number | null;
  roll_number: string | null;
  institution_id: number;
  student_profile_id: number;
  student_user_id: number;
  admission_number: string | null;
  awr_number: string | null;
  board_registration_number: string | null;
  sr_number: string | null;
  full_name: string;
  email: string | null;
  gender: string | null;
  program_title: string | null;
  section_name: string | null;
  batch_name?: string | null;
  academic_year_name: string | null;
};

export function AddFeeRecordDialog({
  open,
  onOpenChange,
  institutionId,
  academicYearId,
  accessToken,
  onSuccess,
  initialData,
}: AddFeeRecordDialogProps) {
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [programs, setPrograms] = useState<FormProgram[]>([]);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [programSections, setProgramSections] = useState<FormProgramSection[]>([]);
  const [students, setStudents] = useState<FormStudent[]>([]);

  // Selection
  const [selectedProgramId, setSelectedProgramId] = useState<string>("all");
  const [selectedBatchName, setSelectedBatchName] = useState<string>("all");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState<string>("");

  // Dynamic batches fetched for selected program
  const [dynamicBatches, setDynamicBatches] = useState<
    Array<{ name: string; enrolled_count?: number; section_ids?: number[] }>
  >([]);
  const [dynamicSections, setDynamicSections] = useState<
    Array<{ id: number; name: string; batch_name?: string }>
  >([]);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(false);

  // Fee Details
  const [feeTitle, setFeeTitle] = useState<string>("Course Tuition & Term Fee");
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [baseAmount, setBaseAmount] = useState<string>("12000");

  // Concession / Waiver
  const [enableConcession, setEnableConcession] = useState<boolean>(false);
  const [concessionType, setConcessionType] = useState<string>("girl_child");
  const [concessionMode, setConcessionMode] = useState<"percent" | "fixed">("percent");
  const [concessionValue, setConcessionValue] = useState<string>("25");
  const [concessionNotes, setConcessionNotes] = useState<string>("");

  // Late Fee Setup
  const [enableLateFee, setEnableLateFee] = useState<boolean>(false);
  const [lateFeeType, setLateFeeType] = useState<"fixed" | "per_day" | "percent">("fixed");
  const [graceDays, setGraceDays] = useState<string>("7");
  const [lateFeeValue, setLateFeeValue] = useState<string>("250");
  const [lateFeeMaxCap, setLateFeeMaxCap] = useState<string>("1000");

  // Payment Status
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("paid");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [transactionId, setTransactionId] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  // Tab State
  const [activeTab, setActiveTab] = useState<"student_fee" | "concession_late" | "payment_summary">("student_fee");

  // Apply initialData when provided
  useEffect(() => {
    if (!open || !initialData) return;
    if (initialData.feeTitle) setFeeTitle(initialData.feeTitle);
    if (initialData.amount) setBaseAmount(String(initialData.amount));
    if (initialData.dueDate) setDueDate(initialData.dueDate);
    if (initialData.status) setPaymentStatus(initialData.status);
  }, [open, initialData]);

  // Load programs, sections, and students
  useEffect(() => {
    if (!open || !accessToken) return;
    let isMounted = true;

    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const params = new URLSearchParams();
        if (institutionId) params.set("institutionId", String(institutionId));
        if (academicYearId) params.set("academicYearId", String(academicYearId));

        const res = await fetch(`/api/admin/students/fee-management?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load options");

        if (isMounted) {
          const loadedStudents: FormStudent[] = json.data?.students || [];
          setPrograms(json.data?.programs || []);
          setSections(json.data?.sections || []);
          setProgramSections(json.data?.program_sections || []);
          setStudents(loadedStudents);

          // Auto-select student from initialData
          if (initialData) {
            if (initialData.enrollmentId) {
              setSelectedStudentId(String(initialData.enrollmentId));
            } else if (initialData.studentUserId) {
              const matched = loadedStudents.find((s) => s.student_user_id === initialData.studentUserId);
              if (matched) setSelectedStudentId(String(matched.enrollment_id));
            }
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          toast.error(err instanceof Error ? err.message : "Failed to load form options");
        }
      } finally {
        if (isMounted) setLoadingOptions(false);
      }
    }

    void loadOptions();
    return () => {
      isMounted = false;
    };
  }, [open, accessToken, institutionId, academicYearId, initialData]);

  // Load Batches and Sections dynamically whenever a Course / Program is selected
  const loadProgramBatches = useCallback(
    async (progId: string) => {
      if (!progId || progId === "all" || !accessToken) {
        setDynamicBatches([]);
        setDynamicSections([]);
        return;
      }
      setLoadingBatches(true);
      try {
        const res = await fetch(`/api/admin/institutions/programs/${progId}/batches`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await res.json();
        if (res.ok && Array.isArray(json?.data)) {
          const bList: Array<{ name: string; enrolled_count?: number; section_ids?: number[] }> = [];
          const sList: Array<{ id: number; name: string; batch_name?: string }> = [];

          for (const item of json.data) {
            const bName = (item.batch_name || item.name || "Default Batch").trim();
            bList.push({
              name: bName,
              enrolled_count: item.enrolled_students_count || 0,
              section_ids: item.section_ids || (item.id ? [item.id] : []),
            });

            if (Array.isArray(item.section_ids) && item.section_ids.length > 0) {
              item.section_ids.forEach((secId: number, idx: number) => {
                const secName = item.sections?.[idx] || `Section ${secId}`;
                if (!sList.some((s) => s.id === secId && s.batch_name === bName)) {
                  sList.push({ id: secId, name: secName, batch_name: bName });
                }
              });
            } else if (item.id) {
              if (!sList.some((s) => s.id === item.id && s.batch_name === bName)) {
                sList.push({
                  id: item.id,
                  name: item.section_name || item.name || `Section ${item.id}`,
                  batch_name: bName,
                });
              }
            }
          }
          setDynamicBatches(bList);
          setDynamicSections(sList);
        }
      } catch (err) {
        console.error("Failed to load program batches:", err);
      } finally {
        setLoadingBatches(false);
      }
    },
    [accessToken]
  );

  // Available Batches list
  const availableBatches = useMemo(() => {
    if (selectedProgramId !== "all") {
      if (dynamicBatches.length > 0) return dynamicBatches;
      const progSecs = programSections.filter((ps) => String(ps.program_id) === selectedProgramId);
      const uniqueBatches = Array.from(new Set(progSecs.map((ps) => ps.batch_name).filter(Boolean)));
      return uniqueBatches.map((name) => {
        const count = students.filter(
          (stu) => String(stu.program_id) === selectedProgramId && stu.batch_name === name
        ).length;
        return { name, enrolled_count: count };
      });
    }

    const setNames = new Set<string>();
    programSections.forEach((ps) => ps.batch_name && setNames.add(ps.batch_name));
    students.forEach((s) => s.batch_name && setNames.add(s.batch_name));
    return Array.from(setNames).map((name) => ({
      name,
      enrolled_count: students.filter((s) => s.batch_name === name).length,
    }));
  }, [selectedProgramId, dynamicBatches, programSections, students]);

  // Available Sections list
  const availableSections = useMemo(() => {
    let list: Array<{ id: number; name: string; batch_name?: string }> = [];

    if (selectedProgramId !== "all") {
      if (dynamicSections.length > 0) {
        list = dynamicSections;
      } else {
        const progSecs = programSections.filter((ps) => String(ps.program_id) === selectedProgramId);
        list = progSecs.map((ps) => ({
          id: ps.section_id,
          name: ps.section_name,
          batch_name: ps.batch_name,
        }));
      }
    } else {
      if (programSections.length > 0) {
        list = programSections.map((ps) => ({
          id: ps.section_id,
          name: ps.section_name,
          batch_name: ps.batch_name,
        }));
      } else {
        list = sections.map((s) => ({ id: s.id, name: s.name }));
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    const unique = list.filter((item) => {
      const key = `${item.id}-${item.batch_name || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (selectedBatchName !== "all") {
      return unique.filter((s) => s.batch_name === selectedBatchName);
    }
    return unique;
  }, [selectedProgramId, dynamicSections, programSections, sections, selectedBatchName]);

  // Filtered students according to chosen Program, Batch, and Section
  const filteredStudents = useMemo(() => {
    return students.filter((stu) => {
      if (selectedProgramId !== "all" && String(stu.program_id) !== selectedProgramId) {
        return false;
      }
      if (selectedBatchName !== "all" && stu.batch_name !== selectedBatchName) {
        return false;
      }
      if (selectedSectionId !== "all" && String(stu.section_id) !== selectedSectionId) {
        return false;
      }
      if (studentSearch.trim()) {
        const query = studentSearch.toLowerCase().trim();
        const text = [
          stu.full_name,
          stu.admission_number,
          stu.roll_number,
          stu.email,
          stu.awr_number,
          stu.sr_number,
          stu.batch_name,
          stu.section_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [students, selectedProgramId, selectedBatchName, selectedSectionId, studentSearch]);

  const activeStudent = useMemo(() => {
    return students.find((s) => String(s.enrollment_id) === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const isFemaleStudent = useMemo(() => {
    return (
      activeStudent?.gender?.toLowerCase() === "female" ||
      activeStudent?.gender?.toLowerCase() === "f"
    );
  }, [activeStudent]);

  // If female student is selected, auto-suggest girl child concession
  useEffect(() => {
    if (isFemaleStudent && !enableConcession) {
      setEnableConcession(true);
      setConcessionType("girl_child");
      setConcessionMode("percent");
      setConcessionValue("25");
      setConcessionNotes("Girl Child Educational Fee Concession (Gender-wise waiver)");
    }
  }, [isFemaleStudent]);

  // Calculations
  const baseNum = Math.max(0, Number(baseAmount) || 0);

  let discountNum = 0;
  let discountPct = 0;
  if (enableConcession) {
    if (concessionMode === "percent") {
      discountPct = Math.min(100, Math.max(0, Number(concessionValue) || 0));
      discountNum = (baseNum * discountPct) / 100;
    } else {
      discountNum = Math.min(baseNum, Math.max(0, Number(concessionValue) || 0));
      discountPct = baseNum > 0 ? (discountNum / baseNum) * 100 : 0;
    }
  }

  let lateFeeNum = 0;
  if (enableLateFee) {
    lateFeeNum = Math.max(0, Number(lateFeeValue) || 0);
  }

  const netPayable = Math.max(0, baseNum - discountNum + lateFeeNum);

  const handleSubmit = async () => {
    if (!activeStudent) {
      toast.error("Please select a student record.");
      return;
    }
    if (!feeTitle.trim()) {
      toast.error("Please enter a fee title.");
      return;
    }
    if (baseNum <= 0) {
      toast.error("Please enter a valid base fee amount.");
      return;
    }
    if (!accessToken) {
      toast.error("Authentication expired. Please refresh.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        action: "add_fee_record",
        institution_id: activeStudent.institution_id || institutionId,
        student_user_id: activeStudent.student_user_id,
        student_profile_id: activeStudent.student_profile_id,
        enrollment_id: activeStudent.enrollment_id,
        academic_year_id: activeStudent.academic_year_id || academicYearId,
        fee_title: feeTitle.trim(),
        due_date: dueDate || null,
        subtotal_amount: baseNum,
        discount_percent: discountPct,
        discount_amount: discountNum,
        concession_type: enableConcession ? concessionType : null,
        concession_notes: enableConcession ? concessionNotes.trim() || null : null,
        late_fee_amount: lateFeeNum,
        late_fee_setup: enableLateFee
          ? {
              enabled: true,
              fee_type: lateFeeType,
              grace_days: Number(graceDays) || 0,
              value: Number(lateFeeValue) || 0,
              max_cap: Number(lateFeeMaxCap) || 0,
            }
          : { enabled: false },
        total_amount: netPayable,
        status: paymentStatus,
        payment_method: paymentStatus === "paid" ? paymentMethod : "pending",
        transaction_id: paymentStatus === "paid" ? transactionId.trim() || null : null,
        remarks: remarks.trim() || null,
      };

      const res = await fetch("/api/admin/students/fee-management", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create fee record");

      toast.success(
        paymentStatus === "paid"
          ? `Payment record of ₹${netPayable.toLocaleString("en-IN")} added successfully!`
          : `Fee invoice of ₹${netPayable.toLocaleString("en-IN")} generated successfully!`
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record fee");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-6 sm:max-w-4xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="size-4" />
            </span>
            <div>
              <DialogTitle className="text-lg font-bold">Add Student Fee Record</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Assign fee structures, late fee setups, and gender-wise concession waivers to students.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loadingOptions ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-xs">Loading course, section, and student options...</p>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Tabs Header */}
            <div className="grid grid-cols-3 gap-2 border-b pb-3">
              <button
                type="button"
                onClick={() => setActiveTab("student_fee")}
                className={cn(
                  "flex flex-col sm:flex-row items-start sm:items-center gap-2.5 p-3 rounded-xl border transition-all text-left cursor-pointer",
                  activeTab === "student_fee"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/20"
                    : "border-border/60 bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg shrink-0",
                    activeTab === "student_fee"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Users className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold leading-tight truncate">1. Student & Fee</span>
                    {activeStudent && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground hidden sm:block truncate mt-0.5">
                    Course, student & base
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("concession_late")}
                className={cn(
                  "flex flex-col sm:flex-row items-start sm:items-center gap-2.5 p-3 rounded-xl border transition-all text-left cursor-pointer",
                  activeTab === "concession_late"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/20"
                    : "border-border/60 bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg shrink-0",
                    activeTab === "concession_late"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Sparkles className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold leading-tight truncate">2. Waivers & Rules</span>
                    {(enableConcession || enableLateFee) && (
                      <span className="text-[10px] text-pink-600 dark:text-pink-400 font-bold shrink-0">●</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground hidden sm:block truncate mt-0.5">
                    Concessions & penalties
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("payment_summary")}
                className={cn(
                  "flex flex-col sm:flex-row items-start sm:items-center gap-2.5 p-3 rounded-xl border transition-all text-left cursor-pointer",
                  activeTab === "payment_summary"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/20"
                    : "border-border/60 bg-muted/20 hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg shrink-0",
                    activeTab === "payment_summary"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <CreditCard className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold leading-tight truncate">3. Payment & Summary</span>
                    <span className="text-[10px] font-bold text-primary shrink-0">
                      ₹{netPayable.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground hidden sm:block truncate mt-0.5">
                    Status & net breakdown
                  </p>
                </div>
              </button>
            </div>

            {/* TAB 1: Student & Fee Setup */}
            {activeTab === "student_fee" && (
              <div className="space-y-5">
                {/* Step 1: Course, Batch & Student Filter */}
                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Users className="size-3.5 text-primary" />
                    1. Select Course, Batch & Student
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    {/* Course / Program */}
                    <div className="sm:col-span-6 space-y-1.5">
                      <Label className="text-xs font-semibold">Course / Program</Label>
                      <Select
                        value={selectedProgramId}
                        onValueChange={(val) => {
                          setSelectedProgramId(val);
                          setSelectedBatchName("all");
                          setSelectedSectionId("all");
                          setSelectedStudentId("");
                          void loadProgramBatches(val);

                          if (val !== "all") {
                            const prog = programs.find((p) => String(p.id) === val);
                            if (prog?.fee_amount && Number(prog.fee_amount) > 0) {
                              setBaseAmount(String(Math.round(Number(prog.fee_amount))));
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="All Courses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Courses</SelectItem>
                          {programs.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Batch */}
                    <div className="sm:col-span-3 space-y-1.5">
                      <Label className="text-xs font-semibold">Batch</Label>
                      <Select
                        value={selectedBatchName}
                        onValueChange={(val) => {
                          setSelectedBatchName(val);
                          setSelectedSectionId("all");
                          setSelectedStudentId("");
                        }}
                        disabled={loadingBatches}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder={loadingBatches ? "Loading batches..." : "All Batches"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Batches ({availableBatches.length})</SelectItem>
                          {availableBatches.map((b) => (
                            <SelectItem key={b.name} value={b.name}>
                              {b.name} {b.enrolled_count ? `(${b.enrolled_count} std)` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Section */}
                    <div className="sm:col-span-3 space-y-1.5">
                      <Label className="text-xs font-semibold">Section</Label>
                      <Select
                        value={selectedSectionId}
                        onValueChange={(val) => {
                          setSelectedSectionId(val);
                          setSelectedStudentId("");
                        }}
                        disabled={loadingBatches}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder={loadingBatches ? "Loading sections..." : "All Sections"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sections ({availableSections.length})</SelectItem>
                          {availableSections.map((s) => (
                            <SelectItem key={`${s.id}-${s.batch_name || ""}`} value={String(s.id)}>
                              {s.name} {s.batch_name && selectedBatchName === "all" ? `(${s.batch_name})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Student Picker */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Student Name <span className="text-destructive">*</span></span>
                      <span className="text-[11px] text-muted-foreground font-normal">
                        {filteredStudents.length} students matched
                      </span>
                    </Label>
                    <Select
                      value={selectedStudentId}
                      onValueChange={setSelectedStudentId}
                    >
                      <SelectTrigger className="h-10 text-xs">
                        <SelectValue placeholder="Select student by name, admission no, or roll no..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {filteredStudents.length === 0 ? (
                          <div className="p-3 text-center text-xs text-muted-foreground">
                            No students found for this course/section.
                          </div>
                        ) : (
                          filteredStudents.map((stu) => (
                            <SelectItem key={stu.enrollment_id} value={String(stu.enrollment_id)}>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{stu.full_name}</span>
                                {stu.admission_number && (
                                  <span className="text-[11px] text-muted-foreground">
                                    ({stu.admission_number})
                                  </span>
                                )}
                                {stu.gender && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1 py-0 capitalize ${
                                      stu.gender.toLowerCase() === "female"
                                        ? "border-pink-500/30 text-pink-600 bg-pink-500/10"
                                        : "border-blue-500/30 text-blue-600 bg-blue-500/10"
                                    }`}
                                  >
                                    {stu.gender}
                                  </Badge>
                                )}
                                {stu.batch_name && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                                    {stu.batch_name}
                                  </Badge>
                                )}
                                {stu.section_name && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                                    {stu.section_name}
                                  </Badge>
                                )}
                                {stu.program_title && (
                                  <span className="text-[10px] text-muted-foreground/80 truncate max-w-[140px]">
                                    · {stu.program_title}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Active Student Detail Strip */}
                  {activeStudent && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-[11px]">
                          {activeStudent.full_name.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-bold text-foreground">{activeStudent.full_name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Admission: {activeStudent.admission_number || "N/A"} · Roll: {activeStudent.roll_number || "N/A"}
                            {activeStudent.batch_name ? ` · Batch: ${activeStudent.batch_name}` : ""}
                            {activeStudent.section_name ? ` · Section: ${activeStudent.section_name}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeStudent.gender && (
                          <Badge
                            className={`text-xs px-2 py-0.5 capitalize ${
                              isFemaleStudent
                                ? "bg-pink-600 text-white font-semibold"
                                : "bg-blue-600 text-white font-semibold"
                            }`}
                          >
                            {activeStudent.gender}
                          </Badge>
                        )}
                        {activeStudent.awr_number && (
                          <Badge variant="outline" className="text-[10px]">
                            AWR: {activeStudent.awr_number}
                          </Badge>
                        )}
                        {activeStudent.sr_number && (
                          <Badge variant="outline" className="text-[10px]">
                            SR: {activeStudent.sr_number}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 2: Fee Title, Base Amount & Due Date */}
                <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <CreditCard className="size-3.5 text-primary" />
                    2. Fee Title & Base Amount
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-semibold">Fee Title / Description</Label>
                      <Input
                        value={feeTitle}
                        onChange={(e) => setFeeTitle(e.target.value)}
                        placeholder="e.g. Term 1 Tuition Fee, Annual Registration Fee"
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Due Date</Label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Base Fee Amount (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-muted-foreground font-bold">₹</span>
                      <Input
                        type="number"
                        min="0"
                        value={baseAmount}
                        onChange={(e) => setBaseAmount(e.target.value)}
                        className="pl-7 h-9 text-sm font-semibold"
                        placeholder="e.g. 10000"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Concession & Late Fee Rules */}
            {activeTab === "concession_late" && (
              <div className="space-y-5">
                {/* Step 3: Concession / Fee Waiver (Gender-wise) */}
                <div className="rounded-xl border border-pink-500/30 bg-pink-500/5 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="size-4 text-pink-500" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-pink-700 dark:text-pink-300">
                          3. Concession & Fee Waiver (Gender-Wise / Merit)
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Special tuition waivers including Girl Child Scholarship, Merit, and Need-based concessions.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={enableConcession}
                      onCheckedChange={setEnableConcession}
                    />
                  </div>

                  {isFemaleStudent && (
                    <div className="rounded-lg border border-pink-500/40 bg-pink-500/10 p-3 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-pink-800 dark:text-pink-200">
                        <Sparkles className="size-4 shrink-0 text-pink-500" />
                        <span>
                          <strong>Female Student Detected:</strong> Girl Child Fee Waiver is highly recommended for {activeStudent?.full_name}.
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {["10", "25", "50", "100"].map((pct) => (
                          <Button
                            key={pct}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2 border-pink-500/40 text-pink-700 hover:bg-pink-500/20"
                            onClick={() => {
                              setEnableConcession(true);
                              setConcessionType("girl_child");
                              setConcessionMode("percent");
                              setConcessionValue(pct);
                              setConcessionNotes(`${pct}% Girl Child Educational Scholarship`);
                            }}
                          >
                            {pct}%
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {enableConcession && (
                    <div className="grid gap-3 sm:grid-cols-3 pt-1 border-t border-pink-500/20">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Concession Type</Label>
                        <Select
                          value={concessionType}
                          onValueChange={(val) => {
                            setConcessionType(val);
                            if (val === "girl_child") {
                              setConcessionNotes("Girl Child Educational Scholarship");
                            } else if (val === "merit") {
                              setConcessionNotes("Merit-based Academic Scholarship");
                            } else if (val === "sibling") {
                              setConcessionNotes("Real Sibling Enrollment Concession");
                            } else if (val === "ews") {
                              setConcessionNotes("EWS / Financial Aid Fee Waiver");
                            }
                          }}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="girl_child">👧 Girl Child Fee Waiver (Gender-wise)</SelectItem>
                            <SelectItem value="merit">🏆 Merit / Academic Scholarship</SelectItem>
                            <SelectItem value="sibling">👨‍👩‍👧‍👦 Sibling Concession</SelectItem>
                            <SelectItem value="ews">🤝 EWS / Need-based Aid</SelectItem>
                            <SelectItem value="staff_ward">🏫 Staff Ward Concession</SelectItem>
                            <SelectItem value="special">✨ Special Discretionary Waiver</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Calculation Mode</Label>
                        <Select
                          value={concessionMode}
                          onValueChange={(v) => setConcessionMode(v as "percent" | "fixed")}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">
                          {concessionMode === "percent" ? "Concession %" : "Waiver Amount (₹)"}
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            value={concessionValue}
                            onChange={(e) => setConcessionValue(e.target.value)}
                            className="h-9 text-xs font-semibold pr-8"
                            placeholder={concessionMode === "percent" ? "e.g. 25" : "e.g. 2000"}
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">
                            {concessionMode === "percent" ? "%" : "₹"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 sm:col-span-3">
                        <Label className="text-xs font-semibold">Concession Notes / Justification</Label>
                        <Input
                          value={concessionNotes}
                          onChange={(e) => setConcessionNotes(e.target.value)}
                          placeholder="e.g. Approved under Beti Bachao / Girl Child Education Incentive"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 4: Late Fee Setup */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-amber-500" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                          4. Late Fee Setup & Rules
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Define grace periods, daily penalties or one-time late fees applicable after due date.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={enableLateFee}
                      onCheckedChange={setEnableLateFee}
                    />
                  </div>

                  {enableLateFee && (
                    <div className="grid gap-3 sm:grid-cols-4 pt-1 border-t border-amber-500/20">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Grace Period (Days)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={graceDays}
                          onChange={(e) => setGraceDays(e.target.value)}
                          className="h-9 text-xs"
                          placeholder="e.g. 7"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Penalty Mode</Label>
                        <Select
                          value={lateFeeType}
                          onValueChange={(v) => setLateFeeType(v as "fixed" | "per_day" | "percent")}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed Flat Penalty (₹)</SelectItem>
                            <SelectItem value="per_day">Daily Rate (₹ / Day)</SelectItem>
                            <SelectItem value="percent">Percentage (% of Fee)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Late Fee Amount (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={lateFeeValue}
                          onChange={(e) => setLateFeeValue(e.target.value)}
                          className="h-9 text-xs font-semibold"
                          placeholder="e.g. 250"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Maximum Cap (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={lateFeeMaxCap}
                          onChange={(e) => setLateFeeMaxCap(e.target.value)}
                          className="h-9 text-xs"
                          placeholder="e.g. 1000"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Payment & Summary */}
            {activeTab === "payment_summary" && (
              <div className="space-y-5">
                {/* Step 5: Payment Status & Record Options */}
                <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Receipt className="size-3.5 text-primary" />
                    5. Payment Status & Record Method
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Record Type</Label>
                      <Select
                        value={paymentStatus}
                        onValueChange={(v) => setPaymentStatus(v as "paid" | "pending")}
                      >
                        <SelectTrigger className="h-9 text-xs font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">✅ Collect Payment Now (Paid)</SelectItem>
                          <SelectItem value="pending">📄 Generate Due Invoice (Pending)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {paymentStatus === "paid" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Payment Mode</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger className="h-9 text-xs font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Counter Cash</SelectItem>
                            <SelectItem value="upi">UPI / QR Code</SelectItem>
                            <SelectItem value="net_banking">Net Banking / IMPS</SelectItem>
                            <SelectItem value="cheque">Bank Cheque</SelectItem>
                            <SelectItem value="bank_transfer">Direct Bank Transfer</SelectItem>
                            <SelectItem value="other">Other / Card POS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {paymentStatus === "paid" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Transaction ID / Cheque / Ref No.</Label>
                        <Input
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          placeholder="e.g. UPI/2026/893710 or CHQ-00129"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Remarks / Receipt Note</Label>
                        <Input
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="Optional remarks"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 6: Live Summary Breakdown */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Fee Calculation Summary
                    </span>
                    <Badge variant="outline" className="text-xs font-bold">
                      {paymentStatus === "paid" ? "Status: PAID NOW" : "Status: DUE INVOICE"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg border bg-background/80 p-2.5">
                      <span className="text-muted-foreground text-[11px]">Base Fee</span>
                      <p className="text-sm font-bold mt-0.5">₹{baseNum.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="rounded-lg border bg-background/80 p-2.5">
                      <span className="text-muted-foreground text-[11px]">Concession</span>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        -₹{discountNum.toLocaleString("en-IN")}
                        {discountPct > 0 && ` (${discountPct.toFixed(1)}%)`}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-background/80 p-2.5">
                      <span className="text-muted-foreground text-[11px]">Late Fee</span>
                      <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        +₹{lateFeeNum.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-primary/40 bg-primary/10 p-2.5">
                      <span className="text-primary font-semibold text-[11px]">Total Net Amount</span>
                      <p className="text-base font-black text-primary mt-0.5">
                        ₹{netPayable.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span>Net Payable:</span>
            <span className="text-sm font-bold text-primary">₹{netPayable.toLocaleString("en-IN")}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>

            {activeTab === "student_fee" && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setActiveTab("concession_late")}
              >
                Next: Concessions →
              </Button>
            )}

            {activeTab === "concession_late" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("student_fee")}
                >
                  ← Back
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setActiveTab("payment_summary")}
                >
                  Next: Payment →
                </Button>
              </>
            )}

            {activeTab === "payment_summary" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab("concession_late")}
              >
                ← Back
              </Button>
            )}

            <Button
              type="button"
              className="gap-2 bg-[#D91B1B] hover:bg-[#b91515] text-white font-semibold"
              onClick={handleSubmit}
              disabled={submitting || loadingOptions || !activeStudent}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving Fee Record...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  {paymentStatus === "paid" ? "Record Paid Fee" : "Create Due Invoice"}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
