"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Award, ExternalLink, RefreshCw, Search, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { getApiErrorMessage, readJsonResponse } from "@/lib/auth/client-permission-errors";
import { formatIndianDate } from "@/lib/format-time";
import { useAuthStore } from "@/store";

type AchievementRow = {
  id: number;
  title: string;
  category: string;
  template_name: string | null;
  template_thumbnail_url: string | null;
  download_url: string | null;
  achievement_date: string | null;
  certificate_url: string | null;
  remarks: string | null;
  institution_name: string;
  program_name: string | null;
  section_name: string | null;
  academic_year_name: string | null;
};

type AchievementStats = {
  total: number;
  certificates: number;
};

function classLabel(row: AchievementRow) {
  return [row.program_name, row.section_name ? `Section ${row.section_name}` : null]
    .filter(Boolean)
    .join(" - ") || "-";
}

function openAchievementImage(row: AchievementRow) {
  if (!row.download_url) {
    toast.info("No image is saved for this achievement yet.");
    return;
  }
  window.open(row.download_url, "_blank", "noopener,noreferrer");
}

function buildColumns(): ColumnDef<AchievementRow>[] {
  return [
    {
      accessorKey: "title",
      header: "Achievement",
      cell: ({ row }) => (
        <div className="min-w-0">
          {row.original.download_url ? (
            <a
              href={row.original.download_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 items-center gap-1 font-medium hover:text-destructive hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              <span className="truncate">{row.original.title}</span>
              <ExternalLink className="size-3 shrink-0" />
            </a>
          ) : (
            <p className="font-medium">{row.original.title}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {[row.original.institution_name, row.original.category]
              .filter(Boolean)
              .join(" > ")}
          </p>
        </div>
      ),
    },
    {
      id: "class",
      header: "Class",
      cell: ({ row }) => <span className="text-muted-foreground">{classLabel(row.original)}</span>,
    },
    {
      accessorKey: "academic_year_name",
      header: "Session",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.academic_year_name || "-"}</Badge>
      ),
    },
    {
      accessorKey: "achievement_date",
      header: "Date",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatIndianDate(row.original.achievement_date ?? "")}
        </span>
      ),
    },
  ];
}

export default function ClassroomAchievementsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const [items, setItems] = useState<AchievementRow[]>([]);
  const [stats, setStats] = useState<AchievementStats>({ total: 0, certificates: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageCount, setPageCount] = useState(-1);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
  const columns = useMemo(() => buildColumns(), []);
  const latestAchievementDate = items[0]?.achievement_date ?? null;

  const loadAchievements = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search,
      });
      const response = await fetch(`/api/admin/classroom/achievements?${params.toString()}`, {
        headers: authHeader,
        cache: "no-store",
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Unable to load achievements"));
      setItems(payload.data ?? []);
      setStats(payload.stats ?? { total: 0, certificates: 0 });
      setPageCount(payload.pageCount ?? -1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load achievements");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader, pagination.pageIndex, pagination.pageSize, search]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void loadAchievements(), 250);
    return () => window.clearTimeout(timeout);
  }, [isReady, loadAchievements]);

  if (!isReady || (loading && !items.length)) {
    return (
      <div className="space-y-4">
        <div>
          <Skeleton className="mb-2 h-8 w-40" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-[420px] rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-muted-foreground">
            View awards, milestones, and certificates published by your institution.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadAchievements()}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Total Achievements</p>
            <Trophy className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-3 text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Latest Achievement</p>
            <Award className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-3 text-3xl font-bold">
            {latestAchievementDate ? formatIndianDate(latestAchievementDate) : "-"}
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        manualPagination
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        getRowId={(row) => String(row.id)}
        onRowClick={openAchievementImage}
        emptyText="No achievements have been published yet."
        toolbarLeft={
          <div className="relative w-full sm:w-96">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
              placeholder="Search achievements..."
              className="pl-9"
            />
          </div>
        }
      />
    </div>
  );
}
