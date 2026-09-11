"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Users,
  Layers,
  UserCheck,
  Calendar,
  GraduationCap,
  BookOpen,
  Clock,
  Loader2,
  CheckCircle2,
  Search,
  Check,
  Award,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";

export interface AssignmentToAssign {
  id: number;
  title: string;
  description?: string | null;
  subject_name?: string | null;
  total_marks?: number | null;
  source_institution_id?: number | null;
  institution_id?: number | null;
  target_type?: "INSTITUTION" | "PROGRAM" | "SECTION" | "STUDENT" | null;
  target_id?: number | null;
  target_program_id?: number | null;
  target_program_label?: string | null;
  target_label?: string | null;
  program_id?: number | null;
  program_name?: string | null;
}

interface AssignAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: AssignmentToAssign | null;
  activeInstitutionId?: number | null;
  onAssigned?: () => void;
}

export function AssignAssignmentDialog({
  open,
  onOpenChange,
  assignment,
  activeInstitutionId,
  onAssigned,
}: AssignAssignmentDialogProps) {
  const { accessToken, user } = useAuthStore();

  const authHeaders = useCallback(() => {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }, [accessToken]);

  // Target Mode: 'PROGRAM' (Entire Batch / Program) | 'SECTION' (Specific Section) | 'STUDENT' (Particular Student)
  const [targetType, setTargetType] = useState<"PROGRAM" | "SECTION" | "STUDENT">("PROGRAM");

  // Selected Program & Batches & Sections
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedBatchName, setSelectedBatchName] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  // Selected Students (for STUDENT mode)
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentSearch, setStudentSearch] = useState<string>("");

  // Schedule & Parameters
  const [issueDate, setIssueDate] = useState<string>("");
  const [submissionDate, setSubmissionDate] = useState<string>("");
  const [totalMarks, setTotalMarks] = useState<string>("");
  const [instructions, setInstructions] = useState<string>("");

  // Data Loading States
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [programsList, setProgramsList] = useState<any[]>([]);

  const [loadingBatches, setLoadingBatches] = useState(false);
  const [batchesList, setBatchesList] = useState<any[]>([]);
  const [sectionsList, setSectionsList] = useState<any[]>([]);

  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsList, setStudentsList] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);

  // Resolved Institution ID
  const effectiveInstitutionId = useMemo(() => {
    return (
      activeInstitutionId ??
      assignment?.source_institution_id ??
      assignment?.institution_id ??
      (user?.memberships?.[0]?.institution_id ? Number(user.memberships[0].institution_id) : null) ??
      ((user as any)?.institution_id ? Number((user as any).institution_id) : null)
    );
  }, [activeInstitutionId, assignment, user]);

  // Reset & Initialize Form on Open
  useEffect(() => {
    if (open && assignment) {
      setTargetType("PROGRAM");
      
      // Resolve the program id already attached to this assignment template
      const resolvedProgId =
        assignment.target_program_id != null
          ? String(assignment.target_program_id)
          : assignment.target_type === "PROGRAM" && assignment.target_id != null
          ? String(assignment.target_id)
          : (assignment as any).program_id != null
          ? String((assignment as any).program_id)
          : "";

      setSelectedProgramId(resolvedProgId);
      setSelectedBatchName("");
      setSelectedSectionId("");
      setSelectedStudentIds([]);
      setStudentSearch("");

      const today = new Date().toISOString().split("T")[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setIssueDate(today);
      setSubmissionDate(nextWeek);
      setTotalMarks(assignment.total_marks ? String(assignment.total_marks) : "100");
      setInstructions(assignment.description || "");

      // Fetch programs list for institution to populate program labels/objects
      if (effectiveInstitutionId) {
        fetchInstitutionPrograms(effectiveInstitutionId, resolvedProgId);
      }
    }
  }, [open, assignment, effectiveInstitutionId]);

  // 1. Fetch Institution Programs (to resolve program details)
  const fetchInstitutionPrograms = async (instId: number, preferredProgId?: string) => {
    setLoadingPrograms(true);
    try {
      const res = await fetch(`/api/admin/institutions/programs?institutionId=${instId}&limit=100`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        const progs = json.data || [];
        setProgramsList(progs);
        if (preferredProgId) {
          setSelectedProgramId(preferredProgId);
        } else if (progs.length > 0 && !preferredProgId) {
          setSelectedProgramId(String(progs[0].id));
        }
      }
    } catch (err) {
      console.error("Failed to fetch programs:", err);
    } finally {
      setLoadingPrograms(false);
    }
  };

  // 2. Fetch Batches & Sections when selectedProgramId changes
  useEffect(() => {
    if (!selectedProgramId) {
      setBatchesList([]);
      setSectionsList([]);
      return;
    }

    (async () => {
      setLoadingBatches(true);
      try {
        const res = await fetch(`/api/admin/institutions/programs/${selectedProgramId}/batches`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const json = await res.json();
          const batches = json.data || [];
          setBatchesList(batches);
          if (batches.length > 0) {
            setSelectedBatchName(batches[0].batch_name);
            // Collect all unique sections
            const allSecs: any[] = [];
            batches.forEach((b: any) => {
              (b.sections || []).forEach((sec: any) => {
                if (!allSecs.some((s) => s.id === sec.id)) {
                  allSecs.push(sec);
                }
              });
            });
            setSectionsList(allSecs);
            if (allSecs.length > 0) {
              setSelectedSectionId(String(allSecs[0].id));
            }
          } else {
            setSelectedBatchName("");
            setSelectedSectionId("");
          }
        }
      } catch (err) {
        console.error("Failed to fetch batches:", err);
      } finally {
        setLoadingBatches(false);
      }
    })();
  }, [selectedProgramId, authHeaders]);

  // 3. Fetch Students when targetType is 'STUDENT' or program/section changes
  useEffect(() => {
    if (!open || !effectiveInstitutionId || !selectedProgramId) return;

    (async () => {
      setLoadingStudents(true);
      try {
        const params = new URLSearchParams({
          institutionId: String(effectiveInstitutionId),
          programId: selectedProgramId,
          limit: "250",
        });
        if (selectedSectionId && targetType === "SECTION") {
          params.set("sectionId", selectedSectionId);
        }

        const res = await fetch(`/api/admin/students?${params.toString()}`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const json = await res.json();
          setStudentsList(json.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch students:", err);
      } finally {
        setLoadingStudents(false);
      }
    })();
  }, [open, effectiveInstitutionId, selectedProgramId, selectedSectionId, targetType, authHeaders]);

  // Filter students by search term
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return studentsList;
    const q = studentSearch.toLowerCase().trim();
    return studentsList.filter((st) => {
      const name = (st.full_name || st.name || `${st.first_name || ""} ${st.last_name || ""}`).toLowerCase();
      const roll = (st.roll_number || "").toLowerCase();
      const email = (st.email || "").toLowerCase();
      return name.includes(q) || roll.includes(q) || email.includes(q);
    });
  }, [studentsList, studentSearch]);

  const toggleStudent = (sId: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId]
    );
  };

  const toggleSelectAllStudents = () => {
    if (selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => Number(s.id || s.student_id)));
    }
  };

  const selectedProgramObj = useMemo(() => {
    return programsList.find((p) => String(p.id) === String(selectedProgramId)) || null;
  }, [programsList, selectedProgramId]);

  const programDisplayName = useMemo(() => {
    return (
      selectedProgramObj?.title ||
      assignment?.target_program_label ||
      (assignment?.target_type === "PROGRAM" ? assignment?.target_label : "") ||
      (assignment as any)?.program_name ||
      ""
    );
  }, [selectedProgramObj, assignment]);

  const selectedBatchObj = useMemo(() => {
    return batchesList.find((b) => b.batch_name === selectedBatchName) || null;
  }, [batchesList, selectedBatchName]);

  const selectedSectionObj = useMemo(() => {
    return sectionsList.find((s) => String(s.id) === String(selectedSectionId)) || null;
  }, [sectionsList, selectedSectionId]);

  // Handle Assign Now Submit
  const handleAssignNow = async () => {
    if (!assignment) return;
    if (!effectiveInstitutionId) {
      toast.error("Please select an institution first");
      return;
    }
    if (!selectedProgramId) {
      toast.error("Please select a Course / Program");
      return;
    }
    if (targetType === "SECTION" && !selectedSectionId) {
      toast.error("Please select a Section");
      return;
    }
    if (targetType === "STUDENT" && selectedStudentIds.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/master-data/assignments/${assignment.id}/assign`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institutionId: effectiveInstitutionId,
          targetType,
          programId: Number(selectedProgramId),
          batchName: selectedBatchName || undefined,
          sectionId: selectedSectionId ? Number(selectedSectionId) : undefined,
          studentIds: targetType === "STUDENT" ? selectedStudentIds : undefined,
          issueDate,
          submissionDate,
          totalMarks: totalMarks ? Number(totalMarks) : undefined,
          instructions,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to assign assignment");
      }

      toast.success(json.message || "Assignment assigned successfully!");
      onOpenChange(false);
      onAssigned?.();
    } catch (err: any) {
      toast.error(err.message || "An error occurred while assigning");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[92vh] flex flex-col p-6 overflow-hidden">
        {/* Dialog Header */}
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Send className="h-5 w-5" />
            <DialogTitle className="text-xl font-bold">
              Assign Assignment &mdash; {assignment?.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Assign this assignment to an entire batch, specific section, or individual students in your institution.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-5 pr-1">
          {/* Course & Program Badge Context */}
          {programDisplayName && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                    Course &amp; Program
                  </span>
                  <span className="font-bold text-foreground">{programDisplayName}</span>
                </div>
              </div>
              {assignment?.subject_name && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                  <BookOpen className="size-3 mr-1" />
                  {assignment.subject_name}
                </Badge>
              )}
            </div>
          )}

          {/* STEP 1: WHOM TO ASSIGN (TARGET MODE SELECTION) */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              1. Choose Whom to Assign:
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Entire Batch Card */}
              <button
                type="button"
                onClick={() => setTargetType("PROGRAM")}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                  targetType === "PROGRAM"
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                    : "border-border/80 bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                  {targetType === "PROGRAM" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Entire Batch / Program</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Assign to all enrolled students in the batch/program.
                  </p>
                </div>
              </button>

              {/* Specific Section Card */}
              <button
                type="button"
                onClick={() => setTargetType("SECTION")}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                  targetType === "SECTION"
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                    : "border-border/80 bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600">
                    <Layers className="h-4 w-4" />
                  </span>
                  {targetType === "SECTION" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Specific Section</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Assign to students of a particular section (e.g. Section A).
                  </p>
                </div>
              </button>

              {/* Particular Student(s) Card */}
              <button
                type="button"
                onClick={() => setTargetType("STUDENT")}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                  targetType === "STUDENT"
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                    : "border-border/80 bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <UserCheck className="h-4 w-4" />
                  </span>
                  {targetType === "STUDENT" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Particular Student(s)</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Select individual students with interactive checkboxes.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* STEP 2: DYNAMIC BATCH / SECTION / STUDENT SELECTION */}
          {selectedProgramId ? (
            <div className="space-y-3 p-4 rounded-xl border border-border/80 bg-muted/20">
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                2. Choose{" "}
                {targetType === "PROGRAM"
                  ? "Batch (Optional)"
                  : targetType === "SECTION"
                  ? "Section"
                  : "Students"}
                :
              </Label>

              {/* TARGET TYPE: PROGRAM / BATCH */}
              {targetType === "PROGRAM" && (
                <div className="space-y-2">
                  {loadingBatches ? (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Loading batches...
                    </div>
                  ) : batchesList.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Select a specific batch or leave selected to assign to the entire program:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {batchesList.map((b) => {
                          const isBatchActive = selectedBatchName === b.batch_name;
                          return (
                            <button
                              key={b.batch_name}
                              type="button"
                              onClick={() => setSelectedBatchName(b.batch_name)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                                isBatchActive
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card text-muted-foreground hover:text-foreground border-border/80"
                              }`}
                            >
                              <span>{b.batch_name}</span>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] ${
                                  isBatchActive
                                    ? "bg-primary-foreground/20 text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {b.sections?.length || 1} Sec
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Will assign to all students enrolled in <strong>{programDisplayName || selectedProgramObj?.title}</strong>.
                    </div>
                  )}
                </div>
              )}

              {/* TARGET TYPE: SECTION */}
              {targetType === "SECTION" && (
                <div className="space-y-2">
                  {sectionsList.length > 0 ? (
                    <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                      <SelectTrigger className="h-10 text-xs font-medium w-full bg-card">
                        <SelectValue placeholder="Choose Section..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sectionsList.map((sec) => (
                          <SelectItem key={sec.id} value={String(sec.id)}>
                            Section {sec.name || `#${sec.id}`}
                            {sec.batch_name ? ` (${sec.batch_name})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-xs text-amber-700 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                      No specific sections configured for this program. You can assign by Entire Batch/Program.
                    </div>
                  )}
                </div>
              )}

              {/* TARGET TYPE: STUDENT */}
              {targetType === "STUDENT" && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Search student by name, roll no, or email..."
                        className="pl-8 text-xs h-9 bg-card"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAllStudents}
                        className="h-8 text-xs font-semibold"
                      >
                        {selectedStudentIds.length === filteredStudents.length &&
                        filteredStudents.length > 0
                          ? "Deselect All"
                          : `Select All (${filteredStudents.length})`}
                      </Button>
                      <Badge variant="secondary" className="text-xs font-bold">
                        {selectedStudentIds.length} Selected
                      </Badge>
                    </div>
                  </div>

                  {loadingStudents ? (
                    <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Loading enrolled students...
                    </div>
                  ) : filteredStudents.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 border rounded-xl p-2 bg-card">
                      {filteredStudents.map((st) => {
                        const sId = Number(st.id || st.student_id);
                        const isChecked = selectedStudentIds.includes(sId);
                        const stName =
                          st.full_name || st.name || `${st.first_name || ""} ${st.last_name || ""}` || `Student #${sId}`;

                        return (
                          <div
                            key={sId}
                            onClick={() => toggleStudent(sId)}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all cursor-pointer ${
                              isChecked
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-muted/50 border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Checkbox checked={isChecked} onCheckedChange={() => toggleStudent(sId)} />
                              <div>
                                <p className="font-bold text-foreground">{stName}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {st.email ? `${st.email} • ` : ""}
                                  Roll: {st.roll_number || "N/A"}
                                </p>
                              </div>
                            </div>

                            {st.section_name && (
                              <Badge variant="outline" className="text-[10px]">
                                Sec {st.section_name}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                      No active students found matching this criteria.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 border rounded-xl border-amber-500/30 bg-amber-500/5 text-xs text-amber-700">
              No course/program linked to this assignment template.
            </div>
          )}

          {/* STEP 3: ASSIGNMENT SCHEDULING & OPTIONS */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              3. Assignment Dates &amp; Passing Details:
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Issue / Start Date</Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Submission Due Date *</Label>
                <Input
                  type="date"
                  value={submissionDate}
                  onChange={(e) => setSubmissionDate(e.target.value)}
                  className="h-9 text-xs font-bold border-primary/40 text-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Total Marks</Label>
                <Input
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  className="h-9 text-xs"
                  placeholder="100"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Special Instructions / Remarks for Students (Optional)</Label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Please solve all objective questions and upload handwritten notes for subjective questions."
                className="text-xs min-h-[60px]"
              />
            </div>
          </div>

          {/* LIVE ALLOCATION SUMMARY BANNER */}
          {(programDisplayName || selectedProgramObj) && (
            <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <p className="font-bold text-foreground">Allocation Summary</p>
                <p className="text-muted-foreground text-[11px]">
                  Assignment <strong>{assignment?.title}</strong> will be assigned to{" "}
                  <strong>
                    {targetType === "PROGRAM"
                      ? `all students in ${programDisplayName || selectedProgramObj?.title}${selectedBatchName ? ` (${selectedBatchName})` : ""}`
                      : targetType === "SECTION"
                      ? `Section ${selectedSectionObj?.name || selectedSectionId} in ${programDisplayName || selectedProgramObj?.title}`
                      : `${selectedStudentIds.length} selected student(s) in ${programDisplayName || selectedProgramObj?.title}`}
                  </strong>
                  , due on <strong>{submissionDate}</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="text-xs h-9 font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAssignNow}
            disabled={submitting || !selectedProgramId}
            className="text-xs h-9 font-bold bg-primary text-primary-foreground gap-1.5 shadow-sm"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Assign Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
