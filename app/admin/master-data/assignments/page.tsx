"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  Ban,
  BookMarked,
  BookOpen,
  Calendar,
  Eye,
  GraduationCap,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AssignAssignmentDialog } from "@/components/assignments/assign-assignment-dialog";
import { AssignedRecordsDialog } from "@/components/assignments/assigned-records-dialog";
import { AssignmentQuestionEditor } from "@/components/assignments/assignment-question-editor";
import { AssignmentTemplateEditor } from "@/components/assignments/assignment-template-editor";
import type { AssignmentInstitutionOption } from "@/components/assignments/assignment-template-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import type { AssignmentTemplateRow } from "@/lib/types/assignment-template";
import { useAuthStore } from "@/store";

type Stats = { total: number; active: number; blocked: number; questions: number };
type AssignmentView = "my" | "marketplace";

const emptyStats: Stats = { total: 0, active: 0, blocked: 0, questions: 0 };
const inheritedBadgeClass =
  "border-emerald-500/70 bg-transparent px-1.5 py-0 text-[10px] font-medium text-emerald-400";

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned an invalid response" };
  }
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card px-5 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function getSyllabusSummary(syllabusData: unknown) {
  if (!Array.isArray(syllabusData) || syllabusData.length === 0) return null;
  const units: string[] = [];
  const chapters: string[] = [];

  for (const unit of syllabusData) {
    if (!unit) continue;
    const uTitle =
      unit.title || unit.name || (unit.unit_number ? `Unit ${unit.unit_number}` : null);
    if (uTitle && !units.includes(uTitle)) {
      units.push(uTitle);
    }
    if (Array.isArray(unit.chapters)) {
      for (const ch of unit.chapters) {
        if (!ch) continue;
        const cTitle =
          ch.title || ch.name || (ch.chapter_number ? `Chapter ${ch.chapter_number}` : null);
        if (cTitle && !chapters.includes(cTitle)) {
          chapters.push(cTitle);
        }
      }
    }
  }

  if (units.length === 0 && chapters.length === 0) return null;
  return { units, chapters };
}

function formatAssignmentTarget(assignment: AssignmentTemplateRow) {
  if (assignment.target_program_label) {
    if (assignment.target_type === "SECTION") {
      const parts = assignment.target_label?.split(" > ") ?? [];
      const sectionName = parts.length > 2 ? parts[2] : parts[1];
      return sectionName ? `${assignment.target_program_label} > ${sectionName}` : assignment.target_program_label;
    }
    if (assignment.target_type === "STUDENT") {
      const parts = assignment.target_label?.split(" > ") ?? [];
      const studentName = parts.length > 2 ? parts[2] : parts[1];
      return studentName ? `${assignment.target_program_label} > ${studentName}` : assignment.target_program_label;
    }
    return assignment.target_program_label;
  }
  if (assignment.target_label?.includes(" > ")) {
    return assignment.target_label.split(" > ").slice(1).join(" > ");
  }
  return assignment.target_label ?? "Whole Course / Program";
}

