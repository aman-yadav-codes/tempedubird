"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Server,
  Settings,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { InstitutionGeneralSettings } from "@/components/settings/institution-general-settings";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

type SettingsTab = "general" | "cron" | "socket";

type CronJobStatus = "active" | "completed" | "failed" | "cancelled";

type CronJob = {
  id: number;
  title: string;
  task_type: string;
  resource_type: string;
  resource_id: number | null;
  scope_type: "platform" | "institution";
  institution_id: number | null;
  institution_name: string | null;
  created_by_name: string | null;
  run_at: string;
  status: CronJobStatus;
  payload: Record<string, unknown> | null;
  last_error: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type CronWorkerSettings = {
  id: number;
  target_url: string;
  interval_ms: number;
  request_timeout_ms: number;
  run_on_start: boolean;
  health_port: number | null;
  worker_name: string;
  enabled: boolean;
  secret_configured: boolean;
  updated_at: string;
};

type CronWorkerHeartbeat = {
  worker_name: string;
  status: string;
  target_url: string | null;
  interval_ms: number | null;
  request_timeout_ms: number | null;
  health_port: number | null;
  last_seen_at: string;
  last_run_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  tick_count: number;
  success_count: number;
  failure_count: number;
  skipped_count: number;
  last_http_status: number | null;
  last_processed: number | null;
  last_error: string | null;
};

type CronWorkerForm = {
  target_url: string;
  secret: string;
  interval_ms: string;
  request_timeout_ms: string;
  run_on_start: boolean;
  health_port: string;
  worker_name: string;
  enabled: boolean;
};

type SocketServerSettings = {
  id: number;
  public_url: string;
  internal_url: string;
  socket_path: string;
  request_timeout_ms: number;
  enabled: boolean;
  internal_secret_configured: boolean;
  updated_at: string;
};

type SocketServerHealth = {
  ok: boolean;
  startedAt?: string;
  connectedSockets?: number;
  connectedUsers?: number;
  publishedCount?: number;
  rejectedPublishCount?: number;
  lastPublishedAt?: string | null;
  redisConnected?: boolean;
  checkedAt: string;
  responseMs: number;
  error?: string;
};

type SocketServerForm = {
  public_url: string;
  internal_url: string;
  socket_path: string;
  internal_secret: string;
  request_timeout_ms: string;
  enabled: boolean;
};

const emptyWorkerForm: CronWorkerForm = {
  target_url: "",
  secret: "",
  interval_ms: "60000",
  request_timeout_ms: "30000",
  run_on_start: true,
  health_port: "",
  worker_name: "edubird-cron-jobs",
  enabled: true,
};

const emptySocketForm: SocketServerForm = {
  public_url: "",
  internal_url: "",
  socket_path: "/socket.io",
  internal_secret: "",
  request_timeout_ms: "1500",
  enabled: true,
};

const statusClassName: Record<CronJobStatus, string> = {
  active: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  failed: "border-destructive/50 bg-destructive/10 text-destructive",
  cancelled: "border-muted-foreground/30 text-muted-foreground",
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeHeartbeat(value: string | null) {
  if (!value) return "No heartbeat yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No heartbeat yet";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function getCronJobOwner(job: CronJob) {
  if (job.scope_type === "institution") {
    return job.institution_name ?? (job.institution_id ? `Institution #${job.institution_id}` : "Institution");
  }
  return "Own";
}

function toWorkerForm(settings: CronWorkerSettings): CronWorkerForm {
  return {
    target_url: settings.target_url,
    secret: "",
    interval_ms: String(settings.interval_ms),
    request_timeout_ms: String(settings.request_timeout_ms),
    run_on_start: settings.run_on_start,
    health_port: settings.health_port ? String(settings.health_port) : "",
    worker_name: settings.worker_name,
    enabled: settings.enabled,
  };
}

function toSocketForm(settings: SocketServerSettings): SocketServerForm {
  return {
    public_url: settings.public_url,
    internal_url: settings.internal_url,
    socket_path: settings.socket_path,
    internal_secret: "",
    request_timeout_ms: String(settings.request_timeout_ms),
    enabled: settings.enabled,
  };
}

function getHeartbeatView(settings: CronWorkerSettings | null, heartbeat: CronWorkerHeartbeat | null) {
  if (settings && !settings.enabled) {
    return {
      label: "Stopped",
      detail: "Worker is turned off from settings.",
      className: "border-muted-foreground/30 text-muted-foreground",
    };
  }

  if (!heartbeat) {
    return {
      label: "Offline",
      detail: "No worker heartbeat has been received.",
      className: "border-destructive/50 bg-destructive/10 text-destructive",
    };
  }

  const lastSeen = new Date(heartbeat.last_seen_at).getTime();
  const maxAge = Math.max((settings?.interval_ms ?? heartbeat.interval_ms ?? 60000) * 3, 90000);
  const isFresh = Number.isFinite(lastSeen) && Date.now() - lastSeen <= maxAge;

  if (!isFresh) {
    return {
      label: "Stale",
      detail: `Last heartbeat ${formatRelativeHeartbeat(heartbeat.last_seen_at)}.`,
      className: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
    };
  }

  if (heartbeat.status === "failed") {
    return {
      label: "Error",
      detail: heartbeat.last_error ?? "Worker reported a failure.",
      className: "border-destructive/50 bg-destructive/10 text-destructive",
    };
  }

  return {
    label: "Healthy",
    detail: `Last heartbeat ${formatRelativeHeartbeat(heartbeat.last_seen_at)}.`,
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  };
}

function getSocketHealthView(settings: SocketServerSettings | null, health: SocketServerHealth | null) {
  if (settings && !settings.enabled) {
    return {
      label: "Stopped",
      detail: "Socket service is disabled from settings.",
      className: "border-muted-foreground/30 text-muted-foreground",
    };
  }

  if (!health) {
    return {
      label: "Unknown",
      detail: "Health has not been checked.",
      className: "border-muted-foreground/30 text-muted-foreground",
    };
  }

  if (!health.ok) {
    return {
      label: "Offline",
      detail: health.error ?? "Socket health endpoint is not reachable.",
      className: "border-destructive/50 bg-destructive/10 text-destructive",
    };
  }

  return {
    label: "Healthy",
    detail: `Health checked in ${health.responseMs}ms.`,
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  };
}

function normalizeUrl(value: string | undefined | null) {
  return (value ?? "").trim().replace(/\/+$/, "");
}

function isPlaceholderUrl(value: string | undefined | null) {
  const normalized = normalizeUrl(value);
  return !normalized || normalized.includes("your-domain.com");
}

function isLocalhostUrl(value: string | undefined | null) {
  try {
    const url = new URL(value ?? "");
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function getSocketSetupItems(settings: SocketServerSettings | null, health: SocketServerHealth | null) {
  const publicEnvUrl = normalizeUrl(process.env.NEXT_PUBLIC_SOCKET_URL);
  const publicUrl = normalizeUrl(settings?.public_url);
  const internalUrl = normalizeUrl(settings?.internal_url);
  const socketPath = settings?.socket_path?.trim() ?? "";
  const hasPublicUrl = !isPlaceholderUrl(publicUrl);
  const hasInternalUrl = !isPlaceholderUrl(internalUrl);
  const publicUrlIsLocalhost = isLocalhostUrl(publicUrl);
  const internalUrlIsLocalhost = isLocalhostUrl(internalUrl);
  const appEnvMatches = Boolean(publicEnvUrl && publicUrl && publicEnvUrl === publicUrl);
  const healthOk = health?.ok === true;

  return [
    {
      id: "enabled",
      title: "Socket service enabled",
      done: settings?.enabled === true,
      note: settings?.enabled
        ? "The app is allowed to publish realtime notifications."
        : "Publishing is paused from platform settings.",
      setup: "Open Edit Settings, check Socket service enabled, then save. This only enables app-side publishing; the PM2 socket process must still be running on Oracle.",
    },
    {
      id: "public-url",
      title: "Public Socket URL is set",
      done: hasPublicUrl,
      note: hasPublicUrl
        ? publicUrlIsLocalhost
          ? "Public URL is localhost, so only this machine can connect."
          : `Browser clients will connect to ${publicUrl}.`
        : "The browser URL is still empty or placeholder.",
      setup: "Set Public Socket URL to the URL users can reach from the browser, for example https://socket.your-domain.com. If you do not use Nginx yet, use http://92.4.82.173:3040 for testing. Do not use localhost for production because each user's browser treats localhost as their own computer.",
    },
    {
      id: "browser-env",
      title: "NEXT_PUBLIC_SOCKET_URL matches",
      done: appEnvMatches,
      note: appEnvMatches
        ? "The browser env matches the saved public URL."
        : publicEnvUrl
          ? `Current browser env is ${publicEnvUrl}.`
          : "NEXT_PUBLIC_SOCKET_URL is not available in this build.",
      setup: "Set NEXT_PUBLIC_SOCKET_URL in the Next.js deployment to the same value as Public Socket URL, then redeploy/restart the app so the browser bundle receives it.",
    },
    {
      id: "internal-url",
      title: "Internal Socket URL is set",
      done: hasInternalUrl,
      note: hasInternalUrl
        ? internalUrlIsLocalhost
          ? "Internal URL is localhost, so the Next.js server is checking its own machine."
          : `Server-side publishing will call ${internalUrl}.`
        : "The server publish URL is missing.",
      setup: "Set Internal Socket URL to the address the Next.js server can call. Use http://localhost:3040 only when the app and socket server run on the same VM. If your socket server is on Oracle and the app is local/Vercel, use http://92.4.82.173:3040 or your socket HTTPS domain.",
    },
    {
      id: "publish-secret",
      title: "Internal publish secret is configured",
      done: settings?.internal_secret_configured === true,
      note: settings?.internal_secret_configured
        ? "Server-to-server publish calls have a shared secret."
        : "The socket publish endpoint will reject app publish calls.",
      setup: "Set Internal Publish Secret here and set the same value as SOCKET_INTERNAL_SECRET in the socket server .env. Also keep SOCKET_INTERNAL_SECRET in the Next.js app env when using env-based publishing.",
    },
    {
      id: "socket-path",
      title: "Socket path is valid",
      done: socketPath.startsWith("/"),
      note: socketPath.startsWith("/")
        ? `Socket.IO path is ${socketPath}.`
        : "Socket path must start with /.",
      setup: "Use /socket.io unless you have customized SOCKET_PATH in the socket server .env. If you change it here, change NEXT_PUBLIC_SOCKET_PATH and SOCKET_PATH to the same path.",
    },
    {
      id: "health",
      title: "Health endpoint is reachable",
      done: healthOk,
      note: healthOk
        ? `Health responded in ${health.responseMs}ms.`
        : health?.error ?? "No successful health check yet.",
      setup: "Start the PM2 socket process on Oracle and open TCP port 3040, or configure Nginx to proxy /health and /socket.io to localhost:3040. Then click Refresh.",
    },
    {
      id: "port",
      title: "Oracle port or proxy is ready",
      done: healthOk,
      note: healthOk
        ? "The configured service is reachable from the app health check."
        : internalUrlIsLocalhost
          ? "Your saved URL is localhost:3040. That means the app is checking this machine, not Oracle."
          : "Most failures here are closed port 3040, wrong public IP/domain, stopped PM2 process, or Nginx not proxying websocket upgrade headers.",
      setup: "In Oracle security list or network security group, add both rules below. Ingress opens port 3040 for socket traffic. Egress allows the instance to call outside services. After this, make sure the Internal Socket URL points to the Oracle IP/domain unless the socket server is running on the same machine as the app. For Nginx, also proxy websocket headers: Upgrade and Connection, and point the upstream to http://127.0.0.1:3040.",
      setupSections: [
        {
          title: "Step 1: Add an Ingress Rule",
          rows: [
            ["Source Type", "CIDR"],
            ["Source CIDR", "0.0.0.0/0"],
            ["IP Protocol", "TCP"],
            ["Source Port Range", "Leave Empty"],
            ["Destination Port Range", "3040"],
            ["Description", "Socket Server"],
          ],
        },
        {
          title: "Step 2: Add an Egress Rule",
          rows: [
            ["Destination Type", "CIDR"],
            ["Destination CIDR", "0.0.0.0/0"],
            ["IP Protocol", "All Protocols"],
            ["Description", "Allow All"],
          ],
        },
      ],
    },
  ];
}

function CronStatusBadge({ status }: { status: CronJobStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize", statusClassName[status])}>
      {status}
    </Badge>
  );
}

export default function SettingsPage() {
  const { accessToken, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [workerSettings, setWorkerSettings] = useState<CronWorkerSettings | null>(null);
  const [heartbeat, setHeartbeat] = useState<CronWorkerHeartbeat | null>(null);
  const [workerForm, setWorkerForm] = useState<CronWorkerForm>(emptyWorkerForm);
  const [editingWorkerSettings, setEditingWorkerSettings] = useState(false);
  const [loadingWorker, setLoadingWorker] = useState(false);
  const [savingWorker, setSavingWorker] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [socketSettings, setSocketSettings] = useState<SocketServerSettings | null>(null);
  const [socketHealth, setSocketHealth] = useState<SocketServerHealth | null>(null);
  const [socketForm, setSocketForm] = useState<SocketServerForm>(emptySocketForm);
  const [editingSocketSettings, setEditingSocketSettings] = useState(false);
  const [loadingSocket, setLoadingSocket] = useState(false);
  const [savingSocket, setSavingSocket] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [selectionResetKey, setSelectionResetKey] = useState(0);

  const isPlatformAdmin = Boolean(user?.is_super_admin || user?.role_codes?.includes("platform_admin"));

  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken],
  );

  const fetchJobs = useCallback(async () => {
    if (!authHeader) return;
    setLoadingJobs(true);
    setJobError(null);
    try {
      const response = await fetch("/api/admin/settings/cron-jobs", {
        headers: authHeader,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Failed to load cron jobs.");
      setJobs(json.data ?? []);
    } catch (error) {
      setJobError(error instanceof Error ? error.message : "Failed to load cron jobs.");
    } finally {
      setLoadingJobs(false);
    }
  }, [authHeader]);

  const fetchWorkerSettings = useCallback(async () => {
    if (!authHeader || !isPlatformAdmin) return;
    setLoadingWorker(true);
    setWorkerError(null);
    try {
      const response = await fetch("/api/admin/settings/cron-worker", {
        headers: authHeader,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Failed to load cron worker settings.");
      const settings = json.data?.settings as CronWorkerSettings;
      setWorkerSettings(settings);
      setWorkerForm(toWorkerForm(settings));
      setEditingWorkerSettings(false);
      setHeartbeat(json.data?.heartbeat ?? null);
    } catch (error) {
      setWorkerError(error instanceof Error ? error.message : "Failed to load cron worker settings.");
    } finally {
      setLoadingWorker(false);
    }
  }, [authHeader, isPlatformAdmin]);

  const fetchSocketSettings = useCallback(async () => {
    if (!authHeader || !isPlatformAdmin) return;
    setLoadingSocket(true);
    setSocketError(null);
    try {
      const response = await fetch("/api/admin/settings/socket-services", {
        headers: authHeader,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Failed to load socket service settings.");
      const settings = json.data?.settings as SocketServerSettings;
      setSocketSettings(settings);
      setSocketForm(toSocketForm(settings));
      setEditingSocketSettings(false);
      setSocketHealth(json.data?.health ?? null);
    } catch (error) {
      setSocketError(error instanceof Error ? error.message : "Failed to load socket service settings.");
    } finally {
      setLoadingSocket(false);
    }
  }, [authHeader, isPlatformAdmin]);

  const refreshCronTab = useCallback(async () => {
    await Promise.all([fetchJobs(), fetchWorkerSettings()]);
  }, [fetchJobs, fetchWorkerSettings]);

  const refreshSocketTab = useCallback(async () => {
    await fetchSocketSettings();
  }, [fetchSocketSettings]);

  useEffect(() => {
    if (activeTab !== "cron") return;
    const timer = window.setTimeout(() => {
      void refreshCronTab();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, refreshCronTab]);

  useEffect(() => {
    if (activeTab !== "socket") return;
    const timer = window.setTimeout(() => {
      void refreshSocketTab();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, refreshSocketTab]);

  const saveWorkerSettings = useCallback(
    async (enabledOverride?: boolean) => {
      if (!authHeader) return;
      setSavingWorker(true);
      setWorkerError(null);
      try {
        const payload: Record<string, unknown> = {
          target_url: workerForm.target_url,
          interval_ms: Number(workerForm.interval_ms),
          request_timeout_ms: Number(workerForm.request_timeout_ms),
          run_on_start: workerForm.run_on_start,
          health_port: workerForm.health_port ? Number(workerForm.health_port) : null,
          worker_name: workerForm.worker_name,
          enabled: enabledOverride ?? workerForm.enabled,
        };
        if (workerForm.secret.trim()) payload.secret = workerForm.secret.trim();

        const response = await fetch("/api/admin/settings/cron-worker", {
          method: "PATCH",
          headers: {
            ...authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Failed to save cron worker settings.");

        const settings = json.data?.settings as CronWorkerSettings;
        setWorkerSettings(settings);
        setWorkerForm(toWorkerForm(settings));
        setEditingWorkerSettings(false);
        setHeartbeat(json.data?.heartbeat ?? null);
      } catch (error) {
        setWorkerError(error instanceof Error ? error.message : "Failed to save cron worker settings.");
      } finally {
        setSavingWorker(false);
      }
    },
    [authHeader, workerForm],
  );

  const cancelWorkerSettingsEdit = useCallback(() => {
    setWorkerForm(workerSettings ? toWorkerForm(workerSettings) : emptyWorkerForm);
    setWorkerError(null);
    setEditingWorkerSettings(false);
  }, [workerSettings]);

  const saveSocketSettings = useCallback(
    async (enabledOverride?: boolean) => {
      if (!authHeader) return;
      setSavingSocket(true);
      setSocketError(null);
      try {
        const payload: Record<string, unknown> = {
          public_url: socketForm.public_url,
          internal_url: socketForm.internal_url,
          socket_path: socketForm.socket_path,
          request_timeout_ms: Number(socketForm.request_timeout_ms),
          enabled: enabledOverride ?? socketForm.enabled,
        };
        if (socketForm.internal_secret.trim()) payload.internal_secret = socketForm.internal_secret.trim();

        const response = await fetch("/api/admin/settings/socket-services", {
          method: "PATCH",
          headers: {
            ...authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Failed to save socket service settings.");

        const settings = json.data?.settings as SocketServerSettings;
        setSocketSettings(settings);
        setSocketForm(toSocketForm(settings));
        setEditingSocketSettings(false);
        setSocketHealth(json.data?.health ?? null);
      } catch (error) {
        setSocketError(error instanceof Error ? error.message : "Failed to save socket service settings.");
      } finally {
        setSavingSocket(false);
      }
    },
    [authHeader, socketForm],
  );

  const cancelSocketSettingsEdit = useCallback(() => {
    setSocketForm(socketSettings ? toSocketForm(socketSettings) : emptySocketForm);
    setSocketError(null);
    setEditingSocketSettings(false);
  }, [socketSettings]);

  const cancelSelectedJobs = useCallback(
    async (selectedRows: CronJob[], resetSelection: () => void) => {
      if (!authHeader) return;
      const ids = selectedRows.filter((job) => job.status === "active").map((job) => job.id);
      if (ids.length === 0) return;

      setLoadingJobs(true);
      setJobError(null);
      try {
        const response = await fetch("/api/admin/settings/cron-jobs", {
          method: "PATCH",
          headers: {
            ...authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "cancel", ids }),
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Failed to cancel cron jobs.");
        setJobs(json.data ?? []);
        resetSelection();
        setSelectionResetKey((current) => current + 1);
      } catch (error) {
        setJobError(error instanceof Error ? error.message : "Failed to cancel cron jobs.");
      } finally {
        setLoadingJobs(false);
      }
    },
    [authHeader],
  );

  const columns = useMemo<ColumnDef<CronJob>[]>(
    () => [
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
            aria-label="Select all cron jobs"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(event) => event.stopPropagation()}
            aria-label="Select cron job"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <Button variant="ghost" className="h-auto p-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Job
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const job = row.original;
          return (
            <div className="min-w-0">
              <p className="max-w-[520px] truncate font-semibold">{job.title}</p>
              <p className="text-sm text-muted-foreground">
                {job.task_type} · {job.resource_type} · {getCronJobOwner(job)}
              </p>
              {job.created_by_name ? (
                <p className="mt-1 text-xs text-muted-foreground">Added by {job.created_by_name}</p>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "run_at",
        header: ({ column }) => (
          <Button variant="ghost" className="h-auto p-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Run Time
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        ),
        cell: ({ row }) => formatDateTime(row.original.run_at),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <CronStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "updated_at",
        header: ({ column }) => (
          <Button variant="ghost" className="h-auto p-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Updated
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        ),
        cell: ({ row }) => formatDateTime(row.original.updated_at),
      },
    ],
    [],
  );

  const heartbeatView = getHeartbeatView(workerSettings, heartbeat);
  const socketHealthView = getSocketHealthView(socketSettings, socketHealth);
  const socketSetupItems = getSocketSetupItems(socketSettings, socketHealth);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={activeTab === "general" ? "default" : "outline"}
          onClick={() => setActiveTab("general")}
        >
          <Settings className="size-4" />
          General
        </Button>
        <Button
          type="button"
          variant={activeTab === "cron" ? "default" : "outline"}
          onClick={() => setActiveTab("cron")}
          className={isPlatformAdmin ? "" : "hidden"}
        >
          <CalendarClock className="size-4" />
          Cron Jobs
        </Button>
        <Button
          type="button"
          variant={activeTab === "socket" ? "default" : "outline"}
          onClick={() => setActiveTab("socket")}
          className={isPlatformAdmin ? "" : "hidden"}
        >
          <Server className="size-4" />
          Socket Services
        </Button>
      </div>

      {activeTab === "general" ? (
        <InstitutionGeneralSettings />
      ) : activeTab === "cron" ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Cron Jobs</h2>
              <p className="text-sm text-muted-foreground">
                Ubuntu PM2 worker calls the scheduler and processes active jobs when their publish time arrives.
              </p>
            </div>
            <Button variant="outline" onClick={refreshCronTab} disabled={loadingJobs || loadingWorker || !authHeader}>
              {loadingJobs || loadingWorker ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Refresh
            </Button>
          </div>

          {isPlatformAdmin ? (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Cron Worker Settings</h3>
                  <p className="text-sm text-muted-foreground">Stored in the database so the PM2 worker can sync without editing env files.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("capitalize", heartbeatView.className)}>
                    {heartbeatView.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{heartbeatView.detail}</span>
                  {!editingWorkerSettings ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingWorkerSettings(true)}
                      disabled={loadingWorker}
                    >
                      <Settings className="size-4" />
                      Edit Settings
                    </Button>
                  ) : null}
                </div>
              </div>

              {workerError ? (
                <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {workerError}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium">Cron Target URL</label>
                    <Input
                      value={workerForm.target_url}
                      onChange={(event) => setWorkerForm((current) => ({ ...current, target_url: event.target.value }))}
                      placeholder="https://final-edubird.vercel.app/api/cron/run-scheduled-jobs"
                      disabled={!editingWorkerSettings || savingWorker}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Cron Secret</label>
                    <Input
                      value={workerForm.secret}
                      onChange={(event) => setWorkerForm((current) => ({ ...current, secret: event.target.value }))}
                      placeholder={workerSettings?.secret_configured ? "Secret already configured" : "Set secret"}
                      disabled={!editingWorkerSettings || savingWorker}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Worker Name</label>
                    <Input
                      value={workerForm.worker_name}
                      onChange={(event) => setWorkerForm((current) => ({ ...current, worker_name: event.target.value }))}
                      disabled={!editingWorkerSettings || savingWorker}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Interval MS</label>
                    <Input
                      type="number"
                      min={5000}
                      value={workerForm.interval_ms}
                      onChange={(event) => setWorkerForm((current) => ({ ...current, interval_ms: event.target.value }))}
                      disabled={!editingWorkerSettings || savingWorker}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Request Timeout MS</label>
                    <Input
                      type="number"
                      min={1000}
                      value={workerForm.request_timeout_ms}
                      onChange={(event) => setWorkerForm((current) => ({ ...current, request_timeout_ms: event.target.value }))}
                      disabled={!editingWorkerSettings || savingWorker}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Health Port</label>
                    <Input
                      type="number"
                      min={1}
                      value={workerForm.health_port}
                      onChange={(event) => setWorkerForm((current) => ({ ...current, health_port: event.target.value }))}
                      placeholder="Optional"
                      disabled={!editingWorkerSettings || savingWorker}
                    />
                  </div>
                  <div className="flex items-center gap-6 pt-7">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Checkbox
                        checked={workerForm.run_on_start}
                        onCheckedChange={(value) => setWorkerForm((current) => ({ ...current, run_on_start: Boolean(value) }))}
                        disabled={!editingWorkerSettings || savingWorker}
                      />
                      Run on start
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Checkbox
                        checked={workerForm.enabled}
                        onCheckedChange={(value) => setWorkerForm((current) => ({ ...current, enabled: Boolean(value) }))}
                        disabled={!editingWorkerSettings || savingWorker}
                      />
                      Worker enabled
                    </label>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/15 p-4">
                  <h4 className="font-semibold">Health Snapshot</h4>
                  <div className="mt-3 grid gap-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Last seen</span>
                      <span className="font-medium">{formatRelativeHeartbeat(heartbeat?.last_seen_at ?? null)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Last run</span>
                      <span className="font-medium">{formatDateTime(heartbeat?.last_run_at ?? null)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Last success</span>
                      <span className="font-medium">{formatDateTime(heartbeat?.last_success_at ?? null)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">HTTP</span>
                      <span className="font-medium">{heartbeat?.last_http_status ?? "-"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Processed</span>
                      <span className="font-medium">{heartbeat?.last_processed ?? "-"}</span>
                    </div>
                    {heartbeat?.last_error ? <p className="text-destructive">{heartbeat.last_error}</p> : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {editingWorkerSettings ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => saveWorkerSettings(!workerForm.enabled)}
                      disabled={savingWorker}
                    >
                      {workerForm.enabled ? <PauseCircle className="size-4" /> : <PlayCircle className="size-4" />}
                      {workerForm.enabled ? "Turn Off" : "Start"}
                    </Button>
                    <Button type="button" variant="outline" onClick={cancelWorkerSettingsEdit} disabled={savingWorker}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={() => saveWorkerSettings()} disabled={savingWorker}>
                      {savingWorker ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      Save Settings
                    </Button>
                  </>
                ) : (
                  <Button type="button" onClick={() => setEditingWorkerSettings(true)} disabled={loadingWorker}>
                    <Settings className="size-4" />
                    Edit Settings
                  </Button>
                )}
              </div>
            </div>
          ) : null}

          {jobError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {jobError}
            </div>
          ) : null}

          <DataTable
            columns={columns}
            data={jobs}
            loading={loadingJobs}
            emptyText="No cron jobs found."
            searchKey="title"
            filterPlaceholder="Search cron jobs..."
            enableRowSelection
            selectionResetKey={selectionResetKey}
            onRowClick={(job) => setSelectedJob(job)}
            selectedActions={(selectedRows, resetSelection) => (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => cancelSelectedJobs(selectedRows, resetSelection)}
                disabled={!isPlatformAdmin || selectedRows.every((job) => job.status !== "active")}
              >
                Cancel active jobs
              </Button>
            )}
          />

          <Sheet open={Boolean(selectedJob)} onOpenChange={(open) => !open && setSelectedJob(null)}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
              <SheetHeader>
                <SheetTitle>{selectedJob?.title ?? "Cron Job"}</SheetTitle>
                <SheetDescription>
                  {selectedJob ? `${selectedJob.task_type} · ${selectedJob.resource_type} · ${getCronJobOwner(selectedJob)}` : ""}
                </SheetDescription>
              </SheetHeader>

              {selectedJob ? (
                <div className="space-y-4 px-4 pb-6">
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Run time</p>
                        <p className="font-semibold">{formatDateTime(selectedJob.run_at)}</p>
                      </div>
                      <CronStatusBadge status={selectedJob.status} />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Added by</p>
                        <p className="font-medium">{selectedJob.created_by_name ?? "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Completed</p>
                        <p className="font-medium">{formatDateTime(selectedJob.completed_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Resource ID</p>
                        <p className="font-medium">{selectedJob.resource_id ?? "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Updated</p>
                        <p className="font-medium">{formatDateTime(selectedJob.updated_at)}</p>
                      </div>
                    </div>
                    {selectedJob.last_error ? (
                      <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                        {selectedJob.last_error}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border bg-card p-4">
                    <p className="font-semibold">Payload</p>
                    <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-muted/30 p-3 text-xs">
                      {JSON.stringify(selectedJob.payload ?? {}, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : null}
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Socket Services</h2>
              <p className="text-sm text-muted-foreground">
                Realtime notification service for instant alerts, later chat, and support messaging.
              </p>
            </div>
            <Button variant="outline" onClick={refreshSocketTab} disabled={loadingSocket || !authHeader}>
              {loadingSocket ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Refresh
            </Button>
          </div>

          {isPlatformAdmin ? (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Socket Server Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Stored in the database so instant notification publishing can use the configured service.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("capitalize", socketHealthView.className)}>
                    {socketHealthView.label}
                  </Badge>
                  <span className="max-w-md text-xs text-muted-foreground">{socketHealthView.detail}</span>
                  {!editingSocketSettings ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSocketSettings(true)}
                      disabled={loadingSocket}
                    >
                      <Settings className="size-4" />
                      Edit Settings
                    </Button>
                  ) : null}
                </div>
              </div>

              {socketError ? (
                <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {socketError}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Public Socket URL</label>
                    <Input
                      value={socketForm.public_url}
                      onChange={(event) => setSocketForm((current) => ({ ...current, public_url: event.target.value }))}
                      placeholder="https://socket.your-domain.com"
                      disabled={!editingSocketSettings || savingSocket}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Internal Socket URL</label>
                    <Input
                      value={socketForm.internal_url}
                      onChange={(event) => setSocketForm((current) => ({ ...current, internal_url: event.target.value }))}
                      placeholder="http://localhost:3040"
                      disabled={!editingSocketSettings || savingSocket}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Socket Path</label>
                    <Input
                      value={socketForm.socket_path}
                      onChange={(event) => setSocketForm((current) => ({ ...current, socket_path: event.target.value }))}
                      placeholder="/socket.io"
                      disabled={!editingSocketSettings || savingSocket}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Request Timeout MS</label>
                    <Input
                      type="number"
                      min={500}
                      value={socketForm.request_timeout_ms}
                      onChange={(event) => setSocketForm((current) => ({ ...current, request_timeout_ms: event.target.value }))}
                      disabled={!editingSocketSettings || savingSocket}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium">Internal Publish Secret</label>
                    <Input
                      value={socketForm.internal_secret}
                      onChange={(event) => setSocketForm((current) => ({ ...current, internal_secret: event.target.value }))}
                      placeholder={socketSettings?.internal_secret_configured ? "Secret already configured" : "Set secret"}
                      disabled={!editingSocketSettings || savingSocket}
                    />
                  </div>
                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Checkbox
                        checked={socketForm.enabled}
                        onCheckedChange={(value) => setSocketForm((current) => ({ ...current, enabled: Boolean(value) }))}
                        disabled={!editingSocketSettings || savingSocket}
                      />
                      Socket service enabled
                    </label>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/15 p-4">
                  <h4 className="font-semibold">Health Snapshot</h4>
                  <div className="mt-3 grid gap-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium">{socketHealth?.ok ? "Online" : "Offline"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Checked</span>
                      <span className="font-medium">{formatRelativeHeartbeat(socketHealth?.checkedAt ?? null)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Response</span>
                      <span className="font-medium">{socketHealth ? `${socketHealth.responseMs}ms` : "-"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Connected users</span>
                      <span className="font-medium">{socketHealth?.connectedUsers ?? "-"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Sockets</span>
                      <span className="font-medium">{socketHealth?.connectedSockets ?? "-"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Published</span>
                      <span className="font-medium">{socketHealth?.publishedCount ?? "-"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Redis adapter</span>
                      <span className="font-medium">{socketHealth?.redisConnected ? "Connected" : "Off"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Last publish</span>
                      <span className="font-medium">{formatDateTime(socketHealth?.lastPublishedAt ?? null)}</span>
                    </div>
                    {socketHealth?.error ? <p className="text-destructive">{socketHealth.error}</p> : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {editingSocketSettings ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => saveSocketSettings(!socketForm.enabled)}
                      disabled={savingSocket}
                    >
                      {socketForm.enabled ? <PauseCircle className="size-4" /> : <PlayCircle className="size-4" />}
                      {socketForm.enabled ? "Turn Off" : "Start"}
                    </Button>
                    <Button type="button" variant="outline" onClick={cancelSocketSettingsEdit} disabled={savingSocket}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={() => saveSocketSettings()} disabled={savingSocket}>
                      {savingSocket ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      Save Settings
                    </Button>
                  </>
                ) : (
                  <Button type="button" onClick={() => setEditingSocketSettings(true)} disabled={loadingSocket}>
                    <Settings className="size-4" />
                    Edit Settings
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Only platform admins can manage socket services.
            </div>
          )}

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">Setup Checklist</h3>
                <p className="text-sm text-muted-foreground">
                  Expand any action-needed item to see what to set and where.
                </p>
              </div>
              <Badge variant="outline" className={cn(
                socketSetupItems.every((item) => item.done)
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
              )}>
                {socketSetupItems.filter((item) => item.done).length}/{socketSetupItems.length} ready
              </Badge>
            </div>

            <div className="mt-4 divide-y rounded-lg border">
              {socketSetupItems.map((item) => (
                <Collapsible key={item.id} defaultOpen={!item.done}>
                  <CollapsibleTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      className="group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                    >
                      <Checkbox
                        checked={item.done}
                        aria-label={`${item.title} status`}
                        disabled
                        className={cn(
                          item.done
                            ? "data-checked:border-emerald-500 data-checked:bg-emerald-500"
                            : "border-yellow-500/60"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{item.title}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-md",
                              item.done
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                : "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                            )}
                          >
                            {item.done ? "Ready" : "Need action"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                      </div>
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t bg-muted/10 px-11 py-3 text-sm">
                      <p className="font-medium">How to set this up</p>
                      <p className="mt-1 text-muted-foreground">{item.setup}</p>
                      {"setupSections" in item && item.setupSections ? (
                        <div className="mt-3 space-y-4">
                          {item.setupSections.map((section) => (
                            <div key={section.title}>
                              <p className="mb-2 font-medium">{section.title}</p>
                              <div className="overflow-hidden rounded-md border">
                                <div className="grid grid-cols-[180px_1fr] border-b bg-muted/30 text-xs font-semibold uppercase text-muted-foreground">
                                  <div className="px-3 py-2">Field</div>
                                  <div className="border-l px-3 py-2">Value</div>
                                </div>
                                {section.rows.map(([field, value]) => (
                                  <div key={field} className="grid grid-cols-[180px_1fr] border-b last:border-b-0">
                                    <div className="px-3 py-2 font-medium">{field}</div>
                                    <div className="border-l px-3 py-2 text-muted-foreground">{value}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
