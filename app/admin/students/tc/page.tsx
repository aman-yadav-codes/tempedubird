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

type TransferCertificateRow = {
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

function downloadImage(tc: TransferCertificateRow, imageUrl = tc.image_url) {
  if (!imageUrl) return;
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = `${tc.student_name || "student"}-transfer-certificate.png`;
  link.click();
}

function downloadPdf(tc: TransferCertificateRow, imageUrl = tc.image_url) {
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
    pdf.save(`${tc.student_name || "student"}-transfer-certificate.pdf`);
  };
  image.src = imageUrl;
}

function classLabel(tc: TransferCertificateRow) {
  return [tc.program_name, tc.section_name ? `Section ${tc.section_name}` : null]
    .filter(Boolean)
    .join(" - ") || "-";
}

function buildColumns(
  onPreview: (tc: TransferCertificateRow) => void,
  onDelete: (tc: TransferCertificateRow) => void
): ColumnDef<TransferCertificateRow>[] {
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
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.template_name}</span>
      ),
    },
    {
      id: "class",
      header: "Class",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{classLabel(row.original)}</span>
      ),
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
        const tc = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="size-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPreview(tc)}>
                <Eye className="size-4" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!tc.image_url} onClick={() => downloadImage(tc)}>
                <Download className="size-4" />
                Download PNG
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!tc.image_url} onClick={() => downloadPdf(tc)}>
                <FileText className="size-4" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(tc)}
              >
                <Trash2 className="size-4" />
                Delete TC
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export default function StudentTcPage() {
  const { accessToken, user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const [items, setItems] = useState<TransferCertificateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteTargets, setDeleteTargets] = useState<TransferCertificateRow[]>([]);
  const [previewTc, setPreviewTc] = useState<TransferCertificateRow | null>(null);
  const [currentCanvasExport, setCurrentCanvasExport] = useState<(() => TemplateCanvasExport | null) | null>(null);
  const [pageCount, setPageCount] = useState(-1);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken]
  );

  const loadTransferCertificates = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search,
      });
      if (activeInstitution) params.set("institutionId", String(activeInstitution.id));
      const response = await fetch(`/api/admin/students/tc?${params.toString()}`, {
        headers: authHeader,
        cache: "no-store",
      });
      const json = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(json, "Failed to load transfer certificates"));
      }
      setItems(json.data ?? []);
      setPageCount(json.pageCount ?? -1);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load transfer certificates"
      );
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    activeInstitution,
    authHeader,
    pagination.pageIndex,
    pagination.pageSize,
    search,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTransferCertificates(), 250);
    return () => window.clearTimeout(timer);
  }, [loadTransferCertificates]);

  async function deleteTransferCertificates() {
    if (!accessToken || !deleteTargets.length) return;
    setDeleting(true);
    try {
      const response = await fetch("/api/admin/students/tc", {
        method: "DELETE",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: deleteTargets.map((tc) => tc.id) }),
      });
      const json = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(json, "Failed to delete transfer certificates"));
      }
      toast.success(
        deleteTargets.length === 1
          ? "Transfer certificate deleted."
          : "Transfer certificates deleted."
      );
      setDeleteTargets([]);
      await loadTransferCertificates();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete transfer certificates"
      );
    } finally {
      setDeleting(false);
    }
  }

  const columns = useMemo(
    () => buildColumns(setPreviewTc, (tc) => setDeleteTargets([tc])),
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
          <Skeleton className="h-10 w-28 rounded-md" />
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
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="sm:hidden">TC</span>
            <span className="hidden sm:inline">Transfer Certificate</span>
          </h1>
          <p className="text-muted-foreground">
            Prepare and manage student transfer certificate records.
          </p>
        </div>
        <Button asChild>
          <Link href={toRoleRoutePath("/admin/master-data/card-templates", user)}>
            <Plus className="size-4" />
            Generate TC
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
        emptyText="No transfer certificates found."
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

      <Dialog open={Boolean(previewTc)} onOpenChange={(open) => !open && setPreviewTc(null)}>
        <DialogContent className="flex h-[86dvh] max-h-[900px] w-[92vw] max-w-[1180px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1180px]">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <FileCheck2 className="size-5 text-destructive" />
                  {previewTc?.title ?? "Transfer Certificate"}
                </DialogTitle>
                <DialogDescription>
                  {previewTc ? `${previewTc.student_name} - ${classLabel(previewTc)}` : ""}
                </DialogDescription>
              </div>
              {previewTc?.image_url && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="icon" aria-label="Download options">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={!previewExport}
                      onClick={() => previewExport && downloadImage(previewTc, previewExport.dataUrl)}
                    >
                      <Download className="size-4" />
                      Download Current Size PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!previewExport}
                      onClick={() => previewExport && downloadPdf(previewTc, previewExport.dataUrl)}
                    >
                      <FileText className="size-4" />
                      Download Current Size PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => downloadImage(previewTc)}>
                      <Download className="size-4" />
                      Download Original PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadPdf(previewTc)}>
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
              imageSrc={previewTc?.image_url ?? null}
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
                ? "Delete this transfer certificate?"
                : `Delete ${deleteTargets.length} transfer certificates?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deleted transfer certificates will be hidden from this admin list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void deleteTransferCertificates();
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
