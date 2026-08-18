import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json();
    const institutionId = Number(body.institution_id);
    const templateId = Number(body.template_id);

    if (!Number.isInteger(institutionId) || institutionId <= 0) {
      return NextResponse.json({ error: "Institution is required" }, { status: 400 });
    }
    if (!Number.isInteger(templateId) || templateId <= 0) {
      return NextResponse.json({ error: "Template is required" }, { status: 400 });
    }

    assertCanAccessInstitution(currentUser, institutionId);
    if (!hasPermission(currentUser, "content.card_templates.create", { institutionId })) {
      return NextResponse.json(
        { error: "You do not have permission to add templates to this institution" },
        { status: 403 }
      );
    }

    const templateResult = await db.query(
      `
        SELECT id
        FROM document_templates
        WHERE id = $1
          AND is_public = TRUE
          AND is_active = TRUE
          AND COALESCE(is_deleted, FALSE) = FALSE
        LIMIT 1
      `,
      [templateId]
    );
    if (!templateResult.rowCount) {
      return NextResponse.json(
        { error: "This template is not available in the marketplace" },
        { status: 404 }
      );
    }

    const existing = await db.query<{ is_active: boolean }>(
      `
        SELECT is_active
        FROM institution_templates
        WHERE institution_id = $1 AND template_id = $2
        LIMIT 1
      `,
      [institutionId, templateId]
    );
    if (existing.rows[0]?.is_active) {
      return NextResponse.json(
        { error: "This template is already added to the selected institution" },
        { status: 409 }
      );
    }

    await db.query(
      `
        INSERT INTO institution_templates
          (institution_id, template_id, is_active, assigned_by, assigned_at)
        VALUES ($1, $2, TRUE, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (institution_id, template_id)
        DO UPDATE SET
          is_active = TRUE,
          assigned_by = EXCLUDED.assigned_by,
          assigned_at = CURRENT_TIMESTAMP
      `,
      [institutionId, templateId, currentUser.id]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to assign template";
    const status =
      message === "Forbidden: Admin access required" ? 403 :
      message === "Unauthorized" || message === "User not found" ? 401 :
      400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json();
    const institutionId = Number(body.institution_id);
    const templateId = Number(body.template_id);

    if (!Number.isInteger(institutionId) || institutionId <= 0) {
      return NextResponse.json({ error: "Institution is required" }, { status: 400 });
    }
    if (!Number.isInteger(templateId) || templateId <= 0) {
      return NextResponse.json({ error: "Template is required" }, { status: 400 });
    }

    assertCanAccessInstitution(currentUser, institutionId);
    if (!hasPermission(currentUser, "content.card_templates.delete", { institutionId })) {
      return NextResponse.json(
        { error: "You do not have permission to remove templates from this institution" },
        { status: 403 }
      );
    }

    const result = await db.query(
      `
        UPDATE institution_templates
        SET is_active = FALSE
        WHERE institution_id = $1
          AND template_id = $2
          AND is_active = TRUE
        RETURNING id
      `,
      [institutionId, templateId]
    );
    if (!result.rowCount) {
      return NextResponse.json(
        { error: "This template is not assigned to the selected institution" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove template";
    const status =
      message === "Forbidden: Admin access required" ? 403 :
      message === "Unauthorized" || message === "User not found" ? 401 :
      400;
    return NextResponse.json({ error: message }, { status });
  }
}
