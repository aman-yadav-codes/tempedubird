import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { syncInstitutionAcademicYearsFromTemplates } from "@/lib/queries/academic-sessions";

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = currentUser.id;

    // Fetch assigned user roles
    const rolesRes = await db.query<{ id: number; name: string; code: string }>(
      `SELECT r.id, r.name, r.code
       FROM user_roles ur
       INNER JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND COALESCE(r.is_deleted, false) = false
       ORDER BY r.id ASC`,
      [userId]
    );

    // Fetch business profile(s)
    const businessRes = await db.query(
      `SELECT * FROM business_profiles
       WHERE user_id = $1
       ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    // Fetch professional profile(s)
    const profRes = await db.query(
      `SELECT * FROM professional_profiles
       WHERE user_id = $1
       ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    const roles = rolesRes.rows;
    const roleCodes = roles.map((r) => r.code);

    const businessProfile = businessRes.rows[0] || null;
    const professionalProfile = profRes.rows[0] || null;

    const hasCustomer = roleCodes.includes("customer") || roleCodes.includes("client") || (!businessProfile && !professionalProfile);
    const hasBusiness = Boolean(businessProfile) || roleCodes.includes("business_owner");
    const hasProfessional = Boolean(professionalProfile) || roleCodes.includes("professional_provider");

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: currentUser.id,
          fullName: currentUser.full_name,
          email: currentUser.email,
          phone: currentUser.phone,
        },
        roles,
        roleCodes,
        businessProfile,
        professionalProfile,
        capabilities: {
          hasCustomer,
          hasBusiness,
          hasProfessional,
        },
      },
    });
  } catch (err: unknown) {
    console.error("[roles-profiles GET] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch roles and profiles" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const profileType = body.profileType === "professional" ? "professional" : "business";
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { error: profileType === "business" ? "Business name is required" : "Professional name is required" },
        { status: 400 }
      );
    }

    const phone = body.phone?.trim() || currentUser.phone || null;
    const email = body.email?.trim() || currentUser.email || null;
    const website = body.website?.trim() || null;
    const whatsapp = body.whatsapp?.trim() || null;
    const city = body.city?.trim() || null;
    const district = body.district?.trim() || null;
    const state = body.state?.trim() || null;
    const locality = body.locality?.trim() || null;
    const address = body.address?.trim() || null;
    const postalCode = body.postalCode?.trim() || null;
    const countryCode = body.countryCode?.trim() || "IN";
    const about = body.about?.trim() || null;
    const categoryId = body.categoryId ? Number(body.categoryId) : null;
    const subcategoryId = body.subcategoryId ? Number(body.subcategoryId) : null;
    const subcategoryIds = Array.isArray(body.subcategoryIds) ? body.subcategoryIds : (Array.isArray(body.subcategory_ids) ? body.subcategory_ids : []);
    const latitude = body.latitude !== undefined && body.latitude !== null && body.latitude !== "" ? Number(body.latitude) : null;
    const longitude = body.longitude !== undefined && body.longitude !== null && body.longitude !== "" ? Number(body.longitude) : null;
    const logoUrl = body.logoUrl || body.logo_url || null;
    const bannerUrl = body.bannerUrl || body.banner_url || null;
    const galleryImages = Array.isArray(body.galleryImages) ? body.galleryImages : (Array.isArray(body.gallery_images) ? body.gallery_images : []);
    const openingHours = body.openingHours || body.opening_hours || null;
    const holidays = body.holidays || null;
    const socialLinks = body.socialLinks || body.social_links || null;
    const branches = Array.isArray(body.branches) ? body.branches : [];

    // Professional specific
    const professionalTitle = body.professionalTitle?.trim() || body.professional_title?.trim() || null;
    const introduction = body.introduction?.trim() || null;
    const avatarUrl = body.avatarUrl || body.avatar_url || null;
    const qualifications = body.qualifications || null;
    const certifications = body.certifications || null;
    const portfolioImages = Array.isArray(body.portfolioImages) ? body.portfolioImages : (Array.isArray(body.portfolio_images) ? body.portfolio_images : []);
    const workingHours = body.workingHours || body.working_hours || null;
    const serviceAreas = Array.isArray(body.serviceAreas) ? body.serviceAreas : (Array.isArray(body.service_areas) ? body.service_areas : []);
    const remoteAvailable = body.remoteAvailable !== undefined ? Boolean(body.remoteAvailable) : true;
    const onsiteAvailable = body.onsiteAvailable !== undefined ? Boolean(body.onsiteAvailable) : true;

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Find role for this profile type
      const targetRoleCode = profileType === "business" ? "business_owner" : "professional_provider";
      const roleRes = await client.query<{ id: number }>(
        `SELECT id FROM roles WHERE code = $1 AND COALESCE(is_deleted, false) = false LIMIT 1`,
        [targetRoleCode]
      );
      if (roleRes.rows[0]?.id) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [currentUser.id, roleRes.rows[0].id]
        );
      }

      // Also ensure customer role remains attached
      const customerRoleRes = await client.query<{ id: number }>(
        `SELECT id FROM roles WHERE code IN ('customer', 'client') AND COALESCE(is_deleted, false) = false ORDER BY id ASC LIMIT 1`
      );
      if (customerRoleRes.rows[0]?.id) {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [currentUser.id, customerRoleRes.rows[0].id]
        );
      }

      // Create or update institution profile for workspace compatibility
      let instId = body.institutionProfileId ? Number(body.institutionProfileId) : null;
      if (!instId) {
        // Generate slug
        const rawSlug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        let candidateSlug = rawSlug || (profileType === "business" ? "business" : "pro");
        let suffix = 1;
        while (true) {
          const chk = await client.query(`SELECT id FROM institution_profiles WHERE slug = $1 LIMIT 1`, [candidateSlug]);
          if (chk.rows.length === 0) break;
          candidateSlug = `${rawSlug}-${suffix++}`;
        }

        // Get default institution type
        const typeRes = await client.query<{ id: number }>(
          `SELECT id FROM institution_types WHERE COALESCE(is_deleted, false) = false ORDER BY id ASC LIMIT 1`
        );
        const typeId = typeRes.rows[0]?.id || 1;

        const instRes = await client.query<{ id: number; name: string; slug: string }>(
          `INSERT INTO institution_profiles (
             name, slug, institution_type_id, phone, email, website, about,
             is_active, is_marketplace_enabled, is_deleted, created_by, updated_by, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, false, $8, $8, NOW(), NOW())
           RETURNING id, name, slug`,
          [name, candidateSlug, typeId, phone, email, website, about, currentUser.id]
        );
        instId = instRes.rows[0].id;

        // Link institution membership as admin
        const adminRole = await client.query<{ id: number }>(
          `SELECT id FROM roles WHERE code = 'institution_admin' AND COALESCE(is_deleted, false) = false LIMIT 1`
        );
        const adminRoleId = adminRole.rows[0]?.id || 7;

        await client.query(
          `INSERT INTO institution_memberships (
             institution_id, user_id, role_id, is_active, status, join_date, is_current
           ) VALUES ($1, $2, $3, true, 'ACTIVE', CURRENT_TIMESTAMP, true)
           ON CONFLICT (institution_id, user_id)
           DO UPDATE SET is_active = true, status = 'ACTIVE', is_current = true, updated_at = NOW()`,
          [instId, currentUser.id, adminRoleId]
        );

        // Ensure user_roles has institution_admin as well
        await client.query(
          `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [currentUser.id, adminRoleId]
        );

        // Setup academic sessions if needed
        try {
          await syncInstitutionAcademicYearsFromTemplates(client, [instId], currentUser.id);
        } catch (_) {}
      }

      let resultRecord = null;

      if (profileType === "business") {
        const businessType = body.businessType?.trim() || "Business";
        const establishedYear = body.establishedYear ? Number(body.establishedYear) : null;

        // Check if user already has a business profile
        const existingBp = await client.query<{ id: number }>(
          `SELECT id FROM business_profiles WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
          [currentUser.id]
        );

        if (existingBp.rows.length > 0) {
          const bpId = existingBp.rows[0].id;
          const updateRes = await client.query(
            `UPDATE business_profiles
             SET name = $1, business_type = $2, phone = $3, email = $4, website = $5,
                 city = $6, state = $7, locality = $8, address = $9, postal_code = $10,
                 country_code = $11, about = $12, established_year = $13,
                 category_id = $14, subcategory_id = $15,
                 district = COALESCE($16, district),
                 whatsapp = COALESCE($17, whatsapp),
                 latitude = COALESCE($18, latitude),
                 longitude = COALESCE($19, longitude),
                 logo_url = COALESCE($20, logo_url),
                 banner_url = COALESCE($21, banner_url),
                 gallery_images = CASE WHEN $22::text[] IS NOT NULL AND array_length($22::text[], 1) > 0 THEN $22::text[] ELSE gallery_images END,
                 opening_hours = COALESCE($23::jsonb, opening_hours),
                 holidays = COALESCE($24::jsonb, holidays),
                 social_links = COALESCE($25::jsonb, social_links),
                 branches = CASE WHEN $26::jsonb IS NOT NULL THEN $26::jsonb ELSE branches END,
                 subcategory_ids = CASE WHEN $27::int[] IS NOT NULL AND array_length($27::int[], 1) > 0 THEN $27::int[] ELSE subcategory_ids END,
                 updated_at = NOW()
             WHERE id = $28
             RETURNING *`,
            [
              name, businessType, phone, email, website,
              city, state, locality, address, postalCode,
              countryCode, about, establishedYear,
              categoryId, subcategoryId,
              district, whatsapp, latitude, longitude,
              logoUrl, bannerUrl, galleryImages,
              openingHours ? JSON.stringify(openingHours) : null,
              holidays ? JSON.stringify(holidays) : null,
              socialLinks ? JSON.stringify(socialLinks) : null,
              branches.length > 0 ? JSON.stringify(branches) : null,
              subcategoryIds,
              bpId
            ]
          );
          resultRecord = updateRes.rows[0];
        } else {
          const rawSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
          const bpSlug = `${rawSlug || "biz"}-${Date.now().toString(36)}`;
          const insertRes = await client.query(
            `INSERT INTO business_profiles (
               user_id, institution_profile_id, name, slug, business_type, phone, email, website,
               city, state, locality, address, postal_code, country_code, about, established_year,
               category_id, subcategory_id, district, whatsapp, latitude, longitude,
               logo_url, banner_url, gallery_images, opening_hours, holidays, social_links, branches, subcategory_ids,
               is_active, created_at, updated_at
             ) VALUES (
               $1, $2, $3, $4, $5, $6, $7, $8,
               $9, $10, $11, $12, $13, $14, $15, $16,
               $17, $18, $19, $20, $21, $22,
               $23, $24, $25::text[], $26::jsonb, $27::jsonb, $28::jsonb, $29::jsonb, $30::int[],
               true, NOW(), NOW()
             )
             RETURNING *`,
            [
              currentUser.id, instId, name, bpSlug, businessType, phone, email, website,
              city, state, locality, address, postalCode, countryCode, about, establishedYear,
              categoryId, subcategoryId, district, whatsapp, latitude, longitude,
              logoUrl, bannerUrl, galleryImages,
              openingHours ? JSON.stringify(openingHours) : null,
              holidays ? JSON.stringify(holidays) : null,
              socialLinks ? JSON.stringify(socialLinks) : null,
              branches.length > 0 ? JSON.stringify(branches) : null,
              subcategoryIds
            ]
          );
          resultRecord = insertRes.rows[0];
        }
      } else {
        const professionType = body.professionType?.trim() || "Professional";
        const experienceYears = body.experienceYears ? Number(body.experienceYears) : null;

        // Check if user already has a professional profile
        const existingPp = await client.query<{ id: number }>(
          `SELECT id FROM professional_profiles WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
          [currentUser.id]
        );

        if (existingPp.rows.length > 0) {
          const ppId = existingPp.rows[0].id;
          const updateRes = await client.query(
            `UPDATE professional_profiles
             SET name = $1, profession_type = $2, phone = $3, email = $4, website = $5,
                 city = $6, state = $7, locality = $8, address = $9, postal_code = $10,
                 country_code = $11, about = $12, experience_years = $13,
                 category_id = $14, subcategory_id = $15,
                 professional_title = COALESCE($16, professional_title),
                 introduction = COALESCE($17, introduction),
                 district = COALESCE($18, district),
                 whatsapp = COALESCE($19, whatsapp),
                 latitude = COALESCE($20, latitude),
                 longitude = COALESCE($21, longitude),
                 avatar_url = COALESCE($22, avatar_url),
                 banner_url = COALESCE($23, banner_url),
                 qualifications = COALESCE($24::jsonb, qualifications),
                 certifications = COALESCE($25::jsonb, certifications),
                 portfolio_images = CASE WHEN $26::text[] IS NOT NULL AND array_length($26::text[], 1) > 0 THEN $26::text[] ELSE portfolio_images END,
                 working_hours = COALESCE($27::jsonb, working_hours),
                 service_areas = CASE WHEN $28::text[] IS NOT NULL AND array_length($28::text[], 1) > 0 THEN $28::text[] ELSE service_areas END,
                 remote_available = $29,
                 onsite_available = $30,
                 subcategory_ids = CASE WHEN $31::int[] IS NOT NULL AND array_length($31::int[], 1) > 0 THEN $31::int[] ELSE subcategory_ids END,
                 updated_at = NOW()
             WHERE id = $32
             RETURNING *`,
            [
              name, professionType, phone, email, website,
              city, state, locality, address, postalCode,
              countryCode, about, experienceYears,
              categoryId, subcategoryId,
              professionalTitle, introduction, district, whatsapp, latitude, longitude,
              avatarUrl, bannerUrl,
              qualifications ? JSON.stringify(qualifications) : null,
              certifications ? JSON.stringify(certifications) : null,
              portfolioImages,
              workingHours ? JSON.stringify(workingHours) : null,
              serviceAreas,
              remoteAvailable, onsiteAvailable,
              subcategoryIds,
              ppId
            ]
          );
          resultRecord = updateRes.rows[0];
        } else {
          const rawSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
          const ppSlug = `${rawSlug || "pro"}-${Date.now().toString(36)}`;
          const insertRes = await client.query(
            `INSERT INTO professional_profiles (
               user_id, institution_profile_id, name, slug, profession_type, phone, email, website,
               city, state, locality, address, postal_code, country_code, about, experience_years,
               category_id, subcategory_id, professional_title, introduction, district, whatsapp, latitude, longitude,
               avatar_url, banner_url, qualifications, certifications, portfolio_images, working_hours, service_areas,
               remote_available, onsite_available, subcategory_ids,
               is_active, created_at, updated_at
             ) VALUES (
               $1, $2, $3, $4, $5, $6, $7, $8,
               $9, $10, $11, $12, $13, $14, $15, $16,
               $17, $18, $19, $20, $21, $22, $23, $24,
               $25, $26, $27::jsonb, $28::jsonb, $29::text[], $30::jsonb, $31::text[],
               $32, $33, $34::int[],
               true, NOW(), NOW()
             )
             RETURNING *`,
            [
              currentUser.id, instId, name, ppSlug, professionType, phone, email, website,
              city, state, locality, address, postalCode, countryCode, about, experienceYears,
              categoryId, subcategoryId, professionalTitle, introduction, district, whatsapp, latitude, longitude,
              avatarUrl, bannerUrl,
              qualifications ? JSON.stringify(qualifications) : null,
              certifications ? JSON.stringify(certifications) : null,
              portfolioImages,
              workingHours ? JSON.stringify(workingHours) : null,
              serviceAreas,
              remoteAvailable, onsiteAvailable, subcategoryIds
            ]
          );
          resultRecord = insertRes.rows[0];
        }
      }

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        data: resultRecord,
        profileType,
        institutionId: instId,
        message: `${profileType === "business" ? "Business" : "Professional"} profile saved successfully!`,
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.error("[roles-profiles POST] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save profile" },
      { status: 500 }
    );
  }
}

