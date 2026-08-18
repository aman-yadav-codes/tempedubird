import type { Pool } from "pg";

export type NewsTargetType =
  "WHOLE_INSTITUTION" | "ROLE" | "PROGRAM" | "SECTION" | "USER";

export async function validateNewsTarget(
  db: Pool,
  input: {
    institutionId: number;
    targetType?: string;
    targetRoleCode?: string | null;
    targetId?: number | null;
    targetProgramId?: number | null;
    actorUserId?: number | null;
    canTargetWholeInstitution?: boolean;
  },
) {
  const targetType = (input.targetType ??
    "WHOLE_INSTITUTION") as NewsTargetType;
  const targetRoleCode = input.targetRoleCode ?? null;
  const targetId = Number(input.targetId) || null;
  const targetProgramId = Number(input.targetProgramId) || null;
  if (
    !["WHOLE_INSTITUTION", "ROLE", "PROGRAM", "SECTION", "USER"].includes(
      targetType,
    )
  )
    throw new Error("Invalid alert target");
  if (targetType === "WHOLE_INSTITUTION") {
    if (input.canTargetWholeInstitution === false) {
      throw new Error("Only institution admins can send a notice to the whole institution");
    }
    return {
      targetType,
      targetRoleCode: null,
      targetId: null,
      targetProgramId: null,
    };
  }
  if (targetType === "ROLE") {
    if (!["teacher", "student"].includes(targetRoleCode ?? ""))
      throw new Error("Select teachers or students");
    return {
      targetType,
      targetRoleCode: targetRoleCode as "teacher" | "student",
      targetId: null,
      targetProgramId: null,
    };
  }
  if (!targetId) throw new Error("Select a target");
  let sql = "";
  let role: "teacher" | "student" | null = null;
  if (targetType === "PROGRAM")
    sql = `SELECT 1 FROM institution_programs WHERE id=$1 AND institution_id=$2 AND is_active=TRUE AND COALESCE(is_deleted,FALSE)=FALSE`;
  if (targetType === "SECTION") {
    if (!targetProgramId) throw new Error("Select a class for this section");
    role = "student";
    sql = `SELECT 1 FROM program_sections program_section INNER JOIN institution_programs program ON program.id=program_section.program_id INNER JOIN sections section ON section.id=program_section.section_id WHERE section.id=$1 AND program.institution_id=$2 AND program.id=$3 AND program.is_active=TRUE AND COALESCE(program.is_deleted,FALSE)=FALSE AND section.is_active=TRUE AND COALESCE(section.is_deleted,FALSE)=FALSE`;
  }
  if (targetType === "USER" && targetRoleCode === "teacher") {
    if (targetId === input.actorUserId)
      throw new Error("Select another person to receive this notice");
    role = "teacher";
    sql = `SELECT 1 FROM institution_memberships im INNER JOIN roles r ON r.id=im.role_id AND r.code='teacher' WHERE im.user_id=$1 AND im.institution_id=$2 AND im.is_active=TRUE AND COALESCE(im.is_deleted,FALSE)=FALSE`;
  }
  if (targetType === "USER" && targetRoleCode === "student") {
    role = "student";
    sql = `SELECT 1 FROM student_profiles sp INNER JOIN student_enrollments se ON se.student_id=sp.id WHERE sp.id=$1 AND se.institution_id=$2 AND se.status='active' AND COALESCE(se.is_deleted,FALSE)=FALSE AND ($3::int IS NULL OR sp.user_id <> $3::int)`;
  }
  const params =
    targetType === "SECTION"
      ? [targetId, input.institutionId, targetProgramId]
      : targetType === "USER" && targetRoleCode === "student"
        ? [targetId, input.institutionId, input.actorUserId ?? null]
        : [targetId, input.institutionId];
  if (!sql || !(await db.query(sql, params)).rowCount)
    throw new Error(
      "The selected alert target does not belong to this institution",
    );
  return {
    targetType,
    targetRoleCode: role,
    targetId,
    targetProgramId: targetType === "SECTION" ? targetProgramId : null,
  };
}
