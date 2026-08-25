"use client"

import { DataTable } from "@/components/ui/data-table"
import { buildUserColumns, User } from "./columns"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAuthStore } from "@/store"
import { getApiErrorMessage, readJsonResponse } from "@/lib/auth/client-permission-errors"
import { hasPermission } from "@/lib/auth/permissions"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { PaginationState } from "@tanstack/react-table"
import { AddUserDialog, RoleOption } from "./add-user-dialog"
import { UserProfileSheet } from "./user-profile-sheet"
import { UserPasswordDialog } from "./_components/user-password-dialog"
import type { AdminUserDetails } from "@/lib/queries/user"
import { Loader2 } from "lucide-react"
import {
  getDefaultUserFilters,
  isUserFilters,
  UserFiltersDrawer,
  type UserFilters,
} from "./_components/user-filters-drawer"
import { usePersistedState } from "@/hooks/use-persisted-state"
import { DebouncedSearchInput } from "@/components/shared/debounced-search-input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong"
}

export default function UsersPage() {
  const router = useRouter()
  const { accessToken, clearAuth, user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [viewingUser, setViewingUser] = useState<AdminUserDetails | null>(null)
  const [editingUser, setEditingUser] = useState<AdminUserDetails | null>(null)
  const [removingUser, setRemovingUser] = useState<User | null>(null)
  const [passwordUser, setPasswordUser] = useState<User | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasLoadedUsers, setHasLoadedUsers] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<User[]>([])
  const [pageCount, setPageCount] = useState(-1)
  const [totalRows, setTotalRows] = useState(0)
  const [filters, setFilters] = usePersistedState<UserFilters>(
    "admin.users.filters",
    getDefaultUserFilters,
    { version: 1, validate: isUserFilters }
  )
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const bulkResetSelectionRef = useRef<(() => void) | null>(null)
  const fetchUsersRequestIdRef = useRef(0)
  const fetchUsersAbortRef = useRef<AbortController | null>(null)

  const authHeader = useCallback(() => ({
    Authorization: `Bearer ${accessToken}`,
  }), [accessToken])

  const handleAuthError = useCallback(() => {
    clearAuth()
    toast.error("Session expired. Please log in again.")
    router.push("/")
  }, [clearAuth, router])

  const fetchUsers = useCallback(async () => {
    if (!accessToken) return

    const requestId = ++fetchUsersRequestIdRef.current
    fetchUsersAbortRef.current?.abort()
    const abortController = new AbortController()
    fetchUsersAbortRef.current = abortController
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      })
      if (filters.search.trim()) params.set("search", filters.search.trim())
      if (filters.institutionId) params.set("institutionId", filters.institutionId)
      if (filters.roleId !== "all") params.set("roleId", filters.roleId)
      if (filters.status !== "all") params.set("status", filters.status)

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: authHeader(),
        signal: abortController.signal,
      })
      if (requestId !== fetchUsersRequestIdRef.current) return
      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError()
          return
        }
        if (res.status === 403) {
          const json = await readJsonResponse(res)
          throw new Error(getApiErrorMessage(json, "You don't have permission to view users."))
        }
        const json = await readJsonResponse(res)
        throw new Error(getApiErrorMessage(json, "Failed to fetch users"))
      }
      const responseData = await res.json()
      if (requestId !== fetchUsersRequestIdRef.current) return
      setUsers(responseData.data)
      setPageCount(responseData.pageCount)
      setTotalRows(Number(responseData.total ?? 0))
    } catch (err: unknown) {
      if (requestId !== fetchUsersRequestIdRef.current) return
      toast.error(getErrorMessage(err))
    } finally {
      if (requestId === fetchUsersRequestIdRef.current) {
        setLoading(false)
        setHasLoadedUsers(true)
        fetchUsersAbortRef.current = null
      }
    }
  }, [
    accessToken,
    authHeader,
    handleAuthError,
    filters,
    pagination.pageIndex,
    pagination.pageSize,
  ])

  const fetchRoles = useCallback(async () => {
    if (!accessToken) return

    try {
      const res = await fetch("/api/admin/roles", {
        headers: authHeader(),
      })
      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError()
          return
        }
        if (res.status === 403) return
        const json = await readJsonResponse(res)
        throw new Error(getApiErrorMessage(json, "Failed to fetch roles"))
      }
      const responseData = await res.json()
      setRoles(responseData.data)
    } catch (err: unknown) {
      toast.error(getErrorMessage(err))
    }
  }, [accessToken, authHeader, handleAuthError])

  const fetchUserDetails = useCallback(async (userId: number) => {
    if (!accessToken) return null

    try {
      const res = await fetch(`/api/admin/users/detail?id=${userId}`, {
        headers: authHeader(),
      })
      const json = await readJsonResponse(res)

      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError()
          return null
        }
        if (res.status === 403) {
          throw new Error(getApiErrorMessage(json, "You don't have permission to view this user."))
        }
        throw new Error(getApiErrorMessage(json, "Failed to load user profile"))
      }

      return json.data as AdminUserDetails
    } catch (err: unknown) {
      toast.error(getErrorMessage(err))
      return null
    }
  }, [accessToken, authHeader, handleAuthError])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchUsers()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [fetchUsers])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchRoles()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [fetchRoles])

  const handleUserCreated = () => {
    if (pagination.pageIndex === 0) {
      fetchUsers()
      return
    }

    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }))
  }

  const handleViewProfile = useCallback(async (user: User) => {
    setViewingUser(null)
    setViewOpen(true)
    setViewLoading(true)

    const details = await fetchUserDetails(user.id)
    if (details) {
      setViewingUser(details)
    }
    setViewLoading(false)
  }, [fetchUserDetails])

  const canEditUsers = hasPermission(currentUser, "users.allusers.edit")
  const canDeleteUsers = hasPermission(currentUser, "users.allusers.delete")

  const handleEditUser = useCallback(async (user: User) => {
    if (!canEditUsers) {
      toast.error("You don't have permission to edit users.")
      return
    }

    const details = await fetchUserDetails(user.id)
    if (!details) return

    setEditingUser(details)
    setEditOpen(true)
  }, [canEditUsers, fetchUserDetails])

  const isPlatformAdmin = Boolean(
    currentUser?.is_super_admin || currentUser?.role_codes?.includes("platform_admin")
  )
  const removalLabel = isPlatformAdmin ? "Delete user" : "Remove from institution"
  const activeFilterCount = useMemo(
    () => [
      filters.institutionId,
      filters.search.trim(),
      filters.roleId !== "all" ? filters.roleId : "",
      filters.status !== "all" ? filters.status : "",
    ].filter(Boolean).length,
    [filters]
  )

  const applyFilters = useCallback((nextFilters: UserFilters) => {
    setFilters(nextFilters)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [setFilters])

  const resetFilters = useCallback(() => {
    setFilters(getDefaultUserFilters())
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [setFilters])

  const handleRemoveUser = useCallback(async () => {
    if (!accessToken || !removingUser) return
    if (!canDeleteUsers) {
      toast.error("You don't have permission to delete users.")
      setRemovingUser(null)
      return
    }

    setRemoveLoading(true)
    try {
      const res = await fetch(`/api/admin/users/detail?id=${removingUser.id}`, {
        method: "DELETE",
        headers: authHeader(),
      })
      const json = await readJsonResponse(res)

      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError()
          return
        }
        if (res.status === 403) {
          throw new Error(getApiErrorMessage(json, "You don't have permission to delete users."))
        }
        throw new Error(getApiErrorMessage(json, "Failed to update user access"))
      }

      toast.success(
        json.data?.action === "soft_deleted"
          ? "User deleted."
          : "User removed from this institution."
      )
      setRemovingUser(null)
      fetchUsers()
    } catch (err: unknown) {
      toast.error(getErrorMessage(err))
    } finally {
      setRemoveLoading(false)
    }
  }, [accessToken, authHeader, canDeleteUsers, fetchUsers, handleAuthError, removingUser])

  const handleBulkStatus = useCallback(async (
    selectedRows: User[],
    isActive: boolean,
    resetSelection: () => void
  ) => {
    if (!accessToken) return
    if (!canEditUsers) {
      toast.error("You don't have permission to edit users.")
      return
    }

    setBulkLoading(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedRows.map((user) => user.id),
          isActive,
        }),
      })
      const json = await readJsonResponse(res)

      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError()
          return
        }
        if (res.status === 403) {
          throw new Error(getApiErrorMessage(json, "You don't have permission to edit users."))
        }
        throw new Error(getApiErrorMessage(json, "Failed to update selected users"))
      }

      toast.success(
        `${selectedRows.length} user${selectedRows.length === 1 ? "" : "s"} ${isActive ? "activated" : "disabled"}.`
      )
      resetSelection()
      fetchUsers()
    } catch (err: unknown) {
      toast.error(getErrorMessage(err))
    } finally {
      setBulkLoading(false)
    }
  }, [accessToken, authHeader, canEditUsers, fetchUsers, handleAuthError])

  const handleBulkRemoveUsers = useCallback(async () => {
    if (!accessToken || bulkDeleteTargets.length === 0) return
    if (!canDeleteUsers) {
      toast.error("You don't have permission to delete users.")
      setBulkDeleteTargets([])
      return
    }

    setBulkLoading(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: bulkDeleteTargets.map((user) => user.id),
        }),
      })
      const json = await readJsonResponse(res)

      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError()
          return
        }
        if (res.status === 403) {
          throw new Error(getApiErrorMessage(json, "You don't have permission to delete users."))
        }
        throw new Error(getApiErrorMessage(json, "Failed to update selected user access"))
      }

      toast.success(
        json.data?.action === "soft_deleted"
          ? `${bulkDeleteTargets.length} user${bulkDeleteTargets.length === 1 ? "" : "s"} deleted.`
          : `${bulkDeleteTargets.length} user${bulkDeleteTargets.length === 1 ? "" : "s"} removed from your institution.`
      )
      setBulkDeleteTargets([])
      bulkResetSelectionRef.current?.()
      fetchUsers()
    } catch (err: unknown) {
      toast.error(getErrorMessage(err))
    } finally {
      setBulkLoading(false)
    }
  }, [accessToken, authHeader, bulkDeleteTargets, canDeleteUsers, fetchUsers, handleAuthError])

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
        fetchUsers();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err));
      }
    },
    [accessToken, authHeader, fetchUsers]
  );

  const userColumns = useMemo(
    () =>
      buildUserColumns({
        onViewProfile: handleViewProfile,
        onEditUser: handleEditUser,
        onChangeEmploymentStatus: handleChangeEmploymentStatus,
        onGeneratePassword: (user) => {
          setPasswordUser(user)
          setPasswordDialogOpen(true)
        },
        onRemoveUser: setRemovingUser,
        removalLabel,
      }),
    [handleChangeEmploymentStatus, handleEditUser, handleViewProfile, removalLabel]
  )

  if (loading && !hasLoadedUsers) {
    return <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-md" />
    </div>
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage platform users and their roles.</p>
        </div>
        <AddUserDialog
          roles={roles}
          accessToken={accessToken}
          onSaved={handleUserCreated}
        />
      </div>

      <DataTable 
        columns={userColumns} 
        data={users} 
        totalRows={totalRows}
        toolbarLeft={
          <>
            <DebouncedSearchInput
              value={filters.search}
              onValueChange={(search) => applyFilters({ ...filters, search })}
              placeholder="Filter by name, email, phone..."
              className="w-full sm:w-80"
            />
            <UserFiltersDrawer
              filters={filters}
              roles={roles}
              activeCount={activeFilterCount}
              accessToken={accessToken}
              onApply={applyFilters}
              onReset={resetFilters}
            />
          </>
        }
        manualPagination={true}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        onRowClick={handleViewProfile}
        loading={loading}
        selectedActions={
          canEditUsers || canDeleteUsers
            ? (selectedRows, resetSelection) => (
                <>
                  {canEditUsers && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={bulkLoading}
                        onClick={() => handleBulkStatus(selectedRows, true, resetSelection)}
                      >
                        {bulkLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                        Activate
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={bulkLoading}
                        onClick={() => handleBulkStatus(selectedRows, false, resetSelection)}
                      >
                        Disable
                      </Button>
                    </>
                  )}
                  {canDeleteUsers && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={bulkLoading}
                      onClick={() => {
                        bulkResetSelectionRef.current = resetSelection
                        setBulkDeleteTargets(selectedRows)
                      }}
                    >
                      {removalLabel}
                    </Button>
                  )}
                </>
              )
            : undefined
        }
      />

      <UserProfileSheet
        user={viewingUser}
        loading={viewLoading}
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open)
          if (!open) {
            setViewingUser(null)
            setViewLoading(false)
          }
        }}
      />

      {editingUser && (
        <AddUserDialog
          mode="edit"
          user={editingUser}
          roles={roles}
          accessToken={accessToken}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) setEditingUser(null)
          }}
          onSaved={() => {
            setEditingUser(null)
            setEditOpen(false)
            fetchUsers()
          }}
        />
      )}

      <AlertDialog
        open={Boolean(removingUser)}
        onOpenChange={(open) => {
          if (!open && !removeLoading) setRemovingUser(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPlatformAdmin ? "Delete this user?" : "Remove this user from your institution?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPlatformAdmin
                ? "This will soft delete the user account and hide it from active admin lists."
                : "This only removes the user from the institution you manage. The user account stays in the system."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={removeLoading}
              variant="destructive"
              onClick={(event) => {
                event.preventDefault()
                handleRemoveUser()
              }}
            >
              {removeLoading ? "Working..." : removalLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkDeleteTargets.length > 0}
        onOpenChange={(open) => {
          if (!open && !bulkLoading) setBulkDeleteTargets([])
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPlatformAdmin
                ? `Delete ${bulkDeleteTargets.length} selected user${bulkDeleteTargets.length === 1 ? "" : "s"}?`
                : `Remove ${bulkDeleteTargets.length} selected user${bulkDeleteTargets.length === 1 ? "" : "s"} from your institution?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPlatformAdmin
                ? "This will soft delete the selected user accounts and hide them from active admin lists."
                : "This only removes the selected users from the institution you manage. Their accounts stay in the system."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkLoading}
              variant="destructive"
              onClick={(event) => {
                event.preventDefault()
                handleBulkRemoveUsers()
              }}
            >
              {bulkLoading ? "Working..." : removalLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserPasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        user={passwordUser}
        accessToken={accessToken}
      />
    </div>
  );
}
