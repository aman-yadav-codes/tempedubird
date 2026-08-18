"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, RefreshCw, Save, Settings } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/shared/date-picker";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { setStoredActiveAcademicYearId } from "@/lib/auth/active-academic-session";
import { readJsonResponse } from "@/lib/api/read-json-response";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

type AcademicYearOption = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

type GeneralSettingsResponse = {
  institutionId: number;
  defaultAcademicYearId: number | null;
  defaultAcademicYearStartDate: string | null;
  defaultAcademicYearEndDate: string | null;
  configuredDefaultAcademicYearId: number | null;
  academicYears: AcademicYearOption[];
};

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function InstitutionGeneralSettings() {
  const { accessToken, user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const activeInstitutionId = activeInstitution?.id;
  const activeInstitutionName = activeInstitution?.name;
  const [settings, setSettings] = useState<GeneralSettingsResponse | null>(null);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [sessionStartDate, setSessionStartDate] = useState("");
  const [sessionEndDate, setSessionEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canView = Boolean(
    user?.role_codes?.includes("institution_admin") ||
    user?.memberships?.some((membership) =>
      membership.institution_id === activeInstitutionId &&
      (membership.permissions?.includes("*") || membership.permissions?.includes("institution.general_settings.view"))
    ) || user?.permissions?.includes("*") || user?.is_super_admin
  );
  const canEdit = Boolean(
    user?.role_codes?.includes("institution_admin") ||
    user?.memberships?.some((membership) =>
      membership.institution_id === activeInstitutionId &&
      (membership.permissions?.includes("*") || membership.permissions?.includes("institution.general_settings.edit"))
    ) || user?.permissions?.includes("*") || user?.is_super_admin
  );

  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken],
  );

  const fetchSettings = useCallback(async () => {
    if (!authHeader || !activeInstitutionId || !canView) {
      setSettings(null);
      setSelectedYearId("");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ institutionId: String(activeInstitutionId) });
      const response = await fetch(`/api/admin/settings/general?${params.toString()}`, {
        headers: authHeader,
        cache: "no-store",
      });
      const json = await readJsonResponse<{ data?: GeneralSettingsResponse; error?: string }>(response);
      if (!response.ok) throw new Error(json.error ?? "Failed to load general settings");
      const data = json.data as GeneralSettingsResponse;
      setSettings(data);
      setSelectedYearId(data.defaultAcademicYearId ? String(data.defaultAcademicYearId) : "");
      setSessionStartDate(data.defaultAcademicYearStartDate ?? "");
      setSessionEndDate(data.defaultAcademicYearEndDate ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load general settings");
    } finally {
      setLoading(false);
    }
  }, [activeInstitutionId, authHeader, canView]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchSettings(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchSettings]);

  async function saveSettings() {
    if (!authHeader || !activeInstitutionId || !selectedYearId) return;
    if (!sessionStartDate || !sessionEndDate) {
      toast.error("Select from date and to date for the default session.");
      return;
    }
    if (sessionEndDate < sessionStartDate) {
      toast.error("To date cannot be before from date.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/general", {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: activeInstitutionId,
          academicYearId: Number(selectedYearId),
          startDate: sessionStartDate,
          endDate: sessionEndDate,
        }),
      });
      const json = await readJsonResponse<{ data?: GeneralSettingsResponse; error?: string }>(response);
      if (!response.ok) throw new Error(json.error ?? "Failed to save general settings");
      const nextId = Number(json.data?.defaultAcademicYearId ?? selectedYearId);
      setStoredActiveAcademicYearId(nextId, activeInstitutionId);
      toast.success("Default session updated for this institution.");
      await fetchSettings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save general settings");
    } finally {
      setSaving(false);
    }
  }

  const selectedYear = settings?.academicYears.find((year) => String(year.id) === selectedYearId) ?? null;
  const hasChange = Boolean(
    settings &&
    selectedYearId &&
    (
      String(settings.defaultAcademicYearId ?? "") !== selectedYearId ||
      (settings.defaultAcademicYearStartDate ?? "") !== sessionStartDate ||
      (settings.defaultAcademicYearEndDate ?? "") !== sessionEndDate
    )
  );

  function handleSessionChange(value: string) {
    setSelectedYearId(value);
    const year = settings?.academicYears.find((item) => String(item.id) === value);
    setSessionStartDate(year?.start_date ?? "");
    setSessionEndDate(year?.end_date ?? "");
  }

  if (!activeInstitutionId) {
    return (
      <div className="rounded-md border bg-card p-5">
        <p className="text-sm text-muted-foreground">Select an institution from the sidebar to manage general settings.</p>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="rounded-md border bg-card p-5">
        <p className="text-sm text-muted-foreground">You do not have permission to view institution general settings.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Settings className="size-4 text-destructive" />
            Institution General Settings
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set the default academic session and date range for every member of {activeInstitutionName ?? "this institution"}.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSettings} disabled={loading}>
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(18rem,24rem)_1fr]">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Default Academic Session</label>
            <Select value={selectedYearId} onValueChange={handleSessionChange} disabled={loading || saving || !canEdit}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loading ? "Loading sessions..." : "Select default session"} />
              </SelectTrigger>
              <SelectContent>
                {(settings?.academicYears ?? []).map((year) => (
                  <SelectItem key={year.id} value={String(year.id)}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedYear ? (
              <p className="text-xs text-muted-foreground">
                Existing range: {formatDate(selectedYear.start_date)} to {formatDate(selectedYear.end_date)}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Default Session Date Range</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">From Date</p>
                <DatePicker
                  value={sessionStartDate}
                  onChange={setSessionStartDate}
                  placeholder="Select from date"
                  disabled={loading || saving || !canEdit || !selectedYearId}
                  fromYear={2000}
                  toYear={2100}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">To Date</p>
                <DatePicker
                  value={sessionEndDate}
                  onChange={setSessionEndDate}
                  placeholder="Select to date"
                  disabled={loading || saving || !canEdit || !selectedYearId}
                  fromYear={2000}
                  toYear={2100}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This range is saved on the selected academic session.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5 rounded-md border bg-background/40 p-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-destructive" />
              <p className="text-xs font-medium uppercase text-muted-foreground">Session History</p>
            </div>
            <div className="mt-4 divide-y rounded-md border">
              {(settings?.academicYears ?? []).length ? (
                (settings?.academicYears ?? []).map((year) => {
                  const isDefault = String(year.id) === String(settings?.defaultAcademicYearId ?? "");

                  return (
                    <div key={year.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="font-medium">{year.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(year.start_date)} to {formatDate(year.end_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isDefault ? <Badge>Current default</Badge> : null}
                        {!year.is_active ? <Badge variant="outline">Inactive</Badge> : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="p-3 text-sm text-muted-foreground">No current or previous sessions found.</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              {sessionStartDate && sessionEndDate
                ? `${formatDate(sessionStartDate)} to ${formatDate(sessionEndDate)}`
                : "Choose a complete date range to save."}
            </p>
            <Button onClick={saveSettings} disabled={!canEdit || !hasChange || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save General Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
