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
      phones: Array.isArray(r.phones) ? r.phones : (r.metadata?.phones || (r.phone ? [{ number: r.phone, label: "Primary", is_primary: true }] : [])),
      emails: Array.isArray(r.emails) ? r.emails : (r.metadata?.emails || (r.email ? [{ email: r.email, label: "Work", is_primary: true }] : [])),
      contacts: Array.isArray(r.contacts) ? r.contacts : (r.metadata?.contacts || []),
      location_data: r.location_data || r.metadata?.location_data || null,
      pincode: r.pincode || null,
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

    const targetInstitutionId = isPlatformAdminUser(user)
      ? (body.institution_id ? Number(body.institution_id) : null)
      : userInstId;

    // Handle Bulk Upload of Clients
    if (body.bulk && Array.isArray(body.clients)) {
      const insertedClients = [];
      for (const item of body.clients) {
        const clientName = item.name?.trim() || item.company_name?.trim();
        if (!clientName) continue;

        const companyName = item.company_name?.trim() || clientName;
        const contactPerson = item.contact_person?.trim() || clientName;
        const phone = item.phone?.trim() || (Array.isArray(item.phones) && item.phones[0]?.number ? String(item.phones[0].number).trim() : null);
        const email = item.email?.trim() || (Array.isArray(item.emails) && item.emails[0]?.email ? String(item.emails[0].email).trim() : null);
        const phonesJson = JSON.stringify(
          Array.isArray(item.phones) && item.phones.length > 0
            ? item.phones
            : (phone ? [{ number: phone, label: "Primary", is_primary: true }] : [])
        );
        const emailsJson = JSON.stringify(
          Array.isArray(item.emails) && item.emails.length > 0
            ? item.emails
            : (email ? [{ email: email, label: "Work", is_primary: true }] : [])
        );
        const contactsJson = JSON.stringify(Array.isArray(item.contacts) ? item.contacts : []);
        const locationJson = JSON.stringify(item.location_data || {});

        const inserted = await db.query(
          `INSERT INTO clients (
            name,
            company_name,
            contact_person,
            category,
            client_type,
            phone,
            email,
            website,
            address,
            city,
            state,
            pincode,
            phones,
            emails,
            contacts,
            location_data,
            description,
            status,
            institution_id,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17, $18, $19, NOW())
          RETURNING *`,
          [
            clientName,
            companyName,
            contactPerson,
            item.category || "Corporate Client",
            item.client_type || "corporate",
            phone,
            email,
            item.website?.trim() || null,
            item.address?.trim() || null,
            item.city?.trim() || null,
            item.state?.trim() || null,
            item.pincode?.trim() || null,
            phonesJson,
            emailsJson,
            contactsJson,
            locationJson,
            item.description?.trim() || null,
            item.status || "active",
            targetInstitutionId,
          ]
        );
        if (inserted.rows[0]) insertedClients.push(inserted.rows[0]);
      }

      return NextResponse.json({
        success: true,
        count: insertedClients.length,
        clients: insertedClients,
        message: `Successfully uploaded ${insertedClients.length} clients in bulk`,
      }, { status: 201 });
    }

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
      pincode,
      map_url,
      rating = 4.5,
      description,
      notes,
      status = "active",
      institution_id,
      phones = [],
      emails = [],
      contacts = [],
      location_data = null,
    } = body;

    const finalClientName = name?.trim() || company_name?.trim();
    if (!finalClientName) {
      return NextResponse.json({ error: "Name or Organization name is required" }, { status: 400 });
    }

    const finalLocation = location || area || null;
    const finalPhone = phone?.trim() || (Array.isArray(phones) && phones[0]?.number ? String(phones[0].number).trim() : null);
    const finalEmail = email?.trim() || (Array.isArray(emails) && emails[0]?.email ? String(emails[0].email).trim() : null);
    const phonesJson = JSON.stringify(
      Array.isArray(phones) && phones.length > 0
        ? phones
        : (finalPhone ? [{ number: finalPhone, label: "Primary", is_primary: true }] : [])
    );
    const emailsJson = JSON.stringify(
      Array.isArray(emails) && emails.length > 0
        ? emails
        : (finalEmail ? [{ email: finalEmail, label: "Work", is_primary: true }] : [])
    );
    const contactsJson = JSON.stringify(Array.isArray(contacts) ? contacts : []);
    const locationJson = JSON.stringify(location_data || {});

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
        pincode,
        map_url,
        rating,
        description,
        notes,
        status,
        institution_id,
        phones,
        emails,
        contacts,
        location_data,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb, $24::jsonb, $25::jsonb, $26::jsonb, NOW())
      RETURNING *`,
      [
        finalClientName,
        company_name?.trim() || finalClientName,
        contact_person?.trim() || finalClientName,
        category || "Corporate Client",
        client_type || "corporate",
        finalPhone,
        finalEmail,
        website?.trim() || null,
        profile_image || null,
        address?.trim() || null,
        city?.trim() || null,
        area?.trim() || finalLocation,
        finalLocation,
        country || "India",
        state?.trim() || null,
        pincode?.trim() || null,
        map_url || null,
        Number(rating) || 4.5,
        description?.trim() || null,
        notes?.trim() || null,
        status || "active",
        targetInstitutionId,
        phonesJson,
        emailsJson,
        contactsJson,
        locationJson,
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
      pincode,
      map_url,
      rating,
      description,
      notes,
      status,
      institution_id,
      phones,
      emails,
      contacts,
      location_data,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    const finalLocation = location !== undefined ? location : area;
    const finalPhone = phone !== undefined ? (phone?.trim() || null) : undefined;
    const finalEmail = email !== undefined ? (email?.trim() || null) : undefined;
    const phonesJson = phones !== undefined ? JSON.stringify(phones) : undefined;
    const emailsJson = emails !== undefined ? JSON.stringify(emails) : undefined;
    const contactsJson = contacts !== undefined ? JSON.stringify(contacts) : undefined;
    const locationJson = location_data !== undefined ? JSON.stringify(location_data) : undefined;

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
        pincode = COALESCE($16, pincode),
        map_url = COALESCE($17, map_url),
        rating = COALESCE($18, rating),
        description = COALESCE($19, description),
        notes = COALESCE($20, notes),
        status = COALESCE($21, status),
        institution_id = COALESCE($22, institution_id),
        phones = COALESCE($23::jsonb, phones),
        emails = COALESCE($24::jsonb, emails),
        contacts = COALESCE($25::jsonb, contacts),
        location_data = COALESCE($26::jsonb, location_data),
        updated_at = NOW()
      WHERE id = $27
      RETURNING *`,
      [
        name ?? null,
        company_name ?? null,
        contact_person ?? null,
        category ?? null,
        client_type ?? null,
        finalPhone ?? null,
        finalEmail ?? null,
        website ?? null,
        profile_image ?? null,
        address ?? null,
        city ?? null,
        area ?? null,
        finalLocation ?? null,
        country ?? null,
        state ?? null,
        pincode ?? null,
        map_url ?? null,
        rating ? Number(rating) : undefined,
        description ?? null,
        notes ?? null,
        status ?? null,
        institution_id ? Number(institution_id) : undefined,
        phonesJson ?? null,
        emailsJson ?? null,
        contactsJson ?? null,
        locationJson ?? null,
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
