import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser, isInstitutionAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { hashPassword } from "@/lib/auth/hash";
import { saveUserPlainPassword, getUserPlainPassword, ensureUserPasswordsTable } from "@/lib/queries/user-passwords";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    await ensureUserPasswordsTable(db);
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAllowed = isPlatformAdminUser(user) || isInstitutionAdminUser(user);
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId") || url.searchParams.get("id");
    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const clientRes = await db.query(
      `SELECT id, name, company_name, email, phone, status, user_id, channels, password, plain_password FROM clients WHERE id = $1`,
      [clientId]
    );

    if (clientRes.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = clientRes.rows[0];

    // Check if user exists
    let matchedUser = null;
    if (client.user_id) {
      const uRes = await db.query(`SELECT id, full_name, email, phone, is_active FROM users WHERE id = $1`, [client.user_id]);
      matchedUser = uRes.rows[0] || null;
    }

    if (!matchedUser && (client.email || client.phone)) {
      const uRes = await db.query(
        `SELECT id, full_name, email, phone, is_active FROM users 
         WHERE (lower(email) = lower($1) AND $1 <> '') OR (phone = $2 AND $2 <> '') 
         ORDER BY id DESC LIMIT 1`,
        [client.email || "", client.phone || ""]
      );
      matchedUser = uRes.rows[0] || null;
      if (matchedUser) {
        // Link user_id back to client
        await db.query(`UPDATE clients SET user_id = $1 WHERE id = $2`, [matchedUser.id, client.id]);
      }
    }

    let plainPassword: string | null = null;
    if (matchedUser?.id) {
      plainPassword = client.plain_password || (await getUserPlainPassword(db, matchedUser.id));
    }

    return NextResponse.json({
      exists: Boolean(matchedUser),
      client: {
        id: client.id,
        name: client.name,
        company_name: client.company_name,
        email: client.email,
        phone: client.phone,
        status: client.status,
        channels: client.channels,
      },
      user: matchedUser
        ? {
            id: matchedUser.id,
            email: matchedUser.email,
            phone: matchedUser.phone,
            is_active: matchedUser.is_active,
          }
        : null,
      plainPassword,
    });
  } catch (error: any) {
    console.error("[GET /api/admin/sales/clients/credentials] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch client credentials" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    await ensureUserPasswordsTable(db);
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAllowed = isPlatformAdminUser(user) || isInstitutionAdminUser(user);
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const { clientId, email, phone, password } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const cleanPassword = String(password || "").trim();
    if (!cleanPassword || cleanPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const cleanEmail = email && String(email).trim().length > 0 ? String(email).trim().toLowerCase() : null;
    const cleanPhone = phone && String(phone).trim().length > 0 ? String(phone).trim() : null;

    if (!cleanEmail && !cleanPhone) {
      return NextResponse.json({ error: "Either email or phone number is required as login identifier" }, { status: 400 });
    }

    // Fetch client
    const clientRes = await db.query(
      `SELECT id, name, company_name, email, phone, institution_id, user_id FROM clients WHERE id = $1`,
      [clientId]
    );

    if (clientRes.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = clientRes.rows[0];
    const clientFullName = client.name || client.company_name || "Client";
    const hashedPassword = await hashPassword(cleanPassword);

    // Get or ensure role 'client'
    let roleRes = await db.query(`SELECT id FROM roles WHERE code = 'client' LIMIT 1`);
    if (roleRes.rows.length === 0) {
      await db.query(`
        INSERT INTO roles (name, code, scope_id, is_system)
        VALUES ('Client', 'client', 1, TRUE)
        ON CONFLICT (code) DO NOTHING
      `);
      roleRes = await db.query(`SELECT id FROM roles WHERE code = 'client' LIMIT 1`);
    }
    const clientRoleId = roleRes.rows[0]?.id;

    // Check if user already exists
    let existingUser = null;
    if (client.user_id) {
      const u = await db.query(`SELECT id FROM users WHERE id = $1`, [client.user_id]);
      existingUser = u.rows[0] || null;
    }

    if (!existingUser) {
      const u = await db.query(
        `SELECT id FROM users 
         WHERE (email IS NOT NULL AND lower(email) = lower($1) AND $1 <> '')
            OR (phone IS NOT NULL AND phone = $2 AND $2 <> '')
         ORDER BY id DESC LIMIT 1`,
        [cleanEmail || "", cleanPhone || ""]
      );
      existingUser = u.rows[0] || null;
    }

    let finalUserId: number;

    if (existingUser) {
      finalUserId = existingUser.id;
      // Update existing user password and info
      await db.query(
        `UPDATE users
         SET password = $1,
             full_name = COALESCE(NULLIF($2, ''), full_name),
             email = COALESCE($3, email),
             phone = COALESCE($4, phone),
             is_active = TRUE,
             is_deleted = FALSE,
             deleted_at = NULL,
             deleted_by = NULL,
             updated_at = NOW()
         WHERE id = $5`,
        [hashedPassword, clientFullName, cleanEmail, cleanPhone, finalUserId]
      );
    } else {
      // Create new user
      const insRes = await db.query(
        `INSERT INTO users (full_name, email, phone, password, is_active, is_verified)
         VALUES ($1, $2, $3, $4, TRUE, TRUE)
         RETURNING id`,
        [clientFullName, cleanEmail, cleanPhone, hashedPassword]
      );
      finalUserId = insRes.rows[0].id;
    }

    // Ensure role assignment
    if (clientRoleId) {
      await db.query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [finalUserId, clientRoleId]
      ).catch(() => {});
    }

    // If client belongs to an institution, ensure membership
    if (client.institution_id && clientRoleId) {
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
        [client.institution_id, finalUserId, clientRoleId]
      ).catch((err) => {
        console.warn("[Client Credentials] Membership update warning:", err.message);
      });
    }

    // Save plain password for admin reference / copy
    await saveUserPlainPassword(db, finalUserId, cleanPassword, cleanEmail || cleanPhone, "admin_client_portal");

    // Store credentials directly in clients table and link user_id
    await db.query(
      `UPDATE clients 
       SET user_id = $1,
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           password = $4,
           plain_password = $5,
           updated_at = NOW()
       WHERE id = $6`,
      [finalUserId, cleanEmail, cleanPhone, hashedPassword, cleanPassword, client.id]
    );

    return NextResponse.json({
      success: true,
      message: "Client portal password generated and login enabled successfully",
      userId: finalUserId,
      loginIdentifier: cleanEmail || cleanPhone,
    });
  } catch (error: any) {
    console.error("[POST /api/admin/sales/clients/credentials] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to set client credentials" }, { status: 500 });
  }
}

