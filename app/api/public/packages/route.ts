import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const tier = searchParams.get("tier");

    let query = `
      SELECT 
        id,
        name,
        package_for,
        tier,
        package_category,
        CAST(COALESCE(price_monthly, price, 0) AS DOUBLE PRECISION) AS price,
        CAST(COALESCE(price_monthly, price, 0) AS DOUBLE PRECISION) AS price_monthly,
        CAST(price_annual AS DOUBLE PRECISION) AS price_annual,
        COALESCE(price_unit, 'INR') AS price_unit,
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
        is_custom_enterprise
      FROM sales_packages
      WHERE COALESCE(is_deleted, FALSE) = FALSE
    `;

    const params: any[] = [];

    if (category && category !== "all" && category !== "business_growth" && category !== "hosting_growth") {
      params.push(category);
      query += ` AND package_category = $${params.length}`;
    }

    if (tier) {
      params.push(tier);
      query += ` AND tier = $${params.length}`;
    }

    query += ` ORDER BY COALESCE(price_monthly, price, 0) ASC, id ASC`;

    let res = await db.query(query, params);

    // If query returned 0 rows, fallback to all active non-deleted packages
    if (res.rows.length === 0) {
      res = await db.query(
        `SELECT 
          id, name, package_for, tier, package_category,
          CAST(COALESCE(price_monthly, price, 0) AS DOUBLE PRECISION) AS price,
          CAST(COALESCE(price_monthly, price, 0) AS DOUBLE PRECISION) AS price_monthly,
          CAST(price_annual AS DOUBLE PRECISION) AS price_annual,
          COALESCE(price_unit, 'INR') AS price_unit,
          billing_cycle, database_allowance, file_storage_allowance,
          monthly_bandwidth, compute_allowance, seo_service,
          listing_limit_monthly, is_popular, is_active, target_audience,
          description, features_list, services_list,
          CAST(overage_price_per_listing AS DOUBLE PRECISION) AS overage_price_per_listing,
          auto_overage_enabled, trial_days, validity_count, validity_unit,
          is_custom_enterprise
        FROM sales_packages
        WHERE COALESCE(is_deleted, FALSE) = FALSE
        ORDER BY COALESCE(price_monthly, price, 0) ASC, id ASC`
      );
    }

    return NextResponse.json(
      {
        success: true,
        packages: res.rows,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
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
