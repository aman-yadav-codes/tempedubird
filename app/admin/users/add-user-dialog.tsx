"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BadgeDollarSign,
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  GraduationCap,
  IndianRupee,
  Layers,
  Lock,
  Loader2,
  Percent,
  Plus,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserPlus,
  UserRound,
  Wallet,
  MapPin,
  Image as ImageIcon,
  X as XIcon,
  Landmark,
  CreditCard,
  Building2,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useProgressiveSave } from "@/hooks/use-progressive-save";
import { ProgressiveSaveIndicator } from "@/components/shared/progressive-save-indicator";

import { Badge } from "@/components/ui/badge";
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
  blankCommission,
  blankCommissionRule,
  blankEducation,
  blankExperience,
  blankSalaryAccount,
  blankSalaryComponent,
  blankUserDocument,
  defaultBirthDateString,
  getInitialForm,
  hasAnyValue,
  normalizeEmail,
  normalizeNullableText,
  normalizeText,
  safeTrim,
  todayDateString,
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
  CommissionForm,
  CommissionRuleItem,
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

function formatShiftTime12h(timeStr?: string | null) {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  if (trimmed.includes("AM") || trimmed.includes("PM")) return trimmed;
  const parts = trimmed.split(":");
  if (parts.length < 2) return trimmed;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2);
  if (isNaN(hours)) return trimmed;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = hours < 10 ? "0" + hours : String(hours);
  return `${strHours}:${minutes} ${ampm}`;
}

function formatShiftSetupLabel(setup: { title: string; start_time?: string | null; end_time?: string | null }) {
  const start = formatShiftTime12h(setup.start_time || "09:00");
  const end = formatShiftTime12h(setup.end_time || "17:00");
  return `${start} - ${end} (${setup.title})`;
}

