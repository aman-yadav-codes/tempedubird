import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user || !isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Platform Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const typeId = Number(id);

    const typeRes = await db.query(
      `SELECT id, name, slug FROM institution_types WHERE id = $1 AND COALESCE(is_deleted, false) = false`,
      [typeId]
    );

    if (typeRes.rows.length === 0) {
      return NextResponse.json({ error: "Business type not found" }, { status: 404 });
    }

    const bt = typeRes.rows[0];
    const isAcademic = [
      "school",
      "college",
      "university",
      "institute",
      "coaching",
      "education-and-coaching",
    ].includes(bt.slug.toLowerCase());

    const targetTypeIds = [typeId];
    if (typeId === 27) targetTypeIds.push(9);
    if (typeId === 9) targetTypeIds.push(27);

    const allModulesRes = await db.query(`SELECT id, module_key FROM system_modules WHERE status = 'active'`);
    const allModules = allModulesRes.rows;
    const academicPrefixes = ["classroom", "academics", "students", "institutions", "inst_"];

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      for (const tId of targetTypeIds) {
        for (const mod of allModules) {
          let isEnabled = true;
          if (!isAcademic && academicPrefixes.some((prefix) => mod.module_key === prefix || mod.module_key.startsWith(prefix))) {
            isEnabled = false;
          }

          await client.query(
            `INSERT INTO business_type_modules (business_type_id, module_id, is_enabled, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (business_type_id, module_id) 
             DO UPDATE SET is_enabled = $3, updated_at = NOW()`,
            [tId, mod.id, isEnabled]
          );
        }

        await client.query(
          `UPDATE institution_types SET updated_at = NOW() WHERE id = $1`,
          [tId]
        );
      }

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      message: `Reset permissions for "${bt.name}" to default ${isAcademic ? "Academic" : "Commercial"} template.`,
    });
  } catch (err: unknown) {
    console.error("[POST /api/admin/business-type-access/[id]/reset] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to reset module configuration" },
      { status: 500 }
    );
  }
}

