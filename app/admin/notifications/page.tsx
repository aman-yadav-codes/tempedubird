"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  AlertTriangle,
  BellOff,
  BellRing,
  Check,
  Info,
  Loader2,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { formatIndianRelativeTime } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

type NotificationItem = {
  recipient_id: string;
  notification_id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  is_read: boolean;
  is_important: boolean;
  created_at: string;
};

type NotificationPreference = {
  notification_type: string;
  is_enabled: boolean;
  is_critical: boolean;
};

type NotificationView = "all" | "unread" | "important" | "muted";

const PAGE_SIZE = 10;

const typeStyle: Record<string, string> = {
  info: "bg-blue-100 text-blue-600",
  success: "bg-green-100 text-green-600",
  warning: "bg-amber-100 text-amber-600",
  error: "bg-red-100 text-red-600",
  low: "bg-slate-100 text-slate-600",
  normal: "bg-blue-100 text-blue-600",
  high: "bg-amber-100 text-amber-600",
  critical: "bg-red-100 text-red-600",
};

const criticalTypes = new Set([
  "system.alert",
  "security.alert",
  "account.locked",
  "password.changed",
]);

function NotificationIcon({ priority }: { priority: string }) {
  if (priority === "critical") return <X className="size-4" />;
  if (priority === "high") return <AlertTriangle className="size-4" />;
  if (priority === "success") return <Check className="size-4" />;
  return <Info className="size-4" />;
}

function isConfirmedFeeNotification(item: NotificationItem) {
  return (
    item.type === "fees.payment_request.approved" ||
    item.title.toLowerCase().includes("fee payment confirmed")
  );
}

function notificationIconStyle(item: NotificationItem) {
  if (isConfirmedFeeNotification(item)) return typeStyle.success;
  return typeStyle[item.priority] ?? typeStyle.normal;
}

function notificationHref(item: NotificationItem) {
  if (typeof item.payload?.url === "string") return item.payload.url;
  if (item.entity_type === "support_ticket" && item.entity_id) {
    return `/admin/support?ticket=${item.entity_id}`;
  }

  return "/admin/notifications";
}

