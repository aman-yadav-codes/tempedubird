import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthUser } from "@/lib/auth/get-auth-user";

async function ensureCommissionsTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_commission_rules (
        id SERIAL PRIMARY KEY,
        institution_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        applicable_role VARCHAR(100) DEFAULT 'all',
        course_name VARCHAR(255) DEFAULT 'All Courses',
        commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sales_commissions (
        id SERIAL PRIMARY KEY,
        institution_id INT NOT NULL,
        employee_id INT,
        employee_name VARCHAR(255) NOT NULL,
        employee_role VARCHAR(100) DEFAULT 'Sales Counsellor',
        student_name VARCHAR(255),
        course_title VARCHAR(255) NOT NULL,
        sale_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
        commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        commission_reason TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        payout_date TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {
    console.error("Error creating commissions tables:", e);
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureCommissionsTables();
    const user = await getAuthUser(req);
    const { searchParams } = new URL(req.url);
    const institutionIdParam = searchParams.get("institutionId");

    const instId =
      institutionIdParam && /^\d+$/.test(institutionIdParam)
        ? Number(institutionIdParam)
        : user?.memberships?.[0]?.institution_id || 1;

    // Fetch Commissions List
    const commissionsRes = await db.query(
      `SELECT * FROM sales_commissions WHERE institution_id = $1 ORDER BY id DESC`,
      [instId]
    ).catch(() => ({ rows: [] }));

    let commissions = commissionsRes.rows || [];

    // Seed realistic sample commission records if currently empty for demo
    if (commissions.length === 0) {
      await db.query(`
        INSERT INTO sales_commissions (institution_id, employee_name, employee_role, student_name, course_title, sale_amount, commission_percentage, commission_amount, commission_reason, status)
        VALUES
          ($1, 'Ananya Sen', 'Senior Admission Counsellor', 'Pooja Verma', 'B.Tech in Computer Science & AI', 145000, 8.00, 11600, 'Direct student admission conversion during Open Day Counselling session', 'paid'),
          ($1, 'Vikram Malhotra', 'Academic Advisor', 'Aman Srivastava', 'MBA (Dual Specialization)', 185000, 7.50, 13875, 'Executive corporate batch referral closure with full upfront annual fee payment', 'approved'),
          ($1, 'Priya Kulkarni', 'Student Counsellor', 'Rohan Gupta', 'JEE & NEET Comprehensive Coaching Batch', 85000, 10.00, 8500, 'Early bird spot-registration incentive for top-100 test batch', 'pending'),
          ($1, 'Suresh Rawat', 'Outreach Officer', 'Kavita Singh', 'Bachelor of Computer Applications (BCA)', 95000, 6.00, 5700, 'Regional campus branch inquiry follow-up and confirmed seat booking', 'paid'),
          ($1, 'Ananya Sen', 'Senior Admission Counsellor', 'Deepak Tiwari', 'B.Tech in Electronics & Robotics', 135000, 8.00, 10800, 'Merit scholarship student conversion & document verification closure', 'approved')
      `, [instId]).catch(() => undefined);

      const refreshed = await db.query(
        `SELECT * FROM sales_commissions WHERE institution_id = $1 ORDER BY id DESC`,
        [instId]
      ).catch(() => ({ rows: [] }));
      commissions = refreshed.rows || [];
    }

    // Fetch Commission Rules
    const rulesRes = await db.query(
      `SELECT * FROM sales_commission_rules WHERE institution_id = $1 ORDER BY id ASC`,
      [instId]
    ).catch(() => ({ rows: [] }));

    let rules = rulesRes.rows || [];
    if (rules.length === 0) {
      await db.query(`
        INSERT INTO sales_commission_rules (institution_id, title, applicable_role, course_name, commission_percentage, description, is_active)
        VALUES
          ($1, 'Standard Admission Payout', 'Sales Counsellor', 'All Courses', 6.00, 'Standard commission on regular classroom admissions', TRUE),
          ($1, 'High-Value Degree Program Incentive', 'Senior Admission Counsellor', 'B.Tech / MBA Programs', 8.50, 'Higher incentive for 4-year degree and MBA seat closures', TRUE),
          ($1, 'Competitive Exam Spot Registration', 'Academic Advisor', 'JEE / NEET Coaching Batches', 10.00, 'Special incentive for spot admissions in coaching batches', TRUE),
          ($1, 'Faculty Outreach Bonus', 'Teacher', 'All Courses', 5.00, 'Direct student referral bonus for faculty and lecturers', TRUE)
      `, [instId]).catch(() => undefined);

      const refreshedRules = await db.query(
        `SELECT * FROM sales_commission_rules WHERE institution_id = $1 ORDER BY id ASC`,
        [instId]
      ).catch(() => ({ rows: [] }));
      rules = refreshedRules.rows || [];
    }

    // Compute Summary Stats
    const totalCommissions = commissions.reduce((acc: number, c: any) => acc + Number(c.commission_amount || 0), 0);
    const paidCommissions = commissions.filter((c: any) => c.status === "paid").reduce((acc: number, c: any) => acc + Number(c.commission_amount || 0), 0);
    const pendingCommissions = commissions.filter((c: any) => c.status !== "paid").reduce((acc: number, c: any) => acc + Number(c.commission_amount || 0), 0);
    const totalSalesInfluenced = commissions.reduce((acc: number, c: any) => acc + Number(c.sale_amount || 0), 0);

    return NextResponse.json({
      success: true,
      commissions,
      rules,
      stats: {
        totalCommissions,
        paidCommissions,
        pendingCommissions,
        totalSalesInfluenced,
        count: commissions.length,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/sales/commissions error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch sales commissions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureCommissionsTables();
    const user = await getAuthUser(req);
    const body = await req.json();

    const instId = body.institution_id || user?.memberships?.[0]?.institution_id || 1;
    const action = body.action || "create_commission";

    if (action === "create_rule" || action === "update_rule") {
      const { title, applicable_role, course_name, commission_percentage, description, is_active, rule_id } = body;
      if (!title || commission_percentage === undefined) {
        return NextResponse.json({ error: "Title and commission percentage are required" }, { status: 400 });
      }

      if (action === "update_rule" && rule_id) {
        const updateRes = await db.query(`
          UPDATE sales_commission_rules
          SET title = $1, applicable_role = $2, course_name = $3, commission_percentage = $4, description = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
          WHERE id = $7 AND institution_id = $8
          RETURNING *
        `, [title, applicable_role || "all", course_name || "All Courses", Number(commission_percentage), description || "", is_active !== false, rule_id, instId]);

        return NextResponse.json({ success: true, rule: updateRes.rows[0] });
      }

      const insertRes = await db.query(`
        INSERT INTO sales_commission_rules (institution_id, title, applicable_role, course_name, commission_percentage, description, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [instId, title, applicable_role || "all", course_name || "All Courses", Number(commission_percentage), description || "", is_active !== false]);

      return NextResponse.json({ success: true, rule: insertRes.rows[0] });
    }

    // Default: Log / Add Employee Commission Record
    const {
      employee_name,
      employee_role,
      student_name,
      course_title,
      sale_amount,
      commission_percentage,
      commission_reason,
      status,
      notes,
    } = body;

    if (!employee_name || !course_title || !commission_reason) {
      return NextResponse.json({ error: "Employee Name, Course Title, and Commission Reason are required" }, { status: 400 });
    }

    const saleAmt = Number(sale_amount || 0);
    const commPct = Number(commission_percentage || 5.0);
    const commAmt = body.commission_amount !== undefined ? Number(body.commission_amount) : (saleAmt * commPct) / 100;

    const res = await db.query(`
      INSERT INTO sales_commissions (
        institution_id, employee_name, employee_role, student_name, course_title,
        sale_amount, commission_percentage, commission_amount, commission_reason,
        status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      instId,
      employee_name.trim(),
      employee_role || "Sales Counsellor",
      student_name ? student_name.trim() : null,
      course_title.trim(),
      saleAmt,
      commPct,
      commAmt,
      commission_reason.trim(),
      status || "pending",
      notes || null,
    ]);

    return NextResponse.json({ success: true, commission: res.rows[0] });
  } catch (err: any) {
    console.error("POST /api/admin/sales/commissions error:", err);
    return NextResponse.json({ error: err.message || "Failed to save commission" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const body = await req.json();
    const { id, status, commission_percentage, commission_amount, commission_reason } = body;

    if (!id) {
      return NextResponse.json({ error: "Commission ID is required" }, { status: 400 });
    }

    const updates: string[] = ["updated_at = CURRENT_TIMESTAMP"];
    const params: unknown[] = [id];

    if (status) {
      params.push(status);
      updates.push(`status = $${params.length}`);
      if (status === "paid") {
        updates.push("payout_date = CURRENT_TIMESTAMP");
      }
    }

    if (commission_percentage !== undefined) {
      params.push(Number(commission_percentage));
      updates.push(`commission_percentage = $${params.length}`);
    }

    if (commission_amount !== undefined) {
      params.push(Number(commission_amount));
      updates.push(`commission_amount = $${params.length}`);
    }

    if (commission_reason) {
      params.push(commission_reason.trim());
      updates.push(`commission_reason = $${params.length}`);
    }

    const query = `
      UPDATE sales_commissions
      SET ${updates.join(", ")}
      WHERE id = $1
      RETURNING *
    `;

    const res = await db.query(query, params);
    return NextResponse.json({ success: true, commission: res.rows[0] });
  } catch (err: any) {
    console.error("PATCH /api/admin/sales/commissions error:", err);
    return NextResponse.json({ error: err.message || "Failed to update commission" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ruleId = searchParams.get("rule_id");

    if (ruleId) {
      await db.query("DELETE FROM sales_commission_rules WHERE id = $1", [ruleId]);
      return NextResponse.json({ success: true, message: "Rule deleted successfully" });
    }

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await db.query("DELETE FROM sales_commissions WHERE id = $1", [id]);
    return NextResponse.json({ success: true, message: "Commission record deleted" });
  } catch (err: any) {
    console.error("DELETE /api/admin/sales/commissions error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete commission" }, { status: 500 });
  }
}
