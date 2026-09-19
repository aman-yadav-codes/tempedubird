import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    await db.query(`
      ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS state VARCHAR(100);
      ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
      ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS branch_type VARCHAR(50) DEFAULT 'Branch Office';
      ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS is_headquarters BOOLEAN DEFAULT FALSE;
    `);
    const res = await db.query(
      `SELECT * FROM platform_branches ORDER BY is_headquarters DESC, id ASC`
    );
    return NextResponse.json({ branches: res.rows });
  } catch (error: any) {
    console.error("[Branches GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch branches" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Platform admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      branch_name,
      city,
      state,
      pincode,
      address,
      phone,
      email,
      map_url,
      manager_name,
      branch_type = "Branch Office",
      is_headquarters = false,
      status = "active",
    } = body;

    if (!branch_name || !city || !address) {
      return NextResponse.json({ error: "Branch name, city, and address are required" }, { status: 400 });
    }

    if (is_headquarters) {
      await db.query(`UPDATE platform_branches SET is_headquarters = FALSE WHERE is_headquarters = TRUE`);
    }

    const res = await db.query(
      `INSERT INTO platform_branches (
        branch_name, city, state, pincode, address, phone, email, map_url, manager_name, branch_type, is_headquarters, status, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *`,
      [
        branch_name,
        city,
        state || null,
        pincode || null,
        address,
        phone || null,
        email || null,
        map_url || null,
        manager_name || null,
        branch_type || "Branch Office",
        Boolean(is_headquarters),
        status,
      ]
    );

    return NextResponse.json({ branch: res.rows[0], message: "Branch added successfully" });
  } catch (error: any) {
    console.error("[Branches POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create branch" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Platform admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      branch_name,
      city,
      state,
      pincode,
      address,
      phone,
      email,
      map_url,
      manager_name,
      branch_type,
      is_headquarters,
      status,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
    }

    if (is_headquarters) {
      await db.query(`UPDATE platform_branches SET is_headquarters = FALSE WHERE id <> $1`, [id]);
    }

    const res = await db.query(
      `UPDATE platform_branches 
       SET branch_name = COALESCE($1, branch_name),
           city = COALESCE($2, city),
           state = COALESCE($3, state),
           pincode = COALESCE($4, pincode),
           address = COALESCE($5, address),
           phone = COALESCE($6, phone),
           email = COALESCE($7, email),
           map_url = COALESCE($8, map_url),
           manager_name = COALESCE($9, manager_name),
           branch_type = COALESCE($10, branch_type),
           is_headquarters = COALESCE($11, is_headquarters),
           status = COALESCE($12, status),
           updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        branch_name,
        city,
        state,
        pincode,
        address,
        phone,
        email,
        map_url,
        manager_name,
        branch_type,
        is_headquarters !== undefined ? Boolean(is_headquarters) : null,
        status,
        id,
      ]
    );

    if (!res.rows.length) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    return NextResponse.json({ branch: res.rows[0], message: "Branch updated successfully" });
  } catch (error: any) {
    console.error("[Branches PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update branch" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Platform admin access required." }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM platform_branches WHERE id = $1`, [id]);
    return NextResponse.json({ message: "Branch deleted successfully" });
  } catch (error: any) {
    console.error("[Branches DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete branch" }, { status: 500 });
  }
}
