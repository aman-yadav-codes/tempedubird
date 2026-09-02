import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS staff_generated_letters (
      id BIGSERIAL PRIMARY KEY,
      institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
      staff_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      template_id INTEGER NOT NULL REFERENCES document_templates(id) ON DELETE RESTRICT,
      card_category_id INTEGER REFERENCES card_categories(id) ON DELETE RESTRICT,
      title VARCHAR(200) NOT NULL,
      letter_type VARCHAR(80) NOT NULL DEFAULT 'staff_letter',
      rendered_html TEXT NOT NULL,
      field_values JSONB NOT NULL DEFAULT '{}'::jsonb,
      image_url TEXT,
      pdf_url TEXT,
      canvas_width INTEGER,
      canvas_height INTEGER,
      generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      deleted_at TIMESTAMP,
      deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    );

    ALTER TABLE staff_generated_letters ALTER COLUMN institution_id DROP NOT NULL;

    CREATE TABLE IF NOT EXISTS institution_generated_documents (
      id BIGSERIAL PRIMARY KEY,
      institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
      template_id INTEGER NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
      reference_type VARCHAR(50) NOT NULL,
      reference_id INTEGER NOT NULL,
      image_url TEXT,
      pdf_url TEXT,
      generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE institution_generated_documents
      ADD COLUMN IF NOT EXISTS card_category_id INTEGER REFERENCES card_categories(id) ON DELETE RESTRICT,
      ADD COLUMN IF NOT EXISTS enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS title VARCHAR(200),
      ADD COLUMN IF NOT EXISTS rendered_html TEXT,
      ADD COLUMN IF NOT EXISTS field_values JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS canvas_width INTEGER,
      ADD COLUMN IF NOT EXISTS canvas_height INTEGER,
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

    ALTER TABLE institution_generated_documents ALTER COLUMN institution_id DROP NOT NULL;
  `);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderTemplate(html: string, values: Record<string, string>) {
  let result = html;
  for (const [key, val] of Object.entries(values)) {
    result = result.replaceAll(`{{${key}}}`, escapeHtml(val ?? ""));
  }
  return result;
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureTables();
    const url = new URL(req.url);
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const institutionId = url.searchParams.get("institutionId");
    const instIdNum = institutionId ? Number(institutionId) : null;

    // 1. Fetch Programs / Classes
    let programsQuery = `
      SELECT ip.id, ip.title AS name, ip.code, ip.institution_id
      FROM institution_programs ip
      WHERE COALESCE(ip.is_deleted, FALSE) = FALSE
    `;
    const progParams: any[] = [];
    if (!isPlatformAdmin && instIdNum) {
      progParams.push(instIdNum);
      programsQuery += ` AND ip.institution_id = $${progParams.length}`;
    } else if (instIdNum) {
      progParams.push(instIdNum);
      programsQuery += ` AND ip.institution_id = $${progParams.length}`;
    }
    programsQuery += ` ORDER BY ip.title ASC`;
    const programsRes = await db.query(programsQuery, progParams);

    // Fallback: If no institution_programs found, load categories
    let programs = programsRes.rows;
    if (programs.length === 0) {
      const catRes = await db.query(`SELECT id, name FROM categories WHERE is_active = TRUE ORDER BY name ASC LIMIT 50`);
      programs = catRes.rows;
    }

    // 2. Fetch Sections
    let sectionsQuery = `
      SELECT s.id, s.name, s.institution_id
      FROM sections s
      WHERE COALESCE(s.is_deleted, FALSE) = FALSE
    `;
    const secParams: any[] = [];
    if (instIdNum) {
      secParams.push(instIdNum);
      sectionsQuery += ` AND (s.institution_id = $${secParams.length} OR s.institution_id IS NULL)`;
    }
    sectionsQuery += ` ORDER BY s.name ASC`;
    const sectionsRes = await db.query(sectionsQuery, secParams);

    // 3. Fetch Staff Roles
    const rolesRes = await db.query(`
      SELECT id, code, initcap(replace(code, '_', ' ')) AS name
      FROM roles
      WHERE code NOT IN ('student', 'parent', 'guardian')
      ORDER BY name ASC
    `);

    // 4. Quick Counts
    let studentCountQuery = `
      SELECT COUNT(DISTINCT se.student_id)::int AS count
      FROM student_enrollments se
      WHERE se.status = 'active' AND COALESCE(se.is_deleted, FALSE) = FALSE
    `;
    if (instIdNum) {
      studentCountQuery += ` AND se.institution_id = ${instIdNum}`;
    }
    const studentCountRes = await db.query(studentCountQuery);

    let staffCountQuery = `
      SELECT COUNT(DISTINCT u.id)::int AS count
      FROM users u
      LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
      LEFT JOIN roles r ON r.id = im.role_id
      WHERE COALESCE(u.is_deleted, FALSE) = FALSE AND u.is_active = TRUE
        AND (r.code IS NULL OR r.code NOT IN ('student', 'guardian', 'parent'))
    `;
    if (instIdNum) {
      staffCountQuery += ` AND im.institution_id = ${instIdNum}`;
    }
    const staffCountRes = await db.query(staffCountQuery);

    return NextResponse.json({
      programs: programs.map((p) => ({ id: p.id, name: p.name })),
      sections: sectionsRes.rows.map((s) => ({ id: s.id, name: s.name })),
      roles: rolesRes.rows.map((r) => ({ id: r.id, code: r.code, name: r.name })),
      totalStudents: Number(studentCountRes.rows[0]?.count ?? 0),
      totalStaff: Number(staffCountRes.rows[0]?.count ?? 0),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load options" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureTables();
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const body = await req.json();
    const {
      action,
      audience = "student",
      scopeType = "all", // "all" | "program" | "section" | "role"
      programId,
      sectionId,
      roleCode,
      institutionId,
      templateId,
      recipientIds,
      customFields = {},
    } = body;

    const instIdNum = institutionId ? Number(institutionId) : null;

    // ─────────────────────────────────────────────────────────────
    // ACTION 1: PREVIEW MATCHING RECIPIENTS
    // ─────────────────────────────────────────────────────────────
    if (action === "preview") {
      if (audience === "student") {
        let where = [
          "se.status = 'active'",
          "COALESCE(se.is_deleted, FALSE) = FALSE",
          "COALESCE(u.is_deleted, FALSE) = FALSE",
          "u.is_active = TRUE",
        ];
        const params: any[] = [];

        if (instIdNum) {
          params.push(instIdNum);
          where.push(`se.institution_id = $${params.length}`);
        }

        if (scopeType === "program" && programId) {
          params.push(Number(programId));
          where.push(`(se.program_id = $${params.length} OR se.class_category_id = $${params.length})`);
        } else if (scopeType === "section") {
          if (programId) {
            params.push(Number(programId));
            where.push(`(se.program_id = $${params.length} OR se.class_category_id = $${params.length})`);
          }
          if (sectionId) {
            params.push(Number(sectionId));
            where.push(`se.section_id = $${params.length}`);
          }
        }

        const query = `
          SELECT DISTINCT ON (sp.id)
            sp.id,
            sp.admission_number,
            se.roll_number,
            se.id AS enrollment_id,
            u.full_name AS name,
            u.email,
            u.phone,
            u.avatar_url,
            COALESCE(prog.title, cc.name, 'Student') AS class_name,
            sec.name AS section_name,
            ip.name AS institution_name
          FROM student_enrollments se
          INNER JOIN student_profiles sp ON sp.id = se.student_id
          INNER JOIN users u ON u.id = sp.user_id
          LEFT JOIN institution_profiles ip ON ip.id = se.institution_id
          LEFT JOIN institution_programs prog ON prog.id = se.program_id
          LEFT JOIN categories cc ON cc.id = se.class_category_id
          LEFT JOIN sections sec ON sec.id = se.section_id
          WHERE ${where.join(" AND ")}
          ORDER BY sp.id, u.full_name ASC
          LIMIT 500
        `;

        const res = await db.query(query, params);
        const recipients = res.rows.map((row) => ({
          id: row.id,
          enrollmentId: row.enrollment_id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          identifier: row.admission_number || row.roll_number || `STU-${row.id}`,
          subtext: `${row.class_name}${row.section_name ? ` (${row.section_name})` : ""}`,
          avatarUrl: row.avatar_url,
          institutionName: row.institution_name,
        }));

        return NextResponse.json({ count: recipients.length, recipients });
      } else {
        // Staff preview
        let where = [
          "COALESCE(u.is_deleted, FALSE) = FALSE",
          "u.is_active = TRUE",
          "(r.code IS NULL OR r.code NOT IN ('student', 'guardian', 'parent'))",
        ];
        const params: any[] = [];

        if (instIdNum) {
          params.push(instIdNum);
          where.push(`im.institution_id = $${params.length}`);
        }

        if (scopeType === "role" && roleCode) {
          params.push(roleCode);
          where.push(`r.code = $${params.length}`);
        }

        const query = `
          SELECT DISTINCT ON (u.id)
            u.id,
            u.full_name AS name,
            u.email,
            u.phone,
            u.avatar_url,
            COALESCE(desig.name, initcap(replace(r.code, '_', ' ')), 'Staff') AS role_name,
            r.code AS role_code,
            ip.name AS institution_name
          FROM users u
          LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
          LEFT JOIN roles r ON r.id = im.role_id
          LEFT JOIN user_profiles up ON up.user_id = u.id
          LEFT JOIN designations desig ON desig.id = up.designation_id
          LEFT JOIN institution_profiles ip ON ip.id = im.institution_id
          WHERE ${where.join(" AND ")}
          ORDER BY u.id, u.full_name ASC
          LIMIT 500
        `;

        const res = await db.query(query, params);
        const recipients = res.rows.map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          identifier: `EMP-${row.id}`,
          subtext: row.role_name,
          avatarUrl: row.avatar_url,
          institutionName: row.institution_name,
        }));

        return NextResponse.json({ count: recipients.length, recipients });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION 2: EXECUTE BULK GENERATION
    // ─────────────────────────────────────────────────────────────
    if (action === "generate") {
      if (!templateId) return NextResponse.json({ error: "templateId is required" }, { status: 400 });
      if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
        return NextResponse.json({ error: "recipientIds list is required" }, { status: 400 });
      }

      // 1. Fetch Template
      const templateRes = await db.query(
        `SELECT dt.*, cc.target_audience AS category_target_audience, cc.name AS category_name
         FROM document_templates dt
         LEFT JOIN card_categories cc ON cc.id = dt.card_category_id
         WHERE dt.id = $1 AND COALESCE(dt.is_deleted, FALSE) = FALSE`,
        [Number(templateId)]
      );
      const template = templateRes.rows[0];
      if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

      // 2. Fetch Template Fields
      const fieldsRes = await db.query(
        `SELECT field_name, label, field_type, default_value FROM document_template_fields WHERE template_id = $1`,
        [Number(templateId)]
      );
      const fields = fieldsRes.rows;

      // 3. Fetch Institution Defaults
      let instDefaults: Record<string, string> = {};
      if (instIdNum) {
        const defRes = await db.query(
          `SELECT field_values FROM institution_template_defaults WHERE institution_id = $1 AND template_id = $2`,
          [instIdNum, Number(templateId)]
        );
        instDefaults = (defRes.rows[0]?.field_values as Record<string, string>) || {};
      }

      const generatedDocs: any[] = [];

      if (audience === "student") {
        // Bulk generate student documents
        const studentsRes = await db.query(
          `
            SELECT DISTINCT ON (sp.id)
              sp.id AS student_id,
              sp.admission_number,
              sp.apar_id,
              sp.date_of_birth,
              sp.blood_group,
              se.id AS enrollment_id,
              se.institution_id,
              se.roll_number,
              se.admission_date,
              se.academic_year_id,
              u.id AS user_id,
              u.full_name AS student_name,
              u.email AS student_email,
              u.phone AS student_phone,
              u.avatar_url AS student_photo,
              up.gender,
              up.about,
              ul.full_address,
              COALESCE(prog.title, cc.name, 'Class') AS class_name,
              sec.name AS section_name,
              ip.name AS institution_name,
              ip.phone AS institution_phone,
              ip.email AS institution_email,
              ip.website AS institution_website,
              ip.about AS institution_about,
              (SELECT (array_agg(url ORDER BY (media_type = 'logo') DESC, sort_order ASC, id ASC))[1] FROM institution_media WHERE institution_id = se.institution_id AND media_type IN ('image', 'logo')) AS logo_url
            FROM student_profiles sp
            INNER JOIN users u ON u.id = sp.user_id
            INNER JOIN student_enrollments se ON se.student_id = sp.id AND se.status = 'active' AND COALESCE(se.is_deleted, FALSE) = FALSE
            LEFT JOIN user_profiles up ON up.user_id = u.id
            LEFT JOIN user_locations ul ON ul.user_id = u.id
            LEFT JOIN institution_profiles ip ON ip.id = se.institution_id
            LEFT JOIN institution_programs prog ON prog.id = se.program_id
            LEFT JOIN categories cc ON cc.id = se.class_category_id
            LEFT JOIN sections sec ON sec.id = se.section_id
            WHERE sp.id = ANY($1::int[])
          `,
          [recipientIds.map((id: any) => Number(id))]
        );

        for (const student of studentsRes.rows) {
          const values: Record<string, string> = {
            ...instDefaults,
            ...customFields,
            // Auto mapped student tokens
            studentName: student.student_name || "",
            fullName: student.student_name || "",
            name: student.student_name || "",
            admissionNumber: student.admission_number || "",
            rollNumber: student.roll_number || "",
            studentId: student.admission_number || String(student.student_id),
            className: student.class_name || "",
            programName: student.class_name || "",
            section: student.section_name || "",
            sectionName: student.section_name || "",
            dob: student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString("en-IN") : "",
            dateOfBirth: student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString("en-IN") : "",
            bloodGroup: student.blood_group || "",
            gender: student.gender || "",
            email: student.student_email || "",
            phone: student.student_phone || "",
            mobile: student.student_phone || "",
            address: student.full_address || "",
            photo: student.student_photo || "",
            avatarUrl: student.student_photo || "",
            institutionName: student.institution_name || "",
            instituteName: student.institution_name || "",
            institutionPhone: student.institution_phone || "",
            institutionEmail: student.institution_email || "",
            institutionWebsite: student.institution_website || "",
            institutionLogo: student.logo_url || "",
            logoUrl: student.logo_url || "",
            issueDate: new Date().toLocaleDateString("en-IN"),
            date: new Date().toLocaleDateString("en-IN"),
          };

          // Fill any missing field defaults
          fields.forEach((f) => {
            if (!values[f.field_name] && f.default_value) {
              values[f.field_name] = f.default_value;
            }
          });

          const renderedHtml = renderTemplate(template.html_template || "", values);
          const docTitle = `${template.name} - ${student.student_name} (${student.admission_number || student.roll_number || student.student_id})`;

          const insertRes = await db.query(
            `
              INSERT INTO institution_generated_documents (
                institution_id, template_id, card_category_id, reference_type, reference_id,
                enrollment_id, academic_year_id, title, rendered_html, field_values,
                generated_by, created_at
              )
              VALUES ($1, $2, $3, 'student', $4, $5, $6, $7, $8, $9, $10, NOW())
              RETURNING id, title, created_at
            `,
            [
              student.institution_id || instIdNum,
              Number(templateId),
              template.card_category_id,
              student.student_id,
              student.enrollment_id,
              student.academic_year_id,
              docTitle,
              renderedHtml,
              JSON.stringify(values),
              currentUser.id,
            ]
          );

          if (insertRes.rows[0]) {
            generatedDocs.push(insertRes.rows[0]);
          }
        }
      } else {
        // Bulk generate staff documents
        const staffRes = await db.query(
          `
            SELECT DISTINCT ON (u.id)
              u.id AS staff_user_id,
              u.full_name AS staff_name,
              u.email AS staff_email,
              u.phone AS staff_phone,
              u.avatar_url AS staff_photo,
              im.institution_id,
              im.join_date,
              up.gender,
              up.about,
              ul.full_address,
              COALESCE(desig.name, initcap(replace(r.code, '_', ' ')), 'Staff') AS designation_name,
              r.code AS role_code,
              ip.name AS institution_name,
              ip.phone AS institution_phone,
              ip.email AS institution_email,
              ip.website AS institution_website,
              ip.about AS institution_about,
              (SELECT (array_agg(url ORDER BY (media_type = 'logo') DESC, sort_order ASC, id ASC))[1] FROM institution_media WHERE institution_id = im.institution_id AND media_type IN ('image', 'logo')) AS logo_url
            FROM users u
            LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
            LEFT JOIN roles r ON r.id = im.role_id
            LEFT JOIN user_profiles up ON up.user_id = u.id
            LEFT JOIN designations desig ON desig.id = up.designation_id
            LEFT JOIN user_locations ul ON ul.user_id = u.id
            LEFT JOIN institution_profiles ip ON ip.id = im.institution_id
            WHERE u.id = ANY($1::int[])
          `,
          [recipientIds.map((id: any) => Number(id))]
        );

        for (const staff of staffRes.rows) {
          const values: Record<string, string> = {
            ...instDefaults,
            ...customFields,
            staffName: staff.staff_name || "",
            fullName: staff.staff_name || "",
            name: staff.staff_name || "",
            designation: staff.designation_name || "",
            role: staff.designation_name || "",
            employeeCode: `EMP-${staff.staff_user_id}`,
            employeeId: `EMP-${staff.staff_user_id}`,
            email: staff.staff_email || "",
            phone: staff.staff_phone || "",
            mobile: staff.staff_phone || "",
            joinDate: staff.join_date ? new Date(staff.join_date).toLocaleDateString("en-IN") : "",
            address: staff.full_address || "",
            photo: staff.staff_photo || "",
            avatarUrl: staff.staff_photo || "",
            institutionName: staff.institution_name || "",
            instituteName: staff.institution_name || "",
            institutionPhone: staff.institution_phone || "",
            institutionEmail: staff.institution_email || "",
            institutionWebsite: staff.institution_website || "",
            institutionLogo: staff.logo_url || "",
            logoUrl: staff.logo_url || "",
            issueDate: new Date().toLocaleDateString("en-IN"),
            date: new Date().toLocaleDateString("en-IN"),
          };

          fields.forEach((f) => {
            if (!values[f.field_name] && f.default_value) {
              values[f.field_name] = f.default_value;
            }
          });

          const renderedHtml = renderTemplate(template.html_template || "", values);
          const docTitle = `${template.name} - ${staff.staff_name}`;

          const insertRes = await db.query(
            `
              INSERT INTO staff_generated_letters (
                institution_id, staff_user_id, template_id, card_category_id,
                title, letter_type, rendered_html, field_values,
                generated_by, created_at
              )
              VALUES ($1, $2, $3, $4, $5, 'staff_letter', $6, $7, $8, NOW())
              RETURNING id, title, created_at
            `,
            [
              staff.institution_id || instIdNum,
              staff.staff_user_id,
              Number(templateId),
              template.card_category_id,
              docTitle,
              renderedHtml,
              JSON.stringify(values),
              currentUser.id,
            ]
          );

          if (insertRes.rows[0]) {
            generatedDocs.push(insertRes.rows[0]);
          }
        }
      }

      return NextResponse.json({
        success: true,
        count: generatedDocs.length,
        documents: generatedDocs,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Error in bulk generate:", err);
    return NextResponse.json({ error: err.message || "Bulk generation failed" }, { status: 500 });
  }
}
