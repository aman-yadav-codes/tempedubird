"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useActiveAcademicYearId } from "@/hooks/use-active-academic-year-id";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Newspaper,
  CalendarIcon,
  RefreshCw,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DocumentFileUpload,
  type UploadedDocumentFile,
} from "@/components/shared/document-file-upload";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { InstitutionNews } from "@/lib/types/institution";
import { cn } from "@/lib/utils";

type NoticeTargetType =
  "WHOLE_INSTITUTION" | "ROLE" | "PROGRAM" | "SECTION" | "USER";
type TargetOption = {
  id: number;
  name?: string;
  title?: string;
  full_name?: string;
  email?: string;
};
type InstitutionOption = {
  id: number;
  organization_name?: string | null;
  slug?: string | null;
  name?: string | null;
};

const HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 12 }, (_, index) =>
  String(index * 5).padStart(2, "0"),
);

function imageUrlToUploadFile(url: string): UploadedDocumentFile {
  return {
    url,
    publicId: "",
    resourceType: "image",
    fileType: "image/url",
    name: url.split("/").pop() || "Image URL",
  };
}

function getTargetSummary(item: InstitutionNews) {
  if (item.target_type === "ROLE") {
    return item.target_role_code === "teacher"
      ? "All Teachers"
      : "All Students";
  }
  if (item.target_type === "PROGRAM")
    return item.target_label ?? "Class / Program";
  if (item.target_type === "SECTION")
    return item.target_label ?? "Section Students";
  if (item.target_type === "USER") {
    const role = item.target_role_code === "teacher" ? "Teacher" : "Student";
    return item.target_label ? `${role}: ${item.target_label}` : role;
  }
  return "Whole Institution";
}

