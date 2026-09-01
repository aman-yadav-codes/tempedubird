import { NextResponse } from "next/server";
import { getJobsList } from "@/lib/queries/jobs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || undefined;
    const department = searchParams.get("department") || undefined;
    const employmentType = searchParams.get("employmentType") || undefined;
    const institutionId = searchParams.get("institutionId") ? Number(searchParams.get("institutionId")) : null;
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
