import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser, isInstitutionAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { getFrontendConfig } from "@/lib/config/frontend-config";

async function resolveActiveId(req: Request, user?: any): Promise<number | null> {
  const url = new URL(req.url);
  const qBiz = url.searchParams.get("businessId") || url.searchParams.get("institutionId");
  if (qBiz && /^\d+$/.test(qBiz)) {
    return Number(qBiz);
  }
  const config = getFrontendConfig();
  if (config.mode === "business" && config.businessId) {
    return config.businessId;
  }
  const envId =
    process.env.BUSINESS_ID ||
    process.env.NEXT_PUBLIC_BUSINESS_ID ||
    process.env.INSTITUTION_ID ||
    process.env.NEXT_PUBLIC_INSTITUTION_ID;
  if (envId && /^\d+$/.test(envId.trim())) {
    return Number(envId.trim());
  }
  if (user?.id && !isPlatformAdminUser(user)) {
    const instBiz = await db.query(
      `SELECT COALESCE(bp.id, ip.id) as resolved_id FROM institution_memberships im
       JOIN institution_profiles ip ON ip.id = im.institution_id
       LEFT JOIN business_profiles bp ON bp.institution_profile_id = ip.id
       WHERE im.user_id = $1 AND im.is_active = TRUE
       LIMIT 1`,
      [user.id]
    );
    if (instBiz.rows.length > 0) return instBiz.rows[0].resolved_id;
  }
  return 160;
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req).catch(() => null);
    const targetId = await resolveActiveId(req, user);

    const [facilitiesRes, typesRes] = await Promise.all([
      db.query(
        `SELECT
           f.id,
           f.institution_id,
           f.facility_type_id,
           COALESCE(ft.name, f.title, 'Campus Facility') AS facility_type_name,
           COALESCE(ft.slug, 'facility') AS facility_type_slug,
           f.title,
           f.description,
           f.image_url,
           f.is_active,
           f.display_order,
           f.created_at,
           f.updated_at
         FROM institution_facilities f
         LEFT JOIN facility_types ft ON ft.id = f.facility_type_id
         WHERE (f.institution_id = $1 OR f.institution_id = (SELECT institution_profile_id FROM business_profiles WHERE id = $1 LIMIT 1))
           AND COALESCE(f.is_deleted, FALSE) = FALSE
         ORDER BY f.display_order ASC, f.id ASC`,
        [targetId]
      ),
      db.query(
        `SELECT id, name, slug FROM facility_types WHERE COALESCE(is_active, TRUE) = TRUE ORDER BY name ASC`
      ),
    ]);

    return NextResponse.json({
      success: true,
      institutionId: targetId,
      facilities: facilitiesRes.rows,
      facilityTypes: typesRes.rows,
    });
  } catch (err: any) {
    console.error("[Company Facilities GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load facilities" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const targetId = await resolveActiveId(req, user);
    const body = await req.json();
    const { id, facility_type_id, title, description, image_url, is_active } = body;

    if (!facility_type_id) {
      return NextResponse.json({ error: "facility_type_id is required" }, { status: 400 });
    }

    if (id && Number(id) > 0) {
      // Update existing
      const updated = await db.query(
        `UPDATE institution_facilities
         SET facility_type_id = $1,
             title = $2,
             description = $3,
             image_url = $4,
             is_active = COALESCE($5, is_active),
             updated_at = NOW(),
             updated_by = $6
         WHERE id = $7
         RETURNING *`,
        [
          Number(facility_type_id),
          title || "",
          description || "",
          image_url || null,
          is_active !== undefined ? Boolean(is_active) : true,
          user?.id || null,
          Number(id),
        ]
      );
      return NextResponse.json({ success: true, data: updated.rows[0] });
    }

    // Insert new facility
    const inserted = await db.query(
      `INSERT INTO institution_facilities (
         institution_id, facility_type_id, title, description, image_url, is_active, created_by, updated_by, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, NOW(), NOW())
       RETURNING *`,
      [
        targetId,
        Number(facility_type_id),
        title || "",
        description || "",
        image_url || null,
        is_active !== undefined ? Boolean(is_active) : true,
        user?.id || null,
      ]
    );

    return NextResponse.json({ success: true, data: inserted.rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error("[Company Facilities POST] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to save facility" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "Valid facility id required" }, { status: 400 });
    }

    await db.query(
      `UPDATE institution_facilities
       SET is_deleted = TRUE, is_active = FALSE, deleted_at = NOW(), deleted_by = $1
       WHERE id = $2`,
      [user?.id || null, Number(id)]
    );

    return NextResponse.json({ success: true, message: "Facility removed successfully" });
  } catch (err: any) {
    console.error("[Company Facilities DELETE] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete facility" }, { status: 500 });
  }
}
