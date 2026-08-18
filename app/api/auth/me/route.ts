// /app/api/auth/me/route.ts
import { createAccessToken, verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db/db";
import { NextResponse } from "next/server";
import { getUserById } from "@/lib/queries/user";
import { cookies } from "next/headers";
import { getSession } from "@/models/sessionModel";
import { toSessionUser } from "@/lib/auth/session-user";
import { getSuspensionErrorCode, getSuspensionStatus } from "@/lib/auth/suspension";
import { checkDeploymentAccess, DEPLOYMENT_ACCESS_ERROR_CODE } from "@/lib/deployment/auth-policy";
import { getConfiguredInstitutionId, getInstitutionTenantByHost, getRequestHost, hasConfiguredInstitutionId } from "@/lib/tenancy/institution-domain";

const DEBUG_ENV_VALUES = new Set(["1", "true", "yes", "on"]);

function isDebuggingEnabled() {
  return DEBUG_ENV_VALUES.has(String(process.env.IS_DEBUGGING ?? process.env.is_debugging ?? "").toLowerCase());
}

function authDebug(label: string, payload?: Record<string, unknown>) {
  if (!isDebuggingEnabled()) return;
  if (payload) {
    console.log(label, payload);
    return;
  }
  console.log(label);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(req: Request) {
  const startedAt = Date.now();
  try {
    authDebug("[auth.me.start]");
    const authHeader = req.headers.get("authorization");
    let token = authHeader?.split(" ").pop();
    let userId: number | null = null;
    let newAccessToken: string | null = null;

    if (token) {
      try {
        const decoded = verifyToken(token) as { typ?: string; id?: number; sub?: string | number };
        if (decoded.typ && decoded.typ !== "access") {
          throw new Error("Invalid token type");
        }
        userId = decoded.id ?? Number(decoded.sub);
      } catch {
        // Token is invalid/expired. Fallback to refresh cookie.
        token = undefined;
      }
    }

    if (!token) {
      // Try using the refresh cookie
      const cookieStore = await cookies();
      const refreshToken = cookieStore.get("refresh_token")?.value;

      if (!refreshToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      authDebug("[auth.me.session.start]");
      const session = await getSession(refreshToken);
      authDebug("[auth.me.session.ok]", { elapsed_ms: Date.now() - startedAt, found: Boolean(session) });
      if (!session || new Date(session.expires_at) < new Date()) {
        return NextResponse.json({ error: "Unauthorized or session expired" }, { status: 401 });
      }

      userId = session.user_id;
      newAccessToken = createAccessToken(userId, refreshToken);
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authDebug("[auth.me.user.start]", { user_id: userId });
    const user = await getUserById(db, userId);
    authDebug("[auth.me.user.ok]", { elapsed_ms: Date.now() - startedAt, found: Boolean(user) });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    authDebug("[auth.me.suspension.start]", { user_id: userId });
    const suspension = await getSuspensionStatus(db, userId);
    authDebug("[auth.me.suspension.ok]", { elapsed_ms: Date.now() - startedAt, suspended: suspension.suspended });
    if (suspension.suspended) {
      const response = NextResponse.json(
        {
          error: suspension.message,
          error_code: getSuspensionErrorCode(suspension.message),
        },
        { status: 403 }
      );
      response.cookies.delete("refresh_token");
      return response;
    }

    const host = getRequestHost(req);
    const tenant = await getInstitutionTenantByHost(db, host);
    if (!tenant && hasConfiguredInstitutionId()) {
      const response = NextResponse.json(
        {
          error: `Configured institution id ${getConfiguredInstitutionId() ?? ""} was not found or is inactive.`,
          error_code: DEPLOYMENT_ACCESS_ERROR_CODE,
          reason: "INSTITUTION_SITE_REQUIRES_KNOWN_TENANT",
        },
        { status: 403 }
      );
      response.cookies.delete("refresh_token");
      return response;
    }

    const deploymentAccess = checkDeploymentAccess(user, tenant, host);
    if (deploymentAccess.allowed === false) {
      const response = NextResponse.json(
        {
          error: deploymentAccess.message,
          error_code: DEPLOYMENT_ACCESS_ERROR_CODE,
          reason: deploymentAccess.reason,
        },
        { status: 403 }
      );
      response.cookies.delete("refresh_token");
      return response;
    }

    // Return the new access token if we generated one, otherwise just return the user structure
    return NextResponse.json(
      newAccessToken
        ? { user: toSessionUser(user), accessToken: newAccessToken }
        : { user: toSessionUser(user) }
    );
  } catch (err: unknown) {
    const message = getErrorMessage(err, "Auth check failed");
    authDebug("[auth.me.error]", { elapsed_ms: Date.now() - startedAt, message });
    const errorCode = getSuspensionErrorCode(message);
    const response = NextResponse.json(
      errorCode ? { error: message, error_code: errorCode } : { error: message },
      { status: errorCode ? 403 : 500 }
    );
    if (errorCode) {
      response.cookies.delete("refresh_token");
    }
    return response;
  }
}
