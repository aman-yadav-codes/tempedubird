import type { SessionUser } from "@/lib/auth/session-user";

export const ACTIVE_INSTITUTION_STORAGE_KEY = "edubird.activeInstitutionId";
export const ACTIVE_INSTITUTION_DATA_STORAGE_KEY = "edubird.activeInstitutionData";
export const ACTIVE_INSTITUTION_CHANGE_EVENT = "edubird:active-institution-change";

export type ActiveInstitutionSummary = {
  id: number;
  name: string;
  roleName: string | null;
  logoUrl?: string | null;
  boardId?: number | null;
  boardName?: string | null;
};

export function parseActiveInstitutionId(value: string | number | null | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function getUserInstitutionOptions(user: SessionUser | null | undefined): ActiveInstitutionSummary[] {
  if (!user) return [];
  const unique = new Map<number, ActiveInstitutionSummary>();

  const memberships = user.memberships ?? [];
  for (const membership of memberships) {
    if (!membership.institution_id) continue;
    unique.set(Number(membership.institution_id), {
      id: Number(membership.institution_id),
      name: membership.institution_name || `Institution #${membership.institution_id}`,
      roleName: membership.role_name ?? null,
      logoUrl: (membership as any).institution_logo_url || (membership as any).logo_url || null,
      boardId: membership.institution_board_id ?? null,
      boardName: membership.institution_board_name ?? null,
    });
  }

  const userInstitutions = (user as any)?.institutions;
  if (Array.isArray(userInstitutions)) {
    for (const inst of userInstitutions) {
      if (!inst?.id) continue;
      const id = Number(inst.id);
      if (!unique.has(id)) {
        unique.set(id, {
          id,
          name: inst.name || `Institution #${id}`,
          roleName: inst.role_name || inst.role || null,
          logoUrl: inst.logo_url || inst.logoUrl || null,
          boardId: inst.board_id ?? null,
          boardName: inst.board_name ?? null,
        });
      }
    }
  }

  const directId = Number((user as any)?.institution_id || (user as any)?.under_institution_id || (user as any)?.profile?.under_institution_id || (user as any)?.profile?.institution_id);
  const directName = (user as any)?.institution_name || (user as any)?.profile?.institution_name;
  if (Number.isInteger(directId) && directId > 0 && !unique.has(directId)) {
    unique.set(directId, {
      id: directId,
      name: directName || `Institution #${directId}`,
      roleName: "Institution Admin",
      logoUrl: (user as any)?.institution_logo_url || (user as any)?.profile?.institution_logo_url || null,
      boardId: null,
      boardName: null,
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

export function getStoredActiveInstitutionSummary(): ActiveInstitutionSummary | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_INSTITUTION_DATA_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Number.isInteger(Number(parsed.id)) && parsed.name) {
      return {
        id: Number(parsed.id),
        name: String(parsed.name),
        roleName: parsed.roleName ?? null,
        logoUrl: parsed.logoUrl ?? null,
        boardId: parsed.boardId ?? null,
        boardName: parsed.boardName ?? null,
      };
    }
  } catch {
    // ignore parse error
  }
  return null;
}

export function setStoredActiveInstitutionId(institutionId: number, summary?: Partial<ActiveInstitutionSummary> | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_INSTITUTION_STORAGE_KEY, String(institutionId));
  if (summary && summary.name) {
    window.localStorage.setItem(
      ACTIVE_INSTITUTION_DATA_STORAGE_KEY,
      JSON.stringify({
        id: institutionId,
        name: summary.name,
        roleName: summary.roleName ?? null,
        logoUrl: summary.logoUrl ?? null,
        boardId: summary.boardId ?? null,
        boardName: summary.boardName ?? null,
      })
    );
  }
  window.dispatchEvent(
    new CustomEvent(ACTIVE_INSTITUTION_CHANGE_EVENT, {
      detail: { institutionId, summary },
    })
  );
}
