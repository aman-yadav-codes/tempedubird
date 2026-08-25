"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  Braces,
  Eye,
  FileImage,
  ListPlus,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { CardTemplateGenerator } from "@/components/card-templates/card-template-generator";
import { CardTemplateFieldMapper } from "@/components/card-templates/card-template-field-mapper";
import { CardTemplateDefaultValues } from "@/components/card-templates/card-template-default-values";
import { CardTemplateTryout } from "@/components/card-templates/card-template-tryout";
import { ResponsiveHtmlCanvas } from "@/components/card-templates/responsive-html-canvas";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogClose,
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
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import type { DocumentTemplateRow } from "@/lib/types/document-template";
import { useAuthStore } from "@/store";

type CategoryOption = {
  id: number;
  name: string;
  target_audience?: "student" | "staff";
};

type InstitutionOption = {
  id: number;
  name: string;
};

type TemplateStats = {
  total: number;
  active: number;
  public: number;
};

type EditForm = {
  name: string;
  cardCategoryId: string;
  isPublic: boolean;
  isActive: boolean;
};

type ConfirmAction = {
  ids: number[];
  title: string;
  description: string;
  resetSelection?: () => void;
} | null;

const emptyStats: TemplateStats = {
  total: 0,
  active: 0,
  public: 0,
};

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned an invalid response" };
  }
}

