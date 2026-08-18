import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { getAllCompanyPages, getCompanyPageBySlug, updateCompanyPage } from "@/lib/queries/company";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (slug) {
      const page = await getCompanyPageBySlug(db, slug);
      if (!page) {
        return NextResponse.json({ error: "Company page not found" }, { status: 404 });
      }
      return NextResponse.json({ data: page });
    }

    const pages = await getAllCompanyPages(db);
    return NextResponse.json({ data: pages });
  } catch (err) {
    console.error("Error in GET /api/admin/company/pages:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { slug, title, subtitle, content, metadata, is_published } = body;

    if (!slug) {
      return NextResponse.json({ error: "Page slug is required" }, { status: 400 });
    }

    const updated = await updateCompanyPage(db, slug, {
      title,
      subtitle,
      content,
      metadata,
      is_published,
      updated_by: user.id,
    });

    if (!updated) {
      return NextResponse.json({ error: "Failed to update company page" }, { status: 404 });
    }

    return NextResponse.json({ data: updated, message: "Company page updated successfully" });
  } catch (err) {
    console.error("Error in PUT /api/admin/company/pages:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
