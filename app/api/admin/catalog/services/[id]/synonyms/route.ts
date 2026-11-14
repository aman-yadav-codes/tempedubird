import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const serviceId = Number(id);
    if (!serviceId) {
      return NextResponse.json({ error: "Invalid service ID" }, { status: 400 });
    }

    const res = await db.query(
      `SELECT id, service_id, synonym, language, country_code, is_active, created_at, updated_at
       FROM master_service_synonyms
       WHERE service_id = $1
       ORDER BY LOWER(synonym) ASC`,
      [serviceId]
    );

    return NextResponse.json({ success: true, synonyms: res.rows });
  } catch (error: any) {
    console.error("Failed to load service synonyms:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load service synonyms" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const serviceId = Number(id);
    if (!serviceId) {
      return NextResponse.json({ error: "Invalid service ID" }, { status: 400 });
    }

    const body = await req.json();
    const synonym = body.synonym?.trim();
    const language = body.language?.trim() || "en";
    const countryCode = body.countryCode?.trim()?.toUpperCase() || null;
    const isActive = body.isActive !== false;

    if (!synonym) {
      return NextResponse.json({ error: "Synonym cannot be empty" }, { status: 400 });
    }

    // Duplicate detection (case-insensitive check)
    const dupCheck = await db.query(
      `SELECT id FROM master_service_synonyms 
       WHERE service_id = $1 AND LOWER(synonym) = LOWER($2) LIMIT 1`,
      [serviceId, synonym]
    );

    if (dupCheck.rows.length > 0) {
      return NextResponse.json(
        { error: `The synonym "${synonym}" already exists for this service (duplicate detected).` },
        { status: 409 }
      );
    }

    const res = await db.query(
      `INSERT INTO master_service_synonyms (
         service_id, synonym, language, country_code, is_active, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [serviceId, synonym, language, countryCode, isActive]
    );

    // Sync synonyms array on master_services table
    await db.query(
      `UPDATE master_services
       SET synonyms = (
         SELECT array_agg(DISTINCT synonym ORDER BY synonym)
         FROM master_service_synonyms
         WHERE service_id = $1 AND is_active = true
       ),
       updated_at = NOW()
       WHERE id = $1`,
      [serviceId]
    );

    return NextResponse.json({ success: true, synonym: res.rows[0] });
  } catch (error: any) {
    console.error("Failed to add service synonym:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add service synonym" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const serviceId = Number(id);
    const body = await req.json();
    const synonymId = Number(body.synonymId);

    if (!synonymId || !serviceId) {
      return NextResponse.json({ error: "synonymId and serviceId are required" }, { status: 400 });
    }

    const updates: string[] = ["updated_at = NOW()"];
    const p: any[] = [];
    let idx = 1;

    if (body.synonym !== undefined) {
      const cleanSyn = body.synonym.trim();
      if (!cleanSyn) return NextResponse.json({ error: "Synonym cannot be empty" }, { status: 400 });
      // Duplicate check
      const dup = await db.query(
        `SELECT id FROM master_service_synonyms WHERE service_id = $1 AND LOWER(synonym) = LOWER($2) AND id != $3 LIMIT 1`,
        [serviceId, cleanSyn, synonymId]
      );
      if (dup.rows.length > 0) {
        return NextResponse.json({ error: `Duplicate synonym "${cleanSyn}" already exists.` }, { status: 409 });
      }
      updates.push(`synonym = $${idx++}`);
      p.push(cleanSyn);
    }

    if (body.language !== undefined) {
      updates.push(`language = $${idx++}`);
      p.push(body.language.trim() || "en");
    }

    if (body.countryCode !== undefined) {
      updates.push(`country_code = $${idx++}`);
      p.push(body.countryCode?.trim()?.toUpperCase() || null);
    }

    if (body.isActive !== undefined) {
      updates.push(`is_active = $${idx++}`);
      p.push(Boolean(body.isActive));
    }

    p.push(synonymId, serviceId);
    const res = await db.query(
      `UPDATE master_service_synonyms 
       SET ${updates.join(", ")}
       WHERE id = $${idx++} AND service_id = $${idx}
       RETURNING *`,
      p
    );

    // Sync master_services synonyms array
    await db.query(
      `UPDATE master_services
       SET synonyms = (
         SELECT array_agg(DISTINCT synonym ORDER BY synonym)
         FROM master_service_synonyms
         WHERE service_id = $1 AND is_active = true
       ),
       updated_at = NOW()
       WHERE id = $1`,
      [serviceId]
    );

    return NextResponse.json({ success: true, synonym: res.rows[0] });
  } catch (error: any) {
    console.error("Failed to update service synonym:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update service synonym" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const serviceId = Number(id);
    const { searchParams } = new URL(req.url);
    const synonymId = Number(searchParams.get("synonymId"));

    if (!synonymId || !serviceId) {
      return NextResponse.json({ error: "synonymId is required" }, { status: 400 });
    }

    await db.query(
      `DELETE FROM master_service_synonyms WHERE id = $1 AND service_id = $2`,
      [synonymId, serviceId]
    );

    // Sync master_services synonyms array
    await db.query(
      `UPDATE master_services
       SET synonyms = COALESCE((
         SELECT array_agg(DISTINCT synonym ORDER BY synonym)
         FROM master_service_synonyms
         WHERE service_id = $1 AND is_active = true
       ), '{}'),
       updated_at = NOW()
       WHERE id = $1`,
      [serviceId]
    );

    return NextResponse.json({ success: true, message: "Synonym deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete service synonym:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete service synonym" },
      { status: 500 }
    );
  }
}

