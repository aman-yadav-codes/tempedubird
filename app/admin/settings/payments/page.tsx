"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2, Plus, QrCode, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  DocumentFileUpload,
  type UploadedDocumentFile,
} from "@/components/shared/document-file-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { useAuthStore } from "@/store";

type PaymentSettings = {
  id: number;
  scope_type: "platform" | "institution";
  institution_id: number | null;
  upi_id: string | null;
  qr_image_url: string | null;
  qr_image_public_id: string | null;
  qr_image_resource_type: string | null;
  is_active: boolean;
  updated_at: string;
};

type FinanceCategoryUsage = "income" | "expense" | "recurring";

type PaymentCategory = {
  id: string;
  income_id: number | null;
  expense_id: number | null;
  recurring_id: number | null;
  name: string;
  usage_types: FinanceCategoryUsage[];
};

const CATEGORY_USAGE_OPTIONS: MultiSelectOption[] = [
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
  { label: "Recurring Expenses", value: "recurring" },
];

const CATEGORY_USAGE_LABELS: Record<FinanceCategoryUsage, string> = {
  income: "Income",
  expense: "Expense",
  recurring: "Recurring",
};

function qrToFiles(settings: PaymentSettings | null): UploadedDocumentFile[] {
  if (!settings?.qr_image_url) return [];
  return [
    {
      url: settings.qr_image_url,
      publicId: settings.qr_image_public_id || settings.qr_image_url,
      resourceType: settings.qr_image_resource_type || "image",
      fileType: "image/*",
      name: "Payment QR code",
    },
  ];
}

