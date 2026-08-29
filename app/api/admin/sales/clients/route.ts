import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const type = url.searchParams.get("type")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";
    const includeVendors = url.searchParams.get("include_vendors") === "true";

    let query = `SELECT * FROM clients WHERE 1=1`;
    const params: any[] = [];

    const userRole = (user as any)?.role || (user as any)?.role_code || "";
    const userInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;

    // Filter by institution if institution admin
    if (userRole === "institution_admin" && userInstId) {
      params.push(userInstId);
      query += ` AND (institution_id = $${params.length} OR institution_id IS NULL)`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR company_name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length} OR city ILIKE $${params.length})`;
    }

    if (type && type !== "all") {
      params.push(type);
      query += ` AND client_type = $${params.length}`;
    }

    if (status && status !== "all") {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY id DESC`;

    const res = await db.query(query, params);
    let clients = res.rows;

    // Auto-seed sample clients if empty
    if (clients.length === 0 && !search && (!type || type === "all")) {
      const sampleClients = [
        {
          name: "Apex Global Technologies",
          company_name: "Apex Global Tech Pvt Ltd",
          email: "procurement@apextech.com",
          phone: "+91 98123 45670",
          client_type: "corporate",
          city: "Varanasi",
          state: "Uttar Pradesh",
          address: "Mahmoorganj Tech Park, Tower A",
          notes: "Annual corporate training client for Full Stack and Cloud programs.",
        },
        {
          name: "Dr. Arvind Sharma",
          company_name: "Bright Futures Education Trust",
          email: "arvind.sharma@brighttrust.org",
          phone: "+91 98234 56781",
          client_type: "sponsor",
          city: "New Delhi",
          state: "Delhi",
          address: "Connaught Place, Block E",
          notes: "Student scholarship sponsor for entrance exam test series.",
        },
        {
          name: "Zenith Career Academy",
          company_name: "Zenith Learning Solutions",
          email: "partners@zenithacademy.in",
          phone: "+91 98345 67892",
          client_type: "institution",
          city: "Mumbai",
          state: "Maharashtra",
          address: "Andheri West, Link Road",
          notes: "Partner coaching institute conducting joint campus placement drives.",
        },
        {
          name: "Metro Hostel & PG Network",
          company_name: "Metro Student Living",
          email: "contact@metrohostels.com",
          phone: "+91 98456 78903",
          client_type: "vendor_partner",
          city: "Indore",
          state: "Madhya Pradesh",
          address: "Bhawarkua Main Square",
          notes: "Official accommodation and mess services vendor partner.",
        }
      ];

      for (const c of sampleClients) {
        await db.query(
          `INSERT INTO clients (name, company_name, email, phone, client_type, city, state, country, address, notes, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'India', $8, $9, 'active', NOW(), NOW())`,
          [c.name, c.company_name, c.email, c.phone, c.client_type, c.city, c.state, c.address, c.notes]
        );
      }

      const seeded = await db.query(`SELECT * FROM clients ORDER BY id DESC`);
      clients = seeded.rows;
    }

    // Also pull vendors if requested (for task client picker)
    let vendorsList: any[] = [];
    if (includeVendors) {
      const vRes = await db.query(`SELECT id, name, category, phone, email, city, location as area FROM vendors WHERE status = 'active' ORDER BY name ASC`);
      vendorsList = vRes.rows.map((v: any) => ({
        id: `vendor_${v.id}`,
        name: v.name,
        company_name: `${v.name} (${v.category})`,
        email: v.email,
        phone: v.phone,
        client_type: "vendor_partner",
        city: v.city,
        area: v.area,
        is_vendor: true,
      }));
    }

    return NextResponse.json({
      clients,
      vendors: vendorsList,
    });
  } catch (error: any) {
    console.error("[Clients GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const {
      name,
      company_name,
      email,
      phone,
      client_type = "corporate",
      country = "India",
      state,
      city,
      area,
      address,
      website,
      notes,
      status = "active",
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Client Name or Company Name is required" }, { status: 400 });
    }

    const creatorRole = (user as any)?.role || (user as any)?.role_code || "";
    const creatorInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const institutionId = creatorRole === "institution_admin" ? creatorInstId : (body.institution_id || creatorInstId || null);

    const res = await db.query(
      `INSERT INTO clients (
        name, company_name, email, phone, client_type, institution_id,
        country, state, city, area, address, website, notes, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *`,
      [
        name.trim(),
        company_name?.trim() || null,
        email?.trim() || null,
        phone?.trim() || null,
        client_type,
        institutionId,
        country,
        state || null,
        city || null,
        area || null,
        address?.trim() || null,
        website?.trim() || null,
        notes?.trim() || null,
        status,
      ]
    );

    return NextResponse.json({ client: res.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error("[Clients POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create client" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const body = await req.json();
    const {
      id,
      name,
      company_name,
      email,
      phone,
      client_type,
      country,
      state,
      city,
      area,
      address,
      website,
      notes,
      status,
    } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "Client ID and Name are required" }, { status: 400 });
    }

    const res = await db.query(
      `UPDATE clients SET
        name = $1,
        company_name = $2,
        email = $3,
        phone = $4,
        client_type = $5,
        country = $6,
        state = $7,
        city = $8,
        area = $9,
        address = $10,
        website = $11,
        notes = $12,
        status = $13,
        updated_at = NOW()
      WHERE id = $14
      RETURNING *`,
      [
        name.trim(),
        company_name?.trim() || null,
        email?.trim() || null,
        phone?.trim() || null,
        client_type || "corporate",
        country || "India",
        state || null,
        city || null,
        area || null,
        address?.trim() || null,
        website?.trim() || null,
        notes?.trim() || null,
        status || "active",
        id,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Client record not found" }, { status: 404 });
    }

    return NextResponse.json({ client: res.rows[0] });
  } catch (error: any) {
    console.error("[Clients PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Client ID required" }, { status: 400 });
    }

    await db.query(`DELETE FROM clients WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: "Client deleted successfully" });
  } catch (error: any) {
    console.error("[Clients DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete client" }, { status: 500 });
  }
}
