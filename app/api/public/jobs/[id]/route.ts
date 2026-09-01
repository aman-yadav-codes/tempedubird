import { NextResponse } from "next/server";
import { getJobById } from "@/lib/queries/jobs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const jobId = Number(id);

    if (!jobId || !Number.isInteger(jobId)) {
      return NextResponse.json({ error: "Invalid Job ID" }, { status: 400 });
    }

    const job = await getJobById(jobId);
    if (!job || job.status !== "Active") {
      return NextResponse.json({ error: "Job vacancy not found or no longer active" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load job details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
