"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { CalendarDays, Loader2, MoreHorizontal, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { DatePicker } from "@/components/shared/date-picker";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { formatIndianDate } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

type SessionTemplate = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function dateInput(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function currentSessionStartYear() {
  const today = new Date();
  return today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
}

function currentCalendarYear() {
  return new Date().getFullYear();
}

function maxSessionYear() {
  return currentCalendarYear() + 10;
}

function currentYearStartInput() {
  return `${currentCalendarYear()}-01-01`;
}

function currentSessionStartInput() {
  return `${currentSessionStartYear()}-04-01`;
}

function defaultEndForStart(startDate: string) {
  const year = Number(startDate.slice(0, 4));
  return Number.isInteger(year) ? `${year + 1}-03-31` : "";
}

function generatedSessionName(startDate: string, endDate: string) {
  const startYear = Number(startDate.slice(0, 4));
  const endYear = Number(endDate.slice(0, 4));
  if (!Number.isInteger(startYear)) return "";
  return Number.isInteger(endYear) ? `${startYear}-${endYear}` : `${startYear}-${startYear + 1}`;
}

function localDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function withGeneratedName(form: { startDate: string; endDate: string; isActive: boolean }) {
  return {
    ...form,
    name: generatedSessionName(form.startDate, form.endDate),
  };
}

function currentSessionDefaults() {
  const startDate = currentSessionStartInput();
  return withGeneratedName({
    startDate,
    endDate: defaultEndForStart(startDate),
    isActive: true,
  });
}

function isPastSession(item: Pick<SessionTemplate, "end_date">) {
  return dateInput(item.end_date) < todayInput();
}

export default function AcademicSessionsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
  const [items, setItems] = useState<SessionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(-1);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SessionTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SessionTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(currentSessionDefaults);

  const fetchItems = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search: debouncedSearch,
      });
      const res = await fetch(`/api/admin/institutions/session-templates?${params}`, { headers: authHeader });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load sessions");
      setItems(json.data || []);
      setPageCount(json.pageCount ?? -1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader, debouncedSearch, pagination.pageIndex, pagination.pageSize]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(fetchItems, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchItems, isReady]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  function openCreate() {
    setEditing(null);
    setForm(currentSessionDefaults());
    setDialogOpen(true);
  }

  function openEdit(item: SessionTemplate) {
    setEditing(item);
    setForm(withGeneratedName({
      startDate: dateInput(item.start_date),
      endDate: dateInput(item.end_date),
      isActive: item.is_active,
    }));
    setDialogOpen(true);
  }

  async function saveSession() {
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      toast.error("Name, start date and end date are required");
      return;
    }
    if (form.endDate < form.startDate) {
      toast.error("End date must be after start date");
      return;
    }
    if (form.startDate < currentYearStartInput()) {
      toast.error("Previous years cannot be selected");
      return;
    }
    if (form.endDate < todayInput()) {
      toast.error("Previous sessions cannot be saved");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/institutions/session-templates", {
        method: editing ? "PATCH" : "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          name: form.name,
          startDate: form.startDate,
          endDate: form.endDate,
          isActive: form.isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save session");
      toast.success(editing ? "Session updated" : "Session created");
      setDialogOpen(false);
      fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save session");
    } finally {
      setSubmitting(false);
    }
  }

  const toggleActive = useCallback(async (item: SessionTemplate) => {
    const res = await fetch("/api/admin/institutions/session-templates", {
      method: "PATCH",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, isActive: !item.is_active }),
    });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error || "Failed to update session");
    toast.success("Session status updated");
    fetchItems();
  }, [authHeader, fetchItems]);

  async function deleteSession() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/institutions/session-templates?id=${deleteTarget.id}`, {
      method: "DELETE",
      headers: authHeader,
    });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error || "Failed to delete session");
    toast.success("Session deleted");
    setDeleteTarget(null);
    fetchItems();
  }

  const columns = useMemo<ColumnDef<SessionTemplate>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    { accessorKey: "name", header: "Session", cell: ({ row }) => <div className="font-semibold">{row.original.name}</div> },
    { accessorKey: "start_date", header: "Default Start", cell: ({ row }) => <span className="text-muted-foreground">{formatIndianDate(row.original.start_date)}</span> },
    { accessorKey: "end_date", header: "Default End", cell: ({ row }) => <span className="text-muted-foreground">{formatIndianDate(row.original.end_date)}</span> },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={cn(row.original.is_active ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" : "border-rose-500/20 bg-rose-500/10 text-rose-500")}>
          {row.original.is_active ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="Session actions">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => openEdit(row.original)}>Edit</DropdownMenuItem>
            <DropdownMenuItem
              disabled={!row.original.is_active && isPastSession(row.original)}
              onClick={() => toggleActive(row.original)}
            >
              {row.original.is_active ? "Disable" : "Enable"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(row.original)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [toggleActive]);

  return (
    <div className="w-full max-w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Academic Sessions</h1>
          <p className="text-sm text-muted-foreground">Create reusable sessions for every institution.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" />
          New Session
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        pageCount={pageCount}
        manualPagination
        pagination={pagination}
        onPaginationChange={setPagination}
        showRowNumbers
        toolbarLeft={
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search sessions..."
            className="w-full sm:max-w-sm"
          />
        }
        toolbarRight={
          <Button variant="ghost" size="icon" onClick={fetchItems} disabled={loading} title="Refresh">
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:!max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" />
              {editing ? "Edit Session" : "New Session"}
            </DialogTitle>
            <DialogDescription>
              These dates become the default when an institution selects this session.
              Ended sessions cannot be created or re-enabled.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Name</Label>
              <Input value={form.name} readOnly className="bg-muted/40" placeholder="2026-2027" />
            </div>
            <div className="grid gap-1.5">
              <Label>Default Start Date</Label>
              <DatePicker
                value={form.startDate}
                onChange={(value) => setForm((current) => {
                  const nextEndDate = current.endDate && current.endDate >= value
                    ? current.endDate
                    : defaultEndForStart(value);
                  return withGeneratedName({ ...current, startDate: value, endDate: nextEndDate });
                })}
                fromYear={currentCalendarYear()}
                toYear={maxSessionYear()}
                disabledDates={{ before: localDate(currentYearStartInput()) }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Default End Date</Label>
              <DatePicker
                value={form.endDate}
                onChange={(value) => setForm((current) => withGeneratedName({ ...current, endDate: value }))}
                fromYear={currentCalendarYear()}
                toYear={maxSessionYear() + 1}
                disabledDates={{ before: new Date(todayInput()) }}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Status</Label>
              <Button type="button" variant="outline" className="justify-start" onClick={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}>
                {form.isActive ? "Active" : "Disabled"}
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={submitting} onClick={saveSession}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Save Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>A session already selected by an institution cannot be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={deleteSession}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
