import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import {
  getInstitutionBranches,
  createInstitutionBranch,
  updateInstitutionBranch,
  deleteInstitutionBranch,
} from "@/lib/queries/institution-branches";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionIdStr = searchParams.get("institutionId");

    if (!institutionIdStr) {
      return NextResponse.json({ error: "institutionId parameter is required" }, { status: 400 });
    }

    const institutionId = Number(institutionIdStr);
    if (!institutionId || Number.isNaN(institutionId)) {
      return NextResponse.json({ error: "Invalid institutionId" }, { status: 400 });
    }

    const branches = await getInstitutionBranches(db, institutionId);
    return NextResponse.json({ data: branches });
  } catch (error) {
    console.error("GET /api/admin/institutions/branches error:", error);
    return NextResponse.json({ error: "Failed to fetch institution branches" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { institutionId, branchName, address, city, state, pincode, workingHours, phones, emails, isPrimary, sortOrder } = body;

    if (!institutionId || !branchName?.trim()) {
      return NextResponse.json({ error: "institutionId and branchName are required" }, { status: 400 });
    }

    const branch = await createInstitutionBranch(db, {
      institutionId: Number(institutionId),
      branchName,
      address,
      city,
      state,
      pincode,
      workingHours,
      phones: Array.isArray(phones) ? phones : [],
      emails: Array.isArray(emails) ? emails : [],
      isPrimary: Boolean(isPrimary),
      sortOrder: sortOrder ? Number(sortOrder) : 0,
    });

    return NextResponse.json({ data: branch });
  } catch (error) {
    console.error("POST /api/admin/institutions/branches error:", error);
    return NextResponse.json({ error: "Failed to create institution branch" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, institutionId, branchName, address, city, state, pincode, workingHours, phones, emails, isPrimary, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Branch id is required" }, { status: 400 });
    }

    const updated = await updateInstitutionBranch(db, Number(id), {
      institutionId: institutionId ? Number(institutionId) : undefined,
      branchName,
      address,
      city,
      state,
      pincode,
      workingHours,
      phones,
      emails,
      isPrimary: isPrimary !== undefined ? Boolean(isPrimary) : undefined,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PUT /api/admin/institutions/branches error:", error);
    return NextResponse.json({ error: "Failed to update institution branch" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (!idStr) {
      return NextResponse.json({ error: "Branch id parameter is required" }, { status: 400 });
    }

    const id = Number(idStr);
    const success = await deleteInstitutionBranch(db, id);

    if (!success) {
      return NextResponse.json({ error: "Branch not found or delete failed" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/institutions/branches error:", error);
    return NextResponse.json({ error: "Failed to delete institution branch" }, { status: 500 });
  }
}
