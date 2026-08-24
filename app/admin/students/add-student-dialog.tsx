"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  IdCard,
  Info,
  Lock,
  Loader2,
  Plus,
  Pencil,
  Repeat2,
  Trash2,
  X,
  BriefcaseBusiness,
  Upload,
  UserPlus,
  UserRound,
  UsersRound,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
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
import { DatePicker } from "@/components/shared/date-picker";
import { DocumentFileUpload, type UploadedDocumentFile } from "@/components/shared/document-file-upload";
import { ImageUploader } from "@/components/shared/image-uploader";
import { useProgressiveSave } from "@/hooks/use-progressive-save";
import { ProgressiveSaveIndicator } from "@/components/shared/progressive-save-indicator";
import { useAuthStore } from "@/store";
import { getApiErrorMessage } from "@/lib/auth/client-permission-errors";
import { getStoredActiveAcademicYearId } from "@/lib/auth/active-academic-session";
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
} from "@/app/admin/users/_components/types";

export type { RoleOption } from "@/app/admin/users/_components/types";

type AddStudentDialogProps = {
  roles: RoleOption[];
  accessToken: string | null;
  onSaved: () => void;
  mode?: "create" | "edit";
  user?: AdminUserDetails | null;
  initialStudentRecords?: StudentRecordsResponse | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  preferredInstitution?: {
    id: number;
    name: string;
    boardId?: number | null;
  } | null;
};

const DUPLICATE_EMAIL_MESSAGE = "Email address already in use.";
const ROLL_NUMBER_ERROR = "Roll number must contain digits only.";
const DUPLICATE_ROLL_NUMBER_MESSAGE = "This roll number is already used in the selected class and section.";
const DUPLICATE_ADMISSION_NUMBER_MESSAGE = "This admission number is already used in this institution.";
const DUPLICATE_APAR_ID_MESSAGE = "This APAR ID is already used by another student.";
const TODAY = new Date();
const CURRENT_YEAR = TODAY.getFullYear();
const CURRENT_YEAR_START = new Date(CURRENT_YEAR, 0, 1);
const CURRENT_YEAR_END = new Date(CURRENT_YEAR, 11, 31);

const STANDARD_DOCUMENT_TYPES = [
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "TC", label: "Transfer Certificate (TC)" },
  { value: "MARKSHEET", label: "Marksheet / Transcript" },
  { value: "BIRTH_CERTIFICATE", label: "Birth Certificate" },
  { value: "CASTE_CERTIFICATE", label: "Caste Certificate" },
  { value: "INCOME_CERTIFICATE", label: "Income Certificate" },
  { value: "MIGRATION_CERTIFICATE", label: "Migration Certificate" },
  { value: "CHARACTER_CERTIFICATE", label: "Character Certificate" },
  { value: "OTHER", label: "Other Document" },
];

type AvailabilityCheck = {
  status: "idle" | "checking" | "available" | "taken";
  message?: string;
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isCurrentYearDate(value: string | null | undefined) {
  if (!value) return false;
  const year = Number(String(value).slice(0, 4));
  return Number.isInteger(year) && year === CURRENT_YEAR;
}

function admissionDateValue(value: string | null | undefined) {
  const normalized = value ? String(value).slice(0, 10) : "";
  return isCurrentYearDate(normalized) ? normalized : toDateInputValue(TODAY);
}

function normalizeRollNumberInput(value: string) {
  return value.replace(/\D/g, "");
}

function isValidRollNumber(value: string | null | undefined) {
  const trimmed = safeTrim(value ?? "");
  return trimmed.length > 0 && /^\d+$/.test(trimmed);
}

function enrollmentRollScopeKey(draft: Pick<StudentEnrollmentDraft, "program_id" | "section_id" | "academic_year_id" | "roll_number">) {
  return [draft.program_id, draft.section_id, draft.academic_year_id, safeTrim(draft.roll_number)].join(":");
}

function findDuplicateRollDraft(drafts: StudentEnrollmentDraft[]) {
  const seen = new Set<string>();
  for (const draft of drafts) {
    if (!draft.program_id || !draft.section_id || !draft.academic_year_id || !safeTrim(draft.roll_number)) continue;
    const key = enrollmentRollScopeKey(draft);
    if (seen.has(key)) return draft;
    seen.add(key);
  }
  return null;
}

function isGooglePlacesTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest(".pac-container"));
}

type StudentGuardianForm = {
  id: string;
  guardian_user_id: string;
  guardian_name: string;
  guardian_email: string;
  guardian_phone: string;
  password: string;
  confirm_password: string;
  relationship: string;
  is_primary: boolean;
};

type StudentDocumentForm = {
  id: string;
  document_type: string;
  document_number: string;
  file_url: string;
  public_id: string;
  resource_type: string;
  files: UploadedDocumentFile[];
  is_verified: boolean;
};

function getDocumentFiles(document: StudentDocumentForm): UploadedDocumentFile[] {
  return Array.isArray(document.files) ? document.files : [];
}

type StudentRecordsForm = {
  admission_number: string;
  apar_id: string;
  date_of_birth: string;
  blood_group: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  enrollment_institution_id: string;
  enrollment_institution_name: string;
  program_id: string;
  program_name: string;
  academic_year_id: string;
  academic_year_name: string;
  class_category_id: string;
  class_category_name: string;
  section_id: string;
  section_name: string;
  roll_number: string;
  admission_date: string;
  status: string;
  remarks: string;
  guardians: StudentGuardianForm[];
  documents: StudentDocumentForm[];
};

type StudentEnrollmentRecord = Partial<{
  id: number | null;
  institution_id: number | null;
  institution_name: string | null;
  program_id: number | null;
  program_name: string | null;
  academic_year_id: number | null;
  academic_year_name: string | null;
  class_category_id: number | null;
  class_category_name: string | null;
  section_id: number | null;
  section_name: string | null;
  roll_number: string | null;
  admission_date: string | null;
  status: string | null;
  remarks: string | null;
  promotion_type: string | null;
  promoted_at: string | null;
  can_promote: boolean | null;
}>;

type StudentEnrollmentDraft = {
  clientId: string;
  id: number | null;
  program_id: string;
  program_name: string;
  academic_year_id: string;
  academic_year_name: string;
  class_category_id: string;
  class_category_name: string;
  section_id: string;
  section_name: string;
  roll_number: string;
  admission_date: string;
  status: string;
  remarks: string;
  sections: SectionOption[];
  loadingSections: boolean;
  isEditing: boolean;
};

const blankEnrollmentDraft = (): StudentEnrollmentDraft => ({
  clientId: crypto.randomUUID(),
  id: null,
  program_id: "",
  program_name: "",
  academic_year_id: "",
  academic_year_name: "",
  class_category_id: "",
  class_category_name: "",
  section_id: "",
  section_name: "",
  roll_number: "",
  admission_date: admissionDateValue(""),
  status: "active",
  remarks: "",
  sections: [],
  loadingSections: false,
  isEditing: true,
});

function enrollmentRecordToDraft(enrollment: StudentEnrollmentRecord): StudentEnrollmentDraft {
  const sectionId = enrollment.section_id ? String(enrollment.section_id) : "";
  return {
    ...blankEnrollmentDraft(),
    id: enrollment.id ?? null,
    program_id: enrollment.program_id ? String(enrollment.program_id) : "",
    program_name: enrollment.program_name ?? "",
    academic_year_id: enrollment.academic_year_id ? String(enrollment.academic_year_id) : "",
    academic_year_name: enrollment.academic_year_name ?? "",
    class_category_id: enrollment.class_category_id ? String(enrollment.class_category_id) : "",
    class_category_name: enrollment.class_category_name ?? "",
    section_id: sectionId,
    section_name: enrollment.section_name ?? "",
    roll_number: enrollment.roll_number ?? "",
    admission_date: admissionDateValue(enrollment.admission_date),
    status: enrollment.status ?? "active",
    remarks: enrollment.remarks ?? "",
    sections: sectionId ? [{ id: Number(sectionId), name: enrollment.section_name ?? `Section ${sectionId}` }] : [],
    isEditing: false,
  };
}

export type StudentRecordsResponse = {
  profile?: Partial<{
    admission_number: string | null;
    apar_id: string | null;
    date_of_birth: string | null;
    blood_group: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
  }> | null;
  enrollment?: StudentEnrollmentRecord | null;
  enrollments?: StudentEnrollmentRecord[];
  guardians?: Array<{
    id?: number;
    guardian_user_id: number;
    guardian_name?: string | null;
    guardian_email?: string | null;
    guardian_phone?: string | null;
    relationship?: string | null;
    is_primary?: boolean | null;
  }>;
  documents?: Array<{
    id?: number;
    document_type?: string | null;
    document_number?: string | null;
    file_url?: string | null;
    public_id?: string | null;
    resource_type?: string | null;
    file_type?: string | null;
    is_verified?: boolean | null;
  }>;
};

type AcademicYearOption = {
  id: number;
  name: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
};

type ProgramOption = {
  id: number;
  title: string;
  institution_id: number;
};

type SectionOption = {
  id: number;
  name: string;
};

type SiblingStudentOption = {
  student_id: number;
  user_id: number;
  student_name: string;
  admission_number: string | null;
  roll_number: string | null;
  section_name: string | null;
  guardians: Array<{
    guardian_user_id: number;
    guardian_name: string | null;
    guardian_email: string | null;
    guardian_phone: string | null;
    relationship: string | null;
    is_primary: boolean | null;
  }>;
};

type PromotionOutcome = "promoted" | "retained" | "failed" | "graduated" | "transferred";

type PromotionForm = {
  sourceEnrollmentId: string;
  outcome: PromotionOutcome;
  destinationAcademicYearId: string;
  destinationAcademicYearName: string;
  destinationProgramId: string;
  destinationProgramName: string;
  destinationSectionId: string;
  destinationSectionName: string;
  rollNumber: string;
  admissionDate: string;
  notes: string;
};

const blankPromotionForm = (): PromotionForm => ({
  sourceEnrollmentId: "",
  outcome: "promoted",
  destinationAcademicYearId: "",
  destinationAcademicYearName: "",
  destinationProgramId: "",
  destinationProgramName: "",
  destinationSectionId: "",
  destinationSectionName: "",
  rollNumber: "",
  admissionDate: admissionDateValue(""),
  notes: "",
});

const promotionOutcomeLabels: Record<PromotionOutcome, string> = {
  promoted: "Promoted",
  retained: "Repeat same class",
  failed: "Failed",
  graduated: "Graduated",
  transferred: "Transferred",
};

const blankStudentRecords = (): StudentRecordsForm => ({
  admission_number: "",
  apar_id: "",
  date_of_birth: "",
  blood_group: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  enrollment_institution_id: "",
  enrollment_institution_name: "",
  program_id: "",
  program_name: "",
  academic_year_id: "",
  academic_year_name: "",
  class_category_id: "",
  class_category_name: "",
  section_id: "",
  section_name: "",
  roll_number: "",
  admission_date: admissionDateValue(""),
  status: "active",
  remarks: "",
  guardians: [],
  documents: [],
});

function mapStudentRecordsResponse(data: StudentRecordsResponse) {
  const profile = data.profile ?? {};
  const enrollment = data.enrollment ?? {};
  const loadedDocuments = (data.documents ?? []).map((document) => ({
    id: String(document.id ?? crypto.randomUUID()),
    document_type: document.document_type ?? "",
    document_number: document.document_number ?? "",
    file_url: document.file_url ?? "",
    public_id: document.public_id ?? "",
    resource_type: document.resource_type ?? "",
    files: document.file_url
      ? [{
        url: document.file_url,
        publicId: document.public_id ?? "",
        resourceType: document.resource_type ?? "image",
        fileType: document.file_type ?? "image/*",
        name: document.file_url.split("/").pop() ?? "Uploaded image",
      }]
      : [],
    is_verified: Boolean(document.is_verified),
  }));

  return {
    records: {
      admission_number: profile.admission_number ?? "",
      apar_id: profile.apar_id ?? "",
      date_of_birth: profile.date_of_birth ? String(profile.date_of_birth).slice(0, 10) : "",
      blood_group: profile.blood_group ?? "",
      emergency_contact_name: profile.emergency_contact_name ?? "",
      emergency_contact_phone: profile.emergency_contact_phone ?? "",
      enrollment_institution_id: enrollment.institution_id ? String(enrollment.institution_id) : "",
      enrollment_institution_name: enrollment.institution_name ?? "",
      program_id: enrollment.program_id ? String(enrollment.program_id) : "",
      program_name: enrollment.program_name ?? "",
      academic_year_id: enrollment.academic_year_id ? String(enrollment.academic_year_id) : "",
      academic_year_name: enrollment.academic_year_name ?? "",
      class_category_id: enrollment.class_category_id ? String(enrollment.class_category_id) : "",
      class_category_name: enrollment.class_category_name ?? "",
      section_id: enrollment.section_id ? String(enrollment.section_id) : "",
      section_name: enrollment.section_name ?? "",
      roll_number: enrollment.roll_number ?? "",
      admission_date: admissionDateValue(enrollment.admission_date),
      status: enrollment.status ?? "active",
      remarks: enrollment.remarks ?? "",
      guardians: (data.guardians ?? []).map((guardian) => ({
        id: String(guardian.id ?? crypto.randomUUID()),
        guardian_user_id: String(guardian.guardian_user_id),
        guardian_name: guardian.guardian_name ?? guardian.guardian_email ?? "",
        guardian_email: guardian.guardian_email ?? "",
        guardian_phone: guardian.guardian_phone ?? "",
        password: "",
        confirm_password: "",
        relationship: guardian.relationship ?? "",
        is_primary: Boolean(guardian.is_primary),
      })),
      documents: loadedDocuments,
    },
    savedUploadPublicIds: new Set(
      loadedDocuments.flatMap((document) => document.files.map((file) => file.publicId)).filter(Boolean)
    ),
  };
}