export default function AssignmentsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const [rows, setRows] = useState<AssignmentTemplateRow[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(-1);
  const [totalRows, setTotalRows] = useState(0);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [assignmentView, setAssignmentView] = useState<AssignmentView>("my");
  const [filterProgramId, setFilterProgramId] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterSyllabus, setFilterSyllabus] = useState("");
  const [debouncedSyllabus, setDebouncedSyllabus] = useState("");
  const [programsList, setProgramsList] = useState<Array<{ id: number; title: string; name?: string }>>([]);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AssignmentTemplateRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [active, setActive] = useState<AssignmentTemplateRow | null>(null);
  const [questionEditorOpen, setQuestionEditorOpen] = useState(false);
  const [questionTemplate, setQuestionTemplate] =
    useState<AssignmentTemplateRow | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AssignmentTemplateRow | null>(null);
  const [assignedRecordsOpen, setAssignedRecordsOpen] = useState(false);
  const [assignedRecordsTarget, setAssignedRecordsTarget] =
    useState<AssignmentTemplateRow | null>(null);
  const [blockTarget, setBlockTarget] = useState<AssignmentTemplateRow | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionRowId, setActionRowId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssignmentTemplateRow | null>(null);
  const [purchaseTarget, setPurchaseTarget] = useState<AssignmentTemplateRow | null>(null);

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSyllabus(filterSyllabus), 300);
    return () => window.clearTimeout(timeout);
  }, [filterSyllabus]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    async function loadPrograms() {
      try {
        const endpoint = isPlatformAdmin
          ? "/api/admin/content/courses?limit=100"
          : `/api/admin/institutions/programs?limit=100${activeInstitutionId ? `&institutionId=${activeInstitutionId}` : ""}`;
        const res = await fetch(endpoint, { headers: authHeaders() });
        const json = await readJson(res);
        if (!cancelled && res.ok) {
          const list = (json.data ?? []).map((p: any) => ({
            id: p.id,
            title: p.title || p.name,
          }));
          setProgramsList(list);
        }
      } catch (err) {
        console.error("Failed to load programs for filter:", err);
      }
    }
    void loadPrograms();
    return () => {
      cancelled = true;
    };
  }, [accessToken, activeInstitutionId, authHeaders, isPlatformAdmin]);

  useEffect(() => {
    if (!accessToken || !filterProgramId) {
      setSubjectsList([]);
      return;
    }
    let cancelled = false;
    async function loadSubjects() {
      try {
        const res = await fetch(`/api/admin/institutions/programs/${filterProgramId}`, {
          headers: authHeaders(),
        });
        const json = await readJson(res);
        if (!cancelled && res.ok && json.data?.curriculum_structure?.subjects) {
          const names = (json.data.curriculum_structure.subjects as any[])
            .map((s) => s.name)
            .filter(Boolean);
          setSubjectsList(Array.from(new Set(names)));
        }
      } catch (err) {
        console.error("Failed to load subjects for program filter:", err);
      }
    }
    void loadSubjects();
    return () => {
      cancelled = true;
    };
  }, [accessToken, filterProgramId, authHeaders]);

  const availableSubjects = useMemo(() => {
    if (subjectsList.length > 0) return subjectsList;
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.subject_name) set.add(r.subject_name);
    });
    return Array.from(set).sort();
  }, [subjectsList, rows]);

  const hasActiveFilters = Boolean(filterProgramId || filterSubject || filterSyllabus);
  const clearFilters = useCallback(() => {
    setFilterProgramId("");
    setFilterSubject("");
    setFilterSyllabus("");
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, []);

  const fetchRows = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search: debouncedSearch,
        view: assignmentView,
      });
      if (!isPlatformAdmin && activeInstitutionId) {
        params.set("institutionId", String(activeInstitutionId));
      }
      if (filterProgramId) {
        params.set("programId", filterProgramId);
      }
      if (filterSubject) {
        params.set("subject", filterSubject);
      }
      if (debouncedSyllabus) {
        params.set("syllabus", debouncedSyllabus);
      }
      const res = await fetch(
        `/api/admin/master-data/assignments?${params.toString()}`,
        { headers: authHeaders() }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch assignments");
      setRows(json.data ?? []);
      setStats(json.stats ?? emptyStats);
      setPageCount(json.pageCount ?? -1);
      setTotalRows(Number(json.total ?? 0));
      setCanCreate(Boolean(json.capabilities?.canCreate));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch assignments");
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    activeInstitutionId,
    authHeaders,
    assignmentView,
    debouncedSearch,
    filterProgramId,
    filterSubject,
    debouncedSyllabus,
    isPlatformAdmin,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  const fetchInstitutions = useCallback(async (searchValue: string, page: number) => {
    if (!accessToken) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      action: "institutions",
      search: searchValue,
      page: String(page),
      limit: "15",
    });
    const res = await fetch(
      `/api/admin/master-data/assignments?${params.toString()}`,
      { headers: authHeaders() }
    );
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to fetch institutions");
    return {
      data: (json.data ?? []) as AssignmentInstitutionOption[],
      hasMore: page < Number(json.pageCount ?? 0),
    };
  }, [accessToken, authHeaders]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void fetchRows(), 0);
    return () => window.clearTimeout(timeout);
  }, [fetchRows, isReady]);

  const fetchDetail = useCallback(
    async (row: AssignmentTemplateRow) => {
      if (!accessToken) return null;
      const res = await fetch(`/api/admin/master-data/assignments/${row.id}`, {
        headers: authHeaders(),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch assignment");
      return json.data as AssignmentTemplateRow;
    },
    [accessToken, authHeaders]
  );

  const openDetail = useCallback(
    async (row: AssignmentTemplateRow) => {
      setActive(row);
      setDetailOpen(true);
      setDetailLoading(true);
      try {
        setActive(await fetchDetail(row));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to fetch assignment");
      } finally {
        setDetailLoading(false);
      }
    },
    [fetchDetail]
  );

  const openEdit = useCallback(
    async (row: AssignmentTemplateRow) => {
      try {
        const detail = await fetchDetail(row);
        setEditing(detail);
        setEditorOpen(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to fetch assignment");
      }
    },
    [fetchDetail]
  );

  const openQuestionEditor = useCallback((assignment: AssignmentTemplateRow) => {
    setQuestionTemplate(assignment);
    setDetailOpen(false);
    setQuestionEditorOpen(true);
  }, []);

  async function updateBlocked(row: AssignmentTemplateRow, blocked: boolean) {
    if (!accessToken) return;
    setActionLoading(true);
    setActionRowId(row.id);
    try {
      const res = await fetch("/api/admin/master-data/assignments", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [row.id],
          blocked,
          reason: blocked ? blockReason.trim() : "",
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to update assignment");
      toast.success(blocked ? "Assignment blocked" : "Assignment unblocked");
      setBlockTarget(null);
      setBlockReason("");
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update assignment");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  async function approveMarketplace(row: AssignmentTemplateRow) {
    if (!accessToken) return;
    setActionLoading(true);
    setActionRowId(row.id);
    try {
      const res = await fetch("/api/admin/master-data/assignments", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [row.id],
          action: "approveMarketplace",
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to publish assignment");
      toast.success("Assignment is now visible in marketplace");
      const refreshed = await fetchDetail(row);
      setActive(refreshed);
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish assignment");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  async function removeFromMarketplace(row: AssignmentTemplateRow) {
    if (!accessToken) return;
    setActionLoading(true);
    setActionRowId(row.id);
    try {
      const res = await fetch("/api/admin/master-data/assignments", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [row.id],
          action: "removeFromMarketplace",
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to remove assignment");
      toast.success("Assignment removed from marketplace");
      const refreshed = await fetchDetail(row);
      setActive(refreshed);
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove assignment");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  const isAlreadyInherited = useCallback((row: AssignmentTemplateRow) => (
    !isPlatformAdmin &&
    assignmentView === "marketplace" &&
    Boolean(row.inherited_by_institution_name)
  ), [assignmentView, isPlatformAdmin]);

  const canInheritAssignment = useCallback((row: AssignmentTemplateRow) => (
    !isPlatformAdmin &&
    assignmentView === "marketplace" &&
    row.is_public &&
    row.is_active &&
    !row.blocked_by_platform &&
    !isAlreadyInherited(row)
  ), [assignmentView, isAlreadyInherited, isPlatformAdmin]);

  async function inheritAssignments(assignments: AssignmentTemplateRow[], resetSelection?: () => void) {
    if (!accessToken) return;
    const effectiveInstId =
      activeInstitutionId ??
      (user?.memberships?.[0]?.institution_id ? Number(user.memberships[0].institution_id) : null) ??
      ((user as any)?.institution_id ? Number((user as any).institution_id) : null);

    if (!effectiveInstId) {
      toast.error("Select an institution from the sidebar first");
      return;
    }
    const inheritableAssignments = assignments.filter(canInheritAssignment);
    if (inheritableAssignments.length === 0) {
      toast.info("Selected assignments are already inherited.");
      return;
    }
    setActionLoading(true);
    setActionRowId(inheritableAssignments.length === 1 ? inheritableAssignments[0].id : null);
    try {
      await Promise.all(inheritableAssignments.map(async (assignment) => {
        const res = await fetch(
          `/api/admin/master-data/assignments/${assignment.id}/inherit`,
          {
            method: "POST",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ institution_id: effectiveInstId }),
          }
        );
        const json = await readJson(res);
        if (!res.ok) throw new Error(json.error ?? "Failed to inherit assignment");
      }));
      toast.success(`${inheritableAssignments.length} assignment${inheritableAssignments.length === 1 ? "" : "s"} inherited`);
      resetSelection?.();
      setAssignmentView("my");
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to inherit assignment");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  async function deleteAssignments(assignments: AssignmentTemplateRow[], resetSelection?: () => void) {
    if (!accessToken || assignments.length === 0) return;
    const confirmed = window.confirm(
      `Delete ${assignments.length} selected assignment${assignments.length === 1 ? "" : "s"}?`
    );
    if (!confirmed) return;
    setActionLoading(true);
    setActionRowId(assignments.length === 1 ? assignments[0].id : null);
    try {
      await Promise.all(assignments.map(async (assignment) => {
        const res = await fetch(
          `/api/admin/master-data/assignments/${assignment.id}`,
          { method: "DELETE", headers: authHeaders() }
        );
        const json = await readJson(res);
        if (!res.ok) throw new Error(json.error ?? "Failed to delete assignment");
      }));
      toast.success(`${assignments.length} assignment${assignments.length === 1 ? "" : "s"} deleted`);
      resetSelection?.();
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete assignment");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  async function deleteAssignment() {
    if (!accessToken || !deleteTarget) return;
    setActionLoading(true);
    setActionRowId(deleteTarget.id);
    try {
      const res = await fetch(
        `/api/admin/master-data/assignments/${deleteTarget.id}`,
        { method: "DELETE", headers: authHeaders() }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to delete assignment");
      toast.success("Assignment deleted");
      setDeleteTarget(null);
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete assignment");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  const columns = useMemo<ColumnDef<AssignmentTemplateRow>[]>(() => {
    const marketplaceMode = assignmentView === "marketplace" && !isPlatformAdmin;
    const columns: ColumnDef<AssignmentTemplateRow>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
            aria-label="Select all assignments"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            aria-label={`Select ${row.original.title}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "subject_name",
        header: "Subject / Course",
        cell: ({ row }) => {
          const assignment = row.original;
          const displaySubject = assignment.subject_name || "General Subject";
          const displayProgram = assignment.target_program_label || "";
          return (
            <button
              type="button"
              className="min-w-[220px] cursor-pointer text-left py-1"
              onClick={() => void openDetail(assignment)}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground hover:underline">
                  {displaySubject}
                </span>
                {assignment.is_public && (
                  <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[10px]">
                    Marketplace
                  </Badge>
                )}
              </div>
              {displayProgram && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {displayProgram}
                </p>
              )}
              {assignment.description && (
                <p className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-0.5">
                  {assignment.description}
                </p>
              )}
            </button>
          );
        },
      },
      ...(!isPlatformAdmin
        ? [
            {
              id: "assigned",
              header: "Assigned",
              cell: ({ row }: { row: { original: AssignmentTemplateRow } }) => {
                const assignment = row.original;
                const studentCount = assignment.assigned_student_count ?? 0;
                const assignCount = assignment.assigned_count ?? (assignment.assigned_assignment_id ? 1 : 0);
                const hasAssigned = studentCount > 0 || assignCount > 0;

                if (!hasAssigned) {
                  return (
                    <div className="flex items-center gap-1.5 py-1">
                      {!marketplaceMode && !assignment.blocked_by_platform ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1.5 font-medium px-2 rounded-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignTarget(assignment);
                            setAssignDialogOpen(true);
                          }}
                        >
                          <Send className="size-3 text-primary" />
                          <span>Assign</span>
                        </Button>
                      ) : (
                        <Badge variant="outline" className="border-dashed text-[11px] text-muted-foreground font-normal py-0.5">
                          Not assigned
                        </Badge>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="flex items-center gap-1.5 py-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-semibold gap-1.5 px-2.5 rounded-md cursor-pointer transition-colors shadow-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssignedRecordsTarget(assignment);
                        setAssignedRecordsOpen(true);
                      }}
                    >
                      <Users className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Assigned({studentCount > 0 ? studentCount : assignCount})</span>
                    </Button>
                  </div>
                );
              },
            } as ColumnDef<AssignmentTemplateRow>,
          ]
        : []),
      {
        accessorKey: "syllabus_data",
        header: "Syllabus",
        cell: ({ row }) => {
          const summary = getSyllabusSummary(row.original.syllabus_data);
          if (!summary || (summary.units.length === 0 && summary.chapters.length === 0)) {
            return <span className="text-xs text-muted-foreground">-</span>;
          }
          return (
            <div className="flex flex-wrap gap-1 max-w-[220px]">
              {summary.units.slice(0, 2).map((u, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                  {u}
                </Badge>
              ))}
              {summary.units.length > 2 && (
                <span className="text-[10px] text-muted-foreground font-medium">+{summary.units.length - 2} more</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "question_count",
        header: "Questions",
        cell: ({ row }) => {
          const count = row.original.question_count ?? 0;
          return (
            <Badge variant="outline" className="bg-muted/40 font-mono text-xs">
              {count} {count === 1 ? "question" : "questions"}
            </Badge>
          );
        },
      },
      {
        id: "pricing",
        header: "Pricing",
        cell: ({ row }) => {
          const isPaid = Boolean((row.original as any).is_paid || (Number((row.original as any).price) > 0));
          const price = Number((row.original as any).price) || 0;
          return isPaid ? (
            <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 font-bold text-xs">
              ₹{price}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-bold text-xs">
              Free
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const assignment = row.original;
          const isRowActionLoading = actionRowId === assignment.id;
          const canEdit =
            isPlatformAdmin ||
            (!marketplaceMode &&
              !assignment.blocked_by_platform &&
              hasPermission(user, "content.assignments.edit", {
                institutionId: assignment.source_institution_id,
              }));
          const canDelete =
            isPlatformAdmin ||
            (!marketplaceMode &&
              !assignment.blocked_by_platform &&
              hasPermission(user, "content.assignments.delete", {
                institutionId: assignment.source_institution_id,
              }));
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" disabled={isRowActionLoading}>
                  {isRowActionLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="size-4" />
                  )}
                  <span className="sr-only">Assignment actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-max min-w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                {!marketplaceMode && !isPlatformAdmin && !assignment.blocked_by_platform && (
                  <DropdownMenuItem
                    className="whitespace-nowrap font-bold text-primary focus:text-primary focus:bg-primary/10 cursor-pointer"
                    onClick={() => {
                      setAssignTarget(assignment);
                      setAssignDialogOpen(true);
                    }}
                  >
                    <Send className="size-4 text-primary" />
                    Assign Now
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="whitespace-nowrap cursor-pointer"
                  onClick={() => void openDetail(assignment)}
                >
                  <Eye className="size-4" />
                  View sheet
                </DropdownMenuItem>
                {!marketplaceMode && (isPlatformAdmin || !assignment.blocked_by_platform) && (
                  <DropdownMenuItem
                    className="whitespace-nowrap"
                    onClick={() => openQuestionEditor(assignment)}
                  >
                    <Plus className="size-4" />
                    {(assignment.question_count ?? 0) > 0 ? "Manage Questions" : "Add Questions"}
                  </DropdownMenuItem>
                )}
                {isPlatformAdmin ? (
                  <>
                    <DropdownMenuItem
                      className="whitespace-nowrap"
                      onClick={() => void openEdit(assignment)}
                    >
                      <Pencil className="size-4" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="whitespace-nowrap text-destructive"
                      onClick={() => setDeleteTarget(assignment)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {assignment.marketplace_requested &&
                      !assignment.is_public &&
                      !assignment.blocked_by_platform && (
                        <DropdownMenuItem
                          className="whitespace-nowrap"
                          onClick={() => void approveMarketplace(assignment)}
                        >
                          <Plus className="size-4" />
                          Show in public
                        </DropdownMenuItem>
                      )}
                    {assignment.is_public && (
                      <DropdownMenuItem
                        className="whitespace-nowrap"
                        onClick={() => void removeFromMarketplace(assignment)}
                      >
                        <Ban className="size-4" />
                        Remove from marketplace
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="whitespace-nowrap"
                      onClick={() => {
                        setBlockReason(assignment.block_reason ?? "");
                        if (assignment.blocked_by_platform) {
                          void updateBlocked(assignment, false);
                        } else {
                          setBlockTarget(assignment);
                        }
                      }}
                    >
                      <Ban className="size-4" />
                      {assignment.blocked_by_platform ? "Unblock" : "Block"}
                    </DropdownMenuItem>
                  </>
                ) : marketplaceMode ? (
                  <>
                    <DropdownMenuSeparator />
                    {isAlreadyInherited(assignment) ? (
                      <DropdownMenuItem className="whitespace-nowrap" disabled>
                        Already inherited
                      </DropdownMenuItem>
                    ) : assignment.is_paid && Number(assignment.price) > 0 ? (
                      <DropdownMenuItem
                        className="whitespace-nowrap font-medium text-emerald-600"
                        disabled={actionLoading}
                        onClick={() => setPurchaseTarget(assignment)}
                      >
                        <Plus className="size-4" />
                        Buy & Inherit (₹{assignment.price})
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="whitespace-nowrap"
                        disabled={actionLoading}
                        onClick={() => void inheritAssignments([assignment])}
                      >
                        <Plus className="size-4" />
                        Inherit Free
                      </DropdownMenuItem>
                    )}
                  </>
                ) : assignment.blocked_by_platform ? (
                      <DropdownMenuItem disabled>
                        <ShieldAlert className="size-4" />
                        Blocked by Platform Admin
                      </DropdownMenuItem>
                ) : (
                  <>
                    {canEdit && (
                      <DropdownMenuItem onClick={() => void openEdit(assignment)}>
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="whitespace-nowrap text-destructive"
                          onClick={() => setDeleteTarget(assignment)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];
    return columns;
  // updateBlocked is intentionally read from the current render so the action uses
  // the latest block reason without rebuilding the complete column definition.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    actionLoading,
    actionRowId,
    activeInstitutionId,
    assignmentView,
    blockReason,
    canInheritAssignment,
    isAlreadyInherited,
    isPlatformAdmin,
    openDetail,
    openEdit,
    user,
  ]);

  if (!isReady) {
    return <div className="text-muted-foreground">Loading assignments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">
            {isPlatformAdmin
              ? "Review institution assignments and block unsafe content."
              : "Create reusable assignments with objective and subjective questions."}
          </p>
        </div>
        <Button
          onClick={() => {
            if (assignmentView !== "my") {
              setAssignmentView("my");
            }
            setEditing(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add Assignment
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-wrap">
        {!isPlatformAdmin ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={assignmentView === "my" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setAssignmentView("my");
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            >
              My Assignments
            </Button>
            <Button
              type="button"
              variant={assignmentView === "marketplace" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setAssignmentView("marketplace");
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            >
              Marketplace
            </Button>
          </div>
        ) : (
          <div />
        )}

        {/* Filter Toolbar: Class/Program, Subject, Syllabus */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Class / Program Filter */}
          <Select
            value={filterProgramId || "all"}
            onValueChange={(val) => {
              setFilterProgramId(val === "all" ? "" : val);
              setFilterSubject("");
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
          >
            <SelectTrigger className="h-9 w-[180px] sm:w-[210px] text-xs">
              <GraduationCap className="size-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Courses / Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses / Classes</SelectItem>
              {programsList.map((p) => (
                <SelectItem key={String(p.id)} value={String(p.id)}>
                  {p.title || p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Subject Filter */}
          <Select
            value={filterSubject || "all"}
            onValueChange={(val) => {
              setFilterSubject(val === "all" ? "" : val);
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
          >
            <SelectTrigger className="h-9 w-[150px] sm:w-[180px] text-xs">
              <BookMarked className="size-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {availableSubjects.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Syllabus Topic Filter */}
          <div className="relative">
            <Input
              value={filterSyllabus}
              onChange={(e) => {
                setFilterSyllabus(e.target.value);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
              placeholder="Filter syllabus topic..."
              className="h-9 w-[160px] sm:w-[190px] text-xs pl-8 pr-7"
            />
            <BookOpen className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            {filterSyllabus && (
              <button
                type="button"
                onClick={() => {
                  setFilterSyllabus("");
                  setPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
                className="absolute right-2 top-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 text-xs text-muted-foreground hover:text-destructive gap-1 px-2.5"
            >
              <X className="size-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Assignments" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Blocked" value={stats.blocked} />
        <StatCard label="Questions" value={stats.questions} />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyText="No assignments found."
        manualPagination
        pageCount={pageCount}
        totalRows={totalRows}
        pagination={pagination}
        onPaginationChange={setPagination}
        getRowId={(row) => String(row.id)}
        selectionResetKey={`${assignmentView}:${debouncedSearch}:${filterProgramId}:${filterSubject}:${debouncedSyllabus}:${pagination.pageSize}:${activeInstitutionId ?? ""}`}
        enableRowSelection={(row) =>
          !isPlatformAdmin &&
          (assignmentView === "my" || canInheritAssignment(row.original))
        }
        onRowClick={(row) => void openDetail(row)}
        toolbarLeft={
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search assignments or institutions..."
            className="w-full sm:w-80"
          />
        }
        toolbarRight={
          <Button type="button" variant="ghost" size="icon" onClick={() => void fetchRows()}>
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
            <span className="sr-only">Refresh assignments</span>
          </Button>
        }
        selectedActions={(selectedRows, resetSelection) => {
          if (assignmentView === "marketplace") {
            const inheritableRows = selectedRows.filter(canInheritAssignment);
            return (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={actionLoading || inheritableRows.length === 0}
                onClick={() => void inheritAssignments(inheritableRows, resetSelection)}
              >
                {actionLoading && <Loader2 className="size-4 animate-spin" />}
                {inheritableRows.length === 0 ? "Already inherited" : "Inherit selected"}
              </Button>
            );
          }
          const deletableRows = selectedRows.filter((assignment) =>
            !assignment.blocked_by_platform &&
            hasPermission(user, "content.assignments.delete", {
              institutionId: assignment.source_institution_id,
            })
          );
          return (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={actionLoading || deletableRows.length === 0}
              onClick={() => void deleteAssignments(deletableRows, resetSelection)}
            >
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          );
        }}
      />

      <AssignmentTemplateEditor
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditing(null);
        }}
        accessToken={accessToken}
        template={editing}
        fetchInstitutions={fetchInstitutions}
        onSaved={() => void fetchRows()}
      />

      {questionTemplate && (
        <AssignmentQuestionEditor
          open={questionEditorOpen}
          onOpenChange={(open) => {
            setQuestionEditorOpen(open);
            if (!open) setQuestionTemplate(null);
          }}
          accessToken={accessToken}
          template={questionTemplate}
          onSaved={async () => {
            await fetchRows();
            try {
              const refreshed = await fetchDetail(questionTemplate);
              setActive(refreshed);
              setDetailOpen(Boolean(refreshed));
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to refresh assignment"
              );
            }
          }}
        />
      )}

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent
          className="flex w-full flex-col gap-0 overflow-hidden p-0"
          resizable
          defaultSize={720}
          minSize={420}
          maxSize={1040}
          resizeStorageKey="assignment-detail-sheet-width"
        >
          <SheetHeader className="border-b px-6 py-4 pr-12 flex flex-row items-center justify-between space-y-0">
            <div>
              <SheetTitle>{active?.title ?? "Assignment"}</SheetTitle>
              <SheetDescription className="text-xs">
                {active?.subject_name || "General"} • {active?.question_count ?? active?.questions?.length ?? 0} questions
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              {(isPlatformAdmin || (assignmentView === "my" && !active?.blocked_by_platform)) && active && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    setEditing(active);
                    setEditorOpen(true);
                  }}
                >
                  <Pencil className="size-3.5" />
                  Edit Details
                </Button>
              )}
              {!isPlatformAdmin && assignmentView === "my" && active && !active.blocked_by_platform && (
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground font-bold gap-1.5 shadow-sm"
                  onClick={() => {
                    setAssignTarget(active);
                    setAssignDialogOpen(true);
                  }}
                >
                  <Send className="size-3.5" />
                  Assign Now
                </Button>
              )}
            </div>
            {!isPlatformAdmin && assignmentView === "marketplace" && active && (
              <div>
                {isAlreadyInherited(active) ? (
                  <Badge variant="outline" className="border-emerald-500/80 bg-emerald-500/10 text-emerald-600 font-medium">
                    Already Inherited
                  </Badge>
                ) : active.is_paid && Number(active.price) > 0 ? (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    disabled={actionLoading}
                    onClick={() => setPurchaseTarget(active)}
                  >
                    <Plus className="size-4" />
                    Pay ₹{active.price} & Inherit
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    disabled={actionLoading}
                    onClick={() => void inheritAssignments([active])}
                  >
                    <Plus className="size-4" />
                    Inherit Free
                  </Button>
                )}
              </div>
            )}
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {detailLoading ? (
              <div className="flex min-h-52 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading assignment...
              </div>
            ) : active ? (
              <div className="space-y-6">
                {active.blocked_by_platform && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive">
                    <div className="flex items-center gap-2 font-semibold">
                      <ShieldAlert className="size-4" />
                      Blocked by Platform Admin
                    </div>
                    {active.block_reason && (
                      <p className="mt-2 text-sm">{active.block_reason}</p>
                    )}
                  </div>
                )}
                {isPlatformAdmin &&
                  active.marketplace_requested &&
                  !active.is_public &&
                  !active.blocked_by_platform && (
                    <div className="flex flex-col gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-amber-700 dark:text-amber-300">
                          Action required
                        </p>
                        <p className="text-sm text-muted-foreground">
                          This institution requested marketplace visibility.
                        </p>
                      </div>
                      <Button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => void approveMarketplace(active)}
                      >
                        {actionLoading && <Loader2 className="size-4 animate-spin" />}
                        Show in public
                      </Button>
                    </div>
                  )}
                {isPlatformAdmin && active.is_public && !active.blocked_by_platform && (
                  <div className="flex flex-col gap-3 rounded-md border border-sky-500/40 bg-sky-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-sky-700 dark:text-sky-300">
                        Visible in marketplace
                      </p>
                      <p className="text-sm text-muted-foreground">
                        You can remove this assignment from the public marketplace anytime.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={actionLoading}
                      onClick={() => void removeFromMarketplace(active)}
                    >
                      {actionLoading && <Loader2 className="size-4 animate-spin" />}
                      Remove from marketplace
                    </Button>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">Total Marks</p>
                    <p className="mt-1 text-xl font-semibold">
                      {Number(active.total_marks).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">Questions</p>
                    <p className="mt-1 text-xl font-semibold">
                      {active.questions?.length ?? active.question_count}
                    </p>
                  </div>
                </div>
                {active.description && (
                  <div>
                    <h2 className="font-semibold">Description</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {active.description}
                    </p>
                  </div>
                )}
                <section className="space-y-3">
                  <div>
                    <h2 className="font-semibold">Syllabus Mapping</h2>
                    <p className="text-sm text-muted-foreground">
                      Curriculum topics and syllabus units linked to this assignment.
                    </p>
                  </div>
                  {active.subject_name && (
                    <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3.5 py-2 text-primary font-medium text-sm">
                      <span className="text-xs text-muted-foreground">Subject:</span>
                      <span className="font-bold">{active.subject_name}</span>
                    </div>
                  )}
                  {Array.isArray(active.syllabus_data) && active.syllabus_data.length > 0 ? (
                    <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
                      {active.syllabus_data.map((unit: any, uIdx: number) => (
                        <div key={unit.id ?? uIdx} className="rounded-md border bg-card p-3">
                          <p className="font-semibold text-sm flex items-center gap-2">
                            <span className="flex size-5 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold">
                              {unit.unit_number ?? uIdx + 1}
                            </span>
                            {unit.title}
                          </p>
                          {Array.isArray(unit.chapters) && unit.chapters.length > 0 && (
                            <div className="mt-2 ml-7 pl-3 border-l space-y-2">
                              {unit.chapters.map((chapter: any, cIdx: number) => (
                                <div key={chapter.id ?? cIdx} className="space-y-1">
                                  <p className="text-xs font-medium text-foreground">
                                    • {chapter.title}
                                  </p>
                                  {Array.isArray(chapter.lessons) && chapter.lessons.length > 0 && (
                                    <div className="ml-4 space-y-0.5">
                                      {chapter.lessons.map((lesson: any, lIdx: number) => (
                                        <p key={lesson.id ?? lIdx} className="text-[11px] text-muted-foreground">
                                          - {lesson.title}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
                      No specific syllabus units mapped to this assignment.
                    </div>
                  )}
                </section>
                <section className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-semibold">Questions</h2>
                      <p className="text-sm text-muted-foreground">
                        Add questions after the assignment details have been saved.
                      </p>
                    </div>
                    {(!active.blocked_by_platform || isPlatformAdmin) &&
                      (isPlatformAdmin ||
                        hasPermission(user, "content.assignments.edit", {
                          institutionId: active.source_institution_id,
                        })) && (
                        <Button
                          type="button"
                          onClick={() => openQuestionEditor(active)}
                        >
                          <Plus className="size-4" />
                          {(active.questions?.length ?? active.question_count) > 0
                            ? "Manage Questions"
                            : "Add Questions"}
                        </Button>
                      )}
                  </div>
                  {(active.questions?.length ?? 0) === 0 && (
                    <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                      No questions have been added yet.
                    </div>
                  )}
                  {(active.questions ?? []).map((question, index) => (
                    <div key={question.id ?? index} className="rounded-md border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">
                            {index + 1}. {question.question_text}
                          </p>
                          <p className="mt-1 text-xs capitalize text-muted-foreground">
                            {question.question_type.replace("_", " ")}
                          </p>
                        </div>
                        <Badge variant="outline">{Number(question.marks).toFixed(2)} marks</Badge>
                      </div>
                      {question.files.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {question.files.map((file, fileIndex) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={file.id ?? fileIndex}
                              src={file.url}
                              alt={`Question ${index + 1} attachment ${fileIndex + 1}`}
                              className="size-20 rounded-md border object-cover"
                            />
                          ))}
                        </div>
                      )}
                      {question.options.length > 0 && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {question.options.map((option, optionIndex) => (
                            <div
                              key={option.id ?? optionIndex}
                              className={`rounded-md border px-3 py-2 text-sm ${
                                option.is_correct
                                  ? "border-emerald-500/40 bg-emerald-500/10"
                                  : ""
                              }`}
                            >
                              {option.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(blockTarget)} onOpenChange={(open) => !open && setBlockTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Assignment</DialogTitle>
            <DialogDescription>
              The institution will still see this assignment, but editing and deletion will be disabled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={blockReason}
              onChange={(event) => setBlockReason(event.target.value)}
              placeholder="Explain why this assignment is blocked"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockTarget(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading || !blockReason.trim()}
              onClick={() => blockTarget && void updateBlocked(blockTarget, true)}
            >
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              Block Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assignment?</DialogTitle>
            <DialogDescription>
              This permanently removes the assignment and all of its questions and images.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void deleteAssignment()} disabled={actionLoading}>
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(purchaseTarget)} onOpenChange={(open) => !open && setPurchaseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase & Inherit Assignment</DialogTitle>
            <DialogDescription>
              This assignment is a premium marketplace resource. Confirm purchase to inherit it into your institution library.
            </DialogDescription>
          </DialogHeader>
          {purchaseTarget && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-foreground">{purchaseTarget.title}</p>
                    <p className="text-xs text-muted-foreground">{purchaseTarget.subject_name || "General"}</p>
                  </div>
                  <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-600 font-bold text-sm">
                    ₹{Number(purchaseTarget.price) || 0}
                  </Badge>
                </div>
                {purchaseTarget.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{purchaseTarget.description}</p>
                )}
              </div>
              <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300">
                Note: This payment of ₹{Number(purchaseTarget.price) || 0} will grant your institution full access to this assignment and its questions.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseTarget(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              disabled={actionLoading}
              onClick={async () => {
                if (!purchaseTarget) return;
                const target = purchaseTarget;
                setPurchaseTarget(null);
                await inheritAssignments([target]);
              }}
            >
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              Pay ₹{Number(purchaseTarget?.price) || 0} & Inherit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssignAssignmentDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        assignment={assignTarget}
        activeInstitutionId={activeInstitutionId}
        onAssigned={() => void fetchRows()}
      />

      <AssignedRecordsDialog
        open={assignedRecordsOpen}
        onOpenChange={setAssignedRecordsOpen}
        assignmentId={assignedRecordsTarget?.id ?? null}
        assignmentTitle={assignedRecordsTarget?.title}
        activeInstitutionId={activeInstitutionId}
        onOpenAssignDialog={() => {
          if (assignedRecordsTarget) {
            setAssignTarget(assignedRecordsTarget);
            setAssignDialogOpen(true);
          }
        }}
      />
    </div>
  );
}
