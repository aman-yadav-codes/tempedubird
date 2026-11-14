import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();

    let query = `
      SELECT 
        it.id,
        it.name,
        it.slug,
        it.is_active,
        COALESCE(it.updated_at, it.created_at) as last_updated,
        (SELECT COUNT(*)::int FROM system_modules sm WHERE sm.status = 'active') as total_modules,
        (
          SELECT COUNT(*)::int 
          FROM business_type_modules btm 
          JOIN system_modules sm ON sm.id = btm.module_id 
          WHERE btm.business_type_id = it.id AND btm.is_enabled = TRUE AND sm.status = 'active'
        ) as enabled_modules,
        (
          SELECT COUNT(*)::int 
          FROM business_type_modules btm 
          JOIN system_modules sm ON sm.id = btm.module_id 
          WHERE btm.business_type_id = it.id AND btm.is_enabled = FALSE AND sm.status = 'active'
        ) as disabled_modules,
        (
          SELECT COUNT(*)::int 
          FROM roles r 
          WHERE COALESCE(r.is_deleted, FALSE) = FALSE AND r.code != 'platform_admin'
        ) as total_roles,
        (
          SELECT COUNT(*)::int 
          FROM business_type_roles btr 
          JOIN roles r ON r.id = btr.role_id 
          WHERE btr.business_type_id = it.id AND btr.is_enabled = TRUE AND COALESCE(r.is_deleted, FALSE) = FALSE AND r.code != 'platform_admin'
        ) as enabled_roles,
        (
          SELECT COUNT(*)::int 
          FROM business_type_roles btr 
          JOIN roles r ON r.id = btr.role_id 
          WHERE btr.business_type_id = it.id AND btr.is_enabled = FALSE AND COALESCE(r.is_deleted, FALSE) = FALSE AND r.code != 'platform_admin'
        ) as disabled_roles
      FROM institution_types it
      WHERE COALESCE(it.is_deleted, FALSE) = FALSE
    `;

    const params: any[] = [];
    if (search) {
      query += ` AND (LOWER(it.name) LIKE $1 OR LOWER(it.slug) LIKE $1)`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY it.name ASC`;

    const result = await db.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      totalCount: result.rows.length,
    });
  } catch (err: unknown) {
    console.error("[GET /api/admin/business-type-access] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load business types" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || !isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Platform Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, template = "commercial" } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Business type name is required" }, { status: 400 });
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const insertType = await db.query(
      `INSERT INTO institution_types (name, slug, is_active, is_deleted, created_at, updated_at)
       VALUES ($1, $2, true, false, NOW(), NOW())
       RETURNING id, name, slug`,
      [name.trim(), cleanSlug]
    );

    const newId = insertType.rows[0].id;

    // Seed default module access for this new business type
    const allModules = await db.query(`SELECT id, module_key FROM system_modules WHERE status = 'active'`);
    const academicPrefixes = ["classroom", "academics", "students", "institutions", "inst_"];

    for (const mod of allModules.rows) {
      let isEnabled = true;
      if (template === "commercial" && academicPrefixes.some((prefix) => mod.module_key === prefix || mod.module_key.startsWith(prefix))) {
        isEnabled = false;
      }
      await db.query(
        `INSERT INTO business_type_modules (business_type_id, module_id, is_enabled, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (business_type_id, module_id) DO NOTHING`,
        [newId, mod.id, isEnabled]
      );
    }

    // Seed default role access for this new business type
    const allRoles = await db.query(`SELECT id, code FROM roles WHERE COALESCE(is_deleted, false) = false AND code != 'platform_admin'`);
    const academicRoleCodes = new Set([
      "teacher", "student", "parent", "principal", "vice_principal", "dean",
      "academic_coordinator", "faculty", "tutor", "teaching_assistant",
      "doubt_expert", "counselor", "admission_counselor", "institution_accountant",
      "fee_collector", "exam_controller", "curriculum_developer", "librarian",
      "lab_assistant", "placement_officer", "hostel_warden", "sports_coach"
    ]);

    for (const role of allRoles.rows) {
      let isEnabled = true;
      if (template === "commercial" && academicRoleCodes.has(role.code.toLowerCase())) {
        isEnabled = false;
      }
      await db.query(
        `INSERT INTO business_type_roles (business_type_id, role_id, is_enabled, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (business_type_id, role_id) DO NOTHING`,
        [newId, role.id, isEnabled]
      );
    }

    return NextResponse.json({
      success: true,
      message: `Business type "${name}" created with default ${template} module and role permissions.`,
      businessType: insertType.rows[0],
    });
  } catch (err: unknown) {
    console.error("[POST /api/admin/business-type-access] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create business type" },
      { status: 500 }
    );
  }
}

