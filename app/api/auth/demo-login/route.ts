// /app/api/auth/demo-login/route.ts
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createAccessToken } from "@/lib/auth/jwt";
import { toSessionUser } from "@/lib/auth/session-user";
import { db } from "@/lib/db/db";
import { getUserById, insertUser, insertUserRole } from "@/lib/queries/user";
import { createSession } from "@/models/sessionModel";
import { getSubscriptionRedirectForUser } from "@/lib/queries/subscriptions";
import { hashPassword } from "@/lib/auth/hash";
import { toRoleRoutePath } from "@/lib/auth/role-routes";

const DEMO_ACCOUNTS = {
  student: {
    email: "demo.student@edubird.com",
    full_name: "Demo Student",
    role_code: "student",
    phone: "9876543210",
  },
  guardian: {
    email: "demo.guardian@edubird.com",
    full_name: "Demo Guardian",
    role_code: "parent",
    phone: "9876543211",
  },
  parent: {
    email: "demo.guardian@edubird.com",
    full_name: "Demo Guardian",
    role_code: "parent",
    phone: "9876543211",
  },
  professional: {
    email: "demo.professional@edubird.com",
    full_name: "Demo Professional",
    role_code: "institution_admin",
    phone: "9876543212",
  },
  institution_admin: {
    email: "demo.professional@edubird.com",
    full_name: "Demo Professional",
    role_code: "institution_admin",
    phone: "9876543212",
  },
  platform_admin: {
    email: "demo.platform_admin@edubird.com",
    full_name: "Demo Platform Admin",
    role_code: "platform_admin",
    phone: "9876543213",
  },
  admin: {
    email: "demo.platform_admin@edubird.com",
    full_name: "Demo Platform Admin",
    role_code: "platform_admin",
    phone: "9876543213",
  },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const roleKey = (body.role || "student").toLowerCase() as keyof typeof DEMO_ACCOUNTS;

    const demoConfig = DEMO_ACCOUNTS[roleKey] || DEMO_ACCOUNTS.student;

    // 1. Try finding existing user by email
    let userResult = await db.query<{ id: number; email: string; is_active: boolean }>(
      `SELECT id, email, is_active FROM users WHERE LOWER(email) = LOWER($1) AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1`,
      [demoConfig.email]
    );

    let userId: number;

    if (userResult.rows.length === 0) {
      // Find or create role
      let roleRes = await db.query<{ id: number }>(
        `SELECT id FROM roles WHERE code = $1 LIMIT 1`,
        [demoConfig.role_code]
      );

      let roleId: number;
      if (roleRes.rows.length === 0) {
        const newRole = await db.query<{ id: number }>(
          `INSERT INTO roles (name, code, scope_code) VALUES ($1, $2, $3) RETURNING id`,
          [
            demoConfig.role_code.replace("_", " ").toUpperCase(),
            demoConfig.role_code,
            demoConfig.role_code === "institution_admin" ? "institution" : "global",
          ]
        );
        roleId = newRole.rows[0].id;
      } else {
        roleId = roleRes.rows[0].id;
      }

      // Create user using lib query
      const hashedPass = await hashPassword("DemoPassword123");
      const inserted = await insertUser(db, {
        full_name: demoConfig.full_name,
        email: demoConfig.email,
        phone: demoConfig.phone,
        password: hashedPass,
        is_active: true,
        is_verified: true,
        is_profile_complete: true,
      });

      userId = inserted.id;

      // Assign role
      await insertUserRole(db, userId, roleId);

      // Create user_profile
      await db.query(
        `INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [userId]
      );

      // If student, ensure student_profiles
      if (demoConfig.role_code === "student") {
        await db.query(
          `INSERT INTO student_profiles (user_id, admission_number)
           VALUES ($1, 'DEMO-STU-001')
           ON CONFLICT DO NOTHING`,
          [userId]
        );
      }
    } else {
      userId = userResult.rows[0].id;
      // Ensure user is active
      await db.query(`UPDATE users SET is_active = TRUE WHERE id = $1`, [userId]);
    }

    const fullUser = await getUserById(db, userId);
    if (!fullUser) {
      throw new Error("Failed to load demo user profile");
    }

    const sessionId = randomUUID();
    await createSession(
      sessionId,
      userId,
      req.headers.get("user-agent") || "Demo-Client",
      "ip"
    );

    const accessToken = createAccessToken(userId, sessionId);
    const sessionUser = toSessionUser(fullUser);

    const subscriptionRedirectTo = await getSubscriptionRedirectForUser(db, fullUser);
    const roleRedirect = toRoleRoutePath("/admin", sessionUser);
    const finalRedirect = subscriptionRedirectTo || roleRedirect;

    const response = NextResponse.json({
      user: sessionUser,
      accessToken,
      redirectTo: finalRedirect,
    });

    response.cookies.set("refresh_token", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("Demo login API error:", err);
    const message = err instanceof Error ? err.message : "Demo login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
