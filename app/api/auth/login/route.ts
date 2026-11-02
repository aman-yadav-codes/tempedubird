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
import { comparePassword, hashPassword } from "@/lib/auth/hash";
import { toRoleRoutePath } from "@/lib/auth/role-routes";
import { hasAdminPagePermission, getFirstAllowedAdminPath } from "@/lib/auth/permissions";

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
    let user: any = null;

    try {
      const loginRes = await loginUser(email, password);
      user = loginRes.user;
    } catch (standardLoginErr: any) {
      // Check if client matches in clients table
      const cleanIdent = String(email || "").trim();
      const cleanEmail = cleanIdent.toLowerCase();
      const clientRes = await db.query(
        `SELECT id, name, company_name, email, phone, password, plain_password, status, user_id, institution_id
         FROM clients
         WHERE (
           (email IS NOT NULL AND lower(email) = lower($1) AND $1 <> '')
           OR (phone IS NOT NULL AND phone = $2 AND $2 <> '')
         )
         AND (status IS NULL OR status = 'active')
         LIMIT 1`,
        [cleanEmail, cleanIdent]
      );

      if (clientRes.rows.length > 0) {
        const client = clientRes.rows[0];
        let passwordMatches = false;
        if (client.password) {
          passwordMatches = await comparePassword(password, client.password);
        }
        if (!passwordMatches && client.plain_password) {
          passwordMatches = client.plain_password === password;
        }

        if (passwordMatches) {
          let clientUserId = client.user_id;
          if (clientUserId) {
            const u = await db.query(
              `UPDATE users 
               SET is_active = TRUE, is_deleted = FALSE, deleted_at = NULL, deleted_by = NULL, updated_at = NOW() 
               WHERE id = $1 
               RETURNING id, full_name, email, phone, is_active`,
              [clientUserId]
            );
            if (u.rows.length > 0) {
              user = u.rows[0];
            }
          }

          if (!user) {
            const u = await db.query(
              `SELECT id, full_name, email, phone, is_active FROM users 
               WHERE (email IS NOT NULL AND lower(email) = lower($1) AND $1 <> '')
                  OR (phone IS NOT NULL AND phone = $2 AND $2 <> '')
               ORDER BY id DESC LIMIT 1`,
              [client.email || "", client.phone || ""]
            );
            if (u.rows.length > 0) {
              user = u.rows[0];
            } else {
              const hashedPassword = client.password || (await hashPassword(password));
              const ins = await db.query(
                `INSERT INTO users (full_name, email, phone, password, is_active, is_verified)
                 VALUES ($1, $2, $3, $4, TRUE, TRUE) RETURNING id, full_name, email, phone, is_active`,
                [client.name || client.company_name || "Client", client.email || null, client.phone || null, hashedPassword]
              );
              user = ins.rows[0];
            }
          }

          // Ensure client role
          let roleRes = await db.query(`SELECT id FROM roles WHERE code = 'client' LIMIT 1`);
          if (roleRes.rows.length === 0) {
            await db.query(`INSERT INTO roles (name, code, scope_id, is_system) VALUES ('Client', 'client', 1, TRUE) ON CONFLICT (code) DO NOTHING`);
            roleRes = await db.query(`SELECT id FROM roles WHERE code = 'client' LIMIT 1`);
          }
          const clientRoleId = roleRes.rows[0]?.id;
          if (clientRoleId && user?.id) {
            await db.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [user.id, clientRoleId]);
            if (client.institution_id) {
              await db.query(
                `INSERT INTO institution_memberships (institution_id, user_id, role_id, is_active, is_deleted, status, is_current)
                 VALUES ($1, $2, $3, TRUE, FALSE, 'ACTIVE', TRUE)
                 ON CONFLICT (institution_id, user_id) 
                 DO UPDATE SET 
                   role_id = EXCLUDED.role_id,
                   is_active = TRUE, 
                   is_deleted = FALSE, 
                   status = 'ACTIVE',
                   is_current = TRUE,
                   deleted_at = NULL, 
                   updated_at = NOW()`,
                [client.institution_id, user.id, clientRoleId]
              ).catch(() => {});
            }
          }

          if (user?.id && client.user_id !== user.id) {
            await db.query(`UPDATE clients SET user_id = $1 WHERE id = $2`, [user.id, client.id]);
          }
        }
      }

      if (!user?.id) {
        throw standardLoginErr;
      }
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
    const hasDashboardAccess = hasAdminPagePermission(sessionUser, "/admin");
    const targetPath = hasDashboardAccess
      ? "/admin"
      : (getFirstAllowedAdminPath(sessionUser) || "/admin/account");
    const roleRedirect = toRoleRoutePath(targetPath, sessionUser);
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
