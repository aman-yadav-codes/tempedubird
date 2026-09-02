import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const category = url.searchParams.get("category")?.trim() || "";
    const vendorType = url.searchParams.get("type")?.trim() || url.searchParams.get("vendor_type")?.trim() || "";
    const location = url.searchParams.get("location")?.trim() || "";
    const city = url.searchParams.get("city")?.trim() || "";
    const area = url.searchParams.get("area")?.trim() || "";
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";

    const userRole = (user as any)?.role || (user as any)?.role_code || "";
    const userInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const requestedInstId = url.searchParams.get("institution_id") || req.headers.get("x-institution-id");
    const parsedInstId = requestedInstId ? Number(requestedInstId) : null;
    const targetInstId = Number.isInteger(parsedInstId) && (parsedInstId as number) > 0 ? parsedInstId : (userRole === "institution_admin" ? userInstId : null);

    let query = `SELECT * FROM vendors WHERE 1=1`;
    const params: any[] = [];

    const isPlatformAdmin = isPlatformAdminUser(user);
    if (isPlatformAdmin) {
      if (targetInstId) {
        params.push(targetInstId);
        query += ` AND institution_id = $${params.length}`;
      } else {
        query += ` AND institution_id IS NULL`;
      }
    } else if (targetInstId) {
      params.push(targetInstId);
      query += ` AND institution_id = $${params.length}`;
    } else {
      query += ` AND 1=0`;
    }

    if (vendorType && vendorType !== "all") {
      params.push(vendorType);
      query += ` AND vendor_type = $${params.length}`;
    }

    if (category && category !== "all") {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (status && status !== "all") {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (city && city !== "all") {
      params.push(`%${city}%`);
      query += ` AND (city ILIKE $${params.length} OR address ILIKE $${params.length})`;
    }

    if (area && area !== "all") {
      params.push(`%${area}%`);
      query += ` AND (location ILIKE $${params.length} OR address ILIKE $${params.length})`;
    }

    if (location && location !== "all") {
      params.push(`%${location}%`);
      query += ` AND (city ILIKE $${params.length} OR location ILIKE $${params.length} OR address ILIKE $${params.length})`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR company_name ILIKE $${params.length} OR contact_person ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length} OR description ILIKE $${params.length} OR city ILIKE $${params.length} OR location ILIKE $${params.length})`;
    }

    query += ` ORDER BY id DESC`;

    const res = await db.query(query, params);

    // Fetch distinct cities from Master Data locations
    const masterCitiesRes = await db.query(`
      SELECT DISTINCT name as city
      FROM locations
      WHERE type = 'city' AND is_deleted = FALSE AND is_active = TRUE
      ORDER BY name ASC
    `);

    // Fetch areas from Master Data locations (hierarchically filtered by selected city if applicable)
    let areasQuery = `
      SELECT DISTINCT a.name as area
      FROM locations a
      LEFT JOIN locations c ON c.id = a.parent_id
      WHERE a.type = 'area' AND a.is_deleted = FALSE AND a.is_active = TRUE
    `;
    const areaParams: any[] = [];
    if (city && city !== "all") {
      areaParams.push(`%${city}%`);
      areasQuery += ` AND (c.name ILIKE $1)`;
    }
    areasQuery += ` ORDER BY a.name ASC`;

    const masterAreasRes = await db.query(areasQuery, areaParams);

    const distinctCities = masterCitiesRes.rows.map((r: any) => r.city).filter(Boolean);
    const distinctAreas = masterAreasRes.rows.map((r: any) => r.area).filter(Boolean);

    // Fetch vendor categories
    let catQuery = `SELECT * FROM vendor_categories WHERE is_active = TRUE`;
    const catParams: any[] = [];
    if (!isPlatformAdmin && targetInstId) {
      catQuery += ` AND (institution_id = $1 OR institution_id IS NULL)`;
      catParams.push(targetInstId);
    } else if (!isPlatformAdmin) {
      catQuery += ` AND institution_id IS NULL`;
    }
    catQuery += ` ORDER BY id ASC`;
    const categoriesRes = await db.query(catQuery, catParams);

    return NextResponse.json({ 
      vendors: res.rows,
      cities: distinctCities,
      areas: distinctAreas,
      categories: categoriesRes.rows
    });
  } catch (error: any) {
    console.error("[Vendors GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch vendors" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const userRole = (user as any)?.role || (user as any)?.role_code || "";
    const userInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const isAllowed = isPlatformAdminUser(user) || userRole === "institution_admin" || Boolean(userInstId);

    if (!isAllowed) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      company_name,
      contact_person,
      category,
      vendor_type = "vendor",
      phone,
      email,
      website,
      profile_image,
      address,
      city,
      location,
      map_url,
      rating = 4.5,
      description,
      notes,
      status = "active",
      institution_id,
      contacts,
    } = body;

    if (!name || !category) {
      return NextResponse.json({ error: "Vendor name and category are required" }, { status: 400 });
    }

    const primaryPhone = phone?.trim() || (Array.isArray(contacts) && contacts[0]?.phone ? String(contacts[0].phone).trim() : null);
    const primaryEmail = email?.trim() || (Array.isArray(contacts) && contacts[0]?.email ? String(contacts[0].email).trim() : null);

    if (!primaryPhone) {
      return NextResponse.json({ error: "At least one contact phone number is required" }, { status: 400 });
    }

    const targetInstitutionId = isPlatformAdminUser(user)
      ? (institution_id ? Number(institution_id) : null)
      : userInstId;

    const res = await db.query(
      `
      INSERT INTO vendors (
        name,
        company_name,
        contact_person,
        category,
        vendor_type,
        phone,
        email,
        website,
        profile_image,
        address,
        city,
        location,
        map_url,
        rating,
        description,
        notes,
        status,
        institution_id,
        contacts,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
      RETURNING *
      `,
      [
        name.trim(),
        company_name?.trim() || null,
        contact_person?.trim() || null,
        category,
        vendor_type || "vendor",
        primaryPhone,
        primaryEmail,
        website?.trim() || null,
        profile_image || null,
        address?.trim() || null,
        city?.trim() || null,
        location?.trim() || null,
        map_url || null,
        Number(rating) || 4.5,
        description?.trim() || null,
        notes?.trim() || null,
        status || "active",
        targetInstitutionId,
        JSON.stringify(Array.isArray(contacts) ? contacts : []),
      ]
    );

    return NextResponse.json({ vendor: res.rows[0], message: "Record created successfully" });
  } catch (error: any) {
    console.error("[Vendors POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create record" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const userRole = (user as any)?.role || (user as any)?.role_code || "";
    const userInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const isAllowed = isPlatformAdminUser(user) || userRole === "institution_admin" || Boolean(userInstId);

    if (!isAllowed) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      name,
      company_name,
      contact_person,
      category,
      vendor_type,
      phone,
      email,
      website,
      profile_image,
      address,
      city,
      location,
      map_url,
      rating,
      description,
      notes,
      status,
      institution_id,
      contacts,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    const primaryPhone = phone !== undefined ? phone : (Array.isArray(contacts) && contacts[0]?.phone ? String(contacts[0].phone).trim() : null);
    const primaryEmail = email !== undefined ? email : (Array.isArray(contacts) && contacts[0]?.email ? String(contacts[0].email).trim() : null);

    const res = await db.query(
      `
      UPDATE vendors
      SET name = COALESCE($1, name),
          company_name = COALESCE($2, company_name),
          contact_person = COALESCE($3, contact_person),
          category = COALESCE($4, category),
          vendor_type = COALESCE($5, vendor_type),
          phone = COALESCE($6, phone),
          email = COALESCE($7, email),
          website = COALESCE($8, website),
          profile_image = COALESCE($9, profile_image),
          address = COALESCE($10, address),
          city = COALESCE($11, city),
          location = COALESCE($12, location),
          map_url = COALESCE($13, map_url),
          rating = COALESCE($14, rating),
          description = COALESCE($15, description),
          notes = COALESCE($16, notes),
          status = COALESCE($17, status),
          institution_id = COALESCE($18, institution_id),
          contacts = COALESCE($19::jsonb, contacts),
          updated_at = NOW()
      WHERE id = $20
      RETURNING *
      `,
      [
        name ?? null,
        company_name ?? null,
        contact_person ?? null,
        category ?? null,
        vendor_type ?? null,
        primaryPhone ?? null,
        primaryEmail ?? null,
        website ?? null,
        profile_image ?? null,
        address ?? null,
        city ?? null,
        location ?? null,
        map_url ?? null,
        rating ? Number(rating) : undefined,
        description ?? null,
        notes ?? null,
        status ?? null,
        institution_id ? Number(institution_id) : undefined,
        contacts !== undefined ? JSON.stringify(Array.isArray(contacts) ? contacts : []) : null,
        id,
      ]
    );

    if (!res.rows.length) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ vendor: res.rows[0], message: "Record updated successfully" });
  } catch (error: any) {
    console.error("[Vendors PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const userRole = (user as any)?.role || (user as any)?.role_code || "";
    const userInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const isAllowed = isPlatformAdminUser(user) || userRole === "institution_admin" || Boolean(userInstId);

    if (!isAllowed) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    if (isPlatformAdminUser(user)) {
      await db.query(`DELETE FROM vendors WHERE id = $1`, [id]);
    } else {
      await db.query(`DELETE FROM vendors WHERE id = $1 AND (institution_id = $2 OR institution_id IS NULL)`, [id, userInstId]);
    }

    return NextResponse.json({ message: "Record deleted successfully" });
  } catch (error: any) {
    console.error("[Vendors DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete record" }, { status: 500 });
  }
}
