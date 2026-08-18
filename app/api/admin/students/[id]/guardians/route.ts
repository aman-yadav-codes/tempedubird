import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { addStudentGuardian, deleteStudentGuardian, getStudentGuardians } from "@/lib/queries/student-guardians";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthenticatedUser(req);
    const { id } = await context.params;
    const studentUserId = Number(id);
    if (!studentUserId) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const guardians = await getStudentGuardians(studentUserId, db);
    return NextResponse.json({ data: guardians });
  } catch (err) {
    console.error("Error in GET /api/admin/students/[id]/guardians:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthenticatedUser(req);
    const { id } = await context.params;
    const studentUserId = Number(id);
    if (!studentUserId) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const body = await req.json();
    const { guardian_name, guardian_email, guardian_phone, relationship, is_primary, occupation } = body;

    if (!guardian_name || !guardian_email) {
      return NextResponse.json({ error: "Guardian name and email are required" }, { status: 400 });
    }

    const record = await addStudentGuardian(
      {
        studentUserId,
        guardianName: guardian_name,
        guardianEmail: guardian_email,
        guardianPhone: guardian_phone,
        relationship: relationship || "Guardian",
        isPrimary: Boolean(is_primary),
        occupation,
      },
      db
    );

    return NextResponse.json({ data: record, message: "Guardian record added successfully" }, { status: 201 });
  } catch (err) {
    console.error("Error in POST /api/admin/students/[id]/guardians:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthenticatedUser(req);
    const { id } = await context.params;
    const studentUserId = Number(id);
    if (!studentUserId) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const guardianUserId = Number(searchParams.get("guardianUserId"));
    if (!guardianUserId) {
      return NextResponse.json({ error: "Guardian User ID is required" }, { status: 400 });
    }

    const deleted = await deleteStudentGuardian(studentUserId, guardianUserId, db);
    if (!deleted) {
      return NextResponse.json({ error: "Guardian record not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Guardian removed successfully" });
  } catch (err) {
    console.error("Error in DELETE /api/admin/students/[id]/guardians:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
