import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformFullAccess } from "@/lib/auth/permissions";
import { getJobApplications, getJobById } from "@/lib/queries/jobs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin(req);
    const { id } = await ctx.params;
    const jobId = Number(id);

    if (!jobId || !Number.isInteger(jobId)) {
      return NextResponse.json({ error: "Invalid Job ID" }, { status: 400 });
    }

    const job = await getJobById(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const isPlatform = isPlatformFullAccess(user) || user.role_codes?.includes("platform_admin");
    if (!isPlatform) {
      const activeInst = user.memberships?.find((m) => m.role_code === "institution_admin")?.institution_id;
      if (job.institution_id && job.institution_id !== activeInst) {
        return NextResponse.json({ error: "Unauthorized access to this job" }, { status: 403 });
      }
    }

    const applications = await getJobApplications(jobId);

    return NextResponse.json({
      success: true,
      data: {
        ...job,
        applications,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load job details";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
