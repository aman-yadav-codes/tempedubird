import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createAccessToken } from "@/lib/auth/jwt";
import { toSessionUser } from "@/lib/auth/session-user";
import { db } from "@/lib/db/db";
import { getUserById, insertUser, insertUserRole } from "@/lib/queries/user";
import { createSession } from "@/models/sessionModel";
import { toRoleRoutePath } from "@/lib/auth/role-routes";
import { hashPassword } from "@/lib/auth/hash";

const DEMO_FALLBACKS: Record<number, { email: string; full_name: string; role_code: string; phone: string }> = {
  9901: { email: "demo.student@edubird.com", full_name: "Aarav Sharma (Student)", role_code: "student", phone: "9876543210" },
  9902: { email: "demo.guardian@edubird.com", full_name: "Demo Guardian (Parent)", role_code: "parent", phone: "9876543211" },
  9903: { email: "rajesh.verma@maasharda.com", full_name: "Prof. Rajesh Verma (Teacher)", role_code: "teacher", phone: "9876543222" },
  9904: { email: "ramesh.driver@maasharda.com", full_name: "Ramesh Kumar (Transport Driver)", role_code: "driver", phone: "9876543223" },
  9905: { email: "deepakdv74@gmail.com", full_name: "Deepak Yadav (Maa Sharda Institute Admin)", role_code: "institution_admin", phone: "8887787846" },
  9906: { email: "demo.platform_admin@edubird.com", full_name: "Demo Platform Super Admin", role_code: "platform_admin", phone: "9876543213" },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let userId = Number(body.userId);

    if (!userId || !Number.isInteger(userId)) {
      return NextResponse.json({ error: "Valid User ID is required" }, { status: 400 });
    }

    let user = await getUserById(db, userId);

    // If not found by numeric ID, check if it's one of the demo fallback codes (9901-9906)
    if (!user && DEMO_FALLBACKS[userId]) {
      const demo = DEMO_FALLBACKS[userId];
      const byEmail = await db.query<{ id: number }>(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1`,
        [demo.email]
      );

      if (byEmail.rows.length > 0) {
        user = await getUserById(db, byEmail.rows[0].id);
      } else {
        // Create user
        const hashed = await hashPassword("DemoPassword123");
        const inserted = await insertUser(db, {
          full_name: demo.full_name,
          email: demo.email,
          phone: demo.phone,
          password: hashed,
          is_active: true,
          is_verified: true,
          is_profile_complete: true,
        });

        // Ensure role exists and assign
        let roleRes = await db.query<{ id: number }>(`SELECT id FROM roles WHERE code = $1 LIMIT 1`, [demo.role_code]);
        let roleId = roleRes.rows[0]?.id;
        if (!roleId) {
          const newRole = await db.query<{ id: number }>(
            `INSERT INTO roles (name, code, scope_code) VALUES ($1, $2, $3) RETURNING id`,
            [demo.role_code.toUpperCase(), demo.role_code, demo.role_code === "institution_admin" ? "institution" : "global"]
          );
          roleId = newRole.rows[0].id;
        }
        await insertUserRole(db, inserted.id, roleId);

        // If teacher, driver or inst admin, link to institution 1
        if (["teacher", "driver", "institution_admin"].includes(demo.role_code)) {
          await db.query(
            `INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active)
             VALUES ($1, 1, $2, TRUE) ON CONFLICT DO NOTHING`,
            [inserted.id, roleId]
          );
        }

        user = await getUserById(db, inserted.id);
      }
    }

    if (!user) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    // Reactivate and mark verified
    await db.query(`UPDATE users SET is_active = TRUE, is_verified = TRUE WHERE id = $1`, [user.id]);

    const sessionUser = toSessionUser(user);
    const sessionId = randomUUID();

    // Correct signature: createSession(id, userId, userAgent, ip)
    await createSession(
      sessionId,
      user.id,
      req.headers.get("user-agent") || "EduBird Multi-Account Switcher",
      "127.0.0.1"
    );

    // Correct signature: createAccessToken(userId, sessionId)
    const token = createAccessToken(user.id, sessionId);

    // Determine target redirect route
    let redirectTo = toRoleRoutePath("/admin", sessionUser);
    if (sessionUser.role_codes?.includes("student")) {
      redirectTo = "/student/dashboard";
    } else if (sessionUser.role_codes?.includes("parent") || sessionUser.role_codes?.includes("guardian")) {
      redirectTo = "/parent/dashboard";
    } else if (
      sessionUser.role_codes?.includes("institution_admin") ||
      sessionUser.role_codes?.includes("school_owner") ||
      sessionUser.role_codes?.includes("college_owner")
    ) {
      redirectTo = "/instituteadmin/dashboard";
    } else if (sessionUser.role_codes?.includes("platform_admin") || sessionUser.is_super_admin) {
      redirectTo = "/platformadmin/dashboard";
    } else if (sessionUser.role_codes?.includes("teacher")) {
      redirectTo = "/instituteadmin/master-data";
    } else if (sessionUser.role_codes?.includes("driver")) {
      redirectTo = "/admin/institution/my-attendance";
    }

    const response = NextResponse.json({
      user: sessionUser,
      accessToken: token,
      redirectTo,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    response.cookies.set("refresh_token", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    response.cookies.set("user_role", sessionUser.primary_role || "user", {
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("Account switch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to switch account" },
      { status: 500 }
    );
  }
}
