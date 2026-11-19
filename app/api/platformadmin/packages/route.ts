import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

// GET all packages for Platform Admin
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    let sql = `
      SELECT 
        id,
        name,
        package_for,
        tier,
        package_category,
        CAST(price AS DOUBLE PRECISION) AS price,
        CAST(price_monthly AS DOUBLE PRECISION) AS price_monthly,
        CAST(price_annual AS DOUBLE PRECISION) AS price_annual,
        price_unit,
        listing_limit_monthly,
        is_popular,
        is_active,
        target_audience,
        description,
        features_list,
        services_list,
        CAST(overage_price_per_listing AS DOUBLE PRECISION) AS overage_price_per_listing,
        auto_overage_enabled,
        trial_days,
        validity_count,
        validity_unit,
        is_custom_enterprise,
        created_at,
        updated_at
      FROM sales_packages
      WHERE COALESCE(is_deleted, FALSE) = FALSE
    `;

    const params: any[] = [];
    if (category) {
      params.push(category);
      sql += ` AND package_category = $${params.length}`;
    }

    sql += ` ORDER BY price ASC`;

    const res = await db.query(sql, params);

    return NextResponse.json({
      success: true,
      packages: res.rows,
    });
  } catch (error) {
    console.error("Error in GET /api/platformadmin/packages:", error);
    return NextResponse.json({ success: false, error: "Failed to load packages" }, { status: 500 });
  }
}

// POST create package
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      package_for = "Businesses & Teams",
      tier = "growth",
      package_category = "business_growth",
      price_monthly = 99.0,
      price_annual = 950.0,
      price_unit = "USD",
      listing_limit_monthly = 500,
      is_popular = false,
      is_active = true,
      target_audience = "",
      description = "",
      features_list = [],
      services_list = [],
      overage_price_per_listing = 0.5,
      auto_overage_enabled = false,
      trial_days = 14,
      is_custom_enterprise = false,
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Package name is required" }, { status: 400 });
    }

    // If marked popular, unmark any previous popular in same category
    if (is_popular) {
      await db.query(`UPDATE sales_packages SET is_popular = FALSE WHERE package_category = $1`, [package_category]);
    }

    const res = await db.query(
      `
      INSERT INTO sales_packages (
        name, package_for, tier, package_category, price, price_monthly, price_annual, price_unit,
        listing_limit_monthly, is_popular, is_active, target_audience,
        description, features_list, services_list, overage_price_per_listing, auto_overage_enabled,
        trial_days, validity_count, validity_unit, is_custom_enterprise, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13::jsonb, $14::jsonb, $15, $16,
        $17, 1, 'month', $18, NOW(), NOW()
      ) RETURNING *
      `,
      [
        name,
        package_for,
        tier,
        package_category,
        price_monthly,
        price_annual,
        price_unit,
        listing_limit_monthly,
        is_popular,
        is_active,
        target_audience,
        description,
        JSON.stringify(features_list),
        JSON.stringify(services_list),
        overage_price_per_listing,
        auto_overage_enabled,
        trial_days,
        is_custom_enterprise,
      ]
    );

    return NextResponse.json({
      success: true,
      message: `Package "${name}" created successfully`,
      package: res.rows[0],
    });
  } catch (error) {
    console.error("Error in POST /api/platformadmin/packages:", error);
    return NextResponse.json({ success: false, error: "Failed to create package" }, { status: 500 });
  }
}

// PUT update package
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      price_monthly,
      price_annual,
      listing_limit_monthly,
      is_popular,
      is_active,
      target_audience,
      description,
      features_list,
      overage_price_per_listing,
      auto_overage_enabled,
      trial_days,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Package ID is required" }, { status: 400 });
    }

    if (is_popular) {
      await db.query(`UPDATE sales_packages SET is_popular = FALSE WHERE package_category = 'business_growth' AND id != $1`, [id]);
    }

    const res = await db.query(
      `
      UPDATE sales_packages SET
        name = COALESCE($1, name),
        price = COALESCE($2, price),
        price_monthly = COALESCE($2, price_monthly),
        price_annual = COALESCE($3, price_annual),
        listing_limit_monthly = COALESCE($4, listing_limit_monthly),
        is_popular = COALESCE($5, is_popular),
        is_active = COALESCE($6, is_active),
        target_audience = COALESCE($7, target_audience),
        description = COALESCE($8, description),
        features_list = COALESCE($9::jsonb, features_list),
        overage_price_per_listing = COALESCE($10, overage_price_per_listing),
        auto_overage_enabled = COALESCE($11, auto_overage_enabled),
        trial_days = COALESCE($12, trial_days),
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
      `,
      [
        name,
        price_monthly,
        price_annual,
        listing_limit_monthly,
        is_popular,
        is_active,
        target_audience,
        description,
        features_list ? JSON.stringify(features_list) : null,
        overage_price_per_listing,
        auto_overage_enabled,
        trial_days,
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Package updated successfully",
      package: res.rows[0],
    });
  } catch (error) {
    console.error("Error in PUT /api/platformadmin/packages:", error);
    return NextResponse.json({ success: false, error: "Failed to update package" }, { status: 500 });
  }
}
