"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BadgeDollarSign,
  Briefcase,
  FileText,
  GraduationCap,
  Lock,
  Loader2,
  Plus,
  UserPlus,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useProgressiveSave } from "@/hooks/use-progressive-save";
import { ProgressiveSaveIndicator } from "@/components/shared/progressive-save-indicator";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddStudentDialog } from "@/app/admin/students/add-student-dialog";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  GoogleLocationPicker,
} from "@/components/shared/google-location-picker";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { DocumentFileUpload, type UploadedDocumentFile } from "@/components/shared/document-file-upload";
import { ImageUploader } from "@/components/shared/image-uploader";
import { useAuthStore } from "@/store";
import { getApiErrorMessage } from "@/lib/auth/client-permission-errors";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { capitalize } from "@/lib/utils/capitalize";
import {
  NO_GENDER,
  TEACHER_TYPE_OPTIONS,
  steps,
} from "@/lib/utils/user-form.constants";
import {
  blankCertification,
  blankEducation,
  blankExperience,
  blankSalaryComponent,
  blankUserDocument,
  getInitialForm,
  hasAnyValue,
  normalizeEmail,
  normalizeNullableText,
  normalizeText,
  safeTrim,
} from "@/lib/utils/user-form.helpers";
import type { AdminUserDetails } from "@/lib/queries/user";
import { CertificationCard } from "@/app/admin/users/_components/certification-card";
import { EducationCard } from "@/app/admin/users/_components/education-card";
import { ExperienceCard } from "@/app/admin/users/_components/experience-card";
import { FieldError } from "@/app/admin/users/_components/field-error";
import { FormSection } from "@/app/admin/users/_components/form-section";
import { HelpPopover } from "@/app/admin/users/_components/help-popover";
import { ReviewCard } from "@/app/admin/users/_components/review-card";
import { TeacherSection } from "@/app/admin/users/_components/teacher-section";
import type {
  AddUserForm,
  CertificationForm,
  DesignationOption,
  EducationForm,
  ExperienceForm,
  InstitutionOption,
  RoleOption,
  TeachingOption,
  UserDocumentForm,
} from "@/app/admin/users/_components/types";

export type { RoleOption } from "@/app/admin/users/_components/types";

type AddUserDialogProps = {
  roles: RoleOption[];
  accessToken: string | null;
  onSaved: () => void;
  mode?: "create" | "edit";
  user?: AdminUserDetails | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  createPermission?: string;
  createLabel?: string;
  entityLabel?: string;
  submitUrl?: string;
  preferredInstitution?: {
    id: number;
    name: string;
    boardId?: number | null;
  } | null;
};

const DUPLICATE_EMAIL_MESSAGE = "Email address already in use.";

function isGooglePlacesTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest(".pac-container"));
}

function toInstitutionSelectOption(institution: Pick<InstitutionOption, "id" | "name" | "slug">) {
  return {
    value: String(institution.id),
    label: institution.name,
    description: institution.slug,
  };
}

function getDocumentFiles(document: UserDocumentForm): UploadedDocumentFile[] {
  return Array.isArray(document.files) ? document.files : [];
}

