"use client";

export const ACTIVE_ACADEMIC_SESSION_STORAGE_KEY = "edubird.activeAcademicYearId";
export const ACTIVE_ACADEMIC_SESSION_DETAILS_STORAGE_KEY = "edubird.activeAcademicSession";
const ACTIVE_ACADEMIC_SESSION_LIST_STORAGE_PREFIX = "edubird.activeAcademicSessions";
export const ACTIVE_ACADEMIC_SESSION_EVENT = "active-academic-session-change";

export type ActiveAcademicSession = {
  id: number;
  institutionId: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  institutionDefaultAcademicYearId?: number | null;
};

function academicYearIdStorageKey(institutionId?: number | string | null) {
  const id = Number(institutionId);
  return Number.isInteger(id) && id > 0
    ? `${ACTIVE_ACADEMIC_SESSION_STORAGE_KEY}.${id}`
    : ACTIVE_ACADEMIC_SESSION_STORAGE_KEY;
}

function sessionDetailsStorageKey(institutionId?: number | string | null) {
  const id = Number(institutionId);
  return Number.isInteger(id) && id > 0
    ? `${ACTIVE_ACADEMIC_SESSION_DETAILS_STORAGE_KEY}.${id}`
    : ACTIVE_ACADEMIC_SESSION_DETAILS_STORAGE_KEY;
}

export function getStoredActiveAcademicYearId(institutionId?: number | string | null) {
  if (typeof window === "undefined") return null;
  const value = Number(window.localStorage.getItem(academicYearIdStorageKey(institutionId)));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function getStoredActiveAcademicSession(institutionId?: number | string | null) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(sessionDetailsStorageKey(institutionId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ActiveAcademicSession>;
    return Number.isInteger(parsed.id) && Number(parsed.id) > 0
      ? {
        id: Number(parsed.id),
        institutionId: Number(parsed.institutionId) || 0,
        name: String(parsed.name ?? "Session"),
        startDate: String(parsed.startDate ?? ""),
        endDate: String(parsed.endDate ?? ""),
        isActive: Boolean(parsed.isActive),
        institutionDefaultAcademicYearId: Number(parsed.institutionDefaultAcademicYearId) || null,
      } satisfies ActiveAcademicSession
      : null;
  } catch {
    return null;
  }
}

function sessionDetailsEqual(left: ActiveAcademicSession | null, right: ActiveAcademicSession) {
  return Boolean(
    left &&
      left.id === right.id &&
      left.institutionId === right.institutionId &&
      left.name === right.name &&
      left.startDate === right.startDate &&
      left.endDate === right.endDate &&
      left.isActive === right.isActive &&
      (left.institutionDefaultAcademicYearId ?? null) === (right.institutionDefaultAcademicYearId ?? null),
  );
}

function sessionListStorageKey(institutionId: number) {
  return `${ACTIVE_ACADEMIC_SESSION_LIST_STORAGE_PREFIX}.${institutionId}`;
}

export function getStoredActiveAcademicSessions(institutionId: number) {
  if (typeof window === "undefined" || !institutionId) return [];
  const raw = window.localStorage.getItem(sessionListStorageKey(institutionId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as ActiveAcademicSession[];
    return Array.isArray(parsed)
      ? parsed.filter((session) => Number.isInteger(session.id) && session.id > 0)
      : [];
  } catch {
    return [];
  }
}

export function setStoredActiveAcademicSessions(institutionId: number, sessions: ActiveAcademicSession[]) {
  if (typeof window === "undefined" || !institutionId) return;
  window.localStorage.setItem(sessionListStorageKey(institutionId), JSON.stringify(sessions));
}

export function setStoredActiveAcademicYearId(id: number, institutionId?: number | string | null) {
  const current = getStoredActiveAcademicYearId(institutionId);
  if (current === id) return;
  window.localStorage.setItem(academicYearIdStorageKey(institutionId), String(id));
  if (!institutionId) {
    window.localStorage.setItem(ACTIVE_ACADEMIC_SESSION_STORAGE_KEY, String(id));
  }
  window.dispatchEvent(new CustomEvent(ACTIVE_ACADEMIC_SESSION_EVENT, { detail: { id, institutionId } }));
}

export function setStoredActiveAcademicSession(session: ActiveAcademicSession) {
  const current = getStoredActiveAcademicSession(session.institutionId);
  window.localStorage.setItem(academicYearIdStorageKey(session.institutionId), String(session.id));
  window.localStorage.setItem(sessionDetailsStorageKey(session.institutionId), JSON.stringify(session));
  window.localStorage.setItem(ACTIVE_ACADEMIC_SESSION_STORAGE_KEY, String(session.id));
  window.localStorage.setItem(ACTIVE_ACADEMIC_SESSION_DETAILS_STORAGE_KEY, JSON.stringify(session));
  if (sessionDetailsEqual(current, session)) return;
  window.dispatchEvent(new CustomEvent(ACTIVE_ACADEMIC_SESSION_EVENT, { detail: { id: session.id, institutionId: session.institutionId, session } }));
}
