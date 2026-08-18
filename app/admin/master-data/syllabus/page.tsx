"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  BookOpen,
  ChevronRight,
  Eye,
  GitBranch,
  Info,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthStore } from "@/store";
import type { Syllabus, SyllabusNode } from "@/lib/types/syllabus";

type SubjectOption = {
  id: number;
  label: string;
  name: string;
  board_name?: string | null;
  category_name?: string | null;
  category_path?: string | null;
  level?: number;
};

type InstitutionOption = {
  id: number;
  name: string;
};

type SyllabusForm = {
  subject_id: string;
  subject_label: string;
  title: string;
  description: string;
  version: string;
  is_active: boolean;
};

type NodeForm = {
  parent_id: string;
  parent_label: string;
  title: string;
  description: string;
  node_type: string;
  sort_order: string;
  estimated_hours: string;
  learning_outcomes: string;
};

const NODE_TYPES = [
  "term",
  "semester",
  "module",
  "unit",
  "chapter",
  "topic",
  "subtopic",
  "lesson",
  "section",
];

const blankSyllabusForm = (): SyllabusForm => ({
  subject_id: "",
  subject_label: "",
  title: "",
  description: "",
  version: "1",
  is_active: true,
});

const blankNodeForm = (): NodeForm => ({
  parent_id: "",
  parent_label: "",
  title: "",
  description: "",
  node_type: "chapter",
  sort_order: "0",
  estimated_hours: "",
  learning_outcomes: "",
});

function readError(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned an invalid response" };
  }
}

function flattenNodes(nodes: SyllabusNode[]) {
  const flat: SyllabusNode[] = [];
  const walk = (items: SyllabusNode[]) => {
    for (const item of items) {
      flat.push(item);
      walk(item.children ?? []);
    }
  };
  walk(nodes);
  return flat;
}

function formatNodeTypeLabel(node: SyllabusNode) {
  const nodeType = node.node_type
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const order = Number(node.sort_order);
  return Number.isFinite(order) && order > 0 ? `${nodeType} - ${order}` : nodeType;
}

function getInitialSyllabusUrlState() {
  if (typeof window === "undefined") {
    return { search: "", view: "my" as const };
  }

  const params = new URLSearchParams(window.location.search);
  const view: "my" | "marketplace" = params.get("view") === "marketplace" ? "marketplace" : "my";
  return {
    search: view === "marketplace" ? params.get("search") ?? "" : "",
    view,
  };
}

const inheritedBadgeClass =
  "border-emerald-500/70 bg-transparent px-1.5 py-0 text-[10px] font-medium text-emerald-400";

function getSyllabusInheritedLabel(syllabus: Syllabus, view: "my" | "marketplace") {
  if (view === "my" && syllabus.parent_syllabus_id) {
    if (syllabus.is_modified_inherited) return "Modified";
    return `Inherited from ${
      syllabus.parent_is_template || syllabus.parent_is_public
        ? "Marketplace"
        : syllabus.parent_institution_name ?? "Institution"
    }`;
  }
  if (view === "my" && syllabus.is_public) {
    return "Approved for marketplace";
  }
  if (view === "marketplace" && syllabus.inherited_by_institution_name) {
    return "Already inherited";
  }
  return null;
}

function getSyllabusInheritedSource(syllabus: Syllabus, view: "my" | "marketplace") {
  if (view === "my" && syllabus.parent_syllabus_id) {
    if (syllabus.is_modified_inherited) return null;
    return null;
  }
  if (view === "marketplace") {
    return null;
  }
  return null;
}