function mapSiblingGuardians(sibling: SiblingStudentOption): StudentGuardianForm[] {
  const primaryGuardianIndex = Math.max(
    0,
    sibling.guardians.findIndex((guardian) => Boolean(guardian.is_primary))
  );

  return sibling.guardians.map((guardian, index) => ({
    id: crypto.randomUUID(),
    guardian_user_id: String(guardian.guardian_user_id),
    guardian_name: guardian.guardian_name ?? guardian.guardian_email ?? "",
    guardian_email: guardian.guardian_email ?? "",
    guardian_phone: guardian.guardian_phone ?? "",
    password: "",
    confirm_password: "",
    relationship: guardian.relationship ?? "",
    is_primary: index === primaryGuardianIndex,
  }));
}

const studentDetailSteps = [
  { label: "Student", icon: IdCard },
  { label: "Guardians", icon: UsersRound },
  { label: "Documents", icon: FileText },
] as const;

export function AddStudentDialog({
  roles,
  accessToken,
  onSaved,
  mode = "create",
  user = null,
  initialStudentRecords = null,
  open: controlledOpen,
  onOpenChange,
  preferredInstitution = null,
}: AddStudentDialogProps) {
  const { user: currentUser } = useAuthStore();
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const actualOpen = isControlled ? controlledOpen : internalOpen;
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<AddUserForm>(() => getInitialForm(roles, user));
  const [studentRecords, setStudentRecords] = useState<StudentRecordsForm>(() => blankStudentRecords());
  const [savedEnrollments, setSavedEnrollments] = useState<StudentEnrollmentRecord[]>([]);
  const [enrollmentDrafts, setEnrollmentDrafts] = useState<StudentEnrollmentDraft[]>(() => [blankEnrollmentDraft()]);
  const [rollNumberChecks, setRollNumberChecks] = useState<Record<string, AvailabilityCheck>>({});
  const [identifierChecks, setIdentifierChecks] = useState<Record<"admission_number" | "apar_id", AvailabilityCheck>>({
    admission_number: { status: "idle" },
    apar_id: { status: "idle" },
  });
  const [passwordForm, setPasswordForm] = useState({ password: "", confirmPassword: "" });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [savedUploadPublicIds, setSavedUploadPublicIds] = useState<Set<string>>(() => new Set());
  const [programDetailLoading, setProgramDetailLoading] = useState(false);
  const [programSections, setProgramSections] = useState<SectionOption[]>([]);
  const [enablePromotion, setEnablePromotion] = useState(false);
  const [promotionForm, setPromotionForm] = useState<PromotionForm>(() => blankPromotionForm());
  const [promotionSections, setPromotionSections] = useState<SectionOption[]>([]);
  const [promotionSubmitting, setPromotionSubmitting] = useState(false);
  const [promotionProgramLoading, setPromotionProgramLoading] = useState(false);
  const [useSiblingGuardians, setUseSiblingGuardians] = useState(false);
  const [siblingStudentId, setSiblingStudentId] = useState("");
  const [siblingStudentLabel, setSiblingStudentLabel] = useState("");
  const tabScrollerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const programDetailRequestRef = useRef(0);
  const identifierCheckRequestRef = useRef(0);
  const [tabScrollHints, setTabScrollHints] = useState({ left: false, right: false });
  const isEdit = mode === "edit";
  const studentFormKey = `student:${isEdit ? user?.id ?? "edit" : "new"}`;
  const { saveStatus, handleBlur } = useProgressiveSave({
    formKey: studentFormKey,
    formState: form,
    enabled: actualOpen,
  });

  const selectedRole = useMemo(
    () => roles.find((role) => String(role.id) === form.role_id),
    [roles, form.role_id]
  );
  const selectedRoleIsInstitutionScoped = selectedRole?.scope_code === "institution";
  const selectedRoleIsTeacher = selectedRole?.code === "teacher";
  const selectedRoleIsStudent = selectedRole?.code === "student";
  const selectedRoleCanHaveDesignation = selectedRole?.code === "institution_admin";
  const accountNeedsInstitution = selectedRoleIsInstitutionScoped && !selectedRoleIsTeacher;
  const showAccountInstitution = false;
  const showAccountDesignation = selectedRoleCanHaveDesignation;
  const showHourlyCharges = selectedRoleIsTeacher && form.teacher_type === "individual_teacher";
  const defaultStudentRole = useMemo(
    () =>
      roles.find((role) => role.code === "student") ??
      roles.find((role) => role.name.toLowerCase() === "student") ??
      null,
    [roles]
  );
  const canAssignRoles = Boolean(
    currentUser?.is_super_admin ||
    currentUser?.roles?.includes("Platform Admin") ||
    currentUser?.roles?.includes("Institution Admin")
  );
  const showRoleAssignment = false;
  const showAdminControls = canAssignRoles;
  const showSecurityStep = isEdit && showAdminControls;
  const currentUserRoleCodes = currentUser?.role_codes ?? [];
  const isParentMode = Boolean(
    currentUser?.roles?.includes("Guardian") ||
    currentUser?.roles?.includes("Parent") ||
    currentUserRoleCodes.includes("guardian") ||
    currentUserRoleCodes.includes("parent")
  );
  const canPromoteByRole = Boolean(
    currentUser?.is_super_admin ||
    currentUserRoleCodes.includes("platform_admin") ||
    currentUserRoleCodes.includes("institution_admin") ||
    currentUser?.roles?.includes("Platform Admin") ||
    currentUser?.roles?.includes("Institution Admin")
  );
  const hasPromotableEnrollment = savedEnrollments.some((enrollment) =>
    enrollment.id && enrollment.status === "active" && (canPromoteByRole || enrollment.can_promote === true)
  );
  const showPromotionStep = isEdit && (canPromoteByRole || hasPromotableEnrollment);
  const studentWorkflowSteps = useMemo(
    () => showPromotionStep
      ? [
        studentDetailSteps[0],
        { label: "Promotion", icon: Repeat2 },
        ...studentDetailSteps.slice(1),
      ]
      : [...studentDetailSteps],
    [showPromotionStep]
  );
  const dialogSteps = useMemo(
    () => [
      { label: "Account", icon: UserRound },
      { label: "Location", icon: MapPin },
      { label: "Background", icon: BriefcaseBusiness },
      { label: "Student", icon: IdCard },
      { label: "Review", icon: CheckCircle2 },
    ],
    []
  );
  const informationStepIndex = -1;
  const locationStepIndex = 1;
  const backgroundStepIndex = 2;
  const studentProfileStepIndex = 3;
  const enrollmentStepIndex = -1;
  const promotionStepIndex = -1;
  const guardiansStepIndex = -1;
  const documentsStepIndex = 3;
  const securityStepIndex = -1;
  const reviewStepIndex = 4;
  const isLastStep = activeStep >= dialogSteps.length - 1;
  const activePromotionEnrollments = useMemo(
    () => savedEnrollments.filter((enrollment) =>
      enrollment.id &&
      enrollment.status === "active" &&
      (canPromoteByRole || enrollment.can_promote === true)
    ),
    [canPromoteByRole, savedEnrollments]
  );
  const selectedPromotionSource = useMemo(
    () =>
      savedEnrollments.find((enrollment) => String(enrollment.id ?? "") === promotionForm.sourceEnrollmentId) ??
      activePromotionEnrollments[0] ??
      null,
    [activePromotionEnrollments, promotionForm.sourceEnrollmentId, savedEnrollments]
  );
  const promotionCreatesEnrollment =
    promotionForm.outcome === "promoted" ||
    promotionForm.outcome === "retained" ||
    promotionForm.outcome === "failed";

  const applyStudentRecordsData = useCallback((data: StudentRecordsResponse) => {
    const mapped = mapStudentRecordsResponse(data);
    const enrollments = data.enrollments ?? (data.enrollment ? [data.enrollment] : []);
    setStudentRecords(mapped.records);
    setSavedEnrollments(enrollments);
    setEnrollmentDrafts(
      enrollments.map(enrollmentRecordToDraft).concat(enrollments.length ? [] : [blankEnrollmentDraft()])
    );
    setSavedUploadPublicIds(mapped.savedUploadPublicIds);
    return enrollments;
  }, []);

  const loadLatestStudentRecords = useCallback(async () => {
    if (!accessToken || !user?.id) return null;
    const res = await fetch(`/api/admin/student-records/${user.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to load student records");
    const data = (json.data ?? {}) as StudentRecordsResponse;
    return applyStudentRecordsData(data);
  }, [accessToken, applyStudentRecordsData, user]);

  const selectEnrollmentForPromotion = useCallback((enrollment: StudentEnrollmentRecord) => {
    if (!enrollment.id) return;
    setEnablePromotion(true);
    setPromotionForm((current) => ({
      ...current,
      sourceEnrollmentId: String(enrollment.id),
      destinationProgramId: enrollment.program_id ? String(enrollment.program_id) : "",
      destinationProgramName: enrollment.program_name ?? "",
      destinationSectionId: enrollment.section_id ? String(enrollment.section_id) : "",
      destinationSectionName: enrollment.section_name ?? "",
      rollNumber: "",
      notes: "",
    }));
  }, []);

  const checkEmailAvailability = useCallback(async () => {
    if (!actualOpen || !accessToken) return;

    const email = normalizeEmail(form.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    const params = new URLSearchParams({ email });
    if (isEdit && user?.id) {
      params.set("excludeUserId", String(user.id));
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
  }, [accessToken, actualOpen, form.email, isEdit, user]);

  const applyPreferredInstitution = useCallback((nextForm: AddUserForm) => {
    if (isEdit || !preferredInstitution) return nextForm;

    const role = roles.find((item) => String(item.id) === nextForm.role_id);
    if (role?.scope_code !== "institution") return nextForm;
    if (nextForm.under_institution_id) return nextForm;

    return {
      ...nextForm,
      under_institution_id: String(preferredInstitution.id),
      under_institution_name: preferredInstitution.name,
    };
  }, [isEdit, preferredInstitution, roles]);

  const applyPreferredEnrollment = useCallback((nextRecords: StudentRecordsForm) => {
    if (isEdit || !preferredInstitution) return nextRecords;
    if (nextRecords.enrollment_institution_id) return nextRecords;

    return {
      ...nextRecords,
      enrollment_institution_id: String(preferredInstitution.id),
      enrollment_institution_name: preferredInstitution.name,
    };
  }, [isEdit, preferredInstitution]);

  const lockedEnrollmentInstitutionId =
    form.under_institution_id ||
    studentRecords.enrollment_institution_id ||
    (preferredInstitution?.id ? String(preferredInstitution.id) : "") ||
    (user?.institutions[0]?.id ? String(user.institutions[0].id) : "");
  const lockedEnrollmentInstitutionName =
    form.under_institution_name ||
    studentRecords.enrollment_institution_name ||
    preferredInstitution?.name ||
    user?.institutions[0]?.name ||
    "";
  const editingUserId = user?.id ?? null;
  const createInstitutionId = Number(lockedEnrollmentInstitutionId);
  const canCreateStudents = Boolean(
    currentUser?.is_super_admin ||
    currentUser?.roles?.includes("Platform Admin") ||
    currentUser?.roles?.includes("Institution Admin") ||
    currentUser?.roles?.includes("Guardian") ||
    currentUser?.roles?.includes("Parent") ||
    currentUser?.role_codes?.includes("guardian") ||
    currentUser?.role_codes?.includes("parent") ||
    hasPermission(
      currentUser,
      "managestudents.allstudents.create",
      {
        institutionId:
          Number.isInteger(createInstitutionId) && createInstitutionId > 0
            ? createInstitutionId
            : null,
      }
    )
  );

  const clearFieldError = useCallback((field: string) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!actualOpen || !accessToken || !selectedRoleIsStudent) return;
    const requestId = identifierCheckRequestRef.current + 1;
    identifierCheckRequestRef.current = requestId;

    const timeout = window.setTimeout(() => {
      const admissionNumber = safeTrim(studentRecords.admission_number).toUpperCase();
      const aparId = safeTrim(studentRecords.apar_id).toUpperCase();

      if (admissionNumber && lockedEnrollmentInstitutionId) {
        setIdentifierChecks((current) => ({ ...current, admission_number: { status: "checking" } }));
        const params = new URLSearchParams({
          kind: "admission_number",
          value: admissionNumber,
          institution_id: lockedEnrollmentInstitutionId,
        });
        if (editingUserId) params.set("exclude_student_user_id", String(editingUserId));
        void fetch(`/api/admin/students/identifier-check?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
          .then(({ ok, json }) => {
            if (identifierCheckRequestRef.current !== requestId) return;
            const message = json.message || DUPLICATE_ADMISSION_NUMBER_MESSAGE;
            setIdentifierChecks((current) => ({
              ...current,
              admission_number: { status: ok && json.available ? "available" : "taken", message },
            }));
            setErrors((current) => {
              if (!ok || !json.available) return { ...current, admission_number: message };
              if (current.admission_number === message || current.admission_number === DUPLICATE_ADMISSION_NUMBER_MESSAGE) {
                const next = { ...current };
                delete next.admission_number;
                return next;
              }
              return current;
            });
          })
          .catch(() => undefined);
      } else {
        setIdentifierChecks((current) => ({ ...current, admission_number: { status: "idle" } }));
        setErrors((current) => {
          if (current.admission_number === DUPLICATE_ADMISSION_NUMBER_MESSAGE || current.admission_number?.includes("Admission number")) {
            const next = { ...current };
            delete next.admission_number;
            return next;
          }
          return current;
        });
      }

      if (aparId) {
        setIdentifierChecks((current) => ({ ...current, apar_id: { status: "checking" } }));
        const params = new URLSearchParams({ kind: "apar_id", value: aparId });
        if (editingUserId) params.set("exclude_student_user_id", String(editingUserId));
        void fetch(`/api/admin/students/identifier-check?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
          .then(({ ok, json }) => {
            if (identifierCheckRequestRef.current !== requestId) return;
            const message = json.message || DUPLICATE_APAR_ID_MESSAGE;
            setIdentifierChecks((current) => ({
              ...current,
              apar_id: { status: ok && json.available ? "available" : "taken", message },
            }));
            setErrors((current) => {
              if (!ok || !json.available) return { ...current, apar_id: message };
              if (current.apar_id === message || current.apar_id === DUPLICATE_APAR_ID_MESSAGE) {
                const next = { ...current };
                delete next.apar_id;
                return next;
              }
              return current;
            });
          })
          .catch(() => undefined);
      } else {
        setIdentifierChecks((current) => ({ ...current, apar_id: { status: "idle" } }));
        setErrors((current) => {
          if (current.apar_id === DUPLICATE_APAR_ID_MESSAGE || current.apar_id?.includes("APAR ID")) {
            const next = { ...current };
            delete next.apar_id;
            return next;
          }
          return current;
        });
      }
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [
    accessToken,
    actualOpen,
    editingUserId,
    lockedEnrollmentInstitutionId,
    selectedRoleIsStudent,
    studentRecords.admission_number,
    studentRecords.apar_id,
  ]);

  useEffect(() => {
    if (!actualOpen || !accessToken || !selectedRoleIsStudent || !lockedEnrollmentInstitutionId) return;

    const timeout = window.setTimeout(() => {
      const candidates = enrollmentDrafts.filter((draft) =>
        draft.program_id &&
        draft.section_id &&
        draft.academic_year_id &&
        isValidRollNumber(draft.roll_number)
      );

      if (!candidates.length) {
        setRollNumberChecks({});
        return;
      }

      setRollNumberChecks((current) => {
        const next = { ...current };
        for (const draft of candidates) next[draft.clientId] = { status: "checking" };
        return next;
      });

      void Promise.all(candidates.map(async (draft) => {
        const params = new URLSearchParams({
          institution_id: lockedEnrollmentInstitutionId,
          program_id: draft.program_id,
          academic_year_id: draft.academic_year_id,
          section_id: draft.section_id,
          roll_number: safeTrim(draft.roll_number),
        });
        if (editingUserId) params.set("exclude_student_user_id", String(editingUserId));

        try {
          const res = await fetch(`/api/admin/students/roll-number-check?${params.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const json = await res.json();
          const message = json.message || DUPLICATE_ROLL_NUMBER_MESSAGE;
          setRollNumberChecks((current) => ({
            ...current,
            [draft.clientId]: { status: res.ok && json.available ? "available" : "taken", message },
          }));
        } catch {
          setRollNumberChecks((current) => ({ ...current, [draft.clientId]: { status: "idle" } }));
        }
      }));
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [
    accessToken,
    actualOpen,
    editingUserId,
    enrollmentDrafts,
    lockedEnrollmentInstitutionId,
    selectedRoleIsStudent,
  ]);

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
    if (selectedRoleIsTeacher || accountNeedsInstitution) {
      return;
    }

    if (
      form.teacher_type ||
      form.under_institution_id ||
      form.under_institution_name ||
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
    accountNeedsInstitution,
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

  useEffect(() => {
    if (!actualOpen || !lockedEnrollmentInstitutionId) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setStudentRecords((prev) => {
      if (prev.enrollment_institution_id === lockedEnrollmentInstitutionId) {
        return prev.enrollment_institution_name === lockedEnrollmentInstitutionName
          ? prev
          : { ...prev, enrollment_institution_name: lockedEnrollmentInstitutionName };
      }

      return {
        ...prev,
        enrollment_institution_id: lockedEnrollmentInstitutionId,
        enrollment_institution_name: lockedEnrollmentInstitutionName,
        program_id: "",
        program_name: "",
        academic_year_id: "",
        academic_year_name: "",
        class_category_id: "",
        class_category_name: "",
        section_id: "",
        section_name: "",
      };
    });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [
    actualOpen,
    lockedEnrollmentInstitutionId,
    lockedEnrollmentInstitutionName,
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
  const [teachingCategoryLoading, setTeachingCategoryLoading] = useState(false);
  const [teachingSubjectLoading, setTeachingSubjectLoading] = useState(false);
  const [teachingSubjectScopeLoading, setTeachingSubjectScopeLoading] = useState(false);
  const [teachingCategoryError, setTeachingCategoryError] = useState<string | null>(null);
  const [teachingSubjectError, setTeachingSubjectError] = useState<string | null>(null);
  const selectedCategoryIds = useMemo(
    () => form.teaching_categories.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0),
    [form.teaching_categories]
  );

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
      if (!accessToken || selectedCategoryIds.length === 0) {
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
    [accessToken, dedupeTeachingSubjectOptions, selectedCategoryIds]
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

  const fetchAcademicYears = useCallback(
    async (search: string, page: number) => {
      if (!accessToken) return { data: [], hasMore: false };
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: "10",
        roleCode: "parent",
        activeOnly: "true",
        pastOrCurrentOnly: "true",
      });
      if (lockedEnrollmentInstitutionId) {
        params.set("institutionId", lockedEnrollmentInstitutionId);
      }
      const res = await fetch(`/api/admin/institutions/academic-years?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch academic years");
      const json = await res.json();
      return { data: json.data ?? [], hasMore: page < (json.pageCount ?? page) };
    },
    [accessToken, lockedEnrollmentInstitutionId]
  );

  const loadCurrentAcademicYear = useCallback(async () => {
    if (!actualOpen || isEdit || !accessToken || !lockedEnrollmentInstitutionId) return;
    if (studentRecords.academic_year_id) return;

    const params = new URLSearchParams({
      page: "1",
      limit: "100",
      institutionId: lockedEnrollmentInstitutionId,
      activeOnly: "true",
      pastOrCurrentOnly: "true",
    });

    try {
      const res = await fetch(`/api/admin/institutions/academic-years?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load current session");
      const rows = (json.data ?? []) as AcademicYearOption[];
      const storedAcademicYearId = getStoredActiveAcademicYearId(lockedEnrollmentInstitutionId);
      const today = new Date().toISOString().slice(0, 10);
      const currentYear =
        rows.find((year) => year.id === storedAcademicYearId) ??
        rows.find((year) => year.start_date <= today && year.end_date >= today) ??
        rows[0] ??
        null;
      if (!currentYear) return;
      setStudentRecords((prev) => prev.academic_year_id
        ? prev
        : {
          ...prev,
          academic_year_id: String(currentYear.id),
          academic_year_name: currentYear.name,
        }
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load current session");
    }
  }, [
    accessToken,
    actualOpen,
    isEdit,
    lockedEnrollmentInstitutionId,
    studentRecords.academic_year_id,
  ]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadCurrentAcademicYear();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadCurrentAcademicYear]);

  const fetchPrograms = useCallback(
    async (search: string, page: number) => {
      if (!accessToken || !lockedEnrollmentInstitutionId) return { data: [], hasMore: false };
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: "15",
        institutionId: lockedEnrollmentInstitutionId,
      });
      const res = await fetch(`/api/admin/institutions/programs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch programs");
      const json = await res.json();
      return { data: json.data ?? [], hasMore: page < (json.pageCount ?? page) };
    },
    [accessToken, lockedEnrollmentInstitutionId]
  );

  const fetchSiblingStudents = useCallback(
    async (search: string, page: number) => {
      if (!accessToken || !lockedEnrollmentInstitutionId) return { data: [], hasMore: false };
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: "10",
        institutionId: lockedEnrollmentInstitutionId,
      });
      if (editingUserId) params.set("excludeUserId", String(editingUserId));

      const res = await fetch(`/api/admin/students/siblings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch sibling students");
      return {
        data: (json.data ?? []) as SiblingStudentOption[],
        hasMore: page < (json.pageCount ?? page),
      };
    },
    [accessToken, editingUserId, lockedEnrollmentInstitutionId]
  );

  const loadProgramDetail = useCallback(async (programId: string) => {
    if (!accessToken || !programId) return;
    const requestId = ++programDetailRequestRef.current;
    setProgramDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/institutions/programs/${programId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (requestId !== programDetailRequestRef.current) return;
      if (!res.ok) throw new Error(json.error ?? "Failed to load program");
      const data = json.data ?? {};
      const nextSections = (data.section_ids ?? []).map((sectionId: number, index: number) => ({
        id: sectionId,
        name: data.section_names?.[index] ?? `Section ${sectionId}`,
      }));
      setProgramSections(nextSections);
      setStudentRecords((prev) => {
        const nextSectionValid = !prev.section_id || nextSections.some((section) => String(section.id) === prev.section_id);
        return {
          ...prev,
          program_id: String(data.id ?? programId),
          program_name: data.title ?? prev.program_name,
          class_category_id: data.picker_category_id ? String(data.picker_category_id) : prev.class_category_id,
          class_category_name: data.picker_category_name ?? prev.class_category_name,
          academic_year_id: data.academic_year_id ? String(data.academic_year_id) : prev.academic_year_id,
          academic_year_name: data.academic_year_name ?? prev.academic_year_name,
          section_id: nextSectionValid ? prev.section_id : "",
          section_name: nextSectionValid ? prev.section_name : "",
        };
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load program");
    } finally {
      if (requestId === programDetailRequestRef.current) setProgramDetailLoading(false);
    }
  }, [accessToken]);

  const loadEnrollmentDraftProgram = useCallback(async (clientId: string, programId: string) => {
    if (!accessToken || !programId) return;
    setEnrollmentDrafts((current) => current.map((draft) =>
      draft.clientId === clientId ? { ...draft, loadingSections: true } : draft
    ));
    try {
      const res = await fetch(`/api/admin/institutions/programs/${programId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load program");
      const data = json.data ?? {};
      let academicYearId = data.academic_year_id ? String(data.academic_year_id) : "";
      let academicYearName = data.academic_year_name ?? "";
      if (!academicYearId && lockedEnrollmentInstitutionId) {
        const params = new URLSearchParams({
          institutionId: lockedEnrollmentInstitutionId,
          activeOnly: "true",
          pastOrCurrentOnly: "true",
          page: "1",
          limit: "100",
        });
        const yearResponse = await fetch(`/api/admin/institutions/academic-years?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const yearJson = await yearResponse.json().catch(() => ({}));
        const rows = (yearJson.data ?? []) as AcademicYearOption[];
        const storedAcademicYearId = getStoredActiveAcademicYearId(lockedEnrollmentInstitutionId);
        const today = new Date().toISOString().slice(0, 10);
        const currentYear =
          rows.find((year) => year.id === storedAcademicYearId) ??
          rows.find((year) => year.start_date <= today && year.end_date >= today) ??
          rows[0];
        if (yearResponse.ok && currentYear) {
          academicYearId = String(currentYear.id);
          academicYearName = currentYear.name;
        }
      }
      const sections = (data.section_ids ?? []).map((sectionId: number, index: number) => ({
        id: sectionId,
        name: data.section_names?.[index] ?? `Section ${sectionId}`,
      }));
      setEnrollmentDrafts((current) => current.map((draft) => draft.clientId === clientId ? {
        ...draft,
        program_id: String(data.id ?? programId),
        program_name: data.title ?? draft.program_name,
        class_category_id: data.picker_category_id ? String(data.picker_category_id) : draft.class_category_id,
        class_category_name: data.picker_category_name ?? draft.class_category_name,
        academic_year_id: academicYearId || draft.academic_year_id,
        academic_year_name: academicYearName || draft.academic_year_name,
        section_id: sections.some((section: SectionOption) => String(section.id) === draft.section_id) ? draft.section_id : "",
        section_name: sections.some((section: SectionOption) => String(section.id) === draft.section_id) ? draft.section_name : "",
        sections,
        loadingSections: false,
      } : draft));
    } catch (error) {
      setEnrollmentDrafts((current) => current.map((draft) =>
        draft.clientId === clientId ? { ...draft, loadingSections: false } : draft
      ));
      toast.error(error instanceof Error ? error.message : "Failed to load program");
    }
  }, [accessToken, lockedEnrollmentInstitutionId]);

  const loadPromotionProgram = useCallback(async (programId: string) => {
    if (!accessToken || !programId) {
      setPromotionSections([]);
      return;
    }
    setPromotionProgramLoading(true);
    try {
      const res = await fetch(`/api/admin/institutions/programs/${programId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load class");
      const data = json.data ?? {};
      const sections = (data.section_ids ?? []).map((sectionId: number, index: number) => ({
        id: sectionId,
        name: data.section_names?.[index] ?? `Section ${sectionId}`,
      }));
      setPromotionSections(sections);
      setPromotionForm((current) => ({
        ...current,
        destinationProgramId: String(data.id ?? programId),
        destinationProgramName: data.title ?? current.destinationProgramName,
        destinationSectionId: sections.some((section: SectionOption) => String(section.id) === current.destinationSectionId)
          ? current.destinationSectionId
          : "",
        destinationSectionName: sections.some((section: SectionOption) => String(section.id) === current.destinationSectionId)
          ? current.destinationSectionName
          : "",
      }));
    } catch (error) {
      setPromotionSections([]);
      toast.error(error instanceof Error ? error.message : "Failed to load class");
    } finally {
      setPromotionProgramLoading(false);
    }
  }, [accessToken]);

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
        const options = dedupeTeachingSubjectOptions((json.data ?? []).map((item: { id: number; name: string }) => {
          const value = String(item.id);
          nextAllowed.add(value);
          return {
            id: item.id,
            value,
            label: item.name,
          };
        }));

        if (cancelled) {
          return;
        }

        setTeachingSubjectOptionsCache((prev) => {
          const next = new Map(prev.map((option) => [option.value, option] as const));
          for (const option of options) next.set(option.value, option);
          return dedupeTeachingSubjectOptions(Array.from(next.values()));
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
  }, [accessToken, actualOpen, dedupeTeachingSubjectOptions, selectedCategoryIds]);

  useEffect(() => {
    if (!actualOpen || !studentRecords.program_id) return;
    const timeout = window.setTimeout(() => {
      void loadProgramDetail(studentRecords.program_id);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [actualOpen, loadProgramDetail, studentRecords.program_id]);

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

  const getDefaultStudentForm = useCallback(() => {
    const nextForm = getInitialForm(roles, user);
    if (!isEdit && defaultStudentRole) {
      nextForm.role_id = String(defaultStudentRole.id);
      nextForm.is_teacher = false;
      nextForm.teacher_type = "";
    }
    return applyPreferredInstitution(nextForm);
  }, [applyPreferredInstitution, defaultStudentRole, isEdit, roles, user]);

  const resetForm = () => {
    setActiveStep(0);
    setErrors({});
    setPasswordErrors({});
    setPasswordForm({ password: "", confirmPassword: "" });
    setForm(getDefaultStudentForm());
    setStudentRecords(applyPreferredEnrollment(blankStudentRecords()));
    setSavedEnrollments([]);
    setEnrollmentDrafts([blankEnrollmentDraft()]);
    setEnablePromotion(false);
    setUseSiblingGuardians(false);
    setSiblingStudentId("");
    setSiblingStudentLabel("");
    setSavedUploadPublicIds(new Set());
  };

  async function cleanupUnsavedUploads() {
    if (!accessToken) return;
    const unsavedFiles = studentRecords.documents
      .flatMap((document) => getDocumentFiles(document))
      .filter((file) => file.publicId && !savedUploadPublicIds.has(file.publicId));
    await Promise.all(
      unsavedFiles.map((file) =>
        fetch("/api/admin/uploads/documents/delete", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            publicId: file.publicId,
            resourceType: file.resourceType || "image",
          }),
        }).catch(() => undefined)
      )
    );
  }

  const setDialogOpen = (nextOpen: boolean) => {
    if (!nextOpen && !submitting) {
      void cleanupUnsavedUploads();
    }
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
      setForm(getDefaultStudentForm());
      setStudentRecords(applyPreferredEnrollment(blankStudentRecords()));
      setEnablePromotion(false);
      setUseSiblingGuardians(false);
      setSiblingStudentId("");
      setSiblingStudentLabel("");
      setSavedUploadPublicIds(new Set());
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [
    actualOpen,
    applyPreferredEnrollment,
    getDefaultStudentForm,
  ]);

  useEffect(() => {
    if (!actualOpen || !initialStudentRecords) return;

    const timeout = window.setTimeout(() => {
      applyStudentRecordsData(initialStudentRecords);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [actualOpen, applyStudentRecordsData, initialStudentRecords]);

  useEffect(() => {
    if (!actualOpen || !accessToken || !user?.id || initialStudentRecords) return;

    let cancelled = false;
    const loadStudentRecords = async () => {
      try {
        const enrollments = await loadLatestStudentRecords();
        if (cancelled) return;
        if (!enrollments) return;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load student records");
      }
    };

    loadStudentRecords();
    return () => {
      cancelled = true;
    };
  }, [accessToken, actualOpen, initialStudentRecords, loadLatestStudentRecords, user?.id]);

  useEffect(() => {
    if (!actualOpen || !user) {
      return;
    }

    const teachingCategories = user.teaching_categories.map((category) => String(category.id));
    const teachingSubjects = user.teaching_subjects.map((subject) => String(subject.id));

    const timeout = window.setTimeout(() => {
      setForm((prev) => ({
        ...prev,
        is_teacher: user.profile.is_teacher ?? false,
        teacher_type: user.profile.teacher_type ?? "",
        under_institution_id: user.profile.under_institution_id
          ? String(user.profile.under_institution_id)
          : "",
        under_institution_name: user.profile.under_institution_name ?? "",
        designation_id: user.profile.designation_id
          ? String(user.profile.designation_id)
          : "",
        designation_name: user.profile.designation_name ?? "",
        teaching_categories: teachingCategories,
        teaching_subjects: teachingSubjects,
      }));

      setTeachingCategoryOptions(
        user.teaching_categories.map((category) => ({
          id: category.id,
          value: String(category.id),
          label: category.name,
        }))
      );

      setTeachingSubjectOptionsCache(
        dedupeTeachingSubjectOptions(user.teaching_subjects.map((subject) => ({
          id: subject.id,
          value: String(subject.id),
          label: subject.name,
        })))
      );
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [actualOpen, dedupeTeachingSubjectOptions, user]);

  useEffect(() => {
    if (!actualOpen || !isEdit) return;
    const timeout = window.setTimeout(() => {
      const source = activePromotionEnrollments[0];
      if (!source) {
        setPromotionForm(blankPromotionForm());
        return;
      }
      setPromotionForm((current) => {
        if (current.sourceEnrollmentId && activePromotionEnrollments.some((item) => String(item.id) === current.sourceEnrollmentId)) {
          return current;
        }
        return {
          ...current,
          sourceEnrollmentId: String(source.id),
          destinationProgramId: source.program_id ? String(source.program_id) : "",
          destinationProgramName: source.program_name ?? "",
          destinationSectionId: source.section_id ? String(source.section_id) : "",
          destinationSectionName: source.section_name ?? "",
        };
      });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activePromotionEnrollments, actualOpen, isEdit]);

  useEffect(() => {
    if (!selectedPromotionSource) return;
    if (promotionForm.outcome === "promoted") return;
    if (!promotionCreatesEnrollment) return;

    const timeout = window.setTimeout(() => {
      setPromotionForm((current) => ({
        ...current,
        destinationProgramId: selectedPromotionSource.program_id ? String(selectedPromotionSource.program_id) : "",
        destinationProgramName: selectedPromotionSource.program_name ?? "",
        destinationSectionId: selectedPromotionSource.section_id ? String(selectedPromotionSource.section_id) : "",
        destinationSectionName: selectedPromotionSource.section_name ?? "",
      }));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [promotionCreatesEnrollment, promotionForm.outcome, selectedPromotionSource]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!actualOpen || !promotionForm.destinationProgramId) {
        setPromotionSections([]);
        return;
      }
      void loadPromotionProgram(promotionForm.destinationProgramId);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [actualOpen, loadPromotionProgram, promotionForm.destinationProgramId]);

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

      if (accountNeedsInstitution && showAccountInstitution && !form.under_institution_id) {
        nextErrors.under_institution_id = "Select an institution from the switcher.";
      }

    }

    if (stepIndex === 1) {
      if (
        showHourlyCharges &&
        safeTrim(form.hourly_charges) &&
        Number.isNaN(Number(form.hourly_charges))
      ) {
        nextErrors.hourly_charges = "Enter a valid amount.";
      }

      if (selectedRoleIsTeacher && !form.teacher_type) {
        nextErrors.teacher_type = "Select a teacher type.";
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

    if (stepIndex === studentProfileStepIndex && selectedRoleIsStudent) {
      if (safeTrim(studentRecords.roll_number) && !isValidRollNumber(studentRecords.roll_number)) {
        nextErrors.roll_number = ROLL_NUMBER_ERROR;
      }
      if (identifierChecks.admission_number.status === "taken") {
        nextErrors.admission_number = identifierChecks.admission_number.message ?? DUPLICATE_ADMISSION_NUMBER_MESSAGE;
      }
      if (identifierChecks.apar_id.status === "taken") {
        nextErrors.apar_id = identifierChecks.apar_id.message ?? DUPLICATE_APAR_ID_MESSAGE;
      }
    }

    if (stepIndex === guardiansStepIndex) {
      studentRecords.guardians.forEach((guardian, index) => {
        const hasValues = hasAnyValue([
          guardian.guardian_name,
          guardian.guardian_email,
          guardian.guardian_phone,
          guardian.relationship,
          guardian.password,
          guardian.confirm_password,
        ]);
        if (!hasValues) return;

        if (safeTrim(guardian.guardian_name).length < 2) {
          nextErrors[`guardian.${index}.guardian_name`] = "Enter guardian full name.";
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeTrim(guardian.guardian_email))) {
          nextErrors[`guardian.${index}.guardian_email`] = "Enter a valid email.";
        }
        const phone = safeTrim(guardian.guardian_phone).replace(/\D/g, "");
        if (!/^\d{10}$/.test(phone)) {
          nextErrors[`guardian.${index}.guardian_phone`] = "Phone must be exactly 10 digits.";
        }
        if (safeTrim(guardian.relationship).length < 2) {
          nextErrors[`guardian.${index}.relationship`] = "Enter relationship.";
        }
        if (!guardian.guardian_user_id || guardian.password || guardian.confirm_password) {
          if (guardian.password.length < 6) {
            nextErrors[`guardian.${index}.password`] = "Password must be at least 6 characters.";
          }
          if (guardian.password !== guardian.confirm_password) {
            nextErrors[`guardian.${index}.confirm_password`] = "Passwords do not match.";
          }
        }
      });
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
          education.institution_name,
          education.from_year,
          education.to_year,
        ]);

        if (!hasValues) return;

        if (!safeTrim(education.qualification)) {
          nextErrors[`education.${index}.qualification`] = "Required.";
        }
        if (!safeTrim(education.institution_name)) {
          nextErrors[`education.${index}.institution_name`] = "Required.";
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

    return {
      full_name: normalizeText(form.full_name),
      email: normalizeEmail(form.email),
      phone: safeTrim(form.phone) || null,
      avatar_url: safeTrim(form.avatar_url) || null,
      role_id: form.role_id ? Number(form.role_id) : (defaultStudentRole ? Number(defaultStudentRole.id) : null),
      is_active: form.is_active,
      is_verified: form.is_verified,
      is_profile_complete: form.is_profile_complete,
      profile: {
        about: normalizeNullableText(form.about),
        is_teacher: selectedRoleIsTeacher,
        teacher_type: selectedRoleIsTeacher ? form.teacher_type || "individual_teacher" : null,
        under_institution_id:
          (accountNeedsInstitution || selectedRoleIsTeacher) && form.under_institution_id
            ? Number(form.under_institution_id)
            : null,
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
        institution_name: normalizeText(education.institution_name),
        from_year: Number(education.from_year),
        to_year: Number(education.to_year),
      })),
      certifications: compactCertifications.map((certification) => ({
        name: normalizeText(certification.name),
        issued_authority: normalizeNullableText(certification.issued_authority),
        duration: normalizeNullableText(certification.duration),
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
    };
  };

  const assignEnrollmentDraft = () => {
    if (!studentRecords.program_id || !studentRecords.section_id || !studentRecords.academic_year_id || !studentRecords.class_category_id) {
      toast.error("Select program, section, and academic year before assigning.");
      return;
    }
    if (!safeTrim(studentRecords.roll_number)) {
      toast.error("Enter the roll number before assigning.");
      return;
    }
    if (!isValidRollNumber(studentRecords.roll_number)) {
      toast.error(ROLL_NUMBER_ERROR);
      return;
    }

    const matchingEnrollment = savedEnrollments.find((enrollment) =>
      String(enrollment.program_id ?? "") === studentRecords.program_id &&
      String(enrollment.academic_year_id ?? "") === studentRecords.academic_year_id
    );
    const draft: StudentEnrollmentRecord = {
      id: matchingEnrollment?.id ?? null,
      institution_id: lockedEnrollmentInstitutionId ? Number(lockedEnrollmentInstitutionId) : null,
      institution_name: lockedEnrollmentInstitutionName,
      program_id: Number(studentRecords.program_id),
      program_name: studentRecords.program_name,
      academic_year_id: Number(studentRecords.academic_year_id),
      academic_year_name: studentRecords.academic_year_name,
      class_category_id: Number(studentRecords.class_category_id),
      class_category_name: studentRecords.class_category_name,
      section_id: Number(studentRecords.section_id),
      section_name: studentRecords.section_name,
      roll_number: safeTrim(studentRecords.roll_number),
      admission_date: studentRecords.admission_date || null,
      status: studentRecords.status || "active",
      remarks: studentRecords.remarks || null,
    };
    setSavedEnrollments((current) => {
      const index = current.findIndex((enrollment) =>
        String(enrollment.program_id ?? "") === studentRecords.program_id &&
        String(enrollment.academic_year_id ?? "") === studentRecords.academic_year_id
      );
      if (index < 0) return [...current, draft];
      return current.map((enrollment, itemIndex) => itemIndex === index ? draft : enrollment);
    });
    toast.success(matchingEnrollment ? "Program assignment updated in the draft." : "Program added to the enrollment draft.");
    setStudentRecords((previous) => ({
      ...previous,
      program_id: "",
      program_name: "",
      section_id: "",
      section_name: "",
      class_category_id: "",
      class_category_name: "",
      roll_number: "",
      remarks: "",
    }));
  };

  const buildStudentRecordsPayload = () => {
    const selectedGuardians = studentRecords.guardians.filter((guardian) =>
      guardian.guardian_user_id ||
      (guardian.guardian_name.trim() && guardian.guardian_email.trim())
    );
    const emergencyGuardian =
      selectedGuardians.find((guardian) => guardian.is_primary) ??
      selectedGuardians[0] ??
      null;
    const emergencyPhone = emergencyGuardian?.guardian_phone.replace(/\D/g, "").slice(-10) || null;
    const enrollmentPayloads = enrollmentDrafts.map((enrollment) => ({
      id: enrollment.id ?? null,
      institution_id: lockedEnrollmentInstitutionId ? Number(lockedEnrollmentInstitutionId) : null,
      program_id: enrollment.program_id ? Number(enrollment.program_id) : null,
      academic_year_id: enrollment.academic_year_id ? Number(enrollment.academic_year_id) : null,
      class_category_id: enrollment.class_category_id ? Number(enrollment.class_category_id) : null,
      section_id: enrollment.section_id ? Number(enrollment.section_id) : null,
      roll_number: safeTrim(enrollment.roll_number ?? "") || null,
      admission_date: isParentMode ? null : (enrollment.admission_date || studentRecords.admission_date || null),
      status: enrollment.status || "active",
      remarks: normalizeNullableText(enrollment.remarks ?? ""),
    }));

    return ({
    profile: {
      admission_number: safeTrim(studentRecords.admission_number).toUpperCase() || null,
      apar_id: safeTrim(studentRecords.apar_id).toUpperCase() || null,
      date_of_birth: studentRecords.date_of_birth || null,
      blood_group: safeTrim(studentRecords.blood_group).toUpperCase() || null,
      emergency_contact_name: emergencyGuardian ? normalizeNullableText(emergencyGuardian.guardian_name) : null,
      emergency_contact_phone: emergencyPhone && emergencyPhone.length === 10 ? emergencyPhone : null,
    },
    enrollment: {
      institution_id: lockedEnrollmentInstitutionId ? Number(lockedEnrollmentInstitutionId) : null,
      program_id: studentRecords.program_id ? Number(studentRecords.program_id) : null,
      academic_year_id: studentRecords.academic_year_id ? Number(studentRecords.academic_year_id) : null,
      class_category_id: studentRecords.class_category_id ? Number(studentRecords.class_category_id) : null,
      section_id: studentRecords.section_id ? Number(studentRecords.section_id) : null,
      roll_number: safeTrim(studentRecords.roll_number) || null,
      admission_date: isParentMode ? null : (studentRecords.admission_date || null),
      status: studentRecords.status || "active",
      remarks: normalizeNullableText(studentRecords.remarks),
    },
    enrollments: enrollmentPayloads,
    guardians: studentRecords.guardians
      .filter((guardian) =>
        guardian.relationship.trim() &&
        (
          guardian.guardian_user_id ||
          (guardian.guardian_name.trim() && guardian.guardian_email.trim())
        )
      )
      .map((guardian) => ({
        guardian_user_id: guardian.guardian_user_id ? Number(guardian.guardian_user_id) : null,
        full_name: normalizeText(guardian.guardian_name),
        email: normalizeEmail(guardian.guardian_email),
        phone: safeTrim(guardian.guardian_phone).replace(/\D/g, "").slice(-10) || null,
        password: guardian.password || null,
        confirm_password: guardian.confirm_password || null,
        relationship: normalizeText(guardian.relationship),
        is_primary: guardian.is_primary,
      })),
    documents: studentRecords.documents
      .filter((document) => document.document_type.trim() && getDocumentFiles(document).length > 0)
      .flatMap((document) =>
        getDocumentFiles(document).map((file) => ({
          document_type: safeTrim(document.document_type).toUpperCase(),
          document_number: safeTrim(document.document_number).toUpperCase() || null,
          file_url: safeTrim(file.url),
          public_id: safeTrim(file.publicId) || null,
          resource_type: safeTrim(file.resourceType) || null,
          is_verified: document.is_verified,
        }))
      ),
    });
  };

  const saveStudentRecords = async (studentUserId: number) => {
    if (!accessToken) return;
    const res = await fetch(`/api/admin/student-records/${studentUserId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildStudentRecordsPayload()),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(
        getApiErrorMessage(json, "You don't have permission to edit student records.")
      );
    }
  };

  const handlePromotionSubmit = async () => {
    if (!accessToken || !user?.id) {
      toast.error("Session expired. Please log in again.");
      return;
    }
    if (!promotionForm.sourceEnrollmentId) {
      toast.error("Select the current enrollment to process.");
      return;
    }
    if (promotionCreatesEnrollment) {
      if (!promotionForm.destinationAcademicYearId || !promotionForm.destinationProgramId) {
        toast.error("Select destination session and class.");
        return;
      }
      if (promotionForm.rollNumber && !isValidRollNumber(promotionForm.rollNumber)) {
        toast.error(ROLL_NUMBER_ERROR);
        return;
      }
    }

    setPromotionSubmitting(true);
    try {
      const res = await fetch(`/api/admin/students/${user.id}/promotion`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceEnrollmentId: Number(promotionForm.sourceEnrollmentId),
          outcome: promotionForm.outcome,
          destinationAcademicYearId: promotionCreatesEnrollment ? Number(promotionForm.destinationAcademicYearId) : null,
          destinationProgramId: promotionCreatesEnrollment ? Number(promotionForm.destinationProgramId) : null,
          destinationSectionId: promotionCreatesEnrollment && promotionForm.destinationSectionId ? Number(promotionForm.destinationSectionId) : null,
          rollNumber: promotionCreatesEnrollment && promotionForm.rollNumber ? promotionForm.rollNumber : null,
          admissionDate: promotionCreatesEnrollment ? promotionForm.admissionDate : null,
          notes: normalizeNullableText(promotionForm.notes),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(getApiErrorMessage(json, "Failed to process promotion"));
      }

      toast.success(`${promotionOutcomeLabels[promotionForm.outcome]} saved.`);
      const latestEnrollments = await loadLatestStudentRecords();
      const nextEnrollment = latestEnrollments?.find((enrollment) =>
        enrollment.id &&
        enrollment.status === "active" &&
        String(enrollment.id) !== promotionForm.sourceEnrollmentId
      );
      if (nextEnrollment) {
        selectEnrollmentForPromotion(nextEnrollment);
      } else {
        setEnablePromotion(false);
        setPromotionForm(blankPromotionForm());
      }
      setActiveStep(promotionStepIndex);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process promotion");
    } finally {
      setPromotionSubmitting(false);
    }
  };

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
      const res = await fetch(isEdit && user ? `/api/admin/users/detail?id=${user.id}` : "/api/admin/students", {
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
              ? "You don't have permission to edit students."
              : "You don't have permission to create students."
          )
        );
      }

      const savedStudentId = Number(json.data?.id ?? user?.id);
      if (Number.isInteger(savedStudentId) && savedStudentId > 0) {
        await saveStudentRecords(savedStudentId);
      }
      setSavedUploadPublicIds(new Set(studentRecords.documents.flatMap((document) => getDocumentFiles(document).map((file) => file.publicId)).filter(Boolean)));

      toast.success(isEdit ? "Student updated successfully" : "Student added successfully");
      setDialogOpen(false);
      resetForm();
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save student");
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

  return (
    <Dialog
      open={actualOpen}
      onOpenChange={(nextOpen) => {
        setDialogOpen(nextOpen);
        if (nextOpen) {
          setForm((prev) => ({
            ...prev,
            role_id:
              !isEdit && defaultStudentRole
                ? String(defaultStudentRole.id)
                : prev.role_id || (defaultStudentRole ? String(defaultStudentRole.id) : ""),
          }));
          return;
        }

        if (!submitting) resetForm();
      }}
    >
      {mode !== "edit" && (
        <DialogTrigger asChild>
          <Button
            className="gap-2 shrink-0 bg-[#D91B1B] hover:bg-[#b91515] text-white font-semibold"
            onClick={(event) => {
              if (!canCreateStudents) {
                event.preventDefault();
                toast.error("You don't have permission to create students.");
                return;
              }
              if (isControlled && onOpenChange) {
                onOpenChange(true);
              }
            }}
          >
            <UserPlus className="size-4" />
            Add Student
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
            {isEdit ? "Edit Student" : "Add Student"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this student profile and background details."
              : "Create a student profile from the admin backend."}
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
                <Label htmlFor="add-user-gender">Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(value) => updateForm("gender", value)}
                >
                  <SelectTrigger id="add-user-gender" className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_GENDER}>Not specified</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">
                      Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
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
                    const nextRoleCanHaveDesignation =
                      nextRole?.code === "institution_admin" || nextRoleIsTeacher;
                    setForm((prev) => ({
                      ...prev,
                      role_id: value,
                      is_teacher: nextRoleIsTeacher,
                      teacher_type: nextRoleIsTeacher
                        ? "institute_teacher"
                        : "",
                      ...(nextRoleIsInstitutionScoped && !nextRoleIsTeacher
                        ? {
                          designation_id: nextRoleCanHaveDesignation ? prev.designation_id : "",
                          designation_name: nextRoleCanHaveDesignation ? prev.designation_name : "",
                          teaching_categories: [],
                          teaching_subjects: [],
                          hourly_charges: "",
                        }
                        : {
                          under_institution_id: nextRoleIsTeacher && prev.teacher_type === "institute_teacher"
                            ? prev.under_institution_id
                            : "",
                          under_institution_name: nextRoleIsTeacher && prev.teacher_type === "institute_teacher"
                            ? prev.under_institution_name
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
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              )}
              {showAccountInstitution && (
                <div className="space-y-1.5">
                  <Label>Institution</Label>
                  <AsyncSearchPopover<InstitutionOption>
                    value={form.under_institution_id}
                    onChange={(value) => updateForm("under_institution_id", value)}
                    placeholder="Select institution"
                    searchPlaceholder="Search institution..."
                    emptyText="No institution found"
                    selectedLabel={form.under_institution_name}
                    fetcher={fetchInstitutions}
                    getValue={(item) => String(item.id)}
                    getLabel={(item) => item.name}
                    onSelectItem={(item) => {
                      updateForm("under_institution_id", String(item.id));
                      updateForm("under_institution_name", item.name);
                    }}
                    renderItem={(item) => (
                      <div className="min-w-0">
                        <div className="truncate font-medium">{item.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{item.slug}</div>
                      </div>
                    )}
                  />
                  <FieldError message={errors.under_institution_id} />
                </div>
              )}
              <div className="sm:col-span-2">
                <ImageUploader
                  label="Avatar image"
                  value={form.avatar_url}
                  onChange={(url) => updateForm("avatar_url", url)}
                  accessToken={accessToken}
                />
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
                  <Label htmlFor="add-user-verified" className="cursor-pointer">
                    Verified
                  </Label>
                </div>
              </div>
              )}
            </div>
          )}

          {selectedRoleIsStudent && activeStep === informationStepIndex && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="info-admission-number">Admission Number</Label>
                <Input
                  id="info-admission-number"
                  value={studentRecords.admission_number}
                  onChange={(e) => setStudentRecords((prev) => ({ ...prev, admission_number: e.target.value }))}
                  placeholder="ADM-2026-001"
                />
                <FieldError message={errors.admission_number} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="info-apar-id">APAR ID</Label>
                <Input
                  id="info-apar-id"
                  value={studentRecords.apar_id}
                  onChange={(e) => setStudentRecords((prev) => ({ ...prev, apar_id: e.target.value }))}
                  placeholder="APAR ID"
                />
                <FieldError message={errors.apar_id} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="info-dob">Date of Birth</Label>
                <Input
                  id="info-dob"
                  type="date"
                  value={studentRecords.date_of_birth}
                  onChange={(e) => setStudentRecords((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="info-blood-group">Blood Group</Label>
                <Select
                  value={studentRecords.blood_group}
                  onValueChange={(val) => setStudentRecords((prev) => ({ ...prev, blood_group: val }))}
                >
                  <SelectTrigger id="info-blood-group">
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="info-admission-date">Admission Date</Label>
                <Input
                  id="info-admission-date"
                  type="date"
                  value={studentRecords.admission_date}
                  onChange={(e) => setStudentRecords((prev) => ({ ...prev, admission_date: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Transfer Certificate Upload</Label>
                <div className="rounded-md border border-dashed p-4 bg-muted/20 text-center space-y-2">
                  <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Upload Transfer Certificate Document</p>
                  <p className="text-xs text-muted-foreground">PDF, PNG, JPG up to 10MB</p>
                  <Input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="max-w-xs mx-auto text-xs"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        toast.info(`Selected Transfer Certificate: ${file.name}`);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="info-remarks">Remarks</Label>
                <Textarea
                  id="info-remarks"
                  value={studentRecords.remarks}
                  onChange={(e) => setStudentRecords((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Enrollment remarks / profile notes"
                  className="min-h-20"
                />
              </div>
            </div>
          )}

          {!selectedRoleIsStudent && activeStep === 1 && (
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="add-user-about">About</Label>
                <Textarea
                  id="add-user-about"
                  value={form.about}
                  onChange={(event) => updateForm("about", event.target.value)}
                  placeholder="Short profile summary"
                  className="min-h-28"
                />
              </div>
            </div>
          )}

          {activeStep === locationStepIndex && (
            <div className="space-y-4">
              <GoogleLocationPicker
                value={form.location}
                onChange={(location) => {
                  setForm((prev) => ({
                    ...prev,
                    location,
                    full_address: location.full_address,
                  }));
                }}
              />
              <div className="space-y-1.5">
                <Label htmlFor="add-user-address">Full address</Label>
                <Textarea
                  id="add-user-address"
                  value={form.full_address}
                  onChange={(event) =>
                    updateForm("full_address", event.target.value)
                  }
                  placeholder="Full address"
                  className="min-h-20"
                />
              </div>
            </div>
          )}

          {activeStep === backgroundStepIndex && (
            <div className="space-y-5">
              <FormSection
                title="Experience"
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateForm("experiences", [
                        ...form.experiences,
                        blankExperience(),
                      ])
                    }
                  >
                    <Plus className="size-4" />
                    Add
                  </Button>
                }
              >
                {form.experiences.length === 0 && (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    No experience added.
                  </p>
                )}
                {form.experiences.map((experience, index) => (
                  <ExperienceCard
                    key={experience.id}
                    experience={experience}
                    index={index}
                    errors={errors}
                    accessToken={accessToken}
                    onChange={(patch) => setExperience(index, patch)}
                    onDelete={() =>
                      updateForm(
                        "experiences",
                        form.experiences.filter((item) => item.id !== experience.id)
                      )
                    }
                  />
                ))}
              </FormSection>

              <FormSection
                title="Education"
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateForm("education", [...form.education, blankEducation()])
                    }
                  >
                    <Plus className="size-4" />
                    Add
                  </Button>
                }
              >
                {form.education.length === 0 && (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    No education added.
                  </p>
                )}
                {form.education.map((education, index) => (
                  <EducationCard
                    key={education.id}
                    education={education}
                    index={index}
                    errors={errors}
                    accessToken={accessToken}
                    onChange={(patch) => setEducation(index, patch)}
                    onDelete={() =>
                      updateForm(
                        "education",
                        form.education.filter((item) => item.id !== education.id)
                      )
                    }
                  />
                ))}
              </FormSection>

              <FormSection
                title="Certifications"
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateForm("certifications", [
                        ...form.certifications,
                        blankCertification(),
                      ])
                    }
                  >
                    <Plus className="size-4" />
                    Add
                  </Button>
                }
              >
                {form.certifications.length === 0 && (
                  <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    No certifications added.
                  </p>
                )}
                {form.certifications.map((certification, index) => (
                  <CertificationCard
                    key={certification.id}
                    certification={certification}
                    index={index}
                    errors={errors}
                    onChange={(patch) => setCertification(index, patch)}
                    onDelete={() =>
                      updateForm(
                        "certifications",
                        form.certifications.filter(
                          (item) => item.id !== certification.id
                        )
                      )
                    }
                  />
                ))}
              </FormSection>
            </div>
          )}

          {activeStep === studentProfileStepIndex && (
            <div className="grid gap-4 sm:grid-cols-2">

              {false && isEdit && (
                <div className="space-y-4 rounded-md border bg-background/35 p-4 sm:col-span-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-semibold">
                        <GraduationCap className="size-4 text-primary" />
                        Promotion
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Create the next session enrollment or close this enrollment as graduated or transferred.
                      </p>
                    </div>
                    {selectedPromotionSource?.promotion_type || selectedPromotionSource?.promoted_at ? (
                      <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                        {selectedPromotionSource.promotion_type ?? "Processed"}
                      </span>
                    ) : null}
                  </div>

                  <label className="flex w-fit items-center gap-2 rounded-md border bg-background/50 px-3 py-2 text-sm font-medium">
                    <Checkbox
                      checked={enablePromotion}
                      onCheckedChange={(value) => setEnablePromotion(Boolean(value))}
                    />
                    Process promotion for this student
                  </label>

                  {enablePromotion ? activePromotionEnrollments.length === 0 ? (
                    <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      No active saved enrollment is available for promotion.
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label>Current Enrollment</Label>
                        <Select
                          value={promotionForm.sourceEnrollmentId}
                          onValueChange={(value) => {
                            const source = activePromotionEnrollments.find((item) => String(item.id) === value);
                            setPromotionForm((current) => ({
                              ...current,
                              sourceEnrollmentId: value,
                              destinationProgramId: source?.program_id ? String(source.program_id) : current.destinationProgramId,
                              destinationProgramName: source?.program_name ?? current.destinationProgramName,
                              destinationSectionId: source?.section_id ? String(source.section_id) : current.destinationSectionId,
                              destinationSectionName: source?.section_name ?? current.destinationSectionName,
                            }));
                          }}
                        >
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select enrollment" /></SelectTrigger>
                          <SelectContent>
                            {activePromotionEnrollments.map((enrollment) => (
                              <SelectItem key={enrollment.id} value={String(enrollment.id)}>
                                {enrollment.program_name ?? "Class"} - {enrollment.section_name ?? "No section"} - {enrollment.academic_year_name ?? "Session"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Outcome</Label>
                        <Select
                          value={promotionForm.outcome}
                          onValueChange={(value) => setPromotionForm((current) => ({
                            ...current,
                            outcome: value as PromotionOutcome,
                          }))}
                        >
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(promotionOutcomeLabels) as PromotionOutcome[]).map((outcome) => (
                              <SelectItem key={outcome} value={outcome}>
                                {promotionOutcomeLabels[outcome]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {promotionCreatesEnrollment && (
                        <>
                          <div className="space-y-1.5">
                            <Label>Destination Session</Label>
                            <AsyncSearchPopover<AcademicYearOption>
                              value={promotionForm.destinationAcademicYearId}
                              selectedLabel={promotionForm.destinationAcademicYearName}
                              disabled={!lockedEnrollmentInstitutionId}
                              onChange={(value) => setPromotionForm((current) => ({
                                ...current,
                                destinationAcademicYearId: value,
                                destinationAcademicYearName: value ? current.destinationAcademicYearName : "",
                              }))}
                              onSelectItem={(year) => setPromotionForm((current) => ({
                                ...current,
                                destinationAcademicYearId: String(year.id),
                                destinationAcademicYearName: year.name,
                              }))}
                              placeholder="Select destination session"
                              searchPlaceholder="Search sessions..."
                              fetcher={fetchAcademicYears}
                              getValue={(item) => String(item.id)}
                              getLabel={(item) => item.name}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label>Destination Class</Label>
                            <AsyncSearchPopover<ProgramOption>
                              value={promotionForm.destinationProgramId}
                              selectedLabel={promotionForm.destinationProgramName}
                              disabled={!lockedEnrollmentInstitutionId || promotionForm.outcome !== "promoted"}
                              onChange={(value) => {
                                setPromotionForm((current) => ({
                                  ...current,
                                  destinationProgramId: value,
                                  destinationProgramName: value ? current.destinationProgramName : "",
                                  destinationSectionId: "",
                                  destinationSectionName: "",
                                }));
                                if (value) void loadPromotionProgram(value);
                              }}
                              onSelectItem={(program) => {
                                setPromotionForm((current) => ({
                                  ...current,
                                  destinationProgramId: String(program.id),
                                  destinationProgramName: program.title,
                                  destinationSectionId: "",
                                  destinationSectionName: "",
                                }));
                                void loadPromotionProgram(String(program.id));
                              }}
                              placeholder="Select class..."
                              searchPlaceholder="Search classes..."
                              fetcher={fetchPrograms}
                              getValue={(item) => String(item.id)}
                              getLabel={(item) => item.title}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label>Destination Section</Label>
                            <Select
                              value={promotionForm.destinationSectionId}
                              onValueChange={(value) => {
                                const section = promotionSections.find((item) => String(item.id) === value);
                                setPromotionForm((current) => ({
                                  ...current,
                                  destinationSectionId: value,
                                  destinationSectionName: section?.name ?? "",
                                }));
                              }}
                              disabled={!promotionForm.destinationProgramId || promotionProgramLoading || !promotionSections.length}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={promotionProgramLoading ? "Loading sections..." : "Select section"} />
                              </SelectTrigger>
                              <SelectContent>
                                {promotionSections.map((section) => (
                                  <SelectItem key={section.id} value={String(section.id)}>
                                    {section.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label>New Roll Number</Label>
                            <Input
                              value={promotionForm.rollNumber}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              onChange={(event) => setPromotionForm((current) => ({
                                ...current,
                                rollNumber: normalizeRollNumberInput(event.target.value),
                              }))}
                              placeholder="Optional"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label>Effective Date</Label>
                            <DatePicker
                              value={promotionForm.admissionDate}
                              onChange={(value) => setPromotionForm((current) => ({
                                ...current,
                                admissionDate: value,
                              }))}
                              placeholder="Select date"
                              fromYear={CURRENT_YEAR}
                              toYear={CURRENT_YEAR + 1}
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                        <Label>Notes</Label>
                        <Textarea
                          value={promotionForm.notes}
                          onChange={(event) => setPromotionForm((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))}
                          placeholder="Optional promotion remarks"
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-end sm:col-span-2 lg:col-span-3">
                        <Button
                          type="button"
                          onClick={handlePromotionSubmit}
                          disabled={promotionSubmitting}
                        >
                          {promotionSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Repeat2 className="size-4" />}
                          Save Promotion
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {false && savedEnrollments.length > 0 && (
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Program Enrollments</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStudentRecords((previous) => ({
                          ...previous,
                          program_id: "",
                          program_name: "",
                          section_id: "",
                          section_name: "",
                          class_category_id: "",
                          class_category_name: "",
                          roll_number: "",
                          remarks: "",
                          status: "active",
                        }));
                      }}
                    >
                      <Plus className="size-4" /> Assign More Program
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    These assignments stay in this form until you save the student. Click one to edit its section or roll number.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {savedEnrollments.map((enrollment, index) => (
                      <div
                        key={`${enrollment.program_id}-${enrollment.academic_year_id}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-md border bg-background/40 p-3"
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => {
                            setStudentRecords((previous) => ({
                              ...previous,
                              program_id: enrollment.program_id ? String(enrollment.program_id) : "",
                              program_name: enrollment.program_name ?? "",
                              academic_year_id: enrollment.academic_year_id ? String(enrollment.academic_year_id) : "",
                              academic_year_name: enrollment.academic_year_name ?? "",
                              class_category_id: enrollment.class_category_id ? String(enrollment.class_category_id) : "",
                              class_category_name: enrollment.class_category_name ?? "",
                              section_id: enrollment.section_id ? String(enrollment.section_id) : "",
                              section_name: enrollment.section_name ?? "",
                              roll_number: enrollment.roll_number ?? "",
                              admission_date: admissionDateValue(enrollment.admission_date),
                              status: enrollment.status ?? "active",
                              remarks: enrollment.remarks ?? "",
                            }));
                          }}
                        >
                          <span className="block truncate text-sm font-semibold">
                            {enrollment.program_name ?? `Program ${enrollment.program_id}`} · {enrollment.section_name || "No section"}
                          </span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            Roll {enrollment.roll_number || "—"} · {enrollment.academic_year_name || "No session"}
                          </span>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove program assignment"
                          onClick={() => setSavedEnrollments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {false && (<>
              <div className="space-y-1.5">
                <Label>Program / Class</Label>
                <AsyncSearchPopover<ProgramOption>
                  value={studentRecords.program_id}
                  selectedLabel={studentRecords.program_name}
                  disabled={!lockedEnrollmentInstitutionId}
                  onChange={(value) => {
                    setProgramSections([]);
                    setStudentRecords((prev) => ({
                      ...prev,
                      program_id: value,
                      program_name: "",
                      class_category_id: "",
                      class_category_name: "",
                      section_id: "",
                      section_name: "",
                    }));
                    if (value) void loadProgramDetail(value);
                  }}
                  onSelectItem={(item) => {
                    setStudentRecords((prev) => ({
                      ...prev,
                      program_id: String(item.id),
                      program_name: item.title,
                      section_id: "",
                      section_name: "",
                    }));
                    void loadProgramDetail(String(item.id));
                  }}
                  placeholder={lockedEnrollmentInstitutionId ? "Select program..." : "Select institution on Account tab first"}
                  searchPlaceholder="Search programs..."
                  fetcher={fetchPrograms}
                  getValue={(item) => String(item.id)}
                  getLabel={(item) => item.title}
                />
                <FieldError message={errors.program_id} />
              </div>
              <div className="space-y-1.5">
                <Label>Academic Year / Session</Label>
                <AsyncSearchPopover<AcademicYearOption>
                  value={studentRecords.academic_year_id}
                  selectedLabel={studentRecords.academic_year_name}
                  disabled={!lockedEnrollmentInstitutionId}
                  onChange={(value) => setStudentRecords((prev) => ({ ...prev, academic_year_id: value, academic_year_name: value ? prev.academic_year_name : "" }))}
                  onSelectItem={(item) => setStudentRecords((prev) => ({ ...prev, academic_year_id: String(item.id), academic_year_name: item.name }))}
                  placeholder={lockedEnrollmentInstitutionId ? "Select academic year" : "Select institution on Account tab first"}
                  searchPlaceholder="Search academic years..."
                  fetcher={fetchAcademicYears}
                  getValue={(item) => String(item.id)}
                  getLabel={(item) => item.name}
                />
                <FieldError message={errors.academic_year_id} />
              </div>
              <div className="space-y-1.5">
                <Label>Section</Label>
                {programDetailLoading ? (
                  <div className="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-2.5 text-sm text-muted-foreground">
                    <span className="min-w-0 flex-1 truncate">Loading sections...</span>
                    <Loader2 className="size-4 shrink-0 animate-spin" />
                  </div>
                ) : (
                  <Select
                    value={studentRecords.section_id}
                    onValueChange={(value) => {
                      const section = programSections.find((item) => String(item.id) === value);
                      setStudentRecords((prev) => ({
                        ...prev,
                        section_id: value,
                        section_name: section?.name ?? "",
                      }));
                    }}
                    disabled={!studentRecords.program_id || programSections.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={programSections.length ? "Select section..." : "No sections"} />
                    </SelectTrigger>
                    <SelectContent>
                      {programSections.map((section) => (
                        <SelectItem key={section.id} value={String(section.id)}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FieldError message={errors.section_id} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={studentRecords.status}
                  onValueChange={(value) => setStudentRecords((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {["active", "promoted", "demoted", "transferred", "dropout", "graduated", "completed", "suspended"].map((status) => (
                      <SelectItem key={status} value={status}>{capitalize(status)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Roll Number</Label>
                <Input
                  value={studentRecords.roll_number}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(event) => setStudentRecords((prev) => ({ ...prev, roll_number: normalizeRollNumberInput(event.target.value) }))}
                  placeholder="Roll number"
                />
                <FieldError message={errors.roll_number} />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  className="w-full"
                  onClick={assignEnrollmentDraft}
                  disabled={programDetailLoading}
                >
                  <Plus className="size-4" />
                  Assign Program
                </Button>
              </div>
              </>)}
              <div className="space-y-1.5">
                <Label>Admission Number</Label>
                <Input
                  value={studentRecords.admission_number}
                  onChange={(event) => {
                    clearFieldError("admission_number");
                    setIdentifierChecks((current) => ({ ...current, admission_number: { status: "idle" } }));
                    setStudentRecords((prev) => ({ ...prev, admission_number: event.target.value.toUpperCase() }));
                  }}
                  placeholder="ADM-2026-001"
                />
                {identifierChecks.admission_number.status === "checking" ? (
                  <p className="text-xs text-muted-foreground">Checking admission number...</p>
                ) : null}
                <FieldError message={errors.admission_number} />
              </div>
              <div className="space-y-1.5">
                <Label>APAR ID</Label>
                <Input
                  value={studentRecords.apar_id}
                  onChange={(event) => {
                    clearFieldError("apar_id");
                    setIdentifierChecks((current) => ({ ...current, apar_id: { status: "idle" } }));
                    setStudentRecords((prev) => ({ ...prev, apar_id: event.target.value.toUpperCase() }));
                  }}
                  placeholder="APAR ID"
                />
                {identifierChecks.apar_id.status === "checking" ? (
                  <p className="text-xs text-muted-foreground">Checking APAR ID...</p>
                ) : null}
                <FieldError message={errors.apar_id} />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <DatePicker
                  value={studentRecords.date_of_birth}
                  onChange={(value) => setStudentRecords((prev) => ({ ...prev, date_of_birth: value }))}
                  placeholder="Select date of birth"
                  fromYear={1950}
                  toYear={CURRENT_YEAR}
                  disabledDates={{ after: TODAY }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Blood Group</Label>
                <Input
                  value={studentRecords.blood_group}
                  onChange={(event) => setStudentRecords((prev) => ({ ...prev, blood_group: event.target.value.toUpperCase() }))}
                  placeholder="B+"
                />
              </div>
              {!isParentMode && (
                <div className="space-y-1.5">
                  <Label>Admission Date</Label>
                  <DatePicker
                    value={studentRecords.admission_date}
                    onChange={(value) => {
                      setStudentRecords((prev) => ({ ...prev, admission_date: value }));
                      setEnrollmentDrafts((current) => current.map((item, index) => index === 0 ? { ...item, admission_date: value } : item));
                    }}
                    placeholder="Select admission date"
                    fromYear={CURRENT_YEAR}
                    toYear={CURRENT_YEAR}
                    disabledDates={{ before: CURRENT_YEAR_START, after: CURRENT_YEAR_END }}
                  />
                </div>
              )}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Remarks</Label>
                <Textarea
                  value={studentRecords.remarks}
                  onChange={(event) => setStudentRecords((prev) => ({ ...prev, remarks: event.target.value }))}
                  placeholder="Enrollment remarks"
                />
              </div>
            </div>
          )}



          {activeStep === promotionStepIndex && (
            <div className="space-y-5">
              <div className="rounded-md border bg-background/35 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 font-semibold">
                      <GraduationCap className="size-4 text-primary" />
                      Promotion
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Process each saved program enrollment separately for students enrolled in multiple classes.
                    </p>
                  </div>
                  <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                    {activePromotionEnrollments.length} active enrollment{activePromotionEnrollments.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3">
                  {savedEnrollments.length === 0 ? (
                    <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      No saved enrollment is available for promotion.
                    </p>
                  ) : savedEnrollments.map((enrollment) => {
                    const isActiveEnrollment = Boolean(enrollment.id && enrollment.status === "active");
                    const isSelected = Boolean(enrollment.id && promotionForm.sourceEnrollmentId === String(enrollment.id));
                    return (
                      <div
                        key={enrollment.id ?? `${enrollment.program_id}-${enrollment.academic_year_id}`}
                        className={cn(
                          "flex flex-col gap-3 rounded-md border bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between",
                          isSelected && "border-destructive/70 bg-destructive/5"
                        )}
                      >
                        <div>
                          <p className="font-medium">
                            {enrollment.program_name ?? "Class"} {enrollment.section_name ? `- ${enrollment.section_name}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Roll {enrollment.roll_number || "-"} - {enrollment.academic_year_name ?? "Session"} - {capitalize(enrollment.status ?? "draft")}
                          </p>
                          {enrollment.promotion_type || enrollment.promoted_at ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Processed as {enrollment.promotion_type ?? "promotion"}.
                            </p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          disabled={!isActiveEnrollment}
                          onClick={() => selectEnrollmentForPromotion(enrollment)}
                        >
                          <Repeat2 className="size-4" />
                          {isSelected ? "Selected" : isActiveEnrollment ? "Promote this enrollment" : "Processed"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-md border bg-background/35 p-4">
                <label className="flex w-fit items-center gap-2 rounded-md border bg-background/50 px-3 py-2 text-sm font-medium">
                  <Checkbox
                    checked={enablePromotion}
                    onCheckedChange={(value) => setEnablePromotion(Boolean(value))}
                  />
                  Process promotion for selected enrollment
                </label>

                {enablePromotion ? activePromotionEnrollments.length === 0 ? (
                  <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No active saved enrollment is available for promotion.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Current Enrollment</Label>
                      <Select
                        value={promotionForm.sourceEnrollmentId}
                        onValueChange={(value) => {
                          const source = activePromotionEnrollments.find((item) => String(item.id) === value);
                          if (source) selectEnrollmentForPromotion(source);
                        }}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select enrollment" /></SelectTrigger>
                        <SelectContent>
                          {activePromotionEnrollments.map((enrollment) => (
                            <SelectItem key={enrollment.id} value={String(enrollment.id)}>
                              {enrollment.program_name ?? "Class"} - {enrollment.section_name ?? "No section"} - {enrollment.academic_year_name ?? "Session"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Outcome</Label>
                      <Select
                        value={promotionForm.outcome}
                        onValueChange={(value) => setPromotionForm((current) => ({
                          ...current,
                          outcome: value as PromotionOutcome,
                        }))}
                      >
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(promotionOutcomeLabels) as PromotionOutcome[]).map((outcome) => (
                            <SelectItem key={outcome} value={outcome}>
                              {promotionOutcomeLabels[outcome]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {promotionCreatesEnrollment && (
                      <>
                        <div className="space-y-1.5">
                          <Label>Destination Session</Label>
                          <AsyncSearchPopover<AcademicYearOption>
                            value={promotionForm.destinationAcademicYearId}
                            selectedLabel={promotionForm.destinationAcademicYearName}
                            disabled={!lockedEnrollmentInstitutionId}
                            onChange={(value) => setPromotionForm((current) => ({
                              ...current,
                              destinationAcademicYearId: value,
                              destinationAcademicYearName: value ? current.destinationAcademicYearName : "",
                            }))}
                            onSelectItem={(year) => setPromotionForm((current) => ({
                              ...current,
                              destinationAcademicYearId: String(year.id),
                              destinationAcademicYearName: year.name,
                            }))}
                            placeholder="Select destination session"
                            searchPlaceholder="Search sessions..."
                            fetcher={fetchAcademicYears}
                            getValue={(item) => String(item.id)}
                            getLabel={(item) => item.name}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Destination Class</Label>
                          <AsyncSearchPopover<ProgramOption>
                            value={promotionForm.destinationProgramId}
                            selectedLabel={promotionForm.destinationProgramName}
                            disabled={!lockedEnrollmentInstitutionId || promotionForm.outcome !== "promoted"}
                            onChange={(value) => {
                              setPromotionForm((current) => ({
                                ...current,
                                destinationProgramId: value,
                                destinationProgramName: value ? current.destinationProgramName : "",
                                destinationSectionId: "",
                                destinationSectionName: "",
                              }));
                              if (value) void loadPromotionProgram(value);
                            }}
                            onSelectItem={(program) => {
                              setPromotionForm((current) => ({
                                ...current,
                                destinationProgramId: String(program.id),
                                destinationProgramName: program.title,
                                destinationSectionId: "",
                                destinationSectionName: "",
                              }));
                              void loadPromotionProgram(String(program.id));
                            }}
                            placeholder="Select class..."
                            searchPlaceholder="Search classes..."
                            fetcher={fetchPrograms}
                            getValue={(item) => String(item.id)}
                            getLabel={(item) => item.title}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Destination Section</Label>
                          <Select
                            value={promotionForm.destinationSectionId}
                            onValueChange={(value) => {
                              const section = promotionSections.find((item) => String(item.id) === value);
                              setPromotionForm((current) => ({
                                ...current,
                                destinationSectionId: value,
                                destinationSectionName: section?.name ?? "",
                              }));
                            }}
                            disabled={!promotionForm.destinationProgramId || promotionProgramLoading || !promotionSections.length}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={promotionProgramLoading ? "Loading sections..." : "Select section"} />
                            </SelectTrigger>
                            <SelectContent>
                              {promotionSections.map((section) => (
                                <SelectItem key={section.id} value={String(section.id)}>
                                  {section.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>New Roll Number</Label>
                          <Input
                            value={promotionForm.rollNumber}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            onChange={(event) => setPromotionForm((current) => ({
                              ...current,
                              rollNumber: normalizeRollNumberInput(event.target.value),
                            }))}
                            placeholder="Optional"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>Effective Date</Label>
                          <DatePicker
                            value={promotionForm.admissionDate}
                            onChange={(value) => setPromotionForm((current) => ({
                              ...current,
                              admissionDate: value,
                            }))}
                            placeholder="Select date"
                            fromYear={CURRENT_YEAR}
                            toYear={CURRENT_YEAR + 1}
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                      <Label>Notes</Label>
                      <Textarea
                        value={promotionForm.notes}
                        onChange={(event) => setPromotionForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))}
                        placeholder="Optional promotion remarks"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end sm:col-span-2 lg:col-span-3">
                      <Button
                        type="button"
                        onClick={handlePromotionSubmit}
                        disabled={promotionSubmitting}
                      >
                        {promotionSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Repeat2 className="size-4" />}
                        Save Promotion
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {activeStep === guardiansStepIndex && (
            <FormSection
              title={
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Guardians</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                    <Info className="size-3.5 shrink-0" />
                    Primary contact is used for emergencies.
                  </span>
                </span>
              }
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStudentRecords((prev) => ({
                    ...prev,
                    guardians: [...prev.guardians, {
                      id: crypto.randomUUID(),
                      guardian_user_id: "",
                      guardian_name: "",
                      guardian_email: "",
                      guardian_phone: "",
                      password: "",
                      confirm_password: "",
                      relationship: "",
                      is_primary: prev.guardians.length === 0,
                    }],
                  }))}
                >
                  <Plus className="size-4" />
                  Add
                </Button>
              }
            >
              <div className="rounded-md border bg-background/35 p-3">
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={useSiblingGuardians}
                    onCheckedChange={(checked) => {
                      const enabled = Boolean(checked);
                      setUseSiblingGuardians(enabled);
                      if (!enabled) {
                        setSiblingStudentId("");
                        setSiblingStudentLabel("");
                      }
                    }}
                  />
                  <span className="grid gap-1">
                    <span className="font-medium">Real brother or sister already studies here</span>
                    <span className="text-xs text-muted-foreground">
                      Select the existing student to reuse the same parent accounts for this student.
                    </span>
                  </span>
                </label>
                {useSiblingGuardians ? (
                  <div className="mt-3">
                    <AsyncSearchPopover<SiblingStudentOption>
                      value={siblingStudentId}
                      selectedLabel={siblingStudentLabel}
                      disabled={!lockedEnrollmentInstitutionId}
                      onChange={(value) => {
                        setSiblingStudentId(value);
                        if (!value) setSiblingStudentLabel("");
                      }}
                      onSelectItem={(item) => {
                        const admission = item.admission_number || `Student ID ${item.student_id}`;
                        setSiblingStudentId(String(item.student_id));
                        setSiblingStudentLabel(`${item.student_name} - ${admission}`);
                        setStudentRecords((prev) => ({
                          ...prev,
                          guardians: mapSiblingGuardians(item),
                        }));
                      }}
                      placeholder={lockedEnrollmentInstitutionId ? "Select existing sibling..." : "Select institution first"}
                      searchPlaceholder="Search by student name or ID..."
                      emptyText="No students with guardians found."
                      fetcher={fetchSiblingStudents}
                      getValue={(item) => String(item.student_id)}
                      getLabel={(item) => `${item.student_name} ${item.admission_number ?? ""} ${item.student_id}`}
                      renderItem={(item) => (
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {item.student_name}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            ID: {item.student_id}
                            {item.admission_number ? ` - ${item.admission_number}` : ""}
                            {item.section_name ? ` - ${item.section_name}` : ""}
                          </span>
                        </div>
                      )}
                    />
                  </div>
                ) : null}
              </div>
              {studentRecords.guardians.length === 0 && (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  No guardians added.
                </p>
              )}
              <div className="space-y-3">
                {studentRecords.guardians.map((guardian, index) => (
                  <div key={guardian.id} className="space-y-3 rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">
                        Parent {index + 1}
                        {guardian.guardian_user_id ? (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            Existing user ID: {guardian.guardian_user_id}
                          </span>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setStudentRecords((prev) => ({ ...prev, guardians: prev.guardians.filter((item) => item.id !== guardian.id) }))}
                      >
                        <span className="sr-only">Remove guardian</span>
                        ×
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Full name</Label>
                        <Input
                          value={guardian.guardian_name}
                          onChange={(event) => setStudentRecords((prev) => ({
                            ...prev,
                            guardians: prev.guardians.map((item, itemIndex) => itemIndex === index ? { ...item, guardian_name: event.target.value } : item),
                          }))}
                          placeholder="Parent full name"
                        />
                        <FieldError message={errors[`guardian.${index}.guardian_name`]} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={guardian.guardian_email}
                          onChange={(event) => setStudentRecords((prev) => ({
                            ...prev,
                            guardians: prev.guardians.map((item, itemIndex) => itemIndex === index ? { ...item, guardian_email: event.target.value } : item),
                          }))}
                          placeholder="parent@example.com"
                        />
                        <FieldError message={errors[`guardian.${index}.guardian_email`]} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <Input
                          value={guardian.guardian_phone}
                          onChange={(event) => setStudentRecords((prev) => ({
                            ...prev,
                            guardians: prev.guardians.map((item, itemIndex) => itemIndex === index ? { ...item, guardian_phone: event.target.value } : item),
                          }))}
                          placeholder="9876543210"
                        />
                        <FieldError message={errors[`guardian.${index}.guardian_phone`]} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Relationship</Label>
                        <Input
                          value={guardian.relationship}
                          onChange={(event) => setStudentRecords((prev) => ({
                            ...prev,
                            guardians: prev.guardians.map((item, itemIndex) => itemIndex === index ? { ...item, relationship: event.target.value } : item),
                          }))}
                          placeholder="Father, Mother, Guardian"
                        />
                        <FieldError message={errors[`guardian.${index}.relationship`]} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Password</Label>
                        <Input
                          type="password"
                          value={guardian.password}
                          onChange={(event) => setStudentRecords((prev) => ({
                            ...prev,
                            guardians: prev.guardians.map((item, itemIndex) => itemIndex === index ? { ...item, password: event.target.value } : item),
                          }))}
                          placeholder={guardian.guardian_user_id ? "Leave blank to keep current" : "Enter password"}
                        />
                        <FieldError message={errors[`guardian.${index}.password`]} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Confirm password</Label>
                        <Input
                          type="password"
                          value={guardian.confirm_password}
                          onChange={(event) => setStudentRecords((prev) => ({
                            ...prev,
                            guardians: prev.guardians.map((item, itemIndex) => itemIndex === index ? { ...item, confirm_password: event.target.value } : item),
                          }))}
                          placeholder="Confirm password"
                        />
                        <FieldError message={errors[`guardian.${index}.confirm_password`]} />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={Boolean(guardian.is_primary)}
                        onCheckedChange={(checked) => setStudentRecords((prev) => ({
                          ...prev,
                          guardians: prev.guardians.map((item, itemIndex) => ({ ...item, is_primary: itemIndex === index ? Boolean(checked) : checked ? false : item.is_primary })),
                        }))}
                      />
                      Primary
                    </label>
                    <Button
                      className="hidden"
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setStudentRecords((prev) => ({ ...prev, guardians: prev.guardians.filter((item) => item.id !== guardian.id) }))}
                    >
                      <span className="sr-only">Remove guardian</span>
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </FormSection>
          )}

          {activeStep === documentsStepIndex && (
            <FormSection
              title="Documents"
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStudentRecords((prev) => ({
                    ...prev,
                    documents: [...prev.documents, { id: crypto.randomUUID(), document_type: "", document_number: "", file_url: "", public_id: "", resource_type: "", files: [], is_verified: false }],
                  }))}
                >
                  <Plus className="size-4" />
                  Add
                </Button>
              }
            >
              {studentRecords.documents.length === 0 && (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  No documents added.
                </p>
              )}
              <div className="space-y-3">
                {studentRecords.documents.map((document, index) => {
                  const documentFiles = getDocumentFiles(document);

                  return (
                  <div key={document.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Document Type</Label>
                      <Select
                        value={
                          STANDARD_DOCUMENT_TYPES.some((d) => d.value === document.document_type)
                            ? document.document_type
                            : document.document_type ? "OTHER" : "AADHAAR"
                        }
                        onValueChange={(val) => {
                          setStudentRecords((prev) => ({
                            ...prev,
                            documents: prev.documents.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, document_type: val === "OTHER" ? (item.document_type && !STANDARD_DOCUMENT_TYPES.some(d => d.value === item.document_type) ? item.document_type : "") : val }
                                : item
                            ),
                          }));
                        }}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select Document Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {STANDARD_DOCUMENT_TYPES.map((dt) => (
                            <SelectItem key={dt.value} value={dt.value}>
                              {dt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(!STANDARD_DOCUMENT_TYPES.some((d) => d.value === document.document_type && d.value !== "OTHER") ||
                        document.document_type === "OTHER" ||
                        (document.document_type && !STANDARD_DOCUMENT_TYPES.map(d => d.value).includes(document.document_type))) && (
                        <Input
                          value={document.document_type === "OTHER" ? "" : document.document_type}
                          onChange={(event) =>
                            setStudentRecords((prev) => ({
                              ...prev,
                              documents: prev.documents.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, document_type: event.target.value.toUpperCase() }
                                  : item
                              ),
                            }))
                          }
                          placeholder="Enter document name"
                          className="mt-1.5"
                        />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Document Number</Label>
                      <Input
                        value={document.document_number}
                        onChange={(event) => setStudentRecords((prev) => ({
                          ...prev,
                          documents: prev.documents.map((item, itemIndex) => itemIndex === index ? { ...item, document_number: event.target.value.toUpperCase() } : item),
                        }))}
                        placeholder="Uppercase automatically"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>File</Label>
                      <DocumentFileUpload
                        key={`${document.id}-${documentFiles.map((file) => file.publicId || file.url).join("|")}`}
                        accessToken={accessToken}
                        files={documentFiles}
                        onFilesChange={(files) => setStudentRecords((prev) => ({
                          ...prev,
                          documents: prev.documents.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                ...item,
                                files,
                                file_url: files[0]?.url ?? "",
                                public_id: files[0]?.publicId ?? "",
                                resource_type: files[0]?.resourceType ?? "",
                              }
                              : item
                          ),
                        }))}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={Boolean(document.is_verified)}
                        onCheckedChange={(checked) => setStudentRecords((prev) => ({
                          ...prev,
                          documents: prev.documents.map((item, itemIndex) => itemIndex === index ? { ...item, is_verified: Boolean(checked) } : item),
                        }))}
                      />
                      Verified
                    </label>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={async () => {
                          if (accessToken) {
                            await Promise.all(
                              documentFiles
                                .filter((file) => file.publicId)
                                .map((file) =>
                                  fetch("/api/admin/uploads/documents/delete", {
                                    method: "POST",
                                    headers: {
                                      Authorization: `Bearer ${accessToken}`,
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      publicId: file.publicId,
                                      resourceType: file.resourceType || "image",
                                    }),
                                  }).catch(() => undefined)
                                )
                            );
                          }
                          setStudentRecords((prev) => ({ ...prev, documents: prev.documents.filter((item) => item.id !== document.id) }));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )})}
              </div>
            </FormSection>
          )}

          {activeStep === securityStepIndex && (
            <div className="space-y-4 rounded-md border p-4">
              <div>
                <h3 className="text-base font-semibold">Change password</h3>
                <p className="text-sm text-muted-foreground">
                  Platform admins can update any user password. Institution admins can update passwords only for users in their institution.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-password">New password</Label>
                  <Input
                    id="edit-user-password"
                    type="password"
                    value={passwordForm.password}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                    placeholder="Enter new password"
                    autoComplete="new-password"
                  />
                  <FieldError message={passwordErrors.password} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-user-confirm-password">Confirm password</Label>
                  <Input
                    id="edit-user-confirm-password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                    }
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                  <FieldError message={passwordErrors.confirmPassword} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handlePasswordUpdate}
                  disabled={passwordSubmitting}
                >
                  {passwordSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Update Password
                </Button>
              </div>
            </div>
          )}

          {activeStep === reviewStepIndex && (
            <div className="grid max-h-[min(58vh,620px)] gap-4 overflow-y-auto pr-2 lg:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-4 lg:col-span-2">
                <Checkbox
                  checked={Boolean(form.is_profile_complete)}
                  onCheckedChange={(checked) =>
                    updateForm("is_profile_complete", checked === true)
                  }
                  className="mt-0.5"
                />
                <span className="space-y-1">
                  <span className="block font-medium text-foreground">
                    Profile complete
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    Confirm that all required student details have been reviewed and completed.
                  </span>
                </span>
              </label>

              <ReviewCard title="Account">
                <div className="space-y-1 text-muted-foreground">
                  <p>{form.full_name || "Unnamed user"}</p>
                  <p>{form.email || "-"}</p>
                  <p>{form.phone || "-"}</p>
                  <p>Role: {selectedRole?.name ?? "Default"}</p>
                </div>
              </ReviewCard>

              <ReviewCard title="Profile">
                <div className="space-y-1 text-muted-foreground">
                  <p>
                    Gender:{" "}
                    {form.gender === NO_GENDER
                      ? "Not set"
                      : capitalize(form.gender)}
                  </p>

                  {showHourlyCharges && (
                  <p>
                    Hourly:{" "}
                    {form.hourly_charges
                      ? `₹${form.hourly_charges}`
                      : "Not set"}
                  </p>

                  )}

                  <p>
                    Active: {form.is_active ? "Yes" : "No"}
                  </p>

                  <p>
                    Verified: {form.is_verified ? "Yes" : "No"}
                  </p>
                </div>
              </ReviewCard>

              {selectedRoleIsTeacher && (
                <ReviewCard title="Teaching" className="lg:col-span-2">
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      Type:{" "}
                      {TEACHER_TYPE_OPTIONS.find(
                        (x) => x.value === form.teacher_type
                      )?.label || "Not set"}
                    </p>

                    {form.teacher_type === "institute_teacher" && (
                      <>
                        <p className="text-muted-foreground">
                          Institution: {form.under_institution_name || "Not set"}
                        </p>

                        <p className="text-muted-foreground">
                          Designation: {form.designation_name || "Not set"}
                        </p>
                      </>
                    )}

                    <p className="text-muted-foreground">
                      Categories: {selectedTeachingCategoryOptions.length > 0 ? selectedTeachingCategoryOptions.map((o) => o.label).join(", ") : "None selected"}
                    </p>

                    <p className="text-muted-foreground">
                      Subjects: {selectedTeachingSubjectOptions.length > 0 ? selectedTeachingSubjectOptions.map((o) => o.label).join(", ") : "None selected"}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedTeachingCategoryOptions.map((item) => (
                        <span
                          key={`cat-${item.value}`}
                          className="rounded-md border px-2 py-1 text-xs"
                        >
                          {item.label}
                        </span>
                      ))}
                      {selectedTeachingSubjectOptions.map((item) => (
                        <span
                          key={`sub-${item.value}`}
                          className="rounded-md border px-2 py-1 text-xs"
                        >
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </ReviewCard>
              )}

              <ReviewCard title="Location">
                <p className="text-muted-foreground wrap-break-word">
                  {form.full_address ||
                    form.location?.formatted_address ||
                    "Not set"}
                </p>
              </ReviewCard>

              <ReviewCard title="Background">
                <div className="space-y-3 text-muted-foreground">
                  <div>
                    <div className="font-medium">Experience</div>
                    {form.experiences.length === 0 ? (
                      <div className="text-sm">None</div>
                    ) : (
                      <ul className="list-disc ml-5 space-y-1 text-sm">
                        {form.experiences.map((exp, i) => (
                          <li key={i}>
                            <div>{exp.job_title || "Untitled role"}{exp.company_name ? ` — ${exp.company_name}` : ""}</div>
                            <div className="text-xs text-muted-foreground">
                              {exp.from_month || exp.from_year ? `${exp.from_month ?? ""}${exp.from_month && exp.from_year ? "/" : ""}${exp.from_year ?? ""}` : ""}
                              {exp.is_current ? ` — Present` : exp.to_month || exp.to_year ? ` — ${exp.to_month ?? ""}${exp.to_month && exp.to_year ? "/" : ""}${exp.to_year ?? ""}` : ""}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <div className="font-medium">Education</div>
                    {form.education.length === 0 ? (
                      <div className="text-sm">None</div>
                    ) : (
                      <ul className="list-disc ml-5 space-y-1 text-sm">
                        {form.education.map((edu, i) => (
                          <li key={i}>
                            <div>{edu.qualification || "Qualification"}{edu.institution_name ? ` — ${edu.institution_name}` : ""}</div>
                            <div className="text-xs text-muted-foreground">
                              {edu.from_year ? `${edu.from_year}` : ""}{edu.to_year ? ` — ${edu.to_year}` : ""}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <div className="font-medium">Certifications</div>
                    {form.certifications.length === 0 ? (
                      <div className="text-sm">None</div>
                    ) : (
                      <ul className="list-disc ml-5 space-y-1 text-sm">
                        {form.certifications.map((cert, i) => (
                          <li key={i}>
                            <div>{cert.name || "Certification"}</div>
                            <div className="text-xs text-muted-foreground">
                              {cert.issued_authority ? `${cert.issued_authority}` : ""}{cert.duration ? ` — ${cert.duration}` : ""}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </ReviewCard>

              <ReviewCard title="Student Records">
                <div className="space-y-1 text-muted-foreground">
                  <p>Admission Number: {studentRecords.admission_number || "Not set"}</p>
                  <p>APAR ID: {studentRecords.apar_id || "Not set"}</p>
                  <p>Date of birth: {studentRecords.date_of_birth || "Not set"}</p>
                  <p>Blood group: {studentRecords.blood_group || "Not set"}</p>
                </div>
              </ReviewCard>

              <ReviewCard title="Enrollment">
                {enrollmentDrafts.filter((draft) => draft.program_id || draft.roll_number || draft.academic_year_id).length === 0 ? (
                  <p className="text-muted-foreground">No enrollment assigned.</p>
                ) : (
                  <div className="space-y-3 text-muted-foreground">
                    {enrollmentDrafts
                      .filter((draft) => draft.program_id || draft.roll_number || draft.academic_year_id)
                      .map((draft, index) => (
                        <div key={draft.clientId} className="rounded-md border p-3">
                          <p className="font-medium text-foreground">{draft.program_name || `Program ${index + 1}`}</p>
                          <p>Institution: {studentRecords.enrollment_institution_name || "Not set"}</p>
                          <p>Academic year: {draft.academic_year_name || "Not set"}</p>
                          <p>Section: {draft.section_name || "Not set"}</p>
                          <p>Roll number: {draft.roll_number || "Not set"}</p>
                          <p>Admission date: {draft.admission_date || studentRecords.admission_date || "Not set"}</p>
                          <p>Status: {draft.status ? capitalize(draft.status) : "Not set"}</p>
                        </div>
                      ))}
                  </div>
                )}
              </ReviewCard>

              <ReviewCard title="Guardians">
                {studentRecords.guardians.length === 0 ? (
                  <p className="text-muted-foreground">None</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    {studentRecords.guardians.map((guardian) => (
                      <li key={guardian.id}>
                        {guardian.guardian_name || "Guardian"} - {guardian.relationship || "Relationship not set"}
                        {guardian.is_primary ? " (Primary)" : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </ReviewCard>

              <ReviewCard title="Documents">
                {studentRecords.documents.filter((document) => getDocumentFiles(document).length > 0).length === 0 ? (
                  <p className="text-muted-foreground">None</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    {studentRecords.documents.filter((document) => getDocumentFiles(document).length > 0).map((document) => (
                      <li key={document.id}>
                        {document.document_type || "Document"} {document.document_number ? `- ${document.document_number}` : ""}
                        {getDocumentFiles(document).length > 1 ? ` (${getDocumentFiles(document).length} images)` : ""}
                        {document.is_verified ? " (Verified)" : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </ReviewCard>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between items-center">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveStep((prev) => Math.max(prev - 1, 0))}
                disabled={activeStep === 0 || submitting}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <ProgressiveSaveIndicator status={saveStatus} />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              {activeStep < dialogSteps.length - 1 ? (
                <Button type="button" onClick={goNext}>
                  Next
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  {isEdit ? "Update Student" : "Create Student"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

