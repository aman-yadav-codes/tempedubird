import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET() {
  try {
    // Query categorized accounts directly from the database
    const [
      studentsRes,
      parentsRes,
      teachersRes,
      driversRes,
      institutionAdminsRes,
      platformAdminsRes,
    ] = await Promise.allSettled([
      // Students
      db.query(`
        SELECT DISTINCT ON (u.id)
          u.id,
          u.full_name,
          u.email,
          u.phone,
          u.avatar_url,
          'student' AS role_code,
          'Student' AS role_label,
          COALESCE(sp.admission_number, 'MS-STU-' || LPAD(u.id::text, 3, '0')) AS admission_number,
          COALESCE(i.name, 'Maa Sharda Institute PVT LTD') AS institution_name,
          COALESCE(i.id, 1) AS institution_id
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        LEFT JOIN student_enrollments se ON se.student_id = sp.id
        LEFT JOIN institution_profiles i ON i.id = se.institution_id
        WHERE COALESCE(u.is_deleted, FALSE) = FALSE
          AND (r.code = 'student' OR u.email ILIKE '%student%' OR sp.id IS NOT NULL)
        ORDER BY u.id ASC
        LIMIT 30
      `),
      // Parents / Guardians
      db.query(`
        SELECT DISTINCT ON (u.id)
          u.id,
          u.full_name,
          u.email,
          u.phone,
          u.avatar_url,
          'parent' AS role_code,
          'Parent / Guardian' AS role_label,
          NULL AS admission_number,
          COALESCE(i.name, 'Maa Sharda Institute PVT LTD') AS institution_name,
          COALESCE(i.id, 1) AS institution_id
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        LEFT JOIN student_guardians sg ON sg.guardian_user_id = u.id
        LEFT JOIN student_profiles sp ON sp.id = sg.student_id
        LEFT JOIN student_enrollments se ON se.student_id = sp.id
        LEFT JOIN institution_profiles i ON i.id = se.institution_id
        WHERE COALESCE(u.is_deleted, FALSE) = FALSE
          AND (r.code IN ('parent', 'guardian') OR u.email ILIKE '%guardian%' OR u.email ILIKE '%parent%')
        ORDER BY u.id ASC
        LIMIT 30
      `),
      // Teachers / Faculty
      db.query(`
        SELECT DISTINCT ON (u.id)
          u.id,
          u.full_name,
          u.email,
          u.phone,
          u.avatar_url,
          'teacher' AS role_code,
          'Teacher / Faculty' AS role_label,
          NULL AS admission_number,
          COALESCE(i.name, 'Maa Sharda Institute PVT LTD') AS institution_name,
          COALESCE(i.id, 1) AS institution_id
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        LEFT JOIN institution_memberships im ON im.user_id = u.id
        LEFT JOIN institution_profiles i ON i.id = im.institution_id
        WHERE COALESCE(u.is_deleted, FALSE) = FALSE
          AND (r.code = 'teacher' OR u.email ILIKE '%teacher%' OR u.email ILIKE '%faculty%')
        ORDER BY u.id ASC
        LIMIT 30
      `),
      // Drivers / Transport Staff
      db.query(`
        SELECT DISTINCT ON (u.id)
          u.id,
          u.full_name,
          u.email,
          u.phone,
          u.avatar_url,
          'driver' AS role_code,
          'Driver / Transport Staff' AS role_label,
          NULL AS admission_number,
          COALESCE(i.name, 'Maa Sharda Institute PVT LTD') AS institution_name,
          COALESCE(i.id, 1) AS institution_id
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        LEFT JOIN institution_memberships im ON im.user_id = u.id
        LEFT JOIN institution_profiles i ON i.id = im.institution_id
        WHERE COALESCE(u.is_deleted, FALSE) = FALSE
          AND (r.code = 'driver' OR u.email ILIKE '%driver%')
        ORDER BY u.id ASC
        LIMIT 30
      `),
      // Institution Admins (Maa Sharda Institute PVT LTD, etc.)
      db.query(`
        SELECT DISTINCT ON (u.id)
          u.id,
          u.full_name,
          u.email,
          u.phone,
          u.avatar_url,
          'institution_admin' AS role_code,
          'Institution Admin' AS role_label,
          NULL AS admission_number,
          COALESCE(i.name, 'Maa Sharda Institute PVT LTD') AS institution_name,
          COALESCE(i.id, 1) AS institution_id
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        LEFT JOIN institution_memberships im ON im.user_id = u.id
        LEFT JOIN institution_profiles i ON i.id = im.institution_id OR i.user_id = u.id
        WHERE COALESCE(u.is_deleted, FALSE) = FALSE
          AND (r.code IN ('institution_admin', 'school_owner', 'college_owner', 'university_owner') OR u.email ILIKE '%admin%' OR u.email = 'deepakdv74@gmail.com')
          AND NOT (r.code IN ('platform_admin', 'super_admin') OR u.is_super_admin)
        ORDER BY u.id ASC
        LIMIT 30
      `),
      // Platform Admins / Super Admins
      db.query(`
        SELECT DISTINCT ON (u.id)
          u.id,
          u.full_name,
          u.email,
          u.phone,
          u.avatar_url,
          'platform_admin' AS role_code,
          'Platform Admin / Super Admin' AS role_label,
          NULL AS admission_number,
          'EduBird Platform Central' AS institution_name,
          NULL AS institution_id
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE COALESCE(u.is_deleted, FALSE) = FALSE
          AND (r.code IN ('platform_admin', 'super_admin') OR u.is_super_admin OR u.email = 'demo.platform_admin@edubird.com')
        ORDER BY u.id ASC
        LIMIT 30
      `),
    ]);

    const students = studentsRes.status === "fulfilled" ? studentsRes.value.rows : [];
    const parents = parentsRes.status === "fulfilled" ? parentsRes.value.rows : [];
    const teachers = teachersRes.status === "fulfilled" ? teachersRes.value.rows : [];
    const drivers = driversRes.status === "fulfilled" ? driversRes.value.rows : [];
    const institution_admins = institutionAdminsRes.status === "fulfilled" ? institutionAdminsRes.value.rows : [];
    const platform_admins = platformAdminsRes.status === "fulfilled" ? platformAdminsRes.value.rows : [];

    // Fallbacks if any group has 0 records
    if (students.length === 0) {
      students.push({
        id: 9901,
        full_name: "Aarav Sharma (Student)",
        email: "demo.student@edubird.com",
        phone: "9876543210",
        role_code: "student",
        role_label: "Student",
        admission_number: "DEMO-STU-001",
        institution_name: "Maa Sharda Institute PVT LTD",
        institution_id: 1,
      });
    }

    if (parents.length === 0) {
      parents.push({
        id: 9902,
        full_name: "Demo Guardian (Parent)",
        email: "demo.guardian@edubird.com",
        phone: "9876543211",
        role_code: "parent",
        role_label: "Parent / Guardian",
        admission_number: null,
        institution_name: "Maa Sharda Institute PVT LTD",
        institution_id: 1,
      });
    }

    if (teachers.length === 0) {
      teachers.push({
        id: 9903,
        full_name: "Prof. Rajesh Verma (Physics Faculty)",
        email: "rajesh.verma@maasharda.com",
        phone: "9876543222",
        role_code: "teacher",
        role_label: "Teacher / Faculty",
        admission_number: null,
        institution_name: "Maa Sharda Institute PVT LTD",
        institution_id: 1,
      });
    }

    if (drivers.length === 0) {
      drivers.push({
        id: 9904,
        full_name: "Ramesh Kumar (Transport Driver)",
        email: "ramesh.driver@maasharda.com",
        phone: "9876543223",
        role_code: "driver",
        role_label: "Driver / Transport Staff",
        admission_number: null,
        institution_name: "Maa Sharda Institute PVT LTD",
        institution_id: 1,
      });
    }

    if (institution_admins.length === 0) {
      institution_admins.push({
        id: 9905,
        full_name: "Deepak Yadav (Maa Sharda Institute Admin)",
        email: "deepakdv74@gmail.com",
        phone: "8887787846",
        role_code: "institution_admin",
        role_label: "Institution Admin",
        admission_number: null,
        institution_name: "Maa Sharda Institute PVT LTD",
        institution_id: 1,
      });
    }

    if (platform_admins.length === 0) {
      platform_admins.push({
        id: 9906,
        full_name: "Demo Platform Admin",
        email: "demo.platform_admin@edubird.com",
        phone: "9876543213",
        role_code: "platform_admin",
        role_label: "Platform Admin / Super Admin",
        admission_number: null,
        institution_name: "EduBird Platform Central",
        institution_id: null,
      });
    }

    return NextResponse.json({
      students,
      parents,
      teachers,
      drivers,
      institution_admins,
      platform_admins,
    });
  } catch (err: unknown) {
    console.error("Failed to list switchable accounts:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load accounts" },
      { status: 500 }
    );
  }
}
