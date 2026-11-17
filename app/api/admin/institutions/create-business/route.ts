import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser, isStaffUser } from "@/lib/auth/permissions";
import { syncInstitutionAcademicYearsFromTemplates } from "@/lib/queries/academic-sessions";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parentIdParam = url.searchParams.get("parent_id");
    const requestedType = url.searchParams.get("type")?.toLowerCase();

    // If subcategories for a specific parent are requested
    if (parentIdParam) {
      const parentId = Number(parentIdParam);
      const subRes = await db.query(
        `SELECT id, name, slug, parent_id, depth, category_type, business_category_id 
         FROM categories 
         WHERE (parent_id = $1 OR business_category_id = $1)
           AND COALESCE(is_deleted, false) = false 
           AND is_active = true 
         ORDER BY name ASC`,
        [parentId]
      );
      return NextResponse.json({
        success: true,
        subcategories: subRes.rows,
        data: subRes.rows,
      });
    }

    const [types, cats, businesses] = await Promise.all([
      db.query(
        `SELECT id, name, slug FROM institution_types WHERE COALESCE(is_deleted, false) = false ORDER BY id ASC`
      ),
      db.query(
        `SELECT id, name, slug, parent_id, depth, category_type, business_category_id, business_subcategory_id 
         FROM categories 
         WHERE COALESCE(is_deleted, false) = false AND is_active = true 
         ORDER BY name ASC`
      ),
      db.query(
        `SELECT id, name, slug, category_id, subcategory_id, city, state, country_code
         FROM business_profiles 
         WHERE COALESCE(is_active, true) = true AND COALESCE(is_deleted, false) = false 
         ORDER BY name ASC`
      ).catch(() => ({ rows: [] })),
    ]);

    const allCats = cats.rows;
    const parentIdSet = new Set(
      allCats
        .map((c: any) => c.parent_id ?? c.business_category_id)
        .filter(Boolean)
        .map(Number)
    );

    const PRIORITY_BUSINESS_ROOTS = [
      "Healthcare & Medical",
      "Salons & Personal Care",
      "Food, Dining & Cafes",
      "Retail & Shopping",
      "Automotive & Transport",
      "Fitness & Sports",
      "Education & Coaching",
      "Real Estate & Construction",
      "IT & Digital Agencies",
      "Professional & Financial Services",
      "Hospitality & Events",
      "Home Services & Maintenance"
    ];

    // Filter root categories (parent_id IS NULL or depth <= 1) that have subcategories or are recognized sectors
    const businessRootCategories = allCats
      .filter(
        (c: any) =>
          c.category_type === "business" &&
          (!c.parent_id || c.depth === 1 || c.depth === 0)
      )
      .sort((a: any, b: any) => {
        const aIdx = PRIORITY_BUSINESS_ROOTS.indexOf(a.name);
        const bIdx = PRIORITY_BUSINESS_ROOTS.indexOf(b.name);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

    const professionalRootCategories = allCats
      .filter(
        (c: any) =>
          c.category_type === "professional" &&
          (!c.parent_id || c.depth === 1 || c.depth === 0)
      )
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    const currentUser = await getAuthenticatedUser(req).catch(() => null);
    let userProfileCount = 0;
    if (currentUser?.id) {
      const [bizCountRes, profCountRes, instMemRes, instCreatedRes] = await Promise.all([
        db.query(`SELECT 1 FROM business_profiles WHERE user_id = $1 AND COALESCE(is_deleted, false) = false LIMIT 1`, [currentUser.id]).catch(() => ({ rowCount: 0 })),
        db.query(`SELECT 1 FROM professional_profiles WHERE user_id = $1 AND COALESCE(is_deleted, false) = false LIMIT 1`, [currentUser.id]).catch(() => ({ rowCount: 0 })),
        db.query(`SELECT 1 FROM institution_memberships WHERE user_id = $1 AND is_active = true AND COALESCE(is_deleted, false) = false LIMIT 1`, [currentUser.id]).catch(() => ({ rowCount: 0 })),
        db.query(`SELECT 1 FROM institution_profiles WHERE created_by = $1 AND COALESCE(is_deleted, false) = false LIMIT 1`, [currentUser.id]).catch(() => ({ rowCount: 0 })),
      ]);
      userProfileCount = (bizCountRes?.rowCount ?? 0) + (profCountRes?.rowCount ?? 0) + (instMemRes?.rowCount ?? 0) + (instCreatedRes?.rowCount ?? 0);
    }

    const resolvedCategories = requestedType === "professional"
      ? (professionalRootCategories.length > 0 ? professionalRootCategories : allCats.filter((c: any) => c.category_type === "professional"))
      : businessRootCategories;

    return NextResponse.json({
      success: true,
      data: types.rows,
      institutionTypes: types.rows,
      categories: resolvedCategories,
      businessCategories: businessRootCategories,
      professionalCategories:
        professionalRootCategories.length > 0
          ? professionalRootCategories
          : allCats.filter((c: any) => c.category_type === "professional"),
      subcategories: allCats,
      businesses: businesses.rows,
      userProfileCount,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isPlatformAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Platform administrators cannot create business or professional accounts." },
        { status: 403 }
      );
    }

    if (isStaffUser(currentUser)) {
      return NextResponse.json(
        { error: "Staff members cannot create business or professional profiles. Only independent business owners can add a profile." },
        { status: 403 }
      );
    }

    if (!isPlatformAdminUser(currentUser)) {
      const [bizCountRes, profCountRes, instMemRes, instCreatedRes] = await Promise.all([
        db.query(`SELECT 1 FROM business_profiles WHERE user_id = $1 AND COALESCE(is_deleted, false) = false LIMIT 1`, [currentUser.id]).catch(() => ({ rowCount: 0 })),
        db.query(`SELECT 1 FROM professional_profiles WHERE user_id = $1 AND COALESCE(is_deleted, false) = false LIMIT 1`, [currentUser.id]).catch(() => ({ rowCount: 0 })),
        db.query(`SELECT 1 FROM institution_memberships WHERE user_id = $1 AND is_active = true AND COALESCE(is_deleted, false) = false LIMIT 1`, [currentUser.id]).catch(() => ({ rowCount: 0 })),
        db.query(`SELECT 1 FROM institution_profiles WHERE created_by = $1 AND COALESCE(is_deleted, false) = false LIMIT 1`, [currentUser.id]).catch(() => ({ rowCount: 0 })),
      ]);
      const totalProfiles = (bizCountRes?.rowCount ?? 0) + (profCountRes?.rowCount ?? 0) + (instMemRes?.rowCount ?? 0) + (instCreatedRes?.rowCount ?? 0);
      if (totalProfiles >= 1) {
        return NextResponse.json(
          { error: "Only 1 account can add 1 business profile or professional profile. You have already registered a profile." },
          { status: 400 }
        );
      }
    }

    const body = await req.json();
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Business / Institution name is required" }, { status: 400 });
    }

    let institutionTypeId = body.institutionTypeId ? Number(body.institutionTypeId) : null;
    const phone = body.phone?.trim() || currentUser.phone || null;
    const email = body.email?.trim() || currentUser.email || null;
    const website = body.website?.trim() || null;
    const about = body.about?.trim() || null;
    const establishedYear = body.establishedYear ? Number(body.establishedYear) : null;

    const categoryId = body.categoryId ? Number(body.categoryId) : null;
    const subcategoryId = body.subcategoryId ? Number(body.subcategoryId) : null;
    const categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds.map(Number).filter(Boolean) : (categoryId ? [categoryId] : []);
    const subcategoryIds = Array.isArray(body.subcategoryIds) ? body.subcategoryIds.map(Number).filter(Boolean) : (subcategoryId ? [subcategoryId] : []);
    const businessStartedDate = body.businessStartedDate ? body.businessStartedDate : null;
    const galleryImages = Array.isArray(body.galleryImages) ? body.galleryImages : [];
    const portfolioImages = Array.isArray(body.portfolioImages) ? body.portfolioImages : [];
    const experienceYears = body.experienceYears != null ? Number(body.experienceYears) : 0;
    const designation = body.designation?.trim() || body.professionalTitle?.trim() || null;
    const businessProfileId = body.businessProfileId ? Number(body.businessProfileId) : null;
    const skills = Array.isArray(body.skills)
      ? body.skills.map((s: any) => String(s).trim()).filter(Boolean)
      : (body.skills ? String(body.skills).split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    const countryCode = (body.countryCode || "IN").toUpperCase();
    const state = body.state?.trim() || null;
    const district = body.district?.trim() || null;
    const city = body.city?.trim() || null;
    const locality = body.locality?.trim() || null;
    const postalCode = body.postalCode?.trim() || null;
    const address = body.address?.trim() || null;
    const latitude = body.latitude ? Number(body.latitude) : null;
    const longitude = body.longitude ? Number(body.longitude) : null;
    const whatsapp = body.whatsapp?.trim() || null;
    const socialLinks = typeof body.socialLinks === "object" && body.socialLinks !== null ? body.socialLinks : {};
    const openingHours = typeof body.openingHours === "object" && body.openingHours !== null ? body.openingHours : {};
    const branches = Array.isArray(body.branches) ? body.branches : [];
    const logoUrl = body.logoUrl?.trim() || null;
    const bannerUrl = body.bannerUrl?.trim() || null;
    let businessType = body.businessType?.trim() || "Business";
    const isVerified = Boolean(body.isVerified);
    const isFeatured = Boolean(body.isFeatured);

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Resolve business type from category if categoryId is provided
      const targetCatId = categoryId || (categoryIds[0] || null);
      if (targetCatId) {
        const catRes = await client.query<{ id: number; name: string; slug: string }>(
          `SELECT id, name, slug FROM categories WHERE id = $1 LIMIT 1`,
          [targetCatId]
        );
        if (catRes.rows.length > 0) {
          const catNorm = (catRes.rows[0].name + " " + catRes.rows[0].slug).toLowerCase();
          const allTypesRes = await client.query<{ id: number; name: string; slug: string }>(
            `SELECT id, name, slug FROM institution_types WHERE COALESCE(is_deleted, false) = false ORDER BY id ASC`
          );
          const allTypes = allTypesRes.rows;

          let matchedType: { id: number; name: string } | null = null;
          // Match precisely against all main business categories
          if (/\b(salon|beauty|parlour|spa|massage|hair|barber|nail|laser)\b/i.test(catNorm)) {
            matchedType = allTypes.find((t) => t.slug === "salons-and-personal-care" || t.name.toLowerCase().includes("salon")) || null;
          } else if (/\b(food|dining|cafe|restaurant|bakery|confectionery|cloud kitchen|sweet|fast food|bar|pub|cater)\b/i.test(catNorm)) {
            matchedType = allTypes.find((t) => t.slug === "food-dining-and-cafes" || t.name.toLowerCase().includes("food")) || null;
          } else if (/\b(auto|automotive|car|transport|bike|garage|vehicle|repair shop)\b/i.test(catNorm)) {
            matchedType = allTypes.find((t) => t.slug === "automotive-and-transport" || t.name.toLowerCase().includes("automotive")) || null;
          } else if (/\b(fitness|sport|sports|gym|yoga|trainer|crossfit|martial arts)\b/i.test(catNorm)) {
            matchedType = allTypes.find((t) => t.slug === "fitness-and-sports" || t.name.toLowerCase().includes("fitness")) || null;
          } else if (/\b(real estate|construction|builder|property|developer|architect|interior)\b/i.test(catNorm)) {
            matchedType = allTypes.find((t) => t.slug === "real-estate-and-construction" || t.name.toLowerCase().includes("real estate")) || null;
          } else if (/\b(hospitality|event|wedding|banquet|hotel|resort|party lawn)\b/i.test(catNorm)) {
            matchedType = allTypes.find((t) => t.slug === "hospitality-and-events" || t.name.toLowerCase().includes("hospitality")) || null;
          } else if (/\b(home service|cleaning|plumbing|electric|carpenter|pest control|appliance)\b/i.test(catNorm)) {
            matchedType = allTypes.find((t) => t.slug === "home-services-and-maintenance" || t.name.toLowerCase().includes("home service")) || null;
          } else if (catNorm.includes("digital") || /\b(it|agency|agencies|software|tech|developer|development|cyber)\b/i.test(catNorm)) {
            matchedType = allTypes.find((t) => t.slug === "it-and-digital-agencies" || t.slug === "it-digital-agency" || t.name.toLowerCase().includes("digital")) || null;
          } else if (/\b(health|healthcare|clinic|medical|doctor|hospital|dental|pharmacy)\b/i.test(catNorm)) {
            matchedType = allTypes.find((t) => t.slug === "healthcare-and-medical" || t.slug === "healthcare-clinic" || t.name.toLowerCase().includes("healthcare")) || null;
          } else if (/\b(retail|shopping|supermarket|grocer|store|mart|market|shop|apparel|cloth|footwear|electronics|stationery)\b/i.test(catNorm)) {
            matchedType = allTypes.find((t) => t.slug === "retail-and-shopping" || t.slug === "retail-commerce" || t.name.toLowerCase().includes("retail")) || null;
          } else if (/\b(professional|financial|finance|tax|legal|law|audit|consult|accounting|advocate|ca firm)\b/i.test(catNorm)) {
            matchedType = allTypes.find((t) => t.slug === "professional-and-financial-services" || t.slug === "professional-services" || t.name.toLowerCase().includes("financial")) || null;
          } else if (/\b(coaching|tuition|entrance|competitive)\b/i.test(catNorm)) {
            matchedType = allTypes.find((t) => t.slug === "coaching" || t.name.toLowerCase().includes("coaching")) || null;
          } else if (/\b(school|k12|cbse|icse|secondary|primary|matric)\b/i.test(catNorm)) {
            matchedType = allTypes.find((t) => t.slug === "school" || t.name.toLowerCase() === "school") || null;
          } else if (/\b(college|degree|undergraduate)\b/i.test(catNorm)) {
            matchedType = allTypes.find((t) => t.slug === "college" || t.name.toLowerCase() === "college") || null;
          } else if (/\b(university|campus)\b/i.test(catNorm)) {
            matchedType = allTypes.find((t) => t.slug === "university" || t.name.toLowerCase() === "university") || null;
          } else if (/\b(education|institute|institution|academy|training)\b/i.test(catNorm)) {
            matchedType = allTypes.find((t) => t.slug === "education-and-coaching" || t.slug === "institute" || t.name.toLowerCase().includes("education")) || null;
          }

          if (matchedType) {
            institutionTypeId = matchedType.id;
            businessType = matchedType.name;
          }
        }
      }

      // If type not provided or resolved, find or fallback
      if (!institutionTypeId) {
        const typeRes = await client.query<{ id: number }>(
          `SELECT id FROM institution_types WHERE COALESCE(is_deleted, false) = false ORDER BY id ASC LIMIT 1`
        );
        institutionTypeId = typeRes.rows[0]?.id;
        if (!institutionTypeId) {
          const newType = await client.query<{ id: number }>(
            `INSERT INTO institution_types (name, slug, is_active, created_at, updated_at)
             VALUES ('Institute', 'institute', true, NOW(), NOW())
             RETURNING id`
          );
          institutionTypeId = newType.rows[0]?.id;
        }
      }

      // Generate unique slug
      const rawSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      let candidateSlug = rawSlug || "business";
      let suffix = 1;
      while (true) {
        const chk = await client.query(`SELECT id FROM institution_profiles WHERE slug = $1 LIMIT 1`, [candidateSlug]);
        if (chk.rows.length === 0) break;
        candidateSlug = `${rawSlug}-${suffix++}`;
      }

      // Insert institution profile
      const instRes = await client.query<{ id: number; name: string; slug: string }>(
        `INSERT INTO institution_profiles (
           name, slug, institution_type_id, phone, email, website, about, established_year,
           is_active, is_marketplace_enabled, is_deleted, created_by, updated_by, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true, false, $9, $9, NOW(), NOW())
         RETURNING id, name, slug`,
        [name, candidateSlug, institutionTypeId, phone, email, website, about, establishedYear, currentUser.id]
      );

      const newInst = instRes.rows[0];

      let insertedBizId: number | null = null;
      let insertedProfId: number | null = null;

      // Insert into business_profiles or professional_profiles
      const profileType = body.profileType === "professional" ? "professional" : "business";
      const targetUserId = body.userId ? Number(body.userId) : currentUser.id;

      if (profileType === "business") {
        // RULE 1: In 1 profile, only 1 business can be added
        if (body.institutionProfileId) {
          const instBiz = await client.query(
            `SELECT id, name FROM business_profiles 
             WHERE institution_profile_id = $1 AND COALESCE(is_active, true) = true
             LIMIT 1`,
            [Number(body.institutionProfileId)]
          );
          if (instBiz.rows.length > 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              { error: `This profile already has an active business (${instBiz.rows[0].name}). In one profile, only 1 business can be added.` },
              { status: 400 }
            );
          }
        } else {
          const userBiz = await client.query(
            `SELECT id, name FROM business_profiles 
             WHERE user_id = $1 AND COALESCE(is_active, true) = true
             LIMIT 1`,
            [targetUserId]
          );
          if (userBiz.rows.length > 0 && !isPlatformAdminUser(currentUser) && !body.allowMultiple) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              { error: `This profile already has an active business (${userBiz.rows[0].name}). In one profile, only 1 business can be added.` },
              { status: 400 }
            );
          }
        }

        const bizInsertRes = await client.query(
          `INSERT INTO business_profiles (
             user_id, institution_profile_id, name, slug, business_type,
             category_id, subcategory_id, category_ids, subcategory_ids,
             country_code, state, district, city, locality, postal_code, address,
             latitude, longitude, phone, whatsapp, email, website, social_links, opening_hours, branches,
             logo_url, banner_url, gallery_images, about, custom_description, established_year, business_started_date,
             is_verified, verification_status, is_featured, is_active
           ) VALUES (
             $1, $2, $3, $4, $5,
             $6, $7, $8, $9,
             $10, $11, $12, $13, $14, $15, $16,
             $17, $18, $19, $20, $21, $22, $23, $24, $25,
             $26, $27, $28, $29, $30, $31, $32,
             $33, $34, $35, true
           ) RETURNING id`,
          [
            currentUser.id, newInst.id, name, candidateSlug, businessType,
            categoryId || (categoryIds[0] || null), subcategoryId || (subcategoryIds[0] || null), categoryIds, subcategoryIds,
            countryCode, state, district, city, locality, postalCode, address,
            latitude, longitude, phone, whatsapp, email, website, JSON.stringify(socialLinks), JSON.stringify(openingHours), JSON.stringify(branches),
            logoUrl, bannerUrl, galleryImages, about, about, establishedYear, businessStartedDate,
            isVerified, isVerified ? 'verified' : 'pending', isFeatured
          ]
        );
        insertedBizId = bizInsertRes.rows[0]?.id || null;
      } else {
        // RULE 2 & 3:
        // - Under one business: multiple professionals can be added (businessProfileId != null)
        // - Without a business (direct listing): only 1 professional account can be created in that profile
        if (!businessProfileId) {
          const directProfCheck = await client.query(
            `SELECT id, name FROM professional_profiles 
             WHERE user_id = $1 AND business_profile_id IS NULL AND COALESCE(is_active, true) = true
             LIMIT 1`,
            [targetUserId]
          );
          if (directProfCheck.rows.length > 0 && !isPlatformAdminUser(currentUser) && !body.allowMultiple) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              {
                error: `This profile already has an independent professional account (${directProfCheck.rows[0].name}). When listing directly without a business, only 1 professional account can be created per profile. To add multiple professionals, assign them under a business profile.`,
              },
              { status: 400 }
            );
          }
        }

        const profInsertRes = await client.query(
          `INSERT INTO professional_profiles (
             user_id, institution_profile_id, business_profile_id, name, slug, profession_type,
             designation, professional_title, skills,
             category_id, subcategory_id, category_ids, subcategory_ids,
             country_code, state, district, city, locality, postal_code, address,
             latitude, longitude, phone, whatsapp, email, website, working_hours,
             avatar_url, banner_url, portfolio_images, introduction, about, experience_years,
             is_verified, verification_status, is_featured, is_active
           ) VALUES (
             $1, $2, $3, $4, $5, $6,
             $7, $8, $9,
             $10, $11, $12, $13,
             $14, $15, $16, $17, $18, $19, $20,
             $21, $22, $23, $24, $25, $26, $27,
             $28, $29, $30, $31, $32, $33,
             $34, $35, $36, true
           ) RETURNING id`,
          [
            currentUser.id, newInst.id, businessProfileId, name, candidateSlug, designation || body.professionType || 'Professional',
            designation, designation || body.professionType || 'Professional', skills,
            categoryId || (categoryIds[0] || null), subcategoryId || (subcategoryIds[0] || null), categoryIds, subcategoryIds,
            countryCode, state, district, city, locality, postalCode, address,
            latitude, longitude, phone, whatsapp, email, website, JSON.stringify(openingHours),
            logoUrl, bannerUrl, portfolioImages, body.introduction || null, about, experienceYears,
            isVerified, isVerified ? 'verified' : 'pending', isFeatured
          ]
        );
        insertedProfId = profInsertRes.rows[0]?.id || null;
      }

      // Setup academic sessions
      try {
        await syncInstitutionAcademicYearsFromTemplates(client, [newInst.id], currentUser.id);
      } catch (sessionErr) {
        console.error("[create-business] sync academic session error:", sessionErr);
      }

      // Setup 1-year active subscription
      try {
        const pkgRes = await client.query<{ id: number }>(
          `SELECT id FROM sales_packages WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY id ASC LIMIT 1`
        );
        const packageId = pkgRes.rows[0]?.id || 1;
        await client.query(
          `INSERT INTO institution_subscriptions (
             institution_id, package_id, status, starts_at, expires_at, storage_limit_gb,
             price, price_unit, validity_count, validity_unit, created_by, updated_by
           ) VALUES ($1, $2, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 500, 0, 'year', 1, 'year', $3, $3)
           ON CONFLICT DO NOTHING`,
          [newInst.id, packageId, currentUser.id]
        );
      } catch (subErr) {
        console.error("[create-business] subscription error:", subErr);
      }

      // Find institution_admin role id
      const roleRes = await client.query<{ id: number }>(
        `SELECT id FROM roles WHERE code = 'institution_admin' AND COALESCE(is_deleted, false) = false LIMIT 1`
      );
      const adminRoleId = roleRes.rows[0]?.id || 7;

      // Attach creator as active institution_admin member
      await client.query(
        `INSERT INTO institution_memberships (
           institution_id, user_id, role_id, is_active, status, join_date, is_current
         ) VALUES ($1, $2, $3, true, 'ACTIVE', CURRENT_TIMESTAMP, true)
         ON CONFLICT (institution_id, user_id)
         DO UPDATE SET
           role_id = EXCLUDED.role_id,
           is_active = true,
           status = 'ACTIVE',
           is_current = true,
           is_deleted = false,
           updated_at = NOW()`,
        [newInst.id, currentUser.id, adminRoleId]
      );

      // Ensure user has role in user_roles
      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [currentUser.id, adminRoleId]
      ).catch(() => { });

      // Add profile-specific role (business_owner or professional_provider)
      const specificRoleCode = profileType === "professional" ? "professional_provider" : "business_owner";
      const specRoleRes = await client.query<{ id: number }>(
        `SELECT id FROM roles WHERE code = $1 AND COALESCE(is_deleted, false) = false LIMIT 1`,
        [specificRoleCode]
      );
      if (specRoleRes.rows[0]?.id) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [currentUser.id, specRoleRes.rows[0].id]
        ).catch(() => { });
      }

      // Ensure customer role is also attached
      const custRoleRes = await client.query<{ id: number }>(
        `SELECT id FROM roles WHERE code IN ('customer', 'client') AND COALESCE(is_deleted, false) = false ORDER BY id ASC LIMIT 1`
      );
      if (custRoleRes.rows[0]?.id) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [currentUser.id, custRoleRes.rows[0].id]
        ).catch(() => { });
      }

      // Update user_profiles under_institution_id if present
      await client.query(
        `UPDATE user_profiles
         SET under_institution_id = $1, updated_at = NOW()
         WHERE user_id = $2`,
        [newInst.id, currentUser.id]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        data: {
          id: newInst.id,
          profileId: insertedBizId || insertedProfId,
          name: newInst.name,
          slug: newInst.slug,
          roleName: "Institution Admin",
        },
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.error("[create-business] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create business profile" },
      { status: 500 }
    );
  }
}

