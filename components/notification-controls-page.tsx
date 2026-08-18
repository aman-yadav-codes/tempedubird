"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Loader2,
  MoreHorizontal,
  Power,
  PowerOff,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MultiSelect } from "@/components/ui/multi-select";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";

type InstitutionNotificationSetting = {
  institution_id: number;
  institution_name: string;
  notification_type: string;
  title_template: string;
  is_enabled: boolean;
};

type InstitutionNotificationRow = {
  institution_id: number;
  institution_name: string;
  total_count: number;
  enabled_count: number;
  disabled_count: number;
  enabled_types: string[];
  settings: InstitutionNotificationSetting[];
  search_text: string;
};

function toRows(settings: InstitutionNotificationSetting[]): InstitutionNotificationRow[] {
  const grouped = new Map<number, InstitutionNotificationRow>();

  settings.forEach((setting) => {
    const existing = grouped.get(setting.institution_id) ?? {
      institution_id: setting.institution_id,
      institution_name: setting.institution_name,
      total_count: 0,
      enabled_count: 0,
      disabled_count: 0,
      enabled_types: [],
      settings: [],
      search_text: "",
    };

    existing.total_count += 1;
    if (setting.is_enabled) {
      existing.enabled_count += 1;
      existing.enabled_types.push(setting.notification_type);
    } else {
      existing.disabled_count += 1;
    }
    existing.settings.push(setting);
    existing.search_text = `${existing.institution_name} ${existing.settings
      .map((item) => item.notification_type)
      .join(" ")}`;
    grouped.set(setting.institution_id, existing);
  });

  return Array.from(grouped.values()).sort((a, b) =>
    a.institution_name.localeCompare(b.institution_name)
  );
}

