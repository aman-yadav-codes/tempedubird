"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  ArrowUpDown,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

import type { TemplateCanvasExport } from "@/components/card-templates/template-canvas-preview";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { getApiErrorMessage, readJsonResponse } from "@/lib/auth/client-permission-errors";
import { formatIndianDate } from "@/lib/format-time";
import { useAuthStore } from "@/store";
import { toRoleRoutePath } from "@/lib/auth/role-routes";

const TemplateCanvasPreview = dynamic(
  () => import("@/components/card-templates/template-canvas-preview"),
  { ssr: false }
);

type ResultCardRow = {
  id: number;
  institution_id: number;
  student_id: number;
  enrollment_id: number | null;
  template_id: number;
  title: string | null;
  rendered_html: string | null;
  field_values: Record<string, string>;
  image_url: string | null;
  pdf_url: string | null;
  canvas_width: number | null;
  canvas_height: number | null;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
  institution_name: string;
  template_name: string;
  student_name: string;
  student_email: string | null;
  admission_number: string | null;
  roll_number: string | null;
  program_name: string | null;
  section_name: string | null;
  generated_by_name: string | null;
};

function downloadImage(result: ResultCardRow, imageUrl = result.image_url) {
  if (!imageUrl) return;
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = `${result.student_name || "student"}-result-card.png`;
  link.click();
}
function downloadPdf(result: ResultCardRow, imageUrl = result.image_url) {
  if (!imageUrl) return;
  const image = new Image();
  image.onload = () => {
    const landscape = image.width > image.height;
    const pdf = new jsPDF({
      orientation: landscape ? "landscape" : "portrait",
      unit: "px",
      format: [image.width, image.height],
    });
    pdf.addImage(imageUrl, "PNG", 0, 0, image.width, image.height);
    pdf.save(`${result.student_name || "student"}-result-card.pdf`);
  };
  image.src = imageUrl;
}

function classLabel(result: ResultCardRow) {
  return [result.program_name, result.section_name ? `Section ${result.section_name}` : null]
    .filter(Boolean)
    .join(" - ") || "-";
}

function buildColumns(
  onPreview: (result: ResultCardRow) => void,
  onDelete: (result: ResultCardRow) => void
): ColumnDef<ResultCardRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={Boolean(row.getIsSelected())}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "student_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 px-3"
        >
          Student
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium">{row.original.student_name}</p>
          <p className="text-xs text-muted-foreground">
            {[row.original.admission_number, row.original.roll_number ? `Roll ${row.original.roll_number}` : null]
              .filter(Boolean)
              .join(" - ") || row.original.student_email || "-"}
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
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 px-3"
        >
          Saved
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
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
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => {
        const result = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="size-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPreview(result)}>
                <Eye className="size-4" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!result.image_url} onClick={() => downloadImage(result)}>
                <Download className="size-4" />
                Download PNG
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!result.image_url} onClick={() => downloadPdf(result)}>
                <FileText className="size-4" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(result)}
              >
                <Trash2 className="size-4" />
                Delete Result
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export default function StudentResultPage() {
  const { accessToken, user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const [items, setItems] = useState<ResultCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteTargets, setDeleteTargets] = useState<ResultCardRow[]>([]);
  const [previewResult, setPreviewResult] = useState<ResultCardRow | null>(null);
  const [currentCanvasExport, setCurrentCanvasExport] = useState<(() => TemplateCanvasExport | null) | null>(null);
  const [pageCount, setPageCount] = useState(-1);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

  const loadResults = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search,
      });
      if (activeInstitution) params.set("institutionId", String(activeInstitution.id));
      const response = await fetch(`/api/admin/students/result?${params.toString()}`, {
        headers: authHeader,
        cache: "no-store",
      });
      const json = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(json, "Failed to load results"));
      }
      setItems(json.data ?? []);
      setPageCount(json.pageCount ?? -1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeInstitution, authHeader, pagination.pageIndex, pagination.pageSize, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadResults(), 250);
    return () => window.clearTimeout(timer);
  }, [loadResults]);

  async function deleteResults() {
    if (!accessToken || !deleteTargets.length) return;
    setDeleting(true);
    try {
      const response = await fetch("/api/admin/students/result", {
        method: "DELETE",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: deleteTargets.map((result) => result.id) }),
      });
      const json = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(json, "Failed to delete results"));
      }
      toast.success(deleteTargets.length === 1 ? "Result deleted." : "Results deleted.");
      setDeleteTargets([]);
      await loadResults();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete results");
    } finally {
      setDeleting(false);
    }
  }

  const columns = useMemo(
    () => buildColumns(setPreviewResult, (result) => setDeleteTargets([result])),
    []
  );

  if (loading && !items.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="mb-2 h-8 w-24" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>
        <Skeleton className="h-[420px] rounded-md" />
      </div>
    );
  }

  const previewExport = currentCanvasExport?.();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Result</h1>
          <p className="text-muted-foreground">
            Prepare and manage student result records.
          </p>
        </div>
        <Button asChild>
          <Link href={toRoleRoutePath("/admin/master-data/card-templates", user)}>
            <Plus className="size-4" />
            Generate Result
          </Link>
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
        emptyText="No results found."
        toolbarLeft={
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
            placeholder="Search by student ID or name..."
            className="w-full sm:w-80"
          />
        }
        selectedActions={(selectedRows, resetSelection) => (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              setDeleteTargets(selectedRows);
              resetSelection();
            }}
          >
            <Trash2 className="size-4" />
            Delete Selected
          </Button>
        )}
      />

      <Dialog open={Boolean(previewResult)} onOpenChange={(open) => !open && setPreviewResult(null)}>
        <DialogContent className="flex h-[86dvh] max-h-[900px] w-[92vw] max-w-[1180px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1180px]">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <FileCheck2 className="size-5 text-destructive" />
                  {previewResult?.title ?? "Result Card"}
                </DialogTitle>
                <DialogDescription>
                  {previewResult ? `${previewResult.student_name} - ${classLabel(previewResult)}` : ""}
                </DialogDescription>
              </div>
              {previewResult?.image_url && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="icon" aria-label="Download options">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={!previewExport}
                      onClick={() => previewExport && downloadImage(previewResult, previewExport.dataUrl)}
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
                    <DropdownMenuItem onClick={() => downloadImage(previewResult)}>
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
              onCurrentExportChange={(exporter) => setCurrentCanvasExport(() => exporter)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTargets.length > 0}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTargets([]);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTargets.length === 1
                ? "Delete this result?"
                : `Delete ${deleteTargets.length} results?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deleted results will be hidden from this admin list and student classroom view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void deleteResults();
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
