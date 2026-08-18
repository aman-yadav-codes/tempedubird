import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import {
  bulkUpdateSalesContacts,
  createSalesContact,
  listSalesContacts,
  parseContactInput,
  softDeleteSalesContacts,
} from "@/lib/queries/sales";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    400;
  return NextResponse.json({ error: message }, { status });
}

function parseIds(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0)))
    : [];
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const { page, limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
    const search = url.searchParams.get("search")?.trim() ?? "";
    const salesStage = url.searchParams.get("salesStage")?.trim() ?? "";
    const { data, total } = await listSalesContacts(db, { search, salesStage, limit, offset });

    return NextResponse.json({
      data,
      total,
      page,
      pageCount: getPageCount(total, limit),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json();
    const contact = await createSalesContact(db, parseContactInput(body), currentUser.id);
    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json();
    const ids = parseIds(body.ids);
    if (!ids.length) return NextResponse.json({ error: "Select at least one contact" }, { status: 400 });
    const updated = await bulkUpdateSalesContacts(
      db,
      ids,
      {
        sales_stage: typeof body.sales_stage === "string" && body.sales_stage ? body.sales_stage : undefined,
        pipeline_stage: typeof body.sales_stage === "string" && body.sales_stage
          ? body.sales_stage
          : typeof body.pipeline_stage === "string" && body.pipeline_stage
            ? body.pipeline_stage
            : undefined,
        assigned_to: Number.isInteger(Number(body.assigned_to)) && Number(body.assigned_to) > 0 ? Number(body.assigned_to) : undefined,
        assigned_package_id: Number.isInteger(Number(body.assigned_package_id)) && Number(body.assigned_package_id) > 0 ? Number(body.assigned_package_id) : undefined,
      },
      currentUser.id
    );
    return NextResponse.json({ updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const ids = parseIds(body.ids);
    if (!ids.length) return NextResponse.json({ error: "Select at least one contact" }, { status: 400 });
    const deleted = await softDeleteSalesContacts(db, ids, currentUser.id);
    return NextResponse.json({ deleted });
  } catch (error) {
    return errorResponse(error);
  }
}
