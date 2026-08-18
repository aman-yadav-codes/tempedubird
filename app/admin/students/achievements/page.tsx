"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  Edit2,
  Eye,
  FileText,
  ImageIcon,
  Loader2,
  MoreHorizontal,
  Plus,
  Save,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  TemplateResizableHandle,
  TemplateResizablePanel,
  TemplateResizablePanelGroup,
} from "@/components/card-templates/template-resizable";
import { renderTemplateHtmlToPng } from "@/components/card-templates/render-template-preview";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { DatePicker } from "@/components/shared/date-picker";
import {
  DocumentFileUpload,
  type UploadedDocumentFile,
} from "@/components/shared/document-file-upload";
import { ImagePreviewSlider } from "@/components/shared/image-preview-slider";
import { useActiveAcademicYearId } from "@/hooks/use-active-academic-year-id";
import { useActiveInstitution } from "@/hooks/use-active-institution";
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
  DialogClose,
  DialogContent,
  DialogDescription,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { getStoredActiveAcademicSessions } from "@/lib/auth/active-academic-session";
import type { DocumentTemplateField } from "@/lib/types/document-template";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

const TemplateCanvasPreview = dynamic(
  () => import("@/components/card-templates/template-canvas-preview"),
  { ssr: false },
);

type AchievementRow = {
  id: number;
  student_id: number;
  student_name: string;
  student_email?: string | null;
  card_category_id: number;
  category: string;
  template_id?: number | null;
  institution_id?: number | null;
  template_name?: string | null;
  title: string;
  achievement_date?: string | null;
  certificate_url?: string | null;
  remarks?: string | null;
  created_at: string;
  updated_at: string;
};

type StudentOption = {
  id: number;
  full_name: string;
  email?: string | null;
  institutions?: string[] | null;
  is_profile_complete?: boolean;
};

type AchievementTemplateOption = {
  id: number;
  name: string;
  institution_id: number;
  institution_name: string;
  card_category_id: number;
  default_date?: string | null;
  display_title: string;
};

type AchievementForm = {
  id?: number;
  student_id: string;
  student_label: string;
  template_id: string;
  institution_id: string;
  achievement_date: string;
  certificate_url: string;
  remarks: string;
};

type AchievementPreviewTemplate = {
  id: number;
  name: string;
  html_template?: string | null;
};

type AchievementPreviewData = {
  template: AchievementPreviewTemplate;
  fields: DocumentTemplateField[];
  values: Record<string, string>;
  editable_fields: DocumentTemplateField[];
  achievement_date: string;
  title: string;
};

