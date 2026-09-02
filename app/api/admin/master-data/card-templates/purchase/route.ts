import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";

async function ensurePricingSchema() {
  await db.query(`
    ALTER TABLE document_templates
      ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR';

    ALTER TABLE institution_templates
      ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS price_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'completed',
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
  `);
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensurePricingSchema();
    const body = await req.json();
    const institutionId = Number(body.institution_id);
    const templateId = Number(body.template_id);
    const paymentMethod = String(body.payment_method || "mock_upi").trim();

    if (!Number.isInteger(institutionId) || institutionId <= 0) {
      return NextResponse.json({ error: "Institution is required" }, { status: 400 });
    }
    if (!Number.isInteger(templateId) || templateId <= 0) {
      return NextResponse.json({ error: "Template is required" }, { status: 400 });
    }

    assertCanAccessInstitution(currentUser, institutionId);
    if (!hasPermission(currentUser, "content.card_templates.create", { institutionId })) {
      return NextResponse.json(
        { error: "You do not have permission to purchase templates for this institution" },
        { status: 403 }
      );
    }

    const templateResult = await db.query<{
      id: number;
      name: string;
      is_paid: boolean;
      price: number;
      currency: string;
    }>(
      `
        SELECT
          id,
          name,
          COALESCE(is_paid, FALSE) AS is_paid,
          COALESCE(price, 0)::float AS price,
          COALESCE(currency, 'INR') AS currency
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

    const template = templateResult.rows[0];
    const pricePaid = template.is_paid ? template.price : 0;
    const paymentId = body.payment_id
      ? String(body.payment_id).trim()
      : `pay_tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await db.query(
      `
        INSERT INTO institution_templates
          (institution_id, template_id, is_active, is_paid, price_paid, payment_id, payment_status, payment_method, assigned_by, assigned_at)
        VALUES ($1, $2, TRUE, $3, $4, $5, 'completed', $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (institution_id, template_id)
        DO UPDATE SET
          is_active = TRUE,
          is_paid = $3,
          price_paid = $4,
          payment_id = $5,
          payment_status = 'completed',
          payment_method = $6,
          assigned_by = EXCLUDED.assigned_by,
          assigned_at = CURRENT_TIMESTAMP
      `,
      [
        institutionId,
        templateId,
        template.is_paid,
        pricePaid,
        paymentId,
        paymentMethod,
        currentUser.id,
      ]
    );

    return NextResponse.json({
      success: true,
      data: {
        template_id: templateId,
        template_name: template.name,
        price_paid: pricePaid,
        currency: template.currency,
        payment_id: paymentId,
        message: template.is_paid
          ? `Payment of ₹${pricePaid} successful! Template unlocked.`
          : "Template successfully added to your institution.",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment processing failed";
    const status =
      message === "Forbidden: Admin access required" ? 403 :
      message === "Unauthorized" || message === "User not found" ? 401 :
      400;
    return NextResponse.json({ error: message }, { status });
  }
}
