// /app/api/auth/login/route.ts
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { createAccessToken } from "@/lib/auth/jwt";
import { toSessionUser } from "@/lib/auth/session-user";
import { getSuspensionErrorCode, getSuspensionStatus } from "@/lib/auth/suspension";
import { db } from "@/lib/db/db";
import { checkDeploymentAccess, DEPLOYMENT_ACCESS_ERROR_CODE } from "@/lib/deployment/auth-policy";
import { getUserById } from "@/lib/queries/user";
import { getConfiguredInstitutionId, getInstitutionTenantByHost, getRequestHost, hasConfiguredInstitutionId } from "@/lib/tenancy/institution-domain";
import { loginSchema } from "@/lib/validations";
import { createSession } from "@/models/sessionModel";
import { getSubscriptionRedirectForUser } from "@/lib/queries/subscriptions";
import { loginUser } from "@/services/authService";
import { toRoleRoutePath } from "@/lib/auth/role-routes";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { email, password } = parsed.data;
    const { user } = await loginUser(email, password);

    if (!user?.id) {
      throw new Error("Invalid user id");
    }

    const host = getRequestHost(req);
    const [fullUser, suspension, tenant] = await Promise.all([
      getUserById(db, user.id),
      getSuspensionStatus(db, user.id),
      getInstitutionTenantByHost(db, host),
    ]);

    if (suspension.suspended) {
      throw new Error(suspension.message);
    }

    if (!fullUser) {
      throw new Error("User not found");
    }

    if (!tenant && hasConfiguredInstitutionId()) {
      return NextResponse.json(
        {
          error: `Configured institution id ${getConfiguredInstitutionId() ?? ""} was not found or is inactive.`,
          error_code: DEPLOYMENT_ACCESS_ERROR_CODE,
          reason: "INSTITUTION_SITE_REQUIRES_KNOWN_TENANT",
        },
        { status: 403 }
      );
    }

    const deploymentAccess = checkDeploymentAccess(fullUser, tenant, host);
    if (deploymentAccess.allowed === false) {
      return NextResponse.json(
        {
          error: deploymentAccess.message,
          error_code: DEPLOYMENT_ACCESS_ERROR_CODE,
          reason: deploymentAccess.reason,
        },
        { status: 403 }
      );
    }

    const sessionId = randomUUID();

    await createSession(
      sessionId,
      user.id,
      req.headers.get("user-agent") || "",
      "ip"
    );

    const accessToken = createAccessToken(user.id, sessionId);
    const sessionUser = toSessionUser(fullUser);
    const roleRedirect = toRoleRoutePath("/admin", sessionUser);
    const subscriptionRedirectTo = await getSubscriptionRedirectForUser(db, fullUser);

    const response = NextResponse.json({
      user: sessionUser,
      accessToken,
      redirectTo: subscriptionRedirectTo || roleRedirect,
    });

    response.cookies.set("refresh_token", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    const errorCode = getSuspensionErrorCode(message);

    const response = NextResponse.json(
      errorCode ? { error: message, error_code: errorCode } : { error: message },
      { status: errorCode ? 403 : 401 }
    );
    if (errorCode) {
      response.cookies.delete("refresh_token");
    }
    return response;
  }
}
