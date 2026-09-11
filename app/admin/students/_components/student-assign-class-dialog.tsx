"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GraduationCap, Loader2, Plus, X } from "lucide-react";
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
import { readJsonResponse } from "@/lib/api/read-json-response";
import { useProgressiveSave } from "@/hooks/use-progressive-save";
import { ProgressiveSaveIndicator } from "@/components/shared/progressive-save-indicator";
import type { Student } from "../columns";

type AcademicYearOption = {
  id: number;
  name: string;
};

type ProgramOption = {
  id: number;
  title: string;
};

type BatchOption = {
  id?: number;
  batch_name: string;
  name: string;
  section_ids?: number[];
  sections?: string[];
  section_name?: string;
  enrolled_students_count?: number;
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
    const targetInstId = instId || selectedInstitutionId || (institutionId ? String(institutionId) : "");
    if (!accessToken || !targetInstId || loadingAcademicYears) return;
    setLoadingAcademicYears(true);
    try {
      const res = await fetch(`/api/admin/institutions/academic-years?institutionId=${targetInstId}&limit=100`, {
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
  }, [accessToken, selectedInstitutionId, institutionId, loadingAcademicYears]);

  // Load Programs on demand
  const loadPrograms = useCallback(async (instId?: string) => {
    const targetInstId = instId || selectedInstitutionId || (institutionId ? String(institutionId) : "");
    if (!accessToken || !targetInstId || loadingPrograms) return;
    setLoadingPrograms(true);
    try {
      const res = await fetch(`/api/admin/institutions/programs?institutionId=${targetInstId}&limit=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJsonResponse<{ data?: any[] }>(res);
      if (Array.isArray(json.data)) {
        const list = json.data.map((p: any) => ({ id: p.id, title: p.title || p.name }));
        setPrograms(list);
      }
    } catch (err) {
      console.error("Failed to load programs:", err);
    } finally {
      setLoadingPrograms(false);
    }
  }, [accessToken, selectedInstitutionId, institutionId, loadingPrograms]);

  // Load Batches & Sections on demand
  const loadBatchesAndSections = useCallback(async (progId?: string) => {
    const targetProgId = progId || selectedProgramId;
    if (!accessToken || !targetProgId || loadingSections) return;
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
          const bName = b.batch_name || b.name || "Default Batch";
          if (b.section_ids && b.section_ids.length > 0) {
            b.section_ids.forEach((sId: number, idx: number) => {
              const sName = b.sections?.[idx] || `Section ${sId}`;
              if (!secList.some((existing) => existing.id === sId)) {
                secList.push({
                  id: sId,
                  name: sName,
                  batch_name: bName,
                });
              }
            });
          } else if (b.id) {
            if (!secList.some((existing) => existing.id === b.id)) {
              secList.push({
                id: b.id,
                name: b.section_name || b.name || `Section ${b.id}`,
                batch_name: bName,
              });
            }
          }
        }
      }

      setAllSections(secList);
      setSections(secList);
    } catch (err) {
      console.error("Error loading batches & sections:", err);
    } finally {
      setLoadingSections(false);
    }
  }, [accessToken, selectedProgramId, loadingSections]);

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
            if (activeEnr.program_name) {
              setPrograms([{ id: activeEnr.program_id, title: activeEnr.program_name }]);
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

  // Sync when dialog opens
  useEffect(() => {
    if (!open) {
      activeEnrollmentRef.current = null;
      return;
    }

    if (institutionId) {
      setSelectedInstitutionId(String(institutionId));
    }

    void fetchStudentEnrollments();
  }, [open, institutionId, fetchStudentEnrollments]);

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
    const targetInstId = selectedInstitutionId || (institutionId ? String(institutionId) : "");
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

        <div className="p-6 space-y-6">
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
              {/* Institution / School */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="assign-institution" className="text-xs font-semibold">Institution / School *</Label>
                <Select
                  value={selectedInstitutionId}
                  onValueChange={(val) => {
                    setSelectedInstitutionId(val);
                    setSelectedProgramId("");
                    setSelectedBatchName("ALL");
                    setSelectedSectionId("");
                    setSelectedAcademicYearId("");
                    setPrograms([]);
                    setBatches([]);
                    setAllSections([]);
                    setSections([]);
                    setAcademicYears([]);
                  }}
                  onOpenChange={(isOpen) => {
                    if (isOpen && institutions.length === 0) {
                      void loadInstitutions();
                    }
                  }}
                >
                  <SelectTrigger id="assign-institution" className="w-full h-10 text-sm">
                    <SelectValue placeholder={loadingInstitutions ? "Loading institutions..." : "Select institution / school..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingInstitutions ? (
                      <div className="flex items-center justify-center p-3 text-xs text-muted-foreground">
                        <Loader2 className="size-4 animate-spin mr-2" /> Loading institutions...
                      </div>
                    ) : (
                      institutions.map((inst) => (
                        <SelectItem key={inst.id} value={String(inst.id)}>
                          {inst.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

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
                  }}
                  onOpenChange={(isOpen) => {
                    if (isOpen && programs.length <= 1) {
                      void loadPrograms(selectedInstitutionId);
                    }
                  }}
                  disabled={!selectedInstitutionId}
                >
                  <SelectTrigger id="assign-program" className="w-full h-10 text-sm">
                    <SelectValue
                      placeholder={
                        loadingPrograms
                          ? "Loading classes..."
                          : selectedInstitutionId
                          ? "Select program / class..."
                          : "Select institution first"
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
                          {p.title}
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
                          ? "Select batch..."
                          : "Select program first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Batches ({batches.length || allSections.length})</SelectItem>
                    {batches.map((batch, idx) => {
                      const bName = batch.batch_name || batch.name || `Batch ${idx + 1}`;
                      return (
                        <SelectItem key={`${bName}-${idx}`} value={bName}>
                          {bName} {batch.enrolled_students_count ? `(${batch.enrolled_students_count} std)` : ""}
                        </SelectItem>
                      );
                    })}
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
                          ? "Select section..."
                          : "Select program first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
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
                  disabled={!selectedInstitutionId}
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

              {/* Enrollment Remarks */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="assign-remarks" className="text-xs font-semibold">Enrollment Remarks</Label>
                <Textarea
                  id="assign-remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional enrollment notes or remarks..."
                  className="min-h-20 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Footer */}
        <div className="p-6 pt-4 border-t bg-muted/20 flex items-center justify-between">
          <ProgressiveSaveIndicator status={saveStatus} />
          <div className="flex gap-2.5">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
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
