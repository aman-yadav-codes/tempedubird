import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser, isInstitutionAdminUser } from "@/lib/auth/permissions";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country"); // IN, US, all
    const state = searchParams.get("state");
    const city = searchParams.get("city");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    // Location filters for businesses
    const bWhere: string[] = ["1=1"];
    const bParams: any[] = [];
    let bIdx = 1;
    if (country && country !== "all") {
      bWhere.push(`country_code = $${bIdx++}`);
      bParams.push(country.toUpperCase());
    }
    if (state) {
      bWhere.push(`LOWER(state) = $${bIdx++}`);
      bParams.push(state.toLowerCase());
    }
    if (city) {
      bWhere.push(`LOWER(city) = $${bIdx++}`);
      bParams.push(city.toLowerCase());
    }
    if (fromDate) {
      bWhere.push(`created_at >= $${bIdx++}`);
      bParams.push(fromDate);
    }
    if (toDate) {
      bWhere.push(`created_at <= $${bIdx++}`);
      bParams.push(toDate);
    }

    // 1. Aggregated Metrics
    const [
      usersCountRes,
      customersCountRes,
      businessOwnersCountRes,
      professionalsCountRes,
      businessListingsRes,
      profProfilesRes,
      masterProductsRes,
      masterServicesRes,
      verifiedListingsRes,
      pendingApprovalsRes,
      reviewsRes,
      enquiriesRes,
      subscriptionsRes,
      revenueRes,
    ] = await Promise.all([
      db.query(`SELECT COUNT(*)::int as count FROM users WHERE is_deleted = FALSE`),
      db.query(`SELECT COUNT(DISTINCT ur.user_id)::int as count FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.code = 'customer'`),
      db.query(`SELECT COUNT(DISTINCT user_id)::int as count FROM business_profiles WHERE user_id IS NOT NULL`),
      db.query(`SELECT COUNT(DISTINCT user_id)::int as count FROM professional_profiles WHERE user_id IS NOT NULL`),
      db.query(`SELECT COUNT(*)::int as count FROM business_profiles WHERE ${bWhere.join(" AND ")}`, bParams),
      db.query(`SELECT COUNT(*)::int as count FROM professional_profiles WHERE ${bWhere.join(" AND ")}`, bParams),
      db.query(`SELECT COUNT(*)::int as count FROM master_products WHERE is_active = TRUE`),
      db.query(`SELECT COUNT(*)::int as count FROM master_services WHERE is_active = TRUE`),
      db.query(`
        SELECT (
          (SELECT COUNT(*)::int FROM business_profiles WHERE is_verified = TRUE) +
          (SELECT COUNT(*)::int FROM professional_profiles WHERE is_verified = TRUE)
        ) as count
      `),
      db.query(`
        SELECT (
          (SELECT COUNT(*)::int FROM business_profiles WHERE verification_status = 'pending') +
          (SELECT COUNT(*)::int FROM professional_profiles WHERE verification_status = 'pending')
        ) as count
      `),
      db.query(`SELECT COUNT(*)::int as count FROM platform_reviews`),
      db.query(`SELECT COUNT(*)::int as count FROM customer_inquiries`),
      db.query(`SELECT COUNT(*)::int as count FROM subscriptions WHERE status = 'active'`),
      db.query(`SELECT COALESCE(SUM(amount), 0)::numeric as count FROM finance_income_entries WHERE COALESCE(transaction_status, '') != 'cancelled'`),
    ]);

    // 2. Country-wise Breakdown (India vs USA vs Other)
    const [inStats, usStats] = await Promise.all([
      db.query(`
        SELECT
          (SELECT COUNT(*)::int FROM business_profiles WHERE country_code = 'IN') as businesses,
          (SELECT COUNT(*)::int FROM professional_profiles WHERE country_code = 'IN') as professionals,
          (SELECT COUNT(*)::int FROM master_products WHERE 'IN' = ANY(countries) OR countries IS NULL) as products,
          (SELECT COUNT(*)::int FROM master_services ms LEFT JOIN business_profiles bp ON bp.id = ms.business_profile_id LEFT JOIN professional_profiles pp ON pp.id = ms.professional_profile_id WHERE bp.country_code = 'IN' OR pp.country_code = 'IN' OR (bp.country_code IS NULL AND pp.country_code IS NULL)) as services
      `),
      db.query(`
        SELECT
          (SELECT COUNT(*)::int FROM business_profiles WHERE country_code = 'US') as businesses,
          (SELECT COUNT(*)::int FROM professional_profiles WHERE country_code = 'US') as professionals,
          (SELECT COUNT(*)::int FROM master_products WHERE 'US' = ANY(countries) OR countries IS NULL) as products,
          (SELECT COUNT(*)::int FROM master_services ms LEFT JOIN business_profiles bp ON bp.id = ms.business_profile_id LEFT JOIN professional_profiles pp ON pp.id = ms.professional_profile_id WHERE bp.country_code = 'US' OR pp.country_code = 'US' OR (bp.country_code IS NULL AND pp.country_code IS NULL)) as services
      `),
    ]);

    // 3. Time Series Trends for Charts (Last 6 Months by Month)
    const [regTrendRes, bizTrendRes, proTrendRes, enquiryTrendRes, revenueTrendRes] = await Promise.all([
      db.query(`
        SELECT TO_CHAR(created_at, 'Mon YYYY') as period, DATE_TRUNC('month', created_at) as m, COUNT(*)::int as count
        FROM users
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY period, m
        ORDER BY m ASC
      `),
      db.query(`
        SELECT TO_CHAR(created_at, 'Mon YYYY') as period, DATE_TRUNC('month', created_at) as m, COUNT(*)::int as count
        FROM business_profiles
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY period, m
        ORDER BY m ASC
      `),
      db.query(`
        SELECT TO_CHAR(created_at, 'Mon YYYY') as period, DATE_TRUNC('month', created_at) as m, COUNT(*)::int as count
        FROM professional_profiles
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY period, m
        ORDER BY m ASC
      `),
      db.query(`
        SELECT TO_CHAR(created_at, 'Mon YYYY') as period, DATE_TRUNC('month', created_at) as m, COUNT(*)::int as count
        FROM customer_inquiries
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY period, m
        ORDER BY m ASC
      `),
      db.query(`
        SELECT TO_CHAR(income_date, 'Mon YYYY') as period, DATE_TRUNC('month', income_date) as m, COALESCE(SUM(amount), 0)::numeric as count
        FROM finance_income_entries
        WHERE income_date >= NOW() - INTERVAL '6 months' AND COALESCE(transaction_status, '') != 'cancelled'
        GROUP BY period, m
        ORDER BY m ASC
      `),
    ]);

    // Format chart points
    const months = ["Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026"];
    const chartData = months.map((m) => {
      const reg = regTrendRes.rows.find((r) => r.period === m)?.count || 0;
      const biz = bizTrendRes.rows.find((r) => r.period === m)?.count || 0;
      const pro = proTrendRes.rows.find((r) => r.period === m)?.count || 0;
      const enq = enquiryTrendRes.rows.find((r) => r.period === m)?.count || 0;
      const rev = Number(revenueTrendRes.rows.find((r) => r.period === m)?.count || 0);
      return {
        month: m,
        registrations: reg,
        businesses: biz,
        professionals: pro,
        enquiries: enq,
        revenue: rev,
      };
    });

    // 4. Recent Activity Feed
    const [
      recentUsers,
      recentBusinesses,
      recentProfessionals,
      recentApprovals,
      recentEnquiries,
      recentReports,
      recentPayments,
    ] = await Promise.all([
      db.query(`SELECT id, full_name, email, phone, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 5`),
      db.query(`SELECT id, name, slug, city, country_code, is_verified, created_at FROM business_profiles ORDER BY created_at DESC LIMIT 5`),
      db.query(`SELECT id, name, profession_type, city, country_code, is_verified, created_at FROM professional_profiles ORDER BY created_at DESC LIMIT 5`),
      db.query(`
        SELECT id, name, 'business' as type, verification_status, created_at FROM business_profiles WHERE verification_status = 'pending'
        UNION ALL
        SELECT id, name, 'professional' as type, verification_status, created_at FROM professional_profiles WHERE verification_status = 'pending'
        ORDER BY created_at DESC LIMIT 5
      `),
      db.query(`SELECT id, customer_name, customer_email, customer_phone, message, status, created_at FROM customer_inquiries ORDER BY created_at DESC LIMIT 5`),
      db.query(`SELECT id, reporter_name, target_type, report_reason, status, created_at FROM listing_reports ORDER BY created_at DESC LIMIT 5`),
      db.query(`SELECT id, transaction_id, amount, payment_method, payment_status, income_date as created_at FROM finance_income_entries ORDER BY income_date DESC LIMIT 5`),
    ]);

    return NextResponse.json({
      success: true,
      statistics: {
        totalUsers: usersCountRes.rows[0]?.count || 0,
        totalCustomers: customersCountRes.rows[0]?.count || 0,
        totalBusinessOwners: businessOwnersCountRes.rows[0]?.count || 0,
        totalProfessionals: professionalsCountRes.rows[0]?.count || 0,
        totalBusinessListings: businessListingsRes.rows[0]?.count || 0,
        totalProfessionalProfiles: profProfilesRes.rows[0]?.count || 0,
        totalMasterProducts: masterProductsRes.rows[0]?.count || 0,
        totalMasterServices: masterServicesRes.rows[0]?.count || 0,
        totalVerifiedListings: verifiedListingsRes.rows[0]?.count || 0,
        pendingApprovals: pendingApprovalsRes.rows[0]?.count || 0,
        totalReviews: reviewsRes.rows[0]?.count || 0,
        totalEnquiries: enquiriesRes.rows[0]?.count || 0,
        activeSubscriptions: subscriptionsRes.rows[0]?.count || 0,
        totalRevenue: Number(revenueRes.rows[0]?.count || 0),
      },
      countryAnalytics: {
        india: inStats.rows[0] || { businesses: 0, professionals: 0, products: 0, services: 0 },
        usa: usStats.rows[0] || { businesses: 0, professionals: 0, products: 0, services: 0 },
      },
      charts: chartData,
      recentActivity: {
        users: recentUsers.rows,
        businesses: recentBusinesses.rows,
        professionals: recentProfessionals.rows,
        verificationRequests: recentApprovals.rows,
        enquiries: recentEnquiries.rows,
        reports: recentReports.rows,
        payments: recentPayments.rows,
      },
    });
  } catch (err: unknown) {
    console.error("[GET /api/admin/analytics/dashboard] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load dashboard analytics" },
      { status: 500 }
    );
  }
}

