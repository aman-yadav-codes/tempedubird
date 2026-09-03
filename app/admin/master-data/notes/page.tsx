"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  StickyNote,
  Store,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import type { SerializedEditorState } from "lexical";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { MarketplaceSellOption } from "@/components/admin/marketplace-sell-option";
import { useProgressiveSave } from "@/hooks/use-progressive-save";
import { ProgressiveSaveIndicator } from "@/components/shared/progressive-save-indicator";
import { ContentPricingOption } from "@/components/shared/content-pricing-option";
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
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { useAuthStore } from "@/store";

const RichTextEditor = dynamic(
  () => import("@/components/editor/rich-text-editor").then((mod) => mod.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-md border bg-background/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading editor...
        </div>
      </div>
    ),
  }
);

type NotesView = "my" | "requests" | "marketplace";
type Option = { id: number; name?: string; title?: string; label?: string };
type SyllabusOption = { id: number; title: string; subject_id: number; subject_name: string };
type NodeOption = { id: number; title: string; node_type: string; parent_id?: number | null; sort_order?: number };

type NoteAttachment = {
  url: string;
  name?: string;
  type?: string;
  size?: number;
};

type NoteRow = {
  id: number;
  title?: string | null;
  institution_id: number;
  institution_name?: string | null;
  subject_id?: number | null;
  subject_name?: string | null;
  syllabus_id?: number | null;
  syllabus_title?: string | null;
  syllabus_node_id?: number | null;
  syllabus_node_title?: string | null;
  program_id?: number | null;
  program_title?: string | null;
  section_id?: number | null;
  section_name?: string | null;
  is_active: boolean;
  is_paid?: boolean;
  price?: number;
  item_count: number;
  is_public: boolean;
  marketplace_requested: boolean;
  marketplace_approved: boolean;
  marketplace_requested_by_name?: string | null;
  marketplace_approved_by_name?: string | null;
  source_note_id?: number | null;
  source_institution_id?: number | null;
  source_institution_name?: string | null;
  has_inherited_note?: boolean;
  created_by?: number | null;
  created_by_name?: string | null;
  updated_at: string;
};

type NoteItem = {
  id: number;
  note_id: number;
  syllabus_node_id?: number | null;
  node_title?: string | null;
  node_type?: string | null;
  title: string;
  body: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachments?: NoteAttachment[];
  is_active: boolean;
  sort_order: number;
  updated_at: string;
};

type NoteForm = {
  id?: number;
  title: string;
  institution_id: string;
  institution_label: string;
  syllabus_id: string;
  syllabus_label: string;
  syllabus_node_id: string;
  syllabus_node_label: string;
  subject_id: string;
  program_id: string;
  program_label: string;
  section_id: string;
  section_label: string;
  is_active: boolean;
  is_paid: boolean;
  price: number | string;
  marketplace_requested: boolean;
};

type ItemForm = {
  id?: number;
  note_id: string;
  syllabus_node_id: string;
  syllabus_node_label: string;
  title: string;
  body: string;
  attachments: NoteAttachment[];
  attachmentInputUrl: string;
  attachmentInputName: string;
  editorState: SerializedEditorState | null;
  is_active: boolean;
};

const blankForm: NoteForm = {
  title: "",
  institution_id: "",
  institution_label: "",
  syllabus_id: "",
  syllabus_label: "",
  syllabus_node_id: "",
  syllabus_node_label: "",
  subject_id: "",
  program_id: "",
  program_label: "",
  section_id: "",
  section_label: "",
  is_active: true,
  is_paid: false,
  price: 0,
  marketplace_requested: false,
};

const blankItemForm: ItemForm = {
  note_id: "",
  syllabus_node_id: "",
  syllabus_node_label: "",
  title: "",
  body: "",
  attachments: [],
  attachmentInputUrl: "",
  attachmentInputName: "",
  editorState: null,
  is_active: true,
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function optionLabel(option: Option) {
  return option.name || option.title || option.label || `#${option.id}`;
}

function nodeLabel(node: NodeOption) {
  const type = node.node_type.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  return `${node.title} (${type}${node.sort_order ? ` - ${node.sort_order}` : ""})`;
}

function parseEditorState(value: string): SerializedEditorState | null {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && "root" in parsed) {
      return parsed as SerializedEditorState;
    }
  } catch {
    return null;
  }
  return null;
}

function textFromLexicalNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const record = node as Record<string, unknown>;
  const ownText = typeof record.text === "string" ? record.text : "";
  const children = Array.isArray(record.children)
    ? record.children.map(textFromLexicalNode).filter(Boolean).join(" ")
    : "";
  return [ownText, children].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function textStyleFromFormat(format: unknown) {
  const flags = typeof format === "number" ? format : 0;
  return {
    fontWeight: flags & 1 ? 700 : undefined,
    fontStyle: flags & 2 ? "italic" : undefined,
    textDecoration: [
      flags & 8 ? "underline" : "",
      flags & 4 ? "line-through" : "",
    ].filter(Boolean).join(" ") || undefined,
  };
}

