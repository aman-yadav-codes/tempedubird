"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PaginationState } from "@tanstack/react-table";
import { Repeat2 } from "lucide-react";
import { toast } from "sonner";

import { DebouncedSearchInput } from "@/components/shared/debounced-search-input";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useActiveAcademicYearId } from "@/hooks/use-active-academic-year-id";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getApiErrorMessage,
  readJsonResponse,
} from "@/lib/auth/client-permission-errors";
import type { AdminUserDetails } from "@/lib/queries/user";
import { UserProfileSheet } from "@/app/admin/users/user-profile-sheet";
import {
  AddStudentDialog,
  type RoleOption,
  type StudentRecordsResponse,
} from "./add-student-dialog";
import { buildStudentColumns, type Student } from "./columns";
import { usePersistedState } from "@/hooks/use-persisted-state";
import {
  getDefaultStudentFilters,
  isStudentFilters,
  StudentFiltersDrawer,
  type StudentFilters,
} from "./_components/student-filters-drawer";
import { BulkPromotionDialog } from "./_components/bulk-promotion-dialog";
import { StudentGuardiansDialog } from "./_components/student-guardians-dialog";
import { StudentPromotionsDialog } from "./_components/student-promotions-dialog";
import { StudentPasswordDialog } from "./_components/student-password-dialog";
import { StudentAssignClassDialog } from "./_components/student-assign-class-dialog";

type StudentDetailsWithRecords = AdminUserDetails & {
  student_records?: StudentRecordsResponse | null;
};

