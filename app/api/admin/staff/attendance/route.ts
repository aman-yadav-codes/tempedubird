import { NextResponse } from "next/server";
import type { Pool, PoolClient } from "pg";

import { requireAdmin } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import {
  hasPermission,
  isInstitutionAdminUser,
  isPlatformAdminUser,
  isPlatformFullAccess,
} from "@/lib/auth/permissions";
import type { PermissionUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureSystemNotificationTemplates } from "@/lib/queries/notifications";
import { NotificationService } from "@/services/notificationService";

type StaffAttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "LATE" | "HALF_DAY";
type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

type Queryable = Pick<Pool | PoolClient, "query">;

const ATTENDANCE_STATUSES = new Set<StaffAttendanceStatus>([
  "PRESENT",
  "ABSENT",
  "LEAVE",
  "LATE",
  "HALF_DAY",
]);

let staffAttendanceSchemaReady: Promise<void> | null = null;

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function positive(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function isoDate(value: unknown, fallback = new Date().toISOString().slice(0, 10)) {
  const next = String(value || fallback);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) {
    throw new Error("Select a valid date");
  }
  return next;
}

function monthValue(value: unknown) {
  const next = String(value || new Date().toISOString().slice(0, 7));
  if (!/^\d{4}-\d{2}$/.test(next)) {
    throw new Error("Select a valid month");
  }
  return next;
}

function normalizeStatus(value: unknown): StaffAttendanceStatus {
  const status = String(value || "PRESENT").toUpperCase() as StaffAttendanceStatus;
  return ATTENDANCE_STATUSES.has(status) ? status : "PRESENT";
}

function canManageStaffAttendance(user: PermissionUser, institutionId: number) {
  return (
    isPlatformFullAccess(user) ||
    isPlatformAdminUser(user) ||
    (isInstitutionAdminUser(user) &&
      (hasPermission(user, "managestaff.attendance.view", { institutionId }) ||
       hasPermission(user, "managestaff.allstaff.view", { institutionId }))) ||
    hasPermission(user, "managestaff.attendance.view") ||
    hasPermission(user, "managestaff.allstaff.view")
  );
}

function ownAttendancePermission(user: PermissionUser) {
  if (user.role_codes.includes("teacher")) return "teacher.myinstitution.myattendance.view";
  if (user.role_codes.includes("driver")) return "driver.myinstitution.myattendance.view";
  return null;
}

function ownAttendanceCreatePermission(user: PermissionUser) {
  if (user.role_codes.includes("teacher")) return "teacher.myinstitution.myattendance.create";
  if (user.role_codes.includes("driver")) return "driver.myinstitution.myattendance.create";
  return null;
}

async function ensureStaffAttendanceTables(queryable: Queryable) {
  await queryable.query(`
    CREATE TABLE IF NOT EXISTS staff_attendance (
      id BIGSERIAL PRIMARY KEY,
      institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
      staff_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      attendance_date DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
      check_in_time TIME,
      check_out_time TIME,
      remarks TEXT,
      marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL,
      updated_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL,
      CONSTRAINT staff_attendance_status_check
        CHECK (status IN ('PRESENT', 'ABSENT', 'LEAVE', 'LATE', 'HALF_DAY'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_attendance_scope
      ON staff_attendance (institution_id, staff_user_id, attendance_date);
    CREATE INDEX IF NOT EXISTS idx_staff_attendance_institution_date
      ON staff_attendance (institution_id, attendance_date);
    CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date
      ON staff_attendance (staff_user_id, attendance_date DESC);

    CREATE TABLE IF NOT EXISTS staff_leave_requests (
      id BIGSERIAL PRIMARY KEY,
      institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      staff_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_date DATE NOT NULL,
      to_date DATE NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      admin_note TEXT,
      decided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      decided_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL,
      updated_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL,
      CONSTRAINT staff_leave_requests_status_check
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
      CONSTRAINT staff_leave_requests_date_check CHECK (to_date >= from_date)
    );

    CREATE INDEX IF NOT EXISTS idx_staff_leave_requests_institution_status
      ON staff_leave_requests (institution_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_staff_leave_requests_staff
      ON staff_leave_requests (staff_user_id, created_at DESC);
  `);
}

