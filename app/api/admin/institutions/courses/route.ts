import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import {
  getInstitutionCourses,
  createInstitutionCourse,
  updateInstitutionCourse,
  deleteInstitutionCourse,
} from "@/lib/queries/institution-courses";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionIdStr = searchParams.get("institutionId");

    if (!institutionIdStr) {
      return NextResponse.json(
        { error: "institutionId parameter is required" },
        { status: 400 },
      );
    }

    const institutionId = Number(institutionIdStr);
    if (!institutionId || Number.isNaN(institutionId)) {
      return NextResponse.json(
        { error: "Invalid institutionId" },
        { status: 400 },
      );
    }

    const courses = await getInstitutionCourses(db, institutionId);
    return NextResponse.json({ data: courses });
  } catch (error) {
    console.error("GET /api/admin/institutions/courses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch institution courses" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      institutionId,
      courseName,
      stream,
      boardOrUniversity,
      duration,
      price,
      feeAmount,
      eligibility,
      description,
      seatsAvailable,
      sortOrder,
      isActive,
    } = body;

    if (!institutionId || !courseName?.trim()) {
      return NextResponse.json(
        { error: "institutionId and courseName are required" },
        { status: 400 },
      );
    }

    const course = await createInstitutionCourse(db, {
      institutionId: Number(institutionId),
      courseName,
      stream,
      boardOrUniversity,
      duration,
      price,
      feeAmount: feeAmount !== undefined ? (feeAmount ? Number(feeAmount) : null) : undefined,
      eligibility,
      description,
      seatsAvailable: seatsAvailable !== undefined ? (seatsAvailable ? Number(seatsAvailable) : null) : undefined,
      sortOrder: sortOrder ? Number(sortOrder) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    return NextResponse.json({ data: course });
  } catch (error) {
    console.error("POST /api/admin/institutions/courses error:", error);
    return NextResponse.json(
      { error: "Failed to create institution course" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      institutionId,
      courseName,
      stream,
      boardOrUniversity,
      duration,
      price,
      feeAmount,
      eligibility,
      description,
      seatsAvailable,
      sortOrder,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Course id is required" },
        { status: 400 },
      );
    }

    const updated = await updateInstitutionCourse(db, Number(id), {
      institutionId: institutionId ? Number(institutionId) : undefined,
      courseName,
      stream,
      boardOrUniversity,
      duration,
      price,
      feeAmount: feeAmount !== undefined ? (feeAmount ? Number(feeAmount) : null) : undefined,
      eligibility,
      description,
      seatsAvailable: seatsAvailable !== undefined ? (seatsAvailable ? Number(seatsAvailable) : null) : undefined,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PUT /api/admin/institutions/courses error:", error);
    return NextResponse.json(
      { error: "Failed to update institution course" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (!idStr) {
      return NextResponse.json({ error: "id parameter is required" }, { status: 400 });
    }

    const id = Number(idStr);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const success = await deleteInstitutionCourse(db, id);
    if (!success) {
      return NextResponse.json({ error: "Course not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/admin/institutions/courses error:", error);
    return NextResponse.json({ error: "Failed to delete institution course" }, { status: 500 });
  }
}
