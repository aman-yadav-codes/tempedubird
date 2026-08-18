import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";

const SLOT_TYPES = new Set(["CLASS", "BREAK", "LUNCH", "ASSEMBLY", "ACTIVITY"]);

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const url = new URL(req.url);
    const institutionId = Number(url.searchParams.get("institutionId"));
    if (!Number.isInteger(institutionId) || institutionId <= 0) {
      return NextResponse.json({ error: "institutionId is required" }, { status: 400 });
    }

    assertCanAccessInstitution(currentUser, institutionId);

    const result = await db.query(
      `
        SELECT id, institution_id, slot_name, slot_order, start_time, end_time, slot_type, is_active, created_at
        FROM timetable_slots
        WHERE institution_id = $1
        ORDER BY slot_order ASC, start_time ASC
      `,
      [institutionId]
    );

    return NextResponse.json({ data: result.rows });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: Request) {
  const client = await db.connect();
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json();
    const institutionId = Number(body.institutionId);
    const slots = Array.isArray(body.slots) ? body.slots : [];
    if (!Number.isInteger(institutionId) || institutionId <= 0) {
      return NextResponse.json({ error: "Institution is required" }, { status: 400 });
    }
    assertCanAccessInstitution(currentUser, institutionId);

    const normalized = slots
      .map((slot: Record<string, unknown>, index: number) => ({
        id: Number(slot.id) || null,
        slotName: typeof slot.slotName === "string" && slot.slotName.trim() ? slot.slotName.trim() : null,
        slotOrder: Number(slot.slotOrder) || index + 1,
        startTime: String(slot.startTime || ""),
        endTime: String(slot.endTime || ""),
        slotType: String(slot.slotType || "CLASS").toUpperCase(),
        isActive: slot.isActive !== false,
      }))
      .filter((slot) => slot.startTime && slot.endTime);

    for (const slot of normalized) {
      if (!SLOT_TYPES.has(slot.slotType)) {
        return NextResponse.json(
          { error: "Slot type must be CLASS, BREAK, LUNCH, ASSEMBLY, or ACTIVITY" },
          { status: 422 }
        );
      }
    }

    await client.query("BEGIN");
    const keepIds: number[] = [];
    for (const slot of normalized) {
      if (slot.id) {
        const updated = await client.query<{ id: number }>(
          `
            UPDATE timetable_slots
            SET slot_name = $1,
                slot_order = $2,
                start_time = $3,
                end_time = $4,
                slot_type = $5,
                is_active = $6
            WHERE id = $7
              AND institution_id = $8
            RETURNING id
          `,
          [slot.slotName, slot.slotOrder, slot.startTime, slot.endTime, slot.slotType, slot.isActive, slot.id, institutionId]
        );
        if (updated.rows[0]) keepIds.push(updated.rows[0].id);
      } else {
        const inserted = await client.query<{ id: number }>(
          `
            INSERT INTO timetable_slots (institution_id, slot_name, slot_order, start_time, end_time, slot_type, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `,
          [institutionId, slot.slotName, slot.slotOrder, slot.startTime, slot.endTime, slot.slotType, slot.isActive]
        );
        keepIds.push(inserted.rows[0].id);
      }
    }

    await client.query(
      `
        DELETE FROM timetable_slots
        WHERE institution_id = $1
          AND NOT (id = ANY($2::int[]))
      `,
      [institutionId, keepIds]
    );
    await client.query("COMMIT");

    const result = await db.query(
      `
        SELECT id, institution_id, slot_name, slot_order, start_time, end_time, slot_type, is_active, created_at
        FROM timetable_slots
        WHERE institution_id = $1
        ORDER BY slot_order ASC, start_time ASC
      `,
      [institutionId]
    );

    return NextResponse.json({ data: result.rows });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const message = getErrorMessage(err);
    const code = typeof err === "object" && err && "code" in err ? String((err as { code?: unknown }).code) : "";
    const status = code === "23505" ? 409 : message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: code === "23505" ? "Slot order must be unique for this institution" : message }, { status });
  } finally {
    client.release();
  }
}
