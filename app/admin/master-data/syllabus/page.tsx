"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  Eye,
  FileText,
  FolderPlus,
  GitBranch,
  GraduationCap,
  Info,
  Layers,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
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
import { useProgressiveSave } from "@/hooks/use-progressive-save";
import { ProgressiveSaveIndicator } from "@/components/shared/progressive-save-indicator";
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

  // Course / Program & Subject Tabs State
  type CourseOption = {
    id: number;
    name: string;
    code?: string | null;
    category_name?: string | null;
    board_name?: string | null;
    university_name?: string | null;
    certification_provider_name?: string | null;
    authority_type?: string | null;
  };

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedCourseName, setSelectedCourseName] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [subjectsList, setSubjectsList] = useState<Array<{
    id: number;
    name: string;
    code?: string | null;
    icon_url?: string | null;
    course_id?: number | null;
    course_name?: string | null;
    category_name?: string | null;
    board_name?: string | null;
    term_type?: string | null;
    term_number?: number | null;
    term_name?: string | null;
  }>>([]);
  const [loadingSubjectsList, setLoadingSubjectsList] = useState(false);
  const [subjectFilterSearch, setSubjectFilterSearch] = useState("");
  const [activeSubjectTermFilter, setActiveSubjectTermFilter] = useState<string>("all");

  // Curriculum Builder (Module / Unit / Chapter / Lesson / Topic) State
  type DraftSyllabusNode = {
    id: string;
    parentId: string | null;
    node_type: "module" | "unit" | "chapter" | "lesson" | "topic";
    title: string;
    duration_value?: string;
    duration_unit?: "hours" | "minutes" | "days";
    estimated_hours?: string;
    learning_outcomes?: string;
  };

  // Map of subjectId -> DraftSyllabusNode[] for individual subject tabs
  const [subjectNodesMap, setSubjectNodesMap] = useState<Record<string, DraftSyllabusNode[]>>({});

  const { saveStatus: progressiveStatus, clearDraft: clearSyllabusDraft } = useProgressiveSave({
    formKey: `syllabus:${editingSyllabus?.id || form.subject_id || "new"}`,
    formState: { form, subjectNodesMap },
    enabled: dialogOpen,
  });
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(new Set());

  // Top add bar inputs
  const [newNodeType, setNewNodeType] = useState<"module" | "unit" | "chapter" | "lesson" | "topic">("unit");
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [newNodeParentId, setNewNodeParentId] = useState<string>("root");
  const [newNodeDurationValue, setNewNodeDurationValue] = useState("");
  const [newNodeDurationUnit, setNewNodeDurationUnit] = useState<"hours" | "minutes" | "days">("hours");

  // Inline add state inside accordion
  const [inlineAddTargetId, setInlineAddTargetId] = useState<string | null>(null);
  const [inlineAddType, setInlineAddType] = useState<"chapter" | "lesson" | "topic">("lesson");
  const [inlineAddTitle, setInlineAddTitle] = useState("");
  const [inlineAddDurationValue, setInlineAddDurationValue] = useState("");
  const [inlineAddDurationUnit, setInlineAddDurationUnit] = useState<"hours" | "minutes" | "days">("hours");

  // Quick bulk paste
  const [bulkPasteOpen, setBulkPasteOpen] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [bulkPasteType, setBulkPasteType] = useState<"module" | "unit" | "chapter" | "lesson" | "topic">("chapter");

  const currentSubjectNodes = useMemo(() => {
    return (form.subject_id && subjectNodesMap[form.subject_id]) || [];
  }, [form.subject_id, subjectNodesMap]);

  function formatNodeDuration(node: DraftSyllabusNode) {
    if (node.duration_value) {
      const unitLabel =
        node.duration_unit === "minutes"
          ? "mins"
          : node.duration_unit === "days"
          ? "days"
          : "hrs";
      return `${node.duration_value} ${unitLabel}`;
    }
    if (node.estimated_hours) {
      return `${node.estimated_hours} hrs`;
    }
    return null;
  }

  const toggleAccordion = (nodeId: string) => {
    setExpandedAccordions((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const addDraftNode = (
    type?: "module" | "unit" | "chapter" | "lesson" | "topic",
    title?: string,
    parentId?: string | null,
    durationVal?: string,
    durationUnit?: "hours" | "minutes" | "days"
  ) => {
    if (!form.subject_id) {
      toast.error("Please select a subject first");
      return;
    }
    const finalType = type || newNodeType;
    const finalTitle = (title !== undefined ? title : newNodeTitle).trim();
    const finalParentId = parentId !== undefined ? parentId : (newNodeParentId === "root" ? null : newNodeParentId);
    const finalDurationVal = (durationVal !== undefined ? durationVal : newNodeDurationValue).trim();
    const finalDurationUnit = durationUnit || (durationVal !== undefined ? "hours" : newNodeDurationUnit);

    if (!finalTitle) {
      toast.error("Please enter a title");
      return;
    }

    // Calculate approximate estimated_hours for database storage
    let calculatedHours: string | undefined = undefined;
    if (finalDurationVal) {
      const num = Number(finalDurationVal);
      if (Number.isFinite(num) && num > 0) {
        if (finalDurationUnit === "minutes") {
          calculatedHours = (num / 60).toFixed(2);
        } else if (finalDurationUnit === "days") {
          calculatedHours = (num * 6).toFixed(1);
        } else {
          calculatedHours = String(num);
        }
      }
    }

    const newNode: DraftSyllabusNode = {
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      parentId: finalParentId,
      node_type: finalType,
      title: finalTitle,
      duration_value: finalDurationVal || undefined,
      duration_unit: finalDurationUnit,
      estimated_hours: calculatedHours,
    };

    setSubjectNodesMap((prev) => {
      const existing = prev[form.subject_id] || [];
      return {
        ...prev,
        [form.subject_id]: [...existing, newNode],
      };
    });

    if (finalParentId) {
      setExpandedAccordions((prev) => new Set(prev).add(finalParentId));
    }

    setNewNodeTitle("");
    setNewNodeDurationValue("");
    setInlineAddTargetId(null);
    setInlineAddTitle("");
    setInlineAddDurationValue("");
    setSaveStatus("saved");
    toast.success(`Added ${finalType.toUpperCase()}: "${finalTitle}"`);
  };

  const removeDraftNode = (id: string) => {
    if (!form.subject_id) return;
    setSubjectNodesMap((prev) => {
      const existing = prev[form.subject_id] || [];
      const removeIds = new Set<string>([id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const n of existing) {
          if (n.parentId && removeIds.has(n.parentId) && !removeIds.has(n.id)) {
            removeIds.add(n.id);
            changed = true;
          }
        }
      }
      return {
        ...prev,
        [form.subject_id]: existing.filter((n) => !removeIds.has(n.id)),
      };
    });
    setSaveStatus("saved");
    toast.success("Removed curriculum item.");
  };

  const applyBulkPaste = () => {
    if (!form.subject_id || !bulkPasteText.trim()) return;
    const lines = bulkPasteText
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const parentId = newNodeParentId === "root" ? null : newNodeParentId;
    const newItems: DraftSyllabusNode[] = lines.map((line, idx) => ({
      id: `draft-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      parentId,
      node_type: bulkPasteType,
      title: line,
    }));

    setSubjectNodesMap((prev) => {
      const existing = prev[form.subject_id] || [];
      return {
        ...prev,
        [form.subject_id]: [...existing, ...newItems],
      };
    });

    if (parentId) {
      setExpandedAccordions((prev) => new Set(prev).add(parentId));
    }

    setBulkPasteText("");
    setBulkPasteOpen(false);
    setSaveStatus("saved");
    toast.success(`Added ${newItems.length} ${bulkPasteType}(s) to curriculum.`);
  };

  function formatCourseOptionLabel(c: CourseOption) {
    const affiliation = c.board_name || c.university_name || c.certification_provider_name;
    if (affiliation) {
      return `${c.name} (${affiliation})${c.code ? ` • ${c.code}` : ""}`;
    }
    if (c.category_name) {
      return `${c.name} • ${c.category_name}${c.code ? ` (${c.code})` : ""}`;
    }
    return `${c.name}${c.code ? ` (${c.code})` : ""}`;
  }

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

  const fetchCoursesList = useCallback(async () => {
    if (!accessToken) return;
    setLoadingCourses(true);
    try {
      const res = await fetch("/api/admin/content/courses?limit=100", {
        headers: authHeaders(),
      });
      const json = await readJson(res);
      if (res.ok && Array.isArray(json.data)) {
        setCourses(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch courses", err);
    } finally {
      setLoadingCourses(false);
    }
  }, [accessToken, authHeaders]);

  const fetchSubjectsList = useCallback(async (courseId?: string, categoryId?: string) => {
    if (!accessToken) return;
    setLoadingSubjectsList(true);
    try {
      // 1. If course is selected, fetch the course's exact mapped subjects
      if (courseId && courseId !== "all" && courseId !== "") {
        const courseRes = await fetch(`/api/admin/content/courses/${courseId}`, {
          headers: authHeaders(),
        });
        const courseJson = await readJson(courseRes);
        if (courseRes.ok && courseJson.data && Array.isArray(courseJson.data.subjects)) {
          const mappedSubjects = courseJson.data.subjects.map((s: any) => ({
            id: s.id,
            name: s.name,
            code: s.code || null,
            icon_url: s.icon_url || null,
            term_type: s.term_type || "full_course",
            term_number: s.term_number || 1,
            term_name: s.term_name || "",
            course_id: Number(courseId),
            course_name: courseJson.data.name,
          }));
          setSubjectsList(mappedSubjects);
          if (mappedSubjects.length > 0) {
            const first = mappedSubjects[0];
            setForm((prev) => {
              const exists = mappedSubjects.some((s: any) => String(s.id) === prev.subject_id);
              if (!exists || !prev.subject_id) {
                return {
                  ...prev,
                  subject_id: String(first.id),
                  subject_label: first.name,
                  title: `${first.name} Syllabus`,
                };
              }
              return prev;
            });
          }
          return;
        }
      }

      // 2. Otherwise fetch subjects by category or generic list
      const params = new URLSearchParams({ limit: "150" });
      if (categoryId && categoryId !== "all" && categoryId !== "") {
        params.set("categoryId", categoryId);
      }
      const res = await fetch(`/api/admin/subjects?${params.toString()}`, {
        headers: authHeaders(),
      });
      const json = await readJson(res);
      if (res.ok && Array.isArray(json.data)) {
        // Deduplicate by ID
        const seen = new Set<number>();
        const uniqueSubjects = json.data.filter((s: any) => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        setSubjectsList(uniqueSubjects);
        if (uniqueSubjects.length > 0) {
          const first = uniqueSubjects[0];
          setForm((prev) => {
            const exists = uniqueSubjects.some((s: any) => String(s.id) === prev.subject_id);
            if (!exists || !prev.subject_id) {
              return {
                ...prev,
                subject_id: String(first.id),
                subject_label: first.name,
                title: `${first.name} Syllabus`,
              };
            }
            return prev;
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch subjects list", err);
    } finally {
      setLoadingSubjectsList(false);
    }
  }, [accessToken, authHeaders]);

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
    setSelectedCourseId("");
    setSelectedCourseName("");
    setSelectedCategoryId("");
    setSelectedCategoryName("");
    setSubjectFilterSearch("");
    setActiveSubjectTermFilter("all");
    setSubjectNodesMap({});
    setExpandedAccordions(new Set());
    setNewNodeType("unit");
    setNewNodeTitle("");
    setNewNodeParentId("root");
    setNewNodeDurationValue("");
    setNewNodeDurationUnit("hours");
    setInlineAddTargetId(null);
    setInlineAddDurationValue("");
    setInlineAddDurationUnit("hours");
    setBulkPasteOpen(false);
    setBulkPasteText("");
    setSaveStatus("saved");
    fetchSubjectsList("", "");
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
        setSelectedCourseId("");
        setSelectedCourseName("");
        setSelectedCategoryId("");
        setSelectedCategoryName("");
        setSubjectFilterSearch("");
        setActiveSubjectTermFilter("all");
        setSubjectNodesMap({});
        setExpandedAccordions(new Set());
        setNewNodeType("unit");
        setNewNodeTitle("");
        setNewNodeParentId("root");
        setNewNodeDurationValue("");
        setNewNodeDurationUnit("hours");
        setInlineAddTargetId(null);
        setInlineAddDurationValue("");
        setInlineAddDurationUnit("hours");
        setBulkPasteOpen(false);
        setBulkPasteText("");
        setSaveStatus("saved");
        fetchSubjectsList("", "");
        setDialogOpen(true);
      }
      window.history.replaceState(null, "", window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchCoursesList, fetchSubjectsList, isReady]);

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
    setSelectedCourseId("");
    setSelectedCourseName("");
    setSelectedCategoryId("");
    setSelectedCategoryName("");
    setSubjectFilterSearch("");
    setActiveSubjectTermFilter("all");
    setSubjectNodesMap({});
    setExpandedAccordions(new Set());
    setInlineAddTargetId(null);
    setSaveStatus("saved");
    fetchSubjectsList("", "");
    setDialogOpen(true);
  };

  const saveSyllabus = async () => {
    if (!accessToken) return;
    if (!form.subject_id) {
      toast.error("Please select a subject");
      return;
    }
    setSaving(true);
    setSaveStatus("saving");
    try {
      const effectiveInstitutionId = !isPlatformAdmin
        ? (activeInstitutionId ?? (user as any)?.under_institution_id ?? user?.memberships?.[0]?.institution_id ?? null)
        : null;

      const body = {
        subject_id: Number(form.subject_id),
        institution_id: effectiveInstitutionId,
        title: form.title.trim() || form.subject_label || "Academic Syllabus",
        description: form.description.trim() || null,
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
      const createdSyllabusId = editingSyllabus ? editingSyllabus.id : (json.data?.id ?? json.data);

      const nodesToSave = subjectNodesMap[form.subject_id] || [];

      // Save draft curriculum nodes if created
      if (!editingSyllabus && createdSyllabusId && nodesToSave.length > 0) {
        const idMap = new Map<string, number>();
        const sortedDrafts = [...nodesToSave].sort((a, b) => {
          if (!a.parentId && b.parentId) return -1;
          if (a.parentId && !b.parentId) return 1;
          return 0;
        });

        for (const draft of sortedDrafts) {
          const realParentId = draft.parentId ? (idMap.get(draft.parentId) ?? null) : null;
          const nodeRes = await fetch(`/api/admin/master-data/syllabi/${createdSyllabusId}/nodes`, {
            method: "POST",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({
              parent_id: realParentId,
              node_type: draft.node_type,
              title: draft.title.trim(),
              estimated_hours: draft.estimated_hours ? Number(draft.estimated_hours) : null,
              learning_outcomes: draft.learning_outcomes?.trim() || null,
              sort_order: 0,
              is_active: true,
            }),
          });
          const nodeJson = await readJson(nodeRes);
          if (nodeRes.ok && nodeJson.data?.id) {
            idMap.set(draft.id, Number(nodeJson.data.id));
          } else if (nodeRes.ok && typeof nodeJson.data === "number") {
            idMap.set(draft.id, nodeJson.data);
          }
        }
      }

      setSaveStatus("saved");
      toast.success(
        editingSyllabus
          ? "Syllabus updated."
          : nodesToSave.length > 0
          ? `Syllabus created with ${nodesToSave.length} curriculum items.`
          : "Syllabus created."
      );
      setDialogOpen(false);
      fetchSyllabi();
    } catch (err) {
      setSaveStatus("unsaved");
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
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:!max-w-5xl max-w-5xl !w-[94vw] p-6 rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {editingSyllabus ? "Edit Syllabus" : "Add Syllabus"}
              </DialogTitle>
              {selectedCourseName && (
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                  {selectedCourseName}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Search Option for Course / Program & Class */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-2xl border border-primary/20 bg-primary/[0.03]">
              {/* 1. Search Course / Program */}
              <div className="sm:col-span-7 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    Choose Course / Program
                  </Label>
                  {selectedCourseId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCourseId("");
                        setSelectedCourseName("");
                        fetchSubjectsList("", selectedCategoryId);
                      }}
                      className="h-5 text-[10px] text-muted-foreground hover:text-destructive px-1"
                    >
                      Clear Course
                    </Button>
                  )}
                </div>

                <AsyncSearchPopover<{ id: number; name: string; category_name?: string; category_breadcrumb?: string; code?: string; board_name?: string; university_name?: string }>
                  value={selectedCourseId}
                  onChange={(val) => {
                    setSelectedCourseId(val);
                    if (!val) setSelectedCourseName("");
                    fetchSubjectsList(val, selectedCategoryId);
                  }}
                  onSelectItem={(item) => {
                    setSelectedCourseId(String(item.id));
                    setSelectedCourseName(item.name);
                    fetchSubjectsList(String(item.id), selectedCategoryId);
                  }}
                  selectedLabel={selectedCourseName || undefined}
                  placeholder="Search & choose Course / Program (e.g. B.Com, B.Tech, Class 3)..."
                  searchPlaceholder="Type course or program name..."
                  emptyText="No matching course/program found"
                  showDefaultOption
                  defaultOptionLabel="All Courses / Universal"
                  defaultOptionValue=""
                  popoverClassName="!w-[min(460px,calc(100vw-32px))] shadow-xl"
                  fetcher={async (search, page) => {
                    const params = new URLSearchParams({
                      page: String(page),
                      limit: "25",
                      search,
                    });
                    if (selectedCategoryId) {
                      params.set("categoryId", selectedCategoryId);
                    }
                    const res = await fetch(`/api/admin/content/courses?${params.toString()}`, {
                      headers: authHeaders(),
                    });
                    if (!res.ok) throw new Error("Failed to load courses");
                    const json = await res.json();
                    return { data: json.data || [], hasMore: page < (json.pageCount || 1) };
                  }}
                  getValue={(item) => String(item.id)}
                  getLabel={(item) => item.name}
                  renderItem={(item) => (
                    <div className="flex flex-col py-0.5">
                      <span className="font-semibold text-xs text-foreground">{item.name}</span>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {item.code && <span className="font-mono bg-muted/60 px-1 rounded">{item.code}</span>}
                        {(item.category_breadcrumb || item.category_name) && (
                          <span>• {item.category_breadcrumb || item.category_name}</span>
                        )}
                        {item.university_name && <span>• Univ: {item.university_name}</span>}
                        {item.board_name && <span>• Board: {item.board_name}</span>}
                      </div>
                    </div>
                  )}
                />
              </div>

              {/* 2. Filter by Class / Category */}
              <div className="sm:col-span-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                    Filter by Class / Category
                  </Label>
                  {selectedCategoryId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCategoryId("");
                        setSelectedCategoryName("");
                        fetchSubjectsList(selectedCourseId, "");
                      }}
                      className="h-5 text-[10px] text-muted-foreground hover:text-destructive px-1"
                    >
                      Clear Class
                    </Button>
                  )}
                </div>

                <AsyncSearchPopover<{ id: number; name: string; breadcrumb?: string }>
                  value={selectedCategoryId}
                  onChange={(val) => {
                    setSelectedCategoryId(val);
                    if (!val) setSelectedCategoryName("");
                    fetchSubjectsList(selectedCourseId, val);
                  }}
                  onSelectItem={(item) => {
                    setSelectedCategoryId(String(item.id));
                    setSelectedCategoryName(item.breadcrumb || item.name);
                    fetchSubjectsList(selectedCourseId, String(item.id));
                  }}
                  selectedLabel={selectedCategoryName || undefined}
                  placeholder="Filter by Class / Level..."
                  searchPlaceholder="Type class or level name..."
                  emptyText="No class found"
                  showDefaultOption
                  defaultOptionLabel="All Classes / Categories"
                  defaultOptionValue=""
                  popoverClassName="!w-[min(380px,calc(100vw-32px))] shadow-xl"
                  fetcher={async (search, page) => {
                    const params = new URLSearchParams({
                      page: String(page),
                      limit: "20",
                      search,
                    });
                    const res = await fetch(`/api/admin/content/categories?${params.toString()}`, {
                      headers: authHeaders(),
                    });
                    if (!res.ok) throw new Error("Failed to load categories");
                    const json = await res.json();
                    return { data: json.data || [], hasMore: page < (json.pageCount || 1) };
                  }}
                  getValue={(item) => String(item.id)}
                  getLabel={(item) => item.breadcrumb || item.name}
                />
              </div>
            </div>

            {/* Individual Subject Tabs Selection (Year & Semester Wise Grouping) */}
            {(() => {
              // Group subjects by their academic term
              type TermGroup = {
                key: string;
                title: string;
                subtitle?: string;
                term_type: string;
                term_number: number;
                subjects: typeof subjectsList;
              };

              const termMap = new Map<string, TermGroup>();

              for (const sub of subjectsList) {
                let termKey = "full_course";
                let termTitle = "Full Course / Core Curriculum";
                let termSubtitle = "Core Subjects";
                const termType = sub.term_type || "full_course";
                const termNum = sub.term_number || 1;

                if (termType === "semester") {
                  const derivedYear = Math.max(1, Math.ceil(termNum / 2));
                  termKey = `sem-${termNum}`;
                  termTitle = `Year ${derivedYear} • Semester ${termNum}`;
                  termSubtitle = sub.term_name || `Semester ${termNum} Curriculum`;
                } else if (termType === "year") {
                  termKey = `year-${termNum}`;
                  termTitle = `Year ${termNum} (Annual)`;
                  termSubtitle = sub.term_name || `Year ${termNum} Annual Curriculum`;
                }

                if (!termMap.has(termKey)) {
                  termMap.set(termKey, {
                    key: termKey,
                    title: termTitle,
                    subtitle: termSubtitle,
                    term_type: termType,
                    term_number: termNum,
                    subjects: [],
                  });
                }
                termMap.get(termKey)!.subjects.push(sub);
              }

              // Sort term groups chronologically
              const sortedGroups = Array.from(termMap.values()).sort((a, b) => {
                if (a.term_type === "semester" && b.term_type === "semester") {
                  return a.term_number - b.term_number;
                }
                if (a.term_type === "year" && b.term_type === "year") {
                  return a.term_number - b.term_number;
                }
                return 0;
              });

              // Filter groups according to search and active term tab
              const filteredGroups = sortedGroups
                .filter((g) => {
                  if (activeSubjectTermFilter === "all") return true;
                  return g.key === activeSubjectTermFilter;
                })
                .map((g) => {
                  let subs = g.subjects;
                  if (subjectFilterSearch.trim()) {
                    const q = subjectFilterSearch.toLowerCase();
                    subs = subs.filter(
                      (s) => s.name?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q)
                    );
                  }
                  return { ...g, subjects: subs };
                })
                .filter((g) => g.subjects.length > 0);

              const totalSubjectsCount = subjectsList.length;

              return (
                <div className="space-y-3 p-3.5 rounded-2xl border border-border/80 bg-muted/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        <span>Curriculum Subjects ({totalSubjectsCount})</span>
                      </Label>
                      <span className="text-[11px] text-muted-foreground font-normal">
                        Select a subject below to configure its Units & Chapters:
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {totalSubjectsCount > 4 && (
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Filter subjects..."
                            value={subjectFilterSearch}
                            onChange={(e) => setSubjectFilterSearch(e.target.value)}
                            className="pl-8 h-7 text-xs w-36 bg-background"
                          />
                        </div>
                      )}
                      {saveStatus === "saving" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Saving...
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Auto-Save
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Term Breakdown Pills if multi-term course */}
                  {sortedGroups.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 pb-1 border-b border-border/60">
                      <button
                        type="button"
                        onClick={() => setActiveSubjectTermFilter("all")}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
                          activeSubjectTermFilter === "all"
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-muted-foreground border-border hover:text-foreground"
                        }`}
                      >
                        All Academic Terms ({totalSubjectsCount})
                      </button>
                      {sortedGroups.map((g) => (
                        <button
                          key={g.key}
                          type="button"
                          onClick={() => setActiveSubjectTermFilter(g.key)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                            activeSubjectTermFilter === g.key
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-background text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          <span>{g.title}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                              activeSubjectTermFilter === g.key
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {g.subjects.length}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Year & Semester Wise Subjects List */}
                  {loadingSubjectsList ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Loading course subjects breakdown...</span>
                    </div>
                  ) : filteredGroups.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground text-xs space-y-1">
                      <p className="font-semibold text-foreground">No subjects found for this selection.</p>
                      <p className="text-[11px]">
                        Choose a course/program above, or add subjects in Master Subjects first.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {filteredGroups.map((group) => (
                        <div
                          key={group.key}
                          className="p-3 rounded-xl bg-background border border-border/70 space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-primary" />
                              <h4 className="text-xs font-bold text-foreground">{group.title}</h4>
                              {group.subtitle && (
                                <span className="text-[11px] text-muted-foreground">({group.subtitle})</span>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-[10px] font-mono font-semibold">
                              {group.subjects.length} Subject{group.subjects.length > 1 ? "s" : ""}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {group.subjects.map((sub) => {
                              const isSelected = form.subject_id === String(sub.id);
                              const nodeCount = subjectNodesMap[String(sub.id)]?.length || 0;

                              return (
                                <button
                                  key={`${group.key}-${sub.id}`}
                                  type="button"
                                  onClick={() => {
                                    setForm((prev) => ({
                                      ...prev,
                                      subject_id: String(sub.id),
                                      subject_label: sub.name,
                                      title: `${sub.name} Syllabus`,
                                    }));
                                    const nodes = subjectNodesMap[String(sub.id)] || [];
                                    if (nodes.length > 0) {
                                      setExpandedAccordions(new Set(nodes.map((n) => n.id)));
                                    }
                                  }}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all shadow-2xs ${
                                    isSelected
                                      ? "bg-primary/10 border-primary text-foreground ring-2 ring-primary/30 shadow-xs"
                                      : "bg-card hover:bg-muted/40 text-foreground border-border hover:border-primary/40"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img
                                      src={sub.icon_url || "/icons/default-subject.svg"}
                                      alt=""
                                      className="h-7 w-7 rounded-lg object-contain bg-background border p-0.5 shrink-0"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "/icons/default-subject.svg";
                                      }}
                                    />
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-bold text-xs truncate max-w-[140px]">
                                        {sub.name}
                                      </span>
                                      {sub.code && (
                                        <span className="font-mono text-[10px] text-muted-foreground">
                                          {sub.code}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Badge
                                      variant={nodeCount > 0 ? "default" : "outline"}
                                      className={`text-[9px] px-1.5 py-0 rounded-full font-semibold ${
                                        nodeCount > 0
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      {nodeCount} {nodeCount === 1 ? "unit" : "units"}
                                    </Badge>
                                    {isSelected && (
                                      <Check className="h-4 w-4 text-primary font-bold ml-0.5" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Curriculum Accordion Tree Builder */}
            {form.subject_id && !editingSyllabus && (
              <div className="space-y-3 pt-3 border-t border-border/80">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" />
                    <span>Curriculum Hierarchy: {form.subject_label}</span>
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold text-primary">
                      {currentSubjectNodes.length} Items Total
                    </Badge>
                  </Label>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setBulkPasteOpen(!bulkPasteOpen)}
                    className="h-7 px-2 text-[11px] font-semibold text-primary hover:text-primary gap-1"
                  >
                    <ClipboardPaste className="h-3.5 w-3.5" />
                    {bulkPasteOpen ? "Close Bulk Paste" : "Quick Bulk Paste"}
                  </Button>
                </div>

                {/* Bulk Paste Box */}
                {bulkPasteOpen && (
                  <div className="p-3 rounded-2xl border border-primary/30 bg-primary/5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[11px] font-semibold text-foreground">
                        Paste items (one per line or comma-separated):
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-muted-foreground">Type:</span>
                        <select
                          value={bulkPasteType}
                          onChange={(e) => setBulkPasteType(e.target.value as any)}
                          className="h-6 text-[10px] px-2 py-0 rounded border border-input bg-background font-semibold"
                        >
                          <option value="module">Module</option>
                          <option value="unit">Unit</option>
                          <option value="chapter">Chapter</option>
                          <option value="lesson">Lesson (Sub-part of Chapter)</option>
                          <option value="topic">Topic (Sub-part of Lesson)</option>
                        </select>
                      </div>
                    </div>
                    <Textarea
                      placeholder="e.g.&#10;Unit 1: Real Numbers&#10;Unit 2: Polynomials&#10;Unit 3: Linear Equations"
                      value={bulkPasteText}
                      onChange={(e) => setBulkPasteText(e.target.value)}
                      rows={3}
                      className="text-xs bg-background"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-[11px]"
                        onClick={() => setBulkPasteOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-6 text-[11px] bg-primary text-primary-foreground font-semibold"
                        onClick={applyBulkPaste}
                      >
                        Add All
                      </Button>
                    </div>
                  </div>
                )}

                {/* Add Item Top Input Form */}
                <div className="p-3 rounded-2xl border border-border/80 bg-muted/20 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    {/* Level / Type */}
                    <div className="sm:col-span-3">
                      <Select
                        value={newNodeType}
                        onValueChange={(val: any) => {
                          setNewNodeType(val);
                          // Auto-select sensible default parent
                          if (val === "topic") {
                            const firstLesson = currentSubjectNodes.find((n) => n.node_type === "lesson");
                            if (firstLesson) {
                              setNewNodeParentId(firstLesson.id);
                            }
                          } else if (val === "lesson") {
                            const firstChapter = currentSubjectNodes.find((n) => n.node_type === "chapter");
                            if (firstChapter) {
                              setNewNodeParentId(firstChapter.id);
                            }
                          } else if (val === "chapter") {
                            const firstUnit = currentSubjectNodes.find((n) => n.node_type === "unit" || n.node_type === "module");
                            if (firstUnit) {
                              setNewNodeParentId(firstUnit.id);
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="module" className="text-xs">Module</SelectItem>
                          <SelectItem value="unit" className="text-xs">Unit</SelectItem>
                          <SelectItem value="chapter" className="text-xs">Chapter</SelectItem>
                          <SelectItem value="lesson" className="text-xs">Lesson (Sub-part of Chapter)</SelectItem>
                          <SelectItem value="topic" className="text-xs">Topic (Sub-part of Lesson)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Parent Selector */}
                    <div className="sm:col-span-4">
                      <select
                        value={newNodeParentId}
                        onChange={(e) => setNewNodeParentId(e.target.value)}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs truncate font-medium"
                      >
                        <option value="root">None (Top Root Level)</option>
                        {currentSubjectNodes
                          .filter((n) => {
                            if (newNodeType === "topic") {
                              return n.node_type === "lesson" || n.node_type === "chapter";
                            }
                            if (newNodeType === "lesson") {
                              return n.node_type === "chapter";
                            }
                            if (newNodeType === "chapter") {
                              return n.node_type === "unit" || n.node_type === "module";
                            }
                            return n.node_type === "module";
                          })
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              Under: [{n.node_type.toUpperCase()}] {n.title}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Title Input */}
                    <div className="sm:col-span-5">
                      <Input
                        placeholder={
                          newNodeType === "topic"
                            ? "Topic title (e.g. Topic 1: Introduction to Prime Numbers)"
                            : newNodeType === "lesson"
                            ? "Lesson title (e.g. Lesson 1.1: Prime Factorisation)"
                            : newNodeType === "chapter"
                            ? "Chapter title (e.g. Chapter 1: Real Numbers)"
                            : newNodeType === "unit"
                            ? "Unit title (e.g. Unit 1: Number Systems)"
                            : "Title..."
                        }
                        value={newNodeTitle}
                        onChange={(e) => setNewNodeTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addDraftNode();
                          }
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground font-medium">Duration:</span>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="e.g. 4"
                        value={newNodeDurationValue}
                        onChange={(e) => setNewNodeDurationValue(e.target.value)}
                        className="h-7 w-16 text-xs"
                      />
                      <select
                        value={newNodeDurationUnit}
                        onChange={(e) => setNewNodeDurationUnit(e.target.value as any)}
                        className="h-7 text-[11px] px-2 py-0 rounded border border-input bg-background font-medium"
                      >
                        <option value="hours">Hours</option>
                        <option value="minutes">Minutes</option>
                        <option value="days">Days</option>
                      </select>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => addDraftNode()}
                      disabled={!newNodeTitle.trim()}
                      className="h-7 text-xs font-semibold bg-primary text-primary-foreground gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add to Syllabus
                    </Button>
                  </div>
                </div>

                {/* Interactive Accordion Tree (Module/Unit -> Chapter -> Lesson -> Topic) */}
                <div className="space-y-2 min-h-[140px] max-h-[360px] overflow-y-auto pr-1">
                  {currentSubjectNodes.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed text-center space-y-2 bg-muted/10">
                      <Layers className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                      <p className="text-xs font-semibold text-foreground">No curriculum structure yet</p>
                      <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                        Add units, chapters, lessons, and topics using the builder above to configure the syllabus for {form.subject_label}.
                      </p>
                    </div>
                  ) : (
                    currentSubjectNodes
                      .filter((n) => !n.parentId)
                      .map((rootNode) => {
                        const isExpanded = expandedAccordions.has(rootNode.id);
                        const childNodes = currentSubjectNodes.filter((c) => c.parentId === rootNode.id);
                        const rootDuration = formatNodeDuration(rootNode);

                        return (
                          <div
                            key={rootNode.id}
                            className="rounded-2xl border border-border/80 bg-card overflow-hidden transition-all shadow-2xs"
                          >
                            {/* Root Level Accordion Header (Unit / Module / Standalone Chapter) */}
                            <div
                              onClick={() => toggleAccordion(rootNode.id)}
                              className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <button
                                  type="button"
                                  className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center shrink-0"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </button>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-extrabold uppercase px-1.5 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 shrink-0"
                                >
                                  {rootNode.node_type}
                                </Badge>
                                <span className="font-bold text-xs text-foreground truncate">
                                  {rootNode.title}
                                </span>
                                {rootDuration && (
                                  <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1 py-0.2 rounded shrink-0">
                                    {rootDuration}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold">
                                  {childNodes.length} Sub-items
                                </Badge>

                                {rootNode.node_type === "chapter" && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5 text-[10px] font-semibold text-purple-600 hover:text-purple-700 gap-0.5"
                                    onClick={() => {
                                      setInlineAddTargetId(rootNode.id);
                                      setInlineAddType("lesson");
                                      setExpandedAccordions((prev) => new Set(prev).add(rootNode.id));
                                    }}
                                  >
                                    <Plus className="h-3 w-3" />
                                    Lesson
                                  </Button>
                                )}

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeDraftNode(rootNode.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Accordion Body */}
                            {isExpanded && (
                              <div className="p-2.5 pt-0 space-y-2 border-t border-border/40 bg-muted/10">
                                {childNodes.length === 0 ? (
                                  <div className="py-2 text-center text-[11px] text-muted-foreground italic">
                                    No sub-items yet. Click + Chapter to add content.
                                  </div>
                                ) : (
                                  childNodes.map((chapter) => {
                                    const isChapterExpanded = expandedAccordions.has(chapter.id);
                                    const lessons = currentSubjectNodes.filter((g) => g.parentId === chapter.id);
                                    const chapterDuration = formatNodeDuration(chapter);

                                    if (chapter.node_type === "chapter") {
                                      return (
                                        <div
                                          key={chapter.id}
                                          className="rounded-xl border border-border/80 bg-background overflow-hidden"
                                        >
                                          {/* Chapter Accordion Header */}
                                          <div
                                            onClick={() => toggleAccordion(chapter.id)}
                                            className="p-2 flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors cursor-pointer select-none"
                                          >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <button
                                                type="button"
                                                className="h-4 w-4 rounded flex items-center justify-center shrink-0"
                                              >
                                                {isChapterExpanded ? (
                                                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                                ) : (
                                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                                )}
                                              </button>
                                              <Badge
                                                variant="outline"
                                                className="text-[9px] font-bold uppercase px-1 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                              >
                                                CHAPTER
                                              </Badge>
                                              <span className="font-semibold text-xs text-foreground truncate">
                                                {chapter.title}
                                              </span>
                                              {chapterDuration && (
                                                <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1 py-0.2 rounded">
                                                  {chapterDuration}
                                                </span>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 px-1 text-[10px] font-semibold text-purple-600 hover:text-purple-700 gap-0.5"
                                                onClick={() => {
                                                  setInlineAddTargetId(chapter.id);
                                                  setInlineAddType("lesson");
                                                  setExpandedAccordions((prev) => new Set(prev).add(chapter.id));
                                                }}
                                              >
                                                <Plus className="h-3 w-3" />
                                                Lesson
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                                onClick={() => removeDraftNode(chapter.id)}
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>

                                          {/* Chapter Body (Lessons & Topics) */}
                                          {isChapterExpanded && (
                                            <div className="p-2 pt-0 space-y-1.5 border-t border-border/40 bg-muted/10">
                                              {lessons.length === 0 ? (
                                                <div className="py-1 text-center text-[10px] text-muted-foreground italic">
                                                  No lessons yet. Click + Lesson to add sub-parts.
                                                </div>
                                              ) : (
                                                lessons.map((lesson) => {
                                                  const isLessonExpanded = expandedAccordions.has(lesson.id);
                                                  const topics = currentSubjectNodes.filter((t) => t.parentId === lesson.id);
                                                  const lessonDuration = formatNodeDuration(lesson);

                                                  if (lesson.node_type === "lesson") {
                                                    return (
                                                      <div
                                                        key={lesson.id}
                                                        className="rounded-lg border border-purple-500/20 bg-card overflow-hidden"
                                                      >
                                                        {/* Lesson Header */}
                                                        <div
                                                          onClick={() => toggleAccordion(lesson.id)}
                                                          className="p-1.5 px-2 flex items-center justify-between gap-1.5 hover:bg-muted/30 transition-colors cursor-pointer select-none"
                                                        >
                                                          <div className="flex items-center gap-1.5 min-w-0">
                                                            <button
                                                              type="button"
                                                              className="h-3.5 w-3.5 rounded flex items-center justify-center shrink-0"
                                                            >
                                                              {isLessonExpanded ? (
                                                                <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                                                              ) : (
                                                                <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                                                              )}
                                                            </button>
                                                            <Badge
                                                              variant="outline"
                                                              className="text-[8px] font-extrabold uppercase px-1 py-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                                                            >
                                                              LESSON
                                                            </Badge>
                                                            <span className="font-semibold text-xs text-foreground truncate">
                                                              {lesson.title}
                                                            </span>
                                                            {lessonDuration && (
                                                                <span className="text-[9px] text-muted-foreground font-mono bg-muted/60 px-1 py-0.2 rounded">
                                                                {lessonDuration}
                                                              </span>
                                                            )}
                                                          </div>

                                                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                            <Badge variant="outline" className="text-[8px] py-0 px-1 text-muted-foreground font-medium">
                                                              {topics.length} Topics
                                                            </Badge>
                                                            <Button
                                                              type="button"
                                                              variant="ghost"
                                                              size="sm"
                                                              className="h-4.5 px-1 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 gap-0.5"
                                                              onClick={() => {
                                                                setInlineAddTargetId(lesson.id);
                                                                setInlineAddType("topic");
                                                                setExpandedAccordions((prev) => new Set(prev).add(lesson.id));
                                                              }}
                                                            >
                                                              <Plus className="h-2.5 w-2.5" />
                                                              Topic
                                                            </Button>
                                                            <Button
                                                              type="button"
                                                              variant="ghost"
                                                              size="icon"
                                                              className="h-4 w-4 text-muted-foreground hover:text-destructive"
                                                              onClick={() => removeDraftNode(lesson.id)}
                                                            >
                                                              <Trash2 className="h-2.5 w-2.5" />
                                                            </Button>
                                                          </div>
                                                        </div>

                                                        {/* Topics inside Lesson */}
                                                        {isLessonExpanded && (
                                                          <div className="p-1.5 pt-0 space-y-1 border-t border-purple-500/10 bg-muted/20">
                                                            {topics.length === 0 ? (
                                                              <div className="py-0.5 text-center text-[9px] text-muted-foreground italic">
                                                                No topics yet. Click + Topic to add topic.
                                                              </div>
                                                            ) : (
                                                              topics.map((topic) => {
                                                                const topicDuration = formatNodeDuration(topic);
                                                                return (
                                                                  <div
                                                                    key={topic.id}
                                                                    className="p-1 px-2 rounded-md border border-border/60 bg-background flex items-center justify-between gap-1.5 text-xs"
                                                                  >
                                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                                      <Badge
                                                                        variant="outline"
                                                                        className="text-[8px] font-bold uppercase px-1 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                                                      >
                                                                        TOPIC
                                                                      </Badge>
                                                                      <span className="font-normal text-[11px] text-foreground truncate">
                                                                        {topic.title}
                                                                      </span>
                                                                      {topicDuration && (
                                                                        <span className="text-[8px] text-muted-foreground font-mono bg-muted/60 px-1 py-0.2 rounded">
                                                                          {topicDuration}
                                                                        </span>
                                                                      )}
                                                                    </div>
                                                                    <Button
                                                                      type="button"
                                                                      variant="ghost"
                                                                      size="icon"
                                                                      className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive shrink-0"
                                                                      onClick={() => removeDraftNode(topic.id)}
                                                                    >
                                                                      <Trash2 className="h-2 w-2" />
                                                                    </Button>
                                                                  </div>
                                                                );
                                                              })
                                                            )}

                                                            {/* Inline Add Topic Form under this Lesson */}
                                                            {inlineAddTargetId === lesson.id && (
                                                              <div className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-1.5 mt-1">
                                                                <span className="text-[9px] font-bold text-emerald-600 uppercase">
                                                                  + Add Topic to {lesson.title}
                                                                </span>
                                                                <div className="flex items-center gap-1">
                                                                  <Input
                                                                    placeholder="Topic title..."
                                                                    value={inlineAddTitle}
                                                                    onChange={(e) => setInlineAddTitle(e.target.value)}
                                                                    className="h-6 text-xs bg-background flex-1"
                                                                  />
                                                                  <Input
                                                                    type="number"
                                                                    step="0.5"
                                                                    min="0"
                                                                    placeholder="Time"
                                                                    value={inlineAddDurationValue}
                                                                    onChange={(e) => setInlineAddDurationValue(e.target.value)}
                                                                    className="h-6 w-14 text-xs bg-background"
                                                                  />
                                                                  <select
                                                                    value={inlineAddDurationUnit}
                                                                    onChange={(e) => setInlineAddDurationUnit(e.target.value as any)}
                                                                    className="h-6 text-[10px] px-1 rounded border border-input bg-background font-medium"
                                                                  >
                                                                    <option value="hours">Hours</option>
                                                                    <option value="minutes">Mins</option>
                                                                    <option value="days">Days</option>
                                                                  </select>
                                                                  <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    className="h-6 px-1.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                                                    onClick={() =>
                                                                      addDraftNode("topic", inlineAddTitle, lesson.id, inlineAddDurationValue, inlineAddDurationUnit)
                                                                    }
                                                                  >
                                                                    Add
                                                                  </Button>
                                                                  <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 px-1 text-xs text-muted-foreground"
                                                                    onClick={() => setInlineAddTargetId(null)}
                                                                  >
                                                                    ✕
                                                                  </Button>
                                                                </div>
                                                              </div>
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  }

                                                  // Standalone sub-item under chapter
                                                  const subDuration = formatNodeDuration(lesson);
                                                  return (
                                                    <div
                                                      key={lesson.id}
                                                      className="p-1 px-2 rounded-lg border border-border/60 bg-card flex items-center justify-between gap-1.5 text-xs"
                                                    >
                                                      <div className="flex items-center gap-1.5 min-w-0">
                                                        <Badge
                                                          variant="outline"
                                                          className="text-[8px] font-extrabold uppercase px-1 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                                        >
                                                          {lesson.node_type}
                                                        </Badge>
                                                        <span className="font-medium text-foreground truncate">
                                                          {lesson.title}
                                                        </span>
                                                        {subDuration && (
                                                          <span className="text-[9px] text-muted-foreground font-mono bg-muted/60 px-1 py-0.2 rounded">
                                                            {subDuration}
                                                          </span>
                                                        )}
                                                      </div>
                                                      <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-4 w-4 text-muted-foreground hover:text-destructive shrink-0"
                                                        onClick={() => removeDraftNode(lesson.id)}
                                                      >
                                                        <Trash2 className="h-2.5 w-2.5" />
                                                      </Button>
                                                    </div>
                                                  );
                                                })
                                              )}

                                              {/* Inline Quick Add Lesson Form for this Chapter */}
                                              {inlineAddTargetId === chapter.id && (
                                                <div className="p-2 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-1.5 mt-1">
                                                  <span className="text-[10px] font-bold text-purple-600 uppercase">
                                                    + Add Lesson to {chapter.title}
                                                  </span>
                                                  <div className="flex items-center gap-1.5">
                                                    <Input
                                                      placeholder="Lesson title (e.g. Lesson 1.1: Prime Factorisation)..."
                                                      value={inlineAddTitle}
                                                      onChange={(e) => setInlineAddTitle(e.target.value)}
                                                      className="h-7 text-xs bg-background flex-1"
                                                    />
                                                    <Input
                                                      type="number"
                                                      step="0.5"
                                                      min="0"
                                                      placeholder="Duration"
                                                      value={inlineAddDurationValue}
                                                      onChange={(e) => setInlineAddDurationValue(e.target.value)}
                                                      className="h-7 w-16 text-xs bg-background"
                                                    />
                                                    <select
                                                      value={inlineAddDurationUnit}
                                                      onChange={(e) => setInlineAddDurationUnit(e.target.value as any)}
                                                      className="h-7 text-[10px] px-1.5 rounded border border-input bg-background font-medium"
                                                    >
                                                      <option value="hours">Hours</option>
                                                      <option value="minutes">Minutes</option>
                                                      <option value="days">Days</option>
                                                    </select>
                                                    <Button
                                                      type="button"
                                                      size="sm"
                                                      className="h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                                                      onClick={() =>
                                                        addDraftNode("lesson", inlineAddTitle, chapter.id, inlineAddDurationValue, inlineAddDurationUnit)
                                                      }
                                                    >
                                                      Add
                                                    </Button>
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-7 px-1.5 text-xs text-muted-foreground"
                                                      onClick={() => setInlineAddTargetId(null)}
                                                    >
                                                      ✕
                                                    </Button>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }

                                    // Direct sub-item under Unit (e.g. standalone lesson)
                                    const directDuration = formatNodeDuration(chapter);
                                    return (
                                      <div
                                        key={chapter.id}
                                        className="p-1.5 px-2.5 rounded-xl border border-border/70 bg-background flex items-center justify-between gap-2 text-xs"
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] font-bold uppercase px-1.5 py-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                                          >
                                            {chapter.node_type}
                                          </Badge>
                                          <span className="font-semibold text-foreground truncate">
                                            {chapter.title}
                                          </span>
                                          {directDuration && (
                                            <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-1 py-0.2 rounded">
                                              {directDuration}
                                            </span>
                                          )}
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                          onClick={() => removeDraftNode(chapter.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    );
                                  })
                                )}

                                {/* Inline Quick Add Chapter Form for this Unit */}
                                {inlineAddTargetId === rootNode.id && (
                                  <div className="p-2 rounded-xl border border-primary/30 bg-primary/5 space-y-1.5 mt-1">
                                    <span className="text-[10px] font-bold text-primary uppercase">
                                      + Add Chapter to {rootNode.title}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <Input
                                        placeholder="Chapter title (e.g. Chapter 1: Real Numbers)..."
                                        value={inlineAddTitle}
                                        onChange={(e) => setInlineAddTitle(e.target.value)}
                                        className="h-7 text-xs bg-background flex-1"
                                      />
                                      <Input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        placeholder="Duration"
                                        value={inlineAddDurationValue}
                                        onChange={(e) => setInlineAddDurationValue(e.target.value)}
                                        className="h-7 w-16 text-xs bg-background"
                                      />
                                      <select
                                        value={inlineAddDurationUnit}
                                        onChange={(e) => setInlineAddDurationUnit(e.target.value as any)}
                                        className="h-7 text-[10px] px-1.5 rounded border border-input bg-background font-medium"
                                      >
                                        <option value="hours">Hours</option>
                                        <option value="minutes">Minutes</option>
                                        <option value="days">Days</option>
                                      </select>
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="h-7 px-2 text-xs bg-primary text-primary-foreground font-semibold"
                                        onClick={() =>
                                          addDraftNode("chapter", inlineAddTitle, rootNode.id, inlineAddDurationValue, inlineAddDurationUnit)
                                        }
                                      >
                                        Add Chapter
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-1.5 text-xs text-muted-foreground"
                                        onClick={() => setInlineAddTargetId(null)}
                                      >
                                        ✕
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            )}

            {/* Active Checkbox */}
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer pt-1">
              <Checkbox
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: Boolean(checked) }))}
              />
              Active
            </label>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between w-full">
            <ProgressiveSaveIndicator status={progressiveStatus} />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  clearSyllabusDraft();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void saveSyllabus();
                  clearSyllabusDraft();
                }}
                disabled={saving || !form.subject_id}
              >
                {saving && <Loader2 className="size-4 animate-spin mr-1.5" />}
                {editingSyllabus ? "Save Changes" : "Create Template"}
              </Button>
            </div>
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
