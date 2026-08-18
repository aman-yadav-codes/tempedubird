import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAllCompanyFaqs } from "@/lib/queries/company";

export async function GET() {
  try {
    const faqs = await getAllCompanyFaqs(db, true);
    return NextResponse.json({ data: faqs });
  } catch (err) {
    console.error("Error in GET /api/public/company/faqs:", err);
    return NextResponse.json({ error: "Failed to fetch FAQs" }, { status: 500 });
  }
}
