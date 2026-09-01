"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Repeat2, CheckCircle2, ArrowRight, ShieldCheck, Clock } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import type { Student } from "../columns";

type StudentPromotionRow = {
  id: number;
  outcome: "promoted" | "retained" | "failed" | "graduated" | "transferred";
  from_academic_year_name?: string | null;
  from_program_name?: string | null;
  from_section_name?: string | null;
  to_academic_year_name?: string | null;
  to_program_name?: string | null;
  to_section_name?: string | null;
  roll_number?: string | null;
  notes?: string | null;
  promoted_by_name?: string | null;
  promoted_at: string;
};

type OptionItem = { id: number; title?: string; name?: string };

type StudentPromotionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  accessToken: string | null;
  institutionId?: number | null;
  onPromotedSuccess?: () => void;
};

export function StudentPromotionsDialog({
  open,
  onOpenChange,
  student,
  accessToken,
  institutionId,
  onPromotedSuccess,
}: StudentPromotionsDialogProps) {
  const [promotions, setPromotions] = useState<StudentPromotionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Active current enrollment info
  const [currentEnrollment, setCurrentEnrollment] = useState<{
    id?: number;
    program_id?: number;
    program_name?: string;
    section_id?: number;
    section_name?: string;
    academic_year_id?: number;
    academic_year_name?: string;
    roll_number?: string;
  } | null>(null);

  // Form states for promotion
  const [outcome, setOutcome] = useState<"promoted" | "failed" | "graduated" | "transferred">("promoted");
  const [destAcademicYearId, setDestAcademicYearId] = useState<string>("");
  const [destProgramId, setDestProgramId] = useState<string>("");
  const [destSectionId, setDestSectionId] = useState<string>("");
  const [rollNumber, setRollNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Select dropdown options
  const [academicYears, setAcademicYears] = useState<OptionItem[]>([]);
  const [programs, setPrograms] = useState<OptionItem[]>([]);
  const [sections, setSections] = useState<OptionItem[]>([]);

  const fetchPromotions = useCallback(async () => {
    if (!student?.id || !accessToken) return;
    setLoading(true);
    try {
      const [promoRes, enrollRes] = await Promise.all([
        fetch(`/api/admin/students/${student.id}/promotions`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`/api/admin/students/${student.id}/enrollments`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      const promoJson = await promoRes.json();
      if (promoRes.ok) {
        setPromotions(promoJson.data || []);
      }

      const enrollJson = await enrollRes.json();
      if (enrollRes.ok && Array.isArray(enrollJson.data) && enrollJson.data.length > 0) {
        const activeEnr = enrollJson.data.find((e: any) => e.is_current) || enrollJson.data[0];
        setCurrentEnrollment(activeEnr);
      }
    } catch (err) {
      console.error("Error fetching student promotions/enrollments:", err);
    } finally {
      setLoading(false);
    }
  }, [student?.id, accessToken]);

  const fetchOptions = useCallback(async () => {
    if (!institutionId || !accessToken) return;
    try {
      const [ayRes, progRes] = await Promise.all([
        fetch(`/api/admin/institutions/academic-years?institutionId=${institutionId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`/api/admin/institutions/programs?institutionId=${institutionId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      if (ayRes.ok) {
        const ayJson = await ayRes.json();
        setAcademicYears(ayJson.data || []);
      }
      if (progRes.ok) {
        const progJson = await progRes.json();
        setPrograms(progJson.data || []);
      }
    } catch (err) {
      console.error("Error loading options:", err);
    }
  }, [institutionId, accessToken]);

  // Fetch sections when program changes
  useEffect(() => {
    if (!destProgramId || !accessToken) {
      setSections([]);
      return;
    }
    fetch(`/api/admin/institutions/programs/${destProgramId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.sections) {
          setSections(json.data.sections);
        } else {
          setSections([]);
        }
      })
      .catch(() => setSections([]));
  }, [destProgramId, accessToken]);

  // Helper to find the current program ID
  const getCurrentProgramId = useCallback(() => {
    if (currentEnrollment?.program_id) return String(currentEnrollment.program_id);
    const matched = programs.find(
      (p) => p.title?.trim().toLowerCase() === student?.program_name?.trim().toLowerCase()
    );
    return matched ? String(matched.id) : "";
  }, [currentEnrollment, programs, student?.program_name]);

  const handleOutcomeChange = (newOutcome: "promoted" | "failed" | "graduated" | "transferred") => {
    setOutcome(newOutcome);
    if (newOutcome === "failed") {
      const sameProgId = getCurrentProgramId();
      if (sameProgId) {
        setDestProgramId(sameProgId);
      }
      if (currentEnrollment?.section_id) {
        setDestSectionId(String(currentEnrollment.section_id));
      }
    }
  };

  // Sync failed outcome with same program whenever programs or current enrollment loads
  useEffect(() => {
    if (outcome === "failed") {
      const sameProgId = getCurrentProgramId();
      if (sameProgId && destProgramId !== sameProgId) {
        setDestProgramId(sameProgId);
      }
    }
  }, [outcome, getCurrentProgramId, destProgramId]);

  useEffect(() => {
    if (open && student) {
      fetchPromotions();
      fetchOptions();
      setShowAddForm(false);
      setOutcome("promoted");
      setDestAcademicYearId("");
      setDestProgramId("");
      setDestSectionId("");
      setNotes("");
      setRollNumber(student.roll_number || "");
    }
  }, [open, student, fetchPromotions, fetchOptions]);

  const handleSavePromotion = async () => {
    if (!institutionId || !student?.id || !accessToken) return;

    let finalProgramId = destProgramId;
    let finalSectionId = destSectionId;

    if (outcome === "failed") {
      finalProgramId = finalProgramId || getCurrentProgramId();
      finalSectionId = finalSectionId || (currentEnrollment?.section_id ? String(currentEnrollment.section_id) : "");
    }

    if (["promoted", "failed"].includes(outcome)) {
      if (!destAcademicYearId || !finalProgramId) {
        toast.error("Please select destination Academic Session and Program.");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/students/${student.id}/promotions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institutionId,
          outcome,
          toAcademicYearId: destAcademicYearId ? Number(destAcademicYearId) : null,
          toProgramId: finalProgramId ? Number(finalProgramId) : null,
          toSectionId: finalSectionId ? Number(finalSectionId) : null,
          rollNumber: rollNumber.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record promotion");

      toast.success("Student promotion details saved successfully!");
      setShowAddForm(false);
      fetchPromotions();
      if (onPromotedSuccess) onPromotedSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to record promotion");
    } finally {
      setSaving(false);
    }
  };

  const currentProgramTitle =
    programs.find((p) => String(p.id) === destProgramId)?.title ||
    currentEnrollment?.program_name ||
    student?.program_name ||
    "Current Program / Class";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat2 className="h-5 w-5 text-primary" />
            Student Promotion Details: {student?.full_name}
          </DialogTitle>
          <DialogDescription>
            Student promotion records are stored in a dedicated `student_promotions` table.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Current Class Badge */}
            <div className="rounded-lg border bg-primary/5 p-3 flex items-center justify-between text-xs sm:text-sm">
              <span className="font-semibold text-foreground">Current Program / Class:</span>
              <span className="font-medium text-primary">
                {student?.program_name || currentEnrollment?.program_name || "Unassigned"}{" "}
                {student?.section_name || currentEnrollment?.section_name
                  ? `(${student?.section_name || currentEnrollment?.section_name})`
                  : ""}{" "}
                • {student?.academic_year_name || currentEnrollment?.academic_year_name || "N/A"}
              </span>
            </div>

            {/* Existing Promotion History Timeline */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Promotion History Records
              </h4>
              {promotions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic border rounded-md p-3 bg-muted/20">
                  No previous promotion records found. Click below to add a new promotion entry.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {promotions.map((p) => (
                    <div key={p.id} className="p-3 rounded-lg border bg-card text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={
                            p.outcome === "promoted"
                              ? "bg-green-100 text-green-700"
                              : p.outcome === "graduated"
                              ? "bg-blue-100 text-blue-700"
                              : p.outcome === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }
                        >
                          {p.outcome.toUpperCase()}
                        </Badge>
                        <span className="text-muted-foreground">
                          {new Date(p.promoted_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-foreground pt-1">
                        <span>{p.from_program_name || "Previous"}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span>{p.to_program_name || "New Program"}</span>
                        {p.to_section_name ? `(${p.to_section_name})` : ""}
                      </div>
                      {p.notes && <p className="text-muted-foreground italic">{p.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Promotion Form */}
            {showAddForm ? (
              <div className="rounded-lg border p-4 bg-muted/30 space-y-3 mt-4">
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                  <Repeat2 className="h-4 w-4 text-primary" /> Add New Promotion Entry
                </h4>

                <div className="space-y-1">
                  <Label className="text-xs">Outcome / Status</Label>
                  <Select
                    value={outcome}
                    onValueChange={(val: any) => handleOutcomeChange(val)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="promoted">Promoted to next class</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="graduated">Graduated</SelectItem>
                      <SelectItem value="transferred">Transferred out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {["promoted", "failed"].includes(outcome) && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Destination Academic Session *</Label>
                        <Select value={destAcademicYearId} onValueChange={setDestAcademicYearId}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select session" />
                          </SelectTrigger>
                          <SelectContent>
                            {academicYears.map((ay) => (
                              <SelectItem key={ay.id} value={String(ay.id)}>
                                {ay.name || ay.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">
                          {outcome === "failed" ? "Program / Class (Auto-retained) *" : "Destination Program / Class *"}
                        </Label>
                        {outcome === "failed" ? (
                          <div>
                            <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/60 px-3 text-xs font-medium text-foreground">
                              {currentProgramTitle}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Auto-assigned to same class for repeating session.
                            </p>
                          </div>
                        ) : (
                          <Select value={destProgramId} onValueChange={setDestProgramId}>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select program" />
                            </SelectTrigger>
                            <SelectContent>
                              {programs.map((pr) => (
                                <SelectItem key={pr.id} value={String(pr.id)}>
                                  {pr.title || pr.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Destination Section</Label>
                        <Select value={destSectionId} onValueChange={setDestSectionId}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select section" />
                          </SelectTrigger>
                          <SelectContent>
                            {sections.map((sec) => (
                              <SelectItem key={sec.id} value={String(sec.id)}>
                                {sec.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">New Roll Number</Label>
                        <Input
                          size={1}
                          className="text-sm"
                          value={rollNumber}
                          onChange={(e) => setRollNumber(e.target.value)}
                          placeholder="e.g. 101"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Promotion Notes / Remarks</Label>
                  <Textarea
                    rows={2}
                    className="text-sm"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      outcome === "failed"
                        ? "e.g. Failed annual exam; repeating same class."
                        : "e.g. Promoted based on annual exam performance."
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSavePromotion} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                    Save Promotion Record
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAddForm(true)}>
                <Repeat2 className="mr-1.5 h-4 w-4" /> Add Promotion Entry
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
