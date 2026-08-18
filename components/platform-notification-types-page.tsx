"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Loader2,
  MoreHorizontal,
  Power,
  PowerOff,
  RefreshCw,
  Save,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";

type NotificationTemplate = {
  id: number;
  code: string;
  title_template: string;
  body_template: string;
  is_active: boolean;
  search_text?: string;
};

function withSearchText(template: NotificationTemplate): NotificationTemplate {
  return {
    ...template,
    search_text: `${template.code} ${template.title_template} ${template.body_template}`,
  };
}

function buildColumns({
  savingId,
  onView,
  onEdit,
  onToggle,
  onDelete,
}: {
  savingId: number | null;
  onView: (template: NotificationTemplate) => void;
  onEdit: (template: NotificationTemplate) => void;
  onToggle: (template: NotificationTemplate) => void;
  onDelete: (template: NotificationTemplate) => void;
}): ColumnDef<NotificationTemplate>[] {
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
      header: "Type",
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-muted px-2 py-1 text-xs">{row.original.code}</code>
          <Badge
            className={
              row.original.is_active
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15"
                : "border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/15"
            }
          >
            {row.original.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "title_template",
      header: "Title Template",
      cell: ({ row }) => (
        <span className="block max-w-[300px] truncate text-sm text-foreground">
          {row.original.title_template}
        </span>
      ),
    },
    {
      accessorKey: "body_template",
      header: "Body Template",
      cell: ({ row }) => (
        <span className="block max-w-[360px] truncate text-sm text-muted-foreground">
          {row.original.body_template}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const template = row.original;
        const busy = savingId === template.id;

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
              <DropdownMenuItem onClick={() => onView(template)}>
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(template)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggle(template)} disabled={busy}>
                {busy ? "Saving..." : template.is_active ? "Disable" : "Enable"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(template)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export function PlatformNotificationTypesPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [viewing, setViewing] = useState<NotificationTemplate | null>(null);
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotificationTemplate | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

  const fetchTemplates = useCallback(async () => {
    if (!authHeader) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/notification-templates", {
        headers: authHeader,
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load notification types");
      }

      setTemplates((json.data ?? []).map(withSearchText));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load notification types");
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    if (!isReady) return;
    const timer = window.setTimeout(() => {
      void fetchTemplates();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isReady, fetchTemplates]);

  const updateTemplate = useCallback(async (id: number, patch: Partial<NotificationTemplate>) => {
    if (!authHeader) return;
    setSavingId(id);

    try {
      const res = await fetch(`/api/admin/notification-templates/${id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? "Failed to update notification type");

      setTemplates((current) =>
        current.map((item) => (item.id === id ? withSearchText(json.data) : item))
      );
      toast.success("Notification type updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update notification type");
    } finally {
      setSavingId(null);
    }
  }, [authHeader]);

  async function bulkSetActive(rows: NotificationTemplate[], isActive: boolean) {
    if (!authHeader || rows.length === 0) return;
    setSavingId(-1);

    try {
      const res = await fetch("/api/admin/notification-templates", {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ids: rows.map((row) => row.id), is_active: isActive }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? "Failed to update notification types");

      toast.success(`${isActive ? "Enabled" : "Disabled"} selected notification types.`);
      await fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update notification types");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteTemplates(rows: NotificationTemplate[]) {
    if (!authHeader || rows.length === 0) return;
    setSavingId(-1);

    try {
      const res = await fetch("/api/admin/notification-templates", {
        method: "DELETE",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ids: rows.map((row) => row.id) }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? "Failed to delete notification types");

      toast.success("Deleted selected notification types.");
      await fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete notification types");
    } finally {
      setSavingId(null);
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  }

  const columns = useMemo(
    () =>
      buildColumns({
        savingId,
        onView: (template) => {
          setViewing(template);
          setViewOpen(true);
        },
        onEdit: (template) => {
          setEditing(template);
          setEditOpen(true);
        },
        onToggle: (template) => void updateTemplate(template.id, { is_active: !template.is_active }),
        onDelete: (template) => {
          setDeleteTarget(template);
          setDeleteOpen(true);
        },
      }),
    [savingId, updateTemplate]
  );

  return (
    <div className="w-full max-w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Notification Types</h1>
        <p className="text-sm text-muted-foreground">
          Support and institution complaint events used by the notification bell.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={templates}
        loading={loading}
        searchKey="search_text"
        filterPlaceholder="Search by type or template..."
        showRowNumbers
        getRowId={(row) => String(row.id)}
        toolbarRight={
          <Button variant="ghost" size="icon" onClick={fetchTemplates} disabled={loading} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        }
        selectedActions={(selectedRows, resetSelection) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={savingId === -1}
              onClick={async () => {
                const shouldDisable = selectedRows.some((row) => row.is_active);
                await bulkSetActive(selectedRows, !shouldDisable);
                resetSelection();
              }}
            >
              {selectedRows.some((row) => row.is_active) ? <PowerOff className="size-4" /> : <Power className="size-4" />}
              {selectedRows.some((row) => row.is_active) ? "Disable" : "Enable"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={savingId === -1}
              onClick={async () => {
                await deleteTemplates(selectedRows);
                resetSelection();
              }}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        )}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Notification Type</DialogTitle>
            <DialogDescription>
              Update the platform template used when this notification is generated.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Type code</Label>
                <Input
                  value={editing.code}
                  onChange={(event) => setEditing({ ...editing, code: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Title template</Label>
                <Input
                  value={editing.title_template}
                  onChange={(event) => setEditing({ ...editing, title_template: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Body template</Label>
                <Textarea
                  value={editing.body_template}
                  onChange={(event) => setEditing({ ...editing, body_template: event.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={editing.is_active}
                  onCheckedChange={(checked) => setEditing({ ...editing, is_active: checked === true })}
                />
                Active
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    await updateTemplate(editing.id, {
                      code: editing.code,
                      title_template: editing.title_template,
                      body_template: editing.body_template,
                      is_active: editing.is_active,
                    });
                    setEditOpen(false);
                  }}
                  disabled={savingId === editing.id}
                >
                  {savingId === editing.id ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Notification Type?</DialogTitle>
            <DialogDescription>
              This also clears institution assignments for this type.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteTemplates([deleteTarget])}
              disabled={savingId === -1}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Notification Type</SheetTitle>
            <SheetDescription>Platform template details.</SheetDescription>
          </SheetHeader>
          {viewing && (
            <div className="space-y-4 px-4 pb-4">
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Code</p>
                <code className="mt-1 inline-block rounded bg-muted px-2 py-1 text-xs">
                  {viewing.code}
                </code>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge className="mt-2" variant={viewing.is_active ? "default" : "outline"}>
                  {viewing.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Title template</p>
                <p className="mt-1 text-sm">{viewing.title_template}</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-xs text-muted-foreground">Body template</p>
                <p className="mt-1 text-sm">{viewing.body_template}</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
