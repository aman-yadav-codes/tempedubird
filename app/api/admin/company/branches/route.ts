import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser, isInstitutionAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { getFrontendConfig } from "@/lib/config/frontend-config";

async function resolveActiveBusinessId(req: Request, user?: any): Promise<number | null> {
  const url = new URL(req.url);
  const qBiz = url.searchParams.get("businessId") || url.searchParams.get("business_id");
  if (qBiz && /^\d+$/.test(qBiz)) {
    return Number(qBiz);
  }
  const headerBiz = req.headers.get("x-business-id");
  if (headerBiz && /^\d+$/.test(headerBiz)) {
    return Number(headerBiz);
  }
  const config = getFrontendConfig();
  if (config.mode === "business" && config.businessId) {
    return config.businessId;
  }
  if (user?.id && !isPlatformAdminUser(user)) {
    const userBiz = await db.query(
      `SELECT id FROM business_profiles WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [user.id]
    );
    if (userBiz.rows.length > 0) return userBiz.rows[0].id;
    const instBiz = await db.query(
      `SELECT COALESCE(bp.id, ip.id) as resolved_id FROM institution_memberships im
       JOIN institution_profiles ip ON ip.id = im.institution_id
       LEFT JOIN business_profiles bp ON bp.id = ip.business_id OR bp.institution_profile_id = ip.id
       WHERE im.user_id = $1 AND im.is_active = TRUE
       LIMIT 1`,
      [user.id]
    );
    if (instBiz.rows.length > 0) return instBiz.rows[0].resolved_id;
  }
  return null;
}

async function syncBusinessBranches(bizId: number) {
  try {
    const branchesRes = await db.query(
      `SELECT id, branch_name as name, city, state, pincode as postal_code, address, phone, email, is_headquarters as is_main
       FROM platform_branches WHERE business_id = $1 AND status = 'active'
       ORDER BY is_headquarters DESC, id ASC`,
      [bizId]
    );
    await db.query(
      `UPDATE business_profiles SET branches = $1, updated_at = NOW() WHERE id = $2 OR institution_profile_id = $2`,
      [JSON.stringify(branchesRes.rows), bizId]
    );
  } catch (err) {
    console.error("Failed to sync business branches:", err);
  }
}

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    await db.query(`
      ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS state VARCHAR(100);
      ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
      ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS branch_type VARCHAR(50) DEFAULT 'Branch Office';
      ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS is_headquarters BOOLEAN DEFAULT FALSE;
      ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS business_id INTEGER;
      ALTER TABLE platform_branches ADD COLUMN IF NOT EXISTS institution_id INTEGER;
      CREATE INDEX IF NOT EXISTS idx_platform_branches_business_id ON platform_branches(business_id);
    `);

    const user = await getAuthenticatedUser(req).catch(() => null);
    const activeBizId = await resolveActiveBusinessId(req, user);

    let res;
    if (activeBizId) {
      res = await db.query(
        `SELECT * FROM platform_branches WHERE business_id = $1 OR institution_id = $1 ORDER BY is_headquarters DESC, id ASC`,
        [activeBizId]
      );
      if (res.rows.length === 0) {
        // Auto-seed from institution_branches or business_profiles
        const ibRes = await db.query(
          `SELECT * FROM institution_branches WHERE institution_id = $1 ORDER BY is_primary DESC, id ASC`,
          [activeBizId]
        );
        if (ibRes.rows.length > 0) {
          for (const ib of ibRes.rows) {
            const pPhone = ib.phones?.[0]?.phone || "";
            const pEmail = ib.emails?.[0]?.email || "";
            await db.query(
              `INSERT INTO platform_branches (
                branch_name, city, state, pincode, address, phone, email, is_headquarters, status, business_id, institution_id, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10, NOW())`,
              [
                ib.branch_name || "Main Branch",
                ib.city || "",
                ib.state || "",
                ib.pincode || "",
                ib.address || "",
                pPhone,
                pEmail,
                Boolean(ib.is_primary),
                activeBizId,
                activeBizId,
              ]
            );
          }
          res = await db.query(
            `SELECT * FROM platform_branches WHERE business_id = $1 OR institution_id = $1 ORDER BY is_headquarters DESC, id ASC`,
            [activeBizId]
          );
        }
      }
    } else {
      res = await db.query(
        `SELECT * FROM platform_branches WHERE business_id IS NULL ORDER BY is_headquarters DESC, id ASC`
      );
    }

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
    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const activeBizId = await resolveActiveBusinessId(req, user);

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
      if (activeBizId) {
        await db.query(`UPDATE platform_branches SET is_headquarters = FALSE WHERE is_headquarters = TRUE AND (business_id = $1 OR institution_id = $1)`, [activeBizId]);
      } else {
        await db.query(`UPDATE platform_branches SET is_headquarters = FALSE WHERE is_headquarters = TRUE AND business_id IS NULL`);
      }
    }

    let instId = activeBizId;
    if (activeBizId) {
      const instCheck = await db.query(`SELECT institution_profile_id FROM business_profiles WHERE id = $1`, [activeBizId]);
      if (instCheck.rows[0]?.institution_profile_id) {
        instId = instCheck.rows[0].institution_profile_id;
      }
    }

    const res = await db.query(
      `INSERT INTO platform_branches (
        branch_name, city, state, pincode, address, phone, email, map_url, manager_name, branch_type, is_headquarters, status, business_id, institution_id, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
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
        activeBizId,
        instId,
      ]
    );

    if (activeBizId) {
      await syncBusinessBranches(activeBizId);
    }

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
    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const activeBizId = await resolveActiveBusinessId(req, user);

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
      if (activeBizId) {
        await db.query(`UPDATE platform_branches SET is_headquarters = FALSE WHERE id <> $1 AND (business_id = $2 OR institution_id = $2)`, [id, activeBizId]);
      } else {
        await db.query(`UPDATE platform_branches SET is_headquarters = FALSE WHERE id <> $1 AND business_id IS NULL`, [id]);
      }
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

    if (activeBizId) {
      await syncBusinessBranches(activeBizId);
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
    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const activeBizId = await resolveActiveBusinessId(req, user);

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM platform_branches WHERE id = $1`, [id]);

    if (activeBizId) {
      await syncBusinessBranches(activeBizId);
    }

    return NextResponse.json({ message: "Branch deleted successfully" });
  } catch (error: any) {
    console.error("[Branches DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete branch" }, { status: 500 });
  }
}
