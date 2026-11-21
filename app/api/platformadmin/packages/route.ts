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
        billing_cycle,
        database_allowance,
        file_storage_allowance,
        monthly_bandwidth,
        compute_allowance,
        seo_service,
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

    sql += ` ORDER BY COALESCE(price_monthly, price, 0) ASC, id ASC`;

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
      package_for = "platform",
      tier = "growth",
      package_category = "hosting_growth",
      price_monthly = 999.0,
      price_annual = null,
      price_unit = "INR",
      billing_cycle = "Monthly",
      database_allowance = "",
      file_storage_allowance = "",
      monthly_bandwidth = "",
      compute_allowance = "",
      seo_service = "",
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
        billing_cycle, database_allowance, file_storage_allowance, monthly_bandwidth, compute_allowance, seo_service,
        listing_limit_monthly, is_popular, is_active, target_audience,
        description, features_list, services_list, overage_price_per_listing, auto_overage_enabled,
        trial_days, validity_count, validity_unit, is_custom_enterprise, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19::jsonb, $20::jsonb, $21, $22,
        $23, 1, 'month', $24, NOW(), NOW()
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
        billing_cycle,
        database_allowance,
        file_storage_allowance,
        monthly_bandwidth,
        compute_allowance,
        seo_service,
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
      price_unit,
      billing_cycle,
      database_allowance,
      file_storage_allowance,
      monthly_bandwidth,
      compute_allowance,
      seo_service,
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
      await db.query(`UPDATE sales_packages SET is_popular = FALSE WHERE package_category = 'hosting_growth' AND id != $1`, [id]);
    }

    const res = await db.query(
      `
      UPDATE sales_packages SET
        name = COALESCE($1, name),
        price = COALESCE($2, price),
        price_monthly = COALESCE($2, price_monthly),
        price_annual = COALESCE($3, price_annual),
        price_unit = COALESCE($4, price_unit),
        billing_cycle = COALESCE($5, billing_cycle),
        database_allowance = COALESCE($6, database_allowance),
        file_storage_allowance = COALESCE($7, file_storage_allowance),
        monthly_bandwidth = COALESCE($8, monthly_bandwidth),
        compute_allowance = COALESCE($9, compute_allowance),
        seo_service = COALESCE($10, seo_service),
        listing_limit_monthly = COALESCE($11, listing_limit_monthly),
        is_popular = COALESCE($12, is_popular),
        is_active = COALESCE($13, is_active),
        target_audience = COALESCE($14, target_audience),
        description = COALESCE($15, description),
        features_list = COALESCE($16::jsonb, features_list),
        overage_price_per_listing = COALESCE($17, overage_price_per_listing),
        auto_overage_enabled = COALESCE($18, auto_overage_enabled),
        trial_days = COALESCE($19, trial_days),
        updated_at = NOW()
      WHERE id = $20
      RETURNING *
      `,
      [
        name,
        price_monthly !== undefined ? price_monthly : null,
        price_annual !== undefined ? price_annual : null,
        price_unit,
        billing_cycle,
        database_allowance,
        file_storage_allowance,
        monthly_bandwidth,
        compute_allowance,
        seo_service,
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

// PATCH toggle package active state
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Package ID is required" }, { status: 400 });
    }

    const res = await db.query(
      `UPDATE sales_packages 
       SET is_active = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, name, is_active`,
      [Boolean(is_active), id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Package "${res.rows[0].name}" is now ${res.rows[0].is_active ? "active" : "inactive"}`,
      package: res.rows[0],
    });
  } catch (error) {
    console.error("Error in PATCH /api/platformadmin/packages:", error);
    return NextResponse.json({ success: false, error: "Failed to toggle package" }, { status: 500 });
  }
}