import { useActiveInstitution } from "@/hooks/use-active-institution";

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
  const { activeInstitutionId, activeInstitution } = useActiveInstitution();
  const effectivePreferredInstitution = useMemo(() => {
    if (preferredInstitution) return preferredInstitution;
    if (activeInstitutionId && activeInstitution) {
      return { id: activeInstitution.id, name: activeInstitution.name };
    }
    return null;
  }, [preferredInstitution, activeInstitutionId, activeInstitution]);

  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const actualOpen = isControlled ? controlledOpen : internalOpen;
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<AddUserForm>(() => getInitialForm(user));
  const [passwordForm, setPasswordForm] = useState({ password: "", confirmPassword: "" });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [attendanceShifts, setAttendanceShifts] = useState<
    Array<{ id: number; title: string; start_time: string; end_time: string; target_type: string; is_default?: boolean; is_active?: boolean }>
  >([]);
  const tabScrollerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [tabScrollHints, setTabScrollHints] = useState({ left: false, right: false });
  const isEdit = mode === "edit";
  const canCreateUsers = hasPermission(currentUser, createPermission);

  useEffect(() => {
    if (!actualOpen || !accessToken) return;
    let isCancelled = false;

    const loadAttendanceSetups = async () => {
      try {
        const instId =
          effectivePreferredInstitution?.id ||
          user?.institutions?.[0]?.id ||
          form.under_institution_id;
        const params = new URLSearchParams();
        if (instId) params.set("institution_id", String(instId));
        params.set("target_type", "STAFF");

        const res = await fetch(
          `/api/admin/master-data/attendance-setup?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (!res.ok) return;
        const json = await res.json();
        if (!isCancelled && Array.isArray(json.data)) {
          setAttendanceShifts(json.data.filter((item: any) => item.target_type === "STAFF"));
        }
      } catch {
        // silent fallback to standard shifts
      }
    };

    loadAttendanceSetups();
    return () => {
      isCancelled = true;
    };
  }, [
    actualOpen,
    accessToken,
    preferredInstitution?.id,
    user?.institutions,
    form.under_institution_id,
  ]);

  const computedShiftOptions = useMemo(() => {
    const defaultShifts = [
      "09:00 AM - 05:00 PM (General Shift)",
      "08:00 AM - 02:00 PM (Morning Shift)",
      "10:00 AM - 06:00 PM (Regular Day Shift)",
      "02:00 PM - 08:00 PM (Evening Shift)",
      "08:00 PM - 06:00 AM (Night Shift)",
    ];

    const activeSetups = attendanceShifts.filter(
      (s) => s.is_active !== false && s.target_type === "STAFF"
    );

    if (!activeSetups.length) {
      return defaultShifts.map((val) => ({
        value: val,
        label: val,
        isFromSetup: false,
        title: "",
      }));
    }

    const seenValues = new Set<string>();
    const uniqueFromSetups: Array<{
      value: string;
      label: string;
      isFromSetup: boolean;
      title: string;
    }> = [];

    for (const s of activeSetups) {
      const formatted = formatShiftSetupLabel(s);
      if (!seenValues.has(formatted)) {
        seenValues.add(formatted);
        uniqueFromSetups.push({
          value: formatted,
          label: formatted,
          isFromSetup: true,
          title: s.title,
        });
      }
    }

    const merged = [...uniqueFromSetups];
    for (const d of defaultShifts) {
      if (!seenValues.has(d)) {
        seenValues.add(d);
        merged.push({ value: d, label: d, isFromSetup: false, title: "" });
      }
    }
    return merged;
  }, [attendanceShifts]);

  const isStaffContext =
    entityLabel?.toLowerCase().includes("staff") ||
    entityLabel?.toLowerCase().includes("employee") ||
    entityLabel?.toLowerCase().includes("teacher") ||
    entityLabel?.toLowerCase().includes("faculty") ||
    createLabel?.toLowerCase().includes("staff");

  const currentUserIsPlatformAdmin = Boolean(
    currentUser?.is_super_admin ||
    currentUser?.role_codes?.includes("platform_admin") ||
    currentUser?.roles?.includes("Platform Admin")
  );

  const availableRoles = useMemo(() => {
    const seenIds = new Set<string | number>();
    return roles.filter((role) => {
      if (!role || role.id == null) return false;
      const roleKey = role.id;
      if (seenIds.has(roleKey)) return false;
      seenIds.add(roleKey);

      const code = (role.code || "").toLowerCase();
      const name = (role.name || "").toLowerCase();

      if (isStaffContext) {
        // Exclude Student, Parent / Guardian, Tutor, Guest, Vendor from Staff Role dropdown
        if (
          code === "student" ||
          name.includes("student") ||
          code === "parent" ||
          code === "guardian" ||
          name.includes("parent") ||
          name.includes("guardian") ||
          code === "tutor" ||
          name.includes("tutor") ||
          code === "guest" ||
          name.includes("guest") ||
          code === "vendor" ||
          name.includes("vendor")
        ) {
          return false;
        }
        // If current user is NOT platform admin, do not show Platform Admin in staff role list
        if (!currentUserIsPlatformAdmin && (code === "platform_admin" || name.includes("platform admin"))) {
          return false;
        }
      }
      return true;
    });
  }, [roles, isStaffContext, currentUserIsPlatformAdmin]);

  const selectedRole = useMemo(
    () => roles.find((role) => String(role.id) === form.role_id),
    [roles, form.role_id]
  );
  const selectedRoleIsPlatformAdmin = Boolean(
    selectedRole?.code === "platform_admin" ||
    (selectedRole?.name || "").toLowerCase().includes("platform admin") ||
    selectedRole?.scope_code === "platform"
  );
  const selectedRoleIsInstitutionScoped = Boolean(
    selectedRole?.scope_code === "institution" && !selectedRoleIsPlatformAdmin
  );
  const selectedRoleIsTeacher = selectedRole?.code === "teacher";
  const selectedRoleIsStaff = selectedRole?.code === "teacher" || selectedRole?.code === "driver" || selectedRole?.code === "faculty";
  const selectedRoleIsGuest = selectedRole?.code === "guest";
  const selectedRoleCanHaveDesignation = Boolean(
    selectedRole?.code === "institution_admin" ||
    selectedRoleIsTeacher ||
    selectedRole?.is_designation ||
    currentUserIsPlatformAdmin
  );
  const showAccountInstitution = Boolean(
    selectedRoleIsInstitutionScoped && !selectedRoleIsPlatformAdmin && !currentUserIsPlatformAdmin
  );
  const lockInstitutionToPreferred = Boolean(
    effectivePreferredInstitution &&
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

  if (code === "student" || name.includes("student")) return { label: role.name || "Student", icon: "🎓" };
  if (code === "teacher" || name.includes("teacher")) return { label: role.name || "Teacher", icon: "👨‍🏫" };
  if (code === "faculty" || name.includes("faculty")) return { label: role.name || "Faculty", icon: "👨‍🏫" };
  if (code === "tutor" || name.includes("tutor")) return { label: role.name || "Tutor", icon: "📖" };
  if (code === "director" || name.includes("director")) return { label: role.name || "Director", icon: "👔" };
  if (code === "principal" || name.includes("principal")) return { label: role.name || "Principal", icon: "🏛️" };
  if (code === "vice_principal" || name.includes("vice principal")) return { label: role.name || "Vice Principal", icon: "🏛️" };
  if (code === "dean" || name.includes("dean")) return { label: role.name || "Dean", icon: "🎓" };
  if (code === "center_head" || name.includes("center head")) return { label: role.name || "Center Head", icon: "🏢" };
  if (code === "branch_manager" || name.includes("branch manager")) return { label: role.name || "Branch Manager", icon: "💼" };
  if (code === "academic_coordinator" || name.includes("academic coordinator")) return { label: role.name || "Academic Coordinator", icon: "📋" };
  if (code === "hod" || name.includes("head of department")) return { label: role.name || "Head of Department", icon: "🔬" };
  if (code === "teaching_assistant" || name.includes("teaching assistant")) return { label: role.name || "Teaching Assistant", icon: "🧑‍🏫" };
  if (code === "doubt_expert" || name.includes("doubt")) return { label: role.name || "Doubt Expert", icon: "💡" };
  if (code === "admission_counselor" || name.includes("admission")) return { label: role.name || "Admission Counselor", icon: "🤝" };
  if (code === "counselor" || name.includes("counselor")) return { label: role.name || "Counselor", icon: "💬" };
  if (code === "telecaller" || name.includes("telecaller")) return { label: role.name || "Telecaller", icon: "📞" };
  if (code === "marketing_executive" || name.includes("marketing")) return { label: role.name || "Marketing Executive", icon: "📢" };
  if (code === "institution_accountant" || code === "accountant" || name.includes("accountant")) return { label: role.name || "Accountant", icon: "💰" };
  if (code === "fee_collector" || name.includes("fee")) return { label: role.name || "Fee Collector", icon: "💳" };
  if (code === "exam_controller" || name.includes("exam")) return { label: role.name || "Exam Controller", icon: "📝" };
  if (code === "curriculum_developer" || name.includes("curriculum")) return { label: role.name || "Curriculum Developer", icon: "📚" };
  if (code === "librarian" || name.includes("librarian") || name.includes("library")) return { label: role.name || "Librarian", icon: "📚" };
  if (code === "placement_officer" || name.includes("placement")) return { label: role.name || "Placement Officer", icon: "🎯" };
  if (code === "lab_assistant" || name.includes("lab")) return { label: role.name || "Lab Assistant", icon: "🧪" };
  if (code === "it_support" || name.includes("it support")) return { label: role.name || "IT Support", icon: "💻" };
  if (code === "hostel_warden" || name.includes("hostel")) return { label: role.name || "Hostel Warden", icon: "🏠" };
  if (code === "transport_coordinator" || name.includes("transport")) return { label: role.name || "Transport Coordinator", icon: "🚌" };
  if (code === "driver" || name.includes("driver")) return { label: role.name || "Driver", icon: "🚖" };
  if (code === "security_guard" || name.includes("security")) return { label: role.name || "Security Guard", icon: "🛡️" };
  if (code === "sports_coach" || name.includes("sports") || name.includes("coach")) return { label: role.name || "Sports Coach", icon: "⚽" };
  if (code === "administrative_staff" || name.includes("admin") || name.includes("staff")) return { label: role.name || "Administrative Staff", icon: "📂" };
  if (code === "school_owner" || name.includes("school")) return { label: role.name || "School Owner", icon: "🏫" };
  if (code === "college_owner" || name.includes("college")) return { label: role.name || "College Owner", icon: "🏛️" };
  if (code === "university_owner" || name.includes("university")) return { label: role.name || "University Owner", icon: "🎓" };
  if (code === "library_owner" || name.includes("library")) return { label: role.name || "Library Owner", icon: "📚" };
  if (code === "pg_owner" || name.includes("pg")) return { label: role.name || "PG Owner", icon: "🏠" };
  if (code === "parent" || code === "guardian" || name.includes("parent") || name.includes("guardian")) return { label: role.name || "Guardian / Parent", icon: "👨‍👩‍👧" };
  if (code === "institution_admin" || name.includes("institution admin")) return { label: role.name || "Institution Owner / Admin", icon: "🏫" };
  if (code === "platform_admin" || name.includes("platform admin")) return { label: role.name || "Platform Admin", icon: "🛡️" };
  return { label: role.name, icon: "👤" };
}

  const showRoleAssignment = canAssignRoles && roles.length > 0;
  const showAdminControls = canAssignRoles;
  const showSecurityStep = false;
  const editUserId = user?.id;
  const userFormKey = `user:${isEdit ? editUserId ?? "edit" : "new"}`;
  const { saveStatus, handleBlur, restoreDraft, clearDraft } = useProgressiveSave({
    formKey: userFormKey,
    formState: form,
    enabled: actualOpen,
  });

  const dialogSteps = useMemo(
    () => [
      { label: "Account Details", icon: UserRound },
      { label: "Address & Location", icon: MapPin },
      { label: "Background & Education", icon: Briefcase },
      { label: "Upload Documents", icon: FileText },
      { label: "Salary Details", icon: IndianRupee },
      { label: "Commission Assigned", icon: BadgeDollarSign },
    ],
    []
  );
  const addressStepIndex = 1;
  const backgroundStepIndex = 2;
  const documentsStepIndex = 3;
  const salaryStepIndex = 4;
  const commissionStepIndex = 5;
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
    if (!effectivePreferredInstitution || currentUserIsPlatformAdmin) return nextForm;

    const role = roles.find((item) => String(item.id) === nextForm.role_id);
    if (role?.scope_code !== "institution") return nextForm;

    const institutionId = String(effectivePreferredInstitution.id);

    return {
      ...nextForm,
      under_institution_id: institutionId,
      under_institution_name: effectivePreferredInstitution.name,
      institution_ids: [institutionId],
    };
  }, [currentUserIsPlatformAdmin, effectivePreferredInstitution, roles]);

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
    if (selectedRoleIsPlatformAdmin) {
      setErrors((prev) => {
        if (!prev.under_institution_id) return prev;
        const next = { ...prev };
        delete next.under_institution_id;
        return next;
      });
    }
  }, [selectedRoleIsPlatformAdmin]);

  useEffect(() => {
    if (selectedRoleIsTeacher || showAccountInstitution) {
      return;
    }

    if (
      form.teacher_type ||
      form.under_institution_id ||
      form.under_institution_name ||
      (form.institution_ids?.length ?? 0) > 0 ||
      (form.teaching_categories?.length ?? 0) > 0 ||
      (form.teaching_subjects?.length ?? 0) > 0
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
    form.teaching_categories?.length,
    form.teaching_subjects?.length,
    form.under_institution_id,
    form.under_institution_name,
    form.institution_ids?.length,
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
          (prev.teaching_subjects?.length ?? 0) === 0
            ? prev
            : { ...prev, teaching_subjects: [] }
        );
      }, 0);

      return () => window.clearTimeout(timeout);
    }

    if (selectedCategoryIds.length === 0) {
      const timeout = window.setTimeout(() => {
        setForm((prev) =>
          (prev.teaching_subjects?.length ?? 0) === 0
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
          const currentSubjects = prev.teaching_subjects || [];
          const nextSubjects = currentSubjects.filter((subjectId) => nextAllowed.has(subjectId));
          if (nextSubjects.length === currentSubjects.length) {
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
    clearDraft();
    setForm(applyPreferredInstitution(getInitialForm(user)));
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

      if (!isEdit) {
        const draft = restoreDraft();
        if (draft) {
          setForm({
            ...draft,
            joining_date: draft.joining_date || todayDateString(),
            date_of_birth: draft.date_of_birth || defaultBirthDateString(),
          });
          setSelectedInstitutionBoardId(
            preferredInstitution?.boardId ?? null
          );
          return;
        }
      }

      setForm(applyPreferredInstitution(getInitialForm(user)));
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
  }, [actualOpen, applyPreferredInstitution, isEdit, preferredInstitution, restoreDraft, roles, user]);

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

      if (
        !currentUserIsPlatformAdmin &&
        !selectedRoleIsPlatformAdmin &&
        selectedRoleIsInstitutionScoped &&
        form.institution_ids.length === 0 &&
        !form.under_institution_id &&
        !effectivePreferredInstitution
      ) {
        nextErrors.under_institution_id = "Please select an institution for this staff member.";
      }
    }

    if (stepIndex === 1) {
      // Background & Education records are completely optional
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
    setActiveStep(targetStep);
  };

  const buildPayload = () => {
    const compactExperiences = form.experiences.filter((experience) =>
      Boolean(safeTrim(experience.job_title) || safeTrim(experience.company_name))
    );
    const compactEducation = form.education.filter((education) =>
      Boolean(safeTrim(education.qualification) || safeTrim(education.institution_name))
    );
    const compactCertifications = form.certifications.filter((certification) =>
      Boolean(safeTrim(certification.name))
    );
    const isPlatformStaff = currentUserIsPlatformAdmin || selectedRoleIsPlatformAdmin || !selectedRoleIsInstitutionScoped;
    const selectedInstitutionIds = isPlatformStaff
      ? (form.under_institution_id ? [Number(form.under_institution_id)].filter((value) => Number.isInteger(value) && value > 0) : [])
      : showInstitutionMultiSelect
        ? form.institution_ids
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
        : (showInstitutionSingleSelect || selectedRoleIsTeacher) && form.under_institution_id
          ? [Number(form.under_institution_id)].filter((value) => Number.isInteger(value) && value > 0)
          : [];
    const primaryInstitutionId = selectedInstitutionIds[0] ?? (form.under_institution_id ? Number(form.under_institution_id) : null);

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
        is_marketplace_enabled: form.is_marketplace_enabled ?? true,
        is_teacher: selectedRoleIsTeacher,
        teacher_type: selectedRoleIsTeacher
          ? form.teacher_type || (primaryInstitutionId ? "institute_teacher" : "individual_teacher")
          : null,
        under_institution_id: primaryInstitutionId,
        under_institution_name: isPlatformStaff && !form.under_institution_name ? "EduBird" : form.under_institution_name || null,
        institution_ids: selectedInstitutionIds,
        designation_id:
          form.designation_id
            ? Number(form.designation_id)
            : selectedRole?.is_designation
              ? Number(selectedRole.id)
              : null,
        gender: form.gender === NO_GENDER ? null : normalizeText(form.gender),
        joining_date: form.joining_date || null,
        date_of_birth: form.date_of_birth || null,
        shift_timing: safeTrim(form.shift_timing) || null,
        employment_status: form.employment_status || "ACTIVE",
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
        company_id: experience.company_id && !isNaN(Number(experience.company_id)) ? Number(experience.company_id) : null,
        company_name: normalizeText(experience.company_name),
        from_month: Number(experience.from_month) || null,
        from_year: Number(experience.from_year) || null,
        to_month: experience.is_current ? null : Number(experience.to_month) || null,
        to_year: experience.is_current ? null : Number(experience.to_year) || null,
        is_current: experience.is_current,
      })),
      education: compactEducation.map((education) => ({
        qualification: normalizeText(education.qualification),
        institution_id: education.institution_id && !isNaN(Number(education.institution_id)) ? Number(education.institution_id) : null,
        institution_name: normalizeText(education.institution_name),
        from_year: Number(education.from_year) || null,
        to_year: Number(education.to_year) || null,
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
      salary_components: form.salary_components
        .filter((component) => hasAnyValue([component.label, component.amount]) && safeTrim(component.label))
        .map((component) => ({
          label: normalizeText(component.label),
          amount: Math.max(0, Number(component.amount || 0)),
        })),
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
      commission: form.commission?.commission_type && form.commission.commission_type !== "NONE"
        ? {
            commission_type: form.commission.commission_type,
            commission_rate: safeTrim(form.commission.commission_rate) || "0",
            commission_trigger: form.commission.commission_trigger || "course_admission",
            minimum_threshold: safeTrim(form.commission.minimum_threshold) || null,
            payout_frequency: form.commission.payout_frequency || "MONTHLY",
            notes: safeTrim(form.commission.notes) || null,
            rules: Array.isArray(form.commission.rules)
              ? form.commission.rules
                  .filter((r) => hasAnyValue([r.condition_trigger, r.rate]))
                  .map((r) => ({
                    id: r.id,
                    condition_trigger: r.condition_trigger,
                    condition_label: r.condition_label || "",
                    reward_type: r.reward_type || "PERCENTAGE",
                    rate: safeTrim(r.rate) || "0",
                    minimum_threshold: safeTrim(r.minimum_threshold || "") || null,
                    payout_frequency: r.payout_frequency || "MONTHLY",
                    notes: safeTrim(r.notes || "") || null,
                  }))
              : [],
          }
        : null,
    };
  };

  const grossSalary = useMemo(
    () =>
      form.salary_components
        .filter((c) => c.type !== "DEDUCTION")
        .reduce((total, component) => {
          const amount = Number(component.amount);
          return total + (Number.isFinite(amount) && amount > 0 ? amount : 0);
        }, 0),
    [form.salary_components]
  );

  const totalDeductions = useMemo(
    () =>
      form.salary_components
        .filter((c) => c.type === "DEDUCTION")
        .reduce((total, component) => {
          const amount = Number(component.amount);
          return total + (Number.isFinite(amount) && amount > 0 ? amount : 0);
        }, 0),
    [form.salary_components]
  );

  const netTakeHome = Math.max(0, grossSalary - totalDeductions);
  const salaryTotal = grossSalary;

  const handleSubmit = async () => {
    for (let index = 0; index < dialogSteps.length - 1; index += 1) {
      if (!validateStep(index)) {
        setActiveStep(index);
        const stepName = dialogSteps[index]?.label || `Step ${index + 1}`;
        toast.error(`Please complete the required fields in ${stepName}.`);
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
      clearDraft();
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
    !isStaffContext &&
    (selectedRole?.code === "student" ||
      (selectedRole?.name ?? "").toLowerCase().includes("student"));

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
            availableRoles.find((role) => role.code === "teacher" || role.name.toLowerCase().includes("teacher")) ??
            availableRoles[0];

          setForm((prev) => {
            const isInvalidStaffRole = isStaffContext && availableRoles.length > 0 && !availableRoles.some((r) => String(r.id) === prev.role_id);
            return {
              ...prev,
              role_id: (!prev.role_id || isInvalidStaffRole) && defaultRole ? String(defaultRole.id) : prev.role_id,
            };
          });
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
            <div className="space-y-4">
              {/* Personal Details */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="add-user-name" className="text-xs font-semibold">Full Name *</Label>
                  <Input
                    id="add-user-name"
                    value={form.full_name}
                    onChange={(event) =>
                      updateForm("full_name", event.target.value)
                    }
                    placeholder="e.g. Jane Cooper"
                    autoComplete="off"
                    className="h-9 text-xs"
                  />
                  <FieldError message={errors.full_name} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-user-email" className="text-xs font-semibold">Email *</Label>
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
                    className="h-9 text-xs"
                  />
                  <FieldError message={errors.email} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-user-phone" className="text-xs font-semibold">Phone</Label>
                  <Input
                    id="add-user-phone"
                    value={form.phone}
                    onChange={(event) => updateForm("phone", event.target.value)}
                    placeholder="10-digit phone number"
                    autoComplete="off"
                    className="h-9 text-xs"
                  />
                  <FieldError message={errors.phone} />
                </div>
              </div>

              {/* Employment Dates & Shift Timing Card */}
              <div className="p-3.5 rounded-lg border bg-card/60 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <Calendar className="size-3.5 text-primary" />
                    Employment Dates & Work Schedule
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Joining, birthday, and shift details</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="add-user-joining-date" className="text-xs font-medium">Joining Date</Label>
                    <Input
                      id="add-user-joining-date"
                      type="date"
                      value={form.joining_date || ""}
                      onChange={(e) => updateForm("joining_date", e.target.value)}
                      className="h-9 text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="add-user-dob" className="text-xs font-medium">Date of Birth</Label>
                    <Input
                      id="add-user-dob"
                      type="date"
                      value={form.date_of_birth || ""}
                      onChange={(e) => updateForm("date_of_birth", e.target.value)}
                      className="h-9 text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="add-user-shift" className="text-xs font-medium flex items-center gap-1">
                      <Clock className="size-3 text-muted-foreground" />
                      Shift Timing
                    </Label>
                    <Select
                      value={
                        computedShiftOptions.some((opt) => opt.value === form.shift_timing)
                          ? form.shift_timing
                          : form.shift_timing
                          ? "custom"
                          : (computedShiftOptions[0]?.value || "09:00 AM - 05:00 PM (General Shift)")
                      }
                      onValueChange={(val) => {
                        if (val !== "custom") {
                          updateForm("shift_timing", val);
                        } else {
                          updateForm("shift_timing", "custom");
                        }
                      }}
                    >
                      <SelectTrigger id="add-user-shift" className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Select shift timing" />
                      </SelectTrigger>
                      <SelectContent>
                        {attendanceShifts.length > 0 && (
                          <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                            Institution Attendance Shifts
                          </div>
                        )}
                        {computedShiftOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">✍️ Custom Timing...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="add-user-emp-status" className="text-xs font-medium">Employment Status</Label>
                    <Select
                      value={form.employment_status || "ACTIVE"}
                      onValueChange={(val) => updateForm("employment_status", val)}
                    >
                      <SelectTrigger id="add-user-emp-status" className="h-9 text-xs bg-background font-medium">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">🟢 Active</SelectItem>
                        <SelectItem value="PROBATION">⏳ On Probation</SelectItem>
                        <SelectItem value="ON_LEAVE">🗓️ On Leave</SelectItem>
                        <SelectItem value="NOTICE_PERIOD">⚠️ Notice Period</SelectItem>
                        <SelectItem value="RETIRED">👴 Retired</SelectItem>
                        <SelectItem value="TERMINATED">🚫 Fired / Terminated</SelectItem>
                        <SelectItem value="RESIGNED">📄 Resigned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(!computedShiftOptions.some((opt) => opt.value === form.shift_timing) || form.shift_timing === "custom") && (
                  <div className="pt-1">
                    <Input
                      placeholder="Enter custom shift timing (e.g. 07:30 AM - 01:30 PM / Rotational)"
                      value={form.shift_timing === "custom" ? "" : form.shift_timing || ""}
                      onChange={(e) => updateForm("shift_timing", e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                )}
              </div>
              {/* Bio & Avatar in a balanced 2-column layout to reduce scrolling */}
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Profile Picture / Avatar */}
                <div className="space-y-2 rounded-lg border bg-muted/10 p-2.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-primary" />
                      Profile Picture
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Upload or paste URL</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {form.avatar_url ? (
                      <div className="relative group shrink-0">
                        <img
                          src={form.avatar_url}
                          alt="Avatar"
                          className="h-11 w-11 rounded-full object-cover border-2 border-primary/30 shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => updateForm("avatar_url", "")}
                          className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 shadow-xs hover:scale-110 transition-transform"
                          title="Remove photo"
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-primary/10 border-2 border-dashed border-primary/30 grid place-items-center text-[11px] font-black text-primary shrink-0">
                        {form.full_name?.slice(0, 2)?.toUpperCase() || "AV"}
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <DocumentFileUpload
                        accessToken={accessToken}
                        files={
                          form.avatar_url
                            ? [
                                {
                                  url: form.avatar_url,
                                  publicId: "",
                                  resourceType: "image",
                                  fileType: "image/*",
                                  name: "Profile Photo",
                                },
                              ]
                            : []
                        }
                        onFilesChange={(files) => {
                          if (files.length > 0) {
                            updateForm("avatar_url", files[0].url);
                          } else {
                            updateForm("avatar_url", "");
                          }
                        }}
                        maxFiles={1}
                        maxSize={5 * 1024 * 1024}
                        compact
                        buttonLabel="Upload"
                        emptyText="Drop or browse image"
                      />
                      <Input
                        type="text"
                        placeholder="Image URL (https://...)"
                        value={form.avatar_url || ""}
                        onChange={(e) => updateForm("avatar_url", e.target.value)}
                        className="h-7 text-[11px] bg-background"
                      />
                    </div>
                  </div>
                  <FieldError message={errors.avatar_url} />
                </div>

                {/* About Staff / Bio */}
                <div className="space-y-1.5">
                  <Label htmlFor="add-user-about" className="text-xs font-semibold">About Staff / Bio</Label>
                  <Textarea
                    id="add-user-about"
                    value={form.about || ""}
                    onChange={(e) => updateForm("about", e.target.value)}
                    placeholder="Brief background, bio summary, or introduction..."
                    rows={4}
                    className="text-xs font-medium resize-none h-[106px]"
                  />
                </div>
              </div>

              {/* Choose Role & Show on EduBird Marketplace Options */}
              <div className="grid gap-3 sm:grid-cols-2 items-end">
                {showRoleAssignment && (
                  <div className="space-y-1.5">
                    <Label htmlFor="add-user-role" className="text-xs font-semibold">
                      Choose Role <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.role_id}
                      onValueChange={(value) => {
                        const nextRole = roles.find((role) => String(role.id) === value);
                        const nextRoleIsTeacher = nextRole?.code === "teacher";
                        const nextRoleIsInstitutionScoped = nextRole?.scope_code === "institution" && !currentUserIsPlatformAdmin;
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
                        const nextRoleCanHaveDesignation = Boolean(
                          nextRole?.code === "institution_admin" ||
                          nextRoleIsTeacher ||
                          nextRole?.is_designation ||
                          currentUserIsPlatformAdmin
                        );
                        if (!nextRoleIsInstitutionScoped) {
                          setSelectedInstitutionBoardId(null);
                        }
                        const isDesig = Boolean(nextRole?.is_designation);
                        setForm((prev) => ({
                          ...prev,
                          role_id: value,
                          is_teacher: nextRoleIsTeacher,
                          teacher_type: nextRoleIsTeacher
                            ? "institute_teacher"
                            : "",
                          designation_id: isDesig ? String(nextRole?.id) : nextRoleCanHaveDesignation ? prev.designation_id : "",
                          designation_name: isDesig ? (nextRole?.name || "") : nextRoleCanHaveDesignation ? prev.designation_name : "",
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
                                  teaching_categories: [],
                                  teaching_subjects: [],
                                  hourly_charges: "",
                                }
                                : {}),
                            }),
                        }));
                      }}
                    >
                      <SelectTrigger id="add-user-role" className="w-full h-10 bg-background text-xs">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => {
                          const display = getRoleDisplay(role);
                          return (
                            <SelectItem key={`role-${role.id}`} value={String(role.id)}>
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

                {/* Account Options - Marketplace */}
                {showAdminControls && (
                  <div className="flex h-10 items-center gap-2.5 rounded-md border px-3 bg-primary/5 border-primary/20">
                    <Checkbox
                      id="add-user-marketplace"
                      checked={Boolean(form.is_marketplace_enabled ?? true)}
                      onCheckedChange={(checked) =>
                        updateForm("is_marketplace_enabled", checked === true)
                      }
                    />
                    <Label htmlFor="add-user-marketplace" className="cursor-pointer text-xs font-medium">
                      Show on EduBird Marketplace
                    </Label>
                  </div>
                )}
              </div>

              {/* Institution Selection for Institution-Scoped Staff Roles (Hidden on Platform Admin side) */}
              {selectedRoleIsInstitutionScoped && !currentUserIsPlatformAdmin && (
                <div className="space-y-1.5">
                  {effectivePreferredInstitution ? (
                    <div className="p-3 rounded-xl border border-primary/20 bg-primary/[0.03] flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <div>
                          <span className="text-xs font-bold text-foreground block">Assigned Institution</span>
                          <span className="text-[11px] text-muted-foreground">{effectivePreferredInstitution.name}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-background text-primary border-primary/30">
                        Active Workspace
                      </Badge>
                    </div>
                  ) : (
                    <div className="space-y-1.5 p-3 rounded-xl border border-border/80 bg-muted/10">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="add-user-institution" className="text-xs font-semibold flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                          <span>Institution <span className="text-destructive">*</span></span>
                        </Label>
                        {form.under_institution_id && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              updateForm("under_institution_id", "");
                              updateForm("under_institution_name", "");
                              updateForm("institution_ids", []);
                            }}
                            className="h-5 text-[10px] text-muted-foreground hover:text-destructive px-1"
                          >
                            Clear Institution
                          </Button>
                        )}
                      </div>
                      <AsyncSearchPopover<InstitutionOption>
                        value={form.under_institution_id}
                        selectedLabel={form.under_institution_name || undefined}
                        onChange={(value) => {
                          updateForm("under_institution_id", value);
                          updateForm("institution_ids", value ? [value] : []);
                        }}
                        onSelectItem={(item) => {
                          updateForm("under_institution_id", String(item.id));
                          updateForm("under_institution_name", item.name);
                          updateForm("institution_ids", [String(item.id)]);
                          if (item.board_id) {
                            setSelectedInstitutionBoardId(item.board_id);
                          }
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.under_institution_id;
                            return next;
                          });
                        }}
                        placeholder="Search & choose institution (e.g. Maasarda institute)..."
                        searchPlaceholder="Type institution name..."
                        emptyText="No matching institution found"
                        fetcher={fetchInstitutions}
                        getValue={(item) => String(item.id)}
                        getLabel={(item) => item.name}
                      />
                      <FieldError message={errors.under_institution_id} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 1: Address & Location */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-3 rounded-xl border bg-card/60 p-4 shadow-xs">
                <GoogleLocationPicker
                  value={form.location}
                  onChange={(location) => {
                    setForm((prev) => ({
                      ...prev,
                      location,
                      full_address:
                        location.full_address ||
                        location.formatted_address ||
                        [location.city, location.state].filter(Boolean).join(", "),
                    }));
                  }}
                />
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="add-user-address" className="text-xs font-semibold text-foreground">
                    Address / City / Street
                  </Label>
                  <Input
                    id="add-user-address"
                    value={form.full_address || ""}
                    onChange={(event) => updateForm("full_address", event.target.value)}
                    placeholder="Street address or city"
                    className="text-xs h-9 bg-background font-medium"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Background, Education & Experience with Multiple Entries */}
          {activeStep === 2 && (
            <div className="space-y-6">
              {/* Education Qualifications Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      Education & Qualifications
                    </h4>
                    <p className="text-[11px] text-muted-foreground">Add academic degrees, diplomas, and institutional qualifications</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateForm("education", [...form.education, blankEducation()])}
                    className="h-8 gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Qualification
                  </Button>
                </div>

                {form.education.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-2">No educational qualifications added yet.</p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => updateForm("education", [blankEducation()])}
                      className="h-7 text-xs"
                    >
                      + Add Qualification
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.education.map((edu, idx) => (
                      <EducationCard
                        key={edu.id || idx}
                        education={edu}
                        index={idx}
                        errors={errors}
                        accessToken={accessToken}
                        onChange={(patch) => {
                          const next = form.education.map((item, i) => (i === idx ? { ...item, ...patch } : item));
                          updateForm("education", next);
                        }}
                        onDelete={() => {
                          const next = form.education.filter((_, i) => i !== idx);
                          updateForm("education", next);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Work Experience Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-primary" />
                      Previous Work Experience & Institutions
                    </h4>
                    <p className="text-[11px] text-muted-foreground">Add employment history, past school/college teaching, and designations</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateForm("experiences", [...form.experiences, blankExperience()])}
                    className="h-8 gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Experience
                  </Button>
                </div>

                {form.experiences.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-2">No previous work experience added yet.</p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => updateForm("experiences", [blankExperience()])}
                      className="h-7 text-xs"
                    >
                      + Add Work Experience
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.experiences.map((exp, idx) => (
                      <ExperienceCard
                        key={exp.id || idx}
                        experience={exp}
                        index={idx}
                        errors={errors}
                        accessToken={accessToken}
                        onChange={(patch) => {
                          const next = form.experiences.map((item, i) => (i === idx ? { ...item, ...patch } : item));
                          updateForm("experiences", next);
                        }}
                        onDelete={() => {
                          const next = form.experiences.filter((_, i) => i !== idx);
                          updateForm("experiences", next);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Certifications Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-primary" />
                      Certifications & Specialized Training
                    </h4>
                    <p className="text-[11px] text-muted-foreground">Professional certificates, diplomas, training and credentials</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateForm("certifications", [...form.certifications, blankCertification()])}
                    className="h-8 gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Certification
                  </Button>
                </div>

                {form.certifications.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-2">No certifications added yet (optional).</p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => updateForm("certifications", [blankCertification()])}
                      className="h-7 text-xs"
                    >
                      + Add Certification
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.certifications.map((cert, idx) => (
                      <CertificationCard
                        key={cert.id || idx}
                        certification={cert}
                        index={idx}
                        errors={errors}
                        onChange={(patch) => {
                          const next = form.certifications.map((item, i) => (i === idx ? { ...item, ...patch } : item));
                          updateForm("certifications", next);
                        }}
                        onDelete={() => {
                          const next = form.certifications.filter((_, i) => i !== idx);
                          updateForm("certifications", next);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Upload Documents */}
          {activeStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" />
                    Staff Verification Documents
                  </h4>
                  <p className="text-[11px] text-muted-foreground">Upload identification, certificates, or resumes for staff records</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateForm("documents", [...form.documents, blankUserDocument()])}
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Document
                </Button>
              </div>

              {form.documents.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-2">No documents added yet (optional).</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => updateForm("documents", [blankUserDocument()])}
                    className="h-7 text-xs"
                  >
                    + Add First Document
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {form.documents.map((doc, idx) => (
                    <div key={doc.id || idx} className="rounded-lg border bg-muted/10 p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <FileText className="size-3.5 text-primary" />
                          Document {idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            const next = form.documents.filter((_, i) => i !== idx);
                            updateForm("documents", next);
                          }}
                        >
                          <XIcon className="size-4 text-muted-foreground hover:text-destructive" />
                          <span className="sr-only">Remove document</span>
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Document Type</Label>
                          <Select
                            value={doc.document_type || "GOVT_ID"}
                            onValueChange={(val) => {
                              const next = form.documents.map((item, i) => (i === idx ? { ...item, document_type: val } : item));
                              updateForm("documents", next);
                            }}
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GOVT_ID">Government ID (Aadhaar / PAN)</SelectItem>
                              <SelectItem value="AADHAAR">Aadhaar Card</SelectItem>
                              <SelectItem value="PAN">PAN Card</SelectItem>
                              <SelectItem value="RESUME">Resume / Curriculum Vitae (CV)</SelectItem>
                              <SelectItem value="DEGREE">Degree / Educational Certificate</SelectItem>
                              <SelectItem value="EXPERIENCE_LETTER">Experience / Relieving Letter</SelectItem>
                              <SelectItem value="OTHER">Other Verification Document</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Document / ID Number (Optional)</Label>
                          <Input
                            placeholder="e.g. XXXX-XXXX-XXXX / Reference ID"
                            value={doc.document_number || ""}
                            onChange={(e) => {
                              const next = form.documents.map((item, i) => (i === idx ? { ...item, document_number: e.target.value } : item));
                              updateForm("documents", next);
                            }}
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Upload Document File / Image</Label>
                        <DocumentFileUpload
                          accessToken={accessToken}
                          files={getDocumentFiles(doc)}
                          onFilesChange={(files) => {
                            const next = form.documents.map((item, i) =>
                              i === idx
                                ? {
                                    ...item,
                                    files,
                                    file_url: files[0]?.url || "",
                                    public_id: files[0]?.publicId || "",
                                    resource_type: files[0]?.resourceType || "",
                                  }
                                : item
                            );
                            updateForm("documents", next);
                          }}
                          maxFiles={3}
                          maxSize={10 * 1024 * 1024}
                          compact
                          buttonLabel="Upload Document"
                          emptyText="Drop document (PDF, PNG, JPG) here or click to browse"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Employee Salary Details */}
          {activeStep === 4 && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-4 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <IndianRupee className="size-4 text-primary" />
                      Employee Salary & Compensation Structure
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Configure basic pay, allowances, deductions, and salary disbursement cycle.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium text-muted-foreground">Salary Cycle:</Label>
                    <Select
                      value={form.salary_frequency || "MONTHLY"}
                      onValueChange={(val: any) =>
                        setForm((prev) => ({
                          ...prev,
                          salary_frequency: val,
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs font-semibold w-36 bg-background">
                        <SelectValue placeholder="Select cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTHLY">📅 Monthly Basis</SelectItem>
                        <SelectItem value="WEEKLY">🗓️ Weekly Basis</SelectItem>
                        <SelectItem value="DAILY">☀️ Daily Basis</SelectItem>
                        <SelectItem value="YEARLY">📆 Yearly (Annual CTC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Salary KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40">
                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="size-3.5" />
                      Total Gross Earnings
                    </span>
                    <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mt-1 font-mono">
                      ₹{grossSalary.toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40">
                    <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 flex items-center gap-1">
                      <TrendingDown className="size-3.5" />
                      Total Deductions
                    </span>
                    <p className="text-lg font-bold text-rose-800 dark:text-rose-300 mt-1 font-mono">
                      ₹{totalDeductions.toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border bg-primary/5 border-primary/20">
                    <span className="text-[11px] font-medium text-primary flex items-center gap-1">
                      <Wallet className="size-3.5" />
                      Net Take-Home Pay ({(form.salary_frequency || "MONTHLY").toLowerCase()})
                    </span>
                    <p className="text-lg font-bold text-primary mt-1 font-mono">
                      ₹{netTakeHome.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Earnings & Allowances */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <TrendingUp className="size-3.5 text-emerald-600" />
                        Earnings & Allowances
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Basic pay, house rent (HRA), dearness allowance (DA), travel, and special allowances.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          salary_components: [
                            ...prev.salary_components,
                            blankSalaryComponent("", "", "EARNING"),
                          ],
                        }));
                      }}
                      className="h-7 text-xs gap-1 font-semibold"
                    >
                      <Plus className="size-3" />
                      Add Allowance
                    </Button>
                  </div>

                  {/* Quick Preset Buttons for Earnings */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-md bg-muted/25 border border-dashed">
                    <span className="text-[11px] text-muted-foreground font-semibold shrink-0 mr-0.5">Quick Add:</span>
                    {[
                      "Basic Pay",
                      "House Rent Allowance (HRA)",
                      "Dearness Allowance (DA)",
                      "Medical Allowance",
                      "Conveyance / Travel Allowance",
                      "Special Allowance",
                      "Performance Incentive",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          const exists = form.salary_components.some(
                            (c) => c.label.toLowerCase() === preset.toLowerCase()
                          );
                          if (exists) {
                            toast.info(`${preset} is already in salary components.`);
                            return;
                          }
                          setForm((prev) => ({
                            ...prev,
                            salary_components: [
                              ...prev.salary_components,
                              blankSalaryComponent(preset, "", "EARNING"),
                            ],
                          }));
                        }}
                        className="inline-flex items-center text-[11px] px-2.5 py-1 rounded-full border bg-background hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors shadow-2xs font-medium cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {form.salary_components
                      .map((component, globalIndex) => ({ component, globalIndex }))
                      .filter(({ component }) => component.type !== "DEDUCTION")
                      .map(({ component, globalIndex }) => (
                        <div
                          key={component.id || globalIndex}
                          className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex-1">
                            <Input
                              placeholder="e.g. Basic Pay, HRA, Medical..."
                              value={component.label}
                              onChange={(e) => {
                                const newLabel = e.target.value;
                                setForm((prev) => ({
                                  ...prev,
                                  salary_components: prev.salary_components.map((c, i) =>
                                    i === globalIndex ? { ...c, label: newLabel } : c
                                  ),
                                }));
                              }}
                              className="h-8 text-xs bg-background"
                            />
                          </div>

                          <div className="w-40 relative">
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={component.amount}
                              onChange={(e) => {
                                const newAmount = e.target.value;
                                setForm((prev) => ({
                                  ...prev,
                                  salary_components: prev.salary_components.map((c, i) =>
                                    i === globalIndex ? { ...c, amount: newAmount } : c
                                  ),
                                }));
                              }}
                              className="h-8 text-xs bg-background pl-6 font-mono font-medium"
                            />
                            <span className="absolute left-2 top-2 text-[11px] text-muted-foreground pointer-events-none font-bold">
                              ₹
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                salary_components: prev.salary_components.filter(
                                  (_, i) => i !== globalIndex
                                ),
                              }));
                            }}
                            className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                            title="Remove allowance"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Deductions Section */}
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <TrendingDown className="size-3.5 text-rose-600" />
                        Deductions & Retentions
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Provident Fund (PF), ESI, Professional Tax (PT), TDS/Income Tax, and other deductions.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          salary_components: [
                            ...prev.salary_components,
                            blankSalaryComponent("", "", "DEDUCTION"),
                          ],
                        }));
                      }}
                      className="h-7 text-xs gap-1 font-semibold"
                    >
                      <Plus className="size-3" />
                      Add Deduction
                    </Button>
                  </div>

                  {/* Quick Preset Buttons for Deductions */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-md bg-muted/25 border border-dashed">
                    <span className="text-[11px] text-muted-foreground font-semibold shrink-0 mr-0.5">Quick Add:</span>
                    {[
                      "Provident Fund (PF)",
                      "Employee State Insurance (ESI)",
                      "Professional Tax (PT)",
                      "TDS / Income Tax Deduction",
                      "Loan / Advance Recovery",
                      "Other Deductions",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          const exists = form.salary_components.some(
                            (c) => c.label.toLowerCase() === preset.toLowerCase()
                          );
                          if (exists) {
                            toast.info(`${preset} is already in salary components.`);
                            return;
                          }
                          setForm((prev) => ({
                            ...prev,
                            salary_components: [
                              ...prev.salary_components,
                              blankSalaryComponent(preset, "", "DEDUCTION"),
                            ],
                          }));
                        }}
                        className="inline-flex items-center text-[11px] px-2.5 py-1 rounded-full border bg-background hover:bg-rose-500/10 hover:border-rose-500/40 hover:text-rose-600 transition-colors shadow-2xs font-medium cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {form.salary_components
                      .map((component, globalIndex) => ({ component, globalIndex }))
                      .filter(({ component }) => component.type === "DEDUCTION")
                      .map(({ component, globalIndex }) => (
                        <div
                          key={component.id || globalIndex}
                          className="flex items-center gap-2 p-2.5 rounded-lg border bg-rose-50/20 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30 transition-colors"
                        >
                          <div className="flex-1">
                            <Input
                              placeholder="e.g. Provident Fund (PF), Tax..."
                              value={component.label}
                              onChange={(e) => {
                                const newLabel = e.target.value;
                                setForm((prev) => ({
                                  ...prev,
                                  salary_components: prev.salary_components.map((c, i) =>
                                    i === globalIndex ? { ...c, label: newLabel } : c
                                  ),
                                }));
                              }}
                              className="h-8 text-xs bg-background"
                            />
                          </div>

                          <div className="w-40 relative">
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={component.amount}
                              onChange={(e) => {
                                const newAmount = e.target.value;
                                setForm((prev) => ({
                                  ...prev,
                                  salary_components: prev.salary_components.map((c, i) =>
                                    i === globalIndex ? { ...c, amount: newAmount } : c
                                  ),
                                }));
                              }}
                              className="h-8 text-xs bg-background pl-6 font-mono font-medium text-rose-600"
                            />
                            <span className="absolute left-2 top-2 text-[11px] text-muted-foreground pointer-events-none font-bold">
                              ₹
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                salary_components: prev.salary_components.filter(
                                  (_, i) => i !== globalIndex
                                ),
                              }));
                            }}
                            className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                            title="Remove deduction"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Commission & Incentive Structure */}
          {activeStep === 5 && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-4 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <BadgeDollarSign className="size-4 text-primary" />
                      Commission & Incentive Structure
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Configure multi-condition commission rules, lead incentives, admission rewards, and payout terms.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5 max-w-sm">
                    <Label className="text-xs font-semibold">Commission Model</Label>
                    <Select
                      value={form.commission?.commission_type || "RULES_BASED"}
                      onValueChange={(val: any) =>
                        setForm((prev) => ({
                          ...prev,
                          commission: {
                            ...(prev.commission || blankCommission()),
                            commission_type: val,
                          },
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select commission model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RULES_BASED">Condition-Based Rules (Enrollment, Leads, Fees, Custom)</SelectItem>
                        <SelectItem value="PERCENTAGE">Flat Percentage (%) on All Admissions</SelectItem>
                        <SelectItem value="FIXED_AMOUNT">Flat Fixed Amount (₹) per Admission</SelectItem>
                        <SelectItem value="NONE">No Commission (Standard Salary Only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.commission?.commission_type === "RULES_BASED" && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Sparkles className="size-3.5 text-amber-500" />
                            Condition-Specific Commission Rules
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Specify distinct payouts based on whether the staff achieves a confirmed enrollment, brings a raw lead, recovers student fees, etc.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newRule = blankCommissionRule("custom", "Custom Condition / Milestone", "PERCENTAGE", "5");
                            setForm((prev) => ({
                              ...prev,
                              commission: {
                                ...(prev.commission || blankCommission()),
                                rules: [...(prev.commission?.rules || []), newRule],
                              },
                            }));
                          }}
                          className="h-7 text-xs gap-1 font-semibold"
                        >
                          <Plus className="size-3" />
                          Add Condition Rule
                        </Button>
                      </div>

                      <div className="space-y-2.5">
                        {(form.commission?.rules || []).map((rule, idx) => (
                          <div
                            key={rule.id || idx}
                            className="p-3 rounded-lg border bg-muted/25 hover:bg-muted/40 transition-colors space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Rule #{idx + 1}
                              </span>
                              {(form.commission?.rules || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setForm((prev) => ({
                                      ...prev,
                                      commission: {
                                        ...(prev.commission || blankCommission()),
                                        rules: (prev.commission?.rules || []).filter((_, i) => i !== idx),
                                      },
                                    }));
                                  }}
                                  className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                                  title="Delete condition rule"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="grid gap-2.5 sm:grid-cols-12 items-start">
                              <div className="sm:col-span-5 space-y-1">
                                <Label className="text-[11px] font-medium">Trigger Condition</Label>
                                <Select
                                  value={rule.condition_trigger || "successful_enrollment"}
                                  onValueChange={(val) => {
                                    const labelMap: Record<string, string> = {
                                      successful_enrollment: "Successful Student Enrollment / Admission",
                                      lead_generated: "Lead / Inquiry Brought (Lead Generation)",
                                      fee_collected: "Student Fee Collection Recovery",
                                      spot_admission: "Spot Admission / Walk-in Closure",
                                      course_completion: "Course Completion Milestone",
                                      custom: "Custom Condition",
                                    };
                                    setForm((prev) => ({
                                      ...prev,
                                      commission: {
                                        ...(prev.commission || blankCommission()),
                                        rules: (prev.commission?.rules || []).map((r, i) =>
                                          i === idx
                                            ? {
                                                ...r,
                                                condition_trigger: val,
                                                condition_label: labelMap[val] || val,
                                              }
                                            : r
                                        ),
                                      },
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs bg-background">
                                    <SelectValue placeholder="Select trigger" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="successful_enrollment">🎓 Successful Student Enrollment / Admission</SelectItem>
                                    <SelectItem value="lead_generated">🎯 Lead / Inquiry Brought (Lead Generation)</SelectItem>
                                    <SelectItem value="fee_collected">💳 Student Fee Collection Recovery</SelectItem>
                                    <SelectItem value="spot_admission">⚡ Spot Admission / Walk-in Closure</SelectItem>
                                    <SelectItem value="course_completion">🏆 Course Completion Milestone</SelectItem>
                                    <SelectItem value="custom">✍️ Custom Condition / Milestone</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="sm:col-span-3 space-y-1">
                                <Label className="text-[11px] font-medium">Reward Type</Label>
                                <Select
                                  value={rule.reward_type || "PERCENTAGE"}
                                  onValueChange={(val: any) =>
                                    setForm((prev) => ({
                                      ...prev,
                                      commission: {
                                        ...(prev.commission || blankCommission()),
                                        rules: (prev.commission?.rules || []).map((r, i) =>
                                          i === idx ? { ...r, reward_type: val } : r
                                        ),
                                      },
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PERCENTAGE">% Percentage</SelectItem>
                                    <SelectItem value="FIXED_AMOUNT">₹ Fixed Amount</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="sm:col-span-4 space-y-1">
                                <Label className="text-[11px] font-medium">
                                  {rule.reward_type === "PERCENTAGE" ? "Commission Rate (%)" : "Payout Amount (₹)"}
                                </Label>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    placeholder={rule.reward_type === "PERCENTAGE" ? "e.g. 10" : "e.g. 1000"}
                                    value={rule.rate || ""}
                                    onChange={(e) =>
                                      setForm((prev) => ({
                                        ...prev,
                                        commission: {
                                          ...(prev.commission || blankCommission()),
                                          rules: (prev.commission?.rules || []).map((r, i) =>
                                            i === idx ? { ...r, rate: e.target.value } : r
                                          ),
                                        },
                                      }))
                                    }
                                    className="h-8 text-xs bg-background pr-7 font-mono font-medium"
                                  />
                                  <span className="absolute right-2 top-2 text-[11px] text-muted-foreground pointer-events-none font-bold">
                                    {rule.reward_type === "PERCENTAGE" ? "%" : "₹"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                              <Input
                                placeholder="Condition threshold (e.g. Minimum 5 leads / On fee > ₹20,000)"
                                value={rule.minimum_threshold || ""}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    commission: {
                                      ...(prev.commission || blankCommission()),
                                      rules: (prev.commission?.rules || []).map((r, i) =>
                                        i === idx ? { ...r, minimum_threshold: e.target.value } : r
                                      ),
                                    },
                                  }))
                                }
                                className="h-7 text-[11px] bg-background"
                              />
                              <Input
                                placeholder="Rule notes / eligibility conditions..."
                                value={rule.notes || ""}
                                onChange={(e) =>
                                  setForm((prev) => ({
                                    ...prev,
                                    commission: {
                                      ...(prev.commission || blankCommission()),
                                      rules: (prev.commission?.rules || []).map((r, i) =>
                                        i === idx ? { ...r, notes: e.target.value } : r
                                      ),
                                    },
                                  }))
                                }
                                className="h-7 text-[11px] bg-background"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FLAT RATE FALLBACK */}
                  {form.commission?.commission_type &&
                    form.commission.commission_type !== "NONE" &&
                    form.commission.commission_type !== "RULES_BASED" && (
                      <div className="grid gap-4 sm:grid-cols-2 pt-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">
                            {form.commission.commission_type === "PERCENTAGE"
                              ? "Commission Rate (%)"
                              : "Fixed Amount (₹)"}
                          </Label>
                          <Input
                            type="number"
                            placeholder={form.commission.commission_type === "PERCENTAGE" ? "e.g. 10" : "e.g. 1000"}
                            value={form.commission.commission_rate || ""}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                commission: {
                                  ...(prev.commission || blankCommission()),
                                  commission_rate: e.target.value,
                                },
                              }))
                            }
                            className="h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Commission Applicable On</Label>
                          <Select
                            value={form.commission.commission_trigger || "course_admission"}
                            onValueChange={(val) =>
                              setForm((prev) => ({
                                ...prev,
                                commission: {
                                  ...(prev.commission || blankCommission()),
                                  commission_trigger: val,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Select trigger" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="course_admission">Course / Batch Enrollment</SelectItem>
                              <SelectItem value="lead_conversion">Sales / Lead Conversion</SelectItem>
                              <SelectItem value="fee_collection">Student Fee Collection</SelectItem>
                              <SelectItem value="all">All Sales & Admissions</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                  {/* GLOBAL COMMISSION SETTINGS */}
                  {form.commission?.commission_type && form.commission.commission_type !== "NONE" && (
                    <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t mt-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Payout Frequency</Label>
                        <Select
                          value={form.commission.payout_frequency || "MONTHLY"}
                          onValueChange={(val) =>
                            setForm((prev) => ({
                              ...prev,
                              commission: {
                                ...(prev.commission || blankCommission()),
                                payout_frequency: val,
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select payout schedule" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MONTHLY">Monthly with Salary</SelectItem>
                            <SelectItem value="PER_TRANSACTION">Per Successful Event (Instant Payout)</SelectItem>
                            <SelectItem value="QUARTERLY">Quarterly Settlement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Overall Minimum Target / Threshold (Optional)</Label>
                        <Input
                          placeholder="e.g. Min ₹50,000 total sales or 5 admissions"
                          value={form.commission.minimum_threshold || ""}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              commission: {
                                ...(prev.commission || blankCommission()),
                                minimum_threshold: e.target.value,
                              },
                            }))
                          }
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs font-medium">Commission Notes & Terms</Label>
                        <Textarea
                          placeholder="Any special terms, bonus criteria, conditions, or payout guidelines..."
                          value={form.commission.notes || ""}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              commission: {
                                ...(prev.commission || blankCommission()),
                                notes: e.target.value,
                              },
                            }))
                          }
                          className="min-h-[70px] text-xs resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t pt-4">
            <ProgressiveSaveIndicator
              status={saveStatus}
              onClearDraft={() => {
                clearDraft();
                resetForm();
                toast.info("Draft cleared");
              }}
            />
            <div className="flex items-center gap-2">
              {activeStep > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveStep((prev) => Math.max(prev - 1, 0))}
                  disabled={submitting}
                  className="gap-1.5"
                >
                  <ArrowLeft className="size-4" />
                  Previous
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              {!isLastStep ? (
                <Button
                  type="button"
                  onClick={goNext}
                  className="gap-1.5"
                >
                  Next
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="gap-1.5"
                >
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  {isEdit ? "Save Changes" : "Create User"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

