export const ACTIVE_CHILD_STORAGE_KEY = "edubird.activeChildStudentId";
export const ACTIVE_CHILDREN_STORAGE_KEY = "edubird.parentChildren";
export const ACTIVE_CHILD_CHANGE_EVENT = "edubird:active-child-change";
export const ACTIVE_CHILD_QUERY_PARAM = "childStudentId";

export type ActiveChildSummary = {
  studentId: number;
  userId: number;
  name: string;
  institutionName: string | null;
  relationship: string | null;
};

export function parseActiveChildStudentId(value: string | number | null | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function getStoredActiveChildStudentId() {
  if (typeof window === "undefined") return null;
  return parseActiveChildStudentId(
    window.localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY)
  );
}

export function getStoredParentChildren() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(ACTIVE_CHILDREN_STORAGE_KEY) ?? "[]"
    );
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((child): child is ActiveChildSummary => {
      return (
        Number.isInteger(child?.studentId) &&
        child.studentId > 0 &&
        Number.isInteger(child?.userId) &&
        child.userId > 0 &&
        typeof child?.name === "string"
      );
    });
  } catch {
    return [];
  }
}

export function setStoredParentChildren(children: ActiveChildSummary[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_CHILDREN_STORAGE_KEY, JSON.stringify(children));
}

export function setStoredActiveChildStudentId(studentId: number) {
  if (typeof window === "undefined") return;
  if (parseActiveChildStudentId(window.localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY)) === studentId) return;
  window.localStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, String(studentId));
  window.dispatchEvent(
    new CustomEvent(ACTIVE_CHILD_CHANGE_EVENT, {
      detail: { studentId },
    })
  );
}
