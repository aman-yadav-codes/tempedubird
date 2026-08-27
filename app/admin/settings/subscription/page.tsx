"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { BadgeDollarSign, Ban, CheckCircle2, CreditCard, Database, Loader2, MoreHorizontal, RefreshCw, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { DummyRazorpayModal } from "@/components/subscriptions/razorpay-dummy-checkout-modal";

type SubscriptionRow = {
  id: number | null;
  institution_id: number;
  institution_name: string;
  institution_type_name: string | null;
  package_id: number | null;
  package_name: string | null;
  status: string | null;
  starts_at: string | null;
  expires_at: string | null;
  price: string | number | null;
  price_unit: string | null;
  storage_limit_gb: string | number | null;
  validity_count: number | null;
  validity_unit: string | null;
  is_valid: boolean;
  requested_by_name: string | null;
  approved_by_name: string | null;
  requested_at: string | null;
  approved_at: string | null;
};

type PlanRow = {
  id: number;
  name: string;
  package_for: string;
  package_for_types: string[];
  price: string | number;
  price_unit: string;
  storage_limit_gb: string | number | null;
  validity_count: number;
  validity_unit: string;
  description: string | null;
};

type InstitutionPayload = {
  institution: {
    id: number;
    name: string;
    institution_type_name: string | null;
  } | null;
  subscription: SubscriptionRow | null;
  is_valid: boolean;
  plans: PlanRow[];
};

const PAGE_SIZE = 10;