export default function PaymentSettingsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitution, activeInstitutionId } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    [accessToken],
  );

  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [upiId, setUpiId] = useState("");
  const [qrFiles, setQrFiles] = useState<UploadedDocumentFile[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [categories, setCategories] = useState<PaymentCategory[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryUsages, setCategoryUsages] = useState<FinanceCategoryUsage[]>(["income", "expense"]);
  const [editingCategory, setEditingCategory] = useState<PaymentCategory | null>(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryDeletingId, setCategoryDeletingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const scopeLabel = isPlatformAdmin
    ? "Platform payments"
    : `${activeInstitution?.name ?? "Institution"} payments`;
  const categoryScopeLabel = isPlatformAdmin
    ? "Platform finance categories"
    : `${activeInstitution?.name ?? "Institution"} finance categories`;
  const targetInstitutionId = isPlatformAdmin ? null : activeInstitutionId;
  const canEdit = isPlatformAdmin
    ? true
    : Boolean(
        targetInstitutionId &&
          hasPermission(user, "settings.payments.edit", {
            institutionId: targetInstitutionId,
          }),
      );

  const fetchSettings = useCallback(async () => {
    if (!isReady || !accessToken) return;
    if (!isPlatformAdmin && !targetInstitutionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (targetInstitutionId) params.set("institutionId", String(targetInstitutionId));
      const query = params.toString() ? `?${params.toString()}` : "";
      const [res, categoryRes] = await Promise.all([
        fetch(`/api/admin/settings/payments${query}`, { headers: authHeader }),
        fetch(`/api/admin/settings/payment-categories${query}`, { headers: authHeader }),
      ]);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load payment settings");
      const categoryJson = await categoryRes.json();
      if (!categoryRes.ok) throw new Error(categoryJson.error || "Failed to load finance categories");

      const nextSettings = json.data as PaymentSettings;
      setSettings(nextSettings);
      setUpiId(nextSettings.upi_id || "");
      setQrFiles(qrToFiles(nextSettings));
      setIsActive(nextSettings.is_active !== false);
      setCategories((categoryJson.data ?? []) as PaymentCategory[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load payment settings");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader, isPlatformAdmin, isReady, targetInstitutionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchSettings();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchSettings]);

  async function saveSettings() {
    if (!accessToken) return;
    if (!canEdit) {
      toast.error("You do not have permission to update payment settings.");
      return;
    }
    if (!upiId.trim() && qrFiles.length === 0) {
      toast.error("Add a UPI ID or upload a QR code image.");
      return;
    }

    setSaving(true);
    try {
      const qr = qrFiles[0] ?? null;
      const res = await fetch("/api/admin/settings/payments", {
        method: "PATCH",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institutionId: targetInstitutionId,
          upi_id: upiId.trim(),
          qr_image_url: qr?.url || "",
          qr_image_public_id: qr?.publicId || "",
          qr_image_resource_type: qr?.resourceType || "",
          is_active: isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save payment settings");

      const nextSettings = json.data as PaymentSettings;
      setSettings(nextSettings);
      setUpiId(nextSettings.upi_id || "");
      setQrFiles(qrToFiles(nextSettings));
      setIsActive(nextSettings.is_active !== false);
      toast.success("Payment settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save payment settings");
    } finally {
      setSaving(false);
    }
  }

  function resetCategoryForm() {
    setCategoryName("");
    setCategoryUsages(["income", "expense"]);
    setEditingCategory(null);
  }

  function selectCategoryForEdit(category: PaymentCategory) {
    if (!canEdit || categorySaving) return;
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryUsages(category.usage_types.length > 0 ? category.usage_types : ["income"]);
  }

  async function addCategory() {
    if (!accessToken || !canEdit) return;
    if (!categoryName.trim()) {
      toast.error("Enter a category name.");
      return;
    }
    if (categoryUsages.length === 0) {
      toast.error("Select where this category should appear.");
      return;
    }

    setCategorySaving(true);
    try {
      const res = await fetch("/api/admin/settings/payment-categories", {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institutionId: targetInstitutionId,
          name: categoryName.trim(),
          usage_types: categoryUsages,
          income_id: editingCategory?.income_id ?? null,
          expense_id: editingCategory?.expense_id ?? null,
          recurring_id: editingCategory?.recurring_id ?? null,
          previous_name: editingCategory?.name ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add category");
      const next = json.data as PaymentCategory;
      setCategories((current) =>
        [
          ...current.filter((category) => category.id !== next.id && category.id !== editingCategory?.id),
          next,
        ].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      resetCategoryForm();
      toast.success(editingCategory ? "Finance category updated" : "Finance category added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add category");
    } finally {
      setCategorySaving(false);
    }
  }

  async function removeCategory(category: PaymentCategory) {
    if (!accessToken || !canEdit) return;
    setCategoryDeletingId(Number(category.income_id ?? category.expense_id ?? category.recurring_id ?? 0));
    try {
      const res = await fetch("/api/admin/settings/payment-categories", {
        method: "DELETE",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institutionId: targetInstitutionId,
          income_id: category.income_id,
          expense_id: category.expense_id,
          recurring_id: category.recurring_id,
          name: category.name,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to remove category");
      setCategories((current) => current.filter((item) => item.id !== category.id));
      if (editingCategory?.id === category.id) resetCategoryForm();
      toast.success("Finance category removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove category");
    } finally {
      setCategoryDeletingId(null);
    }
  }

  if (!isReady) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CreditCard className="size-4 text-primary" />
            Student payment collection
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payment Settings</h1>
            <p className="text-sm text-muted-foreground">
              Save the UPI ID and QR code students should use while paying fees.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSettings} disabled={loading} className="w-fit gap-2">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Collection Details</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These details can be shown when collecting student fee payments.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{scopeLabel}</Badge>
            <Badge className={isActive ? "bg-green-500/15 text-green-500 hover:bg-green-500/15" : ""} variant={isActive ? "outline" : "secondary"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="space-y-5 p-5">
            <Skeleton className="h-10 w-full max-w-xl" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-48" />
          </div>
        ) : (
          <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="payment-upi-id">UPI ID</Label>
                <Input
                  id="payment-upi-id"
                  value={upiId}
                  onChange={(event) => setUpiId(event.target.value)}
                  placeholder="schoolname@upi"
                  disabled={!canEdit || saving}
                />
                <p className="text-xs text-muted-foreground">
                  Example: `mpschool@oksbi` or the official institute payment UPI ID.
                </p>
              </div>

              <div className="space-y-2">
                <div>
                  <Label>QR Code Image</Label>
                  <p className="text-xs text-muted-foreground">
                    Upload one payment QR image. The file is stored in Cloudinary.
                  </p>
                </div>
                <DocumentFileUpload
                  accessToken={accessToken}
                  files={qrFiles}
                  onFilesChange={setQrFiles}
                  maxFiles={1}
                  maxSize={5 * 1024 * 1024}
                  compact
                  disabled={!canEdit || saving}
                  buttonLabel="Upload QR"
                  emptyText="Drop QR code here or click to browse"
                />
              </div>

              <div className="flex items-center gap-3 rounded-md border bg-muted/10 p-3">
                <Checkbox
                  id="payment-settings-active"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                  disabled={!canEdit || saving}
                />
                <div>
                  <Label htmlFor="payment-settings-active" className="cursor-pointer">
                    Active
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Turn this off when this payment method should not be shown.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={saveSettings} disabled={!canEdit || saving} className="gap-2">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save Payment Settings
                </Button>
                {!canEdit ? (
                  <p className="self-center text-sm text-muted-foreground">
                    You have view access only.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-md border bg-muted/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <QrCode className="size-4 text-primary" />
                Payment Preview
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">UPI ID</p>
                  <p className="mt-1 break-all text-sm font-semibold">{upiId.trim() || "Not set"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">QR Code</p>
                  {qrFiles[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrFiles[0].url}
                      alt="Payment QR code preview"
                      className="mt-2 aspect-square w-full rounded-md border bg-background object-contain p-2"
                    />
                  ) : (
                    <div className="mt-2 flex aspect-square w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                      No QR uploaded
                    </div>
                  )}
                </div>
                {settings?.updated_at ? (
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(settings.updated_at).toLocaleString("en-IN")}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md border bg-card">
        <div className="border-b p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Finance Categories</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These categories appear in Finance &gt; Income, Expense, and Recurring Expenses based on the selected pages.
              </p>
            </div>
            <Badge variant="outline" className="w-fit">{categoryScopeLabel}</Badge>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_260px_auto]">
            <Input
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="e.g. Internet Bills, Water Bills, Hosting Bills"
              disabled={!canEdit || categorySaving}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addCategory();
                }
              }}
            />
            <MultiSelect
              options={CATEGORY_USAGE_OPTIONS}
              value={categoryUsages}
              onValueChange={(values) => setCategoryUsages(values as FinanceCategoryUsage[])}
              placeholder="Select pages"
              maxCount={2}
              modalPopover
              className="w-full"
              disabled={!canEdit || categorySaving}
            />
            <Button
              onClick={addCategory}
              disabled={!canEdit || categorySaving || categoryUsages.length === 0}
              className="gap-2 lg:w-fit"
            >
              {categorySaving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {editingCategory ? "Update Category" : "Add Category"}
            </Button>
          </div>
          {editingCategory ? (
            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
              <span>Editing {editingCategory.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetCategoryForm}
                disabled={categorySaving}
              >
                Cancel edit
              </Button>
            </div>
          ) : null}

          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : categories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <div
                  role="button"
                  tabIndex={canEdit && !categorySaving ? 0 : -1}
                  key={category.id}
                  onClick={() => selectCategoryForEdit(category)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectCategoryForEdit(category);
                    }
                  }}
                  className="flex items-center gap-2 rounded-md border bg-muted/10 px-3 py-2 text-left text-sm transition-colors hover:border-primary/60 hover:bg-primary/10 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60 data-[editable=true]:cursor-pointer"
                  data-editable={canEdit && !categorySaving}
                  data-disabled={!canEdit || categorySaving}
                >
                  <span className="font-medium">{category.name}</span>
                  {category.usage_types.map((usage) => (
                    <Badge key={usage} variant="outline">
                      {CATEGORY_USAGE_LABELS[usage]}
                    </Badge>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={!canEdit || categoryDeletingId === Number(category.income_id ?? category.expense_id ?? category.recurring_id ?? 0)}
                    onClick={(event) => {
                      event.stopPropagation();
                      void removeCategory(category);
                    }}
                  >
                    {categoryDeletingId === Number(category.income_id ?? category.expense_id ?? category.recurring_id ?? 0) ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4 text-destructive" />
                    )}
                    <span className="sr-only">Remove {category.name}</span>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No finance categories yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
