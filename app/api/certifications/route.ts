import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { listCertificationProviders } from "@/lib/queries/certification-providers";
import { getPagination, getPageCount } from "@/lib/queries/pagination";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const { page, limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() || "";
    const provider_type = url.searchParams.get("provider_type")?.trim() || "";

    const { data, total } = await listCertificationProviders(db, {
      search,
      provider_type,
      is_active: true,
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
    return NextResponse.json({ error: err.message || "Failed to fetch certification providers" }, { status: 500 });
  }
}
