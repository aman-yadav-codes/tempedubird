import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthUser } from "@/lib/auth/auth";

async function ensureOffersTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS institution_offers (
      id SERIAL PRIMARY KEY,
      institution_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      code VARCHAR(100) NOT NULL,
      discount_type VARCHAR(30) DEFAULT 'percentage',
      discount_value NUMERIC(12,2) DEFAULT 0,
      discount_text VARCHAR(100) NOT NULL,
      offer_type VARCHAR(50) DEFAULT 'duration_based',
      valid_from DATE DEFAULT CURRENT_DATE,
      valid_till DATE NOT NULL,
      course_ids INT[],
      course_names TEXT[],
      description TEXT,
      target_audience VARCHAR(50) DEFAULT 'all',
      is_active BOOLEAN DEFAULT TRUE,
      is_deleted BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE institution_offers ADD COLUMN IF NOT EXISTS offer_type VARCHAR(50) DEFAULT 'duration_based';
    ALTER TABLE institution_offers ADD COLUMN IF NOT EXISTS discount_type VARCHAR(30) DEFAULT 'percentage';
    ALTER TABLE institution_offers ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12,2) DEFAULT 0;
    ALTER TABLE institution_offers ADD COLUMN IF NOT EXISTS valid_from DATE DEFAULT CURRENT_DATE;
    ALTER TABLE institution_offers ADD COLUMN IF NOT EXISTS course_ids INT[];
    ALTER TABLE institution_offers ADD COLUMN IF NOT EXISTS course_names TEXT[];
  `).catch(() => undefined);
}

export async function GET(req: Request) {
  try {
    await ensureOffersTable();
    const user = await getAuthUser(req);
    const { searchParams } = new URL(req.url);
    const institutionIdParam = searchParams.get("institution_id");

    let institutionId: number | null = null;
    if (institutionIdParam) {
      institutionId = Number(institutionIdParam);
    } else if (user) {
      institutionId = user.memberships?.find((m) => m.institution_id)?.institution_id || user.under_institution_id || null;
    }

    let query = `
      SELECT 
        o.id,
        o.institution_id,
        o.title,
        o.code,
        o.discount_type,
        o.discount_value,
        o.discount_text,
        o.offer_type,
        o.valid_from::text AS valid_from,
        o.valid_till::text AS valid_till,
        o.course_ids,
        o.course_names,
        o.description,
        o.target_audience,
        o.is_active,
        ip.name AS institution_name
      FROM institution_offers o
      LEFT JOIN institution_profiles ip ON ip.id = o.institution_id
      WHERE COALESCE(o.is_deleted, FALSE) = FALSE
    `;

    const params: any[] = [];
    if (institutionId) {
      params.push(institutionId);
      query += ` AND o.institution_id = $${params.length}`;
    }

    query += ` ORDER BY o.id DESC LIMIT 50`;

    const res = await db.query(query, params);

    let offers = res.rows;
    if (offers.length === 0) {
      offers = [
        {
          id: 1,
          institution_id: institutionId || 155,
          title: "Early Bird Admission Discount",
          code: "EDUBIRD2026",
          discount_type: "percentage",
          discount_value: 20,
          discount_text: "20% OFF",
          offer_type: "duration_based",
          valid_from: "2026-08-01",
          valid_till: "2026-08-31",
          course_ids: [],
          course_names: ["All Courses"],
          description: "20% fee concession for early admission registrations.",
          target_audience: "all",
          is_active: true,
          institution_name: "Apex Institute of Engineering & Technology",
        },
        {
          id: 2,
          institution_id: institutionId || 155,
          title: "B.Tech & MBA Course Special Offer",
          code: "INSTITUTE50",
          discount_type: "percentage",
          discount_value: 50,
          discount_text: "50% OFF",
          offer_type: "course_based",
          valid_from: "2026-08-01",
          valid_till: "2026-09-15",
          course_ids: [1, 2],
          course_names: ["B.Tech Computer Science & Engineering", "Master of Business Administration (MBA)"],
          description: "50% semester discount for CSE and MBA applicants.",
          target_audience: "students",
          is_active: true,
          institution_name: "Apex Institute of Engineering & Technology",
        },
        {
          id: 3,
          institution_id: institutionId || 155,
          title: "Flat Admission Fee Waiver",
          code: "EARLYBIRD",
          discount_type: "flat",
          discount_value: 2000,
          discount_text: "₹2,000 Flat",
          offer_type: "duration_based",
          valid_from: "2026-08-01",
          valid_till: "2026-10-30",
          course_ids: [],
          course_names: ["All Courses"],
          description: "Flat ₹2,000 instant discount on admission confirmation.",
          target_audience: "all",
          is_active: true,
          institution_name: "Apex Institute of Engineering & Technology",
        },
      ];
    }

    return NextResponse.json({
      success: true,
      offers,
    });
  } catch (err) {
    console.error("Error fetching institution offers:", err);
    return NextResponse.json({ error: "Failed to load offers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureOffersTable();
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      code,
      discountType,
      discountValue,
      discountText,
      offerType,
      validFrom,
      validTill,
      courseIds,
      courseNames,
      description,
      targetAudience,
      institutionId,
    } = body;

    if (!title || !code || !validTill) {
      return NextResponse.json({ error: "Title, Coupon Code, and Valid Till date are required." }, { status: 400 });
    }

    const dType = discountType === "flat" ? "flat" : "percentage";
    const dVal = Number(discountValue) || 0;
    const computedDiscountText = discountText?.trim() || (dType === "percentage" ? `${dVal}% OFF` : `₹${dVal.toLocaleString("en-IN")} Flat`);
    const oType = offerType === "course_based" ? "course_based" : "duration_based";

    const instId = Number(institutionId) || user.memberships?.find((m) => m.institution_id)?.institution_id || user.under_institution_id || 155;

    const res = await db.query(
      `
      INSERT INTO institution_offers (
        institution_id,
        title,
        code,
        discount_type,
        discount_value,
        discount_text,
        offer_type,
        valid_from,
        valid_till,
        course_ids,
        course_names,
        description,
        target_audience,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE)
      RETURNING *
    `,
      [
        instId,
        title.trim(),
        code.trim().toUpperCase(),
        dType,
        dVal,
        computedDiscountText,
        oType,
        validFrom || new Date().toISOString().split("T")[0],
        validTill,
        Array.isArray(courseIds) ? courseIds : [],
        Array.isArray(courseNames) ? courseNames : [],
        description?.trim() || null,
        targetAudience || "all",
      ]
    );

    return NextResponse.json({
      success: true,
      offer: res.rows[0],
    });
  } catch (err) {
    console.error("Error creating offer:", err);
    return NextResponse.json({ error: "Failed to create offer" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureOffersTable();
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Offer ID is required" }, { status: 400 });
    }

    await db.query(`UPDATE institution_offers SET is_deleted = TRUE WHERE id = $1`, [Number(id)]);

    return NextResponse.json({ success: true, message: "Offer deleted successfully" });
  } catch (err) {
    console.error("Error deleting offer:", err);
    return NextResponse.json({ error: "Failed to delete offer" }, { status: 500 });
  }
}
