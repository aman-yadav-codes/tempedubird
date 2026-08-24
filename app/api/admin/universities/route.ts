import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  createUniversity,
  listUniversities,
  toggleUniversityActive,
  softDeleteUniversity,
} from "@/lib/queries/universities";
import { getPagination, getPageCount } from "@/lib/queries/pagination";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const country = url.searchParams.get("country");
    const state = url.searchParams.get("state");
    const search = url.searchParams.get("search")?.trim() || "";

    const { page, limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );

    const { data, total } = await listUniversities(db, {
      type,
      country,
      state,
      search,
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
    const {
      name,
      slug,
      code,
      university_type,
      country,
      state,
      city,
      website_url,
      logo_url,
      established_year,
      accreditation,
      description,
      is_active,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "University name is required" },
        { status: 400 }
      );
    }

    const university = await createUniversity(db, {
      name: name.trim(),
      slug: slug?.trim() || undefined,
      code: code?.trim() || null,
      university_type: university_type || "central",
      country: country?.trim() || "India",
      state: state?.trim() || null,
      city: city?.trim() || null,
      website_url: website_url?.trim() || null,
      logo_url: logo_url?.trim() || null,
      established_year: established_year ? Number(established_year) : null,
      accreditation: accreditation?.trim() || null,
      description: description?.trim() || null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
    });

    return NextResponse.json({ data: university }, { status: 201 });
  } catch (err: any) {
    if (err.code === "23505" || err.message?.includes("already exists")) {
      return NextResponse.json(
        { error: err.message || "A university with this name already exists" },
        { status: 409 }
      );
    }
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json();
    const { ids, isActive, softDelete } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
    }
    const numericIds = ids.map(Number).filter((id) => !isNaN(id));

    if (typeof isActive === "boolean") {
      await db.query(
        `UPDATE universities SET is_active = $1, updated_at = NOW() WHERE id = ANY($2::int[])`,
        [isActive, numericIds]
      );
      return NextResponse.json({
        success: true,
        message: `Updated status for ${numericIds.length} universities`,
      });
    }

    if (softDelete === true) {
      await db.query(
        `UPDATE universities SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $1, updated_at = NOW() WHERE id = ANY($2::int[])`,
        [currentUser.id, numericIds]
      );
      return NextResponse.json({
        success: true,
        message: `Soft deleted ${numericIds.length} universities`,
      });
    }

    return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
