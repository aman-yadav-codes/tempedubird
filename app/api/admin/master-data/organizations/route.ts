import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

async function ensureMasterCompaniesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS master_companies (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      slug VARCHAR(255),
      industry VARCHAR(100) DEFAULT 'Education & Technology',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const countRes = await db.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM master_companies`
  );

  if ((countRes.rows[0]?.count || 0) === 0) {
    const DEFAULT_COMPANIES = [
      "EduBird Technologies Pvt Ltd",
      "Tata Consultancy Services (TCS)",
      "Infosys Limited",
      "Wipro Technologies",
      "HCL Technologies",
      "Tech Mahindra",
      "Allen Career Institute",
      "Aakash Educational Services",
      "Resonance Eduventures",
      "Physics Wallah (PW)",
      "BYJU'S (Think & Learn)",
      "Unacademy (Sorting Hat Tech)",
      "Vedantu Innovations",
      "Pearson Education India",
      "McGraw Hill Education",
      "Cambridge University Press",
      "Oxford University Press",
      "Delhi Public School Society",
      "Kendriya Vidyalaya Sangathan",
      "National Institute of Technology",
    ];

    for (const name of DEFAULT_COMPANIES) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      await db.query(
        `INSERT INTO master_companies (name, slug) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
        [name, slug]
      );
    }
  }
}

function getInt(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    await ensureMasterCompaniesTable();

    const url = new URL(req.url);
    const page = getInt(url.searchParams.get("page"), 1);
    const limit = getInt(url.searchParams.get("limit"), 10);
    const offset = (page - 1) * limit;

    const search = url.searchParams.get("search")?.trim() || "";
    const type = url.searchParams.get("type")?.trim() || "";

    // 1. If searching companies
    if (type === "company") {
      const where: string[] = ["is_active = true"];
      const params: unknown[] = [];

      if (search) {
        params.push(`%${search}%`);
        where.push(`(name ILIKE $${params.length} OR slug ILIKE $${params.length})`);
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const countResult = await db.query<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM master_companies ${whereSql}`,
        params
      );

      const total = Number(countResult.rows[0]?.total ?? 0);

      const dataResult = await db.query(
        `
        SELECT
          id,
          name,
          slug,
          'company' AS type,
          is_active,
          created_at
        FROM master_companies
        ${whereSql}
        ORDER BY name ASC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
        `,
        [...params, limit, offset]
      );

      return NextResponse.json({
        data: dataResult.rows,
        pageCount: Math.ceil(total / limit) || 1,
        total,
      });
    }

    // 2. Otherwise search active institution profiles
    const where: string[] = ["is_deleted = false", "is_active = true"];
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(name ILIKE $${params.length} OR slug ILIKE $${params.length})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countResult = await db.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM institution_profiles ${whereSql}`,
      params
    );

    const total = Number(countResult.rows[0]?.total ?? 0);

    const dataResult = await db.query(
      `
      SELECT
        id,
        name,
        slug,
        'institution' AS type,
        'approved' AS status,
        is_active,
        created_at,
        created_at AS reviewed_at,
        null AS rejection_reason
      FROM institution_profiles
      ${whereSql}
      ORDER BY name ASC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: dataResult.rows,
      pageCount: Math.ceil(total / limit) || 1,
      total,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    await ensureMasterCompaniesTable();

    const body = await req.json();
    const name = body?.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const insertRes = await db.query(
      `
      INSERT INTO master_companies (name, slug)
      VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING *
      `,
      [name, slug]
    );

    return NextResponse.json({ data: insertRes.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}