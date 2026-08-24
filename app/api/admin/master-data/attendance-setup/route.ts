import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPagination, getPageCount } from "@/lib/queries/pagination";

async function ensureAttendanceSetupTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS institution_attendance_setups (
      id SERIAL PRIMARY KEY,
      institution_id INT,
      title VARCHAR(255) NOT NULL,
      target_type VARCHAR(50) NOT NULL DEFAULT 'STUDENTS',
      attendance_mode VARCHAR(50) NOT NULL DEFAULT 'FULL_DAY',
      start_time VARCHAR(20) DEFAULT '08:00',
      end_time VARCHAR(20) DEFAULT '14:30',
      grace_period_mins INT DEFAULT 15,
      half_day_time VARCHAR(20) DEFAULT '11:30',
      min_attendance_percentage INT DEFAULT 75,
      working_days JSONB DEFAULT '["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]'::jsonb,
      auto_notify_absent BOOLEAN DEFAULT TRUE,
      is_active BOOLEAN DEFAULT TRUE,
      is_default BOOLEAN DEFAULT FALSE,
      is_dummy BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

const DEFAULT_DUMMY_SETUPS = [
  {
    title: "Regular Academic Shift (Sample)",
    target_type: "STUDENTS",
    attendance_mode: "FULL_DAY",
    start_time: "08:00",
    end_time: "14:30",
    grace_period_mins: 15,
    half_day_time: "11:30",
    min_attendance_percentage: 75,
    working_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    auto_notify_absent: true,
    is_active: true,
    is_default: true,
    is_dummy: true,
  },
  {
    title: "Faculty & Staff Shift (Sample)",
    target_type: "STAFF",
    attendance_mode: "BIOMETRIC",
    start_time: "07:45",
    end_time: "15:30",
    grace_period_mins: 10,
    half_day_time: "12:00",
    min_attendance_percentage: 85,
    working_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    auto_notify_absent: true,
    is_active: true,
    is_default: false,
    is_dummy: true,
  },
  {
    title: "Period-Wise Lecture Attendance (Sample)",
    target_type: "STUDENTS",
    attendance_mode: "PERIOD_WISE",
    start_time: "09:00",
    end_time: "16:00",
    grace_period_mins: 5,
    half_day_time: "12:30",
    min_attendance_percentage: 80,
    working_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    auto_notify_absent: false,
    is_active: true,
    is_default: false,
    is_dummy: true,
  },
];

function getEffectiveInstitutionId(user: Awaited<ReturnType<typeof getAuthenticatedUser>>, paramId?: string | null): number | null {
  if (paramId && !Number.isNaN(Number(paramId))) {
    return Number(paramId);
  }
  const isPlatformAdmin = Boolean((user as any).is_super_admin || user.role_codes?.includes("platform_admin"));
  if (isPlatformAdmin) return null;
  return user.memberships?.[0]?.institution_id ?? null;
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureAttendanceSetupTable();

    const url = new URL(req.url);
    const institutionId = getEffectiveInstitutionId(user, url.searchParams.get("institution_id"));
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit") || "50"
    );
    const search = url.searchParams.get("search")?.trim() || "";
    const targetType = url.searchParams.get("target_type")?.trim() || "";

    // Check if this institution or global has any setups. If 0 records exist, seed default dummy templates!
    const existingCheck = await db.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM institution_attendance_setups WHERE (institution_id = $1 OR (institution_id IS NULL AND $1 IS NULL))`,
      [institutionId ?? null]
    );

    if ((existingCheck.rows[0]?.count || 0) === 0) {
      for (const dummy of DEFAULT_DUMMY_SETUPS) {
        await db.query(
          `
          INSERT INTO institution_attendance_setups (
            institution_id, title, target_type, attendance_mode,
            start_time, end_time, grace_period_mins, half_day_time,
            min_attendance_percentage, working_days, auto_notify_absent,
            is_active, is_default, is_dummy
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          `,
          [
            institutionId ?? null,
            dummy.title,
            dummy.target_type,
            dummy.attendance_mode,
            dummy.start_time,
            dummy.end_time,
            dummy.grace_period_mins,
            dummy.half_day_time,
            dummy.min_attendance_percentage,
            JSON.stringify(dummy.working_days),
            dummy.auto_notify_absent,
            dummy.is_active,
            dummy.is_default,
            dummy.is_dummy,
          ]
        );
      }
    }

    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (institutionId) {
      params.push(institutionId);
      whereClauses.push(`(institution_id = $${params.length} OR institution_id IS NULL)`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`title ILIKE $${params.length}`);
    }

    if (targetType && targetType !== "ALL") {
      params.push(targetType);
      whereClauses.push(`target_type = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [countRes, dataRes, statsRes] = await Promise.all([
      db.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM institution_attendance_setups ${whereSql}`,
        params
      ),
      db.query(
        `
        SELECT * FROM institution_attendance_setups
        ${whereSql}
        ORDER BY is_default DESC, is_active DESC, id ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
        [...params, limit, offset]
      ),
      db.query(
        `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE target_type = 'STUDENTS')::int AS student_setups,
          COUNT(*) FILTER (WHERE target_type = 'STAFF')::int AS staff_setups,
          COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active_setups,
          COUNT(*) FILTER (WHERE is_dummy = TRUE)::int AS dummy_setups
        FROM institution_attendance_setups
        ${whereSql}
        `,
        params
      ),
    ]);

    const total = countRes.rows[0]?.count || 0;
    return NextResponse.json({
      data: dataRes.rows,
      total,
      pageCount: getPageCount(total, limit),
      stats: statsRes.rows[0] || {
        total: 0,
        student_setups: 0,
        staff_setups: 0,
        active_setups: 0,
        dummy_setups: 0,
      },
    });
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: error.message || "Failed to fetch attendance setups" }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureAttendanceSetupTable();

    const body = await req.json();
    const institutionId = getEffectiveInstitutionId(user, body.institution_id);
    const {
      title,
      target_type = "STUDENTS",
      attendance_mode = "FULL_DAY",
      start_time = "08:00",
      end_time = "14:30",
      grace_period_mins = 15,
      half_day_time = "11:30",
      min_attendance_percentage = 75,
      working_days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      auto_notify_absent = true,
      is_active = true,
      is_default = false,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (is_default) {
      await db.query(
        `UPDATE institution_attendance_setups SET is_default = FALSE WHERE institution_id = $1 OR (institution_id IS NULL AND $1 IS NULL)`,
        [institutionId ?? null]
      );
    }

    const insertRes = await db.query(
      `
      INSERT INTO institution_attendance_setups (
        institution_id, title, target_type, attendance_mode,
        start_time, end_time, grace_period_mins, half_day_time,
        min_attendance_percentage, working_days, auto_notify_absent,
        is_active, is_default, is_dummy
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, FALSE)
      RETURNING *
      `,
      [
        institutionId ?? null,
        title.trim(),
        target_type,
        attendance_mode,
        start_time,
        end_time,
        Number(grace_period_mins) || 0,
        half_day_time,
        Number(min_attendance_percentage) || 75,
        JSON.stringify(working_days),
        Boolean(auto_notify_absent),
        Boolean(is_active),
        Boolean(is_default),
      ]
    );

    return NextResponse.json({ data: insertRes.rows[0], message: "Attendance setup created successfully" }, { status: 201 });
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: error.message || "Failed to create attendance setup" }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureAttendanceSetupTable();

    const body = await req.json();
    const institutionId = getEffectiveInstitutionId(user, body.institution_id);
    const {
      id,
      title,
      target_type,
      attendance_mode,
      start_time,
      end_time,
      grace_period_mins,
      half_day_time,
      min_attendance_percentage,
      working_days,
      auto_notify_absent,
      is_active,
      is_default,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (is_default) {
      await db.query(
        `UPDATE institution_attendance_setups SET is_default = FALSE WHERE (institution_id = $1 OR (institution_id IS NULL AND $1 IS NULL)) AND id != $2`,
        [institutionId ?? null, id]
      );
    }

    const updateRes = await db.query(
      `
      UPDATE institution_attendance_setups
      SET
        title = COALESCE($1, title),
        target_type = COALESCE($2, target_type),
        attendance_mode = COALESCE($3, attendance_mode),
        start_time = COALESCE($4, start_time),
        end_time = COALESCE($5, end_time),
        grace_period_mins = COALESCE($6, grace_period_mins),
        half_day_time = COALESCE($7, half_day_time),
        min_attendance_percentage = COALESCE($8, min_attendance_percentage),
        working_days = COALESCE($9, working_days),
        auto_notify_absent = COALESCE($10, auto_notify_absent),
        is_active = COALESCE($11, is_active),
        is_default = COALESCE($12, is_default),
        is_dummy = FALSE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
      `,
      [
        title?.trim() || null,
        target_type || null,
        attendance_mode || null,
        start_time || null,
        end_time || null,
        grace_period_mins !== undefined ? Number(grace_period_mins) : null,
        half_day_time || null,
        min_attendance_percentage !== undefined ? Number(min_attendance_percentage) : null,
        working_days ? JSON.stringify(working_days) : null,
        auto_notify_absent !== undefined ? Boolean(auto_notify_absent) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        is_default !== undefined ? Boolean(is_default) : null,
        id,
      ]
    );

    if (updateRes.rowCount === 0) {
      return NextResponse.json({ error: "Attendance setup not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updateRes.rows[0], message: "Attendance setup updated successfully" });
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: error.message || "Failed to update attendance setup" }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureAttendanceSetupTable();

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const deleteRes = await db.query(
      `DELETE FROM institution_attendance_setups WHERE id = $1 RETURNING id, title`,
      [Number(id)]
    );

    if (deleteRes.rowCount === 0) {
      return NextResponse.json({ error: "Attendance setup not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Attendance setup deleted successfully", data: deleteRes.rows[0] });
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: error.message || "Failed to delete attendance setup" }, { status });
  }
}
