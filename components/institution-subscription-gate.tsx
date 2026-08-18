"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { toCanonicalAdminPath, toRoleRoutePath } from "@/lib/auth/role-routes";
import { useAuthStore } from "@/store";
import { readJsonResponse } from "@/lib/api/read-json-response";

type SubscriptionState = {
  is_valid?: boolean;
  subscription?: {
    package_name?: string | null;
    expires_at?: string | null;
  } | null;
};

type SubscriptionResponse = {
  data?: SubscriptionState["subscription"];
  error?: string;
};

function getInstitutionAdminInstitutionId(user: ReturnType<typeof useAuthStore.getState>["user"]) {
  return user?.memberships?.find((membership) =>
    membership.role_code === "institution_admin" &&
    Number.isInteger(Number(membership.institution_id)) &&
    Number(membership.institution_id) > 0
  )?.institution_id ?? null;
}

export function InstitutionSubscriptionGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(false);

  const canonicalPathname = toCanonicalAdminPath(pathname);
  const isSubscriptionPage = canonicalPathname === "/admin/settings/subscription";
  const institutionId = getInstitutionAdminInstitutionId(user);
  const shouldCheck = Boolean(
    accessToken &&
      institutionId &&
      isInstitutionAdminUser(user) &&
      !isPlatformAdminUser(user)
  );
  const authHeader = useMemo(() => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), [accessToken]);

  const loadSubscription = useCallback(async () => {
    if (!shouldCheck || !institutionId) {
      setState(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/settings/subscription?institutionId=${institutionId}`, {
        headers: authHeader,
      });
      const json = await readJsonResponse<SubscriptionResponse>(response);
      if (!response.ok) throw new Error(json.error ?? "Failed to load subscription");
      setState({ is_valid: true, subscription: json.data ?? null });
    } catch {
      setState({ is_valid: false, subscription: null });
    } finally {
      setLoading(false);
    }
  }, [authHeader, institutionId, shouldCheck]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadSubscription(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadSubscription]);

  if (!shouldCheck || isSubscriptionPage || loading || state?.is_valid !== false) {
    return null;
  }

  const subscription = state.subscription;
  const expiredLabel = subscription?.expires_at
    ? `${subscription.package_name ?? "Your plan"} expired on ${new Date(`${subscription.expires_at}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}.`
    : "Your institution does not have an active subscription.";

  return (
    <Dialog open modal>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 grid size-12 place-items-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive">
            <BadgeDollarSign className="size-6" />
          </div>
          <DialogTitle>Subscription expired</DialogTitle>
          <DialogDescription>
            {expiredLabel} Purchase a valid plan to continue using the institution admin workspace.
          </DialogDescription>
        </DialogHeader>
        <Button
          className="w-full"
          onClick={() => router.push(toRoleRoutePath("/admin/settings/subscription?required=1", user))}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <BadgeDollarSign className="size-4" />}
          Purchase Subscription
        </Button>
      </DialogContent>
    </Dialog>
  );
}
