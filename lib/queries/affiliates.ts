import { db } from "@/lib/db/db";
import type { Pool, PoolClient } from "pg";

type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

export interface AffiliateRecord {
  id: number;
  user_id: number;
  affiliate_code: string;
  total_referrals: number;
  total_earnings: number;
  pending_earnings: number;
  withdrawn_earnings: number;
  commission_rate: number;
  status: string;
  created_at: string;
  updated_at: string;
  // joined user details
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_avatar?: string;
  user_role?: string;
}

export interface AffiliateReferralRecord {
  id: number;
  affiliate_id: number;
  referrer_user_id: number;
  referred_user_id: number;
  referral_code: string;
  status: string;
  reward_amount: number;
  joined_at: string;
  referred_name?: string;
  referred_email?: string;
  referred_phone?: string;
  referred_avatar?: string;
  referred_role?: string;
}

export interface AffiliateEarningRecord {
  id: number;
  affiliate_id: number;
  user_id: number;
  referred_user_id?: number | null;
  source_type: string;
  source_id?: number | null;
  amount: number;
  status: string;
  description?: string;
  created_at: string;
  referred_name?: string;
}

/**
 * Ensures an affiliate record exists for the given user, using their phone number as affiliate_code.
 */
export async function ensureAffiliateProfile(
  db: Queryable,
  userId: number,
  phone?: string | null
): Promise<AffiliateRecord> {
  // If phone not provided, fetch user phone
  let affiliatePhone = phone?.trim() || "";
  if (!affiliatePhone) {
    const userRes = await db.query<{ phone: string }>(
      "SELECT phone FROM users WHERE id = $1",
      [userId]
    );
    affiliatePhone = userRes.rows[0]?.phone || `AFF${userId}`;
  }

  // Check if exists
  const existing = await db.query<AffiliateRecord>(
    "SELECT * FROM affiliates WHERE user_id = $1",
    [userId]
  );
  if (existing.rows[0]) {
    return existing.rows[0];
  }

  // Insert new affiliate record
  const inserted = await db.query<AffiliateRecord>(
    `
      INSERT INTO affiliates (user_id, affiliate_code, total_referrals, total_earnings, pending_earnings, withdrawn_earnings, commission_rate, status)
      VALUES ($1, $2, 0, 0.00, 0.00, 0.00, 10.00, 'active')
      ON CONFLICT (user_id) DO UPDATE SET affiliate_code = EXCLUDED.affiliate_code, updated_at = NOW()
      RETURNING *
    `,
    [userId, affiliatePhone]
  );
  return inserted.rows[0];
}

/**
 * Processes an affiliate referral when a new user registers with a referral_code (mobile number).
 */
