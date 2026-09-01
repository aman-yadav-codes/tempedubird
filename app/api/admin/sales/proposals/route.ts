import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

let schemaReady = false;
async function ensureProposalsTable() {
  if (schemaReady) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_proposals (
        id SERIAL PRIMARY KEY,
        institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        client_email VARCHAR(255),
        client_phone VARCHAR(50),
        course_title VARCHAR(255),
        base_amount NUMERIC(12, 2) DEFAULT 0,
        discount_percentage NUMERIC(5, 2) DEFAULT 0,
        final_amount NUMERIC(12, 2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'INR',
        status VARCHAR(50) DEFAULT 'draft',
        valid_until DATE,
        notes TEXT,
        created_by_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    schemaReady = true;
  } catch (err) {
    console.error("Error creating sales_proposals table:", err);
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireAdmin(req);
    await ensureProposalsTable();

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";
    const institutionIdParam = url.searchParams.get("institutionId") || req.headers.get("x-institution-id");

    let institutionId: number | null = null;
    if (institutionIdParam && !isNaN(Number(institutionIdParam))) {
      institutionId = Number(institutionIdParam);
    } else if (user?.memberships?.length > 0) {
      const instMem = user.memberships.find((m: any) => m.institution_id);
      if (instMem) institutionId = Number(instMem.institution_id);
    }

    const isPlatformAdmin = Boolean(user?.role_codes?.includes("platform_admin") || (user as any)?.is_super_admin);

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (isPlatformAdmin) {
      if (institutionIdParam && !isNaN(Number(institutionIdParam)) && institutionIdParam !== "all") {
        params.push(Number(institutionIdParam));
        whereClauses.push(`institution_id = $${params.length}`);
      } else {
        whereClauses.push(`institution_id IS NULL`);
      }
    } else if (institutionId) {
      params.push(institutionId);
      whereClauses.push(`institution_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(
        `(title ILIKE $${params.length} OR client_name ILIKE $${params.length} OR client_email ILIKE $${params.length} OR course_title ILIKE $${params.length})`
      );
    }

    if (status && status !== "all") {
      params.push(status);
      whereClauses.push(`status = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const query = `SELECT * FROM sales_proposals ${whereSql} ORDER BY created_at DESC LIMIT 100;`;

    const res = await db.query(query, params);
    const proposals = res.rows || [];

    // Compute summary stats
    const totalCount = proposals.length;
    const totalValue = proposals.reduce((acc: number, p: any) => acc + Number(p.final_amount || 0), 0);
    const acceptedCount = proposals.filter((p: any) => p.status === "accepted").length;
    const acceptedValue = proposals
      .filter((p: any) => p.status === "accepted")
      .reduce((acc: number, p: any) => acc + Number(p.final_amount || 0), 0);
    const pendingCount = proposals.filter((p: any) => p.status === "sent" || p.status === "draft").length;

    return NextResponse.json({
      proposals,
      stats: {
        totalCount,
        totalValue,
        acceptedCount,
        acceptedValue,
        pendingCount,
        conversionRate: totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0,
      },
    });
  } catch (error: any) {
    console.error("[Sales Proposals GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load proposals", proposals: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin(req);
    await ensureProposalsTable();

    const body = await req.json();
    const {
      institution_id,
      title,
      client_name,
      client_email,
      client_phone,
      course_title,
      base_amount,
      discount_percentage,
      final_amount,
      valid_until,
      notes,
      status,
    } = body;

    if (!title || !client_name) {
      return NextResponse.json({ error: "Proposal title and client name are required" }, { status: 400 });
    }

    const resolvedInstId =
      institution_id ||
      user?.memberships?.find((m: any) => m.institution_id)?.institution_id ||
      null;

    const res = await db.query(
      `
      INSERT INTO sales_proposals (
        institution_id,
        title,
        client_name,
        client_email,
        client_phone,
        course_title,
        base_amount,
        discount_percentage,
        final_amount,
        valid_until,
        notes,
        status,
        created_by_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `,
      [
        resolvedInstId,
        title.trim(),
        client_name.trim(),
        client_email?.trim() || null,
        client_phone?.trim() || null,
        course_title?.trim() || null,
        Number(base_amount) || 0,
        Number(discount_percentage) || 0,
        Number(final_amount) || Number(base_amount) || 0,
        valid_until || null,
        notes?.trim() || null,
        status || "draft",
        user?.full_name || "Admin",
      ]
    );

    return NextResponse.json({ proposal: res.rows[0], message: "Proposal created successfully" });
  } catch (error: any) {
    console.error("[Sales Proposals POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create proposal" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin(req);
    await ensureProposalsTable();

    const body = await req.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Proposal ID is required" }, { status: 400 });
    }

    const updates: string[] = ["updated_at = CURRENT_TIMESTAMP"];
    const params: unknown[] = [id];

    if (status) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }

    if (notes !== undefined) {
      params.push(notes);
      updates.push(`notes = $${params.length}`);
    }

    const res = await db.query(
      `UPDATE sales_proposals SET ${updates.join(", ")} WHERE id = $1 RETURNING *;`,
      params
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    return NextResponse.json({ proposal: res.rows[0], message: "Proposal updated successfully" });
  } catch (error: any) {
    console.error("[Sales Proposals PATCH] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update proposal" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Proposal ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM sales_proposals WHERE id = $1`, [id]);
    return NextResponse.json({ message: "Proposal deleted successfully" });
  } catch (error: any) {
    console.error("[Sales Proposals DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete proposal" }, { status: 500 });
  }
}
