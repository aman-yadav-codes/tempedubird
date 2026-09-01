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
    const search = url.searchParams.get("search")?.trim() || "";
    const type = url.searchParams.get("type")?.trim() || url.searchParams.get("client_type")?.trim() || "";
    const category = url.searchParams.get("category")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";
    const city = url.searchParams.get("city")?.trim() || "";

    const userRole = (user as any)?.role || (user as any)?.role_code || "";
    const userInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const requestedInstId = url.searchParams.get("institution_id") || req.headers.get("x-institution-id");
    const parsedInstId = requestedInstId ? Number(requestedInstId) : null;
    const targetInstId = Number.isInteger(parsedInstId) && (parsedInstId as number) > 0 ? parsedInstId : (userRole === "institution_admin" ? userInstId : null);

    let query = `SELECT * FROM clients WHERE 1=1`;
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

    if (type && type !== "all") {
      params.push(type);
      query += ` AND (client_type = $${params.length} OR category ILIKE $${params.length})`;
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
      query += ` AND (city ILIKE $${params.length} OR address ILIKE $${params.length} OR location ILIKE $${params.length} OR area ILIKE $${params.length})`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR company_name ILIKE $${params.length} OR contact_person ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length} OR city ILIKE $${params.length} OR description ILIKE $${params.length} OR notes ILIKE $${params.length})`;
    }

    query += ` ORDER BY id DESC`;

    const res = await db.query(query, params);
    let records = res.rows;

    const clients = records.map((r: any) => ({
      id: r.id,
      name: r.name,
      company_name: r.company_name || r.name,
      contact_person: r.contact_person || r.name,
      category: r.category || "Corporate Client",
      client_type: r.client_type || "corporate",
      email: r.email,
      phone: r.phone,
      website: r.website,
      profile_image: r.profile_image,
      address: r.address,
      city: r.city,
      area: r.area || r.location,
      location: r.location || r.area,
      country: r.country || "India",
      state: r.state,
      map_url: r.map_url,
      rating: r.rating ? Number(r.rating) : 4.5,
      description: r.description,
      notes: r.notes || r.description,
      status: r.status || "active",
      institution_id: r.institution_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return NextResponse.json({
      clients,
      records: clients,
      total: clients.length,
    });
  } catch (error: any) {
    console.error("[Sales Clients GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch client records" }, { status: 500 });
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
      category = "Corporate Client",
      client_type = "corporate",
      phone,
      email,
      website,
      profile_image,
      address,
      city,
      area,
      location,
      country = "India",
      state,
      map_url,
      rating = 4.5,
      description,
      notes,
      status = "active",
      institution_id,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name or Organization name is required" }, { status: 400 });
    }

    const finalLocation = location || area || null;
    const targetInstitutionId = isPlatformAdminUser(user)
      ? (institution_id ? Number(institution_id) : null)
      : userInstId;

    const res = await db.query(
      `INSERT INTO clients (
        name,
        company_name,
        contact_person,
        category,
        client_type,
        phone,
        email,
        website,
        profile_image,
        address,
        city,
        area,
        location,
        country,
        state,
        map_url,
        rating,
        description,
        notes,
        status,
        institution_id,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW())
      RETURNING *`,
      [
        name.trim(),
        company_name?.trim() || null,
        contact_person?.trim() || null,
        category || "Corporate Client",
        client_type || "corporate",
        phone?.trim() || null,
        email?.trim() || null,
        website?.trim() || null,
        profile_image || null,
        address?.trim() || null,
        city?.trim() || null,
        area?.trim() || finalLocation,
        finalLocation,
        country || "India",
        state?.trim() || null,
        map_url || null,
        Number(rating) || 4.5,
        description?.trim() || null,
        notes?.trim() || null,
        status || "active",
        targetInstitutionId,
      ]
    );

    return NextResponse.json({ client: res.rows[0], message: "Client record created successfully in clients table" }, { status: 201 });
  } catch (error: any) {
    console.error("[Sales Clients POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create client record" }, { status: 500 });
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
      client_type,
      phone,
      email,
      website,
      profile_image,
      address,
      city,
      area,
      location,
      country,
      state,
      map_url,
      rating,
      description,
      notes,
      status,
      institution_id,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    const finalLocation = location !== undefined ? location : area;

    const res = await db.query(
      `UPDATE clients SET
        name = COALESCE($1, name),
        company_name = COALESCE($2, company_name),
        contact_person = COALESCE($3, contact_person),
        category = COALESCE($4, category),
        client_type = COALESCE($5, client_type),
        phone = COALESCE($6, phone),
        email = COALESCE($7, email),
        website = COALESCE($8, website),
        profile_image = COALESCE($9, profile_image),
        address = COALESCE($10, address),
        city = COALESCE($11, city),
        area = COALESCE($12, area),
        location = COALESCE($13, location),
        country = COALESCE($14, country),
        state = COALESCE($15, state),
        map_url = COALESCE($16, map_url),
        rating = COALESCE($17, rating),
        description = COALESCE($18, description),
        notes = COALESCE($19, notes),
        status = COALESCE($20, status),
        institution_id = COALESCE($21, institution_id),
        updated_at = NOW()
      WHERE id = $22
      RETURNING *`,
      [
        name ?? null,
        company_name ?? null,
        contact_person ?? null,
        category ?? null,
        client_type ?? null,
        phone ?? null,
        email ?? null,
        website ?? null,
        profile_image ?? null,
        address ?? null,
        city ?? null,
        area ?? null,
        finalLocation ?? null,
        country ?? null,
        state ?? null,
        map_url ?? null,
        rating ? Number(rating) : undefined,
        description ?? null,
        notes ?? null,
        status ?? null,
        institution_id ? Number(institution_id) : undefined,
        id,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Client record not found" }, { status: 404 });
    }

    return NextResponse.json({ client: res.rows[0], message: "Client record updated successfully" });
  } catch (error: any) {
    console.error("[Sales Clients PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update client record" }, { status: 500 });
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
      return NextResponse.json({ error: "Record ID required" }, { status: 400 });
    }

    if (isPlatformAdminUser(user)) {
      await db.query(`DELETE FROM clients WHERE id = $1`, [id]);
    } else {
      await db.query(`DELETE FROM clients WHERE id = $1 AND (institution_id = $2 OR institution_id IS NULL)`, [id, userInstId]);
    }

    return NextResponse.json({ success: true, message: "Client record deleted successfully from clients table" });
  } catch (error: any) {
    console.error("[Sales Clients DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete client record" }, { status: 500 });
  }
}