export async function processAffiliateReferral(
  db: Queryable,
  params: {
    newUserId: number;
    referralCode: string;
    rewardAmount?: number;
  }
) {
  const cleanCode = params.referralCode.trim();
  if (!cleanCode) return null;

  // Find referrer user by phone or affiliate_code
  const referrerRes = await db.query<{ id: number; full_name: string; phone: string }>(
    `
      SELECT u.id, u.full_name, u.phone
      FROM users u
      LEFT JOIN affiliates a ON a.user_id = u.id
      WHERE (u.phone = $1 OR a.affiliate_code = $1)
        AND u.id != $2
        AND COALESCE(u.is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [cleanCode, params.newUserId]
  );

  const referrer = referrerRes.rows[0];
  if (!referrer) return null;

  // Ensure referrer has affiliate profile
  const affiliate = await ensureAffiliateProfile(db, referrer.id, referrer.phone);
  const reward = params.rewardAmount ?? 50.0;

  // Insert into affiliate_referrals
  const referralRes = await db.query<AffiliateReferralRecord>(
    `
      INSERT INTO affiliate_referrals (affiliate_id, referrer_user_id, referred_user_id, referral_code, reward_amount, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING *
    `,
    [affiliate.id, referrer.id, params.newUserId, cleanCode, reward]
  );

  // Insert earning record
  await db.query(
    `
      INSERT INTO affiliate_earnings (affiliate_id, user_id, referred_user_id, source_type, amount, status, description)
      VALUES ($1, $2, $3, 'referral_signup', $4, 'completed', $5)
    `,
    [
      affiliate.id,
      referrer.id,
      params.newUserId,
      reward,
      `Signup referral reward for referring new member`,
    ]
  );

  // Update affiliate totals
  await db.query(
    `
      UPDATE affiliates
      SET total_referrals = total_referrals + 1,
          total_earnings = total_earnings + $1,
          updated_at = NOW()
      WHERE id = $2
    `,
    [reward, affiliate.id]
  );

  return referralRes.rows[0];
}

/**
 * Fetches dashboard details for the currently logged-in affiliate / user.
 */
export async function getUserAffiliateDashboard(db: Queryable, userId: number) {
  // Ensure profile
  const affiliate = await ensureAffiliateProfile(db, userId);

  // Fetch referrals
  const referralsRes = await db.query<AffiliateReferralRecord>(
    `
      SELECT 
        ar.id,
        ar.affiliate_id,
        ar.referrer_user_id,
        ar.referred_user_id,
        ar.referral_code,
        ar.status,
        ar.reward_amount,
        ar.joined_at,
        u.full_name AS referred_name,
        u.email AS referred_email,
        u.phone AS referred_phone,
        u.avatar_url AS referred_avatar,
        COALESCE(
          (SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id LIMIT 1),
          'Member'
        ) AS referred_role
      FROM affiliate_referrals ar
      JOIN users u ON u.id = ar.referred_user_id
      WHERE ar.referrer_user_id = $1
      ORDER BY ar.joined_at DESC
      LIMIT 100
    `,
    [userId]
  );

  // Fetch earnings history
  const earningsRes = await db.query<AffiliateEarningRecord>(
    `
      SELECT 
        ae.id,
        ae.affiliate_id,
        ae.user_id,
        ae.referred_user_id,
        ae.source_type,
        ae.source_id,
        ae.amount,
        ae.status,
        ae.description,
        ae.created_at,
        u.full_name AS referred_name
      FROM affiliate_earnings ae
      LEFT JOIN users u ON u.id = ae.referred_user_id
      WHERE ae.user_id = $1
      ORDER BY ae.created_at DESC
      LIMIT 100
    `,
    [userId]
  );

  return {
    affiliate,
    referrals: referralsRes.rows,
    earnings: earningsRes.rows,
  };
}

/**
 * Fetches platform-wide affiliates list and stats for Platform Admin.
 */
export async function getPlatformAdminAffiliates(
  db: Queryable,
  filters: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }
) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.max(1, Math.min(100, filters.limit ?? 20));
  const offset = (page - 1) * limit;

  const whereConditions: string[] = ["COALESCE(u.is_deleted, FALSE) = FALSE"];
  const params: any[] = [];

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    whereConditions.push(
      `(u.full_name ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR u.email ILIKE $${params.length} OR a.affiliate_code ILIKE $${params.length})`
    );
  }

  if (filters.status && filters.status !== "all") {
    params.push(filters.status);
    whereConditions.push(`a.status = $${params.length}`);
  }

  const whereClause = whereConditions.join(" AND ");

  // Platform overall summary stats
  const statsRes = await db.query<{
    total_affiliates: string;
    total_referrals: string;
    total_earnings: string;
    total_withdrawn: string;
  }>(`
    SELECT 
      COUNT(DISTINCT a.id)::text AS total_affiliates,
      COALESCE(SUM(a.total_referrals), 0)::text AS total_referrals,
      COALESCE(SUM(a.total_earnings), 0)::text AS total_earnings,
      COALESCE(SUM(a.withdrawn_earnings), 0)::text AS total_withdrawn
    FROM affiliates a
    JOIN users u ON u.id = a.user_id
    WHERE COALESCE(u.is_deleted, FALSE) = FALSE
  `);

  // Count matching
  const countRes = await db.query<{ count: string }>(
    `
      SELECT COUNT(DISTINCT a.id) as count
      FROM affiliates a
      JOIN users u ON u.id = a.user_id
      WHERE ${whereClause}
    `,
    params
  );
  const total = parseInt(countRes.rows[0]?.count || "0", 10);

  // List matching
  params.push(limit, offset);
  const listRes = await db.query<AffiliateRecord>(
    `
      SELECT 
        a.id,
        a.user_id,
        a.affiliate_code,
        a.total_referrals,
        a.total_earnings,
        a.pending_earnings,
        a.withdrawn_earnings,
        a.commission_rate,
        a.status,
        a.created_at,
        a.updated_at,
        u.full_name AS user_name,
        u.email AS user_email,
        u.phone AS user_phone,
        u.avatar_url AS user_avatar,
        COALESCE(
          (SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id LIMIT 1),
          'User'
        ) AS user_role
      FROM affiliates a
      JOIN users u ON u.id = a.user_id
      WHERE ${whereClause}
      ORDER BY a.total_referrals DESC, a.total_earnings DESC, a.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );

  return {
    stats: {
      totalAffiliates: parseInt(statsRes.rows[0]?.total_affiliates || "0", 10),
      totalReferrals: parseInt(statsRes.rows[0]?.total_referrals || "0", 10),
      totalEarnings: parseFloat(statsRes.rows[0]?.total_earnings || "0"),
      totalWithdrawn: parseFloat(statsRes.rows[0]?.total_withdrawn || "0"),
    },
    affiliates: listRes.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Fetches single affiliate details with their full referral list for Admin inspection.
 */
export async function getAffiliateDetailForAdmin(db: Queryable, affiliateId: number) {
  const affRes = await db.query<AffiliateRecord>(
    `
      SELECT 
        a.*,
        u.full_name AS user_name,
        u.email AS user_email,
        u.phone AS user_phone,
        u.avatar_url AS user_avatar,
        COALESCE(
          (SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id LIMIT 1),
          'User'
        ) AS user_role
      FROM affiliates a
      JOIN users u ON u.id = a.user_id
      WHERE a.id = $1
    `,
    [affiliateId]
  );

  const affiliate = affRes.rows[0];
  if (!affiliate) return null;

  const referralsRes = await db.query<AffiliateReferralRecord>(
    `
      SELECT 
        ar.*,
        u.full_name AS referred_name,
        u.email AS referred_email,
        u.phone AS referred_phone,
        u.avatar_url AS referred_avatar,
        COALESCE(
          (SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id LIMIT 1),
          'Member'
        ) AS referred_role
      FROM affiliate_referrals ar
      JOIN users u ON u.id = ar.referred_user_id
      WHERE ar.affiliate_id = $1
      ORDER BY ar.joined_at DESC
    `,
    [affiliateId]
  );

  const earningsRes = await db.query<AffiliateEarningRecord>(
    `
      SELECT 
        ae.*,
        u.full_name AS referred_name
      FROM affiliate_earnings ae
      LEFT JOIN users u ON u.id = ae.referred_user_id
      WHERE ae.affiliate_id = $1
      ORDER BY ae.created_at DESC
    `,
    [affiliateId]
  );

  return {
    affiliate,
    referrals: referralsRes.rows,
    earnings: earningsRes.rows,
  };
}