function renderInlineNode(node: unknown, key: string): ReactNode {
  if (!node || typeof node !== "object") return null;
  const record = node as Record<string, unknown>;
  const type = String(record.type ?? "");
  if (type === "image" && typeof record.src === "string") {
    return (
      <span key={key} className="my-3 block overflow-hidden rounded-md border bg-muted/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={record.src}
          alt={typeof record.altText === "string" ? record.altText : "Note image"}
          className="max-h-[460px] w-full object-contain"
        />
      </span>
    );
  }
  if (type === "link" && typeof record.url === "string") {
    const children = Array.isArray(record.children)
      ? record.children.map((child, index) => renderInlineNode(child, `${key}-${index}`))
      : record.url;
    return (
      <a
        key={key}
        href={record.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline underline-offset-4"
      >
        {children}
      </a>
    );
  }
  if (typeof record.text === "string") {
    return (
      <span key={key} style={textStyleFromFormat(record.format)}>
        {record.text}
      </span>
    );
  }
  if (Array.isArray(record.children)) {
    return record.children.map((child, index) => renderInlineNode(child, `${key}-${index}`));
  }
  return null;
}

function blockChildren(node: Record<string, unknown>, keyPrefix: string) {
  return Array.isArray(node.children)
    ? node.children.map((child, index) => renderInlineNode(child, `${keyPrefix}-${index}`))
    : null;
}

function renderTableCellContent(node: Record<string, unknown>, keyPrefix: string): ReactNode {
  if (!Array.isArray(node.children)) return null;
  return node.children.map((child, index) => {
    const childRecord = child && typeof child === "object" ? child as Record<string, unknown> : {};
    const childType = String(childRecord.type ?? "");
    if (childType === "paragraph") {
      return (
        <p key={`${keyPrefix}-${index}`} className="min-h-5 leading-6">
          {blockChildren(childRecord, `${keyPrefix}-${index}`)}
        </p>
      );
    }
    return renderEditorBlock(child, index);
  });
}

function renderEditorBlock(node: unknown, index: number): ReactNode {
  if (!node || typeof node !== "object") return null;
  const record = node as Record<string, unknown>;
  const type = String(record.type ?? "");
  const tag = String(record.tag ?? "");
  const key = `${type}-${index}`;
  const children = blockChildren(record, key);

  if (type === "heading" || ["h1", "h2", "h3"].includes(tag)) {
    if (tag === "h1") {
      return <h1 key={key} className="text-2xl font-bold leading-tight text-foreground">{children}</h1>;
    }
    if (tag === "h2") {
      return <h2 key={key} className="text-xl font-semibold leading-snug text-foreground">{children}</h2>;
    }
    return <h3 key={key} className="text-lg font-semibold leading-snug text-foreground">{children}</h3>;
  }

  if (type === "quote") {
    return (
      <blockquote key={key} className="border-l-4 border-primary/50 pl-4 text-muted-foreground">
        {children}
      </blockquote>
    );
  }

  if (type === "table") {
    const rows = Array.isArray(record.children) ? record.children : [];
    return (
      <div key={key} className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <tbody>
            {rows.map((row, rowIndex) => {
              const rowRecord = row && typeof row === "object" ? row as Record<string, unknown> : {};
              const cells = Array.isArray(rowRecord.children) ? rowRecord.children : [];
              return (
                <tr key={`${key}-row-${rowIndex}`} className="border-b last:border-b-0">
                  {cells.map((cell, cellIndex) => {
                    const cellRecord = cell && typeof cell === "object" ? cell as Record<string, unknown> : {};
                    const isHeader = Number(cellRecord.headerState ?? 0) > 0;
                    const CellTag = isHeader ? "th" : "td";
                    return (
                      <CellTag
                        key={`${key}-cell-${rowIndex}-${cellIndex}`}
                        colSpan={Number(cellRecord.colSpan ?? 1)}
                        rowSpan={Number(cellRecord.rowSpan ?? 1)}
                        className="border-r px-4 py-3 text-left align-top last:border-r-0"
                      >
                        <div className={isHeader ? "font-semibold text-foreground" : "text-foreground"}>
                          {renderTableCellContent(cellRecord, `${key}-cell-${rowIndex}-${cellIndex}`)}
                        </div>
                      </CellTag>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === "layout-container") {
    const layoutChildren = Array.isArray(record.children) ? record.children : [];
    const templateColumns =
      typeof record.templateColumns === "string" && record.templateColumns.trim()
        ? record.templateColumns
        : `repeat(${Math.max(layoutChildren.length, 1)}, minmax(0, 1fr))`;

    return (
      <div
        key={key}
        className="grid gap-4 rounded-md border bg-muted/10 p-3"
        style={{ gridTemplateColumns: templateColumns }}
      >
        {layoutChildren.map((child, childIndex) => renderEditorBlock(child, childIndex))}
      </div>
    );
  }

  if (type === "layout-item") {
    const itemChildren = Array.isArray(record.children) ? record.children : [];
    return (
      <div key={key} className="min-w-0 space-y-3 rounded-md border bg-background/50 p-3">
        {itemChildren.map((child, childIndex) => renderEditorBlock(child, childIndex))}
      </div>
    );
  }

  if (type === "list") {
    const listChildren = Array.isArray(record.children)
      ? record.children.map((child, childIndex) => {
          const childRecord = child && typeof child === "object" ? child as Record<string, unknown> : {};
          return <li key={`${key}-${childIndex}`}>{blockChildren(childRecord, `${key}-${childIndex}`)}</li>;
        })
      : null;
    return tag === "ol" || record.listType === "number"
      ? <ol key={key} className="list-decimal space-y-1 pl-6 text-foreground">{listChildren}</ol>
      : <ul key={key} className="list-disc space-y-1 pl-6 text-foreground">{listChildren}</ul>;
  }

  if (type === "code") {
    return <pre key={key} className="overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">{textFromLexicalNode(record)}</pre>;
  }

  return <p key={key} className="text-base leading-7 text-foreground">{children}</p>;
}

function NoteBodyRenderer({ value }: { value: string }) {
  const state = parseEditorState(value);
  if (state && Array.isArray((state.root as Record<string, unknown>).children)) {
    const children = (state.root as Record<string, unknown>).children as unknown[];
    return (
      <div className="space-y-4">
        {children.map(renderEditorBlock)}
      </div>
    );
  }

  if (/^\s*</.test(value)) {
    return (
      <div
        className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground"
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  return <p className="whitespace-pre-wrap text-base leading-7 text-foreground">{value}</p>;
}

type CloudinaryAsset = {
  publicId: string;
  resourceType: string;
};

function parseCloudinaryTitle(value: unknown): CloudinaryAsset | null {
  if (typeof value !== "string" || !value.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed?.publicId !== "string") return null;
    return {
      publicId: parsed.publicId,
      resourceType: typeof parsed.resourceType === "string" ? parsed.resourceType : "raw",
    };
  } catch {
    return null;
  }
}

function cloudinaryAssetFromUrl(value: unknown): CloudinaryAsset | null {
  if (typeof value !== "string" || !value.includes("res.cloudinary.com")) return null;
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const uploadIndex = parts.findIndex((part) => part === "upload");
    const resourceType = parts[0] || "image";
    if (uploadIndex < 0) return null;
    const publicParts = parts.slice(uploadIndex + 1).filter((part) => !/^v\d+$/.test(part));
    const publicId = publicParts.join("/").replace(/\.[^.]+$/, "");
    return publicId ? { publicId, resourceType } : null;
  } catch {
    return null;
  }
}

function extractEditorAssets(value: string): CloudinaryAsset[] {
  const state = parseEditorState(value);
  if (!state) return [];
  const found = new Map<string, CloudinaryAsset>();

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const explicit =
      typeof record.publicId === "string"
        ? {
            publicId: record.publicId,
            resourceType: typeof record.resourceType === "string" ? record.resourceType : "image",
          }
        : parseCloudinaryTitle(record.title) ?? cloudinaryAssetFromUrl(record.url) ?? cloudinaryAssetFromUrl(record.src);
    if (explicit?.publicId) {
      found.set(`${explicit.resourceType}:${explicit.publicId}`, explicit);
    }
    if (Array.isArray(record.children)) {
      record.children.forEach(visit);
    }
  };

  visit(state.root);
  return Array.from(found.values());
}

async function deleteEditorAsset(asset: CloudinaryAsset, authHeader: Record<string, string>) {
  await fetch("/api/admin/uploads/documents/delete", {
    method: "POST",
    headers: { ...authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({ publicId: asset.publicId, resourceType: asset.resourceType }),
  });
}

async function cleanupRemovedEditorAssets(previousValue: string, nextValue: string, authHeader: Record<string, string>) {
  const nextKeys = new Set(extractEditorAssets(nextValue).map((asset) => `${asset.resourceType}:${asset.publicId}`));
  const removed = extractEditorAssets(previousValue).filter((asset) => !nextKeys.has(`${asset.resourceType}:${asset.publicId}`));
  if (!removed.length) return;
  await Promise.allSettled(removed.map((asset) => deleteEditorAsset(asset, authHeader)));
}

function noteBodyText(value: string) {
  const state = parseEditorState(value);
  if (!state) return value.trim();
  return textFromLexicalNode(state.root).trim();
}

function noteTitle(row: NoteRow) {
  return row.title || row.syllabus_title || row.subject_name || row.program_title || "Class Notes";
}

function noteSubtitle(row: NoteRow) {
  return [row.program_title, row.section_name || "All sections", row.institution_name]
    .filter(Boolean)
    .join(" - ");
}

function noteItemScopeLabel(item: NoteItem) {
  if (!item.node_title) return "Whole syllabus note";
  const type = item.node_type
    ? item.node_type.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    : "Syllabus node";
  return `${type}: ${item.node_title}`;
}

function formFromRow(row: NoteRow): NoteForm {
  return {
    id: row.id,
    title: row.title || "",
    institution_id: String(row.institution_id),
    institution_label: row.institution_name || `Institution #${row.institution_id}`,
    syllabus_id: row.syllabus_id ? String(row.syllabus_id) : "",
    syllabus_label: row.syllabus_title || "",
    syllabus_node_id: row.syllabus_node_id ? String(row.syllabus_node_id) : "",
    syllabus_node_label: row.syllabus_node_title || "",
    subject_id: row.subject_id ? String(row.subject_id) : "",
    program_id: row.program_id ? String(row.program_id) : "",
    program_label: row.program_title || "",
    section_id: row.section_id ? String(row.section_id) : "",
    section_label: row.section_name || "",
    is_active: row.is_active,
    is_paid: Boolean(row.is_paid || (Number(row.price) > 0)),
    price: Number(row.price) || 0,
    marketplace_requested: row.marketplace_requested,
  };
}

function itemFormFromRow(row: NoteItem): ItemForm {
  const editorState = parseEditorState(row.body);
  const attachments: NoteAttachment[] = Array.isArray(row.attachments) && row.attachments.length
    ? row.attachments
    : row.attachment_url
      ? [{ url: row.attachment_url, name: row.attachment_name || "Attachment" }]
      : [];

  return {
    id: row.id,
    note_id: String(row.note_id),
    syllabus_node_id: row.syllabus_node_id ? String(row.syllabus_node_id) : "",
    syllabus_node_label: row.node_title ? `${row.node_title}${row.node_type ? ` (${row.node_type})` : ""}` : "",
    title: row.title,
    body: row.body,
    attachments,
    attachmentInputUrl: "",
    attachmentInputName: "",
    editorState,
    is_active: row.is_active,
  };
}

export default function MasterDataNotesPage() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const activeInstitutionId = activeInstitution?.id ?? null;
  const activeInstitutionName = activeInstitution?.name ?? "";
  const [notesView, setNotesView] = useState<NotesView>("my");
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [search, setSearch] = useState("");
  const [pageCount, setPageCount] = useState(-1);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<NoteForm>(blankForm);

  const { saveStatus: noteSaveStatus, clearDraft: clearNoteDraft } = useProgressiveSave({
    formKey: `master_note:${form.id || "new"}`,
    formState: form,
    enabled: dialogOpen,
  });
  const [active, setActive] = useState<NoteRow | null>(null);
  const [items, setItems] = useState<NoteItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState<ItemForm>(blankItemForm);
  const [deleteTargets, setDeleteTargets] = useState<NoteRow[]>([]);
  const [marketplaceActionId, setMarketplaceActionId] = useState<number | null>(null);
  const [noteEditorLeftSize, setNoteEditorLeftSize] = useState(34);
  const noteEditorSplitRef = useRef<HTMLDivElement | null>(null);
  const itemEditorStateRef = useRef<SerializedEditorState | null>(null);
  const itemBodyRef = useRef("");

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
  const currentUserId = user?.id ?? null;
  const canModifyNote = useCallback((row: NoteRow | null | undefined) => {
    if (isPlatformAdmin) return true;
    return Boolean(row && currentUserId && row.created_by === currentUserId);
  }, [currentUserId, isPlatformAdmin]);

  const startNoteEditorResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const container = noteEditorSplitRef.current;
    if (!container) return;

    event.preventDefault();
    const rect = container.getBoundingClientRect();
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    const resize = (clientX: number) => {
      const nextSize = ((clientX - rect.left) / rect.width) * 100;
      setNoteEditorLeftSize(Math.min(45, Math.max(24, nextSize)));
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      resize(moveEvent.clientX);
    };

    const stopResize = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
      window.removeEventListener("blur", stopResize);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    resize(event.clientX);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize, { once: true });
    window.addEventListener("pointercancel", stopResize, { once: true });
    window.addEventListener("blur", stopResize, { once: true });
  }, []);
  const effectiveInstitutionId = isPlatformAdmin ? (form.institution_id || "1") : activeInstitutionId ? String(activeInstitutionId) : "";
  const canEditActive = canModifyNote(active);

  const loadRows = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search,
        view: notesView,
      });
      if (notesView === "my" && !isPlatformAdmin && activeInstitutionId) {
        params.set("institutionId", String(activeInstitutionId));
      }
      if (notesView === "marketplace" && !isPlatformAdmin && activeInstitutionId) {
        params.set("institutionId", String(activeInstitutionId));
      }
      const res = await fetch(`/api/admin/master-data/notes?${params.toString()}`, { headers: authHeader });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load notes");
      setRows((json.data ?? []) as NoteRow[]);
      setPageCount(Number(json.pageCount ?? -1));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeInstitutionId, authHeader, isPlatformAdmin, notesView, pagination.pageIndex, pagination.pageSize, search]);

  const loadItems = useCallback(async (noteId: number) => {
    if (!accessToken) return;
    setItemsLoading(true);
    try {
      const params = new URLSearchParams({ action: "items", noteId: String(noteId), limit: "100" });
      const res = await fetch(`/api/admin/master-data/notes?${params.toString()}`, { headers: authHeader });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load note entries");
      setItems((json.data ?? []) as NoteItem[]);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setItemsLoading(false);
    }
  }, [accessToken, authHeader]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void loadRows(), 250);
    return () => window.clearTimeout(timeout);
  }, [isReady, loadRows]);

  const fetchLookup = useCallback(async <T,>(action: string, query: string, page: number, extra?: Record<string, string>) => {
    if (action === "programs" && isPlatformAdmin) {
      const params = new URLSearchParams({ search: query, page: String(page), limit: "15" });
      const res = await fetch(`/api/admin/content/courses?${params.toString()}`, { headers: authHeader });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load master courses");
      const list = ((json.data ?? []) as Array<{ id: number; name?: string; title?: string }>).map((c) => ({
        id: c.id,
        title: c.name || c.title || `Course #${c.id}`,
      }));
      return { data: list as unknown as T[], hasMore: page < Number(json.pageCount ?? 0) };
    }

    const params = new URLSearchParams({ action, search: query, page: String(page), limit: "15", ...(extra ?? {}) });
    const res = await fetch(`/api/admin/master-data/notes?${params.toString()}`, { headers: authHeader });
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to load options");
    return { data: (json.data ?? []) as T[], hasMore: page < Number(json.pageCount ?? 0) };
  }, [authHeader, isPlatformAdmin]);

  const openCreate = () => {
    setForm({
      ...blankForm,
      institution_id: !isPlatformAdmin && activeInstitutionId ? String(activeInstitutionId) : isPlatformAdmin ? (activeInstitutionId ? String(activeInstitutionId) : "1") : "",
      institution_label: !isPlatformAdmin ? activeInstitutionName : "",
    });
    setDialogOpen(true);
  };

  const openSheet = useCallback((row: NoteRow) => {
    setActive(row);
    setItems([]);
    void loadItems(row.id);
  }, [loadItems]);

  const openItemCreate = () => {
    if (!active) return;
    itemEditorStateRef.current = null;
    itemBodyRef.current = "";
    setItemForm({ ...blankItemForm, note_id: String(active.id) });
    setItemDialogOpen(true);
  };

  const openItemEdit = (item: NoteItem) => {
    const nextForm = itemFormFromRow(item);
    itemEditorStateRef.current = nextForm.editorState;
    itemBodyRef.current = nextForm.body;
    setItemForm(nextForm);
    setItemDialogOpen(true);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const isImage = file.type.startsWith("image/");
      const endpoint = isImage ? "/api/admin/uploads/image" : "/api/admin/uploads/documents";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: authHeader,
        body: formData,
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      const url = json.url || json.data?.url || "";
      if (!url) throw new Error("No URL returned from upload");
      const newAttachment: NoteAttachment = {
        url,
        name: file.name,
        type: file.type,
        size: file.size,
      };
      setItemForm((curr) => ({
        ...curr,
        attachments: [...curr.attachments, newAttachment],
      }));
      toast.success("Attachment uploaded successfully");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setUploadingFile(false);
      event.target.value = "";
    }
  };

  async function saveNote() {
    if (!form.title.trim()) {
      toast.error("Title of notes is required");
      return;
    }
    const institutionId = isPlatformAdmin ? (form.institution_id || "1") : activeInstitutionId ? String(activeInstitutionId) : "";
    if (!institutionId) {
      toast.error("Institution is required");
      return;
    }
    if (!form.program_id) {
      toast.error("Course / Program is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/master-data/notes", {
        method: form.id ? "PATCH" : "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          title: form.title.trim(),
          institution_id: Number(institutionId),
          subject_id: form.subject_id ? Number(form.subject_id) : null,
          syllabus_id: form.syllabus_id ? Number(form.syllabus_id) : null,
          syllabus_node_id: form.syllabus_node_id ? Number(form.syllabus_node_id) : null,
          program_id: Number(form.program_id),
          section_id: form.section_id ? Number(form.section_id) : null,
          is_active: form.is_active,
          is_paid: form.is_paid,
          price: form.is_paid ? (Number(form.price) || 0) : 0,
          marketplace_requested: form.marketplace_requested,
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to save note");
      toast.success(form.id ? "Note details updated" : "Note created successfully");
      setDialogOpen(false);
      setForm(blankForm);
      await loadRows();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function saveNoteItem() {
    if (!itemForm.note_id) return;
    const serializedBody = itemEditorStateRef.current
      ? JSON.stringify(itemEditorStateRef.current)
      : itemBodyRef.current.trim();
    if (!itemForm.title.trim() || !noteBodyText(serializedBody)) {
      toast.error("Question and answer / notes content are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/master-data/notes", {
        method: itemForm.id ? "PATCH" : "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: itemForm.id ? "updateItem" : "createItem",
          id: itemForm.id,
          note_id: Number(itemForm.note_id),
          syllabus_node_id: itemForm.syllabus_node_id ? Number(itemForm.syllabus_node_id) : null,
          title: itemForm.title.trim(),
          body: serializedBody,
          attachment_url: itemForm.attachments[0]?.url || null,
          attachment_name: itemForm.attachments[0]?.name || null,
          attachments: itemForm.attachments,
          is_active: itemForm.is_active,
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to save note entry");
      if (itemForm.id) {
        await cleanupRemovedEditorAssets(itemForm.body, serializedBody, authHeader);
      }
      toast.success(itemForm.id ? "Note entry updated" : "Note entry added");
      setItemDialogOpen(false);
      itemEditorStateRef.current = null;
      itemBodyRef.current = "";
      setItemForm(blankItemForm);
      await loadItems(Number(itemForm.note_id));
      await loadRows();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function deleteNotes() {
    if (!deleteTargets.length) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/master-data/notes", {
        method: "DELETE",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ids: deleteTargets.map((item) => item.id) }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to delete notes");
      toast.success(`${deleteTargets.length} note${deleteTargets.length === 1 ? "" : "s"} deleted`);
      setDeleteTargets([]);
      await loadRows();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item: NoteItem) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/master-data/notes", {
        method: "DELETE",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteItems", note_id: item.note_id, ids: [item.id] }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to delete note entry");
      await cleanupRemovedEditorAssets(item.body, "", authHeader);
      toast.success("Note entry deleted");
      await loadItems(item.note_id);
      await loadRows();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const updateMarketplace = useCallback(async (row: NoteRow, action: "approveMarketplace" | "removeFromMarketplace" | "inheritMarketplace") => {
    setSaving(true);
    setMarketplaceActionId(row.id);
    try {
      const res = await fetch("/api/admin/master-data/notes", {
        method: action === "inheritMarketplace" ? "POST" : "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          id: row.id,
          institution_id: activeInstitutionId,
        }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to update marketplace");
      toast.success(
        action === "approveMarketplace"
          ? "Notes are now visible in marketplace"
          : action === "removeFromMarketplace"
            ? "Notes removed from marketplace"
            : "Marketplace notes copied"
      );
      await loadRows();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
      setMarketplaceActionId(null);
    }
  }, [activeInstitutionId, authHeader, loadRows]);

  const columns = useMemo<ColumnDef<NoteRow>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
          aria-label="Select all notes"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
          aria-label="Select note"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "syllabus_title",
      header: "Notes",
      cell: ({ row }) => {
        const note = row.original;
        const marketplaceMode = notesView === "marketplace" && !isPlatformAdmin;
        return (
          <div className="min-w-0">
            <p className="truncate font-medium">{noteTitle(note)}</p>
            <p className="truncate text-xs text-muted-foreground">{noteSubtitle(note)}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {marketplaceMode && note.has_inherited_note && (
                <Badge variant="outline" className="border-emerald-500/80 text-emerald-400">
                  Already inherited
                </Badge>
              )}
              {!marketplaceMode && note.source_note_id && (
                <Badge variant="outline" className="border-emerald-500/80 text-emerald-400">
                  Inherited
                </Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "item_count",
      header: "Entries",
      cell: ({ row }) => row.original.item_count,
    },
    {
      accessorKey: "institution_name",
      header: "Institution",
      cell: ({ row }) => row.original.institution_name || "-",
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          {row.original.is_active ? (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300">
              Active
            </Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          )}
          {row.original.marketplace_requested && !row.original.marketplace_approved && (
            <Badge variant="outline" className="border-amber-500/60 text-amber-300">
              {isPlatformAdmin ? "Review" : "Pending"}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "pricing",
      header: "Pricing",
      cell: ({ row }) => {
        const isPaid = Boolean(row.original.is_paid || (Number(row.original.price) > 0));
        const price = Number(row.original.price) || 0;
        return isPaid ? (
          <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 font-bold text-xs">
            ₹{price}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-bold text-xs">
            Free
          </Badge>
        );
      },
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ row }) => formatDate(row.original.updated_at),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const note = row.original;
        const marketplaceMode = notesView === "marketplace" && !isPlatformAdmin;
        const isMarketplaceActionLoading = marketplaceActionId === note.id;
        const canModifyRow = canModifyNote(note);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" disabled={isMarketplaceActionLoading}>
                {isMarketplaceActionLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="size-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem className="whitespace-nowrap" onClick={() => openSheet(note)}>
                <Eye className="size-4" />
                View details
              </DropdownMenuItem>
              {canModifyRow && (
                <DropdownMenuItem className="whitespace-nowrap" onClick={() => { setForm(formFromRow(note)); setDialogOpen(true); }}>
                  <Pencil className="size-4" />
                  Edit basic details
                </DropdownMenuItem>
              )}
              {isPlatformAdmin && note.marketplace_requested && !note.marketplace_approved && (
                <DropdownMenuItem className="whitespace-nowrap" onClick={() => void updateMarketplace(note, "approveMarketplace")}>
                  <CheckCircle2 className="size-4" />
                  Approve marketplace
                </DropdownMenuItem>
              )}
              {isPlatformAdmin && note.marketplace_approved && (
                <DropdownMenuItem className="whitespace-nowrap" onClick={() => void updateMarketplace(note, "removeFromMarketplace")}>
                  <Store className="size-4" />
                  Remove from marketplace
                </DropdownMenuItem>
              )}
              {marketplaceMode && (
                note.has_inherited_note ? (
                  <DropdownMenuItem className="whitespace-nowrap" disabled>
                    <Badge variant="outline" className="border-emerald-500/80 text-emerald-400">
                      Already inherited
                    </Badge>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className="whitespace-nowrap" onClick={() => void updateMarketplace(note, "inheritMarketplace")}>
                    <Plus className="size-4" />
                    Add to My Notes
                  </DropdownMenuItem>
                )
              )}
              {canModifyRow && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="whitespace-nowrap text-destructive" onClick={() => setDeleteTargets([note])}>
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [canModifyNote, isPlatformAdmin, marketplaceActionId, notesView, openSheet, updateMarketplace]);

  if (!isReady) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notes</h1>
          <p className="text-sm text-muted-foreground">Create class notes from syllabus units, chapters, and topics.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadRows()} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
          <Button
            onClick={() => {
              if (notesView !== "my") {
                setNotesView("my");
              }
              openCreate();
            }}
          >
            <Plus className="size-4" />
            Add Note
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={notesView === "my" ? "default" : "outline"}
          onClick={() => {
            setNotesView("my");
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
        >
          {isPlatformAdmin ? "All Notes" : "My Notes"}
        </Button>
        {isPlatformAdmin && (
          <Button
            variant={notesView === "requests" ? "default" : "outline"}
            onClick={() => {
              setNotesView("requests");
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
          >
            Requests
          </Button>
        )}
        <Button
          variant={notesView === "marketplace" ? "default" : "outline"}
          onClick={() => {
            setNotesView("marketplace");
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
        pagination={pagination}
        onPaginationChange={setPagination}
        enableRowSelection={notesView === "my"}
        getRowId={(row) => String(row.id)}
        onRowClick={openSheet}
        emptyText={
          notesView === "marketplace"
            ? "No marketplace notes found."
            : notesView === "requests"
              ? "No note requests found."
              : "No notes found."
        }
        toolbarLeft={
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
            placeholder="Search notes, syllabus, class..."
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto max-w-4xl sm:!max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Note Details" : "Add Note Details"}</DialogTitle>
            <DialogDescription>
              Provide note title, select course/program, syllabus, and optional unit/chapter before adding Q&A entries.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="note-main-title">Title of Notes *</Label>
              <Input
                id="note-main-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Complete Mechanics & Laws of Motion Notes"
              />
            </div>

            {isPlatformAdmin ? (
              <div className="space-y-2 sm:col-span-2">
                <Label>Institution *</Label>
                <AsyncSearchPopover<Option>
                  value={form.institution_id}
                  selectedLabel={form.institution_label}
                  placeholder="Select institution..."
                  searchPlaceholder="Search institutions..."
                  fetcher={(query, page) => fetchLookup<Option>("institutions", query, page)}
                  getValue={(item) => String(item.id)}
                  getLabel={optionLabel}
                  onChange={(value) => setForm((current) => ({ ...current, institution_id: value, institution_label: value ? current.institution_label : "", syllabus_id: "", syllabus_label: "", syllabus_node_id: "", syllabus_node_label: "", subject_id: "", program_id: "", program_label: "", section_id: "", section_label: "" }))}
                  onSelectItem={(item) => setForm((current) => ({ ...current, institution_id: String(item.id), institution_label: optionLabel(item), syllabus_id: "", syllabus_label: "", syllabus_node_id: "", syllabus_node_label: "", subject_id: "", program_id: "", program_label: "", section_id: "", section_label: "" }))}
                />
              </div>
            ) : (
              <div className="space-y-2 sm:col-span-2">
                <Label>Institution</Label>
                <Input value={activeInstitutionName} readOnly className="bg-muted/50" />
              </div>
            )}

            <div className="space-y-2">
              <Label>{isPlatformAdmin ? "Course / Program *" : "Class / Program *"}</Label>
              <AsyncSearchPopover<Option>
                value={form.program_id}
                selectedLabel={form.program_label}
                placeholder={isPlatformAdmin ? "Select master course / program..." : "Select class..."}
                searchPlaceholder="Search courses / programs..."
                disabled={!effectiveInstitutionId}
                fetcher={(query, page) => fetchLookup<Option>("programs", query, page, { institutionId: effectiveInstitutionId })}
                getValue={(item) => String(item.id)}
                getLabel={optionLabel}
                onChange={(value) => setForm((current) => ({ ...current, program_id: value, program_label: value ? current.program_label : "", syllabus_id: "", syllabus_label: "", syllabus_node_id: "", syllabus_node_label: "", section_id: "", section_label: "" }))}
                onSelectItem={(item) => setForm((current) => ({ ...current, program_id: String(item.id), program_label: optionLabel(item), syllabus_id: "", syllabus_label: "", syllabus_node_id: "", syllabus_node_label: "", section_id: "", section_label: "" }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Section</Label>
              <AsyncSearchPopover<Option>
                value={form.section_id}
                selectedLabel={form.section_label}
                placeholder="All sections"
                searchPlaceholder="Search sections..."
                disabled={!form.program_id || isPlatformAdmin}
                showDefaultOption
                defaultOptionLabel="All sections"
                defaultOptionValue=""
                fetcher={(query, page) => fetchLookup<Option>("sections", query, page, { programId: form.program_id })}
                getValue={(item) => String(item.id)}
                getLabel={optionLabel}
                onChange={(value) => setForm((current) => ({ ...current, section_id: value, section_label: value ? current.section_label : "" }))}
                onSelectItem={(item) => setForm((current) => ({ ...current, section_id: String(item.id), section_label: optionLabel(item) }))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Syllabus</Label>
              <AsyncSearchPopover<SyllabusOption>
                value={form.syllabus_id}
                selectedLabel={form.syllabus_label}
                placeholder={form.program_id ? "Select syllabus for this course..." : "Select syllabus..."}
                searchPlaceholder="Search syllabus..."
                disabled={!effectiveInstitutionId}
                fetcher={(query, page) => fetchLookup<SyllabusOption>("syllabi", query, page, { institutionId: effectiveInstitutionId, programId: form.program_id })}
                getValue={(item) => String(item.id)}
                getLabel={(item) => item.title}
                renderItem={(item) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.subject_name}</p>
                  </div>
                )}
                onChange={(value) => setForm((current) => ({ ...current, syllabus_id: value, syllabus_label: value ? current.syllabus_label : "", syllabus_node_id: "", syllabus_node_label: "", subject_id: "" }))}
                onSelectItem={(item) => setForm((current) => ({ ...current, syllabus_id: String(item.id), syllabus_label: item.title, syllabus_node_id: "", syllabus_node_label: "", subject_id: String(item.subject_id) }))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Syllabus Unit / Chapter (Optional)</Label>
              <AsyncSearchPopover<NodeOption>
                value={form.syllabus_node_id}
                selectedLabel={form.syllabus_node_label}
                placeholder="Overall syllabus note"
                searchPlaceholder="Search units or chapters..."
                disabled={!form.syllabus_id}
                showDefaultOption
                defaultOptionLabel="Overall syllabus note"
                defaultOptionValue=""
                fetcher={(query, page) => fetchLookup<NodeOption>("nodes", query, page, { syllabusId: form.syllabus_id })}
                getValue={(item) => String(item.id)}
                getLabel={nodeLabel}
                onChange={(value) => setForm((current) => ({ ...current, syllabus_node_id: value, syllabus_node_label: value ? current.syllabus_node_label : "" }))}
                onSelectItem={(item) => setForm((current) => ({ ...current, syllabus_node_id: String(item.id), syllabus_node_label: nodeLabel(item) }))}
              />
            </div>

            <div className="sm:col-span-2">
              <ContentPricingOption
                isPaid={form.is_paid}
                onIsPaidChange={(val) => setForm((curr) => ({ ...curr, is_paid: val }))}
                price={form.price}
                onPriceChange={(val) => setForm((curr) => ({ ...curr, price: val }))}
                label="Notes Access Pricing"
                description="Choose if students access these notes for Free or if a fee is charged."
              />
            </div>

            <div className="flex flex-wrap items-center gap-5 pt-2 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.marketplace_requested}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, marketplace_requested: Boolean(checked) }))}
                />
                Request marketplace review
              </label>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: Boolean(checked) }))}
                />
                Active
              </label>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <ProgressiveSaveIndicator status={noteSaveStatus} />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  clearNoteDraft();
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void saveNote();
                  clearNoteDraft();
                }}
                disabled={saving}
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {form.id ? "Save Details" : "Create Note"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <SheetHeader className="border-b px-6 py-5 pr-14 text-left">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <StickyNote className="size-5 text-primary" />
              {active ? noteTitle(active) : "Notes"}
            </SheetTitle>
            <SheetDescription className="mt-2 text-base leading-6">
              {active ? noteSubtitle(active) : ""}
            </SheetDescription>
          </SheetHeader>

          <div className="border-b px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {active?.subject_name && <Badge variant="outline">{active.subject_name}</Badge>}
                {active?.is_active ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
                {active?.marketplace_requested && !active.marketplace_approved && (
                  <Badge variant="outline" className="border-amber-500/60 text-amber-300">
                    Marketplace pending
                  </Badge>
                )}
                {active?.source_note_id && (
                  <Badge variant="outline" className="border-emerald-500/80 text-emerald-400">
                    Inherited
                  </Badge>
                )}
              </div>
              {canEditActive && (
                <Button onClick={openItemCreate}>
                  <Plus className="size-4" />
                  Add Q&A Note Entry
                </Button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {itemsLoading ? (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-md border border-dashed text-center text-sm text-muted-foreground">
                <StickyNote className="mb-3 size-8 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Loading note entries...
                </div>
              </div>
            ) : items.length ? (
              <div className="space-y-4">
                {items.map((item, index) => {
                  const itemAttachments: NoteAttachment[] = Array.isArray(item.attachments) && item.attachments.length
                    ? item.attachments
                    : item.attachment_url
                      ? [{ url: item.attachment_url, name: item.attachment_name || "Attachment" }]
                      : [];

                  return (
                    <div key={item.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="font-mono text-xs font-semibold">
                              Q{index + 1}
                            </Badge>
                            {item.node_title && (
                              <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                                {noteItemScopeLabel(item)}
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-base font-semibold text-foreground leading-snug">
                            {item.title}
                          </h3>
                        </div>
                        {canEditActive && (
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon-sm" onClick={() => openItemEdit(item)}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => void deleteItem(item)}>
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Formatted Answer */}
                      <div className="rounded-lg border bg-muted/20 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <FileText className="size-3.5 text-primary" />
                          Answer / Notes Content
                        </div>
                        <NoteBodyRenderer value={item.body} />
                      </div>

                      {/* Attachments */}
                      {itemAttachments.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            <Paperclip className="size-3.5 text-primary" />
                            Attachments ({itemAttachments.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {itemAttachments.map((att, attIdx) => (
                              <a
                                key={attIdx}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                              >
                                <Paperclip className="size-3" />
                                <span className="truncate max-w-[200px]">{att.name || `Attachment ${attIdx + 1}`}</span>
                                <ExternalLink className="size-3 opacity-60" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                <StickyNote className="mb-3 size-8 text-muted-foreground" />
                No Q&A note entries added yet. Click &quot;Add Q&A Note Entry&quot; to begin.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent
          className="flex h-[88dvh] max-h-[900px] w-[96vw] max-w-[1400px] flex-col gap-0 overflow-hidden rounded-lg border bg-background p-0 shadow-2xl sm:max-w-[1400px]"
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-14">
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="size-4 text-primary" />
              {itemForm.id ? "Edit Q&A Note Entry" : "Add Q&A Note Entry"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Add Question, Syllabus Unit, and Attachments on the left and write formatted Answer on the editor canvas.
            </DialogDescription>
          </DialogHeader>

          <div ref={noteEditorSplitRef} className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <div
              className="flex h-full min-h-0 min-w-0 shrink-0 grow-0 flex-col overflow-hidden bg-background"
              style={{ flexBasis: `${noteEditorLeftSize}%` }}
            >
              <div className="shrink-0 border-b px-5 py-5">
                <h3 className="font-semibold">Question & Details</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select syllabus unit/chapter, provide the Question or Topic heading, and add attachments.
                </p>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="space-y-2">
                  <Label>Unit / Chapter / Topic</Label>
                  <AsyncSearchPopover<NodeOption>
                    value={itemForm.syllabus_node_id}
                    selectedLabel={itemForm.syllabus_node_label}
                    placeholder="Overall syllabus note"
                    searchPlaceholder="Search units or chapters..."
                    disabled={!active?.syllabus_id}
                    showDefaultOption
                    defaultOptionLabel="Overall syllabus note"
                    defaultOptionValue=""
                    fetcher={(query, page) => fetchLookup<NodeOption>("nodes", query, page, { syllabusId: active?.syllabus_id ? String(active.syllabus_id) : "" })}
                    getValue={(item) => String(item.id)}
                    getLabel={nodeLabel}
                    onChange={(value) => setItemForm((current) => ({ ...current, syllabus_node_id: value, syllabus_node_label: value ? current.syllabus_node_label : "" }))}
                    onSelectItem={(item) => setItemForm((current) => ({ ...current, syllabus_node_id: String(item.id), syllabus_node_label: nodeLabel(item) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note-question-title">Question / Heading *</Label>
                  <Input
                    id="note-question-title"
                    value={itemForm.title}
                    onChange={(event) => setItemForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="e.g. State and prove Archimedes' Principle with diagram?"
                  />
                </div>

                {/* Attachments Section */}
                <div className="space-y-2.5 rounded-lg border bg-muted/20 p-3.5">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 font-medium text-xs">
                      <Paperclip className="size-3.5 text-primary" />
                      Attachments ({itemForm.attachments.length})
                    </Label>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="sr-only"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                      />
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        {uploadingFile ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                        Upload File
                      </span>
                    </label>
                  </div>

                  {/* Add URL attachment */}
                  <div className="space-y-1.5 pt-1">
                    <Input
                      placeholder="Attachment title (e.g. Formula Sheet PDF)"
                      value={itemForm.attachmentInputName}
                      onChange={(e) => setItemForm((c) => ({ ...c, attachmentInputName: e.target.value }))}
                      className="h-8 text-xs"
                    />
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="Attachment URL (https://...)"
                        value={itemForm.attachmentInputUrl}
                        onChange={(e) => setItemForm((c) => ({ ...c, attachmentInputUrl: e.target.value }))}
                        className="h-8 text-xs"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        className="h-8 shrink-0 text-xs"
                        onClick={() => {
                          if (!itemForm.attachmentInputUrl.trim()) {
                            toast.error("Enter attachment URL");
                            return;
                          }
                          const newAtt: NoteAttachment = {
                            url: itemForm.attachmentInputUrl.trim(),
                            name: itemForm.attachmentInputName.trim() || "Attachment",
                            type: "link",
                          };
                          setItemForm((c) => ({
                            ...c,
                            attachments: [...c.attachments, newAtt],
                            attachmentInputUrl: "",
                            attachmentInputName: "",
                          }));
                        }}
                      >
                        <Plus className="size-3 mr-1" /> Add
                      </Button>
                    </div>
                  </div>

                  {/* Attachment List */}
                  {itemForm.attachments.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {itemForm.attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 rounded border bg-background px-2.5 py-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="size-3.5 shrink-0 text-primary" />
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate font-medium text-primary hover:underline"
                            >
                              {att.name || att.url}
                            </a>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="size-6 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() =>
                              setItemForm((c) => ({
                                ...c,
                                attachments: c.attachments.filter((_, i) => i !== idx),
                              }))
                            }
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 pt-2 text-sm">
                  <Checkbox
                    checked={itemForm.is_active}
                    onCheckedChange={(checked) => setItemForm((current) => ({ ...current, is_active: Boolean(checked) }))}
                  />
                  Active
                </label>
              </div>
              <DialogFooter className="shrink-0 border-t px-5 py-4">
                <Button variant="outline" onClick={() => setItemDialogOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={() => void saveNoteItem()} disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {itemForm.id ? "Save Q&A Entry" : "Add Q&A Entry"}
                </Button>
              </DialogFooter>
            </div>

            <div
              aria-label="Resize notes editor panels"
              role="separator"
              tabIndex={0}
              className="group relative z-30 flex w-px shrink-0 cursor-col-resize items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2"
              onPointerDown={startNoteEditorResize}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  setNoteEditorLeftSize((current) => Math.max(24, current - 2));
                }
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  setNoteEditorLeftSize((current) => Math.min(45, current + 2));
                }
              }}
            >
              <div className="z-10 flex h-8 w-2 items-center justify-center rounded-full border bg-background shadow-sm transition-colors group-hover:border-primary/60">
                <span className="h-4 w-0.5 rounded-full bg-muted-foreground/60" />
              </div>
            </div>

            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
              <div className="shrink-0 border-b px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Answer / Explanation Canvas</h3>
                    <p className="text-sm text-muted-foreground">
                      Write formatted explanations, steps, formulas, tables, and notes content.
                    </p>
                  </div>
                  <div className="hidden text-xs text-muted-foreground md:block">
                    Press <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">/</kbd> for commands
                  </div>
                </div>
              </div>
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                <RichTextEditor
                  key={itemForm.id ?? `new-${itemForm.note_id}`}
                  defaultValue={itemForm.editorState ?? undefined}
                  onChange={(state) => {
                    itemEditorStateRef.current = state;
                    itemBodyRef.current = JSON.stringify(state);
                  }}
                  placeholder="Type the answer or notes content here... (Press / for commands)"
                  maxLength={50000}
                  alwaysEditable
                  className="h-full min-h-0"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTargets.length > 0} onOpenChange={(open) => !open && setDeleteTargets([])}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete note{deleteTargets.length === 1 ? "" : "s"}?</DialogTitle>
            <DialogDescription>
              This will remove the selected note set and its note entries from student visibility.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargets([])} disabled={saving}>Cancel</Button>
            <Button variant="destructive" onClick={() => void deleteNotes()} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