function ensureStaffAttendanceSchemaOnce() {
  staffAttendanceSchemaReady ??= ensureStaffAttendanceTables(db);
  return staffAttendanceSchemaReady;
}

async function assertStaffMembership(
  queryable: Queryable,
  userId: number,
  institutionId: number,
  allowedRoles?: string[]
) {
  const params: unknown[] = [userId, institutionId];
  let roleCondition = "r.code <> 'student'";
  if (allowedRoles && allowedRoles.length > 0) {
    params.push(allowedRoles);
    roleCondition = `r.code = ANY($${params.length}::text[])`;
  }

  const result = await queryable.query<{ role_code: string }>(
    `
      SELECT r.code AS role_code
      FROM institution_memberships im
      INNER JOIN roles r ON r.id = im.role_id
      INNER JOIN users u ON u.id = im.user_id
      WHERE im.user_id = $1
        AND im.institution_id = $2
        AND im.is_active = TRUE
        AND ${roleCondition}
        AND u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE

      UNION

      SELECT r.code AS role_code
      FROM user_profiles up
      INNER JOIN user_roles ur ON ur.user_id = up.user_id
      INNER JOIN roles r ON r.id = ur.role_id
      INNER JOIN users u ON u.id = up.user_id
      WHERE up.user_id = $1
        AND up.under_institution_id = $2
        AND ${roleCondition}
        AND u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    params
  );

  if (!result.rows[0]) {
    throw new Error("Staff member does not belong to this institution");
  }

  return result.rows[0].role_code;
}

async function getInstitutionAdminIds(queryable: Queryable, institutionId: number) {
  const result = await queryable.query<{ user_id: number }>(
    `
      SELECT DISTINCT im.user_id
      FROM institution_memberships im
      INNER JOIN roles r ON r.id = im.role_id
      INNER JOIN users u ON u.id = im.user_id
      WHERE im.institution_id = $1
        AND im.is_active = TRUE
        AND r.code = 'institution_admin'
        AND u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
    `,
    [institutionId]
  );

  return result.rows.map((row) => Number(row.user_id));
}

async function listStaffAttendance(
  queryable: Queryable,
  institutionId: number,
  date: string,
  input: { page: number; limit: number }
) {
  const offset = (input.page - 1) * input.limit;
  const countResult = await queryable.query<{ total: number }>(
    `
      SELECT COUNT(DISTINCT staff_list.staff_user_id)::int AS total
      FROM (
        SELECT im.user_id AS staff_user_id
        FROM institution_memberships im
        INNER JOIN users u ON u.id = im.user_id
        INNER JOIN roles r ON r.id = im.role_id
        WHERE im.institution_id = $1
          AND im.is_active = TRUE
          AND r.code <> 'student'
          AND u.is_active = TRUE
          AND COALESCE(u.is_deleted, FALSE) = FALSE
        UNION
        SELECT up.user_id AS staff_user_id
        FROM user_profiles up
        INNER JOIN users u ON u.id = up.user_id
        INNER JOIN user_roles ur ON ur.user_id = up.user_id
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE up.under_institution_id = $1
          AND r.code <> 'student'
          AND u.is_active = TRUE
          AND COALESCE(u.is_deleted, FALSE) = FALSE
      ) staff_list
    `,
    [institutionId]
  );

  const result = await queryable.query(
    `
      WITH scoped_staff AS (
        SELECT
          im.user_id AS staff_user_id,
          u.full_name,
          u.email,
          r.code AS role_code,
          r.name AS role_name
        FROM institution_memberships im
        INNER JOIN users u ON u.id = im.user_id
        INNER JOIN roles r ON r.id = im.role_id
        WHERE im.institution_id = $1
          AND im.is_active = TRUE
          AND r.code <> 'student'
          AND u.is_active = TRUE
          AND COALESCE(u.is_deleted, FALSE) = FALSE

        UNION

        SELECT
          up.user_id AS staff_user_id,
          u.full_name,
          u.email,
          r.code AS role_code,
          r.name AS role_name
        FROM user_profiles up
        INNER JOIN users u ON u.id = up.user_id
        INNER JOIN user_roles ur ON ur.user_id = up.user_id
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE up.under_institution_id = $1
          AND r.code <> 'student'
          AND u.is_active = TRUE
          AND COALESCE(u.is_deleted, FALSE) = FALSE
      ),
      distinct_staff AS (
        SELECT DISTINCT ON (staff_user_id)
          staff_user_id,
          full_name,
          email,
          role_code,
          role_name
        FROM scoped_staff
        ORDER BY staff_user_id, role_code DESC
      )
      SELECT
        ds.staff_user_id,
        ds.full_name,
        ds.email,
        ds.role_code,
        ds.role_name,
        sa.id AS attendance_id,
        sa.status,
        sa.check_in_time,
        sa.check_out_time,
        COALESCE(sa.remarks, '') AS remarks
      FROM distinct_staff ds
      LEFT JOIN staff_attendance sa
        ON sa.institution_id = $1
       AND sa.staff_user_id = ds.staff_user_id
       AND sa.attendance_date = $2
      ORDER BY ds.full_name ASC
      LIMIT $3
      OFFSET $4
    `,
    [institutionId, date, input.limit, offset]
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total ?? 0,
  };
}

async function listLeaveRequests(queryable: Queryable, institutionId: number, staffUserId?: number) {
  const params: unknown[] = [institutionId];
  const staffFilter = staffUserId ? `AND slr.staff_user_id = $${params.push(staffUserId)}` : "";
  const result = await queryable.query(
    `
      SELECT
        slr.id,
        slr.staff_user_id,
        u.full_name,
        COALESCE(r.code, 'staff') AS role_code,
        slr.from_date,
        slr.to_date,
        slr.message,
        slr.status,
        slr.admin_note,
        slr.created_at,
        approver.full_name AS decided_by_name,
        slr.decided_at
      FROM staff_leave_requests slr
      INNER JOIN users u ON u.id = slr.staff_user_id
      LEFT JOIN institution_memberships im
        ON im.institution_id = slr.institution_id
       AND im.user_id = slr.staff_user_id
       AND im.is_active = TRUE
      LEFT JOIN roles r ON r.id = im.role_id
      LEFT JOIN users approver ON approver.id = slr.decided_by
      WHERE slr.institution_id = $1
        ${staffFilter}
      ORDER BY
        CASE slr.status WHEN 'PENDING' THEN 0 ELSE 1 END,
        slr.created_at DESC
      LIMIT 80
    `,
    params
  );

  return result.rows;
}

async function listSelfAttendance(queryable: Queryable, institutionId: number, userId: number, month: string) {
  const result = await queryable.query(
    `
      SELECT
        attendance_date,
        status,
        check_in_time,
        check_out_time,
        COALESCE(remarks, '') AS remarks
      FROM staff_attendance
      WHERE institution_id = $1
        AND staff_user_id = $2
        AND to_char(attendance_date, 'YYYY-MM') = $3
      ORDER BY attendance_date DESC
    `,
    [institutionId, userId, month]
  );

  return result.rows;
}

async function listAttendanceHistory(
  queryable: Queryable,
  institutionId: number,
  input: {
    fromDate: string;
    toDate: string;
    roleCode?: string | null;
    staffUserId?: number;
    page: number;
    limit: number;
  }
) {
  const params: unknown[] = [institutionId, input.fromDate, input.toDate];
  const filters = [
    "sa.institution_id = $1",
    "sa.attendance_date BETWEEN $2 AND $3",
  ];
  if (input.roleCode && input.roleCode !== "all") {
    params.push(input.roleCode);
    filters.push(`r.code = $${params.length}`);
  }
  if (input.staffUserId) {
    params.push(input.staffUserId);
    filters.push(`sa.staff_user_id = $${params.length}`);
  }
  const whereClause = filters.join(" AND ");
  const countResult = await queryable.query<{ total: number }>(
    `
      SELECT COUNT(*)::int AS total
      FROM staff_attendance sa
      INNER JOIN users u ON u.id = sa.staff_user_id
      LEFT JOIN institution_memberships im
        ON im.institution_id = sa.institution_id
       AND im.user_id = sa.staff_user_id
       AND im.is_active = TRUE
      LEFT JOIN roles r ON r.id = im.role_id
      WHERE ${whereClause}
    `,
    params
  );
  params.push(input.limit, (input.page - 1) * input.limit);
  const result = await queryable.query(
    `
      SELECT
        sa.id,
        sa.attendance_date,
        sa.staff_user_id,
        u.full_name,
        u.email,
        COALESCE(r.code, 'staff') AS role_code,
        sa.status,
        sa.check_in_time,
        sa.check_out_time,
        COALESCE(sa.remarks, '') AS remarks,
        marker.full_name AS marked_by_name,
        sa.updated_at
      FROM staff_attendance sa
      INNER JOIN users u ON u.id = sa.staff_user_id
      LEFT JOIN institution_memberships im
        ON im.institution_id = sa.institution_id
       AND im.user_id = sa.staff_user_id
       AND im.is_active = TRUE
      LEFT JOIN roles r ON r.id = im.role_id
      LEFT JOIN users marker ON marker.id = sa.marked_by
      WHERE ${whereClause}
      ORDER BY sa.attendance_date DESC, u.full_name ASC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `,
    params
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total ?? 0,
  };
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureStaffAttendanceSchemaOnce();

    const url = new URL(req.url);
    const institutionId = positive(url.searchParams.get("institutionId"));
    const mode = url.searchParams.get("mode") === "self" ? "self" : "admin";
    const action = url.searchParams.get("action") || "list";
    const date = isoDate(url.searchParams.get("date"));
    const month = monthValue(url.searchParams.get("month"));
    const fromDate = isoDate(url.searchParams.get("fromDate"), date);
    const toDate = isoDate(url.searchParams.get("toDate"), date);
    const page = Math.max(1, positive(url.searchParams.get("page")) || 1);
    const limit = Math.min(Math.max(positive(url.searchParams.get("limit")) || 10, 1), 50);

    if (!institutionId) {
      return NextResponse.json({ staff: [], attendance: [], leaves: [] });
    }

    assertCanAccessInstitution(currentUser, institutionId);

    if (mode === "self") {
      const permission = ownAttendancePermission(currentUser);
      if (!permission || !hasPermission(currentUser, permission, { institutionId })) {
        return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
      }
      await assertStaffMembership(db, currentUser.id, institutionId);
      if (action === "leaves") {
        const leaves = await listLeaveRequests(db, institutionId, currentUser.id);
        return NextResponse.json({ leaves });
      }
      const [attendance, leaves] = await Promise.all([
        listSelfAttendance(db, institutionId, currentUser.id, month),
        listLeaveRequests(db, institutionId, currentUser.id),
      ]);
      return NextResponse.json({ attendance, leaves });
    }

    if (!canManageStaffAttendance(currentUser, institutionId)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    if (action === "leaves") {
      const leaves = await listLeaveRequests(db, institutionId);
      return NextResponse.json({ leaves });
    }

    if (action === "history") {
      const history = await listAttendanceHistory(db, institutionId, {
        fromDate,
        toDate,
        roleCode: url.searchParams.get("roleCode"),
        staffUserId: positive(url.searchParams.get("staffUserId")),
        page,
        limit,
      });
      return NextResponse.json({
        history: history.rows,
        pagination: {
          page,
          limit,
          total: history.total,
          pageCount: Math.ceil(history.total / limit),
        },
      });
    }

    const [staffResult, leaves] = await Promise.all([
      listStaffAttendance(db, institutionId, date, { page, limit }),
      listLeaveRequests(db, institutionId),
    ]);

    return NextResponse.json({
      staff: staffResult.rows,
      leaves,
      pagination: {
        page,
        limit,
        total: staffResult.total,
        pageCount: Math.ceil(staffResult.total / limit),
      },
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status =
      message === "Forbidden: Admin access required" ||
      message === "Staff member does not belong to this institution"
        ? 403
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: Request) {
  const client = await db.connect();
  try {
    const currentUser = await requireAdmin(req);
    await ensureStaffAttendanceSchemaOnce();
    const body = await req.json();
    const institutionId = positive(body.institutionId);
    const academicYearId = positive(body.academicYearId) || null;
    const date = isoDate(body.date);
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!institutionId) throw new Error("Select an institution");
    assertCanAccessInstitution(currentUser, institutionId);
    if (!canManageStaffAttendance(currentUser, institutionId)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await client.query("BEGIN");
    for (const row of rows) {
      const staffUserId = positive(row.staffUserId);
      if (!staffUserId) continue;
      await assertStaffMembership(client, staffUserId, institutionId);
      const status = normalizeStatus(row.status);
      const fromDate = status === "LEAVE" ? isoDate(row.leaveFromDate || date) : date;
      const toDate = status === "LEAVE" ? isoDate(row.leaveToDate || fromDate, fromDate) : date;
      await client.query(
        `
          INSERT INTO staff_attendance (
            institution_id,
            academic_year_id,
            staff_user_id,
            attendance_date,
            status,
            check_in_time,
            check_out_time,
            remarks,
            marked_by,
            updated_at
          )
          SELECT
            $1::integer,
            $2::integer,
            $3::integer,
            attendance_day::date,
            $6::varchar(20),
            CASE WHEN $6::text = 'LEAVE' THEN NULL ELSE NULLIF($7::text, '')::time END,
            CASE WHEN $6::text = 'LEAVE' THEN NULL ELSE NULLIF($8::text, '')::time END,
            NULLIF($9::text, ''),
            $10::integer,
            timezone('Asia/Kolkata', NOW())
          FROM generate_series($4::date, $5::date, interval '1 day') AS attendance_day
          ON CONFLICT (institution_id, staff_user_id, attendance_date)
          DO UPDATE SET
            academic_year_id = EXCLUDED.academic_year_id,
            status = EXCLUDED.status,
            check_in_time = EXCLUDED.check_in_time,
            check_out_time = EXCLUDED.check_out_time,
            remarks = EXCLUDED.remarks,
            marked_by = EXCLUDED.marked_by,
            updated_at = timezone('Asia/Kolkata', NOW())
        `,
        [
          institutionId,
          academicYearId,
          staffUserId,
          fromDate,
          toDate,
          status,
          row.checkInTime || null,
          row.checkOutTime || null,
          String(row.remarks || "").trim(),
          currentUser.id,
        ]
      );

      if (status === "LEAVE") {
        const remarks = String(row.remarks || "").trim();
        const existingLeave = await client.query<{ id: number }>(
          `
            UPDATE staff_leave_requests
            SET message = COALESCE(NULLIF($5, ''), message),
                status = 'APPROVED',
                admin_note = 'Marked by institute admin',
                decided_by = $6,
                decided_at = timezone('Asia/Kolkata', NOW()),
                updated_at = timezone('Asia/Kolkata', NOW())
            WHERE institution_id = $1
              AND staff_user_id = $2
              AND from_date = $3::date
              AND to_date = $4::date
              AND status = 'APPROVED'
            RETURNING id
          `,
          [institutionId, staffUserId, fromDate, toDate, remarks, currentUser.id]
        );

        if (!existingLeave.rows[0]) {
          await client.query(
            `
              INSERT INTO staff_leave_requests (
                institution_id,
                staff_user_id,
                from_date,
                to_date,
                message,
                status,
                admin_note,
                decided_by,
                decided_at,
                updated_at
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                COALESCE(NULLIF($5, ''), 'Leave marked by institute admin'),
                'APPROVED',
                'Marked by institute admin',
                $6,
                timezone('Asia/Kolkata', NOW()),
                timezone('Asia/Kolkata', NOW())
              )
            `,
            [institutionId, staffUserId, fromDate, toDate, remarks, currentUser.id]
          );
        }
      }
    }
    await client.query("COMMIT");

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const message = getErrorMessage(err);
    const status =
      message === "Forbidden: Admin access required" ||
      message === "Staff member does not belong to this institution"
        ? 403
        : 400;
    return NextResponse.json({ error: message }, { status });
  } finally {
    client.release();
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureStaffAttendanceSchemaOnce();
    const body = await req.json();
    const action = String(body.action || "leave_request");
    const institutionId = positive(body.institutionId);

    if (!institutionId) throw new Error("Select an institution");
    assertCanAccessInstitution(currentUser, institutionId);

    const permission = action === "mark_self"
      ? ownAttendanceCreatePermission(currentUser)
      : ownAttendancePermission(currentUser);
    if (!permission || !hasPermission(currentUser, permission, { institutionId })) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    const roleCode = await assertStaffMembership(db, currentUser.id, institutionId);

    if (action === "mark_self") {
      const status = normalizeStatus(body.status);
      const date = isoDate(body.date);
      const fromDate = status === "LEAVE" ? isoDate(body.leaveFromDate || date) : date;
      const toDate = status === "LEAVE" ? isoDate(body.leaveToDate || fromDate, fromDate) : date;
      const message = String(body.remarks || "").trim() || "Leave requested from attendance.";

      if (status === "LEAVE") {
        const result = await db.query<{ id: number }>(
          `
            INSERT INTO staff_leave_requests (
              institution_id,
              staff_user_id,
              from_date,
              to_date,
              message
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
          `,
          [institutionId, currentUser.id, fromDate, toDate, message]
        );

        const leaveId = Number(result.rows[0].id);
        const recipients = (await getInstitutionAdminIds(db, institutionId)).filter((id) => id !== currentUser.id);
        if (recipients.length) {
          await ensureSystemNotificationTemplates(db);
          await new NotificationService(db).create({
            type: "staff.leave_request.created",
            recipients,
            institutionId,
            entityType: "staff_leave_request",
            entityId: leaveId,
            createdBy: currentUser.id,
            priority: "high",
            payload: {
              actor_name: currentUser.full_name,
              staff_name: currentUser.full_name,
              staff_role: roleCode === "driver" ? "Driver" : "Teacher",
              from_date: fromDate,
              to_date: toDate,
              message_preview: message.slice(0, 120),
              url: "/admin/staff/attendance?tab=leaves",
            },
          });
        }

        return NextResponse.json({ success: true, id: leaveId, requestPending: true }, { status: 201 });
      }

      await db.query(
        `
          INSERT INTO staff_attendance (
            institution_id,
            academic_year_id,
            staff_user_id,
            attendance_date,
            status,
            check_in_time,
            check_out_time,
            remarks,
            marked_by,
            updated_at
          )
          SELECT
            $1,
            NULLIF($2, 0),
            $3,
            attendance_day::date,
            $6,
            NULLIF($7, '')::time,
            NULLIF($8, '')::time,
            NULLIF($9, ''),
            $3,
            timezone('Asia/Kolkata', NOW())
          FROM generate_series($4::date, $5::date, interval '1 day') AS attendance_day
          ON CONFLICT (institution_id, staff_user_id, attendance_date)
          DO UPDATE SET
            academic_year_id = EXCLUDED.academic_year_id,
            status = EXCLUDED.status,
            check_in_time = EXCLUDED.check_in_time,
            check_out_time = EXCLUDED.check_out_time,
            remarks = EXCLUDED.remarks,
            marked_by = EXCLUDED.marked_by,
            updated_at = timezone('Asia/Kolkata', NOW())
        `,
        [
          institutionId,
          positive(body.academicYearId),
          currentUser.id,
          fromDate,
          toDate,
          status,
          body.checkInTime || null,
          body.checkOutTime || null,
          String(body.remarks || "").trim(),
        ]
      );
      return NextResponse.json({ success: true });
    }

    const fromDate = isoDate(body.fromDate);
    const toDate = isoDate(body.toDate, fromDate);
    const message = String(body.message || "").trim();
    if (!message) throw new Error("Leave message is required");

    const result = await db.query<{ id: number }>(
      `
        INSERT INTO staff_leave_requests (
          institution_id,
          staff_user_id,
          from_date,
          to_date,
          message
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [institutionId, currentUser.id, fromDate, toDate, message]
    );

    const leaveId = Number(result.rows[0].id);
    const recipients = (await getInstitutionAdminIds(db, institutionId)).filter((id) => id !== currentUser.id);
    if (recipients.length) {
      await ensureSystemNotificationTemplates(db);
      await new NotificationService(db).create({
        type: "staff.leave_request.created",
        recipients,
        institutionId,
        entityType: "staff_leave_request",
        entityId: leaveId,
        createdBy: currentUser.id,
        priority: "high",
        payload: {
          actor_name: currentUser.full_name,
          staff_name: currentUser.full_name,
          staff_role: roleCode === "driver" ? "Driver" : "Teacher",
          from_date: fromDate,
          to_date: toDate,
          message_preview: message.slice(0, 120),
          url: "/admin/staff/attendance?tab=leaves",
        },
      });
    }

    return NextResponse.json({ success: true, id: leaveId }, { status: 201 });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status =
      message === "Forbidden: Admin access required" ||
      message === "Staff member does not belong to this institution"
        ? 403
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureStaffAttendanceSchemaOnce();
    const body = await req.json();
    const id = positive(body.id);
    const status = String(body.status || "").toUpperCase() as LeaveStatus;
    const adminNote = String(body.adminNote || "").trim();

    if (!id || !["APPROVED", "REJECTED"].includes(status)) {
      throw new Error("Select a valid leave request status");
    }

    const existing = await db.query<{
      institution_id: number;
      staff_user_id: number;
      from_date: string;
      to_date: string;
      message: string;
    }>(
      `
        SELECT institution_id, staff_user_id, from_date, to_date, message
        FROM staff_leave_requests
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );
    const leaveRequest = existing.rows[0];
    const institutionId = Number(leaveRequest?.institution_id || 0);
    if (!institutionId) throw new Error("Leave request not found");
    assertCanAccessInstitution(currentUser, institutionId);
    if (!canManageStaffAttendance(currentUser, institutionId)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `
          UPDATE staff_leave_requests
          SET status = $2,
              admin_note = NULLIF($3, ''),
              decided_by = $4,
              decided_at = timezone('Asia/Kolkata', NOW()),
              updated_at = timezone('Asia/Kolkata', NOW())
          WHERE id = $1
        `,
        [id, status, adminNote, currentUser.id]
      );

      const attendanceStatus = status === "APPROVED" ? "LEAVE" : "ABSENT";
      const remarks = adminNote || leaveRequest.message;
      const conflictAction = status === "APPROVED"
        ? `
          DO UPDATE SET
            status = EXCLUDED.status,
            check_in_time = NULL,
            check_out_time = NULL,
            remarks = EXCLUDED.remarks,
            marked_by = EXCLUDED.marked_by,
            updated_at = timezone('Asia/Kolkata', NOW())
        `
        : `
          DO UPDATE SET
            status = EXCLUDED.status,
            check_in_time = NULL,
            check_out_time = NULL,
            remarks = EXCLUDED.remarks,
            marked_by = EXCLUDED.marked_by,
            updated_at = timezone('Asia/Kolkata', NOW())
          WHERE staff_attendance.status NOT IN ('PRESENT', 'LATE', 'HALF_DAY')
        `;

      await client.query(
        `
          INSERT INTO staff_attendance (
            institution_id,
            staff_user_id,
            attendance_date,
            status,
            check_in_time,
            check_out_time,
            remarks,
            marked_by,
            updated_at
          )
          SELECT
            $1,
            $2,
            attendance_day::date,
            $5,
            NULL,
            NULL,
            NULLIF($6, ''),
            $7,
            timezone('Asia/Kolkata', NOW())
          FROM generate_series($3::date, $4::date, interval '1 day') AS attendance_day
          ON CONFLICT (institution_id, staff_user_id, attendance_date)
          ${conflictAction}
        `,
        [
          institutionId,
          Number(leaveRequest.staff_user_id),
          isoDate(leaveRequest.from_date),
          isoDate(leaveRequest.to_date),
          attendanceStatus,
          remarks,
          currentUser.id,
        ]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
