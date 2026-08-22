// lib/auth.ts
import { verifyToken } from "@/lib/auth/jwt";
import { getUserById } from "@/lib/queries/user";
import { getSession } from "@/models/sessionModel";
import { db } from "@/lib/db/db";
import { getAppModeForHost } from "@/lib/deployment/app-mode";
import { getInstitutionTenantByHost, getRequestHost } from "@/lib/tenancy/institution-domain";
import {
  AUTHENTICATED_LOOKUP_PERMISSION,
  getInstitutionIdFromUrl,
  getRequestPermission,
  hasPermission,
  isPlatformAdminUser,
  isPlatformFullAccess,
  isPlatformOnlyPermission,
} from "@/lib/auth/permissions";
import { getSuspensionStatus } from "@/lib/auth/suspension";

const FORBIDDEN_MESSAGE = "Forbidden: Admin access required";

type AccessTokenPayload = {
  id?: number;
  sub?: string;
  typ?: string;
};

export async function getAuthenticatedUser(req: Request) {
  let token: string | undefined;

  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    token = authHeader.split(" ").pop();
  }

  if (!token) {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const accessMatch = cookieHeader.match(/access_token=([^;]+)/);
      if (accessMatch) {
        token = accessMatch[1];
      } else {
        const refreshMatch = cookieHeader.match(/refresh_token=([^;]+)/);
        if (refreshMatch) {
          token = refreshMatch[1];
        }
      }
    }
  }

  if (!token) throw new Error("Unauthorized");

  let userId: number | undefined;

  // Try JWT decode if it has standard 3-part dot notation
  if (token.includes(".") && token.split(".").length === 3) {
    try {
      const decoded = verifyToken(token) as AccessTokenPayload;
      userId = decoded.id ?? Number(decoded.sub);
    } catch {
      // JWT failed or malformed, fallback to session table check
    }
  }

  // If not resolved from JWT, check sessions table by UUID/session token ID
  if (!userId || !Number.isInteger(userId) || userId <= 0) {
    try {
      const session = await getSession(token);
      if (session && session.user_id) {
        userId = Number(session.user_id);
      }
    } catch {
      // ignore
    }
  }

  if (!Number.isInteger(userId) || !userId || userId <= 0) {
    throw new Error("Unauthorized");
  }

  const user = await getUserById(db, userId);

  if (!user) throw new Error("User not found");

  const suspension = await getSuspensionStatus(db, userId);
  if (suspension.suspended) throw new Error(FORBIDDEN_MESSAGE);

  return user;
}

export async function getAuthUser(req: Request) {
  try {
    return await getAuthenticatedUser(req);
  } catch {
    return null;
  }
}

export async function requirePermission(
  req: Request,
  permission: string,
  institutionId?: number | null
) {
  const user = await getAuthenticatedUser(req);
  let targetInstitutionId = institutionId ?? getInstitutionIdFromUrl(req.url);
  const host = getRequestHost(req);
  const appMode = getAppModeForHost(host);

  if (permission === AUTHENTICATED_LOOKUP_PERMISSION) {
    return user;
  }

  if (appMode === "platform" && !isPlatformAdminUser(user)) {
    throw new Error(FORBIDDEN_MESSAGE);
  }

  if (appMode === "institution") {
    if (isPlatformAdminUser(user) || isPlatformOnlyPermission(permission)) {
      throw new Error(FORBIDDEN_MESSAGE);
    }

    if (!targetInstitutionId) {
      const tenant = await getInstitutionTenantByHost(db, host);
      targetInstitutionId = tenant?.institution_id ?? null;
    }
  }

  if (!hasPermission(user, permission, { institutionId: targetInstitutionId })) {
    throw new Error(FORBIDDEN_MESSAGE);
  }

  return user;
}

export async function requireAdmin(req: Request) {
  return requirePermission(req, getRequestPermission(req.method, req.url));
}

export async function requireSuperAdmin(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!isPlatformFullAccess(user)) {
    throw new Error(FORBIDDEN_MESSAGE);
  }
  return user;
}
