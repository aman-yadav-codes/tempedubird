import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "business_growth";
    const tier = searchParams.get("tier");

    let query = `
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
        is_custom_enterprise
      FROM sales_packages
      WHERE is_active = TRUE AND COALESCE(is_deleted, FALSE) = FALSE
    `;

    const params: any[] = [];

    if (category) {
      params.push(category);
      query += ` AND package_category = $${params.length}`;
    }

    if (tier) {
      params.push(tier);
      query += ` AND tier = $${params.length}`;
    }

    query += ` ORDER BY price ASC`;

    const res = await db.query(query, params);

    return NextResponse.json({
      success: true,
      packages: res.rows,
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch packages",
        packages: [],
      },
      { status: 500 }
    );
  }
}
