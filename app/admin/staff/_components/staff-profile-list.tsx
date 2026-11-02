"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PaginationState } from "@tanstack/react-table";
import { toast } from "sonner";

import { DebouncedSearchInput } from "@/components/shared/debounced-search-input";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { KeyRound, Sparkles, Copy, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { hasPermission } from "@/lib/auth/permissions";
import { getApiErrorMessage, readJsonResponse } from "@/lib/auth/client-permission-errors";
import type { AdminUserDetails } from "@/lib/queries/user";
import { AddUserDialog, type RoleOption } from "@/app/admin/users/add-user-dialog";
import { buildUserColumns, type User } from "@/app/admin/users/columns";
import { UserProfileSheet } from "@/app/admin/users/user-profile-sheet";
import { UserPasswordDialog } from "@/app/admin/users/_components/user-password-dialog";
import { SalaryAccountDialog } from "@/app/admin/users/_components/salary-account-dialog";
import { StaffCommissionDialog } from "@/app/admin/staff/_components/staff-commission-dialog";
import { StaffDocumentsDialog } from "@/app/admin/staff/_components/staff-documents-dialog";
import { StaffSalaryDialog } from "@/app/admin/staff/_components/staff-salary-dialog";
import { StaffSalarySlipsDialog } from "@/app/admin/staff/_components/staff-salary-slips-dialog";
import { StaffAttendanceDialog } from "@/app/admin/staff/_components/staff-attendance-dialog";
import { StaffPerformanceDialog } from "@/app/admin/staff/_components/staff-performance-dialog";
import { usePersistedState } from "@/hooks/use-persisted-state";
import {
  getDefaultStaffFilters,
  isStaffFilters,
  STAFF_TABLE_ROLE_CODES,
  StaffFiltersDrawer,
  type StaffFilters,
} from "./staff-filters-drawer";

export type StaffProfileListConfig = {
  roleCode: "teacher" | "driver";
  permissionModule: "managestaff.allstaff";
  title: string;
  entityLabel: string;
  description: string;
  emptyRoleSearch: string;
};

export const STAFF_PROFILE_CONFIGS: StaffProfileListConfig[] = [
  {
    roleCode: "teacher",
    permissionModule: "managestaff.allstaff",
    title: "Teachers",
    entityLabel: "Teacher",
    description: "Manage teacher profiles for your institution.",
    emptyRoleSearch: "teacher",
  },
  {
    roleCode: "driver",
    permissionModule: "managestaff.allstaff",
    title: "Drivers",
    entityLabel: "Driver",
    description: "Manage driver profiles for your institution.",
    emptyRoleSearch: "driver",
  },
];

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export function StaffProfileList() {
  const router = useRouter();
  const { accessToken, clearAuth, user: currentUser } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const [staff, setStaff] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [viewingUser, setViewingUser] = useState<AdminUserDetails | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUserDetails | null>(null);
  const [removingUser, setRemovingUser] = useState<User | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [salaryAccountOpen, setSalaryAccountOpen] = useState(false);
  const [salaryAccountUser, setSalaryAccountUser] = useState<User | null>(null);
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [commissionUser, setCommissionUser] = useState<User | null>(null);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [documentsUser, setDocumentsUser] = useState<User | null>(null);
  const [salaryRecordsOpen, setSalaryRecordsOpen] = useState(false);
  const [salaryRecordsUser, setSalaryRecordsUser] = useState<User | null>(null);
  const [salarySlipsOpen, setSalarySlipsOpen] = useState(false);
  const [salarySlipsUser, setSalarySlipsUser] = useState<User | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendanceUser, setAttendanceUser] = useState<User | null>(null);
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [performanceUser, setPerformanceUser] = useState<User | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasLoadedStaff, setHasLoadedStaff] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [pageCount, setPageCount] = useState(-1);
  const [totalRows, setTotalRows] = useState(0);
  const [filters, setFilters] = usePersistedState<StaffFilters>(
    "admin.staff.filters",
    getDefaultStaffFilters,
    { version: 1, validate: isStaffFilters }
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const fetchStaffRequestIdRef = useRef(0);
  const fetchStaffAbortRef = useRef<AbortController | null>(null);

  const authHeader = useCallback(() => ({
    Authorization: `Bearer ${accessToken}`,
  }), [accessToken]);

  const handleAuthError = useCallback(() => {
    clearAuth();
    toast.error("Session expired. Please log in again.");
    router.push("/");
  }, [clearAuth, router]);

  const fetchStaff = useCallback(async () => {
    if (!accessToken) return;

    const requestId = ++fetchStaffRequestIdRef.current;
    fetchStaffAbortRef.current?.abort();
    const abortController = new AbortController();
    fetchStaffAbortRef.current = abortController;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        includeCurrentUser: "true",
        staffScope: "all",
      });
      if (filters.search?.trim()) {
        params.set("search", filters.search.trim());
      }
      if (filters.status && filters.status !== "all") {
        params.set("status", filters.status);
      }
      if (filters.roleCode && filters.roleCode !== "all") {
        if (/^\d+$/.test(filters.roleCode)) {
          params.set("roleId", filters.roleCode);
        } else {
          params.set("roleCode", filters.roleCode);
        }
      }
      const isPlatformAdmin = Boolean(
        currentUser?.role_codes?.includes("platform_admin") ||
        currentUser?.is_super_admin ||
        currentUser?.roles?.includes("Platform Admin") ||
        (currentUser as any)?.role === "platform_admin"
      );
      if (activeInstitution && !isPlatformAdmin) {
        params.set("institutionId", String(activeInstitution.id));
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: authHeader(),
        signal: abortController.signal,
      });
      if (requestId !== fetchStaffRequestIdRef.current) return;
      const json = await readJsonResponse(res);

      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        if (res.status === 403) {
          throw new Error(getApiErrorMessage(json, "You don't have permission to view staff."));
        }
        throw new Error(getApiErrorMessage(json, "Failed to fetch staff"));
      }

      if (requestId !== fetchStaffRequestIdRef.current) return;
      setStaff(json.data ?? []);
      setPageCount(json.pageCount ?? -1);
      setTotalRows(Number(json.total ?? 0));
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (requestId !== fetchStaffRequestIdRef.current) return;
      toast.error(getErrorMessage(err));
    } finally {
      if (requestId === fetchStaffRequestIdRef.current) {
        setLoading(false);
        setHasLoadedStaff(true);
        fetchStaffAbortRef.current = null;
      }
    }
  }, [
    accessToken,
    authHeader,
    activeInstitution,
    filters,
    handleAuthError,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPagination((prev) => (
        prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }
      ));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [activeInstitution?.id, filters.roleCode, filters.search, filters.status]);

  const fetchRoles = useCallback(async () => {
    if (!accessToken) return;

    try {
      const isPlatformAdmin = Boolean(
        currentUser?.is_super_admin || currentUser?.role_codes?.includes("platform_admin")
      );

      // Fetch standard system roles
      const params = new URLSearchParams({
        type: isPlatformAdmin ? "roles" : "institutionRoles",
        search: "",
        page: "1",
        limit: "100",
      });
      const res = await fetch(`/api/admin/access/options?${params.toString()}`, {
        headers: authHeader(),
      });
      const json = await readJsonResponse(res);
      const standardRoles: RoleOption[] = json?.data ?? [];

      // Deduplicate roles by ID to prevent key/value collisions
      const seenIds = new Set<number>();
      const uniqueRoles: RoleOption[] = [];
      for (const role of standardRoles) {
        if (role && typeof role.id === "number" && !seenIds.has(role.id)) {
          seenIds.add(role.id);
          uniqueRoles.push(role);
        }
      }

      setRoles(uniqueRoles);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  }, [accessToken, authHeader, currentUser]);

  const fetchUserDetails = useCallback(async (userId: number, forbiddenMessage: string) => {
    if (!accessToken) return null;

    try {
      const res = await fetch(`/api/admin/users/detail?id=${userId}`, {
        headers: authHeader(),
      });
      const json = await readJsonResponse(res);

      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError();
          return null;
        }
        if (res.status === 403) {
          throw new Error(getApiErrorMessage(json, forbiddenMessage));
        }
        throw new Error(getApiErrorMessage(json, "Failed to load staff profile"));
      }

      return json.data as AdminUserDetails;
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
      return null;
    }
  }, [accessToken, authHeader, handleAuthError]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchStaff();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fetchStaff]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchRoles();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fetchRoles]);

  const handleCreated = () => {
    if (pagination.pageIndex === 0) {
      fetchStaff();
      return;
    }

    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  };

  const handleViewProfile = useCallback(async (user: User) => {
    const details = await fetchUserDetails(
      user.id,
      "You don't have permission to view this staff member."
    );
    if (!details) return;

    setViewingUser(details);
    setViewOpen(true);
  }, [fetchUserDetails]);

  const canEditStaff =
    hasPermission(currentUser, "managestaff.allstaff.edit", { institutionId: activeInstitution?.id }) ||
    hasPermission(currentUser, "managestaff.allstaff.edit") ||
    hasPermission(currentUser, "users.allusers.edit") ||
    hasPermission(currentUser, "managestudents.allstudents.edit") ||
    Boolean(
      currentUser?.role_codes?.includes("platform_admin") ||
      currentUser?.role_codes?.includes("institution_admin") ||
      currentUser?.role_codes?.includes("school_owner") ||
      currentUser?.role_codes?.includes("college_owner") ||
      currentUser?.role_codes?.includes("university_owner") ||
      currentUser?.roles?.includes("Institution Admin") ||
      currentUser?.is_super_admin
    );

  const canDeleteStaff =
    hasPermission(currentUser, "managestaff.allstaff.delete", { institutionId: activeInstitution?.id }) ||
    hasPermission(currentUser, "managestaff.allstaff.delete") ||
    hasPermission(currentUser, "users.allusers.delete") ||
    Boolean(
      currentUser?.role_codes?.includes("platform_admin") ||
      currentUser?.role_codes?.includes("institution_admin") ||
      currentUser?.role_codes?.includes("school_owner") ||
      currentUser?.role_codes?.includes("college_owner") ||
      currentUser?.role_codes?.includes("university_owner") ||
      currentUser?.roles?.includes("Institution Admin") ||
      currentUser?.is_super_admin
    );

  const updateFilters = useCallback((nextFilters: StaffFilters) => {
    setFilters(nextFilters);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [setFilters]);

  const resetFilters = useCallback(() => {
    setFilters((current) => ({
      ...getDefaultStaffFilters(),
      search: current.search,
    }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [setFilters]);

  const activeFilterCount = useMemo(
    () => [
      filters.roleCode !== "all" ? filters.roleCode : "",
      filters.status !== "all" ? filters.status : "",
    ].filter(Boolean).length,
    [filters.roleCode, filters.status]
  );

  const handleEditUser = useCallback(async (user: User) => {
    if (!canEditStaff) {
      toast.error("You don't have permission to edit staff.");
      return;
    }

    const toastId = toast.loading("Loading staff member details...");
    try {
      const details = await fetchUserDetails(
        user.id,
        "You don't have permission to edit this staff member."
      );
      if (!details) {
        toast.dismiss(toastId);
        return;
      }

      setEditingUser(details);
      setEditOpen(true);
      toast.dismiss(toastId);
    } catch {
      toast.dismiss(toastId);
    }
  }, [canEditStaff, fetchUserDetails]);

  const handleRemoveUser = useCallback(async () => {
    if (!accessToken || !removingUser) return;
    if (currentUser?.id && removingUser.id === currentUser.id) {
      toast.error("You cannot remove your own account.");
      setRemovingUser(null);
      return;
    }
    if (!canDeleteStaff) {
      toast.error("You don't have permission to remove staff.");
      setRemovingUser(null);
      return;
    }

    setRemoveLoading(true);
    try {
      const res = await fetch(`/api/admin/users/detail?id=${removingUser.id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      const json = await readJsonResponse(res);

      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        if (res.status === 403) {
          throw new Error(getApiErrorMessage(json, "You don't have permission to remove staff."));
        }
        throw new Error(getApiErrorMessage(json, "Failed to remove staff member"));
      }

      toast.success("Staff member removed from this institution.");
      setRemovingUser(null);
      fetchStaff();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setRemoveLoading(false);
    }
  }, [
    accessToken,
    authHeader,
    canDeleteStaff,
    currentUser?.id,
    fetchStaff,
    handleAuthError,
    removingUser,
  ]);

  const handleChangeEmploymentStatus = useCallback(
    async (user: User, status: string) => {
      if (!accessToken) return;
      try {
        const res = await fetch(`/api/admin/users/employment-status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify({
            userId: user.id,
            employmentStatus: status,
          }),
        });
        const json = await readJsonResponse(res);
        if (!res.ok) {
          throw new Error(getApiErrorMessage(json, "Failed to update employment status"));
        }
        toast.success(`Employment status changed to ${status.replace("_", " ")}`);
        fetchStaff();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err));
      }
    },
    [accessToken, authHeader, fetchStaff]
  );

  const handleToggleShowInTeam = useCallback(
    async (user: User, showInTeam: boolean) => {
      if (!accessToken) return;
      try {
        const res = await fetch(`/api/admin/users/team-status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify({
            userId: user.id,
            showInTeam,
          }),
        });
        const json = await readJsonResponse(res);
        if (!res.ok) {
          throw new Error(getApiErrorMessage(json, "Failed to update team status"));
        }
        toast.success(showInTeam ? `${user.full_name} is now shown in Team` : `${user.full_name} removed from Team`);
        fetchStaff();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err));
      }
    },
    [accessToken, authHeader, fetchStaff]
  );

  const [bulkGenerating, setBulkGenerating] = useState(false);

  const handleBulkGeneratePasswords = useCallback(
    async (selectedRows: User[]) => {
      if (!selectedRows || selectedRows.length === 0 || !accessToken) return;
      setBulkGenerating(true);
      const toastId = toast.loading(`Generating credentials for ${selectedRows.length} staff members...`);
      try {
        const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
        let updatedCount = 0;

        await Promise.all(
          selectedRows.map(async (u) => {
            let rand = "";
            for (let i = 0; i < 8; i++) {
              rand += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const generated = `EduBird#${rand}`;

            const res = await fetch(`/api/admin/users/password?id=${u.id}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                password: generated,
                confirmPassword: generated,
              }),
            });
            if (res.ok) updatedCount++;
          })
        );

        toast.success(`Successfully generated passwords for ${updatedCount} staff members!`, { id: toastId });
        fetchStaff();
      } catch (err: any) {
        toast.error(err.message || "Failed to generate bulk passwords", { id: toastId });
      } finally {
        setBulkGenerating(false);
      }
    },
    [accessToken, fetchStaff]
  );

  const handleCopySelectedCredentials = useCallback(
    (selectedRows: User[]) => {
      if (!selectedRows || selectedRows.length === 0) return;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const portalUrl = `${origin}/login`;

      const lines = selectedRows.map((u, i) => {
        const pass = u.generated_password || "Pending generation";
        const roleStr = (u.roles || []).join(", ") || "Staff";
        const phoneStr = u.phone ? ` | Phone: ${u.phone}` : "";
        return `${i + 1}. ${u.full_name} (${roleStr})
   Email: ${u.email}${phoneStr}
   Password: ${pass}`;
      });

      const fullSummary = `EduBird Staff Portal Login Credentials (${selectedRows.length} members):
Portal URL: ${portalUrl}

${lines.join("\n\n")}`;

      navigator.clipboard.writeText(fullSummary);
      toast.success(`Copied login credentials for ${selectedRows.length} staff members!`);
    },
    []
  );

  const columns = useMemo(
    () =>
      buildUserColumns({
        currentUserId: currentUser?.id,
        onViewProfile: handleViewProfile,
        onEditUser: handleEditUser,
        onManageSalaryAccount: (user) => {
          setSalaryAccountUser(user);
          setSalaryAccountOpen(true);
        },
        onManageCommission: (user) => {
          setCommissionUser(user);
          setCommissionOpen(true);
        },
        onViewDocuments: (user) => {
          setDocumentsUser(user);
          setDocumentsOpen(true);
        },
        onViewSalaryRecords: (user) => {
          setSalaryRecordsUser(user);
          setSalaryRecordsOpen(true);
        },
        onViewSalarySlips: (user) => {
          setSalarySlipsUser(user);
          setSalarySlipsOpen(true);
        },
        onViewAttendance: (user) => {
          setAttendanceUser(user);
          setAttendanceOpen(true);
        },
        onViewPerformance: (user) => {
          setPerformanceUser(user);
          setPerformanceOpen(true);
        },
        onGeneratePassword: (user) => {
          setPasswordUser(user);
          setPasswordDialogOpen(true);
        },
        onChangeEmploymentStatus: handleChangeEmploymentStatus,
        onToggleShowInTeam: handleToggleShowInTeam,
        onRemoveUser: (user) => {
          if (currentUser?.id && user.id === currentUser.id) {
            toast.error("You cannot remove your own account.");
            return;
          }
          setRemovingUser(user);
        },
        removalLabel: "Remove staff member",
        entityLabel: "Staff member",
        basePrefix: typeof window !== "undefined" && window.location.pathname.startsWith("/platformadmin") ? "/platformadmin" : "/admin",
      }),
    [handleChangeEmploymentStatus, handleToggleShowInTeam, handleEditUser, handleViewProfile, currentUser?.id]
  );

  if (loading && !hasLoadedStaff) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="mb-2 h-8 w-44" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Staff</h1>
          <p className="text-muted-foreground">Manage staff, faculty, and administrative profiles for your institution.</p>
        </div>
        <AddUserDialog
          roles={roles}
          accessToken={accessToken}
          onSaved={handleCreated}
          createPermission="managestaff.allstaff.create"
          createLabel="Add Staff"
          entityLabel="Staff member"
          submitUrl="/api/admin/users?staffScope=all"
          preferredInstitution={activeInstitution}
        />
      </div>

      <DataTable
        columns={columns}
        data={staff}
        totalRows={totalRows}
        toolbarLeft={
          <>
            <DebouncedSearchInput
              value={filters.search}
              onValueChange={(search) => updateFilters({ ...filters, search })}
              placeholder="Filter by name, email, phone..."
              className="w-full sm:w-80"
            />
            <StaffFiltersDrawer
              filters={filters}
              roles={roles}
              activeCount={activeFilterCount}
              onApply={updateFilters}
              onReset={resetFilters}
            />
          </>
        }
        manualPagination
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        loading={loading}
        selectedActions={(selectedRows, resetSelection) => (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground mr-1">
              {selectedRows.length} staff selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkGeneratePasswords(selectedRows)}
              disabled={bulkGenerating}
              className="h-8 text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer shadow-2xs"
            >
              {bulkGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Generate Passwords ({selectedRows.length})
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCopySelectedCredentials(selectedRows)}
              className="h-8 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Credentials
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetSelection}
              className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Deselect
            </Button>
          </div>
        )}
      />

      <UserProfileSheet
        user={viewingUser}
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setViewingUser(null);
        }}
      />

      <SalaryAccountDialog
        user={salaryAccountUser}
        open={salaryAccountOpen}
        onOpenChange={(open) => {
          setSalaryAccountOpen(open);
          if (!open) setSalaryAccountUser(null);
        }}
        accessToken={accessToken}
        onSaved={fetchStaff}
      />

      <StaffCommissionDialog
        open={commissionOpen}
        onOpenChange={(open) => {
          setCommissionOpen(open);
          if (!open) setCommissionUser(null);
        }}
        staffUser={commissionUser}
        accessToken={accessToken}
        onSaved={fetchStaff}
      />

      <StaffDocumentsDialog
        open={documentsOpen}
        onOpenChange={(open) => {
          setDocumentsOpen(open);
          if (!open) setDocumentsUser(null);
        }}
        staffUser={documentsUser}
        accessToken={accessToken}
      />

      <StaffSalaryDialog
        open={salaryRecordsOpen}
        onOpenChange={(open) => {
          setSalaryRecordsOpen(open);
          if (!open) setSalaryRecordsUser(null);
        }}
        staffUser={salaryRecordsUser}
        accessToken={accessToken}
      />

      <StaffSalarySlipsDialog
        open={salarySlipsOpen}
        onOpenChange={(open) => {
          setSalarySlipsOpen(open);
          if (!open) setSalarySlipsUser(null);
        }}
        staffUser={salarySlipsUser}
        accessToken={accessToken}
      />

      <StaffAttendanceDialog
        open={attendanceOpen}
        onOpenChange={(open) => {
          setAttendanceOpen(open);
          if (!open) setAttendanceUser(null);
        }}
        staffUser={attendanceUser}
        accessToken={accessToken}
      />

      <StaffPerformanceDialog
        open={performanceOpen}
        onOpenChange={(open) => {
          setPerformanceOpen(open);
          if (!open) setPerformanceUser(null);
        }}
        staffUser={performanceUser}
        accessToken={accessToken}
      />

      {editingUser && (
        <AddUserDialog
          key={`edit-staff-${editingUser.id}`}
          mode="edit"
          user={editingUser}
          roles={roles}
          accessToken={accessToken}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditingUser(null);
          }}
          onSaved={() => {
            setEditingUser(null);
            setEditOpen(false);
            fetchStaff();
          }}
          createPermission="managestaff.allstaff.create"
          createLabel="Add Staff"
          entityLabel="Staff member"
          preferredInstitution={activeInstitution}
        />
      )}

      <AlertDialog
        open={Boolean(removingUser)}
        onOpenChange={(open) => {
          if (!open && !removeLoading) setRemovingUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this staff member from your institution?</AlertDialogTitle>
            <AlertDialogDescription>
              This only removes the staff member from the institution you manage. The account stays in the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeLoading}
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                handleRemoveUser();
              }}
            >
              {removeLoading ? "Working..." : "Remove staff member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserPasswordDialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          setPasswordDialogOpen(open);
          if (!open) {
            setPasswordUser(null);
            fetchStaff();
          }
        }}
        user={passwordUser}
        accessToken={accessToken}
        onSaved={fetchStaff}
      />
    </div>
  );
}
