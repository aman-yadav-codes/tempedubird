import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { slugify } from "@/lib/utils/slug";
import { notifyInstitutionModuleUpdated } from "@/lib/notifications/admin-events";

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json();
    const { institutionId, courses } = body;

    if (!institutionId || !Number(institutionId)) {
      return NextResponse.json({ error: "Institution ID is required" }, { status: 400 });
    }

    if (!Array.isArray(courses) || courses.length === 0) {
      return NextResponse.json({ error: "Please select at least one course/program to add" }, { status: 400 });
    }

    assertCanAccessInstitution(currentUser, Number(institutionId));

    // Get default program type
    const pTypeRes = await db.query(`SELECT id FROM program_types WHERE is_active = TRUE AND is_deleted = FALSE ORDER BY id ASC LIMIT 1`);
    const defaultProgramTypeId = pTypeRes.rows[0]?.id || 1;

    // Get or create a default section for batches
    let defaultSectionId: number | null = null;
    const secRes = await db.query(`SELECT id FROM sections WHERE is_active = TRUE AND is_deleted = FALSE ORDER BY id ASC LIMIT 1`);
    if (secRes.rows.length > 0) {
      defaultSectionId = secRes.rows[0].id;
    } else {
      const newSec = await db.query(`INSERT INTO sections (name, slug, is_active) VALUES ('Batch A', 'batch-a', TRUE) RETURNING id`);
      defaultSectionId = newSec.rows[0].id;
    }

    const createdPrograms: any[] = [];
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      for (const course of courses) {
        const title = (course.title || course.name || "").trim();
        if (!title) continue;

        // Check if already exists for this institution
        const existing = await client.query(
          `SELECT id, title FROM institution_programs WHERE institution_id = $1 AND LOWER(title) = LOWER($2) AND COALESCE(is_deleted, FALSE) = FALSE`,
          [Number(institutionId), title]
        );

        if (existing.rows.length > 0) {
          createdPrograms.push(existing.rows[0]);
          continue;
        }

        const baseSlug = slugify(title);
        const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

        // Determine program type
        let programTypeId = defaultProgramTypeId;
        if (course.program_type_name) {
          const matchingType = await client.query(
            `SELECT id FROM program_types WHERE name ILIKE $1 AND is_deleted = FALSE LIMIT 1`,
            [course.program_type_name]
          );
          if (matchingType.rows.length > 0) {
            programTypeId = matchingType.rows[0].id;
          }
        }

        // Insert into institution_programs
        const progRes = await client.query(
          `
          INSERT INTO institution_programs (
            institution_id,
            program_type_id,
            title,
            slug,
            about,
            duration_value,
            duration_unit,
            seats_available,
            is_active,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW(), NOW())
          RETURNING *
          `,
          [
            Number(institutionId),
            programTypeId,
            title,
            uniqueSlug,
            course.description || `Comprehensive academic program for ${title}`,
            course.duration_value ? Number(course.duration_value) : 12,
            course.duration_unit || "months",
            course.seats_available ? Number(course.seats_available) : 60,
          ]
        );

        const newProgram = progRes.rows[0];

        // Link or find Category
        if (course.category_name) {
          let categoryId: number | null = null;
          const catRes = await client.query(
            `SELECT id FROM categories WHERE name ILIKE $1 AND is_deleted = FALSE LIMIT 1`,
            [course.category_name]
          );
          if (catRes.rows.length > 0) {
            categoryId = catRes.rows[0].id;
          } else {
            const newCat = await client.query(
              `INSERT INTO categories (name, slug, is_active) VALUES ($1, $2, TRUE) RETURNING id`,
              [course.category_name, slugify(course.category_name)]
            );
            categoryId = newCat.rows[0].id;
          }

          if (categoryId) {
            await client.query(
              `INSERT INTO program_categories (program_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [newProgram.id, categoryId]
            );
          }
        }

        // Link subjects
        const subjectList: string[] = Array.isArray(course.subjects)
          ? course.subjects.map((s: any) => (typeof s === "string" ? s : s.name)).filter(Boolean)
          : [];

        for (const subName of subjectList) {
          let subjectId: number | null = null;
          const subRes = await client.query(
            `SELECT id FROM subjects WHERE name ILIKE $1 AND is_deleted = FALSE LIMIT 1`,
            [subName.trim()]
          );
          if (subRes.rows.length > 0) {
            subjectId = subRes.rows[0].id;
          } else {
            const newSub = await client.query(
              `INSERT INTO subjects (name, code, is_active) VALUES ($1, $2, TRUE) RETURNING id`,
              [subName.trim(), slugify(subName.trim()).toUpperCase().slice(0, 10)]
            );
            subjectId = newSub.rows[0].id;
          }

          if (subjectId) {
            await client.query(
              `INSERT INTO program_subjects (program_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [newProgram.id, subjectId]
            );
          }
        }

        // Create default batch / section link
        if (defaultSectionId) {
          await client.query(
            `INSERT INTO program_sections (program_id, section_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [newProgram.id, defaultSectionId]
          );
        }

        // Create a starter standard fee component
        await client.query(
          `
          INSERT INTO program_fee_components (
            program_id,
            title,
            amount,
            fee_unit,
            payment_mode,
            sort_order
          ) VALUES ($1, 'Course Tuition Fee', 25000, 'term', 'installment', 10)
          `,
          [newProgram.id]
        );

        createdPrograms.push(newProgram);
      }

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    if (createdPrograms.length > 0) {
      await notifyInstitutionModuleUpdated(db, {
        actor: currentUser,
        institutionId: Number(institutionId),
        moduleName: "Programs",
        entityType: "program",
        entityId: createdPrograms[0]?.id || null,
      });
    }

    return NextResponse.json({
      message: `Successfully added ${createdPrograms.length} course(s) / program(s) to your institution`,
      count: createdPrograms.length,
      data: createdPrograms,
    });
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") || error.message?.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: error.message || "Failed to add selected programs" }, { status });
  }
}
