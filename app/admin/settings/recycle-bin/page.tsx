"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  CalendarDays,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

type RecycleBinRecord = {
  resource_key: string;
  record_id: string;
  record_name: string;
  record_type: string;
  institution_id: number | null;
  institution_name: string | null;
  deleted_by: number | null;
  deleted_by_name: string | null;
  deleted_at: string | null;
  can_restore: boolean;
};

type RecycleBinResponse = {
  data: RecycleBinRecord[];
  total: number;
  page: number;
  pageCount: number;
  resourceTypes: Array<{ key: string; label: string }>;
  capabilities: { canPermanentlyDelete: boolean };
};

type PendingAction = {
  action: "restore" | "delete";
  records: RecycleBinRecord[];
};

const ALL_TYPES = "__all__";
const emptyResponse: RecycleBinResponse = {
  data: [],
  total: 0,
  page: 1,
  pageCount: 0,
  resourceTypes: [],
  capabilities: { canPermanentlyDelete: false },
};

function formatDeletedAt(value: string | null) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function DateFilter({
  value,
  onChange,
  placeholder,
}: {
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start gap-2 font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarDays className="size-4" />
          <span className="truncate">{value ? format(value, "dd MMM yyyy") : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date);
            if (date) setOpen(false);
          }}
        />
        {value && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              <X className="size-4" />
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function RecycleBinPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [result, setResult] = useState<RecycleBinResponse>(emptyResponse);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState(ALL_TYPES);
  const [deletedBy, setDeletedBy] = useState("");
  const [deletedFrom, setDeletedFrom] = useState<Date>();
  const [deletedTo, setDeletedTo] = useState<Date>();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirmation, setConfirmation] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search.trim()) params.set("search", search.trim());
    if (type !== ALL_TYPES) params.set("type", type);
    if (deletedBy.trim()) params.set("deletedBy", deletedBy.trim());
    if (deletedFrom) params.set("deletedFrom", format(deletedFrom, "yyyy-MM-dd"));
    if (deletedTo) params.set("deletedTo", format(deletedTo, "yyyy-MM-dd"));
    return params.toString();
  }, [deletedBy, deletedFrom, deletedTo, page, search, type]);

  const loadRecords = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/recycle-bin?${query}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to load recycle bin");
      setResult(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load recycle bin");
    } finally {
      setLoading(false);
    }
  }, [accessToken, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRecords(), 250);
    return () => window.clearTimeout(timer);
  }, [loadRecords]);

  async function runAction() {
    if (!pending || !accessToken) return;
    setMutating(true);
    try {
      const permanent = pending.action === "delete";
      const response = await fetch("/api/admin/recycle-bin", {
        method: permanent ? "DELETE" : "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: pending.records.map((record) => ({
            resourceKey: record.resource_key,
            recordId: record.record_id,
          })),
          ...(permanent ? { confirmation } : {}),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Recycle bin action failed");
      toast.success(
        `${pending.records.length} ${pending.records.length === 1 ? "record" : "records"} ${
          permanent ? "permanently deleted" : "restored"
        }.`
      );
      setPending(null);
      setConfirmation("");
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Recycle bin action failed");
    } finally {
      setMutating(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setType(ALL_TYPES);
    setDeletedBy("");
    setDeletedFrom(undefined);
    setDeletedTo(undefined);
    setPage(1);
  }

  const columns = useMemo<ColumnDef<RecycleBinRecord>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all visible records"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select ${row.original.record_name}`}
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "record_name",
      header: "Record",
      cell: ({ row }) => (
        <div className="max-w-80">
          <p className="truncate font-medium">{row.original.record_name}</p>
          <p className="text-xs text-muted-foreground">ID {row.original.record_id}</p>
        </div>
      ),
    },
    {
      accessorKey: "record_type",
      header: "Type",
      cell: ({ row }) => <Badge variant="outline">{row.original.record_type}</Badge>,
    },
    {
      accessorKey: "institution_name",
      header: "Institution",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.institution_name ?? "Platform"}
        </span>
      ),
    },
    {
      accessorKey: "deleted_by_name",
      header: "Deleted By",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.deleted_by_name ?? "System / unavailable"}
        </span>
      ),
    },
    {
      accessorKey: "deleted_at",
      header: "Deleted At",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDeletedAt(row.original.deleted_at)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          {row.original.can_restore && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPending({ action: "restore", records: [row.original] })}
            >
              <RotateCcw className="size-4" />
              Restore
            </Button>
          )}
          {result.capabilities.canPermanentlyDelete && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setPending({ action: "delete", records: [row.original] })}
            >
              <Trash2 className="size-4" />
              Delete forever
            </Button>
          )}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ], [result.capabilities.canPermanentlyDelete]);

  const pagination: PaginationState = { pageIndex: page - 1, pageSize: 20 };
  const filtersActive =
    Boolean(search.trim()) ||
    type !== ALL_TYPES ||
    Boolean(deletedBy.trim()) ||
    Boolean(deletedFrom) ||
    Boolean(deletedTo);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
            <Trash2 className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recycle Bin</h1>
            <p className="text-muted-foreground">
              Restore deleted records that belong to your role, institution, or account.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => void loadRecords()} disabled={loading}>
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="font-medium">Role and scope protection is active</p>
          <p className="text-muted-foreground">
            You only see deleted records you are authorized to manage. Records from other
            institutions or users are excluded by the server.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search records..."
              className="pl-9"
            />
          </label>
          <Select
            value={type}
            onValueChange={(value) => {
              setType(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full" aria-label="Filter by record type">
              <SelectValue placeholder="All record types" />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectItem value={ALL_TYPES}>All record types</SelectItem>
              {result.resourceTypes.map((resource) => (
                <SelectItem key={resource.key} value={resource.key}>
                  {resource.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={deletedBy}
            onChange={(event) => {
              setDeletedBy(event.target.value);
              setPage(1);
            }}
            placeholder="Deleted by..."
          />
          <DateFilter
            value={deletedFrom}
            onChange={(date) => {
              setDeletedFrom(date);
              setPage(1);
            }}
            placeholder="Deleted from"
          />
          <DateFilter
            value={deletedTo}
            onChange={(date) => {
              setDeletedTo(date);
              setPage(1);
            }}
            placeholder="Deleted to"
          />
        </div>
        {filtersActive && (
          <Button variant="ghost" size="sm" className="mt-3" onClick={clearFilters}>
            <X className="size-4" />
            Clear filters
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Deleted records</p>
            <p className="text-sm text-muted-foreground">
              {result.total} recoverable {result.total === 1 ? "record" : "records"}
            </p>
          </div>
          {result.capabilities.canPermanentlyDelete && (
            <Badge variant="destructive">Super Admin permanent delete enabled</Badge>
          )}
        </div>

        <DataTable
          columns={columns}
          data={result.data}
          loading={loading}
          emptyText="No deleted records match your role and filters."
          getRowId={(record) => `${record.resource_key}:${record.record_id}`}
          enableRowSelection={(row) =>
            row.original.can_restore || result.capabilities.canPermanentlyDelete
          }
          manualPagination
          pageCount={result.pageCount}
          pagination={pagination}
          onPaginationChange={(updater) => {
            const next = typeof updater === "function" ? updater(pagination) : updater;
            setPage(next.pageIndex + 1);
          }}
          selectedActions={(selectedRows, resetSelection) => {
            const restorable = selectedRows.filter((record) => record.can_restore);
            return (
              <>
                {restorable.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPending({ action: "restore", records: restorable });
                      resetSelection();
                    }}
                  >
                    <RotateCcw className="size-4" />
                    Restore selected ({restorable.length})
                  </Button>
                )}
                {result.capabilities.canPermanentlyDelete && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setPending({ action: "delete", records: selectedRows });
                      resetSelection();
                    }}
                  >
                    <Trash2 className="size-4" />
                    Delete selected ({selectedRows.length})
                  </Button>
                )}
              </>
            );
          }}
        />
      </div>

      <AlertDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open && !mutating) {
            setPending(null);
            setConfirmation("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.action === "delete"
                ? `Permanently delete ${pending.records.length} record${pending.records.length === 1 ? "" : "s"}?`
                : `Restore ${pending?.records.length ?? 0} record${pending?.records.length === 1 ? "" : "s"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.action === "delete"
                ? "This action is irreversible and may be blocked if other records still depend on them."
                : "The soft-delete fields will be cleared and the records will return to their authorized modules."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pending?.action === "delete" && (
            <div className="space-y-2">
              <p className="text-sm">
                Type <span className="font-semibold">PERMANENTLY DELETE</span> to confirm.
              </p>
              <Input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void runAction();
              }}
              disabled={
                mutating ||
                (pending?.action === "delete" && confirmation !== "PERMANENTLY DELETE")
              }
              className={
                pending?.action === "delete"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
            >
              {mutating && <Loader2 className="size-4 animate-spin" />}
              {pending?.action === "delete" ? "Delete forever" : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
