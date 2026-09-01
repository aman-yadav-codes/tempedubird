import { NextResponse } from "next/server";
import { createJobApplication, getJobById } from "@/lib/queries/jobs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const jobId = Number(body.job_id);
    if (!jobId || !Number.isInteger(jobId)) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const job = await getJobById(jobId);
    if (!job || job.status !== "Active") {
      return NextResponse.json({ error: "This job is no longer accepting applications" }, { status: 400 });
    }

    if (!body.applicant_name || !body.applicant_name.trim()) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }
    if (!body.applicant_email || !body.applicant_email.trim()) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }

    const application = await createJobApplication({
      job_id: jobId,
      applicant_name: body.applicant_name,
      applicant_email: body.applicant_email,
      applicant_phone: body.applicant_phone,
      resume_url: body.resume_url,
      cover_letter: body.cover_letter,
      experience_years: body.experience_years,
      current_organization: body.current_organization,
    });

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully! Our recruitment team will review your profile.",
      data: application,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit application";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
