import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser, isInstitutionAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isPlatform = isPlatformAdminUser(user);
    const isInst = isInstitutionAdminUser(user);
    if (!isPlatform && !isInst) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // 1. Fetch rules
    const rulesRes = await db.query(`
      SELECT id, rule_key, name, category, description, is_enabled,
             calc_type, point_value, percentage_value, frequency, action_type,
             version, updated_by, updated_at
      FROM performance_settings
      ORDER BY 
        CASE category
          WHEN 'attendance' THEN 1
          WHEN 'finance' THEN 2
          WHEN 'leads_projects' THEN 3
          WHEN 'admin' THEN 4
          WHEN 'recruitment' THEN 5
          ELSE 6
        END,
        id ASC
    `);

    // 2. Fetch history
    const historyRes = await db.query(`
      SELECT id, rule_key, rule_name, previous_values, new_values, changed_by, change_reason, created_at
      FROM performance_settings_history
      ORDER BY created_at DESC
      LIMIT 100
    `);

    return NextResponse.json({
      success: true,
      rules: rulesRes.rows,
      history: historyRes.rows,
    });
  } catch (err: any) {
    console.error("[Performance Settings GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isPlatform = isPlatformAdminUser(user);
    const isInst = isInstitutionAdminUser(user);
    if (!isPlatform && !isInst) {
      return NextResponse.json({ error: "Forbidden: Administrator access required to modify performance settings" }, { status: 403 });
    }

    const body = await req.json();
    const { rules, changeReason } = body;

    if (!Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json({ error: "Rules list is required" }, { status: 400 });
    }

    const userName = (user as any).full_name || (user as any).name || (user as any).email || "Admin";

    for (const rule of rules) {
      if (!rule.rule_key) continue;

      // Fetch existing
      const existingRes = await db.query(`SELECT * FROM performance_settings WHERE rule_key = $1`, [rule.rule_key]);
      if (existingRes.rows.length === 0) continue;

      const prev = existingRes.rows[0];
      const hasChanges =
        prev.is_enabled !== rule.is_enabled ||
        Number(prev.point_value) !== Number(rule.point_value || 0) ||
        Number(prev.percentage_value) !== Number(rule.percentage_value || 0) ||
        prev.calc_type !== rule.calc_type ||
        prev.name !== rule.name ||
        prev.description !== rule.description;

      if (!hasChanges) continue;

      const newVersion = (prev.version || 1) + 1;

      // Update rule
      await db.query(`
        UPDATE performance_settings
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          is_enabled = $3,
          calc_type = $4,
          point_value = $5,
          percentage_value = $6,
          version = $7,
          updated_by = $8,
          updated_at = NOW()
        WHERE rule_key = $9
      `, [
        rule.name || prev.name,
        rule.description || prev.description,
        Boolean(rule.is_enabled),
        rule.calc_type || prev.calc_type,
        Number(rule.point_value || 0),
        Number(rule.percentage_value || 0),
        newVersion,
        userName,
        rule.rule_key,
      ]);

      // Record audit history
      await db.query(`
        INSERT INTO performance_settings_history (
          rule_key, rule_name, previous_values, new_values, changed_by, changed_by_id, change_reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        rule.rule_key,
        rule.name || prev.name,
        JSON.stringify({
          is_enabled: prev.is_enabled,
          calc_type: prev.calc_type,
          point_value: prev.point_value,
          percentage_value: prev.percentage_value,
          version: prev.version,
        }),
        JSON.stringify({
          is_enabled: Boolean(rule.is_enabled),
          calc_type: rule.calc_type || prev.calc_type,
          point_value: Number(rule.point_value || 0),
          percentage_value: Number(rule.percentage_value || 0),
          version: newVersion,
        }),
        userName,
        user.id,
        changeReason || "Admin updated configuration rules via Performance Settings",
      ]);
    }

    return NextResponse.json({ success: true, message: "Performance rules updated successfully" });
  } catch (err: any) {
    console.error("[Performance Settings PUT] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update settings" }, { status: 500 });
  }
}

