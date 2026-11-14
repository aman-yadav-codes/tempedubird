import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser, isInstitutionAdminUser } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") || "all").toLowerCase();
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit")) || 40));
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const offset = (page - 1) * limit;

    const likeQ = q ? `%${q}%` : null;

    let items: Array<{
      id: number;
      entityType: "product" | "service" | "category" | "business" | "professional";
      name: string;
      slug: string;
      subtitle?: string;
      category_name?: string;
      synonyms: string[];
      updated_at?: string;
    }> = [];

    // 1. Products
    if (type === "all" || type === "product") {
      const pParams: any[] = [];
      let pWhere = "COALESCE(mp.is_active, true) = true";
      if (likeQ) {
        pParams.push(likeQ);
        pWhere += ` AND (mp.name ILIKE $${pParams.length} OR array_to_string(mp.synonyms, ' ') ILIKE $${pParams.length} OR COALESCE(mp.brand, '') ILIKE $${pParams.length})`;
      }
      const res = await db.query(
        `SELECT
          mp.id,
          mp.name,
          mp.slug,
          mp.brand,
          c.name AS category_name,
          COALESCE(mp.synonyms, '{}') AS synonyms,
          mp.updated_at
        FROM master_products mp
        LEFT JOIN categories c ON c.id = mp.category_id
        WHERE ${pWhere}
        ORDER BY mp.id DESC
        LIMIT 30`,
        pParams
      );
      items.push(
        ...res.rows.map((r: any) => ({
          id: r.id,
          entityType: "product" as const,
          name: r.name,
          slug: r.slug,
          subtitle: [r.brand, r.category_name].filter(Boolean).join(" • "),
          category_name: r.category_name,
          synonyms: Array.isArray(r.synonyms) ? r.synonyms : [],
          updated_at: r.updated_at,
        }))
      );
    }

    // 2. Services
    if (type === "all" || type === "service") {
      const sParams: any[] = [];
      let sWhere = "COALESCE(ms.is_active, true) = true";
      if (likeQ) {
        sParams.push(likeQ);
        sWhere += ` AND (ms.name ILIKE $${sParams.length} OR array_to_string(ms.synonyms, ' ') ILIKE $${sParams.length})`;
      }
      const res = await db.query(
        `SELECT
          ms.id,
          ms.name,
          ms.slug,
          ms.pricing_model,
          c.name AS category_name,
          COALESCE(ms.synonyms, '{}') AS synonyms,
          ms.updated_at
        FROM master_services ms
        LEFT JOIN categories c ON c.id = ms.category_id
        WHERE ${sWhere}
        ORDER BY ms.id DESC
        LIMIT 30`,
        sParams
      );
      items.push(
        ...res.rows.map((r: any) => ({
          id: r.id,
          entityType: "service" as const,
          name: r.name,
          slug: r.slug,
          subtitle: [r.pricing_model, r.category_name].filter(Boolean).join(" • "),
          category_name: r.category_name,
          synonyms: Array.isArray(r.synonyms) ? r.synonyms : [],
          updated_at: r.updated_at,
        }))
      );
    }

    // 3. Categories
    if (type === "all" || type === "category") {
      const cParams: any[] = [];
      let cWhere = "COALESCE(c.is_deleted, false) = false AND COALESCE(c.is_active, true) = true";
      if (likeQ) {
        cParams.push(likeQ);
        cWhere += ` AND (c.name ILIKE $${cParams.length} OR array_to_string(c.synonyms, ' ') ILIKE $${cParams.length} OR c.slug ILIKE $${cParams.length})`;
      }
      const res = await db.query(
        `SELECT
          c.id,
          c.name,
          c.slug,
          c.category_type,
          parent.name AS parent_name,
          COALESCE(c.synonyms, '{}') AS synonyms,
          c.updated_at
        FROM categories c
        LEFT JOIN categories parent ON parent.id = c.parent_id
        WHERE ${cWhere}
        ORDER BY c.id DESC
        LIMIT 30`,
        cParams
      );
      items.push(
        ...res.rows.map((r: any) => ({
          id: r.id,
          entityType: "category" as const,
          name: r.name,
          slug: r.slug,
          subtitle: [r.category_type ? `${r.category_type} classification` : null, r.parent_name ? `Parent: ${r.parent_name}` : null].filter(Boolean).join(" • "),
          category_name: r.parent_name || r.category_type,
          synonyms: Array.isArray(r.synonyms) ? r.synonyms : [],
          updated_at: r.updated_at,
        }))
      );
    }

    // 4. Businesses
    if (type === "all" || type === "business") {
      const bParams: any[] = [];
      let bWhere = "COALESCE(bp.is_active, true) = true";
      if (likeQ) {
        bParams.push(likeQ);
        bWhere += ` AND (bp.name ILIKE $${bParams.length} OR array_to_string(bp.synonyms, ' ') ILIKE $${bParams.length} OR bp.business_type ILIKE $${bParams.length} OR bp.city ILIKE $${bParams.length})`;
      }
      const res = await db.query(
        `SELECT
          bp.id,
          bp.name,
          bp.slug,
          bp.business_type,
          bp.city,
          c.name AS category_name,
          COALESCE(bp.synonyms, '{}') AS synonyms,
          bp.updated_at
        FROM business_profiles bp
        LEFT JOIN categories c ON c.id = bp.category_id
        WHERE ${bWhere}
        ORDER BY bp.id DESC
        LIMIT 30`,
        bParams
      );
      items.push(
        ...res.rows.map((r: any) => ({
          id: r.id,
          entityType: "business" as const,
          name: r.name,
          slug: r.slug,
          subtitle: [r.business_type, r.category_name, r.city].filter(Boolean).join(" • "),
          category_name: r.category_name,
          synonyms: Array.isArray(r.synonyms) ? r.synonyms : [],
          updated_at: r.updated_at,
        }))
      );
    }

    // 5. Professionals
    if (type === "all" || type === "professional") {
      const prParams: any[] = [];
      let prWhere = "COALESCE(pp.is_active, true) = true";
      if (likeQ) {
        prParams.push(likeQ);
        prWhere += ` AND (pp.name ILIKE $${prParams.length} OR array_to_string(pp.synonyms, ' ') ILIKE $${prParams.length} OR pp.profession_type ILIKE $${prParams.length} OR pp.city ILIKE $${prParams.length})`;
      }
      const res = await db.query(
        `SELECT
          pp.id,
          pp.name,
          pp.slug,
          pp.profession_type,
          pp.designation,
          pp.city,
          c.name AS category_name,
          COALESCE(pp.synonyms, '{}') AS synonyms,
          pp.updated_at
        FROM professional_profiles pp
        LEFT JOIN categories c ON c.id = pp.category_id
        WHERE ${prWhere}
        ORDER BY pp.id DESC
        LIMIT 30`,
        prParams
      );
      items.push(
        ...res.rows.map((r: any) => ({
          id: r.id,
          entityType: "professional" as const,
          name: r.name,
          slug: r.slug,
          subtitle: [r.designation || r.profession_type, r.category_name, r.city].filter(Boolean).join(" • "),
          category_name: r.category_name,
          synonyms: Array.isArray(r.synonyms) ? r.synonyms : [],
          updated_at: r.updated_at,
        }))
      );
    }

    return NextResponse.json({
      success: true,
      items: items.slice(offset, offset + limit),
      total: items.length,
      page,
      limit,
    });
  } catch (err: any) {
    console.error("[GET /api/admin/synonyms] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load synonyms" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { entityType, entityId, synonyms, newSynonym } = body;

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
    }

    const id = Number(entityId);
    let synonymsArr: string[] = [];

    if (synonyms !== undefined) {
      synonymsArr = Array.isArray(synonyms)
        ? synonyms.map((s) => String(s).trim()).filter(Boolean)
        : String(synonyms)
            .split(/[,;\n]+/)
            .map((s) => s.trim())
            .filter(Boolean);
    } else if (newSynonym) {
      // Append single synonym
      const cleanSynonym = String(newSynonym).trim();
      if (!cleanSynonym) {
        return NextResponse.json({ error: "Synonym cannot be empty" }, { status: 400 });
      }

      // Fetch existing
      let tableName = "";
      if (entityType === "product") tableName = "master_products";
      else if (entityType === "service") tableName = "master_services";
      else if (entityType === "category") tableName = "categories";
      else if (entityType === "business") tableName = "business_profiles";
      else if (entityType === "professional") tableName = "professional_profiles";
      else return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });

      const existingRes = await db.query(`SELECT COALESCE(synonyms, '{}') AS synonyms FROM ${tableName} WHERE id = $1`, [id]);
      const existing = existingRes.rows[0]?.synonyms || [];
      synonymsArr = Array.from(new Set([...existing, cleanSynonym]));
    }

    // Deduplicate case-insensitively while preserving readable case
    const seen = new Set<string>();
    const finalSynonyms: string[] = [];
    for (const syn of synonymsArr) {
      const lower = syn.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        finalSynonyms.push(syn);
      }
    }

    if (entityType === "product") {
      await db.query(`UPDATE master_products SET synonyms = $1, updated_at = NOW() WHERE id = $2`, [finalSynonyms, id]);
      await db.query(`UPDATE products SET synonyms = $1, updated_at = NOW() WHERE master_product_id = $2 OR id = $2`, [finalSynonyms, id]).catch(() => {});
    } else if (entityType === "service") {
      await db.query(`UPDATE master_services SET synonyms = $1, updated_at = NOW() WHERE id = $2`, [finalSynonyms, id]);
      await db.query(`UPDATE services SET synonyms = $1, updated_at = NOW() WHERE master_service_id = $2 OR id = $2`, [finalSynonyms, id]).catch(() => {});
    } else if (entityType === "category") {
      await db.query(`UPDATE categories SET synonyms = $1, updated_at = NOW() WHERE id = $2`, [finalSynonyms, id]);
    } else if (entityType === "business") {
      await db.query(`UPDATE business_profiles SET synonyms = $1, updated_at = NOW() WHERE id = $2`, [finalSynonyms, id]);
    } else if (entityType === "professional") {
      await db.query(`UPDATE professional_profiles SET synonyms = $1, updated_at = NOW() WHERE id = $2`, [finalSynonyms, id]);
    } else {
      return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      entityType,
      entityId: id,
      synonyms: finalSynonyms,
    });
  } catch (err: any) {
    console.error("[POST /api/admin/synonyms] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to save synonyms" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = Number(searchParams.get("entityId"));
    const synonymToRemove = searchParams.get("synonym");

    if (!entityType || !entityId || !synonymToRemove) {
      return NextResponse.json({ error: "entityType, entityId, and synonym are required" }, { status: 400 });
    }

    let tableName = "";
    if (entityType === "product") tableName = "master_products";
    else if (entityType === "service") tableName = "master_services";
    else if (entityType === "category") tableName = "categories";
    else if (entityType === "business") tableName = "business_profiles";
    else if (entityType === "professional") tableName = "professional_profiles";
    else return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });

    const existingRes = await db.query(`SELECT COALESCE(synonyms, '{}') AS synonyms FROM ${tableName} WHERE id = $1`, [entityId]);
    const existing: string[] = existingRes.rows[0]?.synonyms || [];
    const updated = existing.filter((s) => s.toLowerCase() !== synonymToRemove.toLowerCase());

    await db.query(`UPDATE ${tableName} SET synonyms = $1, updated_at = NOW() WHERE id = $2`, [updated, entityId]);

    return NextResponse.json({
      success: true,
      entityType,
      entityId,
      synonyms: updated,
    });
  } catch (err: any) {
    console.error("[DELETE /api/admin/synonyms] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to remove synonym" }, { status: 500 });
  }
}

