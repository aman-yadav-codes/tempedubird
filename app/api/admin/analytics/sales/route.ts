import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import {
  bulkUpdateSalesContacts,
  createSalesContact,
  createSalesPackage,
  getSalesContactDetail,
  listSalesContacts,
  listSalesPackages,
  parseContactInput,
  parsePackageInput,
  parseStageUpdateInput,
  softDeleteSalesContacts,
  softDeleteSalesPackages,
  updateSalesContact,
  updateSalesContactStage,
  updateSalesPackage,
} from "@/lib/queries/sales";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    message.includes("not found") ? 404 :
    400;
  return NextResponse.json({ error: message }, { status });
}

function parseIds(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0)))
    : [];
}

function parseId(value: string | null, resource: string) {
  if (!value) return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`Invalid sales ${resource} id`);
  return id;
}

function getResource(url: URL) {
  const resource = url.searchParams.get("resource")?.trim() ?? "contacts";
  if (resource !== "contacts" && resource !== "packages") {
    throw new Error("Select a valid sales resource");
  }
  return resource;
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const resource = getResource(url);
    const id = parseId(url.searchParams.get("id"), resource === "contacts" ? "contact" : "package");

    if (resource === "contacts" && id) {
      const contact = await getSalesContactDetail(db, id);
      if (!contact) return NextResponse.json({ error: "Sales contact not found" }, { status: 404 });
      return NextResponse.json({ data: contact });
    }

    const { page, limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
    const search = url.searchParams.get("search")?.trim() ?? "";

    if (resource === "packages") {
      const { data, total } = await listSalesPackages(db, { search, limit, offset });
      return NextResponse.json({ data, total, page, pageCount: getPageCount(total, limit) });
    }

    const salesStage = url.searchParams.get("salesStage")?.trim() ?? "";
    const { data, total } = await listSalesContacts(db, { search, salesStage, limit, offset });
    return NextResponse.json({ data, total, page, pageCount: getPageCount(total, limit) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const url = new URL(req.url);
    const resource = getResource(url);
    const body = await req.json();

    if (resource === "packages") {
      const item = await createSalesPackage(db, parsePackageInput(body), currentUser.id);
      return NextResponse.json({ data: item }, { status: 201 });
    }

    const contact = await createSalesContact(db, parseContactInput(body), currentUser.id);
    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const url = new URL(req.url);
    const resource = getResource(url);
    const id = parseId(url.searchParams.get("id"), resource === "contacts" ? "contact" : "package");
    const body = await req.json();

    if (resource === "packages") {
      if (!id) throw new Error("Invalid sales package id");
      const item = await updateSalesPackage(db, id, parsePackageInput(body), currentUser.id);
      if (!item) return NextResponse.json({ error: "Sales package not found" }, { status: 404 });
      return NextResponse.json({ data: item });
    }

    if (id && url.searchParams.get("action") === "stage") {
      const contact = await updateSalesContactStage(db, id, parseStageUpdateInput(body), currentUser.id);
      if (!contact) return NextResponse.json({ error: "Sales contact not found" }, { status: 404 });
      const detail = await getSalesContactDetail(db, id);
      return NextResponse.json({ data: detail ?? contact });
    }

    if (id) {
      const contact = await updateSalesContact(db, id, parseContactInput(body), currentUser.id);
      if (!contact) return NextResponse.json({ error: "Sales contact not found" }, { status: 404 });
      return NextResponse.json({ data: contact });
    }

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
    const url = new URL(req.url);
    const resource = getResource(url);
    const id = parseId(url.searchParams.get("id"), resource === "contacts" ? "contact" : "package");
    const body = await req.json().catch(() => ({}));
    const ids = id ? [id] : parseIds(body.ids);

    if (!ids.length) {
      return NextResponse.json(
        { error: resource === "packages" ? "Select at least one package" : "Select at least one contact" },
        { status: 400 }
      );
    }

    const deleted = resource === "packages"
      ? await softDeleteSalesPackages(db, ids, currentUser.id)
      : await softDeleteSalesContacts(db, ids, currentUser.id);
    return NextResponse.json({ deleted });
  } catch (error) {
    return errorResponse(error);
  }
}