function SyllabusTree({ nodes, expandedNodeIds, canMutate, onToggleExpand, onAddChild, onEdit, onDelete, onToggle }: {
  nodes: SyllabusNode[];
  expandedNodeIds: Set<number>;
  canMutate: boolean;
  onToggleExpand: (nodeId: number) => void;
  onAddChild: (node: SyllabusNode) => void;
  onEdit: (node: SyllabusNode) => void;
  onDelete: (node: SyllabusNode) => void;
  onToggle: (node: SyllabusNode) => void;
}) {
  if (nodes.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No syllabus nodes added yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {nodes.map((node) => (
        <div key={node.id} className="rounded-md border bg-card/60 p-3">
          <div
            role="button"
            tabIndex={0}
            className="flex cursor-pointer items-start justify-between gap-3 rounded-sm outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onToggleExpand(node.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onToggleExpand(node.id);
              }
            }}
          >
            <div className="flex min-w-0 flex-1 gap-2">
              <ChevronRight
                className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform ${
                  expandedNodeIds.has(node.id) ? "rotate-90" : ""
                }`}
              />
              <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{node.title}</span>
                <Badge variant="outline">{formatNodeTypeLabel(node)}</Badge>
                {!node.is_active && <Badge variant="destructive">Disabled</Badge>}
              </div>
              {(node.children?.length ?? 0) > 0 && !expandedNodeIds.has(node.id) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {node.children?.length} child node{node.children?.length === 1 ? "" : "s"}
                </p>
              )}
              </div>
            </div>
            {canMutate && (
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddChild(node);
                  }}
                >
                  <Plus className="size-4" />
                  Child
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" onClick={(event) => event.stopPropagation()}>
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Node actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit(node)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggle(node)}>
                      {node.is_active ? "Disable" : "Enable"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete(node)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          {expandedNodeIds.has(node.id) && (
            <div className="ml-6 mt-3 space-y-3 border-l pl-4">
              {node.description && (
                <p className="text-sm text-muted-foreground">{node.description}</p>
              )}
              {node.learning_outcomes && (
                <p className="text-xs text-muted-foreground">Outcome: {node.learning_outcomes}</p>
              )}
              {node.children && node.children.length > 0 && (
              <SyllabusTree
                nodes={node.children}
                expandedNodeIds={expandedNodeIds}
                canMutate={canMutate}
                onToggleExpand={onToggleExpand}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggle={onToggle}
              />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SyllabusTreePanel({
  title,
  description,
  rootCount,
  tree,
  loading,
  canMutate,
  canUpdateFromParent,
  showViewParentButton,
  parentVersion,
  updateSaving,
  expandedNodeIds,
  onToggleExpand,
  onAddRoot,
  onUpdateFromParent,
  onViewParent,
  onAddChild,
  onEdit,
  onDelete,
  onToggle,
}: {
  title: string;
  description: string;
  rootCount: number;
  tree: SyllabusNode[];
  loading: boolean;
  canMutate: boolean;
  canUpdateFromParent: boolean;
  showViewParentButton: boolean;
  parentVersion: number | null;
  updateSaving: boolean;
  expandedNodeIds: Set<number>;
  onToggleExpand: (nodeId: number) => void;
  onAddRoot: () => void;
  onUpdateFromParent: () => void;
  onViewParent: () => void;
  onAddChild: (node: SyllabusNode) => void;
  onEdit: (node: SyllabusNode) => void;
  onDelete: (node: SyllabusNode) => void;
  onToggle: (node: SyllabusNode) => void;
}) {
  return (
    <>
      <div className="border-b px-5 py-5 text-left sm:px-6">
        <h2 className="pr-8 text-xl font-semibold leading-tight">{title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
        <div>
          <p className="text-sm font-medium">Syllabus Structure</p>
          <p className="text-xs text-muted-foreground">{rootCount} root node{rootCount === 1 ? "" : "s"}</p>
        </div>
        {canMutate && (
          <Button type="button" onClick={onAddRoot}>
            <Plus className="size-4" />
            Add Root Node
          </Button>
        )}
      </div>
      {canUpdateFromParent && (
        <div className="border-b bg-amber-500/10 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-300">
                Upgraded marketplace syllabus is available
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Updating to v{parentVersion} will replace this institution copy, including modified nodes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {showViewParentButton && (
                <Button type="button" variant="outline" onClick={onViewParent}>
                  <Eye className="size-4" />
                  View Syllabus
                </Button>
              )}
              <Button type="button" onClick={onUpdateFromParent} disabled={updateSaving}>
                {updateSaving ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Update Syllabus
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {loading ? (
          <div className="flex min-h-40 items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading tree...
          </div>
        ) : tree.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center">
            <BookOpen className="mb-3 size-8 text-muted-foreground" />
            <p className="font-medium">No syllabus nodes added yet.</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Start by adding a root node like Term 1, Semester 1, Module, or Unit.
            </p>
          </div>
        ) : (
          <SyllabusTree
            nodes={tree}
            expandedNodeIds={expandedNodeIds}
            canMutate={canMutate}
            onToggleExpand={onToggleExpand}
            onAddChild={onAddChild}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
          />
        )}
      </div>
    </>
  );
}

export default function SyllabusPage() {
  const { isReady } = useAdminGuard();
  const isMobile = useIsMobile();
  const { accessToken, user } = useAuthStore();
  const { activeInstitution, activeInstitutionId } = useActiveInstitution();
  const [initialUrlState] = useState(getInitialSyllabusUrlState);
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(-1);
  const [totalRows, setTotalRows] = useState(0);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [search, setSearch] = useState(initialUrlState.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initialUrlState.search);
  const [syllabusView, setSyllabusView] = useState<"my" | "marketplace">(initialUrlState.view);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSyllabus, setEditingSyllabus] = useState<Syllabus | null>(null);
  const [form, setForm] = useState<SyllabusForm>(() => blankSyllabusForm());
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeSyllabus, setActiveSyllabus] = useState<Syllabus | null>(null);
  const [tree, setTree] = useState<SyllabusNode[]>([]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<number>>(() => new Set());
  const [treeLoading, setTreeLoading] = useState(false);
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<SyllabusNode | null>(null);
  const [nodeForm, setNodeForm] = useState<NodeForm>(() => blankNodeForm());
  const [nodeSaving, setNodeSaving] = useState(false);
  const [inheritOpen, setInheritOpen] = useState(false);
  const [inheritSyllabus, setInheritSyllabus] = useState<Syllabus | null>(null);
  const [bulkInheritSyllabi, setBulkInheritSyllabi] = useState<Syllabus[]>([]);
  const [inheritInstitution, setInheritInstitution] = useState({ id: "", name: "" });
  const [inheritSaving, setInheritSaving] = useState(false);
  const [updateSaving, setUpdateSaving] = useState(false);
  const [loadingSourceSyllabusId, setLoadingSourceSyllabusId] = useState<number | null>(null);
  const [sourceViewUpdateTarget, setSourceViewUpdateTarget] = useState<Syllabus | null>(null);
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
  const [updateTargetSyllabus, setUpdateTargetSyllabus] = useState<Syllabus | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const isPlatformAdmin = Boolean(
    user?.is_super_admin || user?.role_codes?.includes("platform_admin")
  );
  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${accessToken}`,
  }), [accessToken]);
  const canMutateSyllabus = useCallback((syllabus: Syllabus) => (
    (isPlatformAdmin && syllabus.is_template) ||
    (!isPlatformAdmin && syllabusView === "my" && !syllabus.is_template)
  ), [isPlatformAdmin, syllabusView]);
  const isAlreadyInherited = useCallback((syllabus: Syllabus) => (
    !isPlatformAdmin &&
    syllabusView === "marketplace" &&
    Boolean(syllabus.inherited_by_institution_name)
  ), [isPlatformAdmin, syllabusView]);
  const canInheritSyllabus = useCallback((syllabus: Syllabus) => (
    syllabusView === "marketplace" && !isAlreadyInherited(syllabus)
  ), [isAlreadyInherited, syllabusView]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const fetchSyllabi = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search: debouncedSearch,
        view: syllabusView,
      });
      if (syllabusView === "marketplace" && activeInstitutionId) {
        params.set("activeInstitutionId", String(activeInstitutionId));
      }
      const res = await fetch(`/api/admin/master-data/syllabi?${params.toString()}`, {
        headers: authHeaders(),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch syllabi");
      setSyllabi(json.data ?? []);
      setPageCount(json.pageCount ?? -1);
      setTotalRows(Number(json.total ?? 0));
    } catch (err) {
      toast.error(readError(err));
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeInstitutionId, authHeaders, debouncedSearch, pagination.pageIndex, pagination.pageSize, syllabusView]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => {
      fetchSyllabi();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchSyllabi, isReady]);

  const fetchSubjects = useCallback(async (searchText: string, page: number) => {
    if (!accessToken) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      search: searchText,
      page: String(page),
      limit: "20",
    });
    const res = await fetch(`/api/admin/master-data/syllabi/subjects?${params.toString()}`, {
      headers: authHeaders(),
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to fetch subjects");
    return { data: json.data ?? [], hasMore: page < (json.pageCount ?? page) };
  }, [accessToken, authHeaders]);

  const fetchInstitutions = useCallback(async (searchText: string, page: number) => {
    if (!accessToken) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      search: searchText,
      page: String(page),
      limit: "10",
      isActive: "true",
    });
    const res = await fetch(`/api/admin/institutions/profiles?${params.toString()}`, {
      headers: authHeaders(),
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to fetch institutions");
    return { data: json.data ?? [], hasMore: page < (json.pageCount ?? page) };
  }, [accessToken, authHeaders]);

  const openCreateDialog = () => {
    setEditingSyllabus(null);
    setForm(blankSyllabusForm());
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!isReady) return;
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get("view");
    const requestedSearch = params.get("search") ?? "";
    const shouldOpenAdd = params.get("action") === "add";
    const shouldOpenMarketplace = requestedView === "marketplace";
    if (!shouldOpenAdd && !shouldOpenMarketplace) return;

    const subjectId = params.get("subjectId") ?? "";
    const subjectLabel = params.get("subjectLabel") ?? "";
    const timeout = window.setTimeout(() => {
      if (shouldOpenMarketplace) {
        setSyllabusView("marketplace");
        setSearch(requestedSearch);
        setDebouncedSearch(requestedSearch);
      }
      if (shouldOpenAdd) {
        setSyllabusView("my");
        setEditingSyllabus(null);
        setForm({
          ...blankSyllabusForm(),
          subject_id: subjectId,
          subject_label: subjectLabel,
          title: subjectLabel ? `${subjectLabel} Syllabus` : "",
        });
        setDialogOpen(true);
      }
      window.history.replaceState(null, "", window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isReady]);

  const openEditDialog = (syllabus: Syllabus) => {
    setEditingSyllabus(syllabus);
    setForm({
      subject_id: String(syllabus.subject_id),
      subject_label: [syllabus.category_name, syllabus.board_name, syllabus.subject_name].filter(Boolean).join(" -> "),
      title: syllabus.title,
      description: syllabus.description ?? "",
      version: String(syllabus.version),
      is_active: syllabus.is_active,
    });
    setDialogOpen(true);
  };

  const saveSyllabus = async () => {
    if (!accessToken) return;
    if (!form.subject_id || !form.title.trim()) {
      toast.error("Select subject and enter title");
      return;
    }
    setSaving(true);
    try {
      const body = {
        subject_id: Number(form.subject_id),
        title: form.title.trim(),
        description: form.description.trim(),
        version: Number(form.version) || 1,
        is_template: isPlatformAdmin,
        is_active: form.is_active,
      };
      const url = editingSyllabus
        ? `/api/admin/master-data/syllabi/${editingSyllabus.id}`
        : "/api/admin/master-data/syllabi";
      const res = await fetch(url, {
        method: editingSyllabus ? "PATCH" : "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to save syllabus");
      toast.success(editingSyllabus ? "Syllabus updated." : "Syllabus created.");
      setDialogOpen(false);
      fetchSyllabi();
    } catch (err) {
      toast.error(readError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleSyllabus = useCallback(async (syllabus: Syllabus) => {
    if (!accessToken) return;
    try {
      const res = await fetch(`/api/admin/master-data/syllabi/${syllabus.id}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !syllabus.is_active }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to update syllabus");
      toast.success(syllabus.is_active ? "Syllabus disabled." : "Syllabus enabled.");
      fetchSyllabi();
    } catch (err) {
      toast.error(readError(err));
    }
  }, [accessToken, authHeaders, fetchSyllabi]);

  const deleteSyllabusRow = useCallback(async (syllabus: Syllabus) => {
    if (!accessToken) return;
    try {
      const res = await fetch(`/api/admin/master-data/syllabi/${syllabus.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to delete syllabus");
      toast.success("Syllabus deleted.");
      fetchSyllabi();
    } catch (err) {
      toast.error(readError(err));
    }
  }, [accessToken, authHeaders, fetchSyllabi]);

  const bulkUpdateSyllabusStatus = useCallback(async (
    selectedRows: Syllabus[],
    isActive: boolean,
    resetSelection: () => void
  ) => {
    if (!accessToken) return;
    const mutableRows = selectedRows.filter(canMutateSyllabus);
    if (mutableRows.length === 0) {
      toast.error("Select syllabus rows you can edit.");
      return;
    }
    setBulkLoading(true);
    try {
      await Promise.all(mutableRows.map(async (syllabus) => {
        const res = await fetch(`/api/admin/master-data/syllabi/${syllabus.id}`, {
          method: "PATCH",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: isActive }),
        });
        const json = await readJson(res);
        if (!res.ok) throw new Error(json.error ?? "Failed to update selected syllabus");
      }));
      toast.success(`${mutableRows.length} syllabus ${isActive ? "enabled" : "disabled"}.`);
      resetSelection();
      fetchSyllabi();
    } catch (err) {
      toast.error(readError(err));
    } finally {
      setBulkLoading(false);
    }
  }, [accessToken, authHeaders, canMutateSyllabus, fetchSyllabi]);

  const bulkDeleteSyllabi = useCallback(async (selectedRows: Syllabus[], resetSelection: () => void) => {
    if (!accessToken) return;
    const mutableRows = selectedRows.filter(canMutateSyllabus);
    if (mutableRows.length === 0) {
      toast.error("Select syllabus rows you can delete.");
      return;
    }
    if (!window.confirm(`Delete ${mutableRows.length} selected syllabus row${mutableRows.length === 1 ? "" : "s"}?`)) return;
    setBulkLoading(true);
    try {
      await Promise.all(mutableRows.map(async (syllabus) => {
        const res = await fetch(`/api/admin/master-data/syllabi/${syllabus.id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        const json = await readJson(res);
        if (!res.ok) throw new Error(json.error ?? "Failed to delete selected syllabus");
      }));
      toast.success(`${mutableRows.length} syllabus deleted.`);
      resetSelection();
      fetchSyllabi();
    } catch (err) {
      toast.error(readError(err));
    } finally {
      setBulkLoading(false);
    }
  }, [accessToken, authHeaders, canMutateSyllabus, fetchSyllabi]);

  const fetchTree = useCallback(async (syllabus: Syllabus) => {
    if (!accessToken) return;
    setTreeLoading(true);
    try {
      const res = await fetch(`/api/admin/master-data/syllabi/${syllabus.id}/tree`, {
        headers: authHeaders(),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load syllabus tree");
      setTree(json.data ?? []);
    } catch (err) {
      toast.error(readError(err));
    } finally {
      setTreeLoading(false);
    }
  }, [accessToken, authHeaders]);

  const openTree = useCallback((syllabus: Syllabus) => {
    setSourceViewUpdateTarget(null);
    setActiveSyllabus(syllabus);
    setExpandedNodeIds(new Set());
    setSheetOpen(true);
    fetchTree(syllabus);
  }, [fetchTree]);

  const openTreeById = useCallback(async (syllabusId: number, updateTarget?: Syllabus | null) => {
    if (!accessToken) return;
    setLoadingSourceSyllabusId(syllabusId);
    try {
      const res = await fetch(`/api/admin/master-data/syllabi/${syllabusId}`, {
        headers: authHeaders(),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load syllabus");
      setSourceViewUpdateTarget(updateTarget ?? null);
      setActiveSyllabus(json.data as Syllabus);
      setExpandedNodeIds(new Set());
      setSheetOpen(true);
      fetchTree(json.data as Syllabus);
    } catch (err) {
      toast.error(readError(err));
    } finally {
      setLoadingSourceSyllabusId((current) => current === syllabusId ? null : current);
    }
  }, [accessToken, authHeaders, fetchTree]);

  const viewParentSyllabus = useCallback(() => {
    if (!activeSyllabus?.parent_syllabus_id) return;
    void openTreeById(activeSyllabus.parent_syllabus_id, activeSyllabus);
  }, [activeSyllabus, openTreeById]);

  const updateSyllabusFromParent = useCallback(async (syllabus: Syllabus) => {
    if (!accessToken) return;
    setUpdateSaving(true);
    try {
      const res = await fetch(
        `/api/admin/master-data/syllabi/${syllabus.id}/update-from-parent`,
        {
          method: "POST",
          headers: authHeaders(),
        }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to update syllabus");
      const detail = await fetch(`/api/admin/master-data/syllabi/${syllabus.id}`, {
        headers: authHeaders(),
      });
      const detailJson = await readJson(detail);
      if (!detail.ok) throw new Error(detailJson.error ?? "Failed to refresh syllabus");
      const updated = detailJson.data as Syllabus;
      setActiveSyllabus(updated);
      setSourceViewUpdateTarget(null);
      fetchTree(updated);
      fetchSyllabi();
      toast.success("Syllabus updated from marketplace.");
    } catch (err) {
      toast.error(readError(err));
    } finally {
      setUpdateSaving(false);
      setUpdateConfirmOpen(false);
      setUpdateTargetSyllabus(null);
    }
  }, [accessToken, authHeaders, fetchSyllabi, fetchTree]);

  const toggleNodeExpand = useCallback((nodeId: number) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const nodeOptions = useMemo(() => flattenNodes(tree), [tree]);

  const openNodeDialog = (parent?: SyllabusNode) => {
    setEditingNode(null);
    setNodeForm({
      ...blankNodeForm(),
      parent_id: parent ? String(parent.id) : "",
      parent_label: parent?.title ?? "",
    });
    setNodeDialogOpen(true);
  };

  const openEditNodeDialog = (node: SyllabusNode) => {
    const parent = node.parent_id ? nodeOptions.find((item) => item.id === node.parent_id) : null;
    setEditingNode(node);
    setNodeForm({
      parent_id: node.parent_id ? String(node.parent_id) : "",
      parent_label: parent?.title ?? "Root level",
      title: node.title,
      description: node.description ?? "",
      node_type: node.node_type,
      sort_order: String(node.sort_order ?? 0),
      estimated_hours: node.estimated_hours == null ? "" : String(node.estimated_hours),
      learning_outcomes: node.learning_outcomes ?? "",
    });
    setNodeDialogOpen(true);
  };

  const saveNode = async () => {
    if (!accessToken || !activeSyllabus) return;
    if (!nodeForm.title.trim()) {
      toast.error("Node title is required");
      return;
    }
    setNodeSaving(true);
    try {
      const res = await fetch(
        editingNode
          ? `/api/admin/master-data/syllabi/${activeSyllabus.id}/nodes/${editingNode.id}`
          : `/api/admin/master-data/syllabi/${activeSyllabus.id}/nodes`,
        {
        method: editingNode ? "PATCH" : "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(!editingNode ? { parent_id: nodeForm.parent_id ? Number(nodeForm.parent_id) : null } : {}),
          title: nodeForm.title.trim(),
          description: nodeForm.description.trim(),
          node_type: nodeForm.node_type,
          sort_order: Number(nodeForm.sort_order) || 0,
          estimated_hours: nodeForm.estimated_hours ? Number(nodeForm.estimated_hours) : null,
          learning_outcomes: nodeForm.learning_outcomes.trim(),
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to save node");
      toast.success(editingNode ? "Syllabus node updated." : "Syllabus node added.");
      setNodeDialogOpen(false);
      setEditingNode(null);
      fetchTree(activeSyllabus);
      fetchSyllabi();
    } catch (err) {
      toast.error(readError(err));
    } finally {
      setNodeSaving(false);
    }
  };

  const toggleNode = useCallback(async (node: SyllabusNode) => {
    if (!accessToken || !activeSyllabus) return;
    try {
      const res = await fetch(`/api/admin/master-data/syllabi/${activeSyllabus.id}/nodes/${node.id}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !node.is_active }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to update node");
      toast.success(node.is_active ? "Syllabus node disabled." : "Syllabus node enabled.");
      fetchTree(activeSyllabus);
      fetchSyllabi();
    } catch (err) {
      toast.error(readError(err));
    }
  }, [accessToken, activeSyllabus, authHeaders, fetchSyllabi, fetchTree]);

  const deleteNode = useCallback(async (node: SyllabusNode) => {
    if (!accessToken || !activeSyllabus) return;
    const childCount = node.children?.length ?? 0;
    const confirmed = window.confirm(
      childCount > 0
        ? `Delete "${node.title}" and its child nodes?`
        : `Delete "${node.title}"?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/master-data/syllabi/${activeSyllabus.id}/nodes/${node.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to delete node");
      toast.success("Syllabus node deleted.");
      fetchTree(activeSyllabus);
      fetchSyllabi();
    } catch (err) {
      toast.error(readError(err));
    }
  }, [accessToken, activeSyllabus, authHeaders, fetchSyllabi, fetchTree]);

  const inheritSyllabiToInstitution = useCallback(async (
    targets: Syllabus[],
    institution: { id: string; name: string }
  ) => {
    if (!accessToken) return;
    if (targets.length === 0) return;
    if (!institution.id) {
      toast.error("Select an institution");
      return;
    }
    setInheritSaving(true);
    try {
      await Promise.all(targets.map(async (syllabus) => {
        const res = await fetch(`/api/admin/master-data/syllabi/${syllabus.id}/inherit`, {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            institution_id: Number(institution.id),
            title: syllabus.title,
          }),
        });
        const json = await readJson(res);
        if (!res.ok) throw new Error(json.error ?? "Failed to inherit syllabus");
      }));
      toast.success(`${targets.length} syllabus ${targets.length === 1 ? "inherited" : "inherited"} for ${institution.name || "institution"}.`);
      setInheritOpen(false);
      setInheritSyllabus(null);
      setBulkInheritSyllabi([]);
      setInheritInstitution({ id: "", name: "" });
      await fetchSyllabi();
    } catch (err) {
      toast.error(readError(err));
    } finally {
      setInheritSaving(false);
    }
  }, [accessToken, authHeaders, fetchSyllabi]);

  const openOrRunInherit = useCallback((targets: Syllabus[]) => {
    if (targets.length === 0) return;
    if (activeInstitutionId) {
      void inheritSyllabiToInstitution(targets, {
        id: String(activeInstitutionId),
        name: activeInstitution?.name ?? "active institution",
      });
      return;
    }
    setInheritSyllabus(targets.length === 1 ? targets[0] : null);
    setBulkInheritSyllabi(targets.length > 1 ? targets : []);
    setInheritOpen(true);
  }, [activeInstitution?.name, activeInstitutionId, inheritSyllabiToInstitution]);

  const inheritTemplate = () => {
    const targets = bulkInheritSyllabi.length > 0
      ? bulkInheritSyllabi
      : inheritSyllabus
        ? [inheritSyllabus]
        : [];
    void inheritSyllabiToInstitution(targets, inheritInstitution);
  };

  const columns = useMemo<ColumnDef<Syllabus>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
          aria-label="Select all syllabi"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
          aria-label="Select syllabus"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "title",
      header: "Syllabus",
      cell: ({ row }) => {
        const inheritedLabel = getSyllabusInheritedLabel(row.original, syllabusView);
        const inheritedSource = getSyllabusInheritedSource(row.original, syllabusView);
        return (
          <div className="min-w-[300px]">
            <div className="font-semibold">{row.original.title}</div>
            <div className="text-xs text-muted-foreground">
              {[row.original.category_name ?? "Category", row.original.board_name ?? "Board", row.original.subject_name].join(" -> ")}
            </div>
            {(inheritedLabel || inheritedSource) && (
              <div className="mt-1 flex min-w-0">
                {inheritedLabel && (
                  <Badge variant="outline" className={`max-w-full ${inheritedBadgeClass}`}>
                    <span className="truncate">
                      {inheritedLabel}
                      {inheritedSource ? ` Under ${inheritedSource}` : ""}
                    </span>
                  </Badge>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "version",
      header: "Version",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline">v{row.original.version}</Badge>
          {row.original.upgrade_available && row.original.parent_syllabus_id ? (
            (() => {
              const parentId = Number(row.original.parent_syllabus_id);
              const sourceLoading = loadingSourceSyllabusId === parentId;
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 text-amber-300 hover:text-amber-200"
                      disabled={sourceLoading}
                      onClick={() => void openTreeById(parentId, row.original)}
                    >
                      {sourceLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Info className="size-4" />
                      )}
                      <span className="sr-only">
                        {sourceLoading ? "Loading upgraded syllabus" : "Upgrade available"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {sourceLoading
                      ? "Loading upgraded syllabus..."
                      : "Upgraded syllabus is available. View marketplace syllabus."}
                  </TooltipContent>
                </Tooltip>
              );
            })()
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={row.original.is_active ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}>
          {row.original.is_active ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const syllabus = row.original;
        const canMutateRow = canMutateSyllabus(syllabus);
        const canInheritRow = canInheritSyllabus(syllabus);
        const alreadyInheritedRow = isAlreadyInherited(syllabus);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openTree(syllabus)}>View sheet</DropdownMenuItem>
              {syllabus.upgrade_available && syllabus.parent_syllabus_id ? (
                <DropdownMenuItem onClick={() => void openTreeById(syllabus.parent_syllabus_id!, syllabus)}>
                  View source syllabus
                </DropdownMenuItem>
              ) : null}
              {canMutateRow && <DropdownMenuItem onClick={() => openEditDialog(syllabus)}>Edit</DropdownMenuItem>}
              {canInheritRow && (
                <DropdownMenuItem onClick={() => {
                  openOrRunInherit([syllabus]);
                }}>
                  Inherit
                </DropdownMenuItem>
              )}
              {alreadyInheritedRow && (
                <DropdownMenuItem disabled>
                  Already inherited
                </DropdownMenuItem>
              )}
              {canMutateRow && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => toggleSyllabus(syllabus)}>
                    {syllabus.is_active ? "Disable" : "Enable"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => deleteSyllabusRow(syllabus)}>
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [canInheritSyllabus, canMutateSyllabus, deleteSyllabusRow, isAlreadyInherited, loadingSourceSyllabusId, openOrRunInherit, openTree, openTreeById, syllabusView, toggleSyllabus]);

  const treePanelTitle = activeSyllabus?.title ?? "Syllabus Tree";
  const treePanelDescription = activeSyllabus?.subject_name
    ? `${activeSyllabus.subject_name} hierarchy. Add terms, units, chapters, topics, or lessons.`
    : "Add terms, units, chapters, topics, or lessons.";
  const canMutateActiveSyllabus = Boolean(
    activeSyllabus &&
    ((isPlatformAdmin && activeSyllabus.is_template) ||
      (!isPlatformAdmin && syllabusView === "my" && !activeSyllabus.is_template))
  );
  const directUpdateTarget = activeSyllabus &&
    !activeSyllabus.is_template &&
    activeSyllabus.parent_syllabus_id &&
    activeSyllabus.parent_syllabus_version &&
    activeSyllabus.parent_syllabus_version > activeSyllabus.version
      ? activeSyllabus
      : null;
  const sheetUpdateTarget = !isPlatformAdmin
    ? directUpdateTarget ?? sourceViewUpdateTarget
    : null;
  const canUpdateActiveSyllabus = Boolean(
    sheetUpdateTarget &&
    !isPlatformAdmin &&
    sheetUpdateTarget.parent_syllabus_id &&
    sheetUpdateTarget.parent_syllabus_version &&
    sheetUpdateTarget.parent_syllabus_version > sheetUpdateTarget.version
  );
  const treePanelContent = (
    <SyllabusTreePanel
      title={treePanelTitle}
      description={treePanelDescription}
      rootCount={tree.length}
      tree={tree}
      loading={treeLoading}
      canMutate={canMutateActiveSyllabus}
      canUpdateFromParent={canUpdateActiveSyllabus}
      showViewParentButton={Boolean(directUpdateTarget)}
      parentVersion={sheetUpdateTarget?.parent_syllabus_version ?? null}
      updateSaving={updateSaving}
      expandedNodeIds={expandedNodeIds}
      onToggleExpand={toggleNodeExpand}
      onAddRoot={() => openNodeDialog()}
      onUpdateFromParent={() => {
        if (!sheetUpdateTarget) return;
        setUpdateTargetSyllabus(sheetUpdateTarget);
        setUpdateConfirmOpen(true);
      }}
      onViewParent={viewParentSyllabus}
      onAddChild={openNodeDialog}
      onEdit={openEditNodeDialog}
      onDelete={deleteNode}
      onToggle={toggleNode}
    />
  );

  if (!isReady) {
    return <div className="text-muted-foreground">Loading syllabus module...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Syllabus</h1>
          <p className="text-muted-foreground">
            Manage institution syllabus copies and discover reusable templates.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Add Syllabus
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: "my", label: "My Syllabus" },
          { value: "marketplace", label: "Marketplace" },
        ].map((item) => (
          <Button
            key={item.value}
            type="button"
            variant={syllabusView === item.value ? "default" : "outline"}
            onClick={() => {
              setSyllabusView(item.value as "my" | "marketplace");
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={syllabi}
        loading={loading}
        manualPagination
        pageCount={pageCount}
        totalRows={totalRows}
        pagination={pagination}
        onPaginationChange={setPagination}
        getRowId={(row) => String(row.id)}
        selectionResetKey={`${syllabusView}:${debouncedSearch}:${pagination.pageSize}:${activeInstitutionId ?? ""}`}
        onRowClick={(row) => openTree(row)}
        toolbarLeft={
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search syllabus, subject, board..."
            className="w-full sm:w-80"
          />
        }
        toolbarRight={
          <Button type="button" variant="ghost" size="icon" onClick={fetchSyllabi} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            <span className="sr-only">{loading ? "Refreshing syllabus" : "Refresh syllabus"}</span>
          </Button>
        }
        selectedActions={(selectedRows, resetSelection) => (
          syllabusView === "marketplace" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={inheritSaving || selectedRows.filter((row) => !isAlreadyInherited(row)).length === 0}
              onClick={() => {
                const inheritableRows = selectedRows.filter((row) => !isAlreadyInherited(row));
                if (inheritableRows.length === 0) {
                  toast.info("Selected syllabus already inherited.");
                  return;
                }
                openOrRunInherit(inheritableRows);
              }}
            >
              {inheritSaving && <Loader2 className="size-4 animate-spin" />}
              {selectedRows.filter((row) => !isAlreadyInherited(row)).length === 0 ? "Already inherited" : "Inherit selected"}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkLoading}
                onClick={() => bulkUpdateSyllabusStatus(selectedRows, true, resetSelection)}
              >
                {bulkLoading && <Loader2 className="size-4 animate-spin" />}
                Enable
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkLoading}
                onClick={() => bulkUpdateSyllabusStatus(selectedRows, false, resetSelection)}
              >
                {bulkLoading && <Loader2 className="size-4 animate-spin" />}
                Disable
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={bulkLoading}
                onClick={() => bulkDeleteSyllabi(selectedRows, resetSelection)}
              >
                {bulkLoading && <Loader2 className="size-4 animate-spin" />}
                Delete
              </Button>
            </>
          )
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:!max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingSyllabus ? "Edit Syllabus" : "Add Syllabus"}</DialogTitle>
            <DialogDescription>
              Platform entries become templates. Institution copies are edited separately after inheritance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Subject</Label>
              <AsyncSearchPopover<SubjectOption>
                value={form.subject_id}
                selectedLabel={form.subject_label}
                onChange={(value) => setForm((prev) => ({ ...prev, subject_id: value }))}
                onSelectItem={(item) => setForm((prev) => ({
                  ...prev,
                  subject_id: String(item.id),
                  subject_label: item.label,
                  title: prev.title || `${item.name} Syllabus`,
                }))}
                fetcher={fetchSubjects}
                getValue={(item) => String(item.id)}
                getLabel={(item) => item.label}
                placeholder="Select subject"
                searchPlaceholder="Search category, board, subject..."
                emptyText="No level 4 subjects found"
                popoverClassName="w-[min(var(--radix-popover-trigger-width),calc(100vw-48px))] sm:w-[min(var(--radix-popover-trigger-width),calc(100vw-48px))]"
                renderItem={(item) => (
                  <div className="min-w-0 space-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">{item.name}</span>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        Level {item.level ?? 4}
                      </Badge>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[item.category_path ?? item.category_name, item.board_name]
                        .filter(Boolean)
                        .join(" -> ")}
                    </div>
                  </div>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="CBSE Mathematics"
              />
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Input
                value={form.version}
                onChange={(event) => setForm((prev) => ({ ...prev, version: event.target.value.replace(/\D/g, "") }))}
                placeholder="1"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Describe this syllabus template"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: Boolean(checked) }))}
              />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveSyllabus} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editingSyllabus ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isMobile ? (
        <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
          <DrawerContent className="max-h-[88dvh] overflow-hidden">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{treePanelTitle}</DrawerTitle>
              <DrawerDescription>{treePanelDescription}</DrawerDescription>
            </DrawerHeader>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {treePanelContent}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            className="flex w-full flex-col gap-0 overflow-hidden p-0"
            resizable
            defaultSize={760}
            minSize={420}
            maxSize={1040}
            resizeStorageKey="syllabus-structure-sheet-width"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{treePanelTitle}</SheetTitle>
              <SheetDescription>{treePanelDescription}</SheetDescription>
            </SheetHeader>
            {treePanelContent}
          </SheetContent>
        </Sheet>
      )}

      <AlertDialog
        open={updateConfirmOpen}
        onOpenChange={(open) => {
          setUpdateConfirmOpen(open);
          if (!open && !updateSaving) setUpdateTargetSyllabus(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update inherited syllabus?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Replace all existing edited syllabus with the new version syllabus?
                  Are you sure you want to update this?
                </p>
                <p className="font-medium text-destructive">
                  This action can&apos;t be undone later.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={updateSaving || !updateTargetSyllabus}
              onClick={(event) => {
                event.preventDefault();
                if (updateTargetSyllabus) {
                  void updateSyllabusFromParent(updateTargetSyllabus);
                }
              }}
            >
              {updateSaving && <Loader2 className="size-4 animate-spin" />}
              Update Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={nodeDialogOpen}
        onOpenChange={(open) => {
          setNodeDialogOpen(open);
          if (!open) setEditingNode(null);
        }}
      >
        <DialogContent className="flex max-h-[min(88dvh,760px)] flex-col gap-0 overflow-hidden p-0 sm:!max-w-2xl">
          <DialogHeader className="border-b px-6 py-5 text-left">
            <DialogTitle>{editingNode ? "Edit Syllabus Node" : "Add Syllabus Node"}</DialogTitle>
            <DialogDescription className="mt-2">
              {editingNode
                ? "Update this syllabus node. Parent movement is kept locked to preserve the hierarchy."
                : "Add a relational node to the syllabus hierarchy."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Parent</Label>
              {editingNode ? (
                <Input value={nodeForm.parent_label || "Root level"} disabled />
              ) : (
                <AsyncSearchPopover<SyllabusNode>
                  value={nodeForm.parent_id}
                  selectedLabel={nodeForm.parent_label}
                  onChange={(value) => setNodeForm((prev) => ({ ...prev, parent_id: value }))}
                  onSelectItem={(item) => setNodeForm((prev) => ({ ...prev, parent_id: String(item.id), parent_label: item.title }))}
                  items={nodeOptions}
                  localFilter
                  showDefaultOption
                  defaultOptionLabel="Root level"
                  defaultOptionValue=""
                  getValue={(item) => String(item.id)}
                  getLabel={(item) => item.title}
                  placeholder="Root level"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={nodeForm.title} onChange={(event) => setNodeForm((prev) => ({ ...prev, title: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Node Type</Label>
              <Select value={nodeForm.node_type} onValueChange={(value) => setNodeForm((prev) => ({ ...prev, node_type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NODE_TYPES.map((type) => <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input value={nodeForm.sort_order} onChange={(event) => setNodeForm((prev) => ({ ...prev, sort_order: event.target.value.replace(/\D/g, "") }))} />
            </div>
            <div className="space-y-2">
              <Label>Estimated Hours</Label>
              <Input value={nodeForm.estimated_hours} onChange={(event) => setNodeForm((prev) => ({ ...prev, estimated_hours: event.target.value.replace(/\D/g, "") }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={nodeForm.description} onChange={(event) => setNodeForm((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Learning Outcomes</Label>
              <Textarea value={nodeForm.learning_outcomes} onChange={(event) => setNodeForm((prev) => ({ ...prev, learning_outcomes: event.target.value }))} />
            </div>
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setNodeDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveNode} disabled={nodeSaving}>
              {nodeSaving && <Loader2 className="size-4 animate-spin" />}
              {editingNode ? "Save Changes" : "Add Node"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={inheritOpen}
        onOpenChange={(open) => {
          setInheritOpen(open);
          if (!open) {
            setInheritSyllabus(null);
            setBulkInheritSyllabi([]);
            setInheritInstitution({ id: "", name: "" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inherit Syllabus</DialogTitle>
            <DialogDescription>
              This copies {bulkInheritSyllabi.length > 0 ? `${bulkInheritSyllabi.length} selected syllabi` : "the selected syllabus"} and all nodes.
              Future edits will not affect the source syllabus.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Institution</Label>
            <AsyncSearchPopover<InstitutionOption>
              value={inheritInstitution.id}
              selectedLabel={inheritInstitution.name}
              onChange={(value) => setInheritInstitution((prev) => ({ ...prev, id: value }))}
              onSelectItem={(item) => setInheritInstitution({ id: String(item.id), name: item.name })}
              fetcher={fetchInstitutions}
              getValue={(item) => String(item.id)}
              getLabel={(item) => item.name}
              placeholder="Select institution"
              searchPlaceholder="Search institution..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInheritOpen(false)}>Cancel</Button>
            <Button onClick={inheritTemplate} disabled={inheritSaving}>
              {inheritSaving && <Loader2 className="size-4 animate-spin" />}
              <GitBranch className="size-4" />
              Inherit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
