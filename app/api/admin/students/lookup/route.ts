import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { readStudentRecords } from "@/lib/queries/student-records";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    await getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name")?.trim();
    const dob = searchParams.get("dob")?.trim();
    const gender = searchParams.get("gender")?.trim();

    if (!name || !dob || !gender || gender === "__NONE__") {
      return NextResponse.json({ matched: false, data: null });
    }

    const query = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.avatar_url,
        u.is_active,
        u.is_verified,
        up.gender,
        to_char(up.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
        up.about,
        up.address,
        up.city,
        up.state,
        up.pincode,
        sp.id AS student_profile_id,
        sp.admission_number,
        sp.apar_id,
        sp.blood_group,
        sp.emergency_contact_number,
        sp.category AS student_category,
        sp.nationality,
        sp.mother_tongue,
        sp.previous_school,
        sp.previous_grade,
        sp.medical_conditions
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE lower(trim(u.full_name)) = lower(trim($1::text))
        AND (
          up.date_of_birth = $2::date
          OR sp.date_of_birth = $2::date
        )
        AND lower(trim(COALESCE(up.gender, sp.gender, ''))) = lower(trim($3::text))
        AND COALESCE(u.is_deleted, FALSE) = FALSE
      ORDER BY u.id DESC
      LIMIT 1;
    `;

    const result = await db.query(query, [name, dob, gender]);
    const matchedUser = result.rows[0];

    if (!matchedUser) {
      return NextResponse.json({ matched: false, data: null });
    }

    // Retrieve detailed student records (guardians, documents, etc.)
    const studentRecords = await readStudentRecords(matchedUser.id);

    return NextResponse.json({
      matched: true,
      data: {
        user: matchedUser,
        studentRecords,
      },
    });
  } catch (err: unknown) {
    console.error("Error looking up student:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
