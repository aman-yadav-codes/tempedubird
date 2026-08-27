import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const url = new URL(req.url);
    const category = url.searchParams.get("category")?.trim();

    let query = `SELECT * FROM email_templates WHERE 1=1`;
    const params: string[] = [];

    if (category && category !== "all") {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    query += ` ORDER BY id DESC`;

    const res = await db.query(query, params);

    let templates = res.rows;
    if (!templates.length) {
      // Seed initial default templates
      await db.query(`
        INSERT INTO email_templates (title, subject, category, body_html, variables, is_system)
        VALUES 
          (
            'Welcome & Admission Confirmation',
            'Welcome to {{institution_name}} - Your Admission is Confirmed!',
            'admission',
            '<h2>Dear {{student_name}},</h2><p>Congratulations! Your admission in <strong>{{course_title}}</strong> at <strong>{{institution_name}}</strong> has been successfully confirmed.</p><p><strong>Your Admission Number:</strong> {{admission_number}}</p><p>You can now access your classroom materials and schedule on your student portal.</p><p><a href="{{login_url}}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">Access Student Portal</a></p><p>Warm regards,<br><strong>{{institution_name}} Admission Team</strong></p>',
            '["student_name", "institution_name", "course_title", "admission_number", "login_url"]'::jsonb,
            true
          ),
          (
            'Fee Payment Receipt & Reminder',
            'Payment Receipt & Fee Confirmation for {{course_title}}',
            'fees',
            '<h2>Dear {{student_name}} / Parent,</h2><p>Thank you for submitting the academic tuition fee of <strong>{{fee_amount}}</strong> for <strong>{{course_title}}</strong>.</p><p>Your payment transaction has been verified and recorded.</p><p>Date: {{date}}</p><p>Regards,<br><strong>Accounts & Finance Office</strong></p>',
            '["student_name", "course_title", "fee_amount", "date"]'::jsonb,
            true
          ),
          (
            'Exam Result Announcement',
            'Exam Results Published for {{course_title}}',
            'exams',
            '<h2>Hello {{student_name}},</h2><p>The academic results and report cards for <strong>{{course_title}}</strong> have been published.</p><p>Please log in to your dashboard to review your marks, grades, and teacher feedback.</p><p><a href="{{login_url}}" style="display:inline-block;padding:10px 20px;background:#059669;color:#fff;text-decoration:none;border-radius:6px;">View Report Card</a></p><p>Best of luck!<br><strong>Examination Board</strong></p>',
            '["student_name", "course_title", "login_url"]'::jsonb,
            true
          )
      `);
      const re = await db.query(`SELECT * FROM email_templates ORDER BY id DESC`);
      templates = re.rows;
    }

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error("[Email Templates GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch email templates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const { title, subject, category = "general", body_html, body_json, variables } = body;

    if (!title || !subject || !body_html) {
      return NextResponse.json({ error: "Title, subject, and HTML content are required" }, { status: 400 });
    }

    const res = await db.query(
      `
      INSERT INTO email_templates (
        title, subject, category, body_html, body_json, variables, created_by, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
      `,
      [
        title.trim(),
        subject.trim(),
        category,
        body_html,
        JSON.stringify(body_json || {}),
        JSON.stringify(variables || []),
        user.id,
      ]
    );

    return NextResponse.json({ template: res.rows[0], message: "Template saved successfully" });
  } catch (error: any) {
    console.error("[Email Templates POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to save template" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const { id, title, subject, category, body_html, body_json, variables } = body;

    if (!id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    const res = await db.query(
      `
      UPDATE email_templates
      SET title = COALESCE($1, title),
          subject = COALESCE($2, subject),
          category = COALESCE($3, category),
          body_html = COALESCE($4, body_html),
          body_json = COALESCE($5, body_json),
          variables = COALESCE($6, variables),
          updated_at = NOW()
      WHERE id = $7
      RETURNING *
      `,
      [
        title,
        subject,
        category,
        body_html,
        body_json ? JSON.stringify(body_json) : undefined,
        variables ? JSON.stringify(variables) : undefined,
        id,
      ]
    );

    return NextResponse.json({ template: res.rows[0], message: "Template updated successfully" });
  } catch (error: any) {
    console.error("[Email Templates PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM email_templates WHERE id = $1`, [id]);
    return NextResponse.json({ message: "Template deleted successfully" });
  } catch (error: any) {
    console.error("[Email Templates DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete template" }, { status: 500 });
  }
}
