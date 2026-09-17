import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

async function ensureStudentFeePaymentsSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS student_fee_payments (
      id SERIAL PRIMARY KEY,
      student_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
      enrollment_id INTEGER NOT NULL REFERENCES student_enrollments(id) ON DELETE CASCADE,
      institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      academic_year_id INTEGER NULL REFERENCES academic_years(id) ON DELETE SET NULL,
      period_indexes INTEGER[] NOT NULL DEFAULT '{}',
      period_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('upi', 'qr', 'cash', 'net_banking', 'cheque', 'bank_transfer', 'pending', 'card', 'other')),
      subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
      discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      transaction_id TEXT NULL,
      screenshot_url TEXT NULL,
      screenshot_public_id TEXT NULL,
      screenshot_resource_type TEXT NULL,
      remarks TEXT NULL,
      status TEXT NOT NULL DEFAULT 'paid',
      submitted_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      received_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      verified_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      rejected_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      verified_at TIMESTAMP NULL,
      rejected_at TIMESTAMP NULL,
      rejection_reason TEXT NULL,
      fee_title TEXT NULL,
      due_date DATE NULL,
      late_fee_amount NUMERIC(12, 2) DEFAULT 0,
      received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_student_fee_payments_user ON student_fee_payments(student_user_id);
    CREATE INDEX IF NOT EXISTS idx_student_fee_payments_enrollment ON student_fee_payments(enrollment_id);
  `);
}

function generateInstallmentSchedule(
  enrollment: any,
  totalCourseFee: number,
  totalTransportFee: number,
  history: any[]
) {
  const plan = (enrollment?.payment_plan || "quarterly").toLowerCase();
  const admissionDateStr = enrollment?.admission_date ? new Date(enrollment.admission_date) : new Date();
  const baseYear = !isNaN(admissionDateStr.getFullYear()) ? admissionDateStr.getFullYear() : new Date().getFullYear();
  const baseMonth = !isNaN(admissionDateStr.getMonth()) ? admissionDateStr.getMonth() : new Date().getMonth();

  let installmentsCount = 4;
  let frequencyMonths = 3;
  let planLabel = "Quarterly Plan (4 Terms)";

  if (plan === "monthly") {
    installmentsCount = 12;
    frequencyMonths = 1;
    planLabel = "Monthly Plan (12 Flex Months)";
  } else if (plan === "semester") {
    installmentsCount = 2;
    frequencyMonths = 6;
    planLabel = "Semester Plan (2 Terms)";
  } else if (plan === "yearly") {
    installmentsCount = 1;
    frequencyMonths = 12;
    planLabel = "Annual / Yearly Plan";
  } else if (plan === "one_time") {
    installmentsCount = 1;
    frequencyMonths = 0;
    planLabel = "One-Time Lump Sum";
  } else {
    // quarterly default
    installmentsCount = 4;
    frequencyMonths = 3;
    planLabel = "Quarterly Plan (4 Terms)";
  }

  const courseFeePerInst = Math.round(totalCourseFee / installmentsCount);
  const transportPerInst = Math.round(totalTransportFee / installmentsCount);
  const totalPerInst = courseFeePerInst + transportPerInst;

  // Calculate total cleared paid amount from history
  const paidPayments = history.filter((p) => ["paid", "verified", "approved"].includes(p.status));
  let remainingPaid = paidPayments.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);

  const now = new Date();
  const schedule = [];

  for (let i = 0; i < installmentsCount; i++) {
    const instNumber = i + 1;
    // Due date: 10th of the month
    const dueDate = new Date(baseYear, baseMonth + i * frequencyMonths, 10);
    const dueDateIso = dueDate.toISOString().split("T")[0];

    let instTitle = `Term ${instNumber} Fee`;
    if (plan === "quarterly") {
      instTitle = `${instNumber === 1 ? "1st" : instNumber === 2 ? "2nd" : instNumber === 3 ? "3rd" : "4th"} Quarter Fee (Q${instNumber})`;
    } else if (plan === "monthly") {
      const monthName = dueDate.toLocaleString("en-IN", { month: "short" });
      instTitle = `Month ${instNumber} Fee (${monthName})`;
    } else if (plan === "semester") {
      instTitle = `${instNumber === 1 ? "1st" : "2nd"} Semester Fee`;
    } else if (plan === "yearly") {
      instTitle = "Annual Academic Course Fee";
    } else if (plan === "one_time") {
      instTitle = "Full Course One-Time Fee";
    }

    let instPaid = 0;
    let instPending = totalPerInst;
    let instStatus: "paid" | "partial" | "pending" = "pending";

    if (remainingPaid >= totalPerInst) {
      instPaid = totalPerInst;
      instPending = 0;
      instStatus = "paid";
      remainingPaid -= totalPerInst;
    } else if (remainingPaid > 0) {
      instPaid = remainingPaid;
      instPending = totalPerInst - remainingPaid;
      instStatus = "partial";
      remainingPaid = 0;
    } else {
      instPaid = 0;
      instPending = totalPerInst;
      instStatus = "pending";
    }

    const isOverdue = instStatus !== "paid" && dueDate < now;
    const diffDays = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    let daysStatus = "Upcoming";
    if (instStatus === "paid") {
      daysStatus = "Settled";
    } else if (isOverdue) {
      daysStatus = `Overdue by ${Math.abs(diffDays)} days`;
    } else if (diffDays <= 30) {
      daysStatus = `Due in ${diffDays} days`;
    } else {
      daysStatus = `Due on ${dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;
    }

    schedule.push({
      installment_number: instNumber,
      title: instTitle,
      due_date: dueDateIso,
      due_date_formatted: dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      course_fee: courseFeePerInst,
      transport_fee: transportPerInst,
      total_amount: totalPerInst,
      paid_amount: instPaid,
      pending_amount: instPending,
      status: instStatus,
      is_overdue: isOverdue,
      days_status: daysStatus,
    });
  }

  return {
    plan,
    plan_label: planLabel,
    installments_count: installmentsCount,
    installment_amount: totalPerInst,
    schedule,
  };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthenticatedUser(req);
    await ensureStudentFeePaymentsSchema();

    const { id } = await context.params;
    const studentUserId = Number(id);
    if (!studentUserId) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    // 1. Fetch Student User & Profile
    const studentRes = await db.query(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.phone,
          u.avatar_url,
          u.is_active,
          u.created_at,
          sp.id AS student_profile_id,
          sp.admission_number,
          sp.date_of_birth
        FROM users u
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        WHERE u.id = $1
        LIMIT 1
      `,
      [studentUserId]
    );

    if (studentRes.rows.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    const student = studentRes.rows[0];

    // 2. Fetch Enrollments with Fee Structure & Batch Data
    const enrollmentsRes = await db.query(
      `
        SELECT
          se.id,
          se.student_id,
          se.institution_id,
          inst.name AS institution_name,
          se.academic_year_id,
          ay.name AS academic_year_name,
          se.program_id,
          p.title AS program_name,
          p.fee_amount AS program_fee_amount,
          p.fee_unit AS program_fee_unit,
          p.admission_fee AS program_admission_fee,
          se.section_id,
          COALESCE(NULLIF(TRIM(ps.section_name), ''), sec.name) AS section_name,
          COALESCE(NULLIF(TRIM(ps.batch_name), ''), 'Default Batch') AS batch_name,
          ps.price::float AS batch_price,
          ps.fee_amount::float AS batch_fee_amount,
          ps.discount_percent::float AS batch_discount_percent,
          ps.installments_count AS batch_installments_count,
          se.roll_number,
          se.status,
          se.admission_date,
          se.remarks,
          se.is_current,
          COALESCE(se.course_fee, 0)::float AS course_fee,
          COALESCE(se.has_transport, FALSE) AS has_transport,
          COALESCE(se.transport_fee, 0)::float AS transport_fee,
          se.transport_zone,
          se.pickup_address,
          COALESCE(se.payment_plan, 'quarterly') AS payment_plan,
          COALESCE(se.payment_plan_title, 'Quarterly Plan') AS payment_plan_title,
          COALESCE(se.installment_amount, 0)::float AS installment_amount,
          COALESCE(se.total_fee, (COALESCE(se.course_fee, 0) + COALESCE(se.transport_fee, 0)))::float AS total_fee
        FROM student_profiles sp
        INNER JOIN student_enrollments se ON se.student_id = sp.id
        LEFT JOIN institution_profiles inst ON inst.id = se.institution_id
        LEFT JOIN academic_years ay ON ay.id = se.academic_year_id
        LEFT JOIN institution_programs p ON p.id = se.program_id
        LEFT JOIN sections sec ON sec.id = se.section_id
        LEFT JOIN program_sections ps ON ps.program_id = se.program_id AND ps.section_id = se.section_id
        WHERE sp.user_id = $1
          AND COALESCE(se.is_deleted, FALSE) = FALSE
        ORDER BY se.is_current DESC, se.id DESC
      `,
      [studentUserId]
    );

    const enrollments = enrollmentsRes.rows;
    const activeEnrollment = enrollments.find((e) => e.is_current) || enrollments[0] || null;

    // 3. Fetch Fee Payment History
    const paymentsRes = await db.query(
      `
        SELECT
          sfp.id,
          sfp.student_user_id,
          sfp.enrollment_id,
          sfp.academic_year_id,
          COALESCE(sfp.fee_title, 'Fee Payment') AS fee_title,
          sfp.subtotal_amount::float AS subtotal_amount,
          sfp.discount_percent::float AS discount_percent,
          sfp.discount_amount::float AS discount_amount,
          sfp.late_fee_amount::float AS late_fee_amount,
          sfp.total_amount::float AS total_amount,
          sfp.payment_method,
          sfp.transaction_id,
          sfp.remarks,
          LOWER(COALESCE(sfp.status, 'paid')) AS status,
          sfp.due_date,
          sfp.received_at,
          sfp.created_at,
          ay.name AS academic_year_name,
          rec.full_name AS received_by_name
        FROM student_fee_payments sfp
        LEFT JOIN academic_years ay ON ay.id = sfp.academic_year_id
        LEFT JOIN users rec ON rec.id = COALESCE(sfp.received_by, sfp.verified_by)
        WHERE sfp.student_user_id = $1
        ORDER BY COALESCE(sfp.received_at, sfp.created_at) DESC, sfp.id DESC
      `,
      [studentUserId]
    );

    const history = paymentsRes.rows;

    // 4. Compute Effective Fees from Batch / Program
    let effectiveCourseFee = activeEnrollment ? Number(activeEnrollment.course_fee || 0) : 0;
    if (effectiveCourseFee <= 0 && activeEnrollment) {
      effectiveCourseFee = Number(
        activeEnrollment.batch_price ||
        activeEnrollment.batch_fee_amount ||
        activeEnrollment.program_fee_amount ||
        0
      );
    }
    const effectiveTransportFee = activeEnrollment && activeEnrollment.has_transport ? Number(activeEnrollment.transport_fee || 0) : 0;
    let effectiveTotalFee = activeEnrollment ? Number(activeEnrollment.total_fee || 0) : 0;
    if (effectiveTotalFee <= 0) {
      effectiveTotalFee = effectiveCourseFee + effectiveTransportFee;
    }

    const paidPayments = history.filter((p) => ["paid", "verified", "approved"].includes(p.status));
    const totalPaid = paidPayments.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
    const totalPending = Math.max(0, effectiveTotalFee - totalPaid);

    const pendingPayments = history.filter((p) => p.status === "pending");
    const totalPendingScheduled = pendingPayments.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);

    let paymentStatus: "paid" | "partial" | "pending" = "pending";
    if (effectiveTotalFee > 0 && totalPaid >= effectiveTotalFee) {
      paymentStatus = "paid";
    } else if (totalPaid > 0) {
      paymentStatus = "partial";
    } else {
      paymentStatus = "pending";
    }

    // 5. Generate Installment Schedule from Batch & Chosen Fee Option
    const installmentPlanData = generateInstallmentSchedule(
      activeEnrollment,
      effectiveCourseFee,
      effectiveTransportFee,
      history
    );

    // Find next upcoming due
    const nextDue = installmentPlanData.schedule.find((s) => s.status !== "paid");

    return NextResponse.json({
      data: {
        student,
        active_enrollment: activeEnrollment,
        enrollments,
        summary: {
          course_fee: effectiveCourseFee,
          transport_fee: effectiveTransportFee,
          has_transport: activeEnrollment?.has_transport ?? false,
          transport_zone: activeEnrollment?.transport_zone ?? null,
          pickup_address: activeEnrollment?.pickup_address ?? null,
          total_fee: effectiveTotalFee,
          total_paid: totalPaid,
          total_pending: totalPending,
          payment_status: paymentStatus,
          paid_count: paidPayments.length,
          pending_count: pendingPayments.length,
          pending_scheduled_amount: totalPendingScheduled,
          // Batch and Plan Details
          batch_name: activeEnrollment?.batch_name || "Default Batch",
          program_name: activeEnrollment?.program_name || "Program",
          payment_plan: installmentPlanData.plan,
          payment_plan_label: installmentPlanData.plan_label,
          installment_amount: installmentPlanData.installment_amount,
          installments_count: installmentPlanData.installments_count,
          next_due_date: nextDue ? nextDue.due_date : null,
          next_due_formatted: nextDue ? nextDue.due_date_formatted : null,
          next_due_amount: nextDue ? nextDue.pending_amount : 0,
          next_due_title: nextDue ? nextDue.title : null,
        },
        installments: installmentPlanData.schedule,
        history,
        pending_dues: pendingPayments,
      },
    });
  } catch (err) {
    console.error("Error fetching student fee details:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function PATCH(
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
    const { paymentPlan, paymentPlanTitle, courseFee, totalFee, transportFee } = body;

    // Find student's active enrollment
    const enrRes = await db.query(
      `
        SELECT se.id
        FROM student_profiles sp
        INNER JOIN student_enrollments se ON se.student_id = sp.id
        WHERE sp.user_id = $1
        ORDER BY se.is_current DESC, se.id DESC
        LIMIT 1
      `,
      [studentUserId]
    );

    if (enrRes.rows.length === 0) {
      return NextResponse.json({ error: "Active enrollment not found" }, { status: 404 });
    }

    const enrollmentId = enrRes.rows[0].id;
    await db.query(
      `
        UPDATE student_enrollments
        SET
          payment_plan = COALESCE($1, payment_plan),
          payment_plan_title = COALESCE($2, payment_plan_title),
          course_fee = COALESCE($3, course_fee),
          total_fee = COALESCE($4, total_fee),
          transport_fee = COALESCE($5, transport_fee),
          updated_at = NOW()
        WHERE id = $6
      `,
      [
        paymentPlan || null,
        paymentPlanTitle || null,
        courseFee != null ? Number(courseFee) : null,
        totalFee != null ? Number(totalFee) : null,
        transportFee != null ? Number(transportFee) : null,
        enrollmentId,
      ]
    );

    return NextResponse.json({ success: true, message: "Fee plan updated successfully." });
  } catch (err) {
    console.error("Error updating fee plan:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureStudentFeePaymentsSchema();

    const { id } = await context.params;
    const studentUserId = Number(id);
    if (!studentUserId) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const body = await req.json();
    const {
      enrollmentId,
      feeTitle = "Tuition Fee Installment",
      amount,
      paymentMethod = "cash",
      transactionId = null,
      remarks = null,
      status = "paid",
      dueDate = null,
      discountPercent = 0,
      discountAmount = 0,
      lateFeeAmount = 0,
    } = body;

    const totalAmount = Number(amount);
    if (Number.isNaN(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ error: "Please provide a valid payment amount greater than 0." }, { status: 400 });
    }

    // Lookup student_profile and enrollment
    const spRes = await db.query(
      `
        SELECT sp.id AS student_profile_id, se.id AS enrollment_id, se.institution_id, se.academic_year_id
        FROM student_profiles sp
        LEFT JOIN student_enrollments se ON se.student_id = sp.id AND COALESCE(se.is_deleted, FALSE) = FALSE
        WHERE sp.user_id = $1
        ORDER BY se.is_current DESC, se.id DESC
        LIMIT 1
      `,
      [studentUserId]
    );

    if (spRes.rows.length === 0) {
      return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    }

    const spData = spRes.rows[0];
    const targetEnrollmentId = enrollmentId ? Number(enrollmentId) : spData.enrollment_id;
    const targetInstitutionId = spData.institution_id || 1;
    const targetAcademicYearId = spData.academic_year_id || null;

    if (!targetEnrollmentId) {
      return NextResponse.json({ error: "Active enrollment not found for this student. Please assign a class first." }, { status: 400 });
    }

    const inserted = await db.query(
      `
        INSERT INTO student_fee_payments (
          student_user_id,
          student_profile_id,
          enrollment_id,
          institution_id,
          academic_year_id,
          fee_title,
          subtotal_amount,
          discount_percent,
          discount_amount,
          late_fee_amount,
          total_amount,
          payment_method,
          transaction_id,
          remarks,
          status,
          due_date,
          received_by,
          received_at,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING *
      `,
      [
        studentUserId,
        spData.student_profile_id,
        targetEnrollmentId,
        targetInstitutionId,
        targetAcademicYearId,
        feeTitle.trim() || "Fee Payment",
        totalAmount + Number(discountAmount || 0) - Number(lateFeeAmount || 0),
        Number(discountPercent || 0),
        Number(discountAmount || 0),
        Number(lateFeeAmount || 0),
        totalAmount,
        paymentMethod.toLowerCase(),
        transactionId ? String(transactionId).trim() : null,
        remarks ? String(remarks).trim() : null,
        status.toLowerCase() === "pending" ? "pending" : "paid",
        dueDate || null,
        user.id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Fee payment recorded successfully!",
      data: inserted.rows[0],
    });
  } catch (err) {
    console.error("Error creating student fee payment:", err);
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

    const url = new URL(req.url);
    const paymentId = Number(url.searchParams.get("paymentId"));
    if (!paymentId || !studentUserId) {
      return NextResponse.json({ error: "Missing paymentId or student ID" }, { status: 400 });
    }

    await db.query(
      `DELETE FROM student_fee_payments WHERE id = $1 AND student_user_id = $2`,
      [paymentId, studentUserId]
    );

    return NextResponse.json({ success: true, message: "Payment record removed successfully." });
  } catch (err) {
    console.error("Error deleting fee payment:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
