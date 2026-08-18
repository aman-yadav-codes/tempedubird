"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Download, FileText, RefreshCw, Search } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

import type { TemplateCanvasExport } from "@/components/card-templates/template-canvas-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { getApiErrorMessage, readJsonResponse } from "@/lib/auth/client-permission-errors";
import { formatIndianDate } from "@/lib/format-time";
import { useAuthStore } from "@/store";

const TemplateCanvasPreview = dynamic(
  () => import("@/components/card-templates/template-canvas-preview"),
  { ssr: false }
);

type ResultCard = {
  id: number;
  title: string | null;
  image_url: string | null;
  rendered_html: string | null;
  canvas_width: number | null;
  canvas_height: number | null;
  version: number;
  created_at: string;
  institution_name: string;
  template_name: string;
  student_name: string;
  admission_number: string | null;
  roll_number: string | null;
  program_name: string | null;
  section_name: string | null;
  generated_by_name: string | null;
};

function classLabel(result: ResultCard) {
  return [result.program_name, result.section_name ? `Section ${result.section_name}` : null]
    .filter(Boolean)
    .join(" - ") || "-";
}

function downloadPng(result: ResultCard, imageUrl = result.image_url) {
  if (!imageUrl) return;
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = `${result.title || result.student_name || "student"}-result-card.png`;
  link.click();
}

function downloadPdf(result: ResultCard, imageUrl = result.image_url) {
  if (!imageUrl) return;
  const image = new Image();
  image.onload = () => {
    const pdf = new jsPDF({
      orientation: image.width > image.height ? "landscape" : "portrait",
      unit: "px",
      format: [image.width, image.height],
    });
    pdf.addImage(imageUrl, "PNG", 0, 0, image.width, image.height);
    pdf.save(`${result.title || result.student_name || "student"}-result-card.pdf`);
  };
  image.src = imageUrl;
}

function buildColumns(): ColumnDef<ResultCard>[] {
  return [
    {
      accessorKey: "title",
      header: "Result",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium">{row.original.title || row.original.template_name}</p>
          <p className="text-xs text-muted-foreground">
            {[row.original.institution_name, classLabel(row.original)].filter(Boolean).join(" > ")}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "template_name",
      header: "Template",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.template_name}</span>,
    },
    {
      id: "class",
      header: "Class",
      cell: ({ row }) => <span className="text-muted-foreground">{classLabel(row.original)}</span>,
    },
    {
      accessorKey: "created_at",
      header: "Published",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatIndianDate(row.original.created_at)}
        </span>
      ),
    },
    {
      accessorKey: "version",
      header: "Version",
      cell: ({ row }) => <Badge variant="outline">v{row.original.version}</Badge>,
    },
  ];
}

export default function ClassroomResultsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const [items, setItems] = useState<ResultCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [previewResult, setPreviewResult] = useState<ResultCard | null>(null);
  const [currentCanvasExport, setCurrentCanvasExport] = useState<(() => TemplateCanvasExport | null) | null>(null);
  const [pageCount, setPageCount] = useState(-1);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
  const columns = useMemo(() => buildColumns(), []);

  const loadResults = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search,
      });
      const response = await fetch(`/api/admin/classroom/results?${params.toString()}`, {
        headers: authHeader,
        cache: "no-store",
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "Unable to load results"));
      setItems(payload.data ?? []);
      setPageCount(payload.pageCount ?? -1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load results");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader, pagination.pageIndex, pagination.pageSize, search]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void loadResults(), 250);
    return () => window.clearTimeout(timeout);
  }, [isReady, loadResults]);

  if (!isReady || (loading && !items.length)) {
    return (
      <div className="space-y-4">
        <div>
          <Skeleton className="mb-2 h-8 w-28" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-[420px] rounded-md" />
      </div>
    );
  }

  const previewExport = currentCanvasExport?.();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Results</h1>
          <p className="text-muted-foreground">
            View your published result cards and download student-ready copies.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadResults()}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
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
        onRowClick={(row) => setPreviewResult(row)}
        emptyText="No result cards have been published yet."
        toolbarLeft={
          <div className="relative w-full sm:w-96">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
              placeholder="Search results..."
              className="pl-9"
            />
          </div>
        }
      />

      <Dialog open={Boolean(previewResult)} onOpenChange={(open) => !open && setPreviewResult(null)}>
        <DialogContent className="flex h-[86dvh] max-h-[900px] w-[92vw] max-w-[1180px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1180px]">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <DialogTitle>{previewResult?.title || "Result Card"}</DialogTitle>
                <DialogDescription>
                  {previewResult
                    ? `${classLabel(previewResult)} - Published ${formatIndianDate(previewResult.created_at)}`
                    : ""}
                </DialogDescription>
              </div>
              {previewResult?.image_url && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline">
                      <Download className="size-4" />
                      Download
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem
                      disabled={!previewExport}
                      onClick={() => previewExport && downloadPng(previewResult, previewExport.dataUrl)}
                    >
                      <Download className="size-4" />
                      Download Current Size PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!previewExport}
                      onClick={() => previewExport && downloadPdf(previewResult, previewExport.dataUrl)}
                    >
                      <FileText className="size-4" />
                      Download Current Size PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => downloadPng(previewResult)}>
                      <Download className="size-4" />
                      Download Original PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadPdf(previewResult)}>
                      <FileText className="size-4" />
                      Download Original PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 bg-muted/20">
            <TemplateCanvasPreview
              imageSrc={previewResult?.image_url ?? null}
              renderMode="persisted"
              emptyMessage="This result card does not have a preview image."
              onCurrentExportChange={(exporter) => setCurrentCanvasExport(() => exporter)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
