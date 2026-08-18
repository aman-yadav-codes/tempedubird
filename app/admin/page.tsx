"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAdminGuard } from "@/hooks/use-admin-guard";
import { ACTIVE_CHILD_CHANGE_EVENT, getStoredActiveChildStudentId } from "@/lib/auth/active-child";
import { toRoleRoutePath } from "@/lib/auth/role-routes";
import { useAuthStore } from "@/store";

type DashboardCard = {
  label: string;
  value: string;
  hint: string;
};

type DashboardNotification = {
  notification_id: string;
  title: string;
  message: string;
  created_at: string;
};

type DashboardPayload = {
  role: "platform_admin" | "institution_admin" | "teacher" | "student" | "parent" | "admin";
  cards: DashboardCard[];
  notifications: DashboardNotification[];
};

let dashboardRequest:
  | {
      token: string;
      childStudentId: number | null;
      loadedAt: number;
      promise: Promise<DashboardPayload>;
    }
  | null = null;

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned an invalid response" };
  }
}

async function fetchDashboard(accessToken: string) {
  const now = Date.now();
  const childStudentId = getStoredActiveChildStudentId();
  if (
    dashboardRequest?.token === accessToken &&
    dashboardRequest.childStudentId === childStudentId &&
    now - dashboardRequest.loadedAt < 5000
  ) {
    return dashboardRequest.promise;
  }

  const url = new URL("/api/admin/dashboard", window.location.origin);
  if (childStudentId) url.searchParams.set("childStudentId", String(childStudentId));

  const promise = fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  }).then(async (res) => {
    const json = await readJson(res);
    if (!res.ok) throw new Error(json.error ?? "Failed to load dashboard");
    return json as DashboardPayload;
  });

  dashboardRequest = {
    token: accessToken,
    childStudentId,
    loadedAt: now,
    promise,
  };

  return promise;
}

function formatActivityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dashboardCopy(role: DashboardPayload["role"] | undefined) {
  if (role === "platform_admin") {
    return {
      title: "Dashboard",
      subtitle: "Platform overview across institutions, support, and assignments.",
    };
  }
  if (role === "institution_admin") {
    return {
      title: "Dashboard",
      subtitle: "Institution overview for teachers, students, and support.",
    };
  }
  if (role === "teacher") {
    return {
      title: "Dashboard",
      subtitle: "Teacher workspace summary.",
    };
  }
  if (role === "student") {
    return {
      title: "Dashboard",
      subtitle: "Your assignments, attendance, and latest updates.",
    };
  }
  if (role === "parent") {
    return {
      title: "Dashboard",
      subtitle: "Child overview for attendance, assignments, and updates.",
    };
  }
  return {
    title: "Dashboard",
    subtitle: "Welcome back to the admin panel.",
  };
}

export default function AdminPage() {
  const router = useRouter();
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeChildVersion, setActiveChildVersion] = useState(0);

  const isStudent = user?.role_codes?.includes("student") || user?.roles?.includes("student") || user?.primary_role === "student";

  useEffect(() => {
    if (isReady && isStudent) {
      router.replace(toRoleRoutePath("/admin/my-program", user));
    }
  }, [isReady, isStudent, router, user]);

  useEffect(() => {
    function refreshForChildChange() {
      dashboardRequest = null;
      setActiveChildVersion((version) => version + 1);
    }

    window.addEventListener(ACTIVE_CHILD_CHANGE_EVENT, refreshForChildChange);
    return () => {
      window.removeEventListener(ACTIVE_CHILD_CHANGE_EVENT, refreshForChildChange);
    };
  }, []);

  useEffect(() => {
    if (!isReady || !accessToken) return;

    let cancelled = false;
    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const json = await fetchDashboard(accessToken);
        if (!cancelled) setDashboard(json);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load dashboard";
        if (!cancelled) {
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [accessToken, activeChildVersion, isReady]);

  const copy = dashboardCopy(dashboard?.role);
  const cards = dashboard?.cards ?? [];
  const notifications = dashboard?.notifications ?? [];

  if (!isReady) {
    return <div className="text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="text-muted-foreground">{copy.subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading && cards.length === 0
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="h-4 w-28 rounded bg-muted" />
                <div className="mt-4 h-9 w-20 rounded bg-muted" />
                <div className="mt-3 h-3 w-36 rounded bg-muted" />
              </div>
            ))
          : cards.map((stat) => (
              <div key={stat.label} className="rounded-xl border bg-card p-5 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
              </div>
            ))}
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        </div>
        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : notifications.length ? (
          <div className="space-y-3">
            {notifications.map((item) => (
              <div key={item.notification_id} className="flex items-start gap-3 text-sm">
                <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bell className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="line-clamp-2 text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatActivityDate(item.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No recent notifications yet.
          </div>
        )}
      </div>
    </div>
  );
}
