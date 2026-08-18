"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellOff, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type NotificationPreference = {
  notification_type: string;
  is_enabled: boolean;
  is_critical: boolean;
};

export default function MutedNotificationsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);

  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

  const fetchPreferences = useCallback(async () => {
    if (!authHeader) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/notification-preferences", {
        headers: authHeader,
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load notification preferences");
      }

      setPreferences(json.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    if (!isReady) return;

    const timer = window.setTimeout(() => {
      void fetchPreferences();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isReady, fetchPreferences]);

  async function unmute(notificationType: string) {
    if (!authHeader) return;
    setSavingType(notificationType);

    try {
      const res = await fetch("/api/admin/notification-preferences", {
        method: "PATCH",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notification_type: notificationType,
          is_enabled: true,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Failed to unmute notification type");
      }

      setPreferences((current) =>
        current.map((item) =>
          item.notification_type === notificationType
            ? { ...item, is_enabled: true }
            : item
        )
      );
      toast.success(`${notificationType} notifications unmuted.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unmute notification type");
    } finally {
      setSavingType(null);
    }
  }

  const muted = preferences.filter((item) => !item.is_enabled);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Muted Notifications</h1>
        <p className="text-muted-foreground">Manage notification types you have silenced.</p>
      </div>

      {loading ? (
        <div className="flex h-36 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading muted notifications
        </div>
      ) : muted.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
          <BellRing className="mx-auto mb-3 size-6" />
          No muted notification types.
        </div>
      ) : (
        <div className="space-y-3">
          {muted.map((item) => (
            <div
              key={item.notification_type}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <BellOff className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{item.notification_type}</p>
                    {item.is_critical && <Badge variant="outline">Critical</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    New notifications of this type will be skipped for your account.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => unmute(item.notification_type)}
                disabled={savingType === item.notification_type}
              >
                {savingType === item.notification_type ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <BellRing className="size-4" />
                )}
                Unmute
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
