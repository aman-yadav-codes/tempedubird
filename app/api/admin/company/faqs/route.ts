import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { createCompanyFaq, deleteCompanyFaq, getAllCompanyFaqs, updateCompanyFaq } from "@/lib/queries/company";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const faqs = await getAllCompanyFaqs(db, false);
    return NextResponse.json({ data: faqs });
  } catch (err) {
    console.error("Error in GET /api/admin/company/faqs:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { question, answer, category, sort_order, is_published } = body;

    if (!question || !answer) {
      return NextResponse.json({ error: "Question and answer are required" }, { status: 400 });
    }

    const newFaq = await createCompanyFaq(db, {
      question,
      answer,
      category,
      sort_order: Number(sort_order) || 0,
      is_published: is_published !== false,
    });

    return NextResponse.json({ data: newFaq, message: "FAQ created successfully" }, { status: 201 });
  } catch (err) {
    console.error("Error in POST /api/admin/company/faqs:", err);
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
    const { id, question, answer, category, sort_order, is_published } = body;

    if (!id) {
      return NextResponse.json({ error: "FAQ ID is required" }, { status: 400 });
    }

    const updated = await updateCompanyFaq(db, Number(id), {
      question,
      answer,
      category,
      sort_order: sort_order !== undefined ? Number(sort_order) : undefined,
      is_published,
    });

    if (!updated) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated, message: "FAQ updated successfully" });
  } catch (err) {
    console.error("Error in PUT /api/admin/company/faqs:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user) && !isInstitutionAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    if (!idParam) {
      return NextResponse.json({ error: "FAQ ID is required" }, { status: 400 });
    }

    const deleted = await deleteCompanyFaq(db, Number(idParam));
    if (!deleted) {
      return NextResponse.json({ error: "FAQ not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ message: "FAQ deleted successfully" });
  } catch (err) {
    console.error("Error in DELETE /api/admin/company/faqs:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
