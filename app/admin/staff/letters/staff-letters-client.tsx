"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter as DialogFooter,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { toRoleRoutePath } from "@/lib/auth/role-routes";
import { useAuthStore } from "@/store";

type StaffLettersMode = "admin" | "self";

type StaffLetterRow = {
  id: string | number;
  staff_user_id: number;
  full_name: string;
  email?: string | null;
  role_code: "teacher" | "driver";
  template_name: string;
  category_name?: string | null;
  title: string;
  image_url?: string | null;
  pdf_url?: string | null;
  canvas_width?: number | null;
  canvas_height?: number | null;
  created_at: string;
  generated_by_name?: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleLabel(roleCode: string) {
  return roleCode === "driver" ? "Driver" : "Teacher";
}

function downloadDataUrl(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
}

function LetterActions({
  row,
  mode,
  deleting,
  onDelete,
}: {
  row: StaffLetterRow;
  mode: StaffLettersMode;
  deleting: boolean;
  onDelete: (row: StaffLetterRow) => void;
}) {
  const imageUrl = row.image_url ?? "";
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!imageUrl}
        onClick={() => imageUrl && downloadDataUrl(imageUrl, `${row.title || "staff-letter"}.png`)}
      >
        <Download className="size-4" />
        PNG
      </Button>
      {mode === "admin" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={deleting}
          onClick={() => onDelete(row)}
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Delete
        </Button>
      )}
    </div>
  );
}

function LetterTable({
  rows,
  loading,
  mode,
  deletingId,
  onDelete,
}: {
  rows: StaffLetterRow[];
  loading: boolean;
  mode: StaffLettersMode;
  deletingId: string | number | null;
  onDelete: (row: StaffLetterRow) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-16 rounded-md" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
        <p>No staff letters found.</p>
        {mode === "admin" && (
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href="/admin/master-data/card-templates">
              <Plus className="size-4" />
              Generate Staff Letter
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              {mode === "admin" && <th className="px-4 py-3 font-medium">Staff</th>}
              <th className="px-4 py-3 font-medium">Letter</th>
              <th className="px-4 py-3 font-medium">Generated</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                {mode === "admin" && (
                  <td className="px-4 py-3">
                    <p className="font-semibold">{row.full_name}</p>
                    <p className="text-xs text-muted-foreground">{row.email || "-"}</p>
                    <Badge variant="outline" className="mt-1 rounded-md">
                      {roleLabel(row.role_code)}
                    </Badge>
                  </td>
                )}
                <td className="px-4 py-3">
                  <p className="font-semibold">{row.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.category_name || row.template_name}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p>{formatDateTime(row.created_at)}</p>
                  {mode === "admin" && (
                    <p className="text-xs text-muted-foreground">
                      By {row.generated_by_name || "System"}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <LetterActions
                    row={row}
                    mode={mode}
                    deleting={String(deletingId ?? "") === String(row.id)}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-border md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{row.title}</p>
                <p className="text-xs text-muted-foreground">
                  {mode === "admin" ? `${row.full_name} · ${roleLabel(row.role_code)}` : row.category_name || row.template_name}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 rounded-md">
                {row.category_name || "Letter"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</p>
            <LetterActions
              row={row}
              mode={mode}
              deleting={String(deletingId ?? "") === String(row.id)}
              onDelete={onDelete}
            />
          </div>
        ))}
      </div>
    </>
  );
}

export function StaffLettersClient({ mode = "admin" }: { mode?: StaffLettersMode }) {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const institutionId = activeInstitution?.id ? String(activeInstitution.id) : "";
  const authHeaders = useMemo(
    () => accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    [accessToken]
  );
  const [rows, setRows] = useState<StaffLetterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<StaffLetterRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const loadLetters = useCallback(async () => {
    if (!isReady || !authHeaders || !institutionId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        institutionId,
        mode,
        page: String(page),
        limit: "10",
        search: debouncedSearch,
      });
      const res = await fetch(`/api/admin/staff/letters?${params.toString()}`, { headers: authHeaders });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load staff letters");
      setRows(json.data ?? []);
      setPageCount(Number(json.pageCount ?? 1));
      setTotal(Number(json.total ?? 0));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load staff letters");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, debouncedSearch, institutionId, isReady, mode, page]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadLetters(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadLetters]);

  async function deleteLetter() {
    if (!deleteTarget || !authHeaders || !institutionId) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch("/api/admin/staff/letters", {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: deleteTarget.id,
          institutionId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete staff letter");
      toast.success("Staff letter deleted");
      setDeleteTarget(null);
      await loadLetters();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete staff letter");
    } finally {
      setDeletingId(null);
    }
  }

  if (!activeInstitution) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center text-muted-foreground">
        Select an institution to view staff letters.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{mode === "self" ? "My Letters" : "Staff Letters"}</h1>
          <p className="text-muted-foreground">
            {mode === "self"
              ? "View offer, joining, and staff letters generated for your account."
              : "Review offer, joining, and staff letters generated for teachers and drivers."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="rounded-md">{activeInstitution.name}</Badge>
          {mode === "admin" && (
            <Button asChild className="gap-1.5 font-semibold">
              <Link href={toRoleRoutePath("/admin/master-data/card-templates", user)}>
                <Plus className="size-4" />
                Generate Staff Letter
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border border-border bg-card">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={mode === "self" ? "Search letters..." : "Search staff or letters..."}
                className="w-full pl-9 sm:w-80"
              />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadLetters()} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
        </div>

        <LetterTable
          rows={rows}
          loading={loading}
          mode={mode}
          deletingId={deletingId}
          onDelete={setDeleteTarget}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-sm text-muted-foreground">
          <span>Showing page {page} of {Math.max(pageCount, 1)} · {total} records</span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || page >= pageCount}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete staff letter?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {deleteTarget?.title ?? "this staff letter"} from institute admin and staff letter history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(deletingId)}
              onClick={(event) => {
                event.preventDefault();
                void deleteLetter();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