function NoticeDetails({
  notice,
  showAdminMeta,
}: {
  notice: InstitutionNews;
  showAdminMeta: boolean;
}) {
  const images = (notice.image_urls ?? []).filter(Boolean);
  const senderName =
    notice.created_by_role === "institution_admin"
      ? "Institution Admin"
      : notice.created_by_name || "Institution Admin";
  return (
    <div className="space-y-6">
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        {showAdminMeta && (
          <div className="rounded-lg border bg-muted/20 p-3.5">
            <p className="text-xs text-muted-foreground">Institution</p>
            <p className="font-medium">{notice.institution_name || `ID: ${notice.institution_id}`}</p>
          </div>
        )}
        {showAdminMeta ? (
          <div className="rounded-lg border bg-muted/20 p-3.5">
            <p className="text-xs text-muted-foreground">Target</p>
            <p className="font-medium">{getTargetSummary(notice)}</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/20 p-3.5">
            <p className="text-xs text-muted-foreground">Sent by</p>
            <p className="font-medium">{senderName}</p>
          </div>
        )}
        <div className={cn("rounded-lg border bg-muted/20 p-3.5", !showAdminMeta && "sm:col-span-1")}>
          <p className="text-xs text-muted-foreground">Published</p>
          <p className="font-medium">{notice.published_at ? formatPublishedAt(notice.published_at.slice(0, 16)) : "Draft"}</p>
        </div>
        {showAdminMeta && (
          <div className="rounded-lg border bg-muted/20 p-3.5">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-medium">{notice.is_active ? "Active" : "Disabled"}</p>
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Images</h3>
          <div className="grid gap-3">
            {images.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={notice.title} className="max-h-80 w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Message</h3>
        <div className="min-h-32 rounded-xl border bg-card p-5 text-sm leading-6 text-foreground">
          {notice.content ? (
            <p className="whitespace-pre-wrap break-words">{notice.content}</p>
          ) : (
            <p className="text-muted-foreground">No message added.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function toSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toDateTimeInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeInputValue(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatPublishedAt(value: string) {
  if (!value) return "Pick date and time";
  return fromDateTimeInputValue(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function updatePublishedDate(value: string, selectedDate: Date) {
  const current = fromDateTimeInputValue(value);
  const next = new Date(selectedDate);
  next.setHours(current.getHours(), current.getMinutes(), 0, 0);
  return toDateTimeInputValue(next);
}

function updatePublishedTime(value: string, hour: string, minute: string) {
  const next = fromDateTimeInputValue(value);
  next.setHours(Number(hour), Number(minute), 0, 0);
  return toDateTimeInputValue(next);
}

function PublishedAtPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = value ? fromDateTimeInputValue(value) : undefined;
  const timeBase = selected ?? new Date();
  const hour = String(timeBase.getHours()).padStart(2, "0");
  const minute = String(Math.floor(timeBase.getMinutes() / 5) * 5).padStart(
    2,
    "0",
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start gap-2 bg-background/50 font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="size-4 text-muted-foreground" />
          <span className="truncate">{formatPublishedAt(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(calc(100vw-2rem),360px)] overflow-hidden p-0"
        collisionPadding={16}
        sideOffset={6}
      >
        <div className="grid gap-0">
          <ShadcnCalendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              if (date) onChange(updatePublishedDate(value, date));
            }}
            className="mx-auto border-b border-border"
          />
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Hour</Label>
              <Select
                value={hour}
                onValueChange={(nextHour) =>
                  onChange(updatePublishedTime(value, nextHour, minute))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {HOURS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Minute</Label>
              <Select
                value={minute}
                onValueChange={(nextMinute) =>
                  onChange(updatePublishedTime(value, hour, nextMinute))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {MINUTES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              className="self-end"
              onClick={() => onChange("")}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="outline"
              className="self-end"
              onClick={() => onChange(toDateTimeInputValue(new Date()))}
            >
              Now
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function buildColumns(
  setDeleteTarget: (t: InstitutionNews | null) => void,
  openEdit: (t: InstitutionNews) => void,
  handleToggle: (t: InstitutionNews) => Promise<void>,
  activeLoadingId: number | null,
  canManage: boolean,
  showManageColumns: boolean,
): ColumnDef<InstitutionNews>[] {
  return [
    ...(showManageColumns
      ? [
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
              <div onClick={(event) => event.stopPropagation()}>
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(!!value)}
                  aria-label="Select row"
                />
              </div>
            ),
            enableSorting: false,
            enableHiding: false,
          } satisfies ColumnDef<InstitutionNews>,
        ]
      : []),
    {
      accessorKey: "title",
      header: "Notice Title",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {row.getValue("title")}
        </span>
      ),
    },
    ...(showManageColumns
      ? [
          {
            id: "target",
            header: "Target",
            cell: ({ row }) => (
              <span className="text-sm text-muted-foreground">
                {getTargetSummary(row.original)}
              </span>
            ),
          } satisfies ColumnDef<InstitutionNews>,
        ]
      : []),
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Badge
            variant="default"
            className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
              item.is_active
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15"
                : "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/15",
            )}
          >
            {item.is_active ? "Active" : "Disabled"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "published_at",
      header: "Published At",
      cell: ({ row }) => {
        const dateVal = row.getValue("published_at");
        return (
          <span className="text-sm text-muted-foreground">
            {dateVal
              ? new Date(dateVal as string).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Draft"}
          </span>
        );
      },
    },
    ...(showManageColumns
      ? [
          {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
              if (!canManage) return null;
              const item = row.original;
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <span className="sr-only">Open actions</span>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => openEdit(item)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={activeLoadingId === item.id}
                      onClick={() => void handleToggle(item)}
                    >
                      {activeLoadingId === item.id ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : null}
                      {item.is_active ? "Disable" : "Enable"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(item)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            },
          } satisfies ColumnDef<InstitutionNews>,
        ]
      : []),
  ];
}

export default function NewsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken, hasPermission } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const activeAcademicYearId = useActiveAcademicYearId();
  const isMobile = useIsMobile();
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
  const canUseWholeInstitutionTarget = hasPermission(
    "institution.noticeboard.create",
    activeInstitution?.id ?? null,
  );
  const canManageNoticeboard =
    canUseWholeInstitutionTarget ||
    hasPermission(
      "teacher.myinstitution.noticeboard.create",
      activeInstitution?.id ?? null,
    );

  const [items, setItems] = useState<InstitutionNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(-1);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [noticeView, setNoticeView] = useState<"received" | "created">("received");
  const [institutionIdFilter, setInstitutionIdFilter] = useState<string>("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InstitutionNews | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstitutionNews | null>(
    null,
  );
  const [viewingNotice, setViewingNotice] = useState<InstitutionNews | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [activeLoadingId, setActiveLoadingId] = useState<number | null>(null);

  const [institutionId, setInstitutionId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [imageFiles, setImageFiles] = useState<UploadedDocumentFile[]>([]);
  const [publishedAt, setPublishedAt] = useState("");
  const [formTab, setFormTab] = useState<"details" | "targets">("details");
  const [targetType, setTargetType] =
    useState<NoticeTargetType>("WHOLE_INSTITUTION");
  const [targetRoleCode, setTargetRoleCode] = useState<
    "teacher" | "student" | ""
  >("");
  const [targetId, setTargetId] = useState("");
  const [targetLabel, setTargetLabel] = useState("");
  const [programId, setProgramId] = useState("");
  const [programLabel, setProgramLabel] = useState("");
  const [sections, setSections] = useState<TargetOption[]>([]);
  const [sellOnMarketplace, setSellOnMarketplace] = useState(false);
  const [marketplacePrice, setMarketplacePrice] = useState<number>(0);
  const scopedInstitutionId = activeInstitution
    ? String(activeInstitution.id)
    : institutionId;

  const fetchTargetOptions = async (
    kind: "programs" | "teachers" | "students",
    search: string,
    page: number,
  ) => {
    if (!scopedInstitutionId) return { data: [], hasMore: false };
    const params = new URLSearchParams({
      kind,
      institutionId: scopedInstitutionId,
      search,
      page: String(page),
      limit: "15",
    });
    const res = await fetch(`/api/admin/institutions/news/options?${params}`, {
      headers: authHeader,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to load students");
    return {
      data: json.data ?? [],
      hasMore: page < Number(json.pageCount ?? 0),
    };
  };

  const loadSections = async (
    id: string,
    options: { resetSelection?: boolean } = {},
  ) => {
    setProgramId(id);
    if (options.resetSelection !== false) {
      setTargetId("");
      setTargetLabel("");
    }
    setSections([]);
    if (!id) return;
    const params = new URLSearchParams({
      kind: "sections",
      institutionId: scopedInstitutionId,
      programId: id,
      page: "1",
      limit: "100",
      search: "",
    });
    const res = await fetch(`/api/admin/institutions/news/options?${params}`, {
      headers: authHeader,
    });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error ?? "Failed to load sections");
    setSections(json.data ?? []);
  };

  const fetchItems = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search: debouncedSearch,
        view: noticeView,
      });
      const scopedInstitutionId = activeInstitution
        ? String(activeInstitution.id)
        : institutionIdFilter;
      if (scopedInstitutionId) q.set("institutionId", scopedInstitutionId);
      if (activeAcademicYearId) q.set("academicYearId", String(activeAcademicYearId));

      const res = await fetch(`/api/admin/institutions/news?${q.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (res.ok) {
        setItems(json.data || []);
        setPageCount(json.pageCount ?? -1);
      } else {
        toast.error(json.error ?? "Failed to load notices");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    activeInstitution,
    activeAcademicYearId,
    authHeader,
    pagination.pageIndex,
    pagination.pageSize,
    debouncedSearch,
    institutionIdFilter,
    noticeView,
  ]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void fetchItems(), 0);
    return () => window.clearTimeout(timeout);
  }, [isReady, fetchItems]);

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    setViewingNotice(null);
  }, [activeAcademicYearId]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const resetForm = () => {
    setInstitutionId(activeInstitution ? String(activeInstitution.id) : "");
    setTitle("");
    setSlug("");
    setContent("");
    setImageFiles([]);
    setPublishedAt("");
    setFormTab("details");
    setTargetType(canUseWholeInstitutionTarget ? "WHOLE_INSTITUTION" : "ROLE");
    setTargetRoleCode("");
    setTargetId("");
    setTargetLabel("");
    setProgramId("");
    setProgramLabel("");
    setSections([]);
    setSellOnMarketplace(false);
    setMarketplacePrice(0);
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (item: InstitutionNews) => {
    setEditing(item);
    setInstitutionId(String(item.institution_id));
    setTitle(item.title || "");
    setSlug(item.slug || "");
    setContent(item.content || "");
    setImageFiles(
      (item.image_urls?.length ? item.image_urls : [])
        .filter(Boolean)
        .slice(0, 3)
        .map((url) => imageUrlToUploadFile(url)),
    );
    setPublishedAt(item.published_at ? item.published_at.slice(0, 16) : "");
    setTargetType(item.target_type ?? "WHOLE_INSTITUTION");
    setTargetRoleCode(item.target_role_code ?? "");
    setTargetId(item.target_id ? String(item.target_id) : "");
    setProgramId(item.target_program_id ? String(item.target_program_id) : "");
    setProgramLabel(
      item.target_label?.includes(" > ")
        ? item.target_label.split(" > ")[0]
        : "",
    );
    setTargetLabel(item.target_label ?? "");
    setSellOnMarketplace(Boolean((item as any).sell_on_marketplace));
    setMarketplacePrice(Number((item as any).marketplace_price ?? 0));
    if (item.target_type === "SECTION" && item.target_program_id) {
      void loadSections(String(item.target_program_id), {
        resetSelection: false,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!institutionId || !title.trim())
      return toast.error("Institution and title are required");
    if (targetType === "WHOLE_INSTITUTION" && !canUseWholeInstitutionTarget)
      return toast.error("Only institution admins can send a notice to the whole institution");
    if (targetType === "ROLE" && !targetRoleCode)
      return toast.error("Select all teachers or all students");
    if (["PROGRAM", "SECTION", "USER"].includes(targetType) && !targetId)
      return toast.error("Select an notice target");
    if (targetType === "USER" && !targetRoleCode)
      return toast.error("Select teacher or student");
    setSubmitting(true);

    const payload = {
      institutionId: Number(institutionId),
      academicYearId: activeAcademicYearId,
      title: title.trim(),
      slug: (slug || toSlug(title)).trim(),
      content: content || null,
      imageUrls: imageFiles
        .map((file) => file.url)
        .filter(Boolean)
        .slice(0, 3),
      publishedAt: publishedAt || null,
      targetType,
      targetRoleCode: targetRoleCode || null,
      targetId: targetId ? Number(targetId) : null,
      targetProgramId:
        targetType === "SECTION" && programId ? Number(programId) : null,
      targetLabel: targetLabel || null,
      sellOnMarketplace,
      marketplacePrice,
    };

    const url = editing
      ? `/api/admin/institutions/news/${editing.id}`
      : `/api/admin/institutions/news`;
    const method = editing ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(editing ? "notice updated" : "notice created");
        setDialogOpen(false);
        await fetchItems();
      } else {
        toast.error(json.error ?? "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (t: InstitutionNews) => {
    setActiveLoadingId(t.id);
    try {
      const res = await fetch(`/api/admin/institutions/news`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [t.id], isActive: !t.is_active }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Updated notice status");
        await fetchItems();
      } else {
        toast.error(json.error ?? "Failed to toggle status");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActiveLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(
        `/api/admin/institutions/news/${deleteTarget.id}`,
        { method: "DELETE", headers: authHeader },
      );
      const json = await res.json();
      if (res.ok) {
        toast.success("Deleted notice");
        setDeleteTarget(null);
        await fetchItems();
      } else {
        toast.error(json.error ?? "Failed to delete");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const canManageCurrentView = canManageNoticeboard && noticeView === "created";
  const columns = buildColumns(
    setDeleteTarget,
    openEdit,
    handleToggle,
    activeLoadingId,
    canManageCurrentView,
    canManageCurrentView,
  );

  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Noticeboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Publish notices for everyone in the active institution.
          </p>
        </div>
        <div>
          {canManageNoticeboard && (
            <Button onClick={openCreate} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> New Notice
            </Button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        pagination={pagination}
        onPaginationChange={setPagination}
        pageCount={pageCount}
        onRowClick={(row) => setViewingNotice(row)}
        enableRowSelection={canManageCurrentView}
        toolbarLeft={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={noticeView === "received" ? "default" : "outline"}
                onClick={() => {
                  setNoticeView("received");
                  setPagination((p) => ({ ...p, pageIndex: 0 }));
                }}
              >
                Notices I Received
              </Button>
              {canManageNoticeboard && (
                <Button
                  type="button"
                  size="sm"
                  variant={noticeView === "created" ? "default" : "outline"}
                  onClick={() => {
                    setNoticeView("created");
                    setPagination((p) => ({ ...p, pageIndex: 0 }));
                  }}
                >
                  What I Created
                </Button>
              )}
            </div>
            <Input
              placeholder="Search notices..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination((p) => ({ ...p, pageIndex: 0 }));
              }}
              className="h-9 w-80 max-w-full bg-background/50 border border-border"
            />
            {!activeInstitution && (
              <AsyncSearchPopover<InstitutionOption>
                value={institutionIdFilter}
                onChange={(v) => {
                  setInstitutionIdFilter(v);
                  setPagination((p) => ({ ...p, pageIndex: 0 }));
                }}
                placeholder="All institutions"
                searchPlaceholder="Search institutions..."
                fetcher={async (search, page) => {
                  const res = await fetch(
                    `/api/admin/institutions/profiles?search=${encodeURIComponent(search)}&page=${page}&limit=10`,
                    { headers: authHeader },
                  );
                  if (!res.ok) throw new Error("Failed");
                  const json = await res.json();
                  return { data: json.data, hasMore: page < json.pageCount };
                }}
                getValue={(item) => String(item.id)}
                getLabel={(item) => item.organization_name || item.name || item.slug || `Institution ${item.id}`}
              />
            )}
          </div>
        }
        toolbarRight={
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchItems}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        }
        selectedActions={
          canManageCurrentView
            ? (selectedRows, resetSelection) => (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const ids = selectedRows.map((r) => r.id);
                      try {
                        const res = await fetch(
                          "/api/admin/institutions/news",
                          {
                            method: "PATCH",
                            headers: {
                              ...authHeader,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ ids, isActive: true }),
                          },
                        );
                        if (res.ok) {
                          toast.success("Activated selected notices");
                          resetSelection();
                          fetchItems();
                        } else toast.error("Failed to activate");
                      } catch {
                        toast.error("Network error");
                      }
                    }}
                  >
                    Bulk Enable
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const ids = selectedRows.map((r) => r.id);
                      try {
                        const res = await fetch(
                          "/api/admin/institutions/news",
                          {
                            method: "PATCH",
                            headers: {
                              ...authHeader,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ ids, isActive: false }),
                          },
                        );
                        if (res.ok) {
                          toast.success("Disabled selected notices");
                          resetSelection();
                          fetchItems();
                        } else toast.error("Failed to disable");
                      } catch {
                        toast.error("Network error");
                      }
                    }}
                  >
                    Bulk Disable
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (
                        confirm("Are you sure you want to delete these notices?")
                      ) {
                        const ids = selectedRows.map((r) => r.id);
                        try {
                          const res = await fetch(
                            "/api/admin/institutions/news",
                            {
                              method: "PATCH",
                              headers: {
                                ...authHeader,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({ ids, softDelete: true }),
                            },
                          );
                          if (res.ok) {
                            toast.success("Deleted selected notices");
                            resetSelection();
                            fetchItems();
                          } else toast.error("Failed to delete");
                        } catch {
                          toast.error("Network error");
                        }
                      }
                    }}
                  >
                    Bulk Delete
                  </Button>
                </div>
              )
            : undefined
        }
      />

      {isMobile ? (
        <Drawer open={Boolean(viewingNotice)} onOpenChange={(open) => !open && setViewingNotice(null)}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>{viewingNotice?.title}</DrawerTitle>
              <DrawerDescription>
                {viewingNotice && noticeView === "created" ? getTargetSummary(viewingNotice) : ""}
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6">
              {viewingNotice && <NoticeDetails notice={viewingNotice} showAdminMeta={noticeView === "created"} />}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={Boolean(viewingNotice)} onOpenChange={(open) => !open && setViewingNotice(null)}>
          <SheetContent className="flex h-dvh w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <SheetHeader className="shrink-0 border-b px-6 py-5 text-left">
              <SheetTitle>{viewingNotice?.title}</SheetTitle>
              <SheetDescription>
                {viewingNotice && noticeView === "created" ? getTargetSummary(viewingNotice) : ""}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {viewingNotice && <NoticeDetails notice={viewingNotice} showAdminMeta={noticeView === "created"} />}
            </div>
          </SheetContent>
        </Sheet>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:!max-w-3xl bg-card border border-border/80 backdrop-blur-2xl">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Newspaper className="size-5 text-primary" />
              {editing ? "Edit Notice" : "New Notice"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Publish an institution notice for students, teachers,
              parents, and drivers.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={formTab === "details" ? "default" : "outline"}
              onClick={() => setFormTab("details")}
            >
              Basic Details
            </Button>
            <Button
              type="button"
              size="sm"
              variant={formTab === "targets" ? "default" : "outline"}
              onClick={() => setFormTab("targets")}
            >
              Notice Targets
            </Button>
          </div>

          {formTab === "details" ? (
            <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
              {!activeInstitution && (
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium">Institution</Label>
                  <AsyncSearchPopover<InstitutionOption>
                    value={institutionId}
                    onChange={(v) => setInstitutionId(v)}
                    placeholder="Select institution"
                    searchPlaceholder="Search institutions..."
                    fetcher={async (search, page) => {
                      const res = await fetch(
                        `/api/admin/institutions/profiles?search=${encodeURIComponent(search)}&page=${page}&limit=10`,
                        { headers: authHeader },
                      );
                      if (!res.ok) throw new Error("Failed");
                      const json = await res.json();
                      return {
                        data: json.data,
                        hasMore: page < json.pageCount,
                      };
                    }}
                    getValue={(item) => String(item.id)}
                    getLabel={(item) =>
                      item.organization_name || item.name || item.slug || `Institution ${item.id}`
                    }
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Notice Title</Label>
                <Input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!editing) setSlug(toSlug(e.target.value));
                  }}
                  placeholder="e.g. Annual convocation date announced"
                  className="bg-background/50 border border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Published At</Label>
                <PublishedAtPicker
                  value={publishedAt}
                  onChange={setPublishedAt}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Notice images</Label>
                <div className="grid gap-2 rounded-lg border border-border bg-background/30 p-3">
                  <DocumentFileUpload
                    key={imageFiles
                      .map((file) => file.publicId || file.url)
                      .join("|")}
                    accessToken={accessToken}
                    files={imageFiles}
                    onFilesChange={(files) => setImageFiles(files.slice(0, 3))}
                    maxFiles={3}
                    maxSize={2 * 1024 * 1024}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload from device. Maximum 3 images.
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Notice Message</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the notice message..."
                  rows={6}
                  className="min-h-36 resize-none border border-border bg-background/50"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 rounded-xl border bg-muted/10 p-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Notice for whom?</Label>
                <Select
                  value={targetType}
                  onValueChange={(value) => {
                    setTargetType(value as NoticeTargetType);
                    setTargetRoleCode("");
                    setTargetId("");
                    setTargetLabel("");
                    setProgramId("");
                    setProgramLabel("");
                    setSections([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {canUseWholeInstitutionTarget && (
                      <SelectItem value="WHOLE_INSTITUTION">
                        Whole Institution
                      </SelectItem>
                    )}
                    <SelectItem value="ROLE">
                      All Teachers or All Students
                    </SelectItem>
                    <SelectItem value="PROGRAM">
                      Specific Class / Program
                    </SelectItem>
                    <SelectItem value="SECTION">
                      Students in a Specific Section
                    </SelectItem>
                    <SelectItem value="USER">
                      Specific Teacher or Student
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {targetType === "ROLE" && (
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select
                    value={targetRoleCode}
                    onValueChange={(value) =>
                      setTargetRoleCode(value as "teacher" | "student")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">All Teachers</SelectItem>
                      <SelectItem value="student">All Students</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {targetType === "ROLE" && (
                <p className="text-xs text-muted-foreground md:col-span-2">
                  Sends this notice to every active user in the selected group.
                </p>
              )}
              {(targetType === "PROGRAM" || targetType === "SECTION") && (
                <div className="space-y-2">
                  <Label>Class / Program</Label>
                  <AsyncSearchPopover<TargetOption>
                    value={programId}
                    selectedLabel={
                      targetType === "PROGRAM" ? targetLabel : programLabel
                    }
                    onChange={(value) => void loadSections(value)}
                    onSelectItem={(item) => {
                      const label = item.title ?? item.name ?? "Class";
                      setProgramLabel(label);
                      setTargetLabel(label);
                      if (targetType === "PROGRAM")
                        setTargetId(String(item.id));
                    }}
                    placeholder="Select class..."
                    searchPlaceholder="Search classes..."
                    fetcher={(search, page) =>
                      fetchTargetOptions("programs", search, page)
                    }
                    getValue={(item) => String(item.id)}
                    getLabel={(item) =>
                      item.title ?? item.name ?? `Class ${item.id}`
                    }
                  />
                </div>
              )}
              {targetType === "SECTION" && (
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select
                    value={targetId}
                    onValueChange={(value) => {
                      setTargetId(value);
                      const sectionLabel =
                        sections.find((item) => String(item.id) === value)
                          ?.name ?? "Section";
                      setTargetLabel(
                        `${programLabel || "Class"} > ${sectionLabel}`,
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          programId ? "Select section" : "Select class first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={String(section.id)}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {targetType === "PROGRAM" && (
                <p className="text-xs text-muted-foreground md:col-span-2">
                  Sends this notice to students enrolled in the selected class /
                  program.
                </p>
              )}
              {targetType === "SECTION" && (
                <p className="text-xs text-muted-foreground md:col-span-2">
                  Sends this notice only to students in the selected section.
                </p>
              )}
              {targetType === "USER" && (
                <>
                  <div className="space-y-2">
                    <Label>User type</Label>
                    <Select
                      value={targetRoleCode}
                      onValueChange={(value) => {
                        setTargetRoleCode(value as "teacher" | "student");
                        setTargetId("");
                        setTargetLabel("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Teacher or student" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {targetRoleCode && (
                    <div className="space-y-2 md:col-span-2">
                      <Label>Specific {targetRoleCode}</Label>
                      <AsyncSearchPopover<TargetOption>
                        value={targetId}
                        selectedLabel={targetLabel}
                        onChange={setTargetId}
                        onSelectItem={(item) => {
                          setTargetId(String(item.id));
                          setTargetLabel(
                            item.full_name ?? item.name ?? `User ${item.id}`,
                          );
                        }}
                        placeholder={`Select ${targetRoleCode}...`}
                        searchPlaceholder={`Search ${targetRoleCode}s...`}
                        fetcher={(search, page) =>
                          fetchTargetOptions(
                            targetRoleCode === "teacher"
                              ? "teachers"
                              : "students",
                            search,
                            page,
                          )
                        }
                        getValue={(item) => String(item.id)}
                        getLabel={(item) =>
                          item.full_name ?? item.name ?? `User ${item.id}`
                        }
                        renderItem={(item) => (
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {item.full_name ?? item.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {item.email || "No email provided"}
                            </p>
                          </div>
                        )}
                      />
                    </div>
                  )}
                </>
              )}
              {targetType === "WHOLE_INSTITUTION" && (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground md:col-span-2">
                  This notice will be shown to every teacher, student, parent,
                  and driver in the active institution.
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            {formTab === "details" ? (
              <Button type="button" onClick={() => setFormTab("targets")}>
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : editing ? (
                  "Save Changes"
                ) : (
                  "Create Notice"
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">
              Delete notice?
            </AlertDialogTitle>
            <p className="text-sm text-muted-foreground">
              This action soft-deletes this notice. It will not be active or
              listed anymore.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="hover:bg-muted">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

