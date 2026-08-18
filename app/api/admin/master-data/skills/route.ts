import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { createSkill, listSkills } from "@/lib/queries/skills";
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

    const { data, total } = await listSkills(db, { search, limit, offset });

    return NextResponse.json({
      data,
      pageCount: getPageCount(total, limit),
      total,
    });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const { name, slug } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
    }

    const skill = await createSkill(db, { name, slug });
    return NextResponse.json({ data: skill }, { status: 201 });
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json({ error: "A skill with that slug already exists" }, { status: 409 });
    }
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