function scopeToStudentContext(
  details: StudentDetailsWithRecords,
  institutionId?: number,
): StudentDetailsWithRecords {
  const studentInstitutions = details.institutions.filter((institution) => {
    if (institution.role_code !== "student") return false;
    return institutionId ? institution.id === institutionId : true;
  });
  const primaryInstitution = studentInstitutions[0] ?? null;

  return {
    ...details,
    role_id: primaryInstitution?.role_id ?? details.role_id,
    roles: details.roles.includes("Student") ? ["Student"] : details.roles,
    profile: {
      ...details.profile,
      is_teacher: false,
      teacher_type: null,
      under_institution_id:
        primaryInstitution?.id ?? details.profile.under_institution_id,
      under_institution_name:
        primaryInstitution?.name ?? details.profile.under_institution_name,
      membership_role_id:
        primaryInstitution?.role_id ?? details.profile.membership_role_id,
    },
    institutions: studentInstitutions,
  };
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export default function AllStudentsPage() {
  const router = useRouter();
  const { accessToken, clearAuth, user: currentUser } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const activeAcademicYearId = useActiveAcademicYearId(activeInstitution?.id);
  const [students, setStudents] = useState<Student[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [viewingStudent, setViewingStudent] =
    useState<StudentDetailsWithRecords | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [actionLoadingStudentId, setActionLoadingStudentId] = useState<
    number | null
  >(null);
  const [editingStudent, setEditingStudent] =
    useState<StudentDetailsWithRecords | null>(null);
  const [removingStudent, setRemovingStudent] = useState<Student | null>(null);
  const [guardiansModalStudent, setGuardiansModalStudent] = useState<Student | null>(null);
  const [guardiansModalOpen, setGuardiansModalOpen] = useState(false);
  const [promotionsModalStudent, setPromotionsModalStudent] = useState<Student | null>(null);
  const [promotionsModalOpen, setPromotionsModalOpen] = useState(false);
  const [passwordModalStudent, setPasswordModalStudent] = useState<Student | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [assignClassModalStudent, setAssignClassModalStudent] = useState<Student | null>(null);
  const [assignClassModalOpen, setAssignClassModalOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasLoadedStudents, setHasLoadedStudents] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [bulkPromotionOpen, setBulkPromotionOpen] = useState(false);
  const [bulkPromotionStudents, setBulkPromotionStudents] = useState<Student[]>([]);
  const bulkPromotionResetRef = useRef<(() => void) | null>(null);
  const [pageCount, setPageCount] = useState(-1);
  const [totalRows, setTotalRows] = useState(0);
  const [filters, setFilters] = usePersistedState<StudentFilters>(
    "admin.students.filters",
    getDefaultStudentFilters,
    { version: 1, validate: isStudentFilters },
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const fetchStudentsRequestIdRef = useRef(0);
  const fetchStudentsAbortRef = useRef<AbortController | null>(null);

  const authHeader = useCallback(
    () => ({
      Authorization: `Bearer ${accessToken}`,
    }),
    [accessToken],
  );

  const handleAuthError = useCallback(() => {
    clearAuth();
    toast.error("Session expired. Please log in again.");
    router.push("/");
  }, [clearAuth, router]);

  const fetchStudents = useCallback(async () => {
    if (!accessToken) return;

    const requestId = ++fetchStudentsRequestIdRef.current;
    fetchStudentsAbortRef.current?.abort();
    const abortController = new AbortController();
    fetchStudentsAbortRef.current = abortController;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (filters.search?.trim()) params.set("search", filters.search.trim());
      if (filters.programId) params.set("programId", filters.programId);
      if (filters.sectionId) params.set("sectionId", filters.sectionId);
      if (activeAcademicYearId) params.set("academicYearId", String(activeAcademicYearId));
      if (activeInstitution) {
        params.set("institutionId", String(activeInstitution.id));
      }

      const res = await fetch(`/api/admin/students?${params.toString()}`, {
        headers: authHeader(),
        signal: abortController.signal,
      });
      if (requestId !== fetchStudentsRequestIdRef.current) return;
      const json = await readJsonResponse(res);

      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        if (res.status === 403) {
          throw new Error(
            getApiErrorMessage(
              json,
              "You don't have permission to view students.",
            ),
          );
        }
        throw new Error(getApiErrorMessage(json, "Failed to fetch students"));
      }

      if (requestId !== fetchStudentsRequestIdRef.current) return;
      let fetchedList: Student[] = json.data ?? [];

      if (typeof window !== "undefined") {
        try {
          const draftRaw = window.sessionStorage.getItem("progressive_draft:student:new");
          if (draftRaw) {
            const draftData = JSON.parse(draftRaw);
            if (draftData.full_name || draftData.email) {
              const draftStudent: Student = {
                id: -999,
                full_name: draftData.full_name || "Unsaved Student Draft",
                email: draftData.email || "draft@progressive.local",
                phone: draftData.phone || null,
                is_active: false,
                is_verified: false,
                status: "Draft",
                created_at: new Date().toISOString(),
                institutions: [],
                program_name: "Draft Student Record",
                section_name: "In Progress",
              };
              fetchedList = [draftStudent, ...fetchedList.filter((s) => s.id !== -999)];
            }
          }
        } catch {
          // ignore draft storage parse error
        }
      }

      setStudents(fetchedList);
      setPageCount(json.pageCount ?? -1);
      setTotalRows(Number(json.total ?? 0));
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (requestId !== fetchStudentsRequestIdRef.current) return;
      toast.error(getErrorMessage(err));
    } finally {
      if (requestId === fetchStudentsRequestIdRef.current) {
        setLoading(false);
        setHasLoadedStudents(true);
        fetchStudentsAbortRef.current = null;
      }
    }
  }, [
    accessToken,
    activeInstitution,
    activeAcademicYearId,
    authHeader,
    filters,
    handleAuthError,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPagination((prev) =>
        prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
      );
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [
    activeInstitution?.id,
    activeAcademicYearId,
    filters.academicYearId,
    filters.programId,
    filters.search,
    filters.sectionId,
  ]);

  const fetchStudentRoles = useCallback(async () => {
    if (!accessToken) return;

    try {
      const params = new URLSearchParams({
        type: "institutionRoles",
        search: "student",
        page: "1",
        limit: "50",
        context: "student-management",
      });
      const res = await fetch(
        `/api/admin/access/options?${params.toString()}`,
        {
          headers: authHeader(),
        },
      );
      const json = await readJsonResponse(res);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) return;
        throw new Error(
          getApiErrorMessage(json, "Failed to fetch student role"),
        );
      }

      setRoles(
        (json.data ?? []).filter((role: RoleOption) => role.code === "student"),
      );
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  }, [accessToken, authHeader]);

  const fetchStudentDetails = useCallback(
    async (
      studentId: number,
      includeStudentRecords = false,
      forbiddenMessage = "You don't have permission to view this student.",
    ) => {
      if (!accessToken) return null;

      try {
        const params = new URLSearchParams({ id: String(studentId) });
        if (includeStudentRecords) {
          params.set("includeStudentRecords", "true");
        }

        const res = await fetch(
          `/api/admin/users/detail?${params.toString()}`,
          {
            headers: authHeader(),
          },
        );
        const json = await readJsonResponse(res);

        if (!res.ok) {
          if (res.status === 401) {
            handleAuthError();
            return null;
          }
          if (res.status === 403) {
            throw new Error(getApiErrorMessage(json, forbiddenMessage));
          }
          throw new Error(
            getApiErrorMessage(json, "Failed to load student profile"),
          );
        }

        return json.data as StudentDetailsWithRecords;
      } catch (err: unknown) {
        toast.error(getErrorMessage(err));
        return null;
      }
    },
    [accessToken, authHeader, handleAuthError],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchStudents();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fetchStudents]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchStudentRoles();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [fetchStudentRoles]);

  const handleStudentCreated = () => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem("progressive_draft:student:new");
      } catch {
        // ignore storage error
      }
    }
    if (pagination.pageIndex === 0) {
      fetchStudents();
      return;
    }

    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  };

  const handleViewProfile = useCallback(
    async (student: Student) => {
      if (student.id < 0) {
        setCreateOpen(true);
        return;
      }
      setActionLoadingStudentId(student.id);
      setViewingStudent(null);
      setViewLoading(true);
      setViewOpen(true);
      try {
        const details = await fetchStudentDetails(
          student.id,
          true,
          "You don't have permission to view this student.",
        );
        if (details)
          setViewingStudent(
            scopeToStudentContext(details, activeInstitution?.id),
          );
        else setViewOpen(false);
      } finally {
        setViewLoading(false);
        setActionLoadingStudentId(null);
      }
    },
    [activeInstitution?.id, fetchStudentDetails],
  );

  const canEditStudents = hasPermission(
    currentUser,
    "managestudents.allstudents.edit",
  );
  const canDeleteStudents = hasPermission(
    currentUser,
    "managestudents.allstudents.delete",
  );

  const handleEditStudent = useCallback(
    async (student: Student) => {
      if (!canEditStudents) {
        toast.error("You don't have permission to edit students.");
        return;
      }

      if (student.id < 0) {
        setCreateOpen(true);
        return;
      }

      setActionLoadingStudentId(student.id);
      try {
        const details = await fetchStudentDetails(
          student.id,
          true,
          "You don't have permission to edit students.",
        );
        if (!details) return;

        setEditingStudent(
          scopeToStudentContext(details, activeInstitution?.id),
        );
        setEditOpen(true);
      } finally {
        setActionLoadingStudentId(null);
      }
    },
    [activeInstitution?.id, canEditStudents, fetchStudentDetails],
  );

  const isPlatformAdmin = Boolean(
    currentUser?.is_super_admin ||
    currentUser?.role_codes?.includes("platform_admin"),
  );
  const removalLabel = isPlatformAdmin
    ? "Delete student"
    : "Remove from institution";

  const updateFilters = useCallback((nextFilters: StudentFilters) => {
    setFilters(nextFilters);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [setFilters]);

  const resetFilters = useCallback(() => {
    setFilters((current) => ({
      ...getDefaultStudentFilters(),
      search: current.search,
    }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [setFilters]);

  const activeFilterCount = useMemo(
    () => [
      filters.programId,
      filters.sectionId,
      filters.academicYearId,
    ].filter(Boolean).length,
    [filters.academicYearId, filters.programId, filters.sectionId],
  );

  const canBatchPromote = Boolean(
    activeInstitution?.id &&
    filters.programId &&
    filters.academicYearId &&
    canEditStudents,
  );

  const handleRemoveStudent = useCallback(async () => {
    if (!accessToken || !removingStudent) return;
    if (!canDeleteStudents) {
      toast.error("You don't have permission to delete students.");
      setRemovingStudent(null);
      return;
    }

    setRemoveLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users/detail?id=${removingStudent.id}`,
        {
          method: "DELETE",
          headers: authHeader(),
        },
      );
      const json = await readJsonResponse(res);

      if (!res.ok) {
        if (res.status === 401) {
          handleAuthError();
          return;
        }
        if (res.status === 403) {
          throw new Error(
            getApiErrorMessage(
              json,
              "You don't have permission to delete students.",
            ),
          );
        }
        throw new Error(
          getApiErrorMessage(json, "Failed to update student access"),
        );
      }

      toast.success(
        json.data?.action === "soft_deleted"
          ? "Student deleted."
          : "Student removed from this institution.",
      );
      setRemovingStudent(null);
      fetchStudents();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setRemoveLoading(false);
    }
  }, [
    accessToken,
    authHeader,
    canDeleteStudents,
    fetchStudents,
    handleAuthError,
    removingStudent,
  ]);

  const studentColumns = useMemo(
    () =>
      buildStudentColumns({
        onViewProfile: handleViewProfile,
        onEditStudent: handleEditStudent,
        onRemoveStudent: (st) => {
          if (st.id < 0) {
            if (typeof window !== "undefined") {
              try {
                window.sessionStorage.removeItem("progressive_draft:student:new");
              } catch {
                // ignore
              }
            }
            fetchStudents();
            toast.success("Draft student record cleared.");
            return;
          }
          setRemovingStudent(st);
        },
        onAssignClass: (st) => {
          if (st.id < 0) {
            setCreateOpen(true);
            return;
          }
          setAssignClassModalStudent(st);
          setAssignClassModalOpen(true);
        },
        onManageGuardians: (st) => {
          if (st.id < 0) {
            setCreateOpen(true);
            return;
          }
          setGuardiansModalStudent(st);
          setGuardiansModalOpen(true);
        },
        onManagePromotions: (st) => {
          if (st.id < 0) {
            setCreateOpen(true);
            return;
          }
          setPromotionsModalStudent(st);
          setPromotionsModalOpen(true);
        },
        onSetPassword: (st) => {
          if (st.id < 0) {
            setCreateOpen(true);
            return;
          }
          setPasswordModalStudent(st);
          setPasswordModalOpen(true);
        },
        removalLabel,
        loadingStudentId: actionLoadingStudentId,
      }),
    [
      actionLoadingStudentId,
      fetchStudents,
      handleEditStudent,
      handleViewProfile,
      removalLabel,
    ],
  );

  if (loading && !hasLoadedStudents) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="mb-2 h-8 w-40" />
            <Skeleton className="h-4 w-72" />
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
          <h1 className="text-2xl font-bold tracking-tight">All Students</h1>
          <p className="text-muted-foreground">
            Manage student profiles, enrollments, and academic records.
          </p>
        </div>
        <AddStudentDialog
          roles={roles}
          accessToken={accessToken}
          onSaved={handleStudentCreated}
          preferredInstitution={activeInstitution}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      </div>

      <DataTable
        columns={studentColumns}
        data={students}
        totalRows={totalRows}
        toolbarLeft={
          <>
            <DebouncedSearchInput
              value={filters.search}
              onValueChange={(search) => updateFilters({ ...filters, search })}
              placeholder="Search name, ID, roll, email..."
              className="w-full sm:w-80"
            />
            <StudentFiltersDrawer
              filters={filters}
              activeCount={activeFilterCount}
              accessToken={accessToken}
              institutionId={activeInstitution?.id}
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
        onRowClick={handleViewProfile}
        selectionResetKey={`${filters.programId}:${filters.sectionId}:${filters.academicYearId}:${pagination.pageIndex}:${pagination.pageSize}`}
        selectedActions={(selectedRows, resetSelection) => (
          <Button
            type="button"
            size="sm"
            disabled={!canBatchPromote}
            onClick={() => {
              bulkPromotionResetRef.current = resetSelection;
              setBulkPromotionStudents(selectedRows);
              setBulkPromotionOpen(true);
            }}
          >
            <Repeat2 className="size-4" />
            Bulk Promote
          </Button>
        )}
      />

      <BulkPromotionDialog
        open={bulkPromotionOpen}
        onOpenChange={setBulkPromotionOpen}
        accessToken={accessToken}
        institutionId={activeInstitution?.id}
        filters={filters}
        selectedStudents={bulkPromotionStudents}
        onPromoted={() => {
          bulkPromotionResetRef.current?.();
          setBulkPromotionStudents([]);
          fetchStudents();
        }}
      />

      <StudentGuardiansDialog
        open={guardiansModalOpen}
        onOpenChange={setGuardiansModalOpen}
        student={guardiansModalStudent}
        accessToken={accessToken}
      />

      <StudentPromotionsDialog
        open={promotionsModalOpen}
        onOpenChange={setPromotionsModalOpen}
        student={promotionsModalStudent}
        accessToken={accessToken}
        institutionId={activeInstitution?.id}
        onPromotedSuccess={() => fetchStudents()}
      />

      <StudentPasswordDialog
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
        student={passwordModalStudent}
        accessToken={accessToken}
      />

      <StudentAssignClassDialog
        open={assignClassModalOpen}
        onOpenChange={setAssignClassModalOpen}
        student={assignClassModalStudent}
        accessToken={accessToken}
        institutionId={activeInstitution?.id}
        onAssignedSuccess={() => fetchStudents()}
      />

      <UserProfileSheet
        user={viewingStudent}
        studentRecords={viewingStudent?.student_records ?? null}
        loading={viewLoading}
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) {
            setViewingStudent(null);
            setViewLoading(false);
          }
        }}
      />

      {editingStudent && (
        <AddStudentDialog
          mode="edit"
          user={editingStudent}
          initialStudentRecords={editingStudent.student_records ?? null}
          roles={roles}
          accessToken={accessToken}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditingStudent(null);
          }}
          onSaved={() => {
            setEditingStudent(null);
            setEditOpen(false);
            fetchStudents();
          }}
          preferredInstitution={activeInstitution}
        />
      )}

      <AlertDialog
        open={Boolean(removingStudent)}
        onOpenChange={(open) => {
          if (!open && !removeLoading) setRemovingStudent(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPlatformAdmin
                ? "Delete this student?"
                : "Remove this student from your institution?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPlatformAdmin
                ? "This will soft delete the student account and hide it from active admin lists."
                : "This only removes the student from the institution you manage. The student account stays in the system."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={removeLoading}
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                handleRemoveStudent();
              }}
            >
              {removeLoading ? "Working..." : removalLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
