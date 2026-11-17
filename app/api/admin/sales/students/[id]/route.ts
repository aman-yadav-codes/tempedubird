import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await db.query("SELECT * FROM sales_students WHERE id = $1 LIMIT 1", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, student: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch student" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const {
      name,
      roll_number,
      email,
      phone,
      guardian_name,
      guardian_phone,
      course_program,
      batch_section,
      admission_date,
      fee_amount,
      fee_status,
      academic_status,
      address,
      notes,
      status,
    } = body;

    const query = `
      UPDATE sales_students
      SET
        name = COALESCE($1, name),
        roll_number = COALESCE($2, roll_number),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        guardian_name = COALESCE($5, guardian_name),
        guardian_phone = COALESCE($6, guardian_phone),
        course_program = COALESCE($7, course_program),
        batch_section = COALESCE($8, batch_section),
        admission_date = COALESCE($9, admission_date),
        fee_amount = COALESCE($10, fee_amount),
        fee_status = COALESCE($11, fee_status),
        academic_status = COALESCE($12, academic_status),
        address = COALESCE($13, address),
        notes = COALESCE($14, notes),
        status = COALESCE($15, status),
        updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `;

    const values = [
      name?.trim(),
      roll_number,
      email,
      phone,
      guardian_name,
      guardian_phone,
      course_program,
      batch_section,
      admission_date ? new Date(admission_date) : null,
      fee_amount !== undefined ? Number(fee_amount) : null,
      fee_status,
      academic_status,
      address,
      notes,
      status,
      id,
    ];

    const res = await db.query(query, values);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, student: res.rows[0] });
  } catch (error: any) {
    console.error("PUT /api/admin/sales/students/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update student" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await db.query("DELETE FROM sales_students WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/admin/sales/students/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete student" }, { status: 500 });
  }
}