function currency(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function unitLabel(value: string | null | undefined) {
  if (value === "year") return "year";
  if (value === "once") return "once";
  return "month";
}

function validityLabel(plan: Pick<PlanRow, "validity_count" | "validity_unit">) {
  const unit = plan.validity_unit === "year" ? "year" : "month";
  return `${plan.validity_count} ${unit}${plan.validity_count === 1 ? "" : "s"}`;
}

function remainingDaysLabel(value: string | null | undefined) {
  if (!value) return null;
  const expiry = new Date(`${value}T23:59:59`);
  if (Number.isNaN(expiry.getTime())) return null;
  const diff = Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return "Expired";
  if (diff === 0) return "Expires today";
  return `${diff} day${diff === 1 ? "" : "s"} remaining`;
}

function storageLabel(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "Not limited";
  return `${Number(value).toLocaleString("en-IN")} GB`;
}

export default function SubscriptionSettingsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitution, activeInstitutionId } = useActiveInstitution();
  const searchParams = useSearchParams();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const authHeader = useMemo(() => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), [accessToken]);

  const required = searchParams.get("required") === "1";
  const requestedInstitutionId = Number(searchParams.get("institutionId") ?? 0) || activeInstitutionId;
  const [institutionData, setInstitutionData] = useState<InstitutionPayload | null>(null);
  const [platformRows, setPlatformRows] = useState<SubscriptionRow[]>([]);
  const [platformTotal, setPlatformTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [savingPlanId, setSavingPlanId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<PlanRow | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const canChoosePlan = Boolean(
    !isPlatformAdmin &&
      requestedInstitutionId &&
      isInstitutionAdminUser(user)
  );

  const loadSubscriptions = useCallback(async () => {
    if (!isReady || !accessToken) return;
    if (!isPlatformAdmin && !requestedInstitutionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (isPlatformAdmin) {
        params.set("page", String(pagination.pageIndex + 1));
        params.set("limit", String(pagination.pageSize));
        if (search.trim()) params.set("search", search.trim());
      } else if (requestedInstitutionId) {
        params.set("institutionId", String(requestedInstitutionId));
      }

      const res = await fetch(`/api/admin/settings/subscription?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load subscriptions");

      if (json.mode === "platform") {
        setPlatformRows(json.data ?? []);
        setPlatformTotal(Number(json.total ?? 0));
      } else {
        setInstitutionData(json.data ?? null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader, isPlatformAdmin, isReady, pagination.pageIndex, pagination.pageSize, requestedInstitutionId, search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadSubscriptions(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadSubscriptions]);

  async function choosePlan(planId: number) {
    if (!accessToken || !requestedInstitutionId || !canChoosePlan) return;
    setSavingPlanId(planId);
    try {
      const res = await fetch("/api/admin/settings/subscription", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId: requestedInstitutionId, packageId: planId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to send subscription request");
      toast.success("Approval request sent to platform admin");
      await loadSubscriptions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to activate subscription");
    } finally {
      setSavingPlanId(null);
    }
  }

  const approveRequest = useCallback(async (subscriptionId: number) => {
    if (!accessToken || !isPlatformAdmin) return;
    setApprovingId(subscriptionId);
    try {
      const res = await fetch("/api/admin/settings/subscription", {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to approve subscription");
      toast.success("Subscription approved and activated");
      await loadSubscriptions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve subscription");
    } finally {
      setApprovingId(null);
    }
  }, [accessToken, authHeader, isPlatformAdmin, loadSubscriptions]);

  const revokeSubscription = useCallback(async (subscriptionId: number) => {
    if (!accessToken || !isPlatformAdmin) return;
    setRevokingId(subscriptionId);
    try {
      const res = await fetch("/api/admin/settings/subscription", {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, action: "revoke" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to revoke subscription");
      toast.success("Subscription revoked");
      await loadSubscriptions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke subscription");
    } finally {
      setRevokingId(null);
    }
  }, [accessToken, authHeader, isPlatformAdmin, loadSubscriptions]);

  const columns = useMemo<ColumnDef<SubscriptionRow>[]>(() => [
    {
      accessorKey: "institution_name",
      header: "Institution",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.institution_name}</p>
          <p className="text-xs text-muted-foreground">{row.original.institution_type_name ?? "Type not set"}</p>
        </div>
      ),
    },
    {
      accessorKey: "package_name",
      header: "Plan",
      cell: ({ row }) => row.original.package_name ?? "No subscription",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.is_valid ? "outline" : "secondary"}
          className={cn(
            row.original.is_valid && "bg-green-500/15 text-green-500 hover:bg-green-500/15",
            row.original.status === "pending" && "bg-amber-500/15 text-amber-400 hover:bg-amber-500/15",
            row.original.status === "revoked" && "bg-destructive/10 text-destructive hover:bg-destructive/10"
          )}
        >
          {row.original.is_valid
            ? "Active"
            : row.original.status === "pending"
              ? "Pending approval"
              : row.original.status === "revoked"
                ? "Revoked"
                : row.original.status ?? "Missing"}
        </Badge>
      ),
    },
    {
      accessorKey: "expires_at",
      header: "Valid Until",
      cell: ({ row }) => formatDate(row.original.expires_at),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => row.original.package_name ? `${currency(row.original.price)} / ${unitLabel(row.original.price_unit)}` : "-",
    },
    {
      accessorKey: "storage_limit_gb",
      header: "Storage",
      cell: ({ row }) => storageLabel(row.original.storage_limit_gb),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const subscriptionId = row.original.id;
        const canApprove = row.original.status === "pending" && Boolean(subscriptionId);
        const canRevoke = row.original.status === "active" && Boolean(subscriptionId);
        const isApproving = approvingId === subscriptionId;
        const isRevoking = revokingId === subscriptionId;
        const isRowBusy = isApproving || isRevoking;

        if (!canApprove && !canRevoke) return "-";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isRowBusy}
                aria-label="Open subscription actions"
              >
                {isRowBusy ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canApprove && (
                <DropdownMenuItem onClick={() => void approveRequest(subscriptionId!)} disabled={approvingId !== null}>
                  {isApproving && <Loader2 className="size-4 animate-spin" />}
                  Approve
                </DropdownMenuItem>
              )}
              {canRevoke && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => void revokeSubscription(subscriptionId!)}
                  disabled={revokingId !== null}
                >
                  {isRevoking ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
                  Revoke
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [approveRequest, approvingId, revokeSubscription, revokingId]);

  if (!isReady) return null;

  const subscription = institutionData?.subscription ?? null;
  const institution = institutionData?.institution ?? {
    id: activeInstitutionId ?? 0,
    name: activeInstitution?.name ?? "Institution",
    institution_type_name: null,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BadgeDollarSign className="size-4 text-primary" />
            Subscription access
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>
            <p className="text-sm text-muted-foreground">
              {isPlatformAdmin
                ? "Review institution subscriptions and expiry status."
                : "Choose a plan to continue using your institution workspace."}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadSubscriptions} disabled={loading} className="w-fit gap-2">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </Button>
      </div>

      {isPlatformAdmin ? (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
              placeholder="Search institution, type, plan..."
              className="pl-9"
            />
          </div>
          <DataTable
            columns={columns}
            data={platformRows}
            loading={loading}
            manualPagination
            pagination={pagination}
            onPaginationChange={setPagination}
            pageCount={Math.max(1, Math.ceil(platformTotal / pagination.pageSize))}
            totalRows={platformTotal}
            filterPlaceholder="Filter current page..."
            emptyText="No subscriptions found."
            getRowId={(row) => `institution-${row.institution_id}-subscription-${row.id ?? "missing"}`}
          />
        </div>
      ) : loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {(required || !institutionData?.is_valid) && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              Choose a plan to continue. Your institution needs an active subscription before using the admin workspace.
            </div>
          )}

          <div className="rounded-md border bg-card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{institution.institution_type_name ?? "Institution"}</p>
                <h2 className="mt-1 text-lg font-semibold">{institution.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {subscription?.package_name
                    ? subscription.status === "pending"
                      ? `${subscription.package_name} is waiting for platform admin approval.`
                      : `${subscription.package_name} expires at ${formatDate(subscription.expires_at)}${remainingDaysLabel(subscription.expires_at) ? ` (${remainingDaysLabel(subscription.expires_at)})` : ""}.`
                    : "No active subscription is attached yet."}
                </p>
              </div>
              <Badge variant={institutionData?.is_valid ? "outline" : "secondary"} className={cn(institutionData?.is_valid && "bg-green-500/15 text-green-500 hover:bg-green-500/15")}>
                {institutionData?.is_valid ? remainingDaysLabel(subscription?.expires_at) ?? "Active" : subscription?.status === "pending" ? "Pending approval" : "Subscription required"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(institutionData?.plans ?? []).map((plan) => {
              const active = subscription?.package_id === plan.id && institutionData?.is_valid;
              const pending = subscription?.package_id === plan.id && subscription?.status === "pending";
              return (
                <div key={plan.id} className={cn("flex min-h-56 flex-col rounded-md border bg-card p-5", active && "border-primary")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{plan.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{plan.package_for_types?.join(", ") || plan.package_for}</p>
                    </div>
                    {(active || pending) && <CheckCircle2 className={cn("size-5", active ? "text-green-500" : "text-amber-400")} />}
                  </div>
                  <div className="mt-5">
                    <p className="text-2xl font-bold">{currency(plan.price)}</p>
                    <p className="text-sm text-muted-foreground">per {unitLabel(plan.price_unit)} · valid {validityLabel(plan)}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Database className="size-4" />
                    {storageLabel(plan.storage_limit_gb)}
                  </div>
                  {plan.description && <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{plan.description}</p>}
                  <div className="mt-auto space-y-2 pt-4">
                    {!active && !pending && (
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
                        disabled={!canChoosePlan}
                        onClick={() => {
                          setSelectedPlanForPayment(plan);
                          setPaymentModalOpen(true);
                        }}
                      >
                        <CreditCard className="size-4" />
                        Pay with Razorpay
                      </Button>
                    )}
                    <Button
                      variant={active || pending ? "default" : "outline"}
                      className="w-full"
                      disabled={!canChoosePlan || savingPlanId !== null || active || pending}
                      onClick={() => void choosePlan(plan.id)}
                    >
                      {savingPlanId === plan.id && <Loader2 className="size-4 animate-spin" />}
                      {active ? "Current Active Plan" : pending ? "Waiting Approval" : "Request Admin Approval"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {!institutionData?.plans?.length && (
            <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
              No active plans are available for this institution type yet.
            </div>
          )}

          <DummyRazorpayModal
            open={paymentModalOpen}
            onOpenChange={setPaymentModalOpen}
            packageItem={selectedPlanForPayment}
            institutionId={requestedInstitutionId}
            roleTarget="institution_admin"
            onSuccess={loadSubscriptions}
          />
        </div>
      )}
    </div>
  );
}
