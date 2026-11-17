import { NextResponse } from "next/server";
import { getJobsList } from "@/lib/queries/jobs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || undefined;
    const department = searchParams.get("department") || undefined;
    const employmentType = searchParams.get("employmentType") || undefined;
    const paramInstId = searchParams.get("institutionId") || searchParams.get("institution_id") || searchParams.get("businessId") || searchParams.get("business_id");
    const envInstId = (
      process.env.BUSINESS_ID ||
      process.env.NEXT_PUBLIC_BUSINESS_ID ||
      process.env.INSTITUTION_ID ||
      process.env.NEXT_PUBLIC_INSTITUTION_ID ||
      ""
    ).trim();
    const isPlatformMode = process.env.APP_MODE === "platform_admin" || process.env.APP_MODE === "platform";
    const institutionId = paramInstId && /^\d+$/.test(paramInstId) ? Number(paramInstId) : (!isPlatformMode && envInstId && /^\d+$/.test(envInstId) ? Number(envInstId) : null);
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "24");

    const result = await getJobsList({
      search,
      status: "Active",
      department,
      employmentType,
      institutionId,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load careers and jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
