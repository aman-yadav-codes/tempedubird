import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getCompanyPageBySlug } from "@/lib/queries/company";

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    if (!slug) {
      return NextResponse.json({ error: "Slug parameter is required" }, { status: 400 });
    }

    const page = await getCompanyPageBySlug(db, slug);
    if (!page || !page.is_published) {
      return NextResponse.json({ error: "Page not found or unavailable" }, { status: 404 });
    }

    return NextResponse.json({ data: page });
  } catch (err) {
    console.error("Error in GET /api/public/company/pages/[slug]:", err);
    return NextResponse.json({ error: "Failed to fetch page data" }, { status: 500 });
  }
}
