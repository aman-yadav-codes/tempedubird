import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  createDesignation,
  getDesignationStats,
  listDesignations,
} from "@/lib/queries/designations";
import { getPagination, getPageCount } from "@/lib/queries/pagination";
import { handlePublicDesignationsGet } from "@/lib/api/public-designations";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET(req: Request) {
  try {
    if (!req.headers.get("authorization")?.startsWith("Bearer ")) {
      return handlePublicDesignationsGet(req);
    }

    await requireAdmin(req);

    const url = new URL(req.url);
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() || "";

    const [{ data, total }, stats] = await Promise.all([
      listDesignations(db, { search, limit, offset }),
      getDesignationStats(db),
    ]);

    return NextResponse.json({
      data,
      pageCount: getPageCount(total, limit),
      total,
      stats,
    });
  } catch (error: unknown) {
    const message = errorMessage(error);
    const status = message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const { name, slug } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
    }

    const designation = await createDesignation(db, { name, slug });
    return NextResponse.json({ data: designation }, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json({ error: "A designation with that slug already exists" }, { status: 409 });
    }
    const message = errorMessage(error);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
