import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";

async function ensureGeneratedDocumentsTables() {
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

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureGeneratedDocumentsTables();

    const url = new URL(req.url);
    const audience = url.searchParams.get("audience"); // "staff" | "student" | null
    const categoryId = url.searchParams.get("categoryId");
    const search = url.searchParams.get("search")?.trim() || "";
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const institutionId = url.searchParams.get("institutionId");

    const documents: any[] = [];

    // 1. Fetch Staff Generated Letters (if audience is staff or all)
    if (!audience || audience === "staff") {
      let staffWhere = ["COALESCE(sgl.is_deleted, FALSE) = FALSE"];
      const staffParams: any[] = [];

      if (!isPlatformAdmin && institutionId) {
        staffParams.push(Number(institutionId));
        staffWhere.push(`sgl.institution_id = $${staffParams.length}`);
      } else if (isPlatformAdmin) {
        // Platform admin sees all platform staff documents & generated letters
        staffWhere.push(`(
          sgl.institution_id IS NULL
          OR sgl.generated_by = ${currentUser.id}
          OR sgl.generated_by = 1
          OR u.under_institution_id IS NULL
          OR u.created_by = ${currentUser.id}
          OR u.created_by = 1
        )`);
      }

      if (categoryId && categoryId !== "all") {
        staffParams.push(Number(categoryId));
        staffWhere.push(`sgl.card_category_id = $${staffParams.length}`);
      }

      if (search) {
        staffParams.push(`%${search}%`);
        staffWhere.push(`(
          sgl.title ILIKE $${staffParams.length}
          OR u.full_name ILIKE $${staffParams.length}
          OR u.email ILIKE $${staffParams.length}
          OR COALESCE(u.phone, '') ILIKE $${staffParams.length}
          OR COALESCE(cc.name, '') ILIKE $${staffParams.length}
        )`);
      }

      const staffRes = await db.query(
        `
        SELECT
          sgl.id,
          'staff' AS target_audience,
          sgl.card_category_id,
          COALESCE(cc.name, 'Staff Document') AS category_name,
          sgl.template_id,
          dt.name AS template_name,
          sgl.title,
          sgl.staff_user_id AS recipient_id,
          u.full_name AS recipient_name,
          u.email AS recipient_email,
          u.phone AS recipient_phone,
          u.avatar_url AS recipient_avatar,
          COALESCE(
            (SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id LIMIT 1),
            'Staff'
          ) AS recipient_role,
          sgl.rendered_html,
          sgl.image_url,
          sgl.pdf_url,
          sgl.canvas_width,
          sgl.canvas_height,
          sgl.field_values,
          sgl.created_at,
          gen.full_name AS generated_by_name
        FROM staff_generated_letters sgl
        LEFT JOIN card_categories cc ON cc.id = sgl.card_category_id
        LEFT JOIN document_templates dt ON dt.id = sgl.template_id
        LEFT JOIN users u ON u.id = sgl.staff_user_id
        LEFT JOIN users gen ON gen.id = sgl.generated_by
        WHERE ${staffWhere.join(" AND ")}
        ORDER BY sgl.created_at DESC
        LIMIT 100
        `,
        staffParams
      );

      documents.push(...staffRes.rows);
    }

    // 2. Fetch Student Generated Documents (if audience is student or all and not platform admin)
    if ((!audience || audience === "student") && !isPlatformAdmin) {
      let studentWhere = ["COALESCE(igd.is_deleted, FALSE) = FALSE"];
      const studentParams: any[] = [];

      if (institutionId) {
        studentParams.push(Number(institutionId));
        studentWhere.push(`igd.institution_id = $${studentParams.length}`);
      }

      if (categoryId && categoryId !== "all") {
        studentParams.push(Number(categoryId));
        studentWhere.push(`igd.card_category_id = $${studentParams.length}`);
      }

      if (search) {
        studentParams.push(`%${search}%`);
        studentWhere.push(`(
          igd.title ILIKE $${studentParams.length}
          OR u.full_name ILIKE $${studentParams.length}
          OR u.email ILIKE $${studentParams.length}
          OR COALESCE(cc.name, '') ILIKE $${studentParams.length}
        )`);
      }

      const studentRes = await db.query(
        `
        SELECT
          igd.id,
          'student' AS target_audience,
          igd.card_category_id,
          COALESCE(cc.name, 'Student Document') AS category_name,
          igd.template_id,
          dt.name AS template_name,
          COALESCE(igd.title, dt.name, 'Student ID Card') AS title,
          igd.reference_id AS recipient_id,
          COALESCE(u.full_name, 'Student') AS recipient_name,
          u.email AS recipient_email,
          u.phone AS recipient_phone,
          u.avatar_url AS recipient_avatar,
          'Student' AS recipient_role,
          igd.rendered_html,
          igd.image_url,
          igd.pdf_url,
          igd.canvas_width,
          igd.canvas_height,
          igd.field_values,
          igd.created_at,
          gen.full_name AS generated_by_name
        FROM institution_generated_documents igd
        LEFT JOIN card_categories cc ON cc.id = igd.card_category_id
        LEFT JOIN document_templates dt ON dt.id = igd.template_id
        LEFT JOIN student_profiles sp ON sp.id = igd.reference_id
        LEFT JOIN users u ON u.id = sp.user_id
        LEFT JOIN users gen ON gen.id = igd.generated_by
        WHERE ${studentWhere.join(" AND ")}
        ORDER BY igd.created_at DESC
        LIMIT 100
        `,
        studentParams
      );

      documents.push(...studentRes.rows);
    }

    // Sort all by created_at DESC
    documents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ data: documents, total: documents.length });
  } catch (err: any) {
    console.error("Error fetching generated documents:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch generated documents" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    const audience = url.searchParams.get("audience") || "staff";

    if (!id) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    if (audience === "staff") {
      await db.query(
        `UPDATE staff_generated_letters
         SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
         WHERE id = $2`,
        [currentUser.id, id]
      );
    } else {
      await db.query(
        `UPDATE institution_generated_documents
         SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
         WHERE id = $2`,
        [currentUser.id, id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete document" }, { status: 500 });
  }
}
