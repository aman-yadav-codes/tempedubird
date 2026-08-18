export const ACTIVE_STUDENT_ENROLLMENT_STORAGE_KEY = "edubird.activeStudentEnrollmentId";
export const ACTIVE_STUDENT_ENROLLMENT_HEADER = "x-active-student-enrollment-id";
export const ACTIVE_STUDENT_ENROLLMENT_EVENT = "active-student-enrollment-change";
const STUDENT_DEFAULT_ACADEMIC_YEAR_STORAGE_KEY = "edubird.studentDefaultAcademicYearByInstitution";

export type ActiveStudentEnrollment = {
  id: number;
  institutionId: number;
  institutionName: string;
  programId: number;
  programName: string;
  sectionId: number | null;
  sectionName: string | null;
  academicYearId: number;
  academicYearName: string;
  academicYearStartDate?: string;
  academicYearEndDate?: string;
  institutionDefaultAcademicYearId?: number | null;
};

export function getStoredActiveStudentEnrollmentId() {
  if (typeof window === "undefined") return null;
  const value = Number(window.localStorage.getItem(ACTIVE_STUDENT_ENROLLMENT_STORAGE_KEY));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function setStoredActiveStudentEnrollmentId(id: number) {
  window.localStorage.setItem(ACTIVE_STUDENT_ENROLLMENT_STORAGE_KEY, String(id));
  window.dispatchEvent(new CustomEvent(ACTIVE_STUDENT_ENROLLMENT_EVENT, { detail: { id } }));
}

export function getStoredStudentDefaultAcademicYearId(institutionId: number) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STUDENT_DEFAULT_ACADEMIC_YEAR_STORAGE_KEY);
  if (!raw) return null;
  try {
    const values = JSON.parse(raw) as Record<string, unknown>;
    const value = Number(values[String(institutionId)]);
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function setStoredStudentDefaultAcademicYearId(institutionId: number, academicYearId: number) {
  const raw = window.localStorage.getItem(STUDENT_DEFAULT_ACADEMIC_YEAR_STORAGE_KEY);
  let values: Record<string, number> = {};
  if (raw) {
    try {
      values = JSON.parse(raw) as Record<string, number>;
    } catch {
      values = {};
    }
  }
  values[String(institutionId)] = academicYearId;
  window.localStorage.setItem(STUDENT_DEFAULT_ACADEMIC_YEAR_STORAGE_KEY, JSON.stringify(values));
}
