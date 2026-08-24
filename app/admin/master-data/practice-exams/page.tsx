"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  Ban,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PracticeExamQuestionEditor } from "@/components/practice-exams/practice-exam-question-editor";
import { PracticeExamEditor } from "@/components/practice-exams/practice-exam-editor";
import type { PracticeExamInstitutionOption } from "@/components/practice-exams/practice-exam-editor";
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
import type { PracticeExamRow } from "@/lib/types/practice-exam";
import { useAuthStore } from "@/store";

type Stats = { total: number; active: number; blocked: number; questions: number };
type PracticeExamView = "my" | "marketplace";

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

export default function PracticeExamsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const [rows, setRows] = useState<PracticeExamRow[]>([]);
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
  const [practiceExamView, setPracticeExamView] = useState<PracticeExamView>("my");
  const [canCreate, setCanCreate] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PracticeExamRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [active, setActive] = useState<PracticeExamRow | null>(null);
  const [questionEditorOpen, setQuestionEditorOpen] = useState(false);
  const [questionTemplate, setQuestionTemplate] =
    useState<PracticeExamRow | null>(null);
  const [blockTarget, setBlockTarget] = useState<PracticeExamRow | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionRowId, setActionRowId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PracticeExamRow | null>(null);

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
        view: practiceExamView,
      });
      if (!isPlatformAdmin && activeInstitutionId) {
        params.set("institutionId", String(activeInstitutionId));
      }
      const res = await fetch(
        `/api/admin/master-data/practice-exams?${params.toString()}`,
        { headers: authHeaders() }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch practice exams");
      setRows(json.data ?? []);
      setStats(json.stats ?? emptyStats);
      setPageCount(json.pageCount ?? -1);
      setTotalRows(Number(json.total ?? 0));
      setCanCreate(Boolean(json.capabilities?.canCreate));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch practice exams");
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
    practiceExamView,
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
      `/api/admin/master-data/practice-exams?${params.toString()}`,
      { headers: authHeaders() }
    );
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to fetch institutions");
    return {
      data: (json.data ?? []) as PracticeExamInstitutionOption[],
      hasMore: page < Number(json.pageCount ?? 0),
    };
  }, [accessToken, authHeaders]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void fetchRows(), 0);
    return () => window.clearTimeout(timeout);
  }, [fetchRows, isReady]);

  const fetchDetail = useCallback(
    async (row: PracticeExamRow) => {
      if (!accessToken) return null;
      const res = await fetch(`/api/admin/master-data/practice-exams/${row.id}`, {
        headers: authHeaders(),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch practice exam");
      return json.data as PracticeExamRow;
    },
    [accessToken, authHeaders]
  );

  const openDetail = useCallback(
    async (row: PracticeExamRow) => {
      setActive(row);
      setDetailOpen(true);
      setDetailLoading(true);
      try {
        setActive(await fetchDetail(row));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to fetch practice exam");
      } finally {
        setDetailLoading(false);
      }
    },
    [fetchDetail]
  );

  const openEdit = useCallback(
    async (row: PracticeExamRow) => {
      try {
        const detail = await fetchDetail(row);
        setEditing(detail);
        setEditorOpen(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to fetch practice exam");
      }
    },
    [fetchDetail]
  );

  const openQuestionEditor = useCallback((practiceExam: PracticeExamRow) => {
    setQuestionTemplate(practiceExam);
    setDetailOpen(false);
    setQuestionEditorOpen(true);
  }, []);

  async function updateBlocked(row: PracticeExamRow, blocked: boolean) {
    if (!accessToken) return;
    setActionLoading(true);
    setActionRowId(row.id);
    try {
      const res = await fetch("/api/admin/master-data/practice-exams", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [row.id],
          blocked,
          reason: blocked ? blockReason.trim() : "",
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to update practice exam");
      toast.success(blocked ? "Practice Exam blocked" : "Practice Exam unblocked");
      setBlockTarget(null);
      setBlockReason("");
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update practice exam");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  async function approveMarketplace(row: PracticeExamRow) {
    if (!accessToken) return;
    setActionLoading(true);
    setActionRowId(row.id);
    try {
      const res = await fetch("/api/admin/master-data/practice-exams", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [row.id],
          action: "approveMarketplace",
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to publish practice exam");
      toast.success("Practice Exam is now visible in marketplace");
      const refreshed = await fetchDetail(row);
      setActive(refreshed);
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish practice exam");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  async function removeFromMarketplace(row: PracticeExamRow) {
    if (!accessToken) return;
    setActionLoading(true);
    setActionRowId(row.id);
    try {
      const res = await fetch("/api/admin/master-data/practice-exams", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [row.id],
          action: "removeFromMarketplace",
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to remove practice exam");
      toast.success("Practice Exam removed from marketplace");
      const refreshed = await fetchDetail(row);
      setActive(refreshed);
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove practice exam");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  const isAlreadyInherited = useCallback((row: PracticeExamRow) => (
    !isPlatformAdmin &&
    practiceExamView === "marketplace" &&
    Boolean(row.inherited_by_institution_name)
  ), [isPlatformAdmin, practiceExamView]);

  const canInheritPracticeExam = useCallback((row: PracticeExamRow) => (
    !isPlatformAdmin &&
    practiceExamView === "marketplace" &&
    row.is_public &&
    row.is_active &&
    !row.blocked_by_platform &&
    !isAlreadyInherited(row)
  ), [isAlreadyInherited, isPlatformAdmin, practiceExamView]);

  async function inheritPracticeExams(practiceExams: PracticeExamRow[], resetSelection?: () => void) {
    if (!accessToken) return;
    if (!activeInstitutionId) {
      toast.error("Select an institution from the sidebar first");
      return;
    }
    const inheritablePracticeExams = practiceExams.filter(canInheritPracticeExam);
    if (inheritablePracticeExams.length === 0) {
      toast.info("Selected practice exams are already inherited.");
      return;
    }
    setActionLoading(true);
    setActionRowId(inheritablePracticeExams.length === 1 ? inheritablePracticeExams[0].id : null);
    try {
      await Promise.all(inheritablePracticeExams.map(async (practiceExam) => {
        const res = await fetch(
          `/api/admin/master-data/practice-exams/${practiceExam.id}/inherit`,
          {
            method: "POST",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({ institution_id: activeInstitutionId }),
          }
        );
        const json = await readJson(res);
        if (!res.ok) throw new Error(json.error ?? "Failed to inherit practice exam");
      }));
      toast.success(`${inheritablePracticeExams.length} practice exam${inheritablePracticeExams.length === 1 ? "" : "s"} inherited`);
      resetSelection?.();
      setPracticeExamView("my");
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to inherit practice exam");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  async function deletePracticeExams(practiceExams: PracticeExamRow[], resetSelection?: () => void) {
    if (!accessToken || practiceExams.length === 0) return;
    const confirmed = window.confirm(
      `Delete ${practiceExams.length} selected practice exam${practiceExams.length === 1 ? "" : "s"}?`
    );
    if (!confirmed) return;
    setActionLoading(true);
    setActionRowId(practiceExams.length === 1 ? practiceExams[0].id : null);
    try {
      await Promise.all(practiceExams.map(async (practiceExam) => {
        const res = await fetch(
          `/api/admin/master-data/practice-exams/${practiceExam.id}`,
          { method: "DELETE", headers: authHeaders() }
        );
        const json = await readJson(res);
        if (!res.ok) throw new Error(json.error ?? "Failed to delete practice exam");
      }));
      toast.success(`${practiceExams.length} practice exam${practiceExams.length === 1 ? "" : "s"} deleted`);
      resetSelection?.();
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete practice exam");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  async function deletePracticeExam() {
    if (!accessToken || !deleteTarget) return;
    setActionLoading(true);
    setActionRowId(deleteTarget.id);
    try {
      const res = await fetch(
        `/api/admin/master-data/practice-exams/${deleteTarget.id}`,
        { method: "DELETE", headers: authHeaders() }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to delete practice exam");
      toast.success("Practice Exam deleted");
      setDeleteTarget(null);
      await fetchRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete practice exam");
    } finally {
      setActionLoading(false);
      setActionRowId(null);
    }
  }

  const columns = useMemo<ColumnDef<PracticeExamRow>[]>(() => {
    const marketplaceMode = practiceExamView === "marketplace" && !isPlatformAdmin;
    const columns: ColumnDef<PracticeExamRow>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
            aria-label="Select all practice exams"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            aria-label="Select practice exam"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 32,
      },
      {
        accessorKey: "title",
        header: "Practice Exam",
        cell: ({ row }) => {
          const practiceExam = row.original;
          const inheritedLabel = marketplaceMode && practiceExam.inherited_by_institution_name
            ? "Already inherited"
            : practiceExamView === "my" && practiceExam.parent_template_id
              ? `Inherited from ${
                  practiceExam.parent_is_public
                    ? "Marketplace"
                    : practiceExam.parent_institution_name ?? "Institution"
                }`
              : practiceExamView === "my" && practiceExam.is_public
                ? "Approved for marketplace"
              : null;
          const inheritedSource = marketplaceMode && practiceExam.inherited_by_institution_name
            ? practiceExam.inherited_by_institution_name
            : null;

          return (
            <button
              type="button"
              className="min-w-[300px] cursor-pointer text-left"
              onClick={() => void openDetail(practiceExam)}
            >
              <span className="block font-semibold">{practiceExam.title}</span>
              <span className="block text-xs text-muted-foreground">
                {practiceExam.target_label ?? "No target"}
              </span>
              {(inheritedLabel || inheritedSource) && (
                <span className="mt-1 flex min-w-0">
                  {inheritedLabel && (
                    <Badge variant="outline" className={`max-w-full ${inheritedBadgeClass}`}>
                      <span className="truncate">
                        {inheritedLabel}
                        {inheritedSource ? ` Under ${inheritedSource}` : ""}
                      </span>
                    </Badge>
                  )}
                </span>
              )}
              {practiceExam.blocked_by_platform && (
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-destructive">
                  <ShieldAlert className="size-3" />
                  Blocked by Platform Admin
                </span>
              )}
              {practiceExam.marketplace_requested &&
                !practiceExam.is_public &&
                !practiceExam.blocked_by_platform && (
                <span className="mt-1 inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  {isPlatformAdmin ? "Action required" : "Marketplace approval pending"}
                </span>
              )}
              {!inheritedLabel && practiceExam.is_public && (
                <span className="mt-1 inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
                  Marketplace
                </span>
              )}
            </button>
          );
        },
      },
      {
        accessorKey: "version",
        header: "Version",
        cell: ({ row }) => <Badge variant="outline">v{row.original.version}</Badge>,
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) =>
          row.original.blocked_by_platform ? (
            <Badge variant="destructive">Blocked</Badge>
          ) : (
            <Badge
              className={
                row.original.is_active
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : ""
              }
              variant={row.original.is_active ? "secondary" : "outline"}
            >
              {row.original.is_active ? "Active" : "Disabled"}
            </Badge>
          ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const practiceExam = row.original;
          const isRowActionLoading = actionRowId === practiceExam.id;
          const canEdit =
            !isPlatformAdmin &&
            !marketplaceMode &&
            !practiceExam.blocked_by_platform &&
            hasPermission(user, "content.practice_exams.edit", {
              institutionId: practiceExam.source_institution_id,
            });
          const canDelete =
            !isPlatformAdmin &&
            !marketplaceMode &&
            !practiceExam.blocked_by_platform &&
            hasPermission(user, "content.practice_exams.delete", {
              institutionId: practiceExam.source_institution_id,
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
                  <span className="sr-only">Practice Exam actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-max min-w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  className="whitespace-nowrap"
                  onClick={() => void openDetail(practiceExam)}
                >
                  <Eye className="size-4" />
                  View sheet
                </DropdownMenuItem>
                {isPlatformAdmin ? (
                  <>
                    <DropdownMenuSeparator />
                    {practiceExam.marketplace_requested &&
                      !practiceExam.is_public &&
                      !practiceExam.blocked_by_platform && (
                        <DropdownMenuItem
                          className="whitespace-nowrap"
                          onClick={() => void approveMarketplace(practiceExam)}
                        >
                          <Plus className="size-4" />
                          Show in public
                        </DropdownMenuItem>
                      )}
                    {practiceExam.is_public && (
                      <DropdownMenuItem
                        className="whitespace-nowrap"
                        onClick={() => void removeFromMarketplace(practiceExam)}
                      >
                        <Ban className="size-4" />
                        Remove from marketplace
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="whitespace-nowrap"
                      onClick={() => {
                        setBlockReason(practiceExam.block_reason ?? "");
                        if (practiceExam.blocked_by_platform) {
                          void updateBlocked(practiceExam, false);
                        } else {
                          setBlockTarget(practiceExam);
                        }
                      }}
                    >
                      <Ban className="size-4" />
                      {practiceExam.blocked_by_platform ? "Unblock" : "Block"}
                    </DropdownMenuItem>
                  </>
                ) : marketplaceMode ? (
                  <>
                    <DropdownMenuSeparator />
                    {isAlreadyInherited(practiceExam) ? (
                      <DropdownMenuItem className="whitespace-nowrap" disabled>
                        <Badge variant="outline" className={inheritedBadgeClass}>
                          Already inherited
                        </Badge>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="whitespace-nowrap"
                        disabled={actionLoading}
                        onClick={() => void inheritPracticeExams([practiceExam])}
                      >
                        <Plus className="size-4" />
                        Inherit
                      </DropdownMenuItem>
                    )}
                  </>
                ) : practiceExam.blocked_by_platform ? (
                  <DropdownMenuItem disabled>
                    <ShieldAlert className="size-4" />
                    Blocked by Platform Admin
                  </DropdownMenuItem>
                ) : (
                  <>
                    {canEdit && (
                      <DropdownMenuItem onClick={() => void openEdit(practiceExam)}>
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(practiceExam)}
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
    inheritPracticeExams,
    isPlatformAdmin,
    isAlreadyInherited,
    openDetail,
    openEdit,
    practiceExamView,
    user,
  ]);

  if (!isReady) {
    return <div className="text-muted-foreground">Loading practice exams...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Practice Exams</h1>
          <p className="text-muted-foreground">
            {isPlatformAdmin
              ? "Review institution practice exams and block unsafe content."
              : "Create reusable practice exams with objective and true / false questions."}
          </p>
        </div>
        {(canCreate || isPlatformAdmin) && practiceExamView === "my" && (
          <Button
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add Practice Exam
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={practiceExamView === "my" ? "default" : "outline"}
          onClick={() => {
            setPracticeExamView("my");
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
        >
          {isPlatformAdmin ? "All Practice Exams" : "My Practice Exams"}
        </Button>
        <Button
          type="button"
          variant={practiceExamView === "marketplace" ? "default" : "outline"}
          onClick={() => {
            setPracticeExamView("marketplace");
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
        >
          Marketplace
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Practice Exams" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Blocked" value={stats.blocked} />
        <StatCard label="Questions" value={stats.questions} />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyText="No practice exams found."
        totalRows={totalRows}
        manualPagination
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        getRowId={(row) => String(row.id)}
        selectionResetKey={`${practiceExamView}:${debouncedSearch}:${pagination.pageSize}:${activeInstitutionId ?? ""}`}
        enableRowSelection={(row) =>
          !isPlatformAdmin &&
          (practiceExamView === "my" || canInheritPracticeExam(row.original))
        }
        onRowClick={(row) => void openDetail(row)}
        selectedActions={(selectedRows, resetSelection) => {
          if (isPlatformAdmin) return null;
          if (practiceExamView === "marketplace") {
            const inheritableRows = selectedRows.filter(canInheritPracticeExam);
            return (
              <Button
                type="button"
                variant="outline"
                disabled={actionLoading || inheritableRows.length === 0}
                onClick={() => void inheritPracticeExams(inheritableRows, resetSelection)}
              >
                {actionLoading && <Loader2 className="size-4 animate-spin" />}
                {inheritableRows.length === 0 ? "Already inherited" : "Inherit selected"}
              </Button>
            );
          }

          const deletableRows = selectedRows.filter((practiceExam) =>
            !practiceExam.blocked_by_platform &&
            hasPermission(user, "content.practice_exams.delete", {
              institutionId: practiceExam.source_institution_id,
            })
          );

          return (
            <Button
              type="button"
              variant="destructive"
              disabled={actionLoading || deletableRows.length === 0}
              onClick={() => void deletePracticeExams(deletableRows, resetSelection)}
            >
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          );
        }}
        toolbarLeft={
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search practice exams or institutions..."
            className="w-full sm:w-80"
          />
        }
        toolbarRight={
          <Button type="button" variant="ghost" size="icon" onClick={() => void fetchRows()}>
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
            <span className="sr-only">Refresh practice exams</span>
          </Button>
        }
      />

      {!isPlatformAdmin && (
        <PracticeExamEditor
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
      )}

      {!isPlatformAdmin && questionTemplate && (
        <PracticeExamQuestionEditor
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
                  : "Failed to refresh practice exam"
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
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>{active?.title ?? "Practice Exam"}</SheetTitle>
            <SheetDescription>
              {active?.institution_name ?? "Practice Exam questions and details"}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {detailLoading ? (
              <div className="flex min-h-52 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading practice exam...
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
                        You can remove this practice exam from the public marketplace anytime.
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
                      Curriculum nodes linked to this practice exam.
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
                        Add questions after the practice exam details have been saved.
                      </p>
                    </div>
                    {!isPlatformAdmin &&
                      !active.blocked_by_platform &&
                      hasPermission(user, "content.practice_exams.edit", {
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
            <DialogTitle>Block Practice Exam</DialogTitle>
            <DialogDescription>
              The institution will still see this practice exam, but editing and deletion will be disabled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={blockReason}
              onChange={(event) => setBlockReason(event.target.value)}
              placeholder="Explain why this practice exam is blocked"
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
              Block Practice Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Practice Exam?</DialogTitle>
            <DialogDescription>
              This permanently removes the practice exam and all of its questions and images.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void deletePracticeExam()} disabled={actionLoading}>
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PracticeExamEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        accessToken={accessToken}
        template={editing}
        fetchInstitutions={fetchInstitutions}
        onSaved={(_id) => {
          void fetchRows();
        }}
      />

      {questionTemplate && (
        <PracticeExamQuestionEditor
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