const blankForm: AchievementForm = {
  student_id: "",
  student_label: "",
  template_id: "",
  institution_id: "",
  achievement_date: "",
  certificate_url: "",
  remarks: "",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function applyFieldValues(
  html: string,
  fields: DocumentTemplateField[],
  values: Record<string, string>,
) {
  return fields.reduce((result, field) => {
    const value = values[field.field_name] ?? "";
    const replacement =
      field.field_type === "image" ? value : escapeHtml(value);
    return result.replaceAll(`{{${field.field_name}}}`, replacement);
  }, html);
}

function isValidImageValue(value: string) {
  if (value.startsWith("data:image/")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function certificateToFiles(url: string): UploadedDocumentFile[] {
  if (!url) return [];
  return [
    {
      url,
      publicId: "",
      resourceType: "image",
      fileType: "image/*",
      name: "Certificate",
    },
  ];
}

function VerifiedProfileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-6 shrink-0 text-emerald-500 drop-shadow-sm dark:text-emerald-400"
      fill="currentColor"
    >
      <path d="M12 2.25 14.1 4l2.72-.25 1.02 2.54 2.35 1.39-.65 2.65L20.75 12l-1.21 1.67.65 2.65-2.35 1.39-1.02 2.54-2.72-.25L12 21.75 9.9 20l-2.72.25-1.02-2.54-2.35-1.39.65-2.65L3.25 12l1.21-1.67-.65-2.65 2.35-1.39 1.02-2.54L9.9 4 12 2.25Zm4.32 7.17-1.43-1.34-4.13 4.4-1.75-1.75-1.39 1.39 3.18 3.18 5.52-5.88Z" />
    </svg>
  );
}

export default function StudentAchievementsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const activeAcademicYearId = useActiveAcademicYearId();
  const { activeInstitution } = useActiveInstitution();
  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken],
  );

  const [items, setItems] = useState<AchievementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pageCount, setPageCount] = useState(-1);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewing, setViewing] = useState<AchievementRow | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<AchievementRow[]>([]);
  const [form, setForm] = useState<AchievementForm>(blankForm);
  const [templateOptions, setTemplateOptions] = useState<
    AchievementTemplateOption[]
  >([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [previewDataLoading, setPreviewDataLoading] = useState(false);
  const [previewTemplate, setPreviewTemplate] =
    useState<AchievementPreviewTemplate | null>(null);
  const [previewFields, setPreviewFields] = useState<DocumentTemplateField[]>(
    [],
  );
  const [editablePreviewFields, setEditablePreviewFields] = useState<
    DocumentTemplateField[]
  >([]);
  const [previewBaseValues, setPreviewBaseValues] = useState<
    Record<string, string>
  >({});
  const [runtimeFieldValues, setRuntimeFieldValues] = useState<
    Record<string, string>
  >({});
  const [previewFieldErrors, setPreviewFieldErrors] = useState<
    Record<string, string>
  >({});
  const [canvasImageSrc, setCanvasImageSrc] = useState<string | null>(null);
  const [renderingPreview, setRenderingPreview] = useState(false);
  const [isPreviewMobile, setIsPreviewMobile] = useState(false);
  const selectedTemplate = useMemo(
    () =>
      templateOptions.find(
        (template) =>
          String(template.id) === form.template_id &&
          String(template.institution_id) === form.institution_id,
      ) ?? null,
    [form.institution_id, form.template_id, templateOptions],
  );
  const getCreateAcademicYearId = useCallback((institutionId?: number | null) => {
    const scopedInstitutionId = Number(institutionId ?? activeInstitution?.id ?? 0);
    if (!scopedInstitutionId) return null;
    const sessions = getStoredActiveAcademicSessions(scopedInstitutionId);
    if (!sessions.length) return null;
    const defaultId = sessions.find((session) => session.institutionDefaultAcademicYearId)?.institutionDefaultAcademicYearId;
    const today = new Date().toISOString().slice(0, 10);
    const current = sessions.find((session) => session.startDate <= today && session.endDate >= today);
    return defaultId ?? current?.id ?? sessions[0]?.id ?? null;
  }, [activeInstitution?.id]);
  const createAcademicYearId = useMemo(
    () => getCreateAcademicYearId(Number(form.institution_id) || activeInstitution?.id || null),
    [activeInstitution?.id, form.institution_id, getCreateAcademicYearId],
  );

  const resetPreviewState = useCallback(() => {
    setPreviewDataLoading(false);
    setPreviewTemplate(null);
    setPreviewFields([]);
    setEditablePreviewFields([]);
    setPreviewBaseValues({});
    setRuntimeFieldValues({});
    setPreviewFieldErrors({});
    setCanvasImageSrc(null);
    setRenderingPreview(false);
  }, []);

  useEffect(() => {
    const update = () => setIsPreviewMobile(window.innerWidth < 900);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const loadAchievements = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search,
      });
      if (activeAcademicYearId) params.set("academicYearId", String(activeAcademicYearId));
      const res = await fetch(
        `/api/admin/students/achievements?${params.toString()}`,
        {
          headers: authHeader,
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load achievements");
      setItems(json.data || []);
      setPageCount(json.pageCount ?? -1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    activeAcademicYearId,
    authHeader,
    pagination.pageIndex,
    pagination.pageSize,
    search,
  ]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void loadAchievements(), 250);
    return () => window.clearTimeout(timeout);
  }, [isReady, loadAchievements]);

  const fetchStudents = useCallback(
    async (query: string, page: number) => {
      const params = new URLSearchParams({
        action: "students",
        page: String(page),
        limit: "15",
        search: query,
      });
      const studentPickerAcademicYearId = form.id ? activeAcademicYearId : createAcademicYearId;
      if (studentPickerAcademicYearId) params.set("academicYearId", String(studentPickerAcademicYearId));
      const res = await fetch(
        `/api/admin/students/achievements?${params.toString()}`,
        {
          headers: authHeader,
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load students");
      return { data: json.data || [], hasMore: page < json.pageCount };
    },
    [activeAcademicYearId, authHeader, createAcademicYearId, form.id],
  );

  const loadTemplateOptions = useCallback(
    async (studentId: string) => {
      if (!accessToken || !studentId) {
        setTemplateOptions([]);
        return;
      }
      setTemplatesLoading(true);
      try {
        const params = new URLSearchParams({
          action: "templates",
          studentId,
        });
        const res = await fetch(
          `/api/admin/students/achievements?${params.toString()}`,
          {
            headers: authHeader,
          },
        );
        const json = await res.json();
        if (!res.ok)
          throw new Error(json.error ?? "Failed to load achievement templates");
        const options = json.data ?? [];
        setTemplateOptions(options);
        if (options.length === 0) {
          toast.error(
            "This institution does not have any active Achievement Certificate template.",
          );
        }
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setTemplatesLoading(false);
      }
    },
    [accessToken, authHeader],
  );

  const loadPreviewData = useCallback(async () => {
    if (
      !accessToken ||
      !form.student_id ||
      !form.template_id ||
      !form.institution_id
    ) {
      resetPreviewState();
      return null;
    }
    setPreviewDataLoading(true);
    try {
      const params = new URLSearchParams({
        action: "preview-data",
        studentId: form.student_id,
        templateId: form.template_id,
        institutionId: form.institution_id,
      });
      if (form.achievement_date)
        params.set("achievementDate", form.achievement_date);
      const previewAcademicYearId = form.id ? activeAcademicYearId : createAcademicYearId;
      if (previewAcademicYearId) params.set("academicYearId", String(previewAcademicYearId));
      const res = await fetch(
        `/api/admin/students/achievements?${params.toString()}`,
        {
          headers: authHeader,
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to prepare preview");
      const data = json.data as AchievementPreviewData;
      setPreviewTemplate(data.template);
      setPreviewFields(data.fields ?? []);
      setEditablePreviewFields(data.editable_fields ?? []);
      setPreviewBaseValues(data.values ?? {});
      setRuntimeFieldValues((current) =>
        Object.fromEntries(
          (data.editable_fields ?? []).map((field) => [
            field.field_name,
            current[field.field_name] ?? "",
          ]),
        ),
      );
      setPreviewFieldErrors({});
      setCanvasImageSrc(null);
      return data;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return null;
    } finally {
      setPreviewDataLoading(false);
    }
  }, [
    accessToken,
    activeAcademicYearId,
    authHeader,
    createAcademicYearId,
    form.achievement_date,
    form.id,
    form.institution_id,
    form.student_id,
    form.template_id,
    resetPreviewState,
  ]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (!form.student_id || !form.template_id || !form.institution_id) return;
    const timeout = window.setTimeout(() => {
      void loadPreviewData();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [
    dialogOpen,
    form.achievement_date,
    form.institution_id,
    form.student_id,
    form.template_id,
    loadPreviewData,
    resetPreviewState,
  ]);

  async function showPreview() {
    const data = previewTemplate ? null : await loadPreviewData();
    const template = data?.template ?? previewTemplate;
    const fields = data?.fields ?? previewFields;
    const baseValues = data?.values ?? previewBaseValues;
    if (!template?.html_template) {
      toast.error("Selected template does not contain preview HTML");
      return;
    }

    const finalValues: Record<string, string> = {
      ...baseValues,
      ...runtimeFieldValues,
    };
    const errors = Object.fromEntries(
      fields.flatMap((field) => {
        const value = (finalValues[field.field_name] ?? "").trim();
        if ((field.is_required || field.field_type === "image") && !value) {
          return [[field.field_name, `${field.label} is required`]];
        }
        if (
          field.field_type === "image" &&
          value &&
          !isValidImageValue(value)
        ) {
          return [
            [
              field.field_name,
              `${field.label} needs an uploaded image or HTTPS URL`,
            ],
          ];
        }
        return [];
      }),
    );
    setPreviewFieldErrors(errors);
    const firstInvalidField = fields.find((field) => errors[field.field_name]);
    if (firstInvalidField) {
      document
        .getElementById(
          `achievement-preview-field-${firstInvalidField.field_name}`,
        )
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error(errors[firstInvalidField.field_name]);
      return;
    }

    setRenderingPreview(true);
    try {
      const externalImageUrls = fields
        .filter((field) => field.field_type === "image")
        .map((field) => finalValues[field.field_name] ?? "")
        .filter((value) => /^https:\/\//i.test(value));
      let resolvedImages: Record<string, string> = {};

      if (externalImageUrls.length) {
        const response = await fetch(
          "/api/admin/master-data/card-templates/preview-images",
          {
            method: "POST",
            headers: { ...authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({ urls: externalImageUrls }),
          },
        );
        const json = await response.json();
        if (!response.ok)
          throw new Error(json.error ?? "External images could not be loaded");
        resolvedImages = json.data ?? {};
      }

      const renderValues = Object.fromEntries(
        Object.entries(finalValues).map(([key, value]) => [
          key,
          resolvedImages[value] ?? value,
        ]),
      );
      setCanvasImageSrc(
        await renderTemplateHtmlToPng(
          applyFieldValues(template.html_template, fields, renderValues),
        ),
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRenderingPreview(false);
    }
  }

  function openCreateDialog() {
    setForm(blankForm);
    setTemplateOptions([]);
    resetPreviewState();
    setDialogOpen(true);
  }

  const openEditDialog = useCallback(
    (item: AchievementRow) => {
      setForm({
        id: item.id,
        student_id: String(item.student_id),
        student_label: item.student_name,
        template_id: item.template_id ? String(item.template_id) : "",
        institution_id: item.institution_id ? String(item.institution_id) : "",
        achievement_date: item.achievement_date
          ? item.achievement_date.slice(0, 10)
          : "",
        certificate_url: item.certificate_url || "",
        remarks: item.remarks || "",
      });
      void loadTemplateOptions(String(item.student_id));
      resetPreviewState();
      setDialogOpen(true);
    },
    [loadTemplateOptions, resetPreviewState],
  );

  async function saveAchievement() {
    if (!form.student_id || !form.template_id || !form.institution_id) {
      toast.error("Student and achievement template are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/students/achievements", {
        method: form.id ? "PATCH" : "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          student_id: Number(form.student_id),
          template_id: Number(form.template_id),
          institution_id: Number(form.institution_id),
          academicYearId: form.id ? activeAcademicYearId : createAcademicYearId,
          achievement_date: form.achievement_date || null,
          certificate_url: form.certificate_url || null,
          remarks: form.remarks.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save achievement");
      toast.success(form.id ? "Achievement updated" : "Achievement added");
      setDialogOpen(false);
      setForm(blankForm);
      resetPreviewState();
      await loadAchievements();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteAchievements() {
    if (!deleteTargets.length) return;
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/admin/students/achievements", {
        method: "DELETE",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ids: deleteTargets.map((item) => item.id) }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error ?? "Failed to delete achievements");
      toast.success(
        `${json.deleted || deleteTargets.length} achievement${deleteTargets.length === 1 ? "" : "s"} deleted`,
      );
      setDeleteTargets([]);
      await loadAchievements();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  }

  const columns = useMemo<ColumnDef<AchievementRow>[]>(
    () => [
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
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(Boolean(value))
            }
            aria-label="Select all achievements"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            aria-label={`Select ${row.original.title}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "student_name",
        header: "Student",
        cell: ({ row }) => (
          <div className="min-w-44">
            <p className="font-medium">{row.original.student_name}</p>
            {row.original.student_email && (
              <p className="max-w-56 truncate text-xs text-muted-foreground">
                {row.original.student_email}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "title",
        header: "Achievement",
        cell: ({ row }) => (
          <div className="min-w-56">
            <p className="font-medium">{row.original.title}</p>
            <Badge
              variant="outline"
              className="mt-1 border-destructive/30 bg-destructive/10 text-destructive"
            >
              {row.original.category}
            </Badge>
          </div>
        ),
      },
      {
        accessorKey: "achievement_date",
        header: "Date",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {formatDate(row.original.achievement_date)}
          </span>
        ),
      },
      {
        accessorKey: "certificate_url",
        header: "Certificate",
        cell: ({ row }) =>
          row.original.certificate_url ? (
            <Button asChild size="sm" variant="outline">
              <a
                href={row.original.certificate_url}
                target="_blank"
                rel="noreferrer"
              >
                <FileText className="size-4" />
                View
              </a>
            </Button>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
        enableSorting: false,
      },
      {
        accessorKey: "remarks",
        header: "Remarks",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-64 text-muted-foreground">
            {row.original.remarks || "-"}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setViewing(row.original)}>
                <Eye className="size-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditDialog(row.original)}>
                <Edit2 className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTargets([row.original])}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [openEditDialog],
  );

  if (!isReady) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="mb-2 h-8 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>
        <Skeleton className="h-[420px] w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Achievements</h1>
          <p className="text-muted-foreground">
            Record student awards, milestones, and achievements.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Add Achievement
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
        emptyText="No achievements found."
        toolbarLeft={
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
            placeholder="Search by student, title, category..."
            className="w-full sm:w-80"
          />
        }
        selectedActions={(selectedRows, resetSelection) => (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setDeleteTargets(selectedRows);
              resetSelection();
            }}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        )}
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setForm(blankForm);
            setTemplateOptions([]);
            resetPreviewState();
          }
          setDialogOpen(open);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex h-[90dvh] max-h-[900px] w-[94vw] max-w-[1400px] flex-col gap-0 overflow-hidden rounded-lg border p-0 sm:max-w-[1400px] sm:p-0"
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="flex h-14 shrink-0 flex-row items-center justify-between border-b bg-background px-5 text-foreground">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="size-4 text-primary" />
                {form.id ? "Edit Achievement" : "Add Achievement"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Fill achievement fields and generate a certificate preview.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon">
                <X className="size-4" />
                <span className="sr-only">Close achievement dialog</span>
              </Button>
            </DialogClose>
          </DialogHeader>

          <div className="min-h-0 flex-1">
            <div className="h-full w-full overflow-hidden bg-background text-foreground">
            <TemplateResizablePanelGroup
              id={`achievement-preview-${isPreviewMobile ? "mobile" : "desktop"}`}
              direction={isPreviewMobile ? "vertical" : "horizontal"}
              className="h-full w-full"
            >
              <TemplateResizablePanel
                id={`achievement-preview-form-${isPreviewMobile ? "mobile" : "desktop"}`}
                defaultSize={isPreviewMobile ? "55%" : "34%"}
                minSize={isPreviewMobile ? "35%" : "24%"}
              >
                <div className="flex h-full flex-col overflow-hidden">
                  <div className="shrink-0 border-b px-5 py-5 md:px-7">
                    <h2 className="text-xl font-bold">
                      Student & Remaining Fields
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Select a student. Mapped fields fill automatically; only remaining fields are editable.
                    </p>
                  </div>

                  <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-7">
                    <div className="space-y-2 rounded-md border bg-card/40 p-4">
                      <Label>Student</Label>
                      <AsyncSearchPopover<StudentOption>
                        value={form.student_id}
                        selectedLabel={form.student_label}
                        placeholder="Select student..."
                        searchPlaceholder="Search students..."
                        fetcher={fetchStudents}
                        getValue={(item) => String(item.id)}
                        getLabel={(item) => item.full_name}
                        onChange={(value) => {
                          setForm((current) => ({
                            ...current,
                            student_id: value,
                            student_label: value ? current.student_label : "",
                            template_id: "",
                            institution_id: "",
                          }));
                          resetPreviewState();
                          if (!value) setTemplateOptions([]);
                        }}
                        onSelectItem={(item) => {
                          const studentId = String(item.id);
                          setForm((current) => ({
                            ...current,
                            student_id: studentId,
                            student_label: item.full_name,
                            template_id: "",
                            institution_id: "",
                          }));
                          resetPreviewState();
                          void loadTemplateOptions(studentId);
                        }}
                        renderItem={(item) => (
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                            <div className="min-w-0 py-1 text-left">
                              <span className="block truncate text-sm font-medium">
                                {item.full_name}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {[item.email, ...(item.institutions || [])]
                                  .filter(Boolean)
                                  .join(" - ") || "Student"}
                              </span>
                            </div>
                            {item.is_profile_complete && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className="inline-flex shrink-0"
                                      aria-label="Profile complete"
                                    >
                                      <VerifiedProfileIcon />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" sideOffset={8}>
                                    Profile complete
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        )}
                      />
                      <p className="text-xs text-muted-foreground">
                        Platform mapped fields are locked and will be filled from this student record.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Achievement Template *</Label>
                      <Select
                        value={
                          form.template_id && form.institution_id
                            ? `${form.template_id}:${form.institution_id}`
                            : ""
                        }
                        onValueChange={(value) => {
                          const [templateId, institutionId] = value.split(":");
                          setForm((current) => ({
                            ...current,
                            template_id: templateId,
                            institution_id: institutionId,
                          }));
                          resetPreviewState();
                        }}
                        disabled={!form.student_id || templatesLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              !form.student_id
                                ? "Select a student first"
                                : templatesLoading
                                  ? "Loading templates..."
                                  : "Select achievement template..."
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {templateOptions.map((template) => (
                            <SelectItem
                              key={`${template.id}:${template.institution_id}`}
                              value={`${template.id}:${template.institution_id}`}
                            >
                              {template.name}
                              {templateOptions.some(
                                (item) =>
                                  item.id === template.id &&
                                  item.institution_id !==
                                    template.institution_id,
                              )
                                ? ` — ${template.institution_name}`
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.student_id &&
                        !templatesLoading &&
                        templateOptions.length === 0 && (
                          <p className="text-xs font-medium text-destructive">
                            No active Achievement Certificate template is
                            assigned to this student&apos;s institution.
                          </p>
                        )}
                    </div>

                    <div className="space-y-2">
                      <Label>Achievement Date</Label>
                      <DatePicker
                        value={form.achievement_date}
                        onChange={(value) => {
                          setForm((current) => ({
                            ...current,
                            achievement_date: value,
                          }));
                          setCanvasImageSrc(null);
                        }}
                        placeholder="Pick date"
                      />
                      <p className="text-xs text-muted-foreground">
                        Optional. If empty,
                        {selectedTemplate?.default_date
                          ? ` the template default (${formatDate(selectedTemplate.default_date)}) is used.`
                          : " today’s date is used because this template has no default date."}
                      </p>
                    </div>

                    {previewDataLoading && (
                      <div className="flex items-center gap-2 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Preparing remaining fields...
                      </div>
                    )}

                    {!previewDataLoading &&
                      previewTemplate &&
                      editablePreviewFields.length === 0 && (
                        <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                          No extra fields are needed. The mapper, defaults, and
                          selected date can generate this certificate.
                        </div>
                      )}

                    {editablePreviewFields.map((field) => (
                      <div
                        key={field.field_name}
                        id={`achievement-preview-field-${field.field_name}`}
                        className="scroll-m-5 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <Label htmlFor={`achievement-${field.field_name}`}>
                            {field.label}
                            {field.is_required || field.field_type === "image"
                              ? " *"
                              : ""}
                          </Label>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {`{{${field.field_name}}}`}
                          </span>
                        </div>
                        {field.field_type === "textarea" ? (
                          <Textarea
                            id={`achievement-${field.field_name}`}
                            value={runtimeFieldValues[field.field_name] ?? ""}
                            onChange={(event) => {
                              setRuntimeFieldValues((current) => ({
                                ...current,
                                [field.field_name]: event.target.value,
                              }));
                              setCanvasImageSrc(null);
                            }}
                            className="bg-background"
                          />
                        ) : (
                          <Input
                            id={`achievement-${field.field_name}`}
                            type={
                              field.field_type === "image"
                                ? "url"
                                : field.field_type
                            }
                            value={runtimeFieldValues[field.field_name] ?? ""}
                            onChange={(event) => {
                              setRuntimeFieldValues((current) => ({
                                ...current,
                                [field.field_name]: event.target.value,
                              }));
                              setCanvasImageSrc(null);
                            }}
                            placeholder={
                              field.field_type === "image"
                                ? "Paste image URL"
                                : field.label
                            }
                            className="bg-background"
                          />
                        )}
                        {previewFieldErrors[field.field_name] && (
                          <p className="text-sm font-medium text-destructive">
                            {previewFieldErrors[field.field_name]}
                          </p>
                        )}
                      </div>
                    ))}

                    <div className="space-y-2 rounded-md border bg-card/40 p-4">
                      <Label>External Certificate Image (Optional)</Label>
                      <p className="text-xs text-muted-foreground">
                        Upload this only when the student already received a
                        certificate from a third party. Leave it empty when
                        creating the certificate digitally from this platform.
                      </p>
                      <DocumentFileUpload
                        accessToken={accessToken}
                        maxFiles={1}
                        files={certificateToFiles(form.certificate_url)}
                        onFilesChange={(files) =>
                          setForm((current) => ({
                            ...current,
                            certificate_url: files[0]?.url || "",
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Remarks (Optional)</Label>
                      <Textarea
                        value={form.remarks}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            remarks: event.target.value,
                          }))
                        }
                        placeholder="Add context, level, organizer, rank, or notes..."
                        rows={4}
                      />
                    </div>
                  </div>

                  <div className="shrink-0 border-t p-5 md:px-7">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        onClick={() => void showPreview()}
                        disabled={
                          previewDataLoading ||
                          renderingPreview ||
                          !form.student_id ||
                          !form.template_id
                        }
                        className="h-11 w-full font-semibold"
                      >
                        {renderingPreview ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Generating Design...
                          </>
                        ) : (
                          <>
                            <ImageIcon className="size-4" />
                            Generate Design
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={saveAchievement}
                        disabled={
                          saving ||
                          renderingPreview ||
                          previewDataLoading ||
                          !form.student_id ||
                          !form.template_id
                        }
                        className="h-11 w-full font-semibold"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="size-4" />
                            {form.id ? "Save Changes" : "Save Achievement"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </TemplateResizablePanel>

              <TemplateResizableHandle
                id={`achievement-preview-separator-${isPreviewMobile ? "mobile" : "desktop"}`}
              />

              <TemplateResizablePanel
                id={`achievement-preview-canvas-${isPreviewMobile ? "mobile" : "desktop"}`}
                defaultSize={isPreviewMobile ? "45%" : "66%"}
              >
                <div className="relative h-full min-w-0 bg-muted/20">
                  {renderingPreview ? (
                    <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="size-5 animate-spin" />
                      Rendering preview...
                    </div>
                  ) : (
                    <TemplateCanvasPreview
                      imageSrc={canvasImageSrc}
                      renderMode="persisted"
                    />
                  )}
                </div>
              </TemplateResizablePanel>
            </TemplateResizablePanelGroup>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
      >
        <SheetContent
          side="right"
          defaultSize={620}
          minSize={420}
          maxSize={900}
          resizeStorageKey="achievement-details-sheet-width"
          className="gap-0 overflow-hidden p-0"
        >
          <SheetHeader className="border-b border-border p-5 pr-14">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <Trophy className="size-5 text-destructive" />
              Achievement Details
            </SheetTitle>
            <SheetDescription>
              Complete achievement record for the selected student.
            </SheetDescription>
          </SheetHeader>
          {viewing && (
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                <div className="rounded-md border border-border bg-muted/20 p-4">
                  <div className="text-sm text-muted-foreground">
                    {viewing.student_name}
                  </div>
                  <h2 className="text-2xl font-semibold">{viewing.title}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="border-destructive/30 bg-destructive/10 text-destructive"
                    >
                      {viewing.category}
                    </Badge>
                    <Badge variant="outline">
                      {formatDate(viewing.achievement_date)}
                    </Badge>
                  </div>
                </div>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Student
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-border p-3">
                      <div className="text-xs text-muted-foreground">Name</div>
                      <div className="font-medium">{viewing.student_name}</div>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <div className="text-xs text-muted-foreground">Email</div>
                      <div className="break-all font-medium">
                        {viewing.student_email || "-"}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Media ({viewing.certificate_url ? 1 : 0})
                  </h3>
                  {viewing.certificate_url ? (
                    <div className="space-y-2">
                      <ImagePreviewSlider
                        images={[
                          {
                            src: viewing.certificate_url,
                            alt: `${viewing.title} certificate`,
                            type: "image",
                            poster: viewing.certificate_url,
                          },
                        ]}
                        previewWidth={640}
                        previewHeight={360}
                        className="aspect-video border border-border/70 bg-muted/20"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Click preview to open full media viewer
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                      No media uploaded for this achievement.
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Remarks
                  </h3>
                  <div className="rounded-md border border-border p-3">
                    <p
                      className={cn(
                        "whitespace-pre-wrap",
                        !viewing.remarks && "text-muted-foreground",
                      )}
                    >
                      {viewing.remarks || "No remarks added."}
                    </p>
                  </div>
                </section>

                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border p-3">
                    <div className="text-xs text-muted-foreground">Created</div>
                    <div className="font-medium">
                      {formatDate(viewing.created_at)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <div className="text-xs text-muted-foreground">
                      Last Updated
                    </div>
                    <div className="font-medium">
                      {formatDate(viewing.updated_at)}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={deleteTargets.length > 0}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) setDeleteTargets([]);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete achievement{deleteTargets.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleteTargets.length} selected
              achievement record{deleteTargets.length === 1 ? "" : "s"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteLoading}
              onClick={(event) => {
                event.preventDefault();
                void deleteAchievements();
              }}
            >
              {deleteLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
