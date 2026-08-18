import { getSocketServerSettings } from "@/lib/socket-server-settings";

type RealtimeNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
};

type PublishNotificationInput = {
  recipientIds: number[];
  notification: RealtimeNotification;
};

function socketServerUrl() {
  return (process.env.SOCKET_SERVER_INTERNAL_URL || process.env.NEXT_PUBLIC_SOCKET_URL || "").trim();
}

function socketPublishTimeoutMs() {
  const value = Number(process.env.SOCKET_PUBLISH_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : 1500;
}

export async function publishRealtimeNotification(input: PublishNotificationInput) {
  let baseUrl = socketServerUrl();
  let secret = process.env.SOCKET_INTERNAL_SECRET || "";
  let timeoutMs = socketPublishTimeoutMs();

  if (!baseUrl || !secret) {
    const settings = await getSocketServerSettings().catch(() => null);
    if (settings?.enabled) {
      baseUrl ||= settings.internal_url;
      secret ||= settings.internal_secret || "";
      timeoutMs = settings.request_timeout_ms;
    }
  }

  if (!baseUrl || !secret || !input.recipientIds.length) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL("/internal/notifications/publish", baseUrl);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        recipientIds: input.recipientIds,
        notification: input.notification,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn("[notification.socket_publish_failed]", {
        status: response.status,
        notificationId: input.notification.id,
      });
    }
  } catch (error) {
    console.warn("[notification.socket_publish_failed]", {
      notificationId: input.notification.id,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timeout);
  }
}