export function AddUserDialog({
  roles,
  accessToken,
  onSaved,
  mode = "create",
  user = null,
  open: controlledOpen,
  onOpenChange,
  createPermission = "users.allusers.create",
  createLabel = "Add User",
  entityLabel = "User",
  submitUrl = "/api/admin/users",
  preferredInstitution = null,
}: AddUserDialogProps) {
  const { user: currentUser } = useAuthStore();
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const actualOpen = isControlled ? controlledOpen : internalOpen;
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<AddUserForm>(() => getInitialForm(roles, user));
  const [passwordForm, setPasswordForm] = useState({ password: "", confirmPassword: "" });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const tabScrollerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [tabScrollHints, setTabScrollHints] = useState({ left: false, right: false });
  const isEdit = mode === "edit";
  const canCreateUsers = hasPermission(currentUser, createPermission);
  const selectedRole = useMemo(
    () => roles.find((role) => String(role.id) === form.role_id),
    [roles, form.role_id]
  );
  const selectedRoleIsInstitutionScoped = selectedRole?.scope_code === "institution";
  const selectedRoleIsTeacher = selectedRole?.code === "teacher";
  const selectedRoleIsStaff = selectedRole?.code === "teacher" || selectedRole?.code === "driver";
  const selectedRoleIsGuest = selectedRole?.code === "guest";
  const selectedRoleCanHaveDesignation = selectedRole?.code === "institution_admin";
  const showAccountInstitution = selectedRoleIsInstitutionScoped && !selectedRoleIsTeacher;
  const currentUserIsPlatformAdmin = Boolean(
    currentUser?.is_super_admin ||
    currentUser?.role_codes?.includes("platform_admin") ||
    currentUser?.roles?.includes("Platform Admin")
  );
  const lockInstitutionToPreferred = Boolean(
    preferredInstitution &&
    selectedRoleIsInstitutionScoped &&
    !currentUserIsPlatformAdmin
  );
  const showInstitutionMultiSelect = Boolean(
    showAccountInstitution &&
    currentUserIsPlatformAdmin &&
    selectedRole?.code === "institution_admin"
  );
  const showInstitutionSingleSelect = showAccountInstitution && !showInstitutionMultiSelect;
  const showAccountDesignation = selectedRoleCanHaveDesignation;
  const showHourlyCharges = selectedRoleIsTeacher && form.teacher_type === "individual_teacher";
  const canAssignRoles = Boolean(
    currentUserIsPlatformAdmin ||
    currentUser?.roles?.includes("Institution Admin")
  );
function getRoleDisplay(role: RoleOption) {
  const code = (role.code || "").toLowerCase();
  const name = (role.name || "").toLowerCase();

  if (code === "student" || name.includes("student")) return { label: "Student", icon: "🎓" };
  if (code === "teacher" || name.includes("teacher")) return { label: "Teacher", icon: "👨‍🏫" };
  if (code === "school_owner" || name.includes("school")) return { label: "School Owner", icon: "🏫" };
  if (code === "college_owner" || name.includes("college")) return { label: "College Owner", icon: "🏛️" };
  if (code === "university_owner" || name.includes("university")) return { label: "University Owner", icon: "🎓" };
  if (code === "library_owner" || name.includes("library")) return { label: "Library Owner", icon: "📚" };
  if (code === "pg_owner" || name.includes("pg")) return { label: "PG Owner", icon: "🏠" };
  if (code === "parent" || code === "guardian" || name.includes("parent") || name.includes("guardian")) return { label: "Guardian / Parent", icon: "👨‍👩‍👧" };
  if (code === "institution_admin" || name.includes("institution admin")) return { label: "Institution Owner / Admin", icon: "🏫" };
  if (code === "platform_admin" || name.includes("platform admin")) return { label: "Platform Admin", icon: "🛡️" };
  return { label: role.name, icon: "👤" };
}

  const showRoleAssignment = canAssignRoles && roles.length > 0;
  const showAdminControls = canAssignRoles;
  const showSecurityStep = false;
  const editUserId = user?.id;
  const userFormKey = `user:${isEdit ? editUserId ?? "edit" : "new"}`;
  const { saveStatus, handleBlur } = useProgressiveSave({
    formKey: userFormKey,
    formState: form,
    enabled: actualOpen,
  });

  const dialogSteps = useMemo(
    () => [
      { label: "Account Details", icon: UserRound },
      { label: "Background & Education", icon: Briefcase },
      { label: "Upload Documents", icon: FileText },
    ],
    []
  );
  const documentsStepIndex = 2;
  const salaryStepIndex = -1;
  const securityStepIndex = -1;
  const reviewStepIndex = -1;
  const isLastStep = activeStep === dialogSteps.length - 1;

  const checkEmailAvailability = useCallback(async () => {
    if (!actualOpen || !accessToken) return;

    const email = normalizeEmail(form.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    const params = new URLSearchParams({ email });
    if (isEdit && editUserId) {
      params.set("excludeUserId", String(editUserId));
    }

    try {
      const res = await fetch(`/api/admin/users/email-check?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;

      const json = await res.json();
      setErrors((prev) => {
        if (json.exists) {
          return { ...prev, email: DUPLICATE_EMAIL_MESSAGE };
        }

        if (prev.email === DUPLICATE_EMAIL_MESSAGE) {
          return { ...prev, email: "" };
        }

        return prev;
      });
    } catch {
      setErrors((prev) => prev);
    }
  }, [accessToken, actualOpen, editUserId, form.email, isEdit]);

  const applyPreferredInstitution = useCallback((nextForm: AddUserForm) => {
    if (!preferredInstitution || currentUserIsPlatformAdmin) return nextForm;

    const role = roles.find((item) => String(item.id) === nextForm.role_id);
    if (role?.scope_code !== "institution") return nextForm;

    const institutionId = String(preferredInstitution.id);

    return {
      ...nextForm,
      under_institution_id: institutionId,
      under_institution_name: preferredInstitution.name,
      institution_ids: [institutionId],
    };
  }, [currentUserIsPlatformAdmin, preferredInstitution, roles]);

  const updateTabScrollHints = useCallback(() => {
    const scroller = tabScrollerRef.current;
    if (!scroller) return;

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    setTabScrollHints({
      left: scroller.scrollLeft > 4,
      right: scroller.scrollLeft < maxScrollLeft - 4,
    });
  }, []);

  useEffect(() => {
    if (!actualOpen) return;

    const activeTab = tabRefs.current[activeStep];
    activeTab?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });

    const timeout = window.setTimeout(updateTabScrollHints, 220);
    return () => window.clearTimeout(timeout);
  }, [activeStep, actualOpen, updateTabScrollHints]);

  useEffect(() => {
    if (!actualOpen) return;

    updateTabScrollHints();
    window.addEventListener("resize", updateTabScrollHints);
    return () => window.removeEventListener("resize", updateTabScrollHints);
  }, [actualOpen, dialogSteps.length, updateTabScrollHints]);

  useEffect(() => {
    if (selectedRoleCanHaveDesignation) {
      return;
    }

    if (form.designation_id || form.designation_name) {
      const timeout = window.setTimeout(() => {
        setForm((prev) => ({
          ...prev,
          designation_id: "",
          designation_name: "",
        }));
      }, 0);

      return () => window.clearTimeout(timeout);
    }
  }, [
    form.designation_id,
    form.designation_name,
    selectedRoleCanHaveDesignation,
  ]);

  useEffect(() => {
    if (selectedRoleIsTeacher || showAccountInstitution) {
      return;
    }

    if (
      form.teacher_type ||
      form.under_institution_id ||
      form.under_institution_name ||
      form.institution_ids.length > 0 ||
      form.teaching_categories.length > 0 ||
      form.teaching_subjects.length > 0
    ) {
      const timeout = window.setTimeout(() => {
        setForm((prev) => ({
          ...prev,
          is_teacher: false,
          teacher_type: "",
          under_institution_id: "",
          under_institution_name: "",
          institution_ids: [],
          teaching_categories: [],
          teaching_subjects: [],
        }));
      }, 0);

      return () => window.clearTimeout(timeout);
    }
  }, [
    form.teacher_type,
    form.teaching_categories.length,
    form.teaching_subjects.length,
    form.under_institution_id,
    form.under_institution_name,
    form.institution_ids.length,
    showAccountInstitution,
    selectedRoleIsTeacher,
  ]);

  useEffect(() => {
    if (!selectedRoleIsTeacher || form.teacher_type === "institute_teacher" || showAccountInstitution) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setForm((prev) => ({
        ...prev,
        teacher_type: "institute_teacher",
        hourly_charges: "",
      }));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [
    selectedRoleIsTeacher,
    form.teacher_type,
    showAccountInstitution,
  ]);

  const initialTeachingCategoryOptions = useMemo(
    () =>
      user?.teaching_categories.map((category) => ({
        id: category.id,
        value: String(category.id),
        label: category.name,
      })) ?? [],
    [user]
  );

  const initialTeachingSubjectOptions = useMemo(
    () =>
      user?.teaching_subjects.map((subject) => ({
        id: subject.id,
        value: String(subject.id),
        label: subject.name,
      })) ?? [],
    [user]
  );

  const [teachingCategoryOptions, setTeachingCategoryOptions] = useState<TeachingOption[]>(
    initialTeachingCategoryOptions
  );
  const [teachingSubjectOptionsCache, setTeachingSubjectOptionsCache] = useState<TeachingOption[]>(
    initialTeachingSubjectOptions
  );
  const [institutionOptionsCache, setInstitutionOptionsCache] = useState(
    () =>
      user?.institutions.map((institution) => ({
        value: String(institution.id),
        label: institution.name,
      })) ?? []
  );
  const [teachingCategoryLoading, setTeachingCategoryLoading] = useState(false);
  const [teachingSubjectLoading, setTeachingSubjectLoading] = useState(false);
  const [teachingSubjectScopeLoading, setTeachingSubjectScopeLoading] = useState(false);
  const [selectedInstitutionBoardId, setSelectedInstitutionBoardId] = useState<number | null>(
    user?.profile.under_institution_board_id ?? null
  );
  const [teachingCategoryError, setTeachingCategoryError] = useState<string | null>(null);
  const [teachingSubjectError, setTeachingSubjectError] = useState<string | null>(null);
  const selectedCategoryIds = useMemo(
    () => form.teaching_categories.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0),
    [form.teaching_categories]
  );

  const selectedInstitutionOptions = useMemo(() => {
    const optionMap = new Map<string, { value: string; label: string; description?: string }>();
    for (const option of institutionOptionsCache) {
      optionMap.set(option.value, option);
    }
    if (form.under_institution_id && form.under_institution_name) {
      optionMap.set(form.under_institution_id, {
        value: form.under_institution_id,
        label: form.under_institution_name,
      });
    }
    return form.institution_ids
      .map((value) => optionMap.get(value) ?? { value, label: `Institution ${value}` })
      .filter((option) => Boolean(option));
  }, [
    form.institution_ids,
    form.under_institution_id,
    form.under_institution_name,
    institutionOptionsCache,
  ]);

  const selectedTeachingCategoryOptions = useMemo(() => {
    const optionMap = new Map<string, TeachingOption>();

    for (const option of [...initialTeachingCategoryOptions, ...teachingCategoryOptions]) {
      optionMap.set(option.value, option);
    }

    return form.teaching_categories
      .map((value) => optionMap.get(value))
      .filter((option): option is TeachingOption => Boolean(option));
  }, [form.teaching_categories, initialTeachingCategoryOptions, teachingCategoryOptions]);

  const selectedTeachingSubjectOptions = useMemo(() => {
    const optionMap = new Map<string, TeachingOption>();
    const labelSet = new Set<string>();
    const nextOptions: TeachingOption[] = [];

    for (const option of [...initialTeachingSubjectOptions, ...teachingSubjectOptionsCache]) {
      optionMap.set(option.value, option);
    }

    for (const value of form.teaching_subjects) {
      const option = optionMap.get(value);
      if (!option) continue;
      const key = option.label.trim().toLowerCase();
      if (labelSet.has(key)) continue;
      labelSet.add(key);
      nextOptions.push(option);
    }

    return nextOptions;
  }, [form.teaching_subjects, initialTeachingSubjectOptions, teachingSubjectOptionsCache]);

  const dedupeTeachingSubjectOptions = useCallback((options: TeachingOption[]) => {
    const next = new Map<string, TeachingOption>();
    for (const option of options) {
      const key = option.label.trim().toLowerCase();
      if (!next.has(key)) next.set(key, option);
    }
    return Array.from(next.values());
  }, []);

  const fetchTeachingCategories = useCallback(
    async (search: string, page: number) => {
      if (!accessToken) {
        return { data: [], hasMore: false };
      }

      setTeachingCategoryLoading(true);
      setTeachingCategoryError(null);

      try {
        const res = await fetch(
          `/api/admin/categories?page=${page}&limit=15&search=${encodeURIComponent(search)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error("Failed to load categories");
        }

        const json = await res.json();
        const options = (json.data ?? []).map((item: { id: number; name: string; parent_name?: string | null; depth?: number }) => ({
          id: item.id,
          value: String(item.id),
          label: item.parent_name ? `${item.name} (${item.parent_name})` : item.name,
        }));

        setTeachingCategoryOptions((prev) => {
          const next = new Map(prev.map((option) => [option.value, option] as const));
          for (const option of options) next.set(option.value, option);
          return Array.from(next.values());
        });

        return { data: options, hasMore: page < (json.pageCount ?? page) };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load categories";
        setTeachingCategoryError(message);
        toast.error(message);
        return { data: [], hasMore: false };
      } finally {
        setTeachingCategoryLoading(false);
      }
    },
    [accessToken]
  );

  const fetchTeachingSubjects = useCallback(
    async (search: string, page: number) => {
      if (
        !accessToken ||
        selectedCategoryIds.length === 0 ||
        (form.under_institution_id && !selectedInstitutionBoardId)
      ) {
        return { data: [], hasMore: false };
      }

      setTeachingSubjectLoading(true);
      setTeachingSubjectError(null);

      try {
        const params = new URLSearchParams({
          type: "subject",
          search,
          page: String(page),
          limit: "15",
          categoryIds: selectedCategoryIds.join(","),
        });
        if (selectedInstitutionBoardId) {
          params.set("boardId", String(selectedInstitutionBoardId));
        }

        const res = await fetch(`/api/admin/categories/tree/search?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load subjects");
        }

        const json = await res.json();
        const options = dedupeTeachingSubjectOptions((json.data ?? []).map((item: { id: number; name: string }) => ({
          id: item.id,
          value: String(item.id),
          label: item.name,
        })));

        setTeachingSubjectOptionsCache((prev) => {
          const next = new Map(prev.map((option) => [option.value, option] as const));
          for (const option of options) next.set(option.value, option);
          return dedupeTeachingSubjectOptions(Array.from(next.values()));
        });

        return { data: options, hasMore: page < (json.pageCount ?? page) };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load subjects";
        setTeachingSubjectError(message);
        toast.error(message);
        return { data: [], hasMore: false };
      } finally {
        setTeachingSubjectLoading(false);
      }
    },
    [accessToken, dedupeTeachingSubjectOptions, form.under_institution_id, selectedCategoryIds, selectedInstitutionBoardId]
  );

  const fetchInstitutions = useCallback(
    async (search: string, page: number) => {
      if (!accessToken) {
        return { data: [], hasMore: false };
      }

      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: "10",
        isActive: "true",
      });

      const res = await fetch(`/api/admin/institutions/profiles?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch institutions");
      }

      const json = await res.json();
      return {
        data: (json.data ?? []) as InstitutionOption[],
        hasMore: page < (json.pageCount ?? page),
      };
    },
    [accessToken]
  );

  const fetchInstitutionMultiOptions = useCallback(
    async (search: string, page: number) => {
      const result = await fetchInstitutions(search, page);
      const options = result.data.map(toInstitutionSelectOption);
      setInstitutionOptionsCache((current) => {
        const next = new Map(current.map((option) => [option.value, option]));
        for (const option of options) {
          next.set(option.value, option);
        }
        return Array.from(next.values());
      });
      return { data: options, hasMore: result.hasMore };
    },
    [fetchInstitutions, setInstitutionOptionsCache]
  );

  const fetchDesignations = useCallback(
    async (search: string, page: number) => {
      if (!accessToken) {
        return { data: [], hasMore: false };
      }

      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: "10",
      });

      const res = await fetch(`/api/admin/master-data/designations?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch designations");
      }

      const json = await res.json();
      return {
        data: (json.data ?? []) as DesignationOption[],
        hasMore: page < (json.pageCount ?? page),
      };
    },
    [accessToken]
  );

  useEffect(() => {
    if (!actualOpen) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setTeachingCategoryOptions(initialTeachingCategoryOptions);
      setTeachingSubjectOptionsCache(initialTeachingSubjectOptions);
      setTeachingCategoryError(null);
      setTeachingSubjectError(null);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [actualOpen, initialTeachingCategoryOptions, initialTeachingSubjectOptions]);

  useEffect(() => {
    if (!actualOpen || !accessToken) {
      return;
    }

    if (form.under_institution_id && !selectedInstitutionBoardId) {
      const timeout = window.setTimeout(() => {
        setForm((prev) =>
          prev.teaching_subjects.length === 0
            ? prev
            : { ...prev, teaching_subjects: [] }
        );
      }, 0);

      return () => window.clearTimeout(timeout);
    }

    if (selectedCategoryIds.length === 0) {
      const timeout = window.setTimeout(() => {
        setForm((prev) =>
          prev.teaching_subjects.length === 0
            ? prev
            : { ...prev, teaching_subjects: [] }
        );
      }, 0);

      return () => window.clearTimeout(timeout);
    }

    let cancelled = false;

    const loadAllowedSubjects = async () => {
      setTeachingSubjectScopeLoading(true);

      try {
        const params = new URLSearchParams({
          type: "subject",
          search: "",
          page: "1",
          limit: "1000",
          categoryIds: selectedCategoryIds.join(","),
        });
        if (selectedInstitutionBoardId) {
          params.set("boardId", String(selectedInstitutionBoardId));
        }

        const res = await fetch(`/api/admin/categories/tree/search?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load subjects for selected categories");
        }

        const json = await res.json();
        const nextAllowed = new Set<string>();
        const options = (json.data ?? []).map((item: { id: number; name: string; breadcrumb?: string }) => {
          const value = String(item.id);
          nextAllowed.add(value);
          return {
            id: item.id,
            value,
            label: item.name,
            description: item.breadcrumb || undefined,
          };
        });

        if (cancelled) {
          return;
        }

        setTeachingSubjectOptionsCache((prev) => {
          const next = new Map(prev.map((option) => [option.value, option] as const));
          for (const option of options) next.set(option.value, option);
          return Array.from(next.values());
        });

        setForm((prev) => {
          const nextSubjects = prev.teaching_subjects.filter((subjectId) => nextAllowed.has(subjectId));
          if (nextSubjects.length === prev.teaching_subjects.length) {
            return prev;
          }

          return {
            ...prev,
            teaching_subjects: nextSubjects,
          };
        });
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load subjects";
          setTeachingSubjectError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setTeachingSubjectScopeLoading(false);
        }
      }
    };

    loadAllowedSubjects();

    return () => {
      cancelled = true;
    };
  }, [accessToken, actualOpen, form.under_institution_id, selectedCategoryIds, selectedInstitutionBoardId]);

  useEffect(() => {
    if (!actualOpen || !accessToken || !form.under_institution_id || selectedInstitutionBoardId) {
      return;
    }

    let cancelled = false;

    const loadInstitutionBoard = async () => {
      const params = new URLSearchParams({
        institutionId: form.under_institution_id,
        page: "1",
        limit: "1",
        isActive: "true",
      });

      try {
        const res = await fetch(`/api/admin/institutions/profiles?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          return;
        }

        const json = await res.json();
        const institution = Array.isArray(json.data) ? json.data[0] : null;
        const boardId = Number(institution?.board_id ?? institution?.boardId);
        if (!cancelled && Number.isInteger(boardId) && boardId > 0) {
          setSelectedInstitutionBoardId(boardId);
        }
      } catch {
        // Keep the subject list closed until the board can be resolved.
      }
    };

    loadInstitutionBoard();

    return () => {
      cancelled = true;
    };
  }, [accessToken, actualOpen, form.under_institution_id, selectedInstitutionBoardId]);

  const updateForm = <Key extends keyof AddUserForm>(
    key: Key,
    value: AddUserForm[Key]
  ) => {
    if (key === "email") {
      setErrors((prev) => (
        prev.email === DUPLICATE_EMAIL_MESSAGE
          ? { ...prev, email: "" }
          : prev
      ));
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setActiveStep(0);
    setErrors({});
    setPasswordErrors({});
    setPasswordForm({ password: "", confirmPassword: "" });
    setForm(applyPreferredInstitution(getInitialForm(roles, user)));
    setSelectedInstitutionBoardId(
      preferredInstitution?.boardId ??
        user?.profile.under_institution_board_id ??
        null
    );
  };

  const setDialogOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  useEffect(() => {
    if (!actualOpen) return;

    const timeout = window.setTimeout(() => {
      setActiveStep(0);
      setErrors({});
      setPasswordErrors({});
      setPasswordForm({ password: "", confirmPassword: "" });
      setForm(applyPreferredInstitution(getInitialForm(roles, user)));
      setSelectedInstitutionBoardId(
        preferredInstitution?.boardId ??
          user?.profile.under_institution_board_id ??
          null
      );
      setInstitutionOptionsCache(
        [
          ...(user?.institutions.map((institution) => ({
            value: String(institution.id),
            label: institution.name,
          })) ?? []),
          ...(preferredInstitution
            ? [{
              value: String(preferredInstitution.id),
              label: preferredInstitution.name,
            }]
            : []),
        ]
      );
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [actualOpen, applyPreferredInstitution, preferredInstitution, roles, user]);

  useEffect(() => {
    if (!actualOpen || !user) {
      return;
    }

    const teachingCategories = user.teaching_categories.map((category) => String(category.id));
    const teachingSubjects = user.teaching_subjects.map((subject) => String(subject.id));
    const enforcedPreferredInstitution = preferredInstitution && !currentUserIsPlatformAdmin
      ? preferredInstitution
      : null;
    const preferredInstitutionId = enforcedPreferredInstitution ? String(enforcedPreferredInstitution.id) : "";
    const preferredInstitutionName = enforcedPreferredInstitution?.name ?? "";
    const institutionIds = preferredInstitutionId
      ? [preferredInstitutionId]
      : user.institutions.length
      ? user.institutions.map((institution) => String(institution.id))
      : user.profile.under_institution_id
        ? [String(user.profile.under_institution_id)]
        : [];

    const timeout = window.setTimeout(() => {
      setForm((prev) => ({
        ...prev,
        is_teacher: user.profile.is_teacher ?? false,
        teacher_type: user.profile.teacher_type ?? "",
        under_institution_id: preferredInstitutionId || (user.profile.under_institution_id
          ? String(user.profile.under_institution_id)
          : ""),
        under_institution_name: preferredInstitutionName || (user.profile.under_institution_name ?? ""),
        institution_ids: institutionIds,
        designation_id: user.profile.designation_id
          ? String(user.profile.designation_id)
          : "",
        designation_name: user.profile.designation_name ?? "",
        teaching_categories: teachingCategories,
        teaching_subjects: teachingSubjects,
      }));
      setInstitutionOptionsCache(
        enforcedPreferredInstitution
          ? [{
            value: String(enforcedPreferredInstitution.id),
            label: enforcedPreferredInstitution.name,
          }]
          : user.institutions.length
          ? user.institutions.map((institution) => ({
            value: String(institution.id),
            label: institution.name,
          }))
          : user.profile.under_institution_id && user.profile.under_institution_name
            ? [{
              value: String(user.profile.under_institution_id),
              label: user.profile.under_institution_name,
            }]
            : []
      );
      setSelectedInstitutionBoardId(enforcedPreferredInstitution?.boardId ?? user.profile.under_institution_board_id ?? null);

      setTeachingCategoryOptions(
        user.teaching_categories.map((category) => ({
          id: category.id,
          value: String(category.id),
          label: category.name,
        }))
      );

      setTeachingSubjectOptionsCache(
        user.teaching_subjects.map((subject) => ({
          id: subject.id,
          value: String(subject.id),
          label: subject.name,
          description: subject.breadcrumb || undefined,
        }))
      );
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [actualOpen, currentUserIsPlatformAdmin, preferredInstitution, user]);

  const validateStep = (stepIndex: number) => {
    const nextErrors: Record<string, string> = {};

    if (stepIndex === 0) {
      if (safeTrim(form.full_name).length < 2) {
        nextErrors.full_name = "Enter the full name.";
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeTrim(form.email))) {
        nextErrors.email = "Enter a valid email.";
      } else if (errors.email === DUPLICATE_EMAIL_MESSAGE) {
        nextErrors.email = DUPLICATE_EMAIL_MESSAGE;
      }

      if (safeTrim(form.phone)) {
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(safeTrim(form.phone))) {
          nextErrors.phone = "Phone number must be exactly 10 digits.";
        }
      }

      if (safeTrim(form.avatar_url)) {
        try {
          new URL(safeTrim(form.avatar_url));
        } catch {
          nextErrors.avatar_url = "Enter a valid image URL.";
        }
      }

      if (showAccountInstitution && form.institution_ids.length === 0) {
        nextErrors.under_institution_id = "Select at least one institution for this role.";
      }

    }

    if (stepIndex === 1) {
      if (selectedRoleIsTeacher && safeTrim(form.about).length === 0) {
        nextErrors.about = "Enter a short profile summary.";
      }

      if (selectedRoleIsTeacher && (!form.gender || form.gender === NO_GENDER)) {
        nextErrors.gender = "Select a gender.";
      }

      if (
        showHourlyCharges &&
        safeTrim(form.hourly_charges) &&
        Number.isNaN(Number(form.hourly_charges))
      ) {
        nextErrors.hourly_charges = "Enter a valid amount.";
      }

      if (
        selectedRoleIsTeacher &&
        form.teacher_type === "institute_teacher" &&
        !form.under_institution_id
      ) {
        nextErrors.under_institution_id = "Select an institution.";
      }
      if (selectedRole?.code === "institution_admin" && !form.designation_id) {
        nextErrors.designation_id = "Select a designation for this role.";
      }
    }

    if (stepIndex === 3) {
      form.experiences.forEach((experience, index) => {
        const hasValues = hasAnyValue([
          experience.job_title,
          experience.company_name,
          experience.from_month,
          experience.from_year,
          experience.to_month,
          experience.to_year,
        ]);

        if (!hasValues) return;

        if (!safeTrim(experience.job_title)) {
          nextErrors[`experience.${index}.job_title`] = "Required.";
        }
        if (!safeTrim(experience.company_name)) {
          nextErrors[`experience.${index}.company_name`] = "Required.";
        }
        if (!experience.from_month || !experience.from_year) {
          nextErrors[`experience.${index}.from`] = "Start date is required.";
        }
        if (
          !experience.is_current &&
          (!experience.to_month || !experience.to_year)
        ) {
          nextErrors[`experience.${index}.to`] = "End date is required.";
        }
      });

      form.education.forEach((education, index) => {
        const hasValues = hasAnyValue([
          education.qualification,
          education.institution_id,
          education.institution_name,
          education.from_year,
          education.to_year,
        ]);

        if (!hasValues) return;

        if (!safeTrim(education.qualification)) {
          nextErrors[`education.${index}.qualification`] = "Required.";
        }
        if (!education.institution_id && !safeTrim(education.institution_name)) {
          nextErrors[`education.${index}.institution_id`] = "Required.";
        }
        if (!education.from_year || !education.to_year) {
          nextErrors[`education.${index}.years`] = "Years are required.";
        }
      });

      form.certifications.forEach((certification, index) => {
        const hasValues = hasAnyValue([
          certification.name,
          certification.issued_authority,
          certification.duration,
        ]);

        if (hasValues && !safeTrim(certification.name)) {
          nextErrors[`certification.${index}.name`] = "Required.";
        }

        if (hasValues && certification.duration) {
          const durationNum = Number(certification.duration);
          if (Number.isNaN(durationNum) || durationNum <= 0 || !Number.isInteger(durationNum)) {
            nextErrors[`certification.${index}.duration`] = "Enter a valid duration in months.";
          }
        }
      });
    }

    if (stepIndex === documentsStepIndex) {
      form.documents.forEach((document, index) => {
        const documentFiles = getDocumentFiles(document);
        const hasDocumentValues = hasAnyValue([
          document.document_type,
          document.document_number,
          document.file_url,
          document.public_id,
        ]) || documentFiles.length > 0;

        if (!hasDocumentValues) return;

        if (!safeTrim(document.document_type)) {
          nextErrors[`document.${index}.document_type`] = "Required.";
        }
        if (documentFiles.length === 0) {
          nextErrors[`document.${index}.files`] = "Upload at least one image.";
        }
      });
    }

    if (stepIndex === salaryStepIndex) {
      form.salary_components.forEach((component, index) => {
        const hasSalaryValues = hasAnyValue([component.label, component.amount]);
        if (!hasSalaryValues) return;

        if (!safeTrim(component.label)) {
          nextErrors[`salary.${index}.label`] = "Required.";
        }
        const amount = Number(component.amount);
        if (!safeTrim(component.amount) || Number.isNaN(amount) || amount < 0) {
          nextErrors[`salary.${index}.amount`] = "Enter a valid amount.";
        }
      });
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(activeStep)) return;
    if (isLastStep) {
      void handleSubmit();
      return;
    }
    setActiveStep((prev) => Math.min(prev + 1, dialogSteps.length - 1));
  };

  const goToStep = (targetStep: number) => {
    if (targetStep <= activeStep) {
      setActiveStep(targetStep);
      return;
    }

    for (let index = 0; index < targetStep; index += 1) {
      if (!validateStep(index)) {
        setActiveStep(index);
        return;
      }
    }

    setActiveStep(targetStep);
  };

  const buildPayload = () => {
    const compactExperiences = form.experiences.filter((experience) =>
      hasAnyValue([
        experience.job_title,
        experience.company_name,
        experience.from_month,
        experience.from_year,
        experience.to_month,
        experience.to_year,
      ])
    );
    const compactEducation = form.education.filter((education) =>
      hasAnyValue([
        education.qualification,
        education.institution_id,
        education.institution_name,
        education.from_year,
        education.to_year,
      ])
    );
    const compactCertifications = form.certifications.filter((certification) =>
      hasAnyValue([
        certification.name,
        certification.issued_authority,
        certification.duration,
      ])
    );
    const selectedInstitutionIds = showInstitutionMultiSelect
      ? form.institution_ids
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
      : (showInstitutionSingleSelect || selectedRoleIsTeacher) && form.under_institution_id
        ? [Number(form.under_institution_id)].filter((value) => Number.isInteger(value) && value > 0)
        : [];
    const primaryInstitutionId = selectedInstitutionIds[0] ?? null;

    return {
      full_name: normalizeText(form.full_name),
      email: normalizeEmail(form.email),
      phone: safeTrim(form.phone) || null,
      avatar_url: safeTrim(form.avatar_url) || null,
      role_id: form.role_id ? Number(form.role_id) : null,
      is_active: form.is_active,
      is_verified: form.is_verified,
      is_profile_complete: form.is_profile_complete,
      profile: {
        about: normalizeNullableText(form.about),
        is_teacher: selectedRoleIsTeacher,
        teacher_type: selectedRoleIsTeacher
          ? form.teacher_type || (primaryInstitutionId ? "institute_teacher" : "individual_teacher")
          : null,
        under_institution_id: primaryInstitutionId,
        institution_ids: selectedInstitutionIds,
        designation_id:
          selectedRoleCanHaveDesignation && form.designation_id
            ? Number(form.designation_id)
            : null,
        gender: form.gender === NO_GENDER ? null : normalizeText(form.gender),
        hourly_charges: showHourlyCharges && safeTrim(form.hourly_charges)
          ? Number(form.hourly_charges)
          : null,
      },
      location: form.location
        ? {
          ...form.location,
          full_address:
            safeTrim(form.full_address) || form.location.full_address || null,
        }
        : null,
      experiences: compactExperiences.map((experience) => ({
        job_title: normalizeText(experience.job_title),
        company_id: experience.company_id ? Number(experience.company_id) : null,
        company_name: normalizeText(experience.company_name),
        from_month: Number(experience.from_month),
        from_year: Number(experience.from_year),
        to_month: experience.is_current ? null : Number(experience.to_month),
        to_year: experience.is_current ? null : Number(experience.to_year),
        is_current: experience.is_current,
      })),
      education: compactEducation.map((education) => ({
        qualification: normalizeText(education.qualification),
        institution_id: education.institution_id ? Number(education.institution_id) : null,
        from_year: Number(education.from_year),
        to_year: Number(education.to_year),
      })),
      certifications: compactCertifications.map((certification) => ({
        name: normalizeText(certification.name),
        issued_authority: normalizeNullableText(certification.issued_authority),
        duration: normalizeNullableText(certification.duration),
      })),
      documents: form.documents
        .filter((document) => safeTrim(document.document_type) && getDocumentFiles(document).length > 0)
        .flatMap((document) =>
          getDocumentFiles(document).map((file) => ({
            document_type: safeTrim(document.document_type).toUpperCase(),
            document_number: safeTrim(document.document_number).toUpperCase() || null,
            file_url: file.url,
            public_id: file.publicId || null,
            resource_type: file.resourceType || null,
            is_verified: document.is_verified,
          }))
        ),
      salary_components: selectedRoleIsStaff
        ? form.salary_components
          .filter((component) => hasAnyValue([component.label, component.amount]))
          .map((component) => ({
            label: normalizeText(component.label),
            amount: Number(component.amount || 0),
          }))
        : [],
      teaching_categories: selectedRoleIsTeacher
        ? form.teaching_categories
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
        : [],
      teaching_subjects: selectedRoleIsTeacher
        ? selectedTeachingSubjectOptions
          .map((option) => Number(option.value))
          .filter((value) => Number.isInteger(value) && value > 0)
        : [],
    };
  };

  const salaryTotal = useMemo(
    () =>
      form.salary_components.reduce((total, component) => {
        const amount = Number(component.amount);
        return total + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [form.salary_components]
  );

  const handleSubmit = async () => {
    for (let index = 0; index < dialogSteps.length - 1; index += 1) {
      if (!validateStep(index)) {
        setActiveStep(index);
        return;
      }
    }

    if (!accessToken) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(isEdit && user ? `/api/admin/users/detail?id=${user.id}` : submitUrl, {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload()),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          getApiErrorMessage(
            json,
            isEdit
              ? "You don't have permission to edit users."
              : "You don't have permission to create users."
          )
        );
      }

      toast.success(isEdit ? "User updated successfully" : "User added successfully");
      setDialogOpen(false);
      resetForm();
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!accessToken || !user?.id) return;

    const nextErrors: Record<string, string> = {};
    if (passwordForm.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPasswordSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/password?id=${user.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordForm),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.issues) {
          setPasswordErrors({
            password: json.issues.password?.[0] ?? "",
            confirmPassword: json.issues.confirmPassword?.[0] ?? "",
          });
        }
        throw new Error(
          getApiErrorMessage(json, "You don't have permission to update passwords.")
        );
      }

      toast.success("Password updated");
      setPasswordForm({ password: "", confirmPassword: "" });
      setPasswordErrors({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const setExperience = (
    index: number,
    patch: Partial<ExperienceForm>
  ) => {
    setForm((prev) => ({
      ...prev,
      experiences: prev.experiences.map((experience, itemIndex) =>
        itemIndex === index ? { ...experience, ...patch } : experience
      ),
    }));
  };

  const setEducation = (index: number, patch: Partial<EducationForm>) => {
    setForm((prev) => ({
      ...prev,
      education: prev.education.map((education, itemIndex) =>
        itemIndex === index ? { ...education, ...patch } : education
      ),
    }));
  };

  const setCertification = (
    index: number,
    patch: Partial<CertificationForm>
  ) => {
    setForm((prev) => ({
      ...prev,
      certifications: prev.certifications.map((certification, itemIndex) =>
        itemIndex === index ? { ...certification, ...patch } : certification
      ),
    }));
  };

  const selectedRoleIsStudent =
    selectedRole?.code === "student" ||
    (selectedRole?.name ?? "").toLowerCase().includes("student");

  if (selectedRoleIsStudent && actualOpen) {
    return (
      <AddStudentDialog
        roles={roles}
        accessToken={accessToken}
        onSaved={() => {
          onSaved();
          setDialogOpen(false);
        }}
        mode={mode}
        user={user}
        open={actualOpen}
        onOpenChange={(nextOpen) => {
          setDialogOpen(nextOpen);
          if (!nextOpen) resetForm();
        }}
        preferredInstitution={preferredInstitution}
      />
    );
  }

  return (
    <Dialog
      open={actualOpen}
      onOpenChange={(nextOpen) => {
        setDialogOpen(nextOpen);
        if (nextOpen) {
          const defaultRole =
            roles.find((role) => role.name.toLowerCase() === "viewer") ??
            roles[0];

          setForm((prev) => ({
            ...prev,
            role_id: prev.role_id || (defaultRole ? String(defaultRole.id) : ""),
          }));
          return;
        }

        if (!submitting) resetForm();
      }}
    >
      {!isControlled && (
        <DialogTrigger asChild>
          <Button
            className="gap-2 shrink-0"
            onClick={(event) => {
              if (!canCreateUsers) {
                event.preventDefault();
                toast.error(`You don't have permission to create ${entityLabel.toLowerCase()}s.`);
              }
            }}
          >
            <UserPlus className="size-4" />
            {createLabel}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="max-h-[92vh] overflow-x-hidden overflow-y-auto sm:max-w-5xl"
        onInteractOutside={(event) => {
          if (isGooglePlacesTarget(event.target)) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          if (isGooglePlacesTarget(event.target)) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4" />
            {isEdit ? `Edit ${entityLabel}` : createLabel}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update this ${entityLabel.toLowerCase()} profile and background details.`
              : `Create a ${entityLabel.toLowerCase()} profile from the admin backend.`}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => event.preventDefault()}
          className="space-y-5 min-w-0"
        >
          <div className="relative -mx-4 px-4 pb-2 sm:mx-0 sm:px-0">
            {tabScrollHints.left && (
              <div className="pointer-events-none absolute left-1 top-0 z-10 flex h-12 items-center">
                <span className="grid size-7 animate-pulse place-items-center rounded-full border bg-background/90 text-muted-foreground shadow">
                  <ChevronLeft className="size-4" />
                </span>
              </div>
            )}
            {tabScrollHints.right && (
              <div className="pointer-events-none absolute right-1 top-0 z-10 flex h-12 items-center">
                <span className="grid size-7 animate-pulse place-items-center rounded-full border bg-background/90 text-primary shadow">
                  <ChevronRight className="size-4" />
                </span>
              </div>
            )}
            <div
              ref={tabScrollerRef}
              onScroll={updateTabScrollHints}
              className="overflow-x-auto overscroll-x-contain scroll-smooth"
            >
              <ol className="flex min-w-max gap-2">
            {dialogSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === index;
                const isComplete = activeStep > index;

                return (
                  <li key={step.label} className="w-46 shrink-0 sm:w-48">
                    <button
                      ref={(node) => {
                        tabRefs.current[index] = node;
                      }}
                      type="button"
                      onClick={() => goToStep(index)}
                      className={cn(
                        "flex h-12 w-full items-center gap-2 whitespace-nowrap rounded-md border px-3 text-left text-sm transition-colors",
                        isActive && "border-primary bg-primary text-primary-foreground",
                        isComplete && !isActive && "bg-muted",
                        !isActive && !isComplete && "hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-full border",
                          isActive && "border-primary-foreground/50",
                          isComplete && !isActive && "bg-background"
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="truncate font-medium">{step.label}</span>
                    </button>
                  </li>
                );
              })}
              </ol>
            </div>
          </div>

          {activeStep === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="add-user-name">Full name *</Label>
                <Input
                  id="add-user-name"
                  value={form.full_name}
                  onChange={(event) =>
                    updateForm("full_name", event.target.value)
                  }
                  placeholder="Jane Cooper"
                  autoComplete="off"
                />
                <FieldError message={errors.full_name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-user-email">Email *</Label>
                <Input
                  id="add-user-email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  onBlur={() => {
                    void checkEmailAvailability();
                  }}
                  placeholder="jane@example.com"
                  type="email"
                  autoComplete="off"
                />
                <FieldError message={errors.email} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-user-phone">Phone</Label>
                <Input
                  id="add-user-phone"
                  value={form.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                  placeholder="9876543210"
                  autoComplete="off"
                />
                <FieldError message={errors.phone} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-user-address">Address / City</Label>
                <Input
                  id="add-user-address"
                  value={form.full_address || ""}
                  onChange={(event) => updateForm("full_address", event.target.value)}
                  placeholder="Street address or city"
                  autoComplete="off"
                />
              </div>
              {showRoleAssignment && (
              <div className="space-y-1.5">
                <Label htmlFor="add-user-role">Role</Label>
                <Select
                  value={form.role_id}
                  onValueChange={(value) => {
                    const nextRole = roles.find((role) => String(role.id) === value);
                    const nextRoleIsTeacher = nextRole?.code === "teacher";
                    const nextRoleIsInstitutionScoped = nextRole?.scope_code === "institution";
                    const enforcePreferredInstitution = Boolean(
                      preferredInstitution &&
                      nextRoleIsInstitutionScoped &&
                      !currentUserIsPlatformAdmin
                    );
                    const preferredInstitutionId = enforcePreferredInstitution && preferredInstitution
                      ? String(preferredInstitution.id)
                      : "";
                    const nextRoleAllowsMultipleInstitutions =
                      currentUserIsPlatformAdmin && nextRole?.code === "institution_admin";
                    const nextRoleCanHaveDesignation =
                      nextRole?.code === "institution_admin" || nextRoleIsTeacher;
                    if (!nextRoleIsInstitutionScoped) {
                      setSelectedInstitutionBoardId(null);
                    }
                    setForm((prev) => ({
                      ...prev,
                      role_id: value,
                      is_teacher: nextRoleIsTeacher,
                      teacher_type: nextRoleIsTeacher
                        ? "institute_teacher"
                        : "",
                      ...(nextRoleIsInstitutionScoped && !nextRoleIsTeacher
                        ? {
                          institution_ids: preferredInstitutionId
                            ? [preferredInstitutionId]
                            : nextRoleAllowsMultipleInstitutions
                            ? (prev.institution_ids.length
                              ? prev.institution_ids
                              : prev.under_institution_id
                                ? [prev.under_institution_id]
                                : [])
                            : (prev.under_institution_id
                              ? [prev.under_institution_id]
                              : prev.institution_ids[0]
                                ? [prev.institution_ids[0]]
                                : []),
                          under_institution_id: preferredInstitutionId || prev.under_institution_id || prev.institution_ids[0] || "",
                          under_institution_name: preferredInstitutionId && preferredInstitution
                            ? preferredInstitution.name
                            : prev.under_institution_name,
                          designation_id: nextRoleCanHaveDesignation ? prev.designation_id : "",
                          designation_name: nextRoleCanHaveDesignation ? prev.designation_name : "",
                          teaching_categories: [],
                          teaching_subjects: [],
                          hourly_charges: "",
                        }
                        : {
                          institution_ids: [],
                          under_institution_id: nextRoleIsTeacher
                            ? preferredInstitutionId || prev.under_institution_id
                            : "",
                          under_institution_name: nextRoleIsTeacher
                            ? (preferredInstitutionId && preferredInstitution
                              ? preferredInstitution.name
                              : prev.under_institution_name)
                            : "",
                          ...(!nextRoleIsTeacher
                            ? {
                              designation_id: "",
                              designation_name: "",
                              teaching_categories: [],
                              teaching_subjects: [],
                              hourly_charges: "",
                            }
                            : {}),
                        }),
                    }));
                  }}
                >
                  <SelectTrigger id="add-user-role" className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => {
                      const display = getRoleDisplay(role);
                      return (
                        <SelectItem key={role.id} value={String(role.id)}>
                          <span className="flex items-center gap-2">
                            <span className="text-base">{display.icon}</span>
                            <span className="font-medium">{display.label}</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedRoleIsGuest && (
                  <p className="text-xs text-muted-foreground">
                    Guest is a temporary role for users whose institution has not been
                    created yet. It has no institution or admin permissions and can be
                    changed to Institution Admin later.
                  </p>
                )}
              </div>
              )}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="add-user-about" className="text-xs font-semibold">About Staff / Bio</Label>
                <Textarea
                  id="add-user-about"
                  value={form.about || ""}
                  onChange={(e) => updateForm("about", e.target.value)}
                  placeholder="Brief background, bio summary, or introduction about this staff member..."
                  rows={2}
                  className="text-xs font-medium resize-none"
                />
              </div>

              {/* Compact Avatar Image Upload */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold">Avatar Image</Label>
                <div className="flex items-center gap-3 p-2 border rounded-md bg-slate-50/50">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="Avatar" className="h-10 w-10 rounded-full object-cover border border-slate-200" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-slate-200 border border-slate-300 grid place-items-center text-xs font-black text-slate-600">
                      {form.full_name?.slice(0, 2)?.toUpperCase() || "AV"}
                    </div>
                  )}
                  <Input
                    type="text"
                    placeholder="Paste image URL or upload URL..."
                    value={form.avatar_url || ""}
                    onChange={(e) => updateForm("avatar_url", e.target.value)}
                    className="h-9 text-xs flex-1 bg-white"
                  />
                </div>
                <FieldError message={errors.avatar_url} />
              </div>

              {showAdminControls && (
              <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                <div className="flex h-12 items-center gap-3 rounded-md border p-3">
                  <Checkbox
                    id="add-user-active"
                    checked={Boolean(form.is_active)}
                    onCheckedChange={(checked) =>
                      updateForm("is_active", checked === true)
                    }
                  />
                  <Label htmlFor="add-user-active" className="cursor-pointer">
                    Active
                  </Label>
                </div>
                <div className="flex h-12 items-center gap-3 rounded-md border p-3">
                  <Checkbox
                    id="add-user-verified"
                    checked={Boolean(form.is_verified)}
                    onCheckedChange={(checked) =>
                      updateForm("is_verified", checked === true)
                    }
                  />
                  <Label htmlFor="add-user-verified" className="cursor-pointer font-medium">
                    Genuine user
                  </Label>
                </div>
              </div>
              )}
            </div>
          )}

          {/* STEP 1: Background & Education */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="add-user-qualification">Highest Qualification</Label>
                  <Input
                    id="add-user-qualification"
                    value={form.education[0]?.qualification || ""}
                    onChange={(e) => {
                      const nextEdu = [...form.education];
                      if (!nextEdu[0]) nextEdu[0] = blankEducation();
                      nextEdu[0] = { ...nextEdu[0], qualification: e.target.value };
                      updateForm("education", nextEdu);
                    }}
                    placeholder="e.g. M.Sc Computer Science, Ph.D, B.Tech"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-user-exp">Experience (Years)</Label>
                  <Input
                    id="add-user-exp"
                    type="number"
                    value={form.experiences[0]?.from_year ? String(new Date().getFullYear() - Number(form.experiences[0].from_year)) : "5"}
                    onChange={(e) => {
                      const years = parseInt(e.target.value, 10) || 0;
                      const nextExp = [...form.experiences];
                      if (!nextExp[0]) nextExp[0] = blankExperience();
                      nextExp[0] = { ...nextExp[0], from_year: String(new Date().getFullYear() - years) };
                      updateForm("experiences", nextExp);
                    }}
                    placeholder="e.g. 5"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="add-user-prev-institution">Previous Work Experience / Institution</Label>
                  <Input
                    id="add-user-prev-institution"
                    value={form.experiences[0]?.company_name || ""}
                    onChange={(e) => {
                      const nextExp = [...form.experiences];
                      if (!nextExp[0]) nextExp[0] = blankExperience();
                      nextExp[0] = { ...nextExp[0], company_name: e.target.value };
                      updateForm("experiences", nextExp);
                    }}
                    placeholder="e.g. DPS International, Apex Academy, IIT Delhi"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Upload Documents */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground font-medium">Upload staff identification documents and certificates for verification.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="doc-id">Government ID / Aadhaar / PAN</Label>
                  <Input
                    id="doc-id"
                    placeholder="Document Number / ID Link"
                    value={form.documents[0]?.document_number || ""}
                    onChange={(e) => {
                      const nextDocs = [...form.documents];
                      if (!nextDocs[0]) nextDocs[0] = blankUserDocument();
                      nextDocs[0] = { ...nextDocs[0], document_type: "GOVT_ID", document_number: e.target.value };
                      updateForm("documents", nextDocs);
                    }}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="doc-resume">Resume / CV Document URL</Label>
                  <Input
                    id="doc-resume"
                    placeholder="https://example.com/resume.pdf"
                    value={form.documents[0]?.files?.[0]?.url || ""}
                    onChange={(e) => {
                      const nextDocs = [...form.documents];
                      if (!nextDocs[0]) nextDocs[0] = blankUserDocument();
                      nextDocs[0] = { ...nextDocs[0], document_type: "RESUME", files: [{ url: e.target.value, publicId: "resume-1", resourceType: "raw", fileType: "pdf", name: "Resume.pdf", size: 1024 }] };
                      updateForm("documents", nextDocs);
                    }}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t pt-4">
            <ProgressiveSaveIndicator status={saveStatus} />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {isEdit ? "Save Changes" : "Create User"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

