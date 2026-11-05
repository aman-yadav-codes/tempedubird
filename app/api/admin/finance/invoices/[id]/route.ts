import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission, isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  deleteFinanceInvoice,
  type FinanceScope,
} from "@/lib/queries/finance";

type CurrentUser = Awaited<ReturnType<typeof getAuthenticatedUser>>;

function jsonError(error: unknown, status = 400) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Something went wrong" },
    { status }
  );
}

function userInstitutionIds(user: CurrentUser) {
  return new Set(
    (user.memberships ?? [])
      .filter((membership) => membership.role_code === "institution_admin")
      .map((membership) => Number(membership.institution_id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
}

function resolveScope(user: CurrentUser, institutionId: number | null): { scope: FinanceScope; institutionId: number | null } {
  if (isPlatformAdminUser(user) || hasPermission(user, "finance.income.view") || hasPermission(user, "finance.platform.income.view")) {
    return { scope: "platform", institutionId: null };
  }

  if (!isInstitutionAdminUser(user)) {
    throw new Error("Forbidden: Admin access required");
  }

  const institutionIds = userInstitutionIds(user);
  if (institutionId && !institutionIds.has(institutionId)) {
    throw new Error("Forbidden: You do not have access to this institution");
  }

  const effectiveInstitutionId = institutionId ?? Array.from(institutionIds)[0] ?? null;
  if (!effectiveInstitutionId) {
    throw new Error("No active institution found for this admin user");
  }

  return { scope: "institution", institutionId: effectiveInstitutionId };
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const institutionIdRaw = Number(url.searchParams.get("institutionId"));
    const requestedInstitutionId = Number.isInteger(institutionIdRaw) && institutionIdRaw > 0
      ? institutionIdRaw
      : null;
    const { scope, institutionId } = resolveScope(user, requestedInstitutionId);

    await deleteFinanceInvoice(db, id, scope, institutionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("Forbidden") ? 403 : 400);
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    await getAuthenticatedUser(req);
    const body = await req.json();
    const { status } = body;
    if (!status) return jsonError("status is required");

    const invRes = await db.query<{ id: number; invoice_number: string; source_type: string }>(
      `SELECT id, invoice_number, source_type FROM finance_invoices WHERE id = $1`,
      [id]
    );
    if (invRes.rows.length === 0) return jsonError("Invoice not found", 404);

    const inv = invRes.rows[0];
    await db.query(`UPDATE finance_invoices SET status = $1, updated_at = NOW() WHERE id = $2`, [status, id]);

    if (inv.source_type === "work") {
      await db.query(
        `UPDATE operations_tasks
         SET invoices = (
           SELECT COALESCE(jsonb_agg(
             CASE 
               WHEN elem->>'invoice_number' = $1 THEN jsonb_set(elem, '{status}', to_jsonb($2::text))
               ELSE elem
             END
           ), '[]'::jsonb)
           FROM jsonb_array_elements(COALESCE(invoices, '[]'::jsonb)) elem
         ),
         updated_at = NOW()
         WHERE invoices IS NOT NULL AND invoices::text LIKE $3`,
        [inv.invoice_number, status, `%${inv.invoice_number}%`]
      );
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("Forbidden") ? 403 : 400);
  }
}
