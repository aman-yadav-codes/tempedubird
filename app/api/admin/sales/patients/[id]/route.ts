import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await db.query("SELECT * FROM sales_patients WHERE id = $1 LIMIT 1", [id]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Patient record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, patient: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch patient" }, { status: 500 });
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
      patient_id_number,
      age,
      gender,
      phone,
      email,
      blood_group,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      department,
      doctor_assigned,
      visit_type,
      consultation_fee,
      medical_history,
      allergies,
      status,
    } = body;

    const query = `
      UPDATE sales_patients
      SET
        name = COALESCE($1, name),
        patient_id_number = COALESCE($2, patient_id_number),
        age = COALESCE($3, age),
        gender = COALESCE($4, gender),
        phone = COALESCE($5, phone),
        email = COALESCE($6, email),
        blood_group = COALESCE($7, blood_group),
        address = COALESCE($8, address),
        emergency_contact_name = COALESCE($9, emergency_contact_name),
        emergency_contact_phone = COALESCE($10, emergency_contact_phone),
        department = COALESCE($11, department),
        doctor_assigned = COALESCE($12, doctor_assigned),
        visit_type = COALESCE($13, visit_type),
        consultation_fee = COALESCE($14, consultation_fee),
        medical_history = COALESCE($15, medical_history),
        allergies = COALESCE($16, allergies),
        status = COALESCE($17, status),
        updated_at = NOW()
      WHERE id = $18
      RETURNING *
    `;

    const values = [
      name?.trim(),
      patient_id_number,
      age ? Number(age) : null,
      gender,
      phone,
      email,
      blood_group,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      department,
      doctor_assigned,
      visit_type,
      consultation_fee !== undefined ? Number(consultation_fee) : null,
      medical_history,
      allergies,
      status,
      id,
    ];

    const res = await db.query(query, values);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Patient record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, patient: res.rows[0] });
  } catch (error: any) {
    console.error("PUT /api/admin/sales/patients/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update patient" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await db.query("DELETE FROM sales_patients WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/admin/sales/patients/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete patient" }, { status: 500 });
  }
}