function priorityLabel(priority: string) {
  return priority.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
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

export default function NotificationsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<NotificationView>("all");
  const [markingRead, setMarkingRead] = useState(false);
  const [openingNotificationId, setOpeningNotificationId] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [importantCount, setImportantCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

  const mutedPreferences = useMemo(
    () => preferences.filter((item) => !item.is_enabled),
    [preferences]
  );
  const mutedTypeSet = useMemo(
    () => new Set(mutedPreferences.map((item) => item.notification_type)),
    [mutedPreferences]
  );

  const fetchNotifications = useCallback(async () => {
    if (!authHeader) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (view === "unread") params.set("unread_only", "true");
      if (view === "important") params.set("important_only", "true");

      const requests: Promise<Response>[] = [
        fetch("/api/admin/notification-preferences", { headers: authHeader }),
      ];
      if (view !== "muted") {
        requests.unshift(fetch(`/api/admin/notifications?${params.toString()}`, { headers: authHeader }));
      }

      const responses = await Promise.all(requests);
      const notificationRes = view !== "muted" ? responses[0] : null;
      const preferenceRes = view !== "muted" ? responses[1] : responses[0];
      const notificationJson = notificationRes ? await readJson(notificationRes) : null;
      const preferenceJson = await readJson(preferenceRes);

      if (notificationRes && !notificationRes.ok) {
        throw new Error(notificationJson?.error ?? "Failed to load notifications");
      }
      if (!preferenceRes.ok) {
        throw new Error(preferenceJson.error ?? "Failed to load notification preferences");
      }

      if (notificationJson) {
        setNotifications(notificationJson.data ?? []);
        setTotalRows(Number(notificationJson.total ?? 0));
        setPageCount(Number(notificationJson.pageCount ?? 0));
        setUnreadCount(Number(notificationJson.unreadCount ?? 0));
        setImportantCount(Number(notificationJson.importantCount ?? 0));
      }
      setPreferences(preferenceJson.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [authHeader, pagination.pageIndex, pagination.pageSize, view]);

  useEffect(() => {
    if (!isReady) return;

    const timer = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isReady, fetchNotifications]);

  function changeView(nextView: NotificationView) {
    setView(nextView);
    setPagination({ pageIndex: 0, pageSize: PAGE_SIZE });
  }

  const viewTabs = [
    { key: "all" as const, label: "All", count: view === "all" ? totalRows : undefined },
    { key: "unread" as const, label: "Unread", count: unreadCount },
    { key: "important" as const, label: "Important", count: importantCount },
    { key: "muted" as const, label: "Muted", count: mutedPreferences.length },
  ];

  async function markAllRead() {
    if (!authHeader) return;
    setMarkingRead(true);

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      const json = await readJson(res);

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to mark notifications read");
      }

      setUnreadCount(0);
      setNotifications((current) =>
        view === "unread" ? [] : current.map((item) => ({ ...item, is_read: true }))
      );
      if (view === "unread") {
        setTotalRows(0);
        setPageCount(0);
      }
      toast.success("Notifications marked as read.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark notifications read");
    } finally {
      setMarkingRead(false);
    }
  }

  async function showNotificationDialog(notification: NotificationItem) {
    setOpeningNotificationId(notification.notification_id);
    setSelectedNotification(notification);

    try {
      if (authHeader && !notification.is_read) {
        const res = await fetch("/api/admin/notifications", {
          method: "PATCH",
          headers: {
            ...authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "mark_read",
            notification_id: Number(notification.notification_id),
          }),
        });
        const json = await readJson(res);
        if (!res.ok) throw new Error(json.error ?? "Failed to mark notification read");
        setUnreadCount((current) => Math.max(current - 1, 0));
        setNotifications((current) =>
          current
            .map((item) =>
              item.notification_id === notification.notification_id
                ? { ...item, is_read: true }
                : item
            )
            .filter((item) => view !== "unread" || !item.is_read)
        );
        if (view === "unread") {
          setTotalRows((current) => Math.max(current - 1, 0));
        }
        setSelectedNotification((current) =>
          current?.notification_id === notification.notification_id
            ? { ...current, is_read: true }
            : current
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark notification read");
    } finally {
      setOpeningNotificationId(null);
    }
  }

  const toggleImportant = useCallback(async (notification: NotificationItem) => {
    if (!authHeader) return;
    const nextImportant = !notification.is_important;
    setSavingAction(`important:${notification.notification_id}`);

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "set_important",
          notification_id: Number(notification.notification_id),
          is_important: nextImportant,
        }),
      });
      const json = await readJson(res);

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to update important mark");
      }

      setImportantCount((current) => Math.max(current + (nextImportant ? 1 : -1), 0));
      setNotifications((current) =>
        current
          .map((item) =>
            item.notification_id === notification.notification_id
              ? { ...item, is_important: nextImportant }
              : item
          )
          .filter((item) => view !== "important" || item.is_important)
      );
      if (view === "important" && !nextImportant) {
        setTotalRows((current) => Math.max(current - 1, 0));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update important mark");
    } finally {
      setSavingAction(null);
    }
  }, [authHeader, view]);

  const setPreference = useCallback(async (notificationType: string, isEnabled: boolean) => {
    if (!authHeader) return;
    setSavingAction(`mute:${notificationType}`);

    try {
      const res = await fetch("/api/admin/notification-preferences", {
        method: "PATCH",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notification_type: notificationType,
          is_enabled: isEnabled,
        }),
      });
      const json = await readJson(res);

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to update notification preference");
      }

      setPreferences((current) => {
        const exists = current.some((item) => item.notification_type === notificationType);
        if (!exists) {
          return [
            ...current,
            { notification_type: notificationType, is_enabled: isEnabled, is_critical: false },
          ];
        }

        return current.map((item) =>
          item.notification_type === notificationType
            ? { ...item, is_enabled: isEnabled }
            : item
        );
      });
      toast.success(`${notificationType} notifications ${isEnabled ? "unmuted" : "muted"}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update notification preference");
    } finally {
      setSavingAction(null);
    }
  }, [authHeader]);

  const columns = useMemo<ColumnDef<NotificationItem>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Notification",
        cell: ({ row }) => {
          const notification = row.original;
          const iconStyle = notificationIconStyle(notification);
          return (
            <div className="flex min-w-[320px] items-center gap-3">
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  iconStyle
                )}
              >
                {isConfirmedFeeNotification(notification) ? (
                  <Check className="size-4" />
                ) : (
                  <NotificationIcon priority={notification.priority} />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold">{notification.title}</p>
                  <Badge
                    variant="secondary"
                    className={cn(typeStyle[notification.priority] ?? typeStyle.normal)}
                  >
                    {priorityLabel(notification.priority)}
                  </Badge>
                  {!notification.is_read && <Badge variant="outline">Unread</Badge>}
                </div>
                <p className="mt-1 line-clamp-2 max-w-[620px] text-sm text-muted-foreground">
                  {notification.message}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <span className="block max-w-[210px] truncate text-sm text-muted-foreground">
            {row.original.type}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Date",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {openingNotificationId === row.original.notification_id ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              formatIndianRelativeTime(row.original.created_at)
            )}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableHiding: false,
        cell: ({ row }) => {
          const notification = row.original;
          const isMuted = mutedTypeSet.has(notification.type);
          const isCritical = criticalTypes.has(notification.type);
          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className={cn(notification.is_important && "text-amber-400 hover:text-amber-400")}
                onClick={(event) => {
                  event.stopPropagation();
                  void toggleImportant(notification);
                }}
                disabled={savingAction === `important:${notification.notification_id}`}
                title={notification.is_important ? "Remove important mark" : "Mark important"}
              >
                {savingAction === `important:${notification.notification_id}` ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Star className={cn("size-4", notification.is_important && "fill-amber-400")} />
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  void setPreference(notification.type, isMuted);
                }}
                disabled={savingAction === `mute:${notification.type}` || isCritical}
                title={isCritical ? "Critical alerts cannot be muted" : isMuted ? "Unmute this type" : "Mute this type"}
              >
                {savingAction === `mute:${notification.type}` ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : isMuted ? (
                  <BellRing className="size-4" />
                ) : (
                  <BellOff className="size-4" />
                )}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
            </div>
          );
        },
      },
    ],
    [mutedTypeSet, openingNotificationId, savingAction, setPreference, toggleImportant]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">Stay on top of system alerts and updates.</p>
          </div>
          {view !== "muted" && unreadCount > 0 && (
            <Button variant="outline" onClick={markAllRead} disabled={markingRead || loading}>
              {markingRead ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Mark all as read
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {viewTabs.map((tab) => (
            <Button
              key={tab.key}
              type="button"
              variant={view === tab.key ? "default" : "outline"}
              onClick={() => changeView(tab.key)}
            >
              {tab.label}
              <span className="ml-1 rounded-full border px-1.5 text-xs">
                {tab.count ?? totalRows}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {view === "muted" ? (
        loading ? (
          <div className="flex h-36 items-center justify-center rounded-md border bg-card text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading muted notification types
          </div>
        ) : mutedPreferences.length === 0 ? (
          <div className="rounded-md border bg-card p-6 text-center text-muted-foreground">
            No muted notification types.
          </div>
        ) : (
          <DataTable
            columns={[
              {
                accessorKey: "notification_type",
                header: "Notification Type",
                cell: ({ row }) => (
                  <div className="flex min-w-[260px] items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                      <BellOff className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{row.original.notification_type}</p>
                      <p className="text-sm text-muted-foreground">
                        New notifications of this type are muted for your account.
                      </p>
                    </div>
                  </div>
                ),
              },
              {
                id: "actions",
                header: "Actions",
                enableHiding: false,
                cell: ({ row }) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreference(row.original.notification_type, true)}
                    disabled={savingAction === `mute:${row.original.notification_type}` || row.original.is_critical}
                  >
                    {savingAction === `mute:${row.original.notification_type}` ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <BellRing className="size-4" />
                    )}
                    Unmute
                  </Button>
                ),
              },
            ]}
            data={mutedPreferences}
            totalRows={mutedPreferences.length}
            pagination={{ pageIndex: 0, pageSize: PAGE_SIZE }}
            hideMobileColumnsButton
            loading={loading}
            emptyText="No muted notification types."
          />
        )
      ) : (
        <DataTable
          columns={columns}
          data={notifications}
          totalRows={totalRows}
          manualPagination
          pageCount={pageCount}
          pagination={pagination}
          onPaginationChange={setPagination}
          getRowId={(row) => row.recipient_id}
          onRowClick={(notification) => void showNotificationDialog(notification)}
          loading={loading}
          emptyText="No notifications yet."
        />
      )}

      <Dialog open={Boolean(selectedNotification)} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="max-w-lg">
          {selectedNotification && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full",
                      notificationIconStyle(selectedNotification)
                    )}
                  >
                    {isConfirmedFeeNotification(selectedNotification) ? (
                      <Check className="size-5" />
                    ) : (
                      <NotificationIcon priority={selectedNotification.priority} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle>{selectedNotification.title}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {formatIndianRelativeTime(selectedNotification.created_at)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {selectedNotification.message}
                </p>
                <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Type</p>
                    <p className="mt-1 break-all font-medium">{selectedNotification.type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Priority</p>
                    <p className="mt-1 font-medium">{priorityLabel(selectedNotification.priority)}</p>
                  </div>
                  {selectedNotification.entity_type && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Related To</p>
                      <p className="mt-1 font-medium">{selectedNotification.entity_type}</p>
                    </div>
                  )}
                  {selectedNotification.entity_id && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Reference</p>
                      <p className="mt-1 font-medium">{selectedNotification.entity_id}</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSelectedNotification(null)}>
                  Close
                </Button>
                {notificationHref(selectedNotification) !== "/admin/notifications" && (
                  <Button
                    type="button"
                    onClick={() => {
                      const href = notificationHref(selectedNotification);
                      setSelectedNotification(null);
                      router.push(href);
                    }}
                  >
                    Open
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
