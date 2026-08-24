import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  createCertificationProvider,
  listCertificationProviders,
  ensureCertificationProvidersTable,
} from "@/lib/queries/certification-providers";
import { getPagination, getPageCount } from "@/lib/queries/pagination";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const url = new URL(req.url);
    const { page, limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() || "";
    const provider_type = url.searchParams.get("provider_type")?.trim() || "";
    const activeParam = url.searchParams.get("is_active");
    const is_active = activeParam !== null && activeParam !== undefined && activeParam !== ""
      ? activeParam === "true"
      : undefined;

    const { data, total } = await listCertificationProviders(db, {
      search,
      provider_type,
      is_active,
      limit,
      offset,
    });

    return NextResponse.json({
      data,
      pageCount: getPageCount(total, limit),
      total,
      page,
      limit,
    });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { name, slug, provider_type, code, website_url, logo_url, description, is_active } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Provider name is required" }, { status: 400 });
    }

    const effectiveSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    const created = await createCertificationProvider(db, {
      name: name.trim(),
      slug: effectiveSlug,
      provider_type: provider_type || "certification",
      code: code || null,
      website_url: website_url || null,
      logo_url: logo_url || null,
      description: description || null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json(
        { error: "A certification or affiliation provider with that slug already exists" },
        { status: 409 }
      );
    }
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin(req);
    await ensureCertificationProvidersTable(db);
    const body = await req.json();
    const { ids, isActive, softDelete } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
    }
    const numericIds = ids.map(Number).filter((id) => !isNaN(id));

    if (typeof isActive === "boolean") {
      await db.query(
        `UPDATE certification_providers SET is_active = $1, updated_at = NOW() WHERE id = ANY($2::int[])`,
        [isActive, numericIds]
      );
    }

    if (softDelete === true) {
      await db.query(
        `UPDATE certification_providers SET is_deleted = TRUE, deleted_at = NOW(), updated_at = NOW() WHERE id = ANY($1::int[])`,
        [numericIds]
      );
    }

    return NextResponse.json({ success: true, count: numericIds.length });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
