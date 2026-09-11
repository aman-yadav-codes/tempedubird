import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { isPlatformAdminUser, isInstitutionAdminUser } from "@/lib/auth/permissions";

// ─── Admin guard helper ───────────────────────────────────────────────────────

function isAdmin(user: any): boolean {
  if (!user) return false;
  const roleCodes: string[] =
    user.role_codes || [user.role || user.primary_role || ""];
  return (
    Boolean(user.is_super_admin) ||
    isPlatformAdminUser(user) ||
    isInstitutionAdminUser(user) ||
    roleCodes.some((r) =>
      [
        "platform_admin", "super_admin", "institution_admin",
        "school_owner", "college_owner", "university_owner",
        "director", "principal",
      ].includes(r)
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/operations/penalty-rules
// ?institution_id=X&rule_type=attendance_late|task_deadline
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const institutionId = url.searchParams.get("institution_id");
    const ruleType = url.searchParams.get("rule_type");

    const params: any[] = [];
    let where = "WHERE 1=1";

    if (institutionId) {
      params.push(parseInt(institutionId));
      where += ` AND (institution_id = $${params.length} OR institution_id IS NULL)`;
    }
    if (ruleType) {
      params.push(ruleType);
      where += ` AND rule_type = $${params.length}`;
    }

    const res = await db.query(
      `SELECT * FROM penalty_rules ${where} ORDER BY rule_type, threshold_value ASC`,
      params
    );

    return NextResponse.json({ rules: res.rows });
  } catch (err: any) {
    console.error("[penalty-rules GET]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch rules" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/operations/penalty-rules  — Create a new rule
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      institution_id,
      rule_type,
      name,
      is_active = true,
      threshold_value,
      threshold_unit = "minutes",
      penalty_mode = "fixed",
      penalty_points,
      max_penalty,
      description,
    } = body;

    if (!rule_type || !["attendance_late", "task_deadline"].includes(rule_type)) {
      return NextResponse.json({ error: "rule_type must be 'attendance_late' or 'task_deadline'" }, { status: 400 });
    }
    if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
    if (threshold_value == null || isNaN(parseFloat(threshold_value))) {
      return NextResponse.json({ error: "threshold_value is required" }, { status: 400 });
    }
    const pts = parseFloat(penalty_points);
    if (!pts || pts <= 0) {
      return NextResponse.json({ error: "penalty_points must be > 0" }, { status: 400 });
    }

    const res = await db.query(
      `INSERT INTO penalty_rules (
         institution_id, rule_type, name, is_active,
         threshold_value, threshold_unit,
         penalty_mode, penalty_points, max_penalty,
         description, created_by, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())
       RETURNING *`,
      [
        institution_id ? parseInt(institution_id) : null,
        rule_type,
        name.trim(),
        Boolean(is_active),
        parseFloat(threshold_value),
        threshold_unit,
        penalty_mode,
        pts,
        max_penalty ? parseFloat(max_penalty) : null,
        description?.trim() || null,
        user?.id ?? null,
      ]
    );

    return NextResponse.json({ rule: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error("[penalty-rules POST]", err);
    return NextResponse.json({ error: err.message || "Failed to create rule" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/operations/penalty-rules  — Update a rule
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, is_active, threshold_value, threshold_unit, penalty_mode, penalty_points, max_penalty, description } = body;

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const pts = parseFloat(penalty_points);
    if (!pts || pts <= 0) {
      return NextResponse.json({ error: "penalty_points must be > 0" }, { status: 400 });
    }

    const res = await db.query(
      `UPDATE penalty_rules SET
         name            = $1,
         is_active       = $2,
         threshold_value = $3,
         threshold_unit  = $4,
         penalty_mode    = $5,
         penalty_points  = $6,
         max_penalty     = $7,
         description     = $8,
         updated_at      = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        name?.trim(),
        Boolean(is_active),
        parseFloat(threshold_value),
        threshold_unit,
        penalty_mode,
        pts,
        max_penalty ? parseFloat(max_penalty) : null,
        description?.trim() || null,
        parseInt(id),
      ]
    );

    if (!res.rows[0]) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ rule: res.rows[0] });
  } catch (err: any) {
    console.error("[penalty-rules PUT]", err);
    return NextResponse.json({ error: err.message || "Failed to update rule" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/operations/penalty-rules?id=<id>
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await db.query(`DELETE FROM penalty_rules WHERE id = $1`, [parseInt(id)]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[penalty-rules DELETE]", err);
    return NextResponse.json({ error: err.message || "Failed to delete rule" }, { status: 500 });
  }
}
