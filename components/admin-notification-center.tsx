"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import Link from "next/link";
import { Bell, BellOff, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { io, type Socket } from "socket.io-client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatIndianRelativeTime } from "@/lib/format-time";
import { readJsonResponse } from "@/lib/api/read-json-response";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { toRoleRoutePath } from "@/lib/auth/role-routes";
import { hasPermission } from "@/lib/auth/permissions";

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
  read_at: string | null;
  created_at: string;
};

type RealtimeNotificationPayload = {
  notification?: {
    id?: string | number;
    type?: string;
    title?: string;
    message?: string;
    priority?: string;
  };
  unreadCount?: number;
  publishedAt?: string;
};

const criticalTypes = new Set<string>();

function priorityClass(priority: string) {
  if (priority === "high" || priority === "critical") {
    return "border-destructive/30 bg-destructive/5";
  }

  return "border-border bg-card";
}

function priorityLabel(priority: string) {
  if (priority === "high") return "Urgent";
  return priority.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function notificationHref(item: NotificationItem) {
  if (typeof item.payload?.url === "string") return item.payload.url;
  if (item.type === "fees.payment_request.created") {
    return "/admin/students/fee-management?tab=payment_requests";
  }
  if (item.type === "fees.payment_request.approved") {
    return "/admin/classroom/fees";
  }
  if (item.entity_type === "support_ticket" && item.entity_id) {
    return `/admin/support?ticket=${item.entity_id}`;
  }

  return "/admin/notifications";
}

const NotificationBellButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof Button> & { unreadCount: number }
>(({ unreadCount, className, ...buttonProps }, ref) => {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon-sm"
      aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      className={cn("relative isolate overflow-visible", unreadCount > 0 && "notification-bell-active", className)}
      {...buttonProps}
    >
      <Bell className="notification-bell-icon size-4" />
      {unreadCount > 0 && (
        <Badge
          aria-label={`${unreadCount} unread notifications`}
          className="absolute -right-1.5 -top-1.5 h-5 min-w-5 rounded-full px-1 text-[10px] leading-none"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
});
NotificationBellButton.displayName = "NotificationBellButton";

function NotificationList({
  notifications,
  loading,
  actionType,
  onMarkAllRead,
  onMarkRead,
  onMute,
  onViewAll,
  onOpenNotification,
  toRoleHref,
}: {
  notifications: NotificationItem[];
  loading: boolean;
  actionType: string | null;
  onMarkAllRead: () => void;
  onMarkRead: (notificationId: string) => void;
  onMute: (type: string) => void;
  onViewAll: () => void;
  onOpenNotification: (item: NotificationItem) => void;
  toRoleHref: (url: string) => string;
}) {
  return (
    <div className="flex max-h-[70vh] flex-col">
      <div className="flex items-start justify-between gap-3 border-b p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          <p className="text-xs text-muted-foreground">New support messages and updates</p>
        </div>
        {notifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllRead}
            disabled={loading || actionType === "mark_all_read"}
          >
            {actionType === "mark_all_read" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCheck className="size-3.5" />
            )}
            Read all
          </Button>
        )}
      </div>

      <div className="min-h-36 overflow-y-auto p-2">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading notifications
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No new notifications.
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((item) => {
              const isCritical = criticalTypes.has(item.type);
              const actionKey = `mute:${item.type}`;
              const readActionKey = `read:${item.notification_id}`;

              return (
                <div
                  key={item.recipient_id}
                  className={cn(
                    "rounded-md border p-3",
                    priorityClass(item.priority),
                    !item.is_read && "ring-1 ring-primary/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-1 size-2 shrink-0 rounded-full",
                        item.is_read ? "bg-muted-foreground/30" : "bg-primary"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={toRoleHref(notificationHref(item))}
                            onClick={() => onOpenNotification(item)}
                            className="line-clamp-1 text-sm font-semibold text-foreground hover:text-primary"
                          >
                            {item.title}
                          </Link>
                          <Badge variant="outline" className="mt-1 rounded-md text-[10px]">
                            {priorityLabel(item.priority)}
                          </Badge>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatIndianRelativeTime(item.created_at)}
                        </span>
                      </div>
                      <Link
                        href={toRoleHref(notificationHref(item))}
                        onClick={() => onOpenNotification(item)}
                        className="mt-1 block line-clamp-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        {item.message}
                      </Link>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {!item.is_read && (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => onMarkRead(item.notification_id)}
                            disabled={actionType === readActionKey}
                          >
                            {actionType === readActionKey ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <CheckCheck className="size-3" />
                            )}
                            Mark read
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => onMute(item.type)}
                          disabled={actionType === actionKey || isCritical}
                          title={isCritical ? "Critical alerts cannot be muted" : "Mute this notification type"}
                        >
                          {actionType === actionKey ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <BellOff className="size-3" />
                          )}
                          Mute
                        </Button>
                        {item.entity_type && item.entity_id && (
                          <Badge variant="outline" className="rounded-md">
                            {item.entity_type} #{item.entity_id}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t p-3">
        <Button asChild variant="ghost" size="sm" className="w-full justify-center">
          <Link href={toRoleHref("/admin/notifications")} onClick={onViewAll}>
            View all notifications
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function AdminNotificationCenter() {
  const isMobile = useIsMobile();
  const { accessToken, user } = useAuthStore();
  const isStudent = user?.role_codes?.includes("student") ?? false;
  const canViewNotifications = isStudent
    ? hasPermission(user, "student.notification.all.view")
    : hasPermission(user, "notifications.inbox.view");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);
  const [hasCoarsePointer, setHasCoarsePointer] = useState(false);

  const authHeaders = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

  const fetchNotifications = useCallback(async () => {
    if (!authHeaders || !canViewNotifications) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/notifications?limit=8&unread_only=true", {
        headers: authHeaders,
      });
      const json = await readJsonResponse<{ data?: NotificationItem[]; unreadCount?: number; error?: string }>(res);

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load notifications");
      }

      setNotifications(json.data ?? []);
      setUnreadCount(json.unreadCount ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, canViewNotifications]);

  useEffect(() => {
    const pointerQuery = window.matchMedia("(pointer: coarse)");
    const updatePointer = () => setHasCoarsePointer(pointerQuery.matches);
    updatePointer();
    pointerQuery.addEventListener("change", updatePointer);
    return () => pointerQuery.removeEventListener("change", updatePointer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchNotifications]);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl || !accessToken || !canViewNotifications) return;

    const socket: Socket = io(socketUrl, {
      path: process.env.NEXT_PUBLIC_SOCKET_PATH || "/socket.io",
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
    });

    socket.on("notification:new", (payload: RealtimeNotificationPayload) => {
      const notification = payload.notification;
      if (!notification?.id || !notification.title || !notification.message || !notification.type) {
        void fetchNotifications();
        return;
      }

      const notificationId = String(notification.id);
      const nextItem: NotificationItem = {
        recipient_id: `realtime:${notificationId}`,
        notification_id: notificationId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority || "normal",
        entity_type: null,
        entity_id: null,
        payload: {},
        is_read: false,
        read_at: null,
        created_at: payload.publishedAt || new Date().toISOString(),
      };

      setNotifications((current) => {
        if (current.some((item) => item.notification_id === notificationId)) return current;
        return [nextItem, ...current].slice(0, 8);
      });
      setUnreadCount((current) =>
        Number.isInteger(payload.unreadCount) ? Number(payload.unreadCount) : current + 1
      );
    });

    socket.on("connect_error", () => {
      socket.disconnect();
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, canViewNotifications, fetchNotifications]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open, fetchNotifications]);

  async function markAllRead() {
    if (!authHeaders) return;
    setActionType("mark_all_read");

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to mark notifications read");
      }

      setUnreadCount(0);
      setNotifications([]);
      toast.success("Notifications marked as read.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark notifications read");
    } finally {
      setActionType(null);
    }
  }

  async function markRead(notificationId: string) {
    if (!authHeaders) return;
    setActionType(`read:${notificationId}`);

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "mark_read",
          notification_id: Number(notificationId),
        }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to mark notification read");
      }

      setNotifications((current) =>
        current.filter((item) => item.notification_id !== notificationId)
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      toast.success("Notification marked as read.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark notification read");
    } finally {
      setActionType(null);
    }
  }

  async function muteType(type: string) {
    if (!authHeaders) return;
    if (criticalTypes.has(type)) {
      toast.info("Critical alerts cannot be muted.");
      return;
    }

    setActionType(`mute:${type}`);

    try {
      const res = await fetch("/api/admin/notification-preferences", {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notification_type: type,
          is_enabled: false,
        }),
      });
      const json = await readJsonResponse<{ error?: string }>(res);

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to mute notification type");
      }

      toast.success(`${type} notifications muted.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mute notification type");
    } finally {
      setActionType(null);
    }
  }

  function openNotification(item: NotificationItem) {
    setOpen(false);
    if (!item.is_read) {
      void markRead(item.notification_id);
    }
  }

  if (!canViewNotifications) return null;

  const content = (
    <NotificationList
      notifications={notifications}
      loading={loading}
      actionType={actionType}
      onMarkAllRead={markAllRead}
      onMarkRead={markRead}
      onMute={muteType}
      onViewAll={() => setOpen(false)}
      onOpenNotification={openNotification}
      toRoleHref={(url) => toRoleRoutePath(url, user)}
    />
  );

  if (isMobile && hasCoarsePointer) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <NotificationBellButton unreadCount={unreadCount} />
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="sr-only">
            <DrawerTitle>Notifications</DrawerTitle>
            <DrawerDescription>New support messages and updates</DrawerDescription>
          </DrawerHeader>
          {content}
          <DrawerFooter className="sr-only" />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <NotificationBellButton unreadCount={unreadCount} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[380px] p-0">
        {content}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
