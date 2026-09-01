"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  ArrowLeft,
  Ban,
  Eye,
  FileImage,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ExamQuestionEditor } from "@/components/exams/exam-question-editor";
import { ExamEditor } from "@/components/exams/exam-editor";
import type { ExamInstitutionOption } from "@/components/exams/exam-editor";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { DatePicker } from "@/components/shared/date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { ExamRow, ExamSeriesRow } from "@/lib/types/exam";
import { useAuthStore } from "@/store";

type Stats = { total: number; active: number; blocked: number; questions: number };
type ExamView = "my" | "marketplace";
type TargetType = "INSTITUTION" | "PROGRAM" | "SECTION" | "STUDENT";
type ProgramOption = { id: number; title: string };
type SectionOption = { id: number; name: string };
type StudentOption = {
  id: number;
  name: string;
  email?: string | null;
  admission_number?: string | null;
};

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

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: string | null | undefined) {
  if (!value) return "-";
  return String(value).slice(0, 5);
}

function formatMode(value: string | null | undefined) {
  if (!value) return "-";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getSubjectName(exam: ExamRow) {
  return exam.syllabus_nodes?.[0]?.subject_name ?? exam.title;
}

export default function ExamsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const [rows, setRows] = useState<Array<ExamRow | ExamSeriesRow>>([]);
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
  const [examView, setExamView] = useState<ExamView>("my");
  const [canCreate, setCanCreate] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [seriesEditorOpen, setSeriesEditorOpen] = useState(false);
  const [seriesTitle, setSeriesTitle] = useState("");
  const [seriesDescription, setSeriesDescription] = useState("");
  const [seriesFromDate, setSeriesFromDate] = useState("");
  const [seriesToDate, setSeriesToDate] = useState("");
  const [seriesTargetType, setSeriesTargetType] = useState<TargetType>("INSTITUTION");
  const [seriesProgramId, setSeriesProgramId] = useState("");
  const [seriesProgramName, setSeriesProgramName] = useState("");
  const [seriesSectionId, setSeriesSectionId] = useState("");
  const [seriesStudentId, setSeriesStudentId] = useState("");
  const [seriesStudentName, setSeriesStudentName] = useState("");
  const [seriesSections, setSeriesSections] = useState<SectionOption[]>([]);
  const [seriesProgramLoading, setSeriesProgramLoading] = useState(false);
  const [seriesInstantResult, setSeriesInstantResult] = useState(true);
  const [seriesResultDate, setSeriesResultDate] = useState("");
  const [seriesIsPublic, setSeriesIsPublic] = useState(false);
  const [seriesActive, setSeriesActive] = useState(false);
  const [editingSeries, setEditingSeries] = useState<ExamSeriesRow | null>(null);
  const [editing, setEditing] = useState<ExamRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [active, setActive] = useState<ExamRow | null>(null);
  const [activeSeries, setActiveSeries] = useState<ExamSeriesRow | null>(null);
  const [returnSeries, setReturnSeries] = useState<ExamSeriesRow | null>(null);
  const [seriesSubjects, setSeriesSubjects] = useState<ExamRow[]>([]);
  const [seriesManagerLoading, setSeriesManagerLoading] = useState(false);
  const [questionEditorOpen, setQuestionEditorOpen] = useState(false);
  const [questionTemplate, setQuestionTemplate] =
    useState<ExamRow | null>(null);
  const [blockTarget, setBlockTarget] = useState<ExamRow | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [publishTarget, setPublishTarget] = useState<ExamRow | null>(null);
  const [actionRowId, setActionRowId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExamRow | null>(null);

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const fetchRows = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search: debouncedSearch,
        view: examView,
      });
      if (!isPlatformAdmin && activeInstitutionId) {
        params.set("institutionId", String(activeInstitutionId));
      }
      const res = await fetch(
        `/api/admin/master-data/exams?${params.toString()}`,
        { headers: authHeaders() }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch exams");
      setRows(json.data ?? []);
      setStats(json.stats ?? emptyStats);
      setPageCount(json.pageCount ?? -1);
      setTotalRows(Number(json.total ?? 0));
      setCanCreate(Boolean(json.capabilities?.canCreate));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch exams");
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    activeInstitutionId,
    authHeaders,
    debouncedSearch,
    isPlatformAdmin,
    pagination.pageIndex,
    pagination.pageSize,
    examView,
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
      `/api/admin/master-data/exams?${params.toString()}`,
      { headers: authHeaders() }
    );
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to fetch institutions");
    return {
      data: (json.data ?? []) as ExamInstitutionOption[],
      hasMore: page < Number(json.pageCount ?? 0),
    };
  }, [accessToken, authHeaders]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void fetchRows(), 0);
    return () => window.clearTimeout(timeout);
  }, [fetchRows, isReady]);

  useEffect(() => {
    if (!seriesEditorOpen || !seriesProgramId) return;
    const timeout = window.setTimeout(() => {
      void loadSeriesProgramDetail(seriesProgramId);
    }, 0);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesEditorOpen, seriesProgramId]);

  const fetchDetail = useCallback(
    async (row: ExamRow) => {
      if (!accessToken) return null;
      const res = await fetch(`/api/admin/master-data/exams/${row.id}`, {
        headers: authHeaders(),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch exam");
      return json.data as ExamRow;
    },
    [accessToken, authHeaders]
  );

  const openDetail = useCallback(
    async (row: ExamRow, options?: { keepSeries?: boolean }) => {
      const seriesToReturn = options?.keepSeries ? activeSeries : null;
      setActive(row);
      setReturnSeries(seriesToReturn);
      setActiveSeries(null);
      setDetailOpen(true);
      setDetailLoading(true);
      try {
        setActive(await fetchDetail(row));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to fetch exam");
      } finally {
        setDetailLoading(false);
      }
    },
    [activeSeries, fetchDetail]
  );

  const fetchSeriesSubjects = useCallback(
    async (series: ExamSeriesRow) => {
      if (!accessToken) return [] as ExamRow[];
      const params = new URLSearchParams({
        action: "series-subjects",
        seriesId: String(series.id),
      });
      const res = await fetch(`/api/admin/master-data/exams?${params.toString()}`, {
        headers: authHeaders(),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load subjects");
      const subjects = (json.data ?? []) as ExamRow[];
      setSeriesSubjects(subjects);
      return subjects;
    },
    [accessToken, authHeaders]
  );

  const openSeriesManager = useCallback(
    async (series: ExamSeriesRow) => {
      setActiveSeries(series);
      setEditing(null);
      setSeriesManagerLoading(true);
      setEditorOpen(true);
      try {
        await fetchSeriesSubjects(series);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load subjects");
      } finally {
        setSeriesManagerLoading(false);
      }
    },
    [fetchSeriesSubjects]
  );

  const openSeriesDetail = useCallback(
    async (series: ExamSeriesRow) => {
      setActive(null);
      setReturnSeries(null);
      setActiveSeries(series);
      setSeriesSubjects(series.subjects ?? []);
      setDetailOpen(true);
      setDetailLoading(true);
      try {
        await fetchSeriesSubjects(series);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load subjects");
      } finally {
        setDetailLoading(false);
      }
    },
    [fetchSeriesSubjects]
  );

  const openEdit = useCallback(
    async (row: ExamRow) => {
      try {
        const detail = await fetchDetail(row);
        setEditing(detail);
        setEditorOpen(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to fetch exam");
      }
    },
    [fetchDetail]
  );

  const openQuestionEditor = useCallback((exam: ExamRow) => {
    setQuestionTemplate(exam);
    setDetailOpen(false);
    setQuestionEditorOpen(true);
  }, []);

  async function updateBlocked(row: ExamRow, blocked: boolean) {
    if (!accessToken) return;
    setActionLoading(true);
    setActionRowId(row.id);
    try {
      const res = await fetch("/api/admin/master-data/exams", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [row.id],
          blocked,
          reason: blocked ? blockReason.trim() : "",
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to update exam");
      toast.success(blocked ? "Exam blocked" : "Exam unblocked");
      setBlockTarget(null);
      setBlockReason("");
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update exam");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  async function approveMarketplace(row: ExamRow) {
    if (!accessToken) return;
    setActionLoading(true);
    setActionRowId(row.id);
    try {
      const res = await fetch("/api/admin/master-data/exams", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [row.id],
          action: "approveMarketplace",
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to publish exam");
      toast.success("Exam is now visible in marketplace");
      const refreshed = await fetchDetail(row);
      setActive(refreshed);
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish exam");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  async function removeFromMarketplace(row: ExamRow) {
    if (!accessToken) return;
    setActionLoading(true);
    setActionRowId(row.id);
    try {
      const res = await fetch("/api/admin/master-data/exams", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [row.id],
          action: "removeFromMarketplace",
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to remove exam");
      toast.success("Exam removed from marketplace");
      const refreshed = await fetchDetail(row);
      setActive(refreshed);
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove exam");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  async function approveMarketplaceSeries(row: ExamSeriesRow) {
    if (!accessToken) return;
    setActionLoading(true);
    setActionRowId(row.id);
    try {
      const res = await fetch("/api/admin/master-data/exams", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          record_type: "series",
          ids: [row.id],
          action: "approveMarketplace",
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to publish exam");
      toast.success("Exam is now visible in marketplace");
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish exam");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  async function approveMarketplaceSeriesRows(rowsToApprove: ExamSeriesRow[], resetSelection?: () => void) {
    if (!accessToken || rowsToApprove.length === 0) return;
    setActionLoading(true);
    setActionRowId(null);
    try {
      const res = await fetch("/api/admin/master-data/exams", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          record_type: "series",
          ids: rowsToApprove.map((row) => row.id),
          action: "approveMarketplace",
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to publish exams");
      toast.success(`${rowsToApprove.length} exam${rowsToApprove.length === 1 ? "" : "s"} now visible in marketplace`);
      resetSelection?.();
      if (activeSeries && rowsToApprove.some((row) => row.id === activeSeries.id)) {
        setActiveSeries({ ...activeSeries, marketplace_requested: false });
      }
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish exams");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  async function inheritExam(row: ExamRow) {
    if (!accessToken) return;
    const effectiveInstId =
      activeInstitutionId ??
      (user?.memberships?.[0]?.institution_id ? Number(user.memberships[0].institution_id) : null) ??
      ((user as any)?.institution_id ? Number((user as any).institution_id) : null);

    if (!effectiveInstId) {
      toast.error("Select an institution from the sidebar first");
      return;
    }
    setActionLoading(true);
    setActionRowId(row.id);
    try {
      const res = await fetch(
        `/api/admin/master-data/exams/${row.id}/inherit`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ institution_id: effectiveInstId }),
        }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to inherit exam");
      toast.success(
        json.data?.existing
          ? "Exam already exists in your institution"
          : "Exam inherited into your institution"
      );
      setExamView("my");
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to inherit exam");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  async function deleteExam() {
    if (!accessToken || !deleteTarget) return;
    setActionLoading(true);
    setActionRowId(deleteTarget.id);
    try {
      const res = await fetch(
        `/api/admin/master-data/exams/${deleteTarget.id}`,
        { method: "DELETE", headers: authHeaders() }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to delete exam");
      toast.success("Exam deleted");
      const deletedExam = deleteTarget;
      setDeleteTarget(null);
      await fetchRows();
      if (
        activeSeries &&
        deletedExam.exam_series_id &&
        deletedExam.exam_series_id === activeSeries.id
      ) {
        await fetchSeriesSubjects(activeSeries);
      }
      if (active?.id === deletedExam.id) {
        setActive(null);
        if (returnSeries) {
          setActiveSeries(returnSeries);
          setReturnSeries(null);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete exam");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  const isAlreadyInheritedSeries = useCallback((series: ExamSeriesRow) => (
    !isPlatformAdmin &&
    examView === "marketplace" &&
    Boolean(series.inherited_by_institution_name)
  ), [examView, isPlatformAdmin]);

  const canInheritSeries = useCallback((series: ExamSeriesRow) => (
    !isPlatformAdmin &&
    examView === "marketplace" &&
    series.is_active &&
    !isAlreadyInheritedSeries(series)
  ), [examView, isAlreadyInheritedSeries, isPlatformAdmin]);

  async function inheritSeriesRows(seriesRows: ExamSeriesRow[], resetSelection?: () => void) {
    if (!accessToken) return;
    const effectiveInstId =
      activeInstitutionId ??
      (user?.memberships?.[0]?.institution_id ? Number(user.memberships[0].institution_id) : null) ??
      ((user as any)?.institution_id ? Number((user as any).institution_id) : null);

    if (!effectiveInstId) {
      toast.error("Select an institution from the sidebar first");
      return;
    }
    const inheritableSeriesRows = seriesRows.filter(canInheritSeries);
    if (inheritableSeriesRows.length === 0) {
      toast.info("Selected exams are already inherited.");
      return;
    }
    setActionLoading(true);
    setActionRowId(inheritableSeriesRows.length === 1 ? inheritableSeriesRows[0].id : null);
    try {
      await Promise.all(inheritableSeriesRows.map(async (series) => {
        const params = new URLSearchParams({
          action: "series-subjects",
          seriesId: String(series.id),
        });
        const subjectsRes = await fetch(`/api/admin/master-data/exams?${params.toString()}`, {
          headers: authHeaders(),
        });
        const subjectsJson = await readJson(subjectsRes);
        if (!subjectsRes.ok) {
          throw new Error(subjectsJson.error ?? "Failed to load marketplace subjects");
        }
        const subjects = (subjectsJson.data ?? []) as ExamRow[];
        if (subjects.length === 0) throw new Error("No subject papers are available");
        await Promise.all(subjects.map(async (subject) => {
          const res = await fetch(`/api/admin/master-data/exams/${subject.id}/inherit`, {
            method: "POST",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ institution_id: activeInstitutionId }),
          });
          const json = await readJson(res);
          if (!res.ok) throw new Error(json.error ?? "Failed to inherit exam");
        }));
      }));
      toast.success(`${inheritableSeriesRows.length} exam${inheritableSeriesRows.length === 1 ? "" : "s"} inherited`);
      resetSelection?.();
      setExamView("my");
      setPagination((current) => ({ ...current, pageIndex: 0 }));
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to inherit exam");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  async function inheritSeries(series: ExamSeriesRow) {
    await inheritSeriesRows([series]);
  }

  async function deleteSeriesRows(seriesRows: ExamSeriesRow[], resetSelection?: () => void) {
    if (!accessToken || seriesRows.length === 0) return;
    const deletableRows = seriesRows.filter((series) =>
      hasPermission(user, "content.exams.delete", {
        institutionId: series.source_institution_id,
      })
    );
    if (deletableRows.length === 0) {
      toast.error("You don't have permission to delete the selected exams");
      return;
    }
    const confirmed = window.confirm(
      `Delete ${deletableRows.length} selected exam${deletableRows.length === 1 ? "" : "s"}?`
    );
    if (!confirmed) return;
    setActionLoading(true);
    setActionRowId(deletableRows.length === 1 ? deletableRows[0].id : null);
    try {
      const res = await fetch("/api/admin/master-data/exams", {
        method: "DELETE",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ ids: deletableRows.map((series) => series.id) }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to delete exams");
      toast.success(`${deletableRows.length} exam${deletableRows.length === 1 ? "" : "s"} deleted`);
      resetSelection?.();
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete exams");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  function resetSeriesEditor(series: ExamSeriesRow | null = null) {
    setEditingSeries(series);
    setSeriesTitle(series?.title ?? "");
    setSeriesDescription(series?.description ?? "");
    setSeriesFromDate(String(series?.from_date ?? "").slice(0, 10));
    setSeriesToDate(String(series?.to_date ?? "").slice(0, 10));
    setSeriesTargetType((series?.target_type as TargetType | null) ?? "INSTITUTION");
    setSeriesProgramId(
      series?.target_type === "PROGRAM"
        ? String(series.target_id ?? "")
        : series?.target_type === "SECTION" || series?.target_type === "STUDENT"
          ? String(series.target_program_id ?? "")
          : ""
    );
    setSeriesProgramName(series?.target_program_label ?? "");
    setSeriesSectionId(series?.target_type === "SECTION" ? String(series.target_id ?? "") : "");
    setSeriesStudentId(series?.target_type === "STUDENT" ? String(series.target_id ?? "") : "");
    setSeriesStudentName(series?.target_type === "STUDENT" ? series.target_label ?? "" : "");
    setSeriesSections([]);
    setSeriesInstantResult(series?.instant_result ?? true);
    setSeriesResultDate(String(series?.result_date ?? "").slice(0, 10));
    setSeriesIsPublic(Boolean(series?.marketplace_requested));
    setSeriesActive(series?.is_active ?? false);
  }

  async function fetchPrograms(searchValue: string, page: number) {
    if (!accessToken || !activeInstitutionId) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      page: String(page),
      limit: "15",
      search: searchValue,
      institutionId: String(activeInstitutionId),
    });
    const res = await fetch(`/api/admin/institutions/programs?${params.toString()}`, {
      headers: authHeaders(),
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to load classes");
    return {
      data: (json.data ?? []) as ProgramOption[],
      hasMore: page < Number(json.pageCount ?? 0),
    };
  }

  async function loadSeriesProgramDetail(id: string) {
    if (!accessToken || !id) {
      setSeriesSections([]);
      return;
    }
    setSeriesProgramLoading(true);
    try {
      const res = await fetch(`/api/admin/institutions/programs/${id}`, {
        headers: authHeaders(),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load class");
      setSeriesSections(
        (json.data?.section_ids ?? []).map((value: number, index: number) => ({
          id: value,
          name: json.data?.section_names?.[index] ?? `Section ${value}`,
        }))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load class");
    } finally {
      setSeriesProgramLoading(false);
    }
  }

  async function fetchSeriesStudents(searchValue: string, page: number) {
    if (!accessToken || !activeInstitutionId) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      action: "students",
      institutionId: String(activeInstitutionId),
      programId: seriesProgramId,
      sectionId: seriesSectionId,
      page: String(page),
      limit: "15",
      search: searchValue,
    });
    const res = await fetch(`/api/admin/master-data/exams?${params.toString()}`, {
      headers: authHeaders(),
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to load students");
    return {
      data: (json.data ?? []) as StudentOption[],
      hasMore: page < Number(json.pageCount ?? 0),
    };
  }

  async function saveSeries() {
    if (!accessToken) return;
    if (!seriesTitle.trim()) return toast.error("Exam name is required");
    if (!seriesFromDate) return toast.error("From date is required");
    if (!seriesToDate) return toast.error("To date is required");
    if (seriesToDate < seriesFromDate) {
      return toast.error("To date cannot be before from date");
    }
    if (!seriesInstantResult && !seriesResultDate) {
      return toast.error("Result date is required");
    }
    if (!seriesInstantResult && seriesResultDate < seriesToDate) {
      return toast.error("Result date cannot be before exam end date");
    }
    const effectiveInstId =
      activeInstitutionId ??
      (user?.memberships?.[0]?.institution_id ? Number(user.memberships[0].institution_id) : null) ??
      ((user as any)?.institution_id ? Number((user as any).institution_id) : null);

    if (!effectiveInstId) {
      return toast.error("Select an institution from the sidebar first");
    }
    const targetId =
      seriesTargetType === "INSTITUTION"
        ? effectiveInstId
        : seriesTargetType === "PROGRAM"
          ? Number(seriesProgramId)
          : seriesTargetType === "SECTION"
            ? Number(seriesSectionId)
            : Number(seriesStudentId);
    if (!targetId) return toast.error("Exam target is required");
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/master-data/exams", {
        method: editingSeries ? "PATCH" : "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          record_type: "series",
          id: editingSeries?.id,
          title: seriesTitle.trim(),
          description: seriesDescription.trim(),
          from_date: seriesFromDate,
          to_date: seriesToDate,
          source_institution_id: activeInstitutionId,
          target_type: seriesTargetType,
          target_id: targetId,
          target_program_id:
            seriesTargetType === "SECTION" || seriesTargetType === "STUDENT"
              ? Number(seriesProgramId)
              : null,
          instant_result: seriesInstantResult,
          result_date: seriesInstantResult ? null : seriesResultDate,
          is_public: seriesIsPublic,
          is_active: seriesActive,
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to create exam");
      toast.success(editingSeries ? "Exam updated" : "Exam created");
      setSeriesEditorOpen(false);
      resetSeriesEditor(null);
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create exam");
    } finally {
      setActionLoading(false);
    }
  }

  const columns = useMemo<ColumnDef<ExamRow | ExamSeriesRow>[]>(() => {
    const marketplaceMode = examView === "marketplace" && !isPlatformAdmin;
    {
      const seriesColumns: ColumnDef<ExamRow | ExamSeriesRow>[] = [
        {
          id: "select",
          header: ({ table }) => (
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
              aria-label="Select all exams"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
              aria-label="Select exam"
            />
          ),
          enableSorting: false,
          enableHiding: false,
          size: 32,
        },
        {
          accessorKey: "title",
          header: "Exam",
          cell: ({ row }) => {
            const series = row.original as ExamSeriesRow;
            const alreadyInheritedRow = isAlreadyInheritedSeries(series);
            const inheritedLabel = alreadyInheritedRow
              ? "Already inherited"
              : examView === "my" && series.has_inherited_subjects
                ? "Inherited from Marketplace"
                : null;
            return (
              <button
                type="button"
                className="min-w-[300px] cursor-pointer text-left"
                onClick={() => void openSeriesDetail(series)}
              >
                <span className="block font-semibold">{series.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {series.institution_name}
                </span>
                {inheritedLabel && (
                  <span className="mt-1 flex min-w-0">
                    <Badge variant="outline" className={`max-w-full ${inheritedBadgeClass}`}>
                      <span className="truncate">{inheritedLabel}</span>
                    </Badge>
                  </span>
                )}
                {!isPlatformAdmin &&
                  examView === "my" &&
                  series.marketplace_requested &&
                  !series.marketplace_approved && (
                  <span className="mt-1 inline-flex items-center rounded-full border border-amber-500/60 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                    Approval pending
                  </span>
                )}
                {!isPlatformAdmin && examView === "my" && series.marketplace_approved && (
                  <span className="mt-1 inline-flex items-center rounded-full border border-emerald-500/70 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    Approved for marketplace
                  </span>
                )}
                {isPlatformAdmin && series.marketplace_requested && (
                  <span className="mt-1 inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                    Action required
                  </span>
                )}
              </button>
            );
          },
        },
        {
          accessorKey: "from_date",
          header: "Exam Period",
          cell: ({ row }) => {
            const series = row.original as ExamSeriesRow;
            return (
              <div className="whitespace-nowrap">
                <p>{formatDate(series.from_date)}</p>
                <p className="text-xs text-muted-foreground">to {formatDate(series.to_date)}</p>
              </div>
            );
          },
        },
        {
          accessorKey: "subject_count",
          header: "Classes & Subjects",
          cell: ({ row }) => {
            const series = row.original as ExamSeriesRow;
            return `${series.subject_count} subject paper${series.subject_count === 1 ? "" : "s"}`;
          },
        },
        {
          accessorKey: "question_count",
          header: "Questions",
        },
        {
          accessorKey: "is_active",
          header: "Status",
          cell: ({ row }) => {
            const series = row.original as ExamSeriesRow;
            return (
              <Badge
                className={
                  series.is_active
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : ""
                }
                variant={series.is_active ? "secondary" : "outline"}
              >
                {series.is_active ? "Active" : "Disabled"}
              </Badge>
            );
          },
        },
        {
          id: "actions",
          header: "Actions",
          cell: ({ row }) => {
            const series = row.original as ExamSeriesRow;
            const isRowActionLoading = actionRowId === series.id;
            const canAddSubject =
              !isPlatformAdmin &&
              !marketplaceMode &&
              hasPermission(user, "content.exams.create", {
                institutionId: series.source_institution_id,
              });
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" disabled={isRowActionLoading}>
                    {isRowActionLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <MoreHorizontal className="size-4" />
                    )}
                    <span className="sr-only">Exam actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => void openSeriesDetail(series)}>
                    <Eye className="size-4" />
                    View sheet
                  </DropdownMenuItem>
                  {isPlatformAdmin ? (
                    <>
                      <DropdownMenuSeparator />
                      {series.marketplace_requested && (
                        <DropdownMenuItem
                          className="whitespace-nowrap"
                          disabled={actionLoading}
                          onClick={() => void approveMarketplaceSeries(series)}
                        >
                          <Plus className="size-4" />
                          Show in public
                        </DropdownMenuItem>
                      )}
                    </>
                  ) : !marketplaceMode && (
                    <DropdownMenuItem
                      onClick={() => {
                        resetSeriesEditor(series);
                        setSeriesEditorOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canAddSubject && (
                    <DropdownMenuItem
                      onClick={() => void openSeriesManager(series)}
                    >
                      <Pencil className="size-4" />
                      Manage
                    </DropdownMenuItem>
                  )}
                  {marketplaceMode && (
                    isAlreadyInheritedSeries(series) ? (
                      <DropdownMenuItem disabled>
                        <Badge variant="outline" className={inheritedBadgeClass}>
                          Already inherited
                        </Badge>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        disabled={actionLoading}
                        onClick={() => void inheritSeries(series)}
                      >
                        <Plus className="size-4" />
                        Inherit all subjects
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          },
        },
      ];
      return seriesColumns;
    }
    const columns: ColumnDef<ExamRow | ExamSeriesRow>[] = [
      {
        accessorKey: "title",
        header: "Exam",
        cell: ({ row }) => (
          <button
            type="button"
            className="min-w-[280px] text-left"
            onClick={() => void openDetail(row.original as ExamRow)}
          >
            <span className="block font-semibold">{(row.original as ExamRow).title}</span>
            <span className="block text-xs text-muted-foreground">
              {(row.original as ExamRow).target_label ?? "No target"}
            </span>
            {(row.original as ExamRow).blocked_by_platform && (
              <span className="mt-1 inline-flex items-center gap-1 text-xs text-destructive">
                <ShieldAlert className="size-3" />
                Blocked by Platform Admin
              </span>
            )}
            {(row.original as ExamRow).marketplace_requested &&
              !(row.original as ExamRow).is_public &&
              !(row.original as ExamRow).blocked_by_platform && (
                <span className="mt-1 inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  {isPlatformAdmin ? "Action required" : "Marketplace approval pending"}
                </span>
              )}
            {(row.original as ExamRow).is_public && (
              <span className="mt-1 inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
                Marketplace
              </span>
            )}
          </button>
        ),
      },
      {
        accessorKey: "total_marks",
        header: "Marks",
        cell: ({ row }) => Number((row.original as ExamRow).total_marks).toFixed(2),
      },
      {
        accessorKey: "exam_date",
        header: "Date",
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <p>{formatDate((row.original as ExamRow).exam_date)}</p>
            <p className="text-xs text-muted-foreground">{formatTime((row.original as ExamRow).exam_time)}</p>
          </div>
        ),
      },
      {
        accessorKey: "duration_minutes",
        header: "Duration",
        cell: ({ row }) => `${(row.original as ExamRow).duration_minutes ?? 0} min`,
      },
      {
        accessorKey: "exam_mode",
        header: "Mode",
        cell: ({ row }) => formatMode((row.original as ExamRow).exam_mode),
      },
      {
        accessorKey: "question_count",
        header: "Questions",
      },
      {
        accessorKey: "attachment_count",
        header: "Images",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <FileImage className="size-4" />
            {(row.original as ExamRow).attachment_count}
          </span>
        ),
      },
      {
        accessorKey: "version",
        header: "Version",
        cell: ({ row }) => <Badge variant="outline">v{(row.original as ExamRow).version}</Badge>,
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) =>
          (row.original as ExamRow).blocked_by_platform ? (
            <Badge variant="destructive">Blocked</Badge>
          ) : (
            <Badge
              className={
                (row.original as ExamRow).is_active
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : ""
              }
              variant={(row.original as ExamRow).is_active ? "secondary" : "outline"}
            >
              {(row.original as ExamRow).is_active ? "Active" : "Disabled"}
            </Badge>
          ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const exam = row.original as ExamRow;
          const isRowActionLoading = actionRowId === exam.id;
          const canEdit =
            !isPlatformAdmin &&
            !marketplaceMode &&
            !exam.blocked_by_platform &&
            hasPermission(user, "content.exams.edit", {
              institutionId: exam.source_institution_id,
            });
          const canDelete =
            !isPlatformAdmin &&
            !marketplaceMode &&
            !exam.blocked_by_platform &&
            hasPermission(user, "content.exams.delete", {
              institutionId: exam.source_institution_id,
            });
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" disabled={isRowActionLoading}>
                  {isRowActionLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="size-4" />
                  )}
                  <span className="sr-only">Exam actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-max min-w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  className="whitespace-nowrap"
                  onClick={() => void openDetail(exam)}
                >
                  <Eye className="size-4" />
                  View sheet
                </DropdownMenuItem>
                {isPlatformAdmin ? (
                  <>
                    <DropdownMenuSeparator />
                    {exam.marketplace_requested &&
                      !exam.is_public &&
                      !exam.blocked_by_platform && (
                        <DropdownMenuItem
                          className="whitespace-nowrap"
                          onClick={() => void approveMarketplace(exam)}
                        >
                          <Plus className="size-4" />
                          Show in public
                        </DropdownMenuItem>
                      )}
                    {exam.is_public && (
                      <DropdownMenuItem
                        className="whitespace-nowrap"
                        onClick={() => void removeFromMarketplace(exam)}
                      >
                        <Ban className="size-4" />
                        Remove from marketplace
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="whitespace-nowrap"
                      onClick={() => {
                        setBlockReason(exam.block_reason ?? "");
                        if (exam.blocked_by_platform) {
                          void updateBlocked(exam, false);
                        } else {
                          setBlockTarget(exam);
                        }
                      }}
                    >
                      <Ban className="size-4" />
                      {exam.blocked_by_platform ? "Unblock" : "Block"}
                    </DropdownMenuItem>
                  </>
                ) : marketplaceMode ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="whitespace-nowrap"
                      disabled={actionLoading}
                      onClick={() => void inheritExam(exam)}
                    >
                      <Plus className="size-4" />
                      Inherit
                    </DropdownMenuItem>
                  </>
                ) : exam.blocked_by_platform ? (
                  <DropdownMenuItem disabled>
                    <ShieldAlert className="size-4" />
                    Blocked by Platform Admin
                  </DropdownMenuItem>
                ) : (
                  <>
                    {canEdit && (
                      <DropdownMenuItem onClick={() => void openEdit(exam)}>
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(exam)}
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
    blockReason,
    isPlatformAdmin,
    openDetail,
    openEdit,
    openSeriesManager,
    examView,
    user,
  ]);
  const seriesSubjectDates = useMemo(
    () =>
      seriesSubjects
        .map((subject) =>
          subject.exam_date
            ? { date: subject.exam_date, label: getSubjectName(subject) }
            : null
        )
        .filter(Boolean) as Array<{ date: string; label: string }>,
    [seriesSubjects]
  );

  if (!isReady) {
    return <div className="text-muted-foreground">Loading exams...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exams</h1>
          <p className="text-muted-foreground">
            {isPlatformAdmin
              ? "Review institution exams and block unsafe content."
              : "Create scheduled exams with targets, marketplace sharing, and result controls."}
          </p>
        </div>
        <Button
          onClick={() => {
            if (examView !== "my") {
              setExamView("my");
            }
            setEditing(null);
            setActiveSeries(null);
            setEditorOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add Exam
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={examView === "my" ? "default" : "outline"}
          onClick={() => {
            setExamView("my");
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
        >
          {isPlatformAdmin ? "All Exams" : "My Exams"}
        </Button>
        <Button
          type="button"
          variant={examView === "marketplace" ? "default" : "outline"}
          onClick={() => {
            setExamView("marketplace");
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
        >
          Marketplace
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Exams" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Blocked" value={stats.blocked} />
        <StatCard label="Questions" value={stats.questions} />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyText="No exams found."
        totalRows={totalRows}
        manualPagination
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        getRowId={(row) => `${isPlatformAdmin ? "exam" : "series"}-${row.id}`}
        selectionResetKey={`${examView}:${debouncedSearch}:${pagination.pageSize}:${activeInstitutionId ?? ""}`}
        enableRowSelection={(row) => {
          const series = row.original as ExamSeriesRow;
          if (isPlatformAdmin) return Boolean(series.marketplace_requested);
          return examView === "my" || canInheritSeries(series);
        }}
        onRowClick={(row) => {
          if (isPlatformAdmin) {
            void openSeriesDetail(row as ExamSeriesRow);
          } else {
            void openSeriesDetail(row as ExamSeriesRow);
          }
        }}
        selectedActions={(selectedRows, resetSelection) => {
          if (isPlatformAdmin) {
            const publishableRows = selectedRows
              .map((row) => row as ExamSeriesRow)
              .filter((series) => series.marketplace_requested);
            return (
              <Button
                type="button"
                variant="outline"
                disabled={actionLoading || publishableRows.length === 0}
                onClick={() => void approveMarketplaceSeriesRows(publishableRows, resetSelection)}
              >
                {actionLoading && <Loader2 className="size-4 animate-spin" />}
                Show selected in public
              </Button>
            );
          }
          if (examView === "my") {
            const deletableRows = selectedRows
              .map((row) => row as ExamSeriesRow)
              .filter((series) =>
                hasPermission(user, "content.exams.delete", {
                  institutionId: series.source_institution_id,
                })
              );
            return (
              <Button
                type="button"
                variant="destructive"
                disabled={actionLoading || deletableRows.length === 0}
                onClick={() => void deleteSeriesRows(deletableRows, resetSelection)}
              >
                {actionLoading && <Loader2 className="size-4 animate-spin" />}
                Delete
              </Button>
            );
          }
          const inheritableRows = selectedRows
            .map((row) => row as ExamSeriesRow)
            .filter(canInheritSeries);
          return (
            <Button
              type="button"
              variant="outline"
              disabled={actionLoading || inheritableRows.length === 0}
              onClick={() => void inheritSeriesRows(inheritableRows, resetSelection)}
            >
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              {inheritableRows.length === 0 ? "Already inherited" : "Inherit selected"}
            </Button>
          );
        }}
        toolbarLeft={
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search exams or institutions..."
            className="w-full sm:w-80"
          />
        }
        toolbarRight={
          <Button type="button" variant="ghost" size="icon" onClick={() => void fetchRows()}>
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
            <span className="sr-only">Refresh exams</span>
          </Button>
        }
      />

      {!isPlatformAdmin && (
        <ExamEditor
          open={editorOpen}
          onOpenChange={(open) => {
            setEditorOpen(open);
            if (!open) setEditing(null);
          }}
          accessToken={accessToken}
          template={editing}
          existingSubjects={activeSeries && !editing ? seriesSubjects : []}
          existingSubjectsLoading={seriesManagerLoading}
          seriesId={activeSeries?.id ?? editing?.exam_series_id ?? null}
          seriesTitle={activeSeries?.title ?? null}
          seriesFromDate={activeSeries?.from_date ?? null}
          seriesToDate={activeSeries?.to_date ?? null}
          seriesTargetType={(activeSeries?.target_type as TargetType | null) ?? null}
          seriesTargetId={activeSeries?.target_id ?? null}
          seriesTargetProgramId={activeSeries?.target_program_id ?? null}
          seriesTargetLabel={activeSeries?.target_label ?? null}
          seriesResultDate={activeSeries?.result_date ?? null}
          seriesInstantResult={activeSeries?.instant_result}
          seriesIsPublic={activeSeries?.marketplace_requested}
          seriesIsActive={activeSeries?.is_active}
          fetchInstitutions={fetchInstitutions}
          onSaved={async () => {
            await fetchRows();
            if (activeSeries) await fetchSeriesSubjects(activeSeries);
          }}
        />
      )}

      {!isPlatformAdmin && (
        <Dialog open={seriesEditorOpen} onOpenChange={setSeriesEditorOpen}>
          <DialogContent className="max-w-4xl sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSeries ? "Edit Exam" : "Add Exam"}</DialogTitle>
              <DialogDescription>
                Create the main exam structure first. Subject papers are added from its sheet.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>
                  Exam Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={seriesTitle}
                  onChange={(event) => setSeriesTitle(event.target.value)}
                  placeholder="Term-1 Exam"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={seriesDescription}
                  onChange={(event) => setSeriesDescription(event.target.value)}
                  className="min-h-24"
                  placeholder="Optional exam notes"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    From Date <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    value={seriesFromDate}
                    onChange={(value) => {
                      setSeriesFromDate(value);
                      if (seriesToDate && value && seriesToDate < value) setSeriesToDate("");
                    }}
                    placeholder="Select from date"
                    markedDates={seriesSubjectDates}
                    rangeStart={seriesFromDate}
                    rangeEnd={seriesToDate}
                    resultDate={seriesInstantResult ? null : seriesResultDate}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    To Date <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    value={seriesToDate}
                    onChange={setSeriesToDate}
                    placeholder="Select to date"
                    markedDates={seriesSubjectDates}
                    rangeStart={seriesFromDate}
                    rangeEnd={seriesToDate}
                    resultDate={seriesInstantResult ? null : seriesResultDate}
                    disabledDates={
                      seriesFromDate
                        ? { before: new Date(`${seriesFromDate}T00:00:00`) }
                        : undefined
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Exam Target <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={seriesTargetType}
                  onValueChange={(value) => {
                    setSeriesTargetType(value as TargetType);
                    setSeriesProgramId("");
                    setSeriesProgramName("");
                    setSeriesSectionId("");
                    setSeriesStudentId("");
                    setSeriesStudentName("");
                    setSeriesSections([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INSTITUTION">Whole Institution</SelectItem>
                    <SelectItem value="PROGRAM">Class / Program</SelectItem>
                    <SelectItem value="SECTION">Section</SelectItem>
                    <SelectItem value="STUDENT">Particular Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {seriesTargetType !== "INSTITUTION" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>
                      Class / Program <span className="text-destructive">*</span>
                    </Label>
                    <AsyncSearchPopover<ProgramOption>
                      value={seriesProgramId}
                      selectedLabel={seriesProgramName}
                      onChange={(value) => {
                        setSeriesProgramId(value);
                        setSeriesProgramName("");
                        setSeriesSectionId("");
                        setSeriesStudentId("");
                        setSeriesStudentName("");
                        if (value) void loadSeriesProgramDetail(value);
                        else setSeriesSections([]);
                      }}
                      onSelectItem={(program) => setSeriesProgramName(program.title)}
                      fetcher={fetchPrograms}
                      getValue={(program) => String(program.id)}
                      getLabel={(program) => program.title}
                      placeholder="Select class..."
                      searchPlaceholder="Search classes..."
                      emptyText="No classes found"
                    />
                  </div>
                  {(seriesTargetType === "SECTION" || seriesTargetType === "STUDENT") && (
                    <div className="space-y-2">
                      <Label>
                        Section <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={seriesSectionId}
                        onValueChange={(value) => {
                          setSeriesSectionId(value);
                          setSeriesStudentId("");
                          setSeriesStudentName("");
                        }}
                        disabled={!seriesProgramId || seriesProgramLoading || seriesSections.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              seriesProgramLoading ? "Loading sections..." : "Select section..."
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {seriesSections.map((section) => (
                            <SelectItem key={section.id} value={String(section.id)}>
                              {section.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {seriesTargetType === "STUDENT" && (
                    <div className="space-y-2 sm:col-span-2">
                      <Label>
                        Student <span className="text-destructive">*</span>
                      </Label>
                      <AsyncSearchPopover<StudentOption>
                        value={seriesStudentId}
                        selectedLabel={seriesStudentName}
                        onChange={(value) => {
                          setSeriesStudentId(value);
                          if (!value) setSeriesStudentName("");
                        }}
                        onSelectItem={(student) => setSeriesStudentName(student.name)}
                        fetcher={fetchSeriesStudents}
                        getValue={(student) => String(student.id)}
                        getLabel={(student) => student.name}
                        placeholder={seriesSectionId ? "Select student..." : "Select section first"}
                        searchPlaceholder="Search students..."
                        emptyText="No students found"
                        disabled={!seriesProgramId || !seriesSectionId}
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-2 pt-8 text-sm">
                  <Checkbox
                    checked={seriesInstantResult}
                    onCheckedChange={(value) => {
                      const checked = Boolean(value);
                      setSeriesInstantResult(checked);
                      if (checked) setSeriesResultDate("");
                    }}
                  />
                  Instant result declare
                </label>
                {!seriesInstantResult && (
                  <div className="space-y-2">
                    <Label>
                      Result Date <span className="text-destructive">*</span>
                    </Label>
                    <DatePicker
                      value={seriesResultDate}
                      onChange={setSeriesResultDate}
                      placeholder="Select result date"
                      markedDates={seriesSubjectDates}
                      rangeStart={seriesFromDate}
                      rangeEnd={seriesToDate}
                      resultDate={seriesResultDate}
                      disabledDates={
                        seriesToDate
                          ? { before: new Date(`${seriesToDate}T00:00:00`) }
                          : undefined
                      }
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-5">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={seriesIsPublic}
                    onCheckedChange={(value) => setSeriesIsPublic(Boolean(value))}
                  />
                  Request marketplace review
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={seriesActive}
                    onCheckedChange={(value) => setSeriesActive(Boolean(value))}
                  />
                  Active
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSeriesEditorOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => void saveSeries()} disabled={actionLoading}>
                {actionLoading && <Loader2 className="size-4 animate-spin" />}
                {editingSeries ? "Save Changes" : "Save Exam"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {!isPlatformAdmin && questionTemplate && (
        <ExamQuestionEditor
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
                  : "Failed to refresh exam"
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
          resizeStorageKey="practice-exam-detail-sheet-width"
        >
          <SheetHeader className="border-b px-6 py-5 pr-16">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <SheetTitle>{activeSeries?.title ?? active?.title ?? "Exam"}</SheetTitle>
                <SheetDescription>
              {activeSeries
                ? `${activeSeries.institution_name ?? "Institution"} · ${formatDate(activeSeries.from_date)} to ${formatDate(activeSeries.to_date)}`
                : active
                ? active.institution_name ?? "Exam questions and details"
                : "Exam questions and details"}
                </SheetDescription>
              </div>
              {isPlatformAdmin && activeSeries?.marketplace_requested && (
                <Button
                  type="button"
                  className="shrink-0 whitespace-nowrap"
                  disabled={actionLoading}
                  onClick={() => void approveMarketplaceSeries(activeSeries)}
                >
                  {actionLoading && actionRowId === activeSeries.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Show in public
                </Button>
              )}
            </div>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {detailLoading ? (
              <div className="flex min-h-52 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading exam...
              </div>
            ) : activeSeries ? (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">Exam Slug</p>
                    <p className="mt-1 break-all font-semibold">{activeSeries.slug}</p>
                  </div>
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">From Date</p>
                    <p className="mt-1 font-semibold">{formatDate(activeSeries.from_date)}</p>
                  </div>
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">To Date</p>
                    <p className="mt-1 font-semibold">{formatDate(activeSeries.to_date)}</p>
                  </div>
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">Result Date</p>
                    <p className="mt-1 font-semibold">
                      {activeSeries.instant_result ? "Instant" : formatDate(activeSeries.result_date)}
                    </p>
                  </div>
                </div>
                {activeSeries.description && (
                  <div>
                    <h2 className="font-semibold">Description</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {activeSeries.description}
                    </p>
                  </div>
                )}
                <section className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-semibold">Class-wise Subject Papers</h2>
                      <p className="text-sm text-muted-foreground">
                        Add each subject paper inside this exam structure.
                      </p>
                    </div>
                    {examView === "my" &&
                      hasPermission(user, "content.exams.create", {
                        institutionId: activeSeries.source_institution_id,
                      }) && (
                        <Button
                          type="button"
                          onClick={() => void openSeriesManager(activeSeries)}
                        >
                          <Pencil className="size-4" />
                          Manage
                        </Button>
                      )}
                  </div>
                  {seriesSubjects.length === 0 ? (
                    <div className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                      No subject papers added yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(
                        seriesSubjects.reduce<Record<string, ExamRow[]>>((groups, exam) => {
                          const key = exam.target_label ?? "No target";
                          groups[key] = [...(groups[key] ?? []), exam];
                          return groups;
                        }, {})
                      ).map(([target, exams]) => (
                        <div key={target} className="rounded-md border">
                          <div className="border-b bg-muted/20 px-4 py-3">
                            <p className="font-semibold">{target}</p>
                          </div>
                          <div className="grid gap-3 p-4 md:grid-cols-2">
                            {exams.map((exam) => {
                              const canManageSubject =
                                examView === "my" &&
                                !exam.blocked_by_platform &&
                                hasPermission(user, "content.exams.edit", {
                                  institutionId: exam.source_institution_id,
                                });
                              const canDeleteSubject =
                                examView === "my" &&
                                !exam.blocked_by_platform &&
                                hasPermission(user, "content.exams.delete", {
                                  institutionId: exam.source_institution_id,
                                });
                              return (
                              <div
                                key={exam.id}
                                role="button"
                                tabIndex={0}
                                className="cursor-pointer rounded-md border p-4 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                onClick={() => void openDetail(exam, { keepSeries: true })}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    void openDetail(exam, { keepSeries: true });
                                  }
                                }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold">{getSubjectName(exam)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(exam.exam_date)} · {formatTime(exam.exam_time)} · {formatMode(exam.exam_mode)}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                    <Badge
                                      variant={exam.blocked_by_platform ? "destructive" : "outline"}
                                    >
                                      {exam.blocked_by_platform ? "Blocked" : `${exam.question_count} Q`}
                                    </Badge>
                                    {(canManageSubject || canDeleteSubject) && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-8"
                                            onClick={(event) => event.stopPropagation()}
                                            onKeyDown={(event) => event.stopPropagation()}
                                          >
                                            <MoreHorizontal className="size-4" />
                                            <span className="sr-only">Subject actions</span>
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                          align="end"
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                          {canManageSubject && (
                                            <DropdownMenuItem onClick={() => void openEdit(exam)}>
                                              <Pencil className="size-4" />
                                              Edit
                                            </DropdownMenuItem>
                                          )}
                                          {canDeleteSubject && (
                                            <>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => setDeleteTarget(exam)}
                                              >
                                                <Trash2 className="size-4" />
                                                Delete
                                              </DropdownMenuItem>
                                            </>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                  <span className="text-muted-foreground">Marks</span>
                                  <span className="font-medium">{Number(exam.total_marks).toFixed(2)}</span>
                                  <span className="text-muted-foreground">Duration</span>
                                  <span className="font-medium">{exam.duration_minutes ?? 0} min</span>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ) : active ? (
              <div className="space-y-6">
                {returnSeries && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setActive(null);
                      setActiveSeries(returnSeries);
                      setReturnSeries(null);
                    }}
                  >
                    <ArrowLeft className="size-4" />
                    Back to {returnSeries.title}
                  </Button>
                )}
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
                        onClick={() => setPublishTarget(active)}
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
                        You can remove this exam from the public marketplace anytime.
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
                <div className="grid gap-3 sm:grid-cols-3">
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
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">Version</p>
                    <p className="mt-1 text-xl font-semibold">v{active.version}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">Target</p>
                    <p className="mt-1 font-semibold">
                      {active.target_label ?? "No target"}
                    </p>
                  </div>
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="mt-1 font-semibold">
                      {active.duration_minutes ?? 0} min
                    </p>
                  </div>
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">Mode</p>
                    <p className="mt-1 font-semibold">{formatMode(active.exam_mode)}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">Exam Date</p>
                    <p className="mt-1 font-semibold">{formatDate(active.exam_date)}</p>
                  </div>
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">Exam Time</p>
                    <p className="mt-1 font-semibold">{formatTime(active.exam_time)}</p>
                  </div>
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">Result</p>
                    <p className="mt-1 font-semibold">
                      {active.instant_result ? "Instant" : formatDate(active.result_date)}
                    </p>
                  </div>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-xs text-muted-foreground">Place</p>
                  <p className="mt-1 font-semibold">{active.exam_place ?? "-"}</p>
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
                      Curriculum nodes linked to this exam.
                    </p>
                  </div>
                  {(active.syllabus_nodes?.length ?? 0) > 0 ? (
                    <div className="rounded-md border">
                      <div className="border-b px-4 py-3">
                        <p className="text-sm text-muted-foreground">Subject</p>
                        <p className="font-semibold">
                          {active.syllabus_nodes?.[0]?.subject_name ?? "Mapped syllabus"}
                        </p>
                      </div>
                      <div className="divide-y">
                        {active.syllabus_nodes?.map((node) => (
                          <div key={node.id} className="flex items-center justify-between gap-3 px-4 py-3">
                            <div>
                              <p className="font-medium">{node.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {node.syllabus_title}
                              </p>
                            </div>
                            <Badge variant="outline" className="capitalize">
                              {node.node_type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                      No syllabus nodes mapped.
                    </div>
                  )}
                </section>
                <section className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-semibold">Questions</h2>
                      <p className="text-sm text-muted-foreground">
                        Add questions after the exam details have been saved.
                      </p>
                    </div>
                    {!isPlatformAdmin &&
                      !active.blocked_by_platform &&
                      hasPermission(user, "content.exams.edit", {
                        institutionId: active.source_institution_id,
                      }) && (
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
            <DialogTitle>Block Exam</DialogTitle>
            <DialogDescription>
              The institution will still see this exam, but editing and deletion will be disabled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={blockReason}
              onChange={(event) => setBlockReason(event.target.value)}
              placeholder="Explain why this exam is blocked"
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
              Block Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteTarget?.exam_series_id ? "Delete Subject Paper?" : "Delete Exam?"}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.exam_series_id
                ? "This removes this subject paper from the exam and also deletes its questions and images. Inherited copies in other institutions are independent and will not be deleted."
                : "This permanently removes the exam and all of its questions and images. Inherited copies in other institutions are independent and will not be deleted."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void deleteExam()} disabled={actionLoading}>
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(publishTarget)} onOpenChange={(open) => !open && setPublishTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Expose this exam in marketplace?</AlertDialogTitle>
            <AlertDialogDescription>
              Publishing can make the{" "}
              <span className="font-semibold text-destructive">
                exam paper and questions visible
              </span>{" "}
              to other institutions after the scheduled exam date and time. Verify the
              schedule and questions before continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep private</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target = publishTarget;
                setPublishTarget(null);
                if (target) void approveMarketplace(target);
              }}
            >
              Make public
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExamEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        accessToken={accessToken}
        template={editing}
        existingSubjects={seriesSubjects}
        existingSubjectsLoading={seriesManagerLoading}
        seriesId={activeSeries?.id ?? null}
        seriesTitle={activeSeries?.title ?? null}
        seriesFromDate={activeSeries?.from_date ?? null}
        seriesToDate={activeSeries?.to_date ?? null}
        seriesTargetType={activeSeries?.target_type ?? null}
        seriesTargetId={activeSeries?.target_id ?? null}
        seriesTargetProgramId={activeSeries?.target_program_id ?? null}
        seriesTargetLabel={activeSeries?.target_label ?? null}
        seriesResultDate={activeSeries?.result_date ?? null}
        seriesInstantResult={activeSeries?.instant_result}
        seriesIsPublic={Boolean(activeSeries?.marketplace_approved || activeSeries?.marketplace_requested)}
        seriesIsActive={activeSeries?.is_active}
        fetchInstitutions={fetchInstitutions}
        onSaved={(_id) => {
          void fetchRows();
        }}
      />

      {questionTemplate && (
        <ExamQuestionEditor
          open={questionEditorOpen}
          onOpenChange={setQuestionEditorOpen}
          accessToken={accessToken}
          template={questionTemplate}
          onSaved={() => {
            void fetchRows();
            if (active) void openDetail(active);
          }}
        />
      )}
    </div>
  );
}



