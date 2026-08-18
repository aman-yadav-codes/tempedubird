import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { canAccessInstitution } from "@/lib/auth/institution-scope";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { getPagination, getPageCount } from "@/lib/queries/pagination";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const institutionId = Number(url.searchParams.get("institutionId"));
    if (
      !Number.isInteger(institutionId) ||
      institutionId <= 0 ||
      !canAccessInstitution(user, institutionId)
    ) {
      return NextResponse.json(
        { error: "Forbidden: Institution access required" },
        { status: 403 },
      );
    }
    const newsPermissions = [
      "institution.noticeboard.create",
      "institution.noticeboard.edit",
      "teacher.myinstitution.noticeboard.create",
      "teacher.myinstitution.noticeboard.edit",
    ];
    if (
      !newsPermissions.some((permission) =>
        hasPermission(user, permission, { institutionId }),
      )
    ) {
      return NextResponse.json(
        { error: "Forbidden: Noticeboard target access required" },
        { status: 403 },
      );
    }
    const kind = url.searchParams.get("kind");
    const search = url.searchParams.get("search")?.trim() ?? "";
    const like = `%${search}%`;
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit"),
    );
    let dataSql = "";
    let countSql = "";
    let params: unknown[] = [];

    if (kind === "programs") {
      params = [institutionId, search, like, limit, offset];
      dataSql = `SELECT id, title AS name FROM institution_programs WHERE institution_id=$1 AND is_active=TRUE AND COALESCE(is_deleted,FALSE)=FALSE AND ($2='' OR title ILIKE $3) ORDER BY title LIMIT $4 OFFSET $5`;
      countSql = `SELECT COUNT(*)::int count FROM institution_programs WHERE institution_id=$1 AND is_active=TRUE AND COALESCE(is_deleted,FALSE)=FALSE AND ($2='' OR title ILIKE $3)`;
    } else if (kind === "sections") {
      const programId = Number(url.searchParams.get("programId"));
      params = [institutionId, programId, search, like, limit, offset];
      dataSql = `SELECT section.id, section.name FROM program_sections program_section INNER JOIN institution_programs program ON program.id=program_section.program_id INNER JOIN sections section ON section.id=program_section.section_id WHERE program.institution_id=$1 AND program.id=$2 AND program.is_active=TRUE AND COALESCE(program.is_deleted,FALSE)=FALSE AND section.is_active=TRUE AND COALESCE(section.is_deleted,FALSE)=FALSE AND ($3='' OR section.name ILIKE $4) ORDER BY section.name LIMIT $5 OFFSET $6`;
      countSql = `SELECT COUNT(*)::int count FROM program_sections program_section INNER JOIN institution_programs program ON program.id=program_section.program_id INNER JOIN sections section ON section.id=program_section.section_id WHERE program.institution_id=$1 AND program.id=$2 AND program.is_active=TRUE AND COALESCE(program.is_deleted,FALSE)=FALSE AND section.is_active=TRUE AND COALESCE(section.is_deleted,FALSE)=FALSE AND ($3='' OR section.name ILIKE $4)`;
    } else if (kind === "teachers") {
      params = [institutionId, search, like, user.id, limit, offset];
      dataSql = `SELECT DISTINCT u.id, u.full_name AS name, u.email FROM institution_memberships im INNER JOIN roles r ON r.id=im.role_id AND r.code='teacher' INNER JOIN users u ON u.id=im.user_id WHERE im.institution_id=$1 AND im.is_active=TRUE AND COALESCE(im.is_deleted,FALSE)=FALSE AND u.is_active=TRUE AND COALESCE(u.is_deleted,FALSE)=FALSE AND u.id <> $4 AND ($2='' OR u.full_name ILIKE $3 OR u.email ILIKE $3) ORDER BY name LIMIT $5 OFFSET $6`;
      countSql = `SELECT COUNT(DISTINCT u.id)::int count FROM institution_memberships im INNER JOIN roles r ON r.id=im.role_id AND r.code='teacher' INNER JOIN users u ON u.id=im.user_id WHERE im.institution_id=$1 AND im.is_active=TRUE AND COALESCE(im.is_deleted,FALSE)=FALSE AND u.is_active=TRUE AND COALESCE(u.is_deleted,FALSE)=FALSE AND u.id <> $4 AND ($2='' OR u.full_name ILIKE $3 OR u.email ILIKE $3)`;
    } else if (kind === "students") {
      params = [institutionId, search, like, user.id, limit, offset];
      dataSql = `SELECT DISTINCT sp.id, u.full_name AS name, u.email FROM student_enrollments se INNER JOIN student_profiles sp ON sp.id=se.student_id INNER JOIN users u ON u.id=sp.user_id WHERE se.institution_id=$1 AND se.status='active' AND COALESCE(se.is_deleted,FALSE)=FALSE AND u.is_active=TRUE AND COALESCE(u.is_deleted,FALSE)=FALSE AND u.id <> $4 AND ($2='' OR u.full_name ILIKE $3 OR u.email ILIKE $3 OR COALESCE(sp.admission_number,'') ILIKE $3) ORDER BY name LIMIT $5 OFFSET $6`;
      countSql = `SELECT COUNT(DISTINCT sp.id)::int count FROM student_enrollments se INNER JOIN student_profiles sp ON sp.id=se.student_id INNER JOIN users u ON u.id=sp.user_id WHERE se.institution_id=$1 AND se.status='active' AND COALESCE(se.is_deleted,FALSE)=FALSE AND u.is_active=TRUE AND COALESCE(u.is_deleted,FALSE)=FALSE AND u.id <> $4 AND ($2='' OR u.full_name ILIKE $3 OR u.email ILIKE $3 OR COALESCE(sp.admission_number,'') ILIKE $3)`;
    } else {
      return NextResponse.json(
        { error: "Unknown target option" },
        { status: 404 },
      );
    }
    const [data, count] = await Promise.all([
      db.query(dataSql, params),
      db.query<{ count: number }>(countSql, params.slice(0, -2)),
    ]);
    const total = Number(count.rows[0]?.count ?? 0);
    return NextResponse.json({
      data: data.rows,
      pageCount: getPageCount(total, limit),
      total,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load notice targets",
      },
      { status: 400 },
    );
  }
}

