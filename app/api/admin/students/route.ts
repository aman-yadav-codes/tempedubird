import { NextResponse } from "next/server";

import { POST as createStudentUser } from "@/app/api/admin/users/route";
import { requireAdmin } from "@/lib/auth/auth";
import {
  canAccessInstitution,
  getRequestedInstitutionId,
  getScopedInstitutionIds,
} from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

async function getStudentsPaginated(
  currentUserId: number,
  limit: number,
  offset: number,
  institutionIds: number[] | null,
  filters: {
    search?: string | null;
    programId?: number | null;
    sectionId?: number | null;
    academicYearId?: number | null;
  } = {}
) {
  let academicYearId = filters.academicYearId ?? null;
  if (academicYearId && institutionIds !== null) {
    if (institutionIds.length === 0) {
      academicYearId = null;
    } else {
      const academicYearScope = await db.query<{ id: number }>(
        `
          SELECT id
          FROM academic_years
          WHERE id = $1
            AND institution_id = ANY($2::int[])
          LIMIT 1
        `,
        [academicYearId, institutionIds],
      );
      if (!academicYearScope.rows.length) {
        academicYearId = null;
      }
    }
  }

  const params: unknown[] = [currentUserId, limit, offset];
  const countParams: unknown[] = [currentUserId];
  const dataExtraWhere: string[] = [];
  const countExtraWhere: string[] = [];
  const dataInstitutionParamIndex =
    institutionIds !== null && institutionIds.length > 0 ? 4 : null;
  const countInstitutionParamIndex =
    institutionIds !== null && institutionIds.length > 0 ? 2 : null;
  const institutionNamesFilter =
    institutionIds === null
      ? ""
      : institutionIds.length === 0
        ? "AND FALSE"
        : "AND institution_scope.institution_id = ANY($4::int[])";
  if (institutionIds !== null && institutionIds.length > 0) {
    params.push(institutionIds);
    countParams.push(institutionIds);
  }

  const appendSearchFilter = (targetParams: unknown[], targetWhere: string[]) => {
    const search = filters.search?.trim();
    if (!search) return;
    targetParams.push(`%${search}%`);
    const searchIndex = targetParams.length;
    targetWhere.push(`
      AND (
        u.full_name ILIKE $${searchIndex}
        OR u.email ILIKE $${searchIndex}
        OR CAST(u.id AS TEXT) ILIKE $${searchIndex}
        OR EXISTS (
          SELECT 1
          FROM student_profiles search_sp
          LEFT JOIN student_enrollments search_se
            ON search_se.student_id = search_sp.id
           AND search_se.status = 'active'
           AND COALESCE(search_se.is_deleted, FALSE) = FALSE
          WHERE search_sp.user_id = u.id
            AND (
              COALESCE(search_sp.admission_number, '') ILIKE $${searchIndex}
              OR COALESCE(search_se.roll_number, '') ILIKE $${searchIndex}
            )
        )
      )
    `);
  };

  const appendEnrollmentFilters = (
    targetParams: unknown[],
    targetWhere: string[],
    institutionParamIndex: number | null,
  ) => {
    if (!filters.programId && !filters.sectionId && !academicYearId) return;

    const enrollmentClauses = [
      "filter_sp.user_id = u.id",
      "COALESCE(filter_se.is_deleted, FALSE) = FALSE",
    ];

    if (filters.programId) {
      targetParams.push(filters.programId);
      enrollmentClauses.push(`filter_se.program_id = $${targetParams.length}`);
    }
    if (filters.sectionId) {
      targetParams.push(filters.sectionId);
      enrollmentClauses.push(`filter_se.section_id = $${targetParams.length}`);
    }
    if (academicYearId) {
      targetParams.push(academicYearId);
      enrollmentClauses.push(`filter_se.academic_year_id = $${targetParams.length}`);
    }
    if (institutionIds !== null && institutionParamIndex) {
      enrollmentClauses.push(
        institutionIds.length === 0
          ? "FALSE"
          : `filter_se.institution_id = ANY($${institutionParamIndex}::int[])`,
      );
    }

    if (filters.programId || filters.sectionId) {
      targetWhere.push(`
        AND EXISTS (
          SELECT 1
          FROM student_profiles filter_sp
          INNER JOIN student_enrollments filter_se ON filter_se.student_id = filter_sp.id
          WHERE ${enrollmentClauses.join(" AND ")}
        )
      `);
    } else {
      targetWhere.push(`
        AND (
          EXISTS (
            SELECT 1
            FROM student_profiles filter_sp
            INNER JOIN student_enrollments filter_se ON filter_se.student_id = filter_sp.id
            WHERE ${enrollmentClauses.join(" AND ")}
          )
          OR NOT EXISTS (
            SELECT 1
            FROM student_profiles unassigned_sp
            INNER JOIN student_enrollments unassigned_se ON unassigned_se.student_id = unassigned_sp.id
            WHERE unassigned_sp.user_id = u.id
              AND COALESCE(unassigned_se.is_deleted, FALSE) = FALSE
          )
        )
      `);
    }
  };

  appendSearchFilter(params, dataExtraWhere);
  appendSearchFilter(countParams, countExtraWhere);
  appendEnrollmentFilters(params, dataExtraWhere, dataInstitutionParamIndex);
  appendEnrollmentFilters(countParams, countExtraWhere, countInstitutionParamIndex);

  const enrollmentSummaryWhere = [
    "summary_sp.user_id = u.id",
    "COALESCE(summary_se.is_deleted, FALSE) = FALSE",
  ];
  if (!academicYearId) {
    enrollmentSummaryWhere.push("summary_se.status = 'active'");
  }
  if (institutionIds !== null) {
    enrollmentSummaryWhere.push(
      institutionIds.length === 0
        ? "FALSE"
        : "summary_se.institution_id = ANY($4::int[])"
    );
  }
  if (filters.programId) {
    params.push(filters.programId);
    enrollmentSummaryWhere.push(`summary_se.program_id = $${params.length}`);
  }
  if (filters.sectionId) {
    params.push(filters.sectionId);
    enrollmentSummaryWhere.push(`summary_se.section_id = $${params.length}`);
  }
  let prefAyIdx = 0;
  if (academicYearId) {
    params.push(academicYearId);
    prefAyIdx = params.length;
  }

  const studentExistsSql = `
    (
      EXISTS (
        SELECT 1
        FROM student_profiles student_scope_sp
        INNER JOIN student_enrollments student_scope_se
          ON student_scope_se.student_id = student_scope_sp.id
         AND COALESCE(student_scope_se.is_deleted, FALSE) = FALSE
        INNER JOIN institution_profiles student_scope_ip
          ON student_scope_ip.id = student_scope_se.institution_id
         AND student_scope_ip.is_active = TRUE
         AND COALESCE(student_scope_ip.is_deleted, FALSE) = FALSE
        WHERE student_scope_sp.user_id = u.id
          ${
            institutionIds === null
              ? ""
              : institutionIds.length === 0
                ? "AND FALSE"
                : "AND student_scope_se.institution_id = ANY($4::int[])"
          }
      )
      OR (
        ${!filters.programId && !filters.sectionId ? "TRUE" : "FALSE"}
        AND (
          EXISTS (
            SELECT 1
            FROM institution_memberships im
            INNER JOIN roles r ON r.id = im.role_id AND r.code = 'student'
            INNER JOIN institution_profiles ip ON ip.id = im.institution_id AND ip.is_active = TRUE AND COALESCE(ip.is_deleted, FALSE) = FALSE
            WHERE im.user_id = u.id
              AND im.is_active = TRUE
              AND COALESCE(im.is_deleted, FALSE) = FALSE
              ${
                institutionIds === null
                  ? ""
                  : institutionIds.length === 0
                    ? "AND FALSE"
                    : "AND im.institution_id = ANY($4::int[])"
              }
          )
          OR EXISTS (
            SELECT 1
            FROM user_profiles up
            INNER JOIN user_roles student_ur ON student_ur.user_id = up.user_id
            INNER JOIN roles student_role ON student_role.id = student_ur.role_id AND student_role.code = 'student'
            INNER JOIN institution_profiles profile_ip ON profile_ip.id = up.under_institution_id AND profile_ip.is_active = TRUE AND COALESCE(profile_ip.is_deleted, FALSE) = FALSE
            WHERE up.user_id = u.id
              AND up.under_institution_id IS NOT NULL
              ${
                institutionIds === null
                  ? ""
                  : institutionIds.length === 0
                    ? "AND FALSE"
                    : "AND up.under_institution_id = ANY($4::int[])"
              }
          )
        )
      )
    )
  `;
  const countStudentExistsSql = studentExistsSql.replaceAll(
    "ANY($4::int[])",
    "ANY($2::int[])",
  );

  const [studentsResult, countResult] = await Promise.all([
    db.query(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.phone,
          u.avatar_url,
          u.login_provider,
          u.is_active,
          u.is_verified,
          u.created_at,
          enrollment_summary.program_name,
          enrollment_summary.section_name,
          enrollment_summary.academic_year_name,
          enrollment_summary.roll_number,
          COALESCE(institution_names.institutions, '{}') AS institutions
        FROM users u
        LEFT JOIN LATERAL (
          SELECT
            program.title AS program_name,
            section.name AS section_name,
            academic_year.name AS academic_year_name,
            summary_se.roll_number
          FROM student_profiles summary_sp
          INNER JOIN student_enrollments summary_se
            ON summary_se.student_id = summary_sp.id
          LEFT JOIN institution_programs program
            ON program.id = summary_se.program_id
          LEFT JOIN sections section
            ON section.id = summary_se.section_id
          LEFT JOIN academic_years academic_year
            ON academic_year.id = summary_se.academic_year_id
          WHERE ${enrollmentSummaryWhere.join(" AND ")}
          ORDER BY
            ${prefAyIdx > 0 ? `CASE WHEN summary_se.academic_year_id = $${prefAyIdx} THEN 0 ELSE 1 END,` : ""}
            CASE WHEN summary_se.is_current THEN 0 ELSE 1 END,
            CASE WHEN summary_se.status = 'active' THEN 0 ELSE 1 END,
            summary_se.admission_date DESC NULLS LAST,
            summary_se.id DESC
          LIMIT 1
        ) enrollment_summary ON TRUE
        LEFT JOIN LATERAL (
          SELECT array_agg(DISTINCT institution_name ORDER BY institution_name) AS institutions
          FROM (
            SELECT ip.name AS institution_name
                 , ip.id AS institution_id
            FROM institution_memberships im
            INNER JOIN roles r ON r.id = im.role_id AND r.code = 'student'
            INNER JOIN institution_profiles ip ON ip.id = im.institution_id
            WHERE im.user_id = u.id
              AND im.is_active = TRUE
              AND COALESCE(im.is_deleted, FALSE) = FALSE
              AND ip.is_active = TRUE
              AND COALESCE(ip.is_deleted, FALSE) = FALSE
            UNION
            SELECT profile_ip.name AS institution_name
                 , profile_ip.id AS institution_id
            FROM user_profiles up
            INNER JOIN user_roles student_ur ON student_ur.user_id = up.user_id
            INNER JOIN roles student_role ON student_role.id = student_ur.role_id AND student_role.code = 'student'
            INNER JOIN institution_profiles profile_ip ON profile_ip.id = up.under_institution_id
            WHERE up.user_id = u.id
              AND up.under_institution_id IS NOT NULL
              AND profile_ip.is_active = TRUE
              AND COALESCE(profile_ip.is_deleted, FALSE) = FALSE
            UNION
            SELECT enrollment_ip.name AS institution_name
                 , enrollment_ip.id AS institution_id
            FROM student_profiles enrollment_sp
            INNER JOIN student_enrollments enrollment_se
              ON enrollment_se.student_id = enrollment_sp.id
             AND COALESCE(enrollment_se.is_deleted, FALSE) = FALSE
            INNER JOIN institution_profiles enrollment_ip
              ON enrollment_ip.id = enrollment_se.institution_id
             AND enrollment_ip.is_active = TRUE
             AND COALESCE(enrollment_ip.is_deleted, FALSE) = FALSE
            WHERE enrollment_sp.user_id = u.id
          ) institution_scope
          WHERE TRUE
            ${institutionNamesFilter}
        ) institution_names ON TRUE
        WHERE u.id != $1
          AND COALESCE(u.is_deleted, FALSE) = FALSE
          AND (${studentExistsSql})
          ${dataExtraWhere.join("\n")}
        ORDER BY u.created_at DESC
        LIMIT $2 OFFSET $3
      `,
      params
    ),
    db.query<{ count: string }>(
      `
        SELECT COUNT(*)
        FROM users u
        WHERE u.id != $1
          AND COALESCE(u.is_deleted, FALSE) = FALSE
          AND (${countStudentExistsSql})
          ${countExtraWhere.join("\n")}
        `,
      countParams
    ),
  ]);

  return {
    students: await attachStudentActionReasons(
      studentsResult.rows,
      institutionIds,
      academicYearId
    ),
    totalCount: Number(countResult.rows[0]?.count ?? 0),
  };
}

async function attachStudentActionReasons<T extends { id: number }>(
  students: T[],
  institutionIds: number[] | null,
  academicYearId: number | null
) {
  if (!students.length) return students.map((student) => ({ ...student, action_reasons: [] }));

  const params: unknown[] = [students.map((student) => student.id)];
  const extraWhere: string[] = ["COALESCE(enrollment.is_deleted, FALSE) = FALSE"];
  if (institutionIds !== null) {
    if (!institutionIds.length) return students.map((student) => ({ ...student, action_reasons: [] }));
    params.push(institutionIds);
    extraWhere.push(`enrollment.institution_id = ANY($${params.length}::int[])`);
  }
  if (academicYearId) {
    params.push(academicYearId);
    extraWhere.push(`enrollment.academic_year_id = $${params.length}`);
  }

  const result = await db.query<{ user_id: number; action_reasons: string[] }>(
    `
      WITH target_users AS (
        SELECT unnest($1::int[]) AS user_id
      ),
      enrollment_flags AS (
        SELECT
          profile.user_id,
          bool_or(enrollment.status = 'active' AND NULLIF(TRIM(COALESCE(enrollment.roll_number, '')), '') IS NULL) AS missing_roll,
          bool_or(enrollment.status = 'active' AND enrollment.section_id IS NULL) AS missing_section,
          bool_or(enrollment.status = 'promoted') AS has_promoted_session,
          bool_or(enrollment.status IN ('graduated', 'transferred')) AS has_closed_session,
          bool_or(enrollment.promotion_type IN ('FAILED', 'RETAINED')) AS has_failed_or_retained
        FROM target_users target
        INNER JOIN student_profiles profile ON profile.user_id = target.user_id
        INNER JOIN student_enrollments enrollment ON enrollment.student_id = profile.id
        WHERE ${extraWhere.join(" AND ")}
        GROUP BY profile.user_id
      )
      SELECT
        target.user_id,
        COALESCE(array_remove(ARRAY[
          CASE WHEN flags.missing_roll
            THEN 'Assign a roll number for the active session before reports, ID cards, fees, and attendance are finalized.'
          END,
          CASE WHEN flags.missing_section
            THEN 'Assign a section so class attendance, exams, assignments, and cards can load correctly.'
          END,
          CASE WHEN flags.has_promoted_session
            THEN 'Previous session has been promoted. Review the new session enrollment and complete class, section, and roll details if needed.'
          END,
          CASE WHEN flags.has_closed_session
            THEN 'Student is closed for this session. Check TC, final result, fee dues, and document handover before archiving follow-up.'
          END,
          CASE WHEN flags.has_failed_or_retained
            THEN 'Student was failed or retained. Confirm result hold status, repeat-session enrollment, fee setup, and academic records.'
          END
        ], NULL), '{}') AS action_reasons
      FROM target_users target
      LEFT JOIN enrollment_flags flags ON flags.user_id = target.user_id
    `,
    params
  );

  const reasonsByUserId = new Map(result.rows.map((row) => [Number(row.user_id), row.action_reasons ?? []]));
  return students.map((student) => ({
    ...student,
    action_reasons: reasonsByUserId.get(student.id) ?? [],
  }));
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const url = new URL(req.url);
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const institutionId = getRequestedInstitutionId(url.searchParams);
    const search = url.searchParams.get("search")?.trim() || null;
    const programId = url.searchParams.get("programId") ? Number(url.searchParams.get("programId")) : null;
    const sectionId = url.searchParams.get("sectionId") ? Number(url.searchParams.get("sectionId")) : null;
    const academicYearId = url.searchParams.get("academicYearId") ? Number(url.searchParams.get("academicYearId")) : null;
    if (institutionId && !canAccessInstitution(currentUser, institutionId)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    const { students, totalCount } = await getStudentsPaginated(
      currentUser.id,
      limit,
      offset,
      getScopedInstitutionIds(currentUser, institutionId),
      {
        search,
        programId,
        sectionId,
        academicYearId,
      }
    );

    return NextResponse.json({
      data: students,
      pageCount: getPageCount(totalCount, limit),
      total: totalCount,
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    if (message === "Forbidden: Admin access required") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "Unauthorized" || message === "User not found") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return createStudentUser(req);
}
