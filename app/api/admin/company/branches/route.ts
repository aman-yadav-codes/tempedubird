import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const res = await db.query(
      `SELECT * FROM platform_branches ORDER BY id ASC`
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
    const { branch_name, city, address, phone, email, map_url, manager_name, status = "active" } = body;

    if (!branch_name || !city || !address) {
      return NextResponse.json({ error: "Branch name, city, and address are required" }, { status: 400 });
    }

    const res = await db.query(
      `INSERT INTO platform_branches (branch_name, city, address, phone, email, map_url, manager_name, status, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [branch_name, city, address, phone || null, email || null, map_url || null, manager_name || null, status]
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
    const { id, branch_name, city, address, phone, email, map_url, manager_name, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
    }

    const res = await db.query(
      `UPDATE platform_branches 
       SET branch_name = COALESCE($1, branch_name),
           city = COALESCE($2, city),
           address = COALESCE($3, address),
           phone = COALESCE($4, phone),
           email = COALESCE($5, email),
           map_url = COALESCE($6, map_url),
           manager_name = COALESCE($7, manager_name),
           status = COALESCE($8, status),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [branch_name, city, address, phone, email, map_url, manager_name, status, id]
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