function readError(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

const TRANSPARENT_PREVIEW_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

function escapePreviewText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function createSafeDetailPreview(template: DocumentTemplateRow) {
  return (template.fields ?? []).reduce((html, field) => {
    const replacement =
      field.field_type === "image"
        ? TRANSPARENT_PREVIEW_IMAGE
        : escapePreviewText(field.label);
    return html.replaceAll(`{{${field.field_name}}}`, replacement);
  }, template.html_template ?? "");
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card px-5 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function FieldPreparationBadge({ field }: { field: NonNullable<DocumentTemplateRow["fields"]>[number] }) {
  const preparation = field.preparation;
  if (preparation?.is_mapped) {
    return (
      <Badge variant="secondary" title={preparation.source_field_label ?? "Mapped field"}>
        Mapped
      </Badge>
    );
  }
  if (preparation?.has_default) {
    return <Badge variant="secondary">Default Set</Badge>;
  }
  if (preparation?.needs_action) {
    return <Badge variant="destructive">Needs Action</Badge>;
  }
  return null;
}

const inheritedBadgeClass =
  "border-emerald-500/70 bg-transparent px-1.5 py-0 text-[10px] font-medium text-emerald-400";

export default function CardTemplatesPage() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isInstitutionAdmin = isInstitutionAdminUser(user);
  const [canUseTemplate, setCanUseTemplate] = useState(false);
  const [rows, setRows] = useState<DocumentTemplateRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [stats, setStats] = useState<TemplateStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(-1);
  const [totalRows, setTotalRows] = useState(0);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [view, setView] = useState<"all" | "my" | "marketplace">("all");
  const effectiveView = isPlatformAdmin
    ? (view === "my" ? "all" : view)
    : (view === "all" ? "my" : view);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRefreshing, setDetailRefreshing] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<DocumentTemplateRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplateRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    cardCategoryId: "",
    isPublic: true,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigningTemplate, setAssigningTemplate] = useState<DocumentTemplateRow | null>(null);
  const [bulkAssigningTemplates, setBulkAssigningTemplates] = useState<DocumentTemplateRow[]>([]);
  const [assignInstitution, setAssignInstitution] = useState({ id: "", name: "" });
  const [assignSaving, setAssignSaving] = useState(false);
  const [tryoutOpen, setTryoutOpen] = useState(false);
  const [fieldMapperOpen, setFieldMapperOpen] = useState(false);
  const [defaultValuesOpen, setDefaultValuesOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removingTemplate, setRemovingTemplate] = useState<DocumentTemplateRow | null>(null);
  const [removeInstitution, setRemoveInstitution] = useState({ id: "", name: "" });
  const [removeSaving, setRemoveSaving] = useState(false);

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const fetchTemplates = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search: debouncedSearch,
        view: effectiveView,
      });
      if (!isPlatformAdmin && activeInstitution) {
        params.set("institutionId", String(activeInstitution.id));
      }
      const res = await fetch(
        `/api/admin/master-data/card-templates?${params.toString()}`,
        { headers: authHeaders() }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch card templates");
      setRows(json.data ?? []);
      setPageCount(json.pageCount ?? -1);
      setTotalRows(Number(json.total ?? 0));
      setStats(json.stats ?? emptyStats);
      setCanUseTemplate(Boolean(json.capabilities?.canAssign));
    } catch (err) {
      toast.error(readError(err));
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    authHeaders,
    debouncedSearch,
    pagination.pageIndex,
    pagination.pageSize,
    effectiveView,
    isPlatformAdmin,
    activeInstitution,
  ]);

  const fetchCategories = useCallback(async () => {
    if (!accessToken) return;
    const res = await fetch(
      "/api/admin/master-data/card-templates?action=categories",
      { headers: authHeaders() }
    );
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to fetch card categories");
    setCategories(json.data ?? []);
  }, [accessToken, authHeaders]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void fetchTemplates(), 0);
    return () => window.clearTimeout(timeout);
  }, [fetchTemplates, isReady]);

  useEffect(() => {
    if (!isReady || !isPlatformAdmin) return;
    const timeout = window.setTimeout(() => {
      void fetchCategories().catch((err) => toast.error(readError(err)));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchCategories, isPlatformAdmin, isReady]);

  const updateTemplates = useCallback(
    async (
      ids: number[],
      changes: { is_active?: boolean; is_public?: boolean },
      resetSelection?: () => void
    ) => {
      if (!accessToken || ids.length === 0) return;
      setBulkLoading(true);
      try {
        const res = await fetch("/api/admin/master-data/card-templates", {
          method: "PATCH",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ ids, ...changes }),
        });
        const json = await readJson(res);
        if (!res.ok) throw new Error(json.error ?? "Failed to update templates");
        toast.success(`${json.updated ?? ids.length} template(s) updated`);
        resetSelection?.();
        await fetchTemplates();
      } catch (err) {
        toast.error(readError(err));
      } finally {
        setBulkLoading(false);
      }
    },
    [accessToken, authHeaders, fetchTemplates]
  );

  const deleteTemplates = useCallback(async () => {
    if (!accessToken || !confirmAction) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/master-data/card-templates", {
        method: "DELETE",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ ids: confirmAction.ids }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to delete templates");
      toast.success(`${json.deleted ?? confirmAction.ids.length} template(s) deleted`);
      confirmAction.resetSelection?.();
      setConfirmAction(null);
      await fetchTemplates();
    } catch (err) {
      toast.error(readError(err));
    } finally {
      setBulkLoading(false);
    }
  }, [accessToken, authHeaders, confirmAction, fetchTemplates]);

  const loadTemplateDetails = useCallback(
    async (template: DocumentTemplateRow, options: { initial?: boolean } = {}) => {
      if (!accessToken) return;
      if (options.initial) {
        setDetailLoading(true);
      } else {
        setDetailRefreshing(true);
      }
      try {
        const params = new URLSearchParams({
          action: "detail",
          id: String(template.id),
        });
        if (!isPlatformAdmin && activeInstitution) {
          params.set("institutionId", String(activeInstitution.id));
        }
        const res = await fetch(
          `/api/admin/master-data/card-templates?${params.toString()}`,
          { headers: authHeaders() }
        );
        const json = await readJson(res);
        if (!res.ok) throw new Error(json.error ?? "Failed to fetch template");
        setActiveTemplate(json.data);
      } catch (err) {
        toast.error(readError(err));
      } finally {
        if (options.initial) {
          setDetailLoading(false);
        } else {
          setDetailRefreshing(false);
        }
      }
    },
    [accessToken, activeInstitution, authHeaders, isPlatformAdmin]
  );

  const openDetails = useCallback(
    async (template: DocumentTemplateRow) => {
      if (!accessToken) return;
      setActiveTemplate(template);
      setDetailOpen(true);
      await loadTemplateDetails(template, { initial: true });
    },
    [accessToken, loadTemplateDetails]
  );

  const handleTryoutTemplateUpdated = useCallback((updatedTemplate: DocumentTemplateRow) => {
    setActiveTemplate((current) =>
      current?.id === updatedTemplate.id ? { ...current, ...updatedTemplate } : current
    );
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === updatedTemplate.id ? { ...row, ...updatedTemplate } : row
      )
    );
  }, []);

  const openEdit = useCallback((template: DocumentTemplateRow) => {
    setEditingTemplate(template);
    setEditForm({
      name: template.name,
      cardCategoryId: String(template.card_category_id),
      isPublic: template.is_public,
      isActive: template.is_active,
    });
    setEditOpen(true);
  }, []);

  const fetchInstitutions = useCallback(async (searchText: string, page: number) => {
    if (!accessToken) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      search: searchText,
      page: String(page),
      limit: "10",
    });
    const res = await fetch(
      `/api/admin/master-data/card-templates/institutions?${params.toString()}`,
      { headers: authHeaders() }
    );
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to fetch institutions");
    return {
      data: (json.data ?? []) as InstitutionOption[],
      hasMore: Boolean(json.hasMore),
    };
  }, [accessToken, authHeaders]);

  const isAlreadyInherited = useCallback((template: DocumentTemplateRow) => (
    !isPlatformAdmin &&
    effectiveView === "marketplace" &&
    Boolean(template.is_assigned_to_active_institution || Number(template.assignment_count ?? 0) > 0)
  ), [effectiveView, isPlatformAdmin]);

  const canInheritTemplate = useCallback((template: DocumentTemplateRow) => (
    effectiveView === "marketplace" &&
    canUseTemplate &&
    template.is_public &&
    template.is_active &&
    (isPlatformAdmin || !isAlreadyInherited(template))
  ), [canUseTemplate, effectiveView, isAlreadyInherited, isPlatformAdmin]);

  const assignTemplatesToInstitution = useCallback(
    async (
      templates: DocumentTemplateRow[],
      institution: { id: number; name: string }
    ) => {
      if (!accessToken) return;
      if (templates.length === 0) return;
      if (!Number.isInteger(institution.id) || institution.id <= 0) {
        toast.error("Select an institution from the sidebar");
        return;
      }

      setAssignSaving(true);
      try {
        await Promise.all(templates.map(async (template) => {
          const res = await fetch("/api/admin/master-data/card-templates/assign", {
            method: "POST",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({
              institution_id: institution.id,
              template_id: template.id,
            }),
          });
          const json = await readJson(res);
          if (!res.ok) throw new Error(json.error ?? "Failed to use template");
        }));
        toast.success(
          `${templates.length} template${templates.length === 1 ? "" : "s"} added to ${institution.name}`
        );
        setAssignOpen(false);
        setAssigningTemplate(null);
        setBulkAssigningTemplates([]);
        await fetchTemplates();
      } catch (err) {
        toast.error(readError(err));
      } finally {
        setAssignSaving(false);
      }
    },
    [accessToken, authHeaders, fetchTemplates]
  );

  const openAssign = useCallback((templates: DocumentTemplateRow | DocumentTemplateRow[]) => {
    const targets = Array.isArray(templates) ? templates : [templates];
    if (targets.length === 0) return;
    if (!isPlatformAdmin) {
      if (!activeInstitution) {
        toast.error("Select an institution from the sidebar");
        return;
      }
      void assignTemplatesToInstitution(targets, {
        id: activeInstitution.id,
        name: activeInstitution.name,
      });
      return;
    }

    setAssigningTemplate(targets.length === 1 ? targets[0] : null);
    setBulkAssigningTemplates(targets.length > 1 ? targets : []);
    setAssignInstitution({ id: "", name: "" });
    setAssignOpen(true);
  }, [activeInstitution, assignTemplatesToInstitution, isPlatformAdmin]);

  async function assignTemplate() {
    const targets = bulkAssigningTemplates.length > 0
      ? bulkAssigningTemplates
      : assigningTemplate
        ? [assigningTemplate]
        : [];
    if (targets.length === 0 || !assignInstitution.id) {
      toast.error("Select an institution");
      return;
    }
    await assignTemplatesToInstitution(targets, {
      id: Number(assignInstitution.id),
      name: assignInstitution.name,
    });
  }

  const openRemove = useCallback((template: DocumentTemplateRow) => {
    const institutions = template.assigned_institutions ?? [];
    const first = institutions.length === 1 ? institutions[0] : null;
    setRemovingTemplate(template);
    setRemoveInstitution(
      first ? { id: String(first.id), name: first.name } : { id: "", name: "" }
    );
    setRemoveOpen(true);
  }, []);

  async function removeTemplateAssignment() {
    if (!accessToken || !removingTemplate || !removeInstitution.id) {
      toast.error("Select an institution");
      return;
    }
    setRemoveSaving(true);
    try {
      const res = await fetch("/api/admin/master-data/card-templates/assign", {
        method: "DELETE",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          institution_id: Number(removeInstitution.id),
          template_id: removingTemplate.id,
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to remove template");
      toast.success(`Template removed from ${removeInstitution.name}`);
      setRemoveOpen(false);
      await fetchTemplates();
    } catch (err) {
      toast.error(readError(err));
    } finally {
      setRemoveSaving(false);
    }
  }

  const removeTemplateAssignments = useCallback(async (
    templates: DocumentTemplateRow[],
    resetSelection?: () => void
  ) => {
    if (!accessToken) return;
    const targets = templates
      .map((template) => {
        const institution = activeInstitution
          ? { id: activeInstitution.id, name: activeInstitution.name }
          : template.assigned_institutions?.length === 1
            ? template.assigned_institutions[0]
            : null;
        return institution ? { template, institution } : null;
      })
      .filter((target): target is {
        template: DocumentTemplateRow;
        institution: { id: number; name: string };
      } => Boolean(target));

    if (targets.length === 0) {
      toast.error("Select an institution from the sidebar");
      return;
    }
    if (targets.length !== templates.length) {
      toast.error("Some selected templates need an institution selected first");
      return;
    }
    const confirmed = window.confirm(
      `Delete ${targets.length} selected template assignment${targets.length === 1 ? "" : "s"}?`
    );
    if (!confirmed) return;

    setBulkLoading(true);
    try {
      await Promise.all(targets.map(async ({ template, institution }) => {
        const res = await fetch("/api/admin/master-data/card-templates/assign", {
          method: "DELETE",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            institution_id: institution.id,
            template_id: template.id,
          }),
        });
        const json = await readJson(res);
        if (!res.ok) throw new Error(json.error ?? "Failed to remove template");
      }));
      toast.success(`${targets.length} template assignment${targets.length === 1 ? "" : "s"} deleted`);
      resetSelection?.();
      await fetchTemplates();
    } catch (err) {
      toast.error(readError(err));
    } finally {
      setBulkLoading(false);
    }
  }, [accessToken, activeInstitution, authHeaders, fetchTemplates]);

  async function saveMetadata() {
    if (!accessToken || !editingTemplate) return;
    if (!editForm.name.trim() || !editForm.cardCategoryId) {
      toast.error("Template name and category are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/master-data/card-templates/${editingTemplate.id}`,
        {
          method: "PATCH",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editForm.name.trim(),
            card_category_id: Number(editForm.cardCategoryId),
            is_public: editForm.isPublic,
            is_active: editForm.isActive,
          }),
        }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to save template");
      toast.success("Template updated");
      setEditOpen(false);
      await fetchTemplates();
    } catch (err) {
      toast.error(readError(err));
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo<ColumnDef<DocumentTemplateRow>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
          aria-label="Select all visible templates"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
          aria-label={`Select ${row.original.name}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Template",
      cell: ({ row }) => {
        const alreadyInheritedRow = isAlreadyInherited(row.original);
        const showInherited =
          effectiveView === "my" &&
          (row.original.assigned_institution_names?.length ?? 0) > 0;
        return (
          <button
            type="button"
            className="flex min-w-[260px] items-center gap-3 text-left"
            onClick={() => void openDetails(row.original)}
          >
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
              {row.original.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.original.thumbnail_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <FileImage className="size-5 text-muted-foreground" />
              )}
            </div>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{row.original.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {row.original.category_name}
              </span>
              {alreadyInheritedRow && (
                <Badge variant="outline" className={`mt-1 ${inheritedBadgeClass}`}>
                  Already inherited
                </Badge>
              )}
              {showInherited && (
                <span className="mt-1 flex min-w-0">
                  <Badge variant="outline" className={`max-w-full ${inheritedBadgeClass}`}>
                    <span className="truncate">Inherited from Marketplace</span>
                  </Badge>
                </span>
              )}
            </span>
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
      accessorKey: "field_count",
      header: "Fields",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Braces className="size-3.5" />
          {row.original.field_count}
        </span>
      ),
    },
    ...(isPlatformAdmin ? [{
      accessorKey: "generated_count",
      header: "Generated",
    } satisfies ColumnDef<DocumentTemplateRow>] : []),
    ...(isPlatformAdmin || effectiveView === "my" ? [{
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={
            row.original.is_active
              ? "bg-green-500/15 text-green-400"
              : "bg-red-500/15 text-red-400"
          }
        >
          {row.original.is_active ? "Active" : "Disabled"}
        </Badge>
      ),
    } satisfies ColumnDef<DocumentTemplateRow>] : []),
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const template = row.original;
        const alreadyInheritedRow = isAlreadyInherited(template);
        const canInheritRow = canInheritTemplate(template);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Template actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => void openDetails(template)}>
                <Eye className="size-4" />
                View sheet
              </DropdownMenuItem>
              {canInheritRow && (
                <DropdownMenuItem
                  disabled={assignSaving}
                  onClick={() => openAssign(template)}
                >
                  <Plus className="size-4" />
                  {isPlatformAdmin ? "Assign" : "Add Template"}
                </DropdownMenuItem>
              )}
              {alreadyInheritedRow && (
                <DropdownMenuItem disabled>
                  Already inherited
                </DropdownMenuItem>
              )}
              {!isPlatformAdmin && effectiveView === "my" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => openRemove(template)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              {isPlatformAdmin && (
                <>
                  <DropdownMenuItem onClick={() => openEdit(template)}>
                    Edit details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() =>
                      void updateTemplates(
                        [template.id],
                        { is_public: !template.is_public }
                      )
                    }
                  >
                    {template.is_public ? "Remove from marketplace" : "Publish to marketplace"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      void updateTemplates(
                        [template.id],
                        { is_active: !template.is_active }
                      )
                    }
                  >
                    {template.is_active ? "Disable" : "Enable"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() =>
                      setConfirmAction({
                        ids: [template.id],
                        title: "Delete card template?",
                        description:
                          "This removes the template and its detected fields. Assigned or generated templates cannot be deleted.",
                      })
                    }
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [
    canInheritTemplate,
    effectiveView,
    assignSaving,
    isAlreadyInherited,
    isPlatformAdmin,
    openAssign,
    openDetails,
    openEdit,
    openRemove,
    updateTemplates,
  ]);

  const detailPreparationSummary = useMemo(() => {
    const fields = activeTemplate?.fields ?? [];
    return {
      mapped: fields.filter((field) => field.preparation?.is_mapped).length,
      defaults: fields.filter((field) => !field.preparation?.is_mapped && field.preparation?.has_default).length,
      needsAction: fields.filter((field) => field.preparation?.needs_action).length,
    };
  }, [activeTemplate]);

  if (!isReady) {
    return <div className="text-muted-foreground">Loading card templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Card Templates</h1>
          <p className="text-muted-foreground">
            {isPlatformAdmin
              ? "Create AI document templates, assign them, and manage the marketplace."
              : "View templates assigned to your institutions and discover the marketplace."}
          </p>
        </div>
        {(isPlatformAdmin || isInstitutionAdmin) && (
          <Button onClick={() => setGeneratorOpen(true)}>
            <Plus className="size-4" />
            Add Template
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label={isPlatformAdmin ? "Total Templates" : "My Templates"}
          value={stats.total}
        />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Marketplace" value={stats.public} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={effectiveView === (isPlatformAdmin ? "all" : "my") ? "default" : "outline"}
          onClick={() => {
            setView(isPlatformAdmin ? "all" : "my");
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
        >
          {isPlatformAdmin ? "All Templates" : "My Templates"}
        </Button>
        <Button
          type="button"
          variant={effectiveView === "marketplace" ? "default" : "outline"}
          onClick={() => {
            setView("marketplace");
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
        >
          Marketplace
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        manualPagination
        pageCount={pageCount}
        totalRows={totalRows}
        pagination={pagination}
        onPaginationChange={setPagination}
        getRowId={(row) => String(row.id)}
        selectionResetKey={`${effectiveView}:${debouncedSearch}:${pagination.pageSize}:${activeInstitution?.id ?? ""}`}
        enableRowSelection={(row) =>
          isPlatformAdmin ||
          effectiveView === "my" ||
          (effectiveView === "marketplace" && canInheritTemplate(row.original))
        }
        onRowClick={(row) => void openDetails(row)}
        emptyText="No card templates found."
        toolbarLeft={
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search templates or categories..."
            className="w-full sm:w-80"
          />
        }
        toolbarRight={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void fetchTemplates()}
            disabled={loading}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            <span className="sr-only">Refresh templates</span>
          </Button>
        }
        selectedActions={(selectedRows, resetSelection) => {
          const ids = selectedRows.map((row) => row.id);
          if (effectiveView === "marketplace" && !isPlatformAdmin) {
            const inheritableRows = selectedRows.filter(canInheritTemplate);
            return (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={assignSaving || inheritableRows.length === 0}
                onClick={() => {
                  if (inheritableRows.length === 0) {
                    toast.info("Selected templates are already inherited.");
                    return;
                  }
                  openAssign(inheritableRows);
                  resetSelection();
                }}
              >
                {assignSaving && <Loader2 className="size-4 animate-spin" />}
                {inheritableRows.length === 0 ? "Already inherited" : "Inherit selected"}
              </Button>
            );
          }
          if (effectiveView === "my") {
            return (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={bulkLoading}
                onClick={() => void removeTemplateAssignments(selectedRows, resetSelection)}
              >
                {bulkLoading && <Loader2 className="size-4 animate-spin" />}
                Delete
              </Button>
            );
          }
          if (!isPlatformAdmin) return null;
          if (effectiveView === "marketplace") {
            return (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={assignSaving}
                onClick={() => {
                  openAssign(selectedRows);
                  resetSelection();
                }}
              >
                {assignSaving && <Loader2 className="size-4 animate-spin" />}
                Assign selected
              </Button>
            );
          }
          return (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkLoading}
                onClick={() =>
                  void updateTemplates(ids, { is_public: true }, resetSelection)
                }
              >
                Publish
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkLoading}
                onClick={() =>
                  void updateTemplates(ids, { is_public: false }, resetSelection)
                }
              >
                Unpublish
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkLoading}
                onClick={() =>
                  void updateTemplates(ids, { is_active: true }, resetSelection)
                }
              >
                Enable
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkLoading}
                onClick={() =>
                  void updateTemplates(ids, { is_active: false }, resetSelection)
                }
              >
                Disable
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={bulkLoading}
                onClick={() =>
                  setConfirmAction({
                    ids,
                    title: `Delete ${ids.length} card templates?`,
                    description:
                      "Assigned or generated templates will be protected and the operation will stop.",
                    resetSelection,
                  })
                }
              >
                Delete
              </Button>
            </>
          );
        }}
      />

      <Dialog
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) {
            setAssigningTemplate(null);
            setBulkAssigningTemplates([]);
            setAssignInstitution({ id: "", name: "" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isPlatformAdmin ? "Assign Template" : "Add Template"}</DialogTitle>
            <DialogDescription>
              {isPlatformAdmin ? "Assign" : "Add"}{" "}
              {bulkAssigningTemplates.length > 0
                ? `${bulkAssigningTemplates.length} selected templates`
                : assigningTemplate?.name ?? "this template"} to an institution.
              Existing assignments will not be duplicated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Institution</Label>
            <AsyncSearchPopover<InstitutionOption>
              value={assignInstitution.id}
              selectedLabel={assignInstitution.name}
              onChange={(value) =>
                setAssignInstitution((current) => ({ ...current, id: value }))
              }
              onSelectItem={(institution) =>
                setAssignInstitution({
                  id: String(institution.id),
                  name: institution.name,
                })
              }
              fetcher={fetchInstitutions}
              getValue={(institution) => String(institution.id)}
              getLabel={(institution) => institution.name}
              placeholder="Select institution"
              searchPlaceholder="Search your institutions..."
              emptyText="No accessible institutions found"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssignOpen(false)}
              disabled={assignSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void assignTemplate()}
              disabled={assignSaving || !assignInstitution.id}
            >
              {assignSaving && <Loader2 className="size-4 animate-spin" />}
              {isPlatformAdmin ? "Assign" : "Add Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={removeOpen}
        onOpenChange={(open) => {
          setRemoveOpen(open);
          if (!open) {
            setRemovingTemplate(null);
            setRemoveInstitution({ id: "", name: "" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template Assignment</DialogTitle>
            <DialogDescription>
              Remove {removingTemplate?.name ?? "this template"} from an institution.
              The marketplace template itself will not be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Institution</Label>
            <Select
              value={removeInstitution.id}
              onValueChange={(value) => {
                const institution = removingTemplate?.assigned_institutions?.find(
                  (item) => String(item.id) === value
                );
                setRemoveInstitution({
                  id: value,
                  name: institution?.name ?? "",
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select institution" />
              </SelectTrigger>
              <SelectContent>
                {(removingTemplate?.assigned_institutions ?? []).map((institution) => (
                  <SelectItem key={institution.id} value={String(institution.id)}>
                    {institution.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoveOpen(false)}
              disabled={removeSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void removeTemplateAssignment()}
              disabled={removeSaving || !removeInstitution.id}
            >
              {removeSaving && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={generatorOpen} onOpenChange={setGeneratorOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[90dvh] max-h-[900px] w-[94vw] max-w-[1400px] flex-col gap-0 overflow-hidden rounded-lg border p-0 sm:max-w-[1400px] sm:p-0"
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="flex h-14 shrink-0 flex-row items-center justify-between border-b bg-background px-5 text-foreground">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Create Card Template
              </DialogTitle>
              <DialogDescription className="sr-only">
                Upload a reference image and generate an AI document template.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon">
                <X className="size-4" />
                <span className="sr-only">Close template generator</span>
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="min-h-0 flex-1">
            <CardTemplateGenerator
              accessToken={accessToken}
              categories={categories}
              onSaved={() => {
                setGeneratorOpen(false);
                void fetchTemplates();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent
          className="flex w-full flex-col gap-0 overflow-hidden p-0"
          resizable
          defaultSize={760}
          minSize={420}
          maxSize={1060}
          resizeStorageKey="card-template-detail-sheet-width"
        >
          <SheetHeader className="border-b px-6 py-5 pr-14">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <SheetTitle>{activeTemplate?.name ?? "Card Template"}</SheetTitle>
                <SheetDescription>
                  {activeTemplate?.category_name ?? "Template details and detected fields"}
                </SheetDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {activeTemplate && !detailLoading && (
                  <>
                    <Badge
                      variant={detailPreparationSummary.needsAction ? "destructive" : "outline"}
                      className={
                        detailPreparationSummary.needsAction
                          ? undefined
                          : "border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }
                    >
                      {detailPreparationSummary.needsAction
                        ? "Not Ready to Use"
                        : "Ready to Use"}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => void loadTemplateDetails(activeTemplate)}
                      disabled={detailRefreshing}
                      title="Refresh sheet data"
                      aria-label="Refresh sheet data"
                    >
                      <RefreshCw
                        className={`size-4 ${detailRefreshing ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {detailLoading ? (
              <div className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading template...
              </div>
            ) : activeTemplate ? (
              <div className="space-y-6">
                <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
                  <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-md border bg-muted">
                    {activeTemplate.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeTemplate.thumbnail_url}
                        alt={activeTemplate.name}
                        className="max-h-80 w-full object-contain"
                      />
                    ) : (
                      <FileImage className="size-12 text-muted-foreground" />
                    )}
                  </div>
                  <div className="grid content-start gap-3 sm:grid-cols-2">
                    <div className="rounded-md border p-4">
                      <p className="text-xs text-muted-foreground">Visibility</p>
                      <p className="mt-1 font-medium">
                        {activeTemplate.is_public ? "Marketplace" : "Private"}
                      </p>
                    </div>
                    <div className="rounded-md border p-4">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="mt-1 font-medium">
                        {activeTemplate.is_active ? "Active" : "Disabled"}
                      </p>
                    </div>
                    <div className="rounded-md border p-4">
                      <p className="text-xs text-muted-foreground">Institutions</p>
                      <p className="mt-1 text-xl font-semibold">
                        {activeTemplate.assignment_count}
                      </p>
                    </div>
                    <div className="rounded-md border p-4">
                      <p className="text-xs text-muted-foreground">Documents Generated</p>
                      <p className="mt-1 text-xl font-semibold">
                        {activeTemplate.generated_count}
                      </p>
                    </div>
                    <div className="rounded-md border p-4 sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Last Updated</p>
                      <p className="mt-1 font-medium">
                        {formatDate(activeTemplate.updated_at)}
                        {activeTemplate.updated_by_name
                          ? ` by ${activeTemplate.updated_by_name}`
                          : ""}
                      </p>
                    </div>
                    {isPlatformAdmin && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setFieldMapperOpen(true)}
                        disabled={(activeTemplate.fields?.length ?? 0) === 0}
                      >
                        <Braces className="size-4 text-primary" />
                        Map Fields
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setDetailOpen(false);
                        setTryoutOpen(true);
                      }}
                      disabled={!activeTemplate.html_template}
                    >
                      <Sparkles className="size-4 text-primary" />
                      Try Now
                    </Button>
                    {isInstitutionAdmin &&
                      Number(activeTemplate.assignment_count ?? 0) > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => setDefaultValuesOpen(true)}
                          disabled={(activeTemplate.fields?.length ?? 0) === 0}
                        >
                          <ListPlus className="size-4 text-primary" />
                          Set Default Values
                        </Button>
                      )}
                    {canUseTemplate &&
                      activeTemplate.is_public &&
                      activeTemplate.is_active &&
                      (isPlatformAdmin || canInheritTemplate(activeTemplate)) && (
                      <Button
                        type="button"
                        className="w-full"
                        disabled={assignSaving}
                        onClick={() => {
                          setDetailOpen(false);
                          openAssign(activeTemplate);
                        }}
                      >
                        <Plus className="size-4" />
                        {isPlatformAdmin ? "Assign" : "Add Template"}
                      </Button>
                    )}
                    {isAlreadyInherited(activeTemplate) && (
                      <Badge variant="outline" className={`w-full justify-center ${inheritedBadgeClass}`}>
                        Already inherited
                      </Badge>
                    )}
                  </div>
                </div>

                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">Detected Fields</h2>
                      <p className="text-sm text-muted-foreground">
                        Placeholders used by the generated HTML.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      <Badge variant="outline">{activeTemplate.fields?.length ?? 0} fields</Badge>
                      <Badge variant="secondary">{detailPreparationSummary.mapped} mapped</Badge>
                      <Badge variant="secondary">{detailPreparationSummary.defaults} defaults</Badge>
                      {detailPreparationSummary.needsAction > 0 && (
                        <Badge variant="destructive">
                          {detailPreparationSummary.needsAction} need action
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="divide-y rounded-md border">
                    {(activeTemplate.fields ?? []).map((field) => (
                      <div
                        key={field.id ?? field.field_name}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{field.label}</p>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {`{{${field.field_name}}}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <FieldPreparationBadge field={field} />
                          <Badge variant="outline">{field.field_type}</Badge>
                          {field.is_required && <Badge>Required</Badge>}
                        </div>
                      </div>
                    ))}
                    {(activeTemplate.fields?.length ?? 0) === 0 && (
                      <p className="p-5 text-center text-sm text-muted-foreground">
                        No dynamic fields detected.
                      </p>
                    )}
                  </div>
                </section>

                {activeTemplate.html_template && (
                  <section>
                    <h2 className="mb-3 font-semibold">HTML Preview</h2>
                    <ResponsiveHtmlCanvas
                      html={createSafeDetailPreview(activeTemplate)}
                      title={`${activeTemplate.name} HTML preview`}
                    />
                  </section>
                )}
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={tryoutOpen} onOpenChange={setTryoutOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[90dvh] max-h-[900px] w-[94vw] max-w-[1400px] flex-col gap-0 overflow-hidden rounded-lg border p-0 sm:max-w-[1400px] sm:p-0"
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="flex h-14 shrink-0 flex-row items-center justify-between border-b bg-background px-5 text-foreground">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Try {activeTemplate?.name ?? "Card Template"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Populate template fields and generate a temporary preview.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon">
                <X className="size-4" />
                <span className="sr-only">Close template tryout</span>
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="min-h-0 flex-1">
            {activeTemplate && (
              <CardTemplateTryout
                key={activeTemplate.id}
                template={activeTemplate}
                accessToken={accessToken}
                isInstitutionTryout={!isPlatformAdmin}
                institutionId={!isPlatformAdmin ? activeInstitution?.id ?? null : null}
                canEditTemplate={isPlatformAdmin}
                onTemplateUpdated={handleTryoutTemplateUpdated}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CardTemplateFieldMapper
        open={fieldMapperOpen}
        onOpenChange={(open) => {
          setFieldMapperOpen(open);
          if (!open && activeTemplate) void loadTemplateDetails(activeTemplate);
        }}
        template={activeTemplate}
        accessToken={accessToken}
      />

      <CardTemplateDefaultValues
        open={defaultValuesOpen}
        onOpenChange={(open) => {
          setDefaultValuesOpen(open);
          if (!open && activeTemplate) void loadTemplateDetails(activeTemplate);
        }}
        template={activeTemplate}
        accessToken={accessToken}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Card Template</DialogTitle>
            <DialogDescription>
              Update marketplace metadata without duplicating template HTML.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Card Category</Label>
              <Select
                value={editForm.cardCategoryId}
                onValueChange={(value) =>
                  setEditForm((current) => ({
                    ...current,
                    cardCategoryId: value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={editForm.isPublic}
                onCheckedChange={(value) =>
                  setEditForm((current) => ({
                    ...current,
                    isPublic: Boolean(value),
                  }))
                }
              />
              Publish to marketplace
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={editForm.isActive}
                onCheckedChange={(value) =>
                  setEditForm((current) => ({
                    ...current,
                    isActive: Boolean(value),
                  }))
                }
              />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveMetadata()} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open && !bulkLoading) setConfirmAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction?.title}</DialogTitle>
            <DialogDescription>{confirmAction?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={bulkLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deleteTemplates()}
              disabled={bulkLoading}
            >
              {bulkLoading && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