function buildColumns({
  savingKey,
  onView,
  onEdit,
  onToggleAll,
  onClearTypes,
}: {
  savingKey: string | null;
  onView: (row: InstitutionNotificationRow) => void;
  onEdit: (row: InstitutionNotificationRow) => void;
  onToggleAll: (row: InstitutionNotificationRow) => void;
  onClearTypes: (row: InstitutionNotificationRow) => void;
}): ColumnDef<InstitutionNotificationRow>[] {
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
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "search_text",
      header: "Institution",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.institution_name}</p>
          <p className="text-xs text-muted-foreground">ID: {row.original.institution_id}</p>
        </div>
      ),
    },
    {
      accessorKey: "enabled_count",
      header: "Assigned Types",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.enabled_count}/{row.original.total_count} enabled
        </Badge>
      ),
    },
    {
      accessorKey: "disabled_count",
      header: "Disabled",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.disabled_count} type{row.original.disabled_count === 1 ? "" : "s"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={
            row.original.enabled_count > 0
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15"
              : "border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/15"
          }
        >
          {row.original.enabled_count > 0 ? "Active" : "No types"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        const busy = savingKey === `institution:${item.institution_id}`;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-accent">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onView(item)}>
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(item)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleAll(item)} disabled={busy}>
                {busy ? "Saving..." : item.enabled_count > 0 ? "Disable all" : "Enable all"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onClearTypes(item)}
                disabled={busy}
              >
                Clear types
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export function NotificationControlsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const [rows, setRows] = useState<InstitutionNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [viewing, setViewing] = useState<InstitutionNotificationRow | null>(null);
  const [editing, setEditing] = useState<InstitutionNotificationRow | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

  const fetchSettings = useCallback(async () => {
    if (!authHeader) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/institution-notification-settings", {
        headers: authHeader,
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load institution notification settings");
      }

      setRows(toRows(json.data ?? []));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load notification controls");
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    if (!isReady) return;
    const timer = window.setTimeout(() => {
      void fetchSettings();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isReady, fetchSettings]);

  const runBulkAction = useCallback(async (institutionIds: number[], action: "enable_all" | "disable_all" | "clear_types") => {
    if (!authHeader || institutionIds.length === 0) return;
    setSavingKey(institutionIds.length === 1 ? `institution:${institutionIds[0]}` : "bulk");

    try {
      const res = await fetch("/api/admin/institution-notification-settings", {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ institution_ids: institutionIds, action }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to update notification controls");
      }

      toast.success("Notification controls updated.");
      await fetchSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update notification controls");
    } finally {
      setSavingKey(null);
    }
  }, [authHeader, fetchSettings]);

  async function saveAssignedTypes() {
    if (!authHeader || !editing) return;
    setSavingKey(`institution:${editing.institution_id}`);

    try {
      const res = await fetch("/api/admin/institution-notification-settings", {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          institution_id: editing.institution_id,
          enabled_types: selectedTypes,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to assign notification types");
      }

      toast.success("Notification types assigned.");
      setEditOpen(false);
      setEditing(null);
      await fetchSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign notification types");
    } finally {
      setSavingKey(null);
    }
  }

  const openEdit = useCallback((row: InstitutionNotificationRow) => {
    setEditing(row);
    setSelectedTypes(row.enabled_types);
    setEditOpen(true);
  }, []);

  const columns = useMemo(
    () =>
      buildColumns({
        savingKey,
        onView: (row) => {
          setViewing(row);
          setViewOpen(true);
        },
        onEdit: openEdit,
        onToggleAll: (row) =>
          void runBulkAction(
            [row.institution_id],
            row.enabled_count > 0 ? "disable_all" : "enable_all"
          ),
        onClearTypes: (row) => void runBulkAction([row.institution_id], "clear_types"),
      }),
    [savingKey, openEdit, runBulkAction]
  );

  return (
    <div className="w-full max-w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notification Controls</h1>
          <p className="text-sm text-muted-foreground">
            Manage institution notification delivery settings.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        searchKey="search_text"
        filterPlaceholder="Search by institution or type..."
        showRowNumbers
        getRowId={(row) => String(row.institution_id)}
        toolbarRight={
          <Button variant="ghost" size="icon" onClick={fetchSettings} disabled={loading} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        }
        selectedActions={(selectedRows, resetSelection) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={savingKey === "bulk"}
              onClick={async () => {
                const shouldDisable = selectedRows.some((row) => row.enabled_count > 0);
                await runBulkAction(
                  selectedRows.map((row) => row.institution_id),
                  shouldDisable ? "disable_all" : "enable_all"
                );
                resetSelection();
              }}
            >
              {selectedRows.some((row) => row.enabled_count > 0) ? (
                <PowerOff className="size-4" />
              ) : (
                <Power className="size-4" />
              )}
              {selectedRows.some((row) => row.enabled_count > 0) ? "Disable" : "Enable"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={savingKey === "bulk"}
              onClick={async () => {
                await runBulkAction(selectedRows.map((row) => row.institution_id), "clear_types");
                resetSelection();
              }}
            >
              <Trash2 className="size-4" />
              Clear types
            </Button>
          </div>
        )}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Notification Types</DialogTitle>
            <DialogDescription>
              Assign platform-defined notification types to this institution.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <p className="font-semibold">{editing.institution_name}</p>
                <p className="text-sm text-muted-foreground">Institution #{editing.institution_id}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Notification types</p>
                <MultiSelect
                  options={editing.settings.map((setting) => ({
                    label: setting.notification_type,
                    value: setting.notification_type,
                    description: setting.title_template,
                  }))}
                  value={selectedTypes}
                  onValueChange={setSelectedTypes}
                  placeholder="Select notification types"
                  maxCount={4}
                  responsive
                  deduplicateOptions
                  popoverClassName="z-100"
                />
                <p className="text-xs text-muted-foreground">
                  Showing all active notification types created by the platform admin.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveAssignedTypes} disabled={savingKey === `institution:${editing.institution_id}`}>
                  {savingKey === `institution:${editing.institution_id}` && <Loader2 className="size-4 animate-spin" />}
                  Save Types
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="size-5" />
              Notification Control
            </SheetTitle>
            <SheetDescription>Institution-level notification assignments.</SheetDescription>
          </SheetHeader>
          {viewing && (
            <div className="space-y-4 px-4 pb-4">
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Institution</p>
                <p className="mt-1 font-semibold">{viewing.institution_name}</p>
                <p className="text-sm text-muted-foreground">ID: {viewing.institution_id}</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Assigned types</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {viewing.enabled_types.length ? (
                    viewing.enabled_types.map((type) => (
                      <code key={type} className="rounded bg-muted px-2 py-1 text-xs">
                        {type}
                      </code>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No types assigned.</p>
                  )}
                </div>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Summary</p>
                <p className="mt-1 text-sm">
                  {viewing.enabled_count} enabled, {viewing.disabled_count} disabled out of {viewing.total_count} platform types.
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
