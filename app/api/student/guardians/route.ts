import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  getStudentGuardians,
  addStudentGuardian,
  deleteStudentGuardian,
} from "@/lib/queries/student-guardians";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guardians = await getStudentGuardians(user.id, db);
    return NextResponse.json({ success: true, data: guardians });
  } catch (err: any) {
    console.error("GET /api/student/guardians error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load guardians" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      guardian_name,
      guardian_email,
      guardian_phone,
      relationship,
      is_primary,
      occupation,
    } = body;

    if (!guardian_name?.trim()) {
      return NextResponse.json(
        { error: "Guardian name is required" },
        { status: 400 }
      );
    }

    if (!guardian_email?.trim() && !guardian_phone?.trim()) {
      return NextResponse.json(
        { error: "Guardian email or phone number is required" },
        { status: 400 }
      );
    }

    const email = guardian_email?.trim() || `guardian_${user.id}_${Date.now()}@edubird.com`;

    const record = await addStudentGuardian(
      {
        studentUserId: user.id,
        guardianName: guardian_name.trim(),
        guardianEmail: email,
        guardianPhone: guardian_phone?.trim() || null,
        relationship: relationship?.trim() || "Parent / Guardian",
        isPrimary: Boolean(is_primary),
        occupation: occupation?.trim() || null,
      },
      db
    );

    return NextResponse.json(
      {
        success: true,
        data: record,
        message: "Guardian added successfully",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/student/guardians error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to add guardian" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const guardianUserId = Number(url.searchParams.get("guardianUserId"));

    if (!guardianUserId || isNaN(guardianUserId)) {
      return NextResponse.json(
        { error: "guardianUserId parameter is required" },
        { status: 400 }
      );
    }

    const success = await deleteStudentGuardian(user.id, guardianUserId, db);
    return NextResponse.json({
      success,
      message: success ? "Guardian removed successfully" : "Guardian not found",
    });
  } catch (err: any) {
    console.error("DELETE /api/student/guardians error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to remove guardian" },
      { status: 500 }
    );
  }
}
