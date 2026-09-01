import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformFullAccess } from "@/lib/auth/permissions";
import {
  createJobPosting,
  deleteJobPosting,
  getJobById,
  getJobsList,
  updateJobPosting,
} from "@/lib/queries/jobs";

export async function GET(req: Request) {
  try {
    const user = await requireAdmin(req);
    const { searchParams } = new URL(req.url);

    const isPlatform = isPlatformFullAccess(user) || user.role_codes?.includes("platform_admin");
    const requestedInstId = searchParams.get("institutionId");

    let institutionId: number | null = null;
    if (!isPlatform) {
      const activeInst = user.memberships?.find((m) => m.role_code === "institution_admin")?.institution_id;
      institutionId = activeInst ? Number(activeInst) : null;
    } else if (requestedInstId && requestedInstId !== "all") {
      institutionId = Number(requestedInstId);
    }

    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const department = searchParams.get("department") || undefined;
    const employmentType = searchParams.get("employmentType") || undefined;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "20");

    const result = await getJobsList({
      search,
      status,
      department,
      employmentType,
      institutionId,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load jobs";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();

    const isPlatform = isPlatformFullAccess(user) || user.role_codes?.includes("platform_admin");
    let institutionId = body.institution_id ? Number(body.institution_id) : null;

    if (!isPlatform) {
      const activeInst = user.memberships?.find((m) => m.role_code === "institution_admin")?.institution_id;
      institutionId = activeInst ? Number(activeInst) : null;
    }

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: "Job title is required" }, { status: 400 });
    }
    if (!body.department || !body.department.trim()) {
      return NextResponse.json({ error: "Department is required" }, { status: 400 });
    }
    if (!body.description || !body.description.trim()) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }

    const newJob = await createJobPosting({
      institution_id: institutionId,
      title: body.title,
      department: body.department,
      employment_type: body.employment_type || "Full-time",
      experience_level: body.experience_level || "1-3 Years",
      work_mode: body.work_mode || "On-site",
      location: body.location || "Campus",
      salary_range: body.salary_range || "Best in Industry",
      openings_count: body.openings_count ? Number(body.openings_count) : 1,
      deadline: body.deadline || null,
      description: body.description,
      requirements: body.requirements || "",
      benefits: body.benefits || "",
      status: body.status || "Active",
      created_by: user.id,
    });

    return NextResponse.json({ success: true, data: newJob });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create job";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();

    const id = Number(body.id);
    if (!id || !Number.isInteger(id)) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const existing = await getJobById(id);
    if (!existing) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const isPlatform = isPlatformFullAccess(user) || user.role_codes?.includes("platform_admin");
    if (!isPlatform) {
      const activeInst = user.memberships?.find((m) => m.role_code === "institution_admin")?.institution_id;
      if (existing.institution_id && existing.institution_id !== activeInst) {
        return NextResponse.json({ error: "Unauthorized access to this job" }, { status: 403 });
      }
    }

    const updated = await updateJobPosting(id, {
      title: body.title,
      department: body.department,
      institution_id: body.institution_id !== undefined ? (body.institution_id ? Number(body.institution_id) : null) : undefined,
      employment_type: body.employment_type,
      experience_level: body.experience_level,
      work_mode: body.work_mode,
      location: body.location,
      salary_range: body.salary_range,
      openings_count: body.openings_count !== undefined ? Number(body.openings_count) : undefined,
      deadline: body.deadline,
      description: body.description,
      requirements: body.requirements,
      benefits: body.benefits,
      status: body.status,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update job";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id || !Number.isInteger(id)) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const existing = await getJobById(id);
    if (!existing) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const isPlatform = isPlatformFullAccess(user) || user.role_codes?.includes("platform_admin");
    if (!isPlatform) {
      const activeInst = user.memberships?.find((m) => m.role_code === "institution_admin")?.institution_id;
      if (existing.institution_id && existing.institution_id !== activeInst) {
        return NextResponse.json({ error: "Unauthorized access to this job" }, { status: 403 });
      }
    }

    await deleteJobPosting(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete job";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
