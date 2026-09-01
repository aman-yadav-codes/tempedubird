import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformFullAccess } from "@/lib/auth/permissions";
import {
  deleteJobApplication,
  getAllJobApplications,
  getJobApplicationById,
  updateJobApplicationStatus,
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
    const jobId = searchParams.get("jobId") ? Number(searchParams.get("jobId")) : undefined;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "20");

    const result = await getAllJobApplications({
      search,
      status,
      jobId,
      institutionId,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load applicants";
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
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    const existing = await getJobApplicationById(id);
    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const isPlatform = isPlatformFullAccess(user) || user.role_codes?.includes("platform_admin");
    if (!isPlatform) {
      const activeInst = user.memberships?.find((m) => m.role_code === "institution_admin")?.institution_id;
      if (existing.institution_id && existing.institution_id !== activeInst) {
        return NextResponse.json({ error: "Unauthorized access to this application" }, { status: 403 });
      }
    }

    const updated = await updateJobApplicationStatus(id, {
      status: body.status,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update application";
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
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    const existing = await getJobApplicationById(id);
    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const isPlatform = isPlatformFullAccess(user) || user.role_codes?.includes("platform_admin");
    if (!isPlatform) {
      const activeInst = user.memberships?.find((m) => m.role_code === "institution_admin")?.institution_id;
      if (existing.institution_id && existing.institution_id !== activeInst) {
        return NextResponse.json({ error: "Unauthorized access to this application" }, { status: 403 });
      }
    }

    await deleteJobApplication(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete application";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
