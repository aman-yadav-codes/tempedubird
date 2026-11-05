import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { syncInstitutionAcademicYearsFromTemplates } from "@/lib/queries/academic-sessions";

export async function GET(req: Request) {
  try {
    const types = await db.query(
      `SELECT id, name, slug FROM institution_types WHERE COALESCE(is_deleted, false) = false ORDER BY id ASC`
    );
    return NextResponse.json({ success: true, data: types.rows });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Business / Institution name is required" }, { status: 400 });
    }

    let institutionTypeId = body.institutionTypeId ? Number(body.institutionTypeId) : null;
    const phone = body.phone?.trim() || currentUser.phone || null;
    const email = body.email?.trim() || currentUser.email || null;
    const website = body.website?.trim() || null;
    const about = body.about?.trim() || null;
    const establishedYear = body.establishedYear ? Number(body.establishedYear) : null;

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // If type not provided, find or fallback
      if (!institutionTypeId) {
        const typeRes = await client.query<{ id: number }>(
          `SELECT id FROM institution_types WHERE COALESCE(is_deleted, false) = false ORDER BY id ASC LIMIT 1`
        );
        institutionTypeId = typeRes.rows[0]?.id;
        if (!institutionTypeId) {
          const newType = await client.query<{ id: number }>(
            `INSERT INTO institution_types (name, slug, is_active, created_at, updated_at)
             VALUES ('Institute', 'institute', true, NOW(), NOW())
             RETURNING id`
          );
          institutionTypeId = newType.rows[0]?.id;
        }
      }

      // Generate unique slug
      const rawSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      let candidateSlug = rawSlug || "business";
      let suffix = 1;
      while (true) {
        const chk = await client.query(`SELECT id FROM institution_profiles WHERE slug = $1 LIMIT 1`, [candidateSlug]);
        if (chk.rows.length === 0) break;
        candidateSlug = `${rawSlug}-${suffix++}`;
      }

      // Insert institution profile
      const instRes = await client.query<{ id: number; name: string; slug: string }>(
        `INSERT INTO institution_profiles (
           name, slug, institution_type_id, phone, email, website, about, established_year,
           is_active, is_marketplace_enabled, is_deleted, created_by, updated_by, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true, false, $9, $9, NOW(), NOW())
         RETURNING id, name, slug`,
        [name, candidateSlug, institutionTypeId, phone, email, website, about, establishedYear, currentUser.id]
      );

      const newInst = instRes.rows[0];

      // Setup academic sessions
      try {
        await syncInstitutionAcademicYearsFromTemplates(client, [newInst.id], currentUser.id);
      } catch (sessionErr) {
        console.error("[create-business] sync academic session error:", sessionErr);
      }

      // Setup 1-year active subscription
      try {
        const pkgRes = await client.query<{ id: number }>(
          `SELECT id FROM sales_packages WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY id ASC LIMIT 1`
        );
        const packageId = pkgRes.rows[0]?.id || 1;
        await client.query(
          `INSERT INTO institution_subscriptions (
             institution_id, package_id, status, starts_at, expires_at, storage_limit_gb,
             price, price_unit, validity_count, validity_unit, created_by, updated_by
           ) VALUES ($1, $2, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 500, 0, 'year', 1, 'year', $3, $3)
           ON CONFLICT DO NOTHING`,
          [newInst.id, packageId, currentUser.id]
        );
      } catch (subErr) {
        console.error("[create-business] subscription error:", subErr);
      }

      // Find institution_admin role id
      const roleRes = await client.query<{ id: number }>(
        `SELECT id FROM roles WHERE code = 'institution_admin' AND COALESCE(is_deleted, false) = false LIMIT 1`
      );
      const adminRoleId = roleRes.rows[0]?.id || 7;

      // Attach creator as active institution_admin member
      await client.query(
        `INSERT INTO institution_memberships (
           institution_id, user_id, role_id, is_active, status, join_date, is_current
         ) VALUES ($1, $2, $3, true, 'ACTIVE', CURRENT_TIMESTAMP, true)
         ON CONFLICT (institution_id, user_id)
         DO UPDATE SET
           role_id = EXCLUDED.role_id,
           is_active = true,
           status = 'ACTIVE',
           is_current = true,
           is_deleted = false,
           updated_at = NOW()`,
        [newInst.id, currentUser.id, adminRoleId]
      );

      // Ensure user has role in user_roles
      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [currentUser.id, adminRoleId]
      ).catch(() => {});

      // Update public profile under_institution_id if present
      await client.query(
        `UPDATE user_public_profiles
         SET under_institution_id = $1, updated_at = NOW()
         WHERE user_id = $2`,
        [newInst.id, currentUser.id]
      ).catch(() => {});

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        data: {
          id: newInst.id,
          name: newInst.name,
          slug: newInst.slug,
          roleName: "Institution Admin",
        },
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.error("[create-business] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create business profile" },
      { status: 500 }
    );
  }
}
