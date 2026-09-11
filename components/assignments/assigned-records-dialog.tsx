"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  Award,
  BookOpen,
  Send,
  Loader2,
  RefreshCw,
  FileCheck2,
  AlertCircle,
  GraduationCap,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";

export interface AssignedRecordsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: number | null;
  assignmentTitle?: string;
  activeInstitutionId?: number | null;
  onOpenAssignDialog?: () => void;
}

export function AssignedRecordsDialog({
  open,
  onOpenChange,
  assignmentId,
  assignmentTitle,
  activeInstitutionId,
  onOpenAssignDialog,
}: AssignedRecordsDialogProps) {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    template: any;
    summary: {
      total_distributions: number;
      total_students_assigned: number;
      pending_count: number;
      submitted_count: number;
      checked_count: number;
    };
    assignments: any[];
    students: any[];
  } | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const authHeaders = useCallback(() => {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }, [accessToken]);

  const fetchAssignedRecords = useCallback(async () => {
    if (!assignmentId) return;
    setLoading(true);
    try {
      const url = new URL(`/api/admin/master-data/assignments/${assignmentId}/assigned`, window.location.origin);
      if (activeInstitutionId) {
        url.searchParams.set("institutionId", String(activeInstitutionId));
      }
      const res = await fetch(url.toString(), {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load assigned records");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      toast.error(err.message || "Failed to load assigned student records");
    } finally {
      setLoading(false);
    }
  }, [assignmentId, activeInstitutionId, authHeaders]);

  useEffect(() => {
    if (open && assignmentId) {
      setSearch("");
      setStatusFilter("all");
      void fetchAssignedRecords();
    } else {
      setData(null);
    }
  }, [open, assignmentId, fetchAssignedRecords]);

  // Filter students by search and status
  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    let list = data.students;

    if (statusFilter !== "all") {
      if (statusFilter === "pending") {
        list = list.filter((s) => !s.status || s.status === "pending");
      } else if (statusFilter === "submitted") {
        list = list.filter((s) => s.status === "submitted");
      } else if (statusFilter === "checked") {
        list = list.filter((s) => s.status === "checked" || s.status === "graded");
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((s) => {
        const name = (s.student_name || "").toLowerCase();
        const email = (s.email || "").toLowerCase();
        const roll = (s.roll_number || "").toLowerCase();
        const admission = (s.admission_number || "").toLowerCase();
        const section = (s.section_name || "").toLowerCase();
        return (
          name.includes(q) ||
          email.includes(q) ||
          roll.includes(q) ||
          admission.includes(q) ||
          section.includes(q)
        );
      });
    }

    return list;
  }, [data?.students, search, statusFilter]);

  const summary = data?.summary || {
    total_distributions: 0,
    total_students_assigned: 0,
    pending_count: 0,
    submitted_count: 0,
    checked_count: 0,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-primary">
              <Users className="h-5 w-5" />
              <DialogTitle className="text-xl font-bold">
                Assigned Records &mdash; {data?.template?.title || assignmentTitle || "Assignment"}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => void fetchAssignedRecords()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                <span className="sr-only">Refresh records</span>
              </Button>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            View all students and batches assigned to this assignment, submission status, and evaluation marks.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="rounded-xl border bg-card p-3 flex flex-col justify-between shadow-xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-primary" /> Total Assigned
            </span>
            <p className="text-2xl font-bold text-foreground mt-1">
              {summary.total_students_assigned}
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex flex-col justify-between shadow-xs">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Pending
            </span>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
              {summary.pending_count}
            </p>
          </div>

          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 flex flex-col justify-between shadow-xs">
            <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1">
              <FileCheck2 className="h-3.5 w-3.5" /> Submitted
            </span>
            <p className="text-2xl font-bold text-sky-700 dark:text-sky-300 mt-1">
              {summary.submitted_count}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex flex-col justify-between shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Evaluated
            </span>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
              {summary.checked_count}
            </p>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, roll no, email, or section..."
              className="pl-8 text-xs h-9 bg-card"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className="h-8 text-xs px-2.5"
            >
              All ({data?.students?.length || 0})
            </Button>
            <Button
              type="button"
              variant={statusFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pending")}
              className="h-8 text-xs px-2.5"
            >
              Pending ({summary.pending_count})
            </Button>
            <Button
              type="button"
              variant={statusFilter === "submitted" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("submitted")}
              className="h-8 text-xs px-2.5"
            >
              Submitted ({summary.submitted_count})
            </Button>
            <Button
              type="button"
              variant={statusFilter === "checked" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("checked")}
              className="h-8 text-xs px-2.5"
            >
              Evaluated ({summary.checked_count})
            </Button>
          </div>
        </div>

        {/* Active Distributions / Target Scopes */}
        {data?.assignments && data.assignments.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs flex-wrap">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Layers className="size-3 text-primary" /> Assigned Scope:
            </span>
            {data.assignments.map((a: any) => (
              <Badge
                key={a.id}
                variant="secondary"
                className="text-xs font-semibold px-2.5 py-1 gap-1.5 shrink-0 bg-primary/10 text-primary border border-primary/20"
              >
                {a.target_type === "PROGRAM" ? (
                  <GraduationCap className="size-3.5" />
                ) : a.target_type === "SECTION" ? (
                  <Layers className="size-3.5" />
                ) : (
                  <Users className="size-3.5" />
                )}
                <span>{a.target_display_label || a.program_title || "Batch"}</span>
                {a.submission_date && (
                  <span className="text-[10px] text-muted-foreground ml-1">
                    (Due: {new Date(a.submission_date).toLocaleDateString()})
                  </span>
                )}
              </Badge>
            ))}
          </div>
        )}

        {/* Student Records List / Table */}
        <div className="flex-1 overflow-y-auto border rounded-xl bg-card min-h-[220px]">
          {loading ? (
            <div className="flex min-h-52 items-center justify-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading assigned records...
            </div>
          ) : filteredStudents.length > 0 ? (
            <div className="divide-y">
              {filteredStudents.map((st) => {
                const isChecked = st.status === "checked" || st.status === "graded";
                const isSubmitted = st.status === "submitted";
                const isPending = !st.status || st.status === "pending";

                return (
                  <div
                    key={st.student_assignment_id}
                    className="p-3.5 hover:bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs shrink-0 mt-0.5">
                        {st.student_name
                          ? st.student_name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()
                          : "ST"}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground">
                            {st.student_name}
                          </span>
                          {st.section_name && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                              Sec {st.section_name}
                            </Badge>
                          )}
                          {st.program_name && (
                            <span className="text-[11px] text-muted-foreground">
                              • {st.program_name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {st.email ? `${st.email} • ` : ""}
                          Roll: <strong className="text-foreground">{st.roll_number || "N/A"}</strong>
                          {st.admission_number ? ` • Adm: ${st.admission_number}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 sm:text-right">
                      <div className="space-y-0.5">
                        <div className="flex sm:justify-end">
                          {isChecked ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px] font-semibold gap-1">
                              <CheckCircle2 className="size-3" /> Evaluated
                            </Badge>
                          ) : isSubmitted ? (
                            <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 text-[11px] font-semibold gap-1">
                              <FileCheck2 className="size-3" /> Submitted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[11px] font-semibold gap-1">
                              <Clock className="size-3" /> Pending
                            </Badge>
                          )}
                        </div>

                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 sm:justify-end">
                          {st.obtained_marks != null ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {Number(st.obtained_marks).toFixed(1)} / {st.total_marks || 100} Marks
                            </span>
                          ) : st.submission_date ? (
                            <span>Due: {new Date(st.submission_date).toLocaleDateString()}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 px-4 text-center space-y-2">
              <Users className="size-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-semibold text-foreground">No student records found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search || statusFilter !== "all"
                  ? "Try changing your search keywords or filter status."
                  : "This assignment has not been assigned to any students yet. Click 'Assign to Students' to distribute it."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            Showing <strong>{filteredStudents.length}</strong> of{" "}
            <strong>{data?.students?.length || 0}</strong> assigned students
          </p>

          <div className="flex items-center gap-2">
            {onOpenAssignDialog && (
              <Button
                type="button"
                size="sm"
                className="text-xs font-bold gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  onOpenAssignDialog();
                }}
              >
                <Send className="size-3.5" />
                Assign More Students
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
