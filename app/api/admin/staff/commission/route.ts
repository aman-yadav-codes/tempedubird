import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAdmin(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureFeatureSchema();
    const { searchParams } = new URL(req.url);
    const staffUserId = searchParams.get("staffUserId") || searchParams.get("userId");

    if (!staffUserId) {
      return NextResponse.json({ error: "staffUserId is required" }, { status: 400 });
    }

    const res = await db.query(
      `
        SELECT
          user_id,
          commission_type,
          commission_rate,
          commission_trigger,
          minimum_threshold,
          payout_frequency,
          notes,
          rules,
          updated_at
        FROM staff_commission_structures
        WHERE user_id = $1
        LIMIT 1
      `,
      [Number(staffUserId)]
    );

    const commission = res.rows[0] || {
      user_id: Number(staffUserId),
      commission_type: "RULES_BASED",
      commission_rate: 0,
      commission_trigger: "course_admission",
      minimum_threshold: null,
      payout_frequency: "MONTHLY",
      notes: "",
      rules: [],
    };

    return NextResponse.json({ data: commission });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load commission structure";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAdmin(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureFeatureSchema();
    const body = await req.json();
    const { staffUserId, commission } = body;

    if (!staffUserId) {
      return NextResponse.json({ error: "staffUserId is required" }, { status: 400 });
    }

    const userId = Number(staffUserId);
    const commType = commission?.commission_type || "RULES_BASED";

    if (commType === "NONE") {
      await db.query(`DELETE FROM staff_commission_structures WHERE user_id = $1`, [userId]);
      return NextResponse.json({ success: true, message: "Commission disabled for this user" });
    }

    const rate = Number(commission?.commission_rate) || 0;
    const trigger = commission?.commission_trigger || "course_admission";
    const threshold = commission?.minimum_threshold ? Number(commission.minimum_threshold) : null;
    const payoutFrequency = commission?.payout_frequency || "MONTHLY";
    const notes = commission?.notes ? String(commission.notes).trim() : null;
    const rulesJson = JSON.stringify(commission?.rules || []);

    const res = await db.query(
      `
        INSERT INTO staff_commission_structures (
          user_id,
          commission_type,
          commission_rate,
          commission_trigger,
          minimum_threshold,
          payout_frequency,
          notes,
          rules,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          commission_type = EXCLUDED.commission_type,
          commission_rate = EXCLUDED.commission_rate,
          commission_trigger = EXCLUDED.commission_trigger,
          minimum_threshold = EXCLUDED.minimum_threshold,
          payout_frequency = EXCLUDED.payout_frequency,
          notes = EXCLUDED.notes,
          rules = EXCLUDED.rules,
          updated_at = NOW()
        RETURNING *
      `,
      [userId, commType, rate, trigger, threshold, payoutFrequency, notes, rulesJson]
    );

    return NextResponse.json({
      success: true,
      message: "Commission structure saved successfully",
      data: res.rows[0],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save commission structure";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
