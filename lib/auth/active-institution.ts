import type { SessionUser } from "@/lib/auth/session-user";

export const ACTIVE_INSTITUTION_STORAGE_KEY = "edubird.activeInstitutionId";
export const ACTIVE_INSTITUTION_CHANGE_EVENT = "edubird:active-institution-change";

export type ActiveInstitutionSummary = {
  id: number;
  name: string;
  roleName: string | null;
  boardId: number | null;
  boardName: string | null;
};

export function parseActiveInstitutionId(value: string | number | null | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function getUserInstitutionOptions(user: SessionUser | null | undefined) {
  const memberships = user?.memberships ?? [];
  const unique = new Map<number, ActiveInstitutionSummary>();

  for (const membership of memberships) {
    if (!membership.institution_id || !membership.institution_name) continue;
    unique.set(membership.institution_id, {
      id: membership.institution_id,
      name: membership.institution_name,
      roleName: membership.role_name ?? null,
      boardId: membership.institution_board_id ?? null,
      boardName: membership.institution_board_name ?? null,
    });
  }

  return Array.from(unique.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function getDefaultInstitutionId(): number | null {
  return parseActiveInstitutionId(
    process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID ||
    process.env.NEXT_PUBLIC_INSTITUTION_ID ||
    process.env.DEFAULT_INSTITUTION_ID
  );
}

export function getStoredActiveInstitutionId() {
  if (typeof window === "undefined") return getDefaultInstitutionId();
  return (
    parseActiveInstitutionId(
      window.localStorage.getItem(ACTIVE_INSTITUTION_STORAGE_KEY)
    ) ?? getDefaultInstitutionId()
  );
}

export function setStoredActiveInstitutionId(institutionId: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_INSTITUTION_STORAGE_KEY, String(institutionId));
  window.dispatchEvent(
    new CustomEvent(ACTIVE_INSTITUTION_CHANGE_EVENT, {
      detail: { institutionId },
    })
  );
}
