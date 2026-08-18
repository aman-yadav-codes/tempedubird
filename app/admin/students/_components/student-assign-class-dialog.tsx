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

type SectionOption = {
  id: number;
  name: string;
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
    selectedSectionId,
    rollNumber,
    status,
    admissionDate,
    remarks,
  };
  const enrollmentFormKey = `enrollment:${student?.id ?? "new"}`;
  const { saveStatus, handleBlur } = useProgressiveSave({
    formKey: enrollmentFormKey,
    formState: enrollmentFormState,
    enabled: open,
  });

  const activeEnrollmentRef = useRef<EnrollmentRecord | null>(null);

  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset & Sync when dialog opens or student changes
  useEffect(() => {
    if (!open) {
      activeEnrollmentRef.current = null;
      return;
    }

    if (institutionId) {
      setSelectedInstitutionId(String(institutionId));
    }
  }, [open, institutionId]);

  // Fetch student's existing enrollments and pre-fill form fields
  const fetchStudentEnrollments = useCallback(async () => {
    if (!student?.id || !accessToken) return;

    // Clear stale session draft so DB data takes precedence
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
          }
          if (activeEnr.section_id) {
            setSelectedSectionId(String(activeEnr.section_id));
          }
          if (activeEnr.academic_year_id) {
            setSelectedAcademicYearId(String(activeEnr.academic_year_id));
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

  // Load Institutions list added by/available to admin
  useEffect(() => {
    if (!open || !accessToken) return;

    async function loadInstitutions() {
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
          setSelectedInstitutionId((current) => {
            const targetInstId = activeEnrollmentRef.current?.institution_id
              ? String(activeEnrollmentRef.current.institution_id)
              : "";
            if (targetInstId && list.some((inst: any) => String(inst.id) === targetInstId)) {
              return targetInstId;
            }
            if (current && list.some((inst: any) => String(inst.id) === current)) return current;
            if (institutionId) return String(institutionId);
            return String(list[0].id);
          });
        }
      } catch (err) {
        console.error("Failed to load institutions:", err);
      } finally {
        setLoadingInstitutions(false);
      }
    }

    void loadInstitutions();
    void fetchStudentEnrollments();
  }, [open, accessToken, institutionId, fetchStudentEnrollments]);

  // Load Academic Years and Programs for selected institution
  useEffect(() => {
    const targetInstId = selectedInstitutionId || (institutionId ? String(institutionId) : "");
    if (!open || !accessToken || !targetInstId) {
      setPrograms([]);
      setAcademicYears([]);
      return;
    }

    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const [ayRes, progRes] = await Promise.all([
          fetch(`/api/admin/institutions/academic-years?institutionId=${targetInstId}&limit=100`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(`/api/admin/institutions/programs?institutionId=${targetInstId}&limit=100`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);

        const ayJson = await readJsonResponse<{ data?: AcademicYearOption[] }>(ayRes);
        const progJson = await readJsonResponse<{ data?: any[] }>(progRes);

        if (Array.isArray(ayJson.data)) {
          setAcademicYears(ayJson.data);
          const targetAyId = activeEnrollmentRef.current?.academic_year_id
            ? String(activeEnrollmentRef.current.academic_year_id)
            : "";
          setSelectedAcademicYearId((curr) => {
            if (targetAyId && ayJson.data.some((a) => String(a.id) === targetAyId)) return targetAyId;
            if (curr && ayJson.data.some((a) => String(a.id) === curr)) return curr;
            return ayJson.data.length > 0 ? String(ayJson.data[0].id) : "";
          });
        }

        if (Array.isArray(progJson.data)) {
          const list = progJson.data.map((p: any) => ({ id: p.id, title: p.title || p.name }));
          setPrograms(list);
          const targetProgramId = activeEnrollmentRef.current?.program_id
            ? String(activeEnrollmentRef.current.program_id)
            : "";
          setSelectedProgramId((curr) => {
            if (targetProgramId && list.some((p) => String(p.id) === targetProgramId)) return targetProgramId;
            if (curr && list.some((p) => String(p.id) === curr)) return curr;
            return list.length > 0 ? String(list[0].id) : "";
          });
        }
      } catch (err) {
        console.error("Failed to load class options:", err);
      } finally {
        setLoadingOptions(false);
      }
    }

    void loadOptions();
  }, [open, accessToken, selectedInstitutionId, institutionId]);

  // Load sections when program changes
  useEffect(() => {
    if (!selectedProgramId || !accessToken) {
      setSections([]);
      return;
    }

    async function loadSections() {
      setLoadingSections(true);
      try {
        const res = await fetch(`/api/admin/institutions/programs/${selectedProgramId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await readJsonResponse<any>(res);
        if (!res.ok) throw new Error(json.error ?? "Failed to load sections");
        const data = json.data ?? {};
        const nextSections: SectionOption[] = ((data.section_ids ?? []) as number[]).map((sectionId: number, index: number) => ({
          id: sectionId,
          name: data.section_names?.[index] ?? `Section ${sectionId}`,
        }));
        setSections(nextSections);
        const targetSectionId = activeEnrollmentRef.current?.section_id
          ? String(activeEnrollmentRef.current.section_id)
          : "";
        setSelectedSectionId((curr) => {
          if (targetSectionId && nextSections.some((s) => String(s.id) === targetSectionId)) return targetSectionId;
          if (curr && nextSections.some((s) => String(s.id) === curr)) return curr;
          return nextSections.length > 0 ? String(nextSections[0].id) : "";
        });
      } catch (err) {
        console.error("Error loading sections:", err);
        setSections([]);
      } finally {
        setLoadingSections(false);
      }
    }

    void loadSections();
  }, [selectedProgramId, accessToken]);

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Assign Program / Class: {student?.full_name}
          </DialogTitle>
          <DialogDescription>
            Assign a class, section, session, and roll number to this student.
          </DialogDescription>
        </DialogHeader>

        {/* Existing enrollments history */}
        {enrollments.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current / Active Class Enrollments</p>
            <div className="space-y-1.5">
              {enrollments.map((enr) => (
                <div key={enr.id} className="flex items-center justify-between text-sm rounded bg-background p-2 border">
                  <div>
                    <span className="font-medium text-foreground">{enr.program_name || "Program"}</span>
                    {enr.section_name && <span className="text-muted-foreground"> ({enr.section_name})</span>}
                    <span className="text-xs text-muted-foreground ml-2">• {enr.academic_year_name || "Session"}</span>
                    {enr.roll_number && <span className="text-xs font-mono ml-2">Roll: {enr.roll_number}</span>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${enr.is_current ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}>
                    {enr.is_current ? "Current" : enr.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form fields */}
        <div className="rounded-xl border p-5 bg-card space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h4 className="font-semibold text-sm text-foreground">Program & Class Enrollment</h4>
              <p className="text-xs text-muted-foreground">Select institution, class, section, session, and roll number details</p>
            </div>
          </div>

          {loadingInstitutions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field 1: Institution / School */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="assign-institution" className="text-xs font-semibold">Institution / School *</Label>
                <Select
                  value={selectedInstitutionId}
                  onValueChange={(val) => setSelectedInstitutionId(val)}
                >
                  <SelectTrigger id="assign-institution" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select institution / school..." />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((inst) => (
                      <SelectItem key={inst.id} value={String(inst.id)} className="text-xs">
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field 2: Program / Class */}
              <div className="space-y-1.5">
                <Label htmlFor="assign-program" className="text-xs font-semibold">Program / Class *</Label>
                <Select
                  value={selectedProgramId}
                  onValueChange={setSelectedProgramId}
                  disabled={!selectedInstitutionId || loadingOptions}
                >
                  <SelectTrigger id="assign-program" className="w-full h-9 text-xs">
                    <SelectValue
                      placeholder={
                        loadingOptions
                          ? "Loading classes..."
                          : selectedInstitutionId
                          ? "Select program / class..."
                          : "Select institution first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field 3: Section */}
              <div className="space-y-1.5">
                <Label htmlFor="assign-section" className="text-xs font-semibold">Section</Label>
                <Select
                  value={selectedSectionId}
                  onValueChange={setSelectedSectionId}
                  disabled={!selectedProgramId || loadingSections}
                >
                  <SelectTrigger id="assign-section" className="w-full h-9 text-xs">
                    <SelectValue
                      placeholder={
                        loadingSections
                          ? "Loading sections..."
                          : selectedProgramId
                          ? "Select section"
                          : "Select program first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field 4: Academic Year / Session */}
              <div className="space-y-1.5">
                <Label htmlFor="assign-ay" className="text-xs font-semibold">Academic Year / Session *</Label>
                <Select
                  value={selectedAcademicYearId}
                  onValueChange={setSelectedAcademicYearId}
                  disabled={!selectedInstitutionId || loadingOptions}
                >
                  <SelectTrigger id="assign-ay" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((ay) => (
                      <SelectItem key={ay.id} value={String(ay.id)} className="text-xs">
                        {ay.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field 5: Roll Number */}
              <div className="space-y-1.5">
                <Label htmlFor="assign-roll" className="text-xs font-semibold">Roll Number</Label>
                <Input
                  id="assign-roll"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="Roll number"
                  className="w-full h-9 text-xs"
                />
              </div>

              {/* Field 6: Status */}
              <div className="space-y-1.5">
                <Label htmlFor="assign-status" className="text-xs font-semibold">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="assign-status" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Active" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-xs">Active</SelectItem>
                    <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                    <SelectItem value="transferred" className="text-xs">Transferred</SelectItem>
                    <SelectItem value="graduated" className="text-xs">Graduated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Field 7: Admission Date */}
              <div className="space-y-1.5">
                <Label htmlFor="assign-date" className="text-xs font-semibold">Admission Date</Label>
                <Input
                  id="assign-date"
                  type="date"
                  value={admissionDate}
                  onChange={(e) => setAdmissionDate(e.target.value)}
                  className="w-full h-9 text-xs"
                />
              </div>

              {/* Field 8: Remarks */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="assign-remarks" className="text-xs font-semibold">Enrollment Remarks</Label>
                <Textarea
                  id="assign-remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enrollment remarks"
                  className="min-h-16 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <ProgressiveSaveIndicator status={saveStatus} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEnrollment} disabled={saving || loadingOptions}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save Enrollment
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
