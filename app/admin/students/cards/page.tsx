"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { ArrowUpDown, Download, Eye, FileText, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { getApiErrorMessage, readJsonResponse } from "@/lib/auth/client-permission-errors";
import { formatIndianDate } from "@/lib/format-time";
import { useAuthStore } from "@/store";

const TemplateCanvasPreview = dynamic(
  () => import("@/components/card-templates/template-canvas-preview"),
  { ssr: false }
);

type SavedStudentCard = {
  id: number;
  institution_id: number;
  student_id: number;
  enrollment_id: number | null;
  template_id: number;
  title: string;
  rendered_html: string;
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
  student_email: string;
  admission_number: string | null;
  roll_number: string | null;
  program_name: string | null;
  section_name: string | null;
  generated_by_name: string | null;
};

function downloadImage(card: SavedStudentCard, imageUrl = card.image_url) {
  if (!imageUrl) return;
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = `${card.student_name || "student"}-id-card.png`;
  link.click();
}

function downloadPdf(card: SavedStudentCard, imageUrl = card.image_url) {
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
    pdf.save(`${card.student_name || "student"}-id-card.pdf`);
  };
  image.src = imageUrl;
}

function classLabel(card: SavedStudentCard) {
  return [card.program_name, card.section_name ? `Section ${card.section_name}` : null]
    .filter(Boolean)
    .join(" - ") || "-";
}

function buildColumns(
  onPreview: (card: SavedStudentCard) => void,
  onDelete: (card: SavedStudentCard) => void
): ColumnDef<SavedStudentCard>[] {
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
              .join(" · ") || row.original.student_email}
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
        <span className="text-muted-foreground">{formatIndianDate(row.original.created_at)}</span>
      ),
    },
    {
      accessorKey: "version",
      header: "Version",
      cell: ({ row }) => <span className="font-mono text-sm">v{row.original.version}</span>,
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const card = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="size-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPreview(card)}>
                <Eye className="size-4" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadImage(card)}>
                <Download className="size-4" />
                Download PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadPdf(card)}>
                <FileText className="size-4" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(card)}>
                <Trash2 className="size-4" />
                Delete card
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export default function StudentCardsPage() {
  const { accessToken } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const [cards, setCards] = useState<SavedStudentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState<SavedStudentCard[]>([]);
  const [previewCard, setPreviewCard] = useState<SavedStudentCard | null>(null);
  const [currentCanvasExport, setCurrentCanvasExport] = useState<(() => TemplateCanvasExport | null) | null>(null);
  const [pageCount, setPageCount] = useState(-1);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

  const loadCards = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (activeInstitution) params.set("institutionId", String(activeInstitution.id));
      const response = await fetch(`/api/admin/students/cards?${params.toString()}`, {
        headers: authHeader,
        cache: "no-store",
      });
      const json = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(json, "Failed to load saved cards"));
      }
      setCards(json.data ?? []);
      setPageCount(json.pageCount ?? -1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load saved cards");
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeInstitution, authHeader, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCards(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCards]);

  async function deleteCards() {
    if (!accessToken || !deleteTargets.length) return;
    setDeleting(true);
    try {
      const response = await fetch("/api/admin/students/cards", {
        method: "DELETE",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: deleteTargets.map((card) => card.id) }),
      });
      const json = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(json, "Failed to delete cards"));
      }
      toast.success(deleteTargets.length === 1 ? "Card deleted." : "Cards deleted.");
      setDeleteTargets([]);
      await loadCards();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete cards");
    } finally {
      setDeleting(false);
    }
  }

  const columns = useMemo(
    () => buildColumns(setPreviewCard, (card) => setDeleteTargets([card])),
    []
  );

  if (loading && !cards.length) {
    return (
      <div className="space-y-4">
        <div>
          <Skeleton className="mb-2 h-8 w-32" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-[420px] rounded-md" />
      </div>
    );
  }

  const previewExport = currentCanvasExport?.();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cards</h1>
          <p className="text-muted-foreground">
            Manage saved student ID cards and download student-ready copies.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void loadCards()} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={cards}
        searchKey="student_name"
        filterPlaceholder="Filter by student..."
        manualPagination
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        loading={loading}
        emptyText="No saved cards yet."
        getRowId={(card) => String(card.id)}
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

      <Dialog open={Boolean(previewCard)} onOpenChange={(open) => !open && setPreviewCard(null)}>
        <DialogContent className="flex h-[86dvh] max-h-[900px] w-[92vw] max-w-[1180px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1180px]">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <DialogTitle>{previewCard?.title ?? "ID Card"}</DialogTitle>
                <DialogDescription>
                  {previewCard ? `${previewCard.student_name} · ${classLabel(previewCard)}` : ""}
                </DialogDescription>
              </div>
              {previewCard?.image_url && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="icon" aria-label="Download options">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled={!previewExport} onClick={() => previewExport && downloadImage(previewCard, previewExport.dataUrl)}>
                      <Download className="size-4" /> Download Current Size PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!previewExport} onClick={() => previewExport && downloadPdf(previewCard, previewExport.dataUrl)}>
                      <FileText className="size-4" /> Download Current Size PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => downloadImage(previewCard)}>
                      <Download className="size-4" /> Download Original PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadPdf(previewCard)}>
                      <FileText className="size-4" /> Download Original PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 bg-muted/20">
            <TemplateCanvasPreview
              imageSrc={previewCard?.image_url ?? null}
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
              {deleteTargets.length === 1 ? "Delete this saved card?" : `Delete ${deleteTargets.length} saved cards?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deleted cards will be hidden from the admin list and from student ID Card pages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void deleteCards();
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
