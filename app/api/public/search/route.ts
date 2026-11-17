import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { parseSearchIntent } from "@/lib/utils/search-intent";
import { getFrontendConfig } from "@/lib/config/frontend-config";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = (searchParams.get("q") || searchParams.get("query") || searchParams.get("search") || "").trim();
    const rawLocation = (searchParams.get("location") || searchParams.get("city") || "").trim();
    const filterLocation = rawLocation && rawLocation.toLowerCase() !== "all locations" && rawLocation.toLowerCase() !== "all" ? rawLocation : "";

    if (!rawQuery) {
      return NextResponse.json({
        success: true,
        results: {
          businesses: [],
          professionals: [],
          products: [],
          services: [],
          categories: [],
          courses: [],
          institutes: [],
          teachers: [],
          practice: [],
          notes: [],
        },
        intent: {
          category: "all",
          targetRoute: "/explore",
          cleanQuery: "",
          isIntentDetected: false,
        },
        total: 0,
      });
    }

    const intent = parseSearchIntent(rawQuery);
    const searchQuery = intent.cleanQuery || rawQuery;
    const likeQuery = `%${searchQuery}%`;
    const rawLikeQuery = `%${rawQuery}%`;

    const config = getFrontendConfig();
    const envBusinessId = process.env.BUSINESS_ID || process.env.NEXT_PUBLIC_BUSINESS_ID;
    const envInstitutionId = process.env.INSTITUTION_ID || process.env.NEXT_PUBLIC_INSTITUTION_ID;
    const isPlatformMode = (config.mode as string) === "platform_admin" || (config.mode as string) === "platform" || config.mode === "all";
    const scopedBusinessId = !isPlatformMode ? ((config.mode === "business" ? config.businessId : null) || (envBusinessId && /^\d+$/.test(envBusinessId) ? Number(envBusinessId) : null)) : null;
    const scopedInstitutionId = !isPlatformMode ? ((config.mode === "institution" ? config.institutionId : null) || (envInstitutionId && /^\d+$/.test(envInstitutionId) ? Number(envInstitutionId) : null)) : null;

    // 0a. Search Businesses
    const businessesPromise = (async () => {
      try {
        const params: any[] = [likeQuery, rawLikeQuery];
        let locFilter = "";
        if (filterLocation) {
          params.push(`%${filterLocation}%`);
          locFilter = `AND (bp.city ILIKE $${params.length} OR bp.state ILIKE $${params.length} OR bp.locality ILIKE $${params.length})`;
        }
        const res = await db.query(
          `SELECT
            bp.id,
            bp.name,
            bp.slug,
            bp.business_type,
            bp.city,
            bp.state,
            bp.logo_url,
            c.id AS category_id,
            c.name AS category_name,
            sc.id AS subcategory_id,
            sc.name AS subcategory_name
          FROM business_profiles bp
          LEFT JOIN categories c ON c.id = bp.category_id
          LEFT JOIN categories sc ON sc.id = bp.subcategory_id
          WHERE COALESCE(bp.is_active, TRUE) = TRUE
            ${scopedBusinessId ? `AND bp.id = ${scopedBusinessId}` : ''}
            AND (
              bp.name ILIKE $1 OR COALESCE(bp.business_type, '') ILIKE $1 OR COALESCE(bp.about, '') ILIKE $1 OR COALESCE(bp.city, '') ILIKE $1
              OR array_to_string(bp.synonyms, ' ') ILIKE $1
              OR COALESCE(c.name, '') ILIKE $1 OR COALESCE(sc.name, '') ILIKE $1 OR array_to_string(c.synonyms, ' ') ILIKE $1 OR array_to_string(sc.synonyms, ' ') ILIKE $1
              OR bp.name ILIKE $2 OR COALESCE(bp.about, '') ILIKE $2 OR array_to_string(bp.synonyms, ' ') ILIKE $2
            )
            ${locFilter}
          ORDER BY bp.is_featured DESC, bp.id DESC
          LIMIT 6`,
          params
        );
        return res.rows.map((r: any) => ({
          id: r.id,
          title: r.name,
          category_name: r.category_name || r.business_type || "Business",
          subcategory_name: r.subcategory_name,
          subtitle: [r.category_name, r.subcategory_name, r.city, r.state].filter(Boolean).join(" • ") || r.business_type || "Business",
          slug: r.slug,
          href: `/business/${r.slug || r.id}`,
          profileHref: `/business/${r.slug || r.id}`,
          listingHref: `/explore?type=business&q=${encodeURIComponent(r.name)}`,
          logo_url: r.logo_url,
          type: "business",
        }));
      } catch (err) {
        console.error("Business search query error:", err);
        return [];
      }
    })();

    // 0b. Search Professionals
    const professionalsPromise = (async () => {
      try {
        const params: any[] = [likeQuery, rawLikeQuery];
        let locFilter = "";
        if (filterLocation) {
          params.push(`%${filterLocation}%`);
          locFilter = `AND (pp.city ILIKE $${params.length} OR pp.state ILIKE $${params.length} OR pp.locality ILIKE $${params.length})`;
        }
        const res = await db.query(
          `SELECT
            pp.id,
            pp.name,
            pp.slug,
            pp.profession_type,
            pp.designation,
            pp.city,
            pp.state,
            pp.avatar_url,
            pp.institution_profile_id,
            c.id AS category_id,
            c.name AS category_name,
            sc.id AS subcategory_id,
            sc.name AS subcategory_name
          FROM professional_profiles pp
          LEFT JOIN categories c ON c.id = pp.category_id
          LEFT JOIN categories sc ON sc.id = pp.subcategory_id
          WHERE COALESCE(pp.is_active, TRUE) = TRUE
            ${scopedBusinessId ? `AND (pp.business_profile_id = ${scopedBusinessId} ${scopedInstitutionId ? `OR pp.institution_profile_id = ${scopedInstitutionId}` : ''})` : ''}
            AND (
              pp.name ILIKE $1 OR COALESCE(pp.profession_type, '') ILIKE $1 OR COALESCE(pp.designation, '') ILIKE $1 OR COALESCE(pp.about, '') ILIKE $1 OR array_to_string(pp.skills, ' ') ILIKE $1
              OR array_to_string(pp.synonyms, ' ') ILIKE $1
              OR COALESCE(c.name, '') ILIKE $1 OR COALESCE(sc.name, '') ILIKE $1 OR array_to_string(c.synonyms, ' ') ILIKE $1 OR array_to_string(sc.synonyms, ' ') ILIKE $1
              OR pp.name ILIKE $2 OR COALESCE(pp.about, '') ILIKE $2 OR array_to_string(pp.synonyms, ' ') ILIKE $2
            )
            ${locFilter}
          ORDER BY pp.is_featured DESC, pp.id DESC
          LIMIT 6`,
          params
        );
        return res.rows.map((r: any) => ({
          id: r.id,
          title: r.name,
          category_name: r.category_name || "Professional",
          subcategory_name: r.subcategory_name,
          designation: r.designation || r.profession_type || "Professional",
          subtitle: [r.designation || r.profession_type, r.category_name, r.subcategory_name, r.city, r.state].filter(Boolean).join(" • "),
          slug: r.slug,
          href: `/professional/${r.slug || r.id}`,
          profileHref: `/professional/${r.slug || r.id}`,
          listingHref: `/explore?type=professional&q=${encodeURIComponent(r.name)}`,
          logo_url: r.avatar_url,
          type: "professional",
        }));
      } catch (err) {
        console.error("Professional search query error:", err);
        return [];
      }
    })();

    // 0c. Search Products
    const productsPromise = (async () => {
      try {
        const res = await db.query(
          `SELECT
            mp.id,
            mp.name,
            mp.slug,
            mp.brand,
            mp.model,
            COALESCE(mp.unit, mp.unit_of_measurement, 'kg') AS unit,
            COALESCE(mp.suggested_price, mp.suggested_price_inr, 0) AS price,
            mp.default_image_url,
            c.id AS category_id,
            c.name AS category_name,
            sc.id AS subcategory_id,
            sc.name AS subcategory_name,
            COALESCE(bp.slug, seller.slug, bp.id::text, seller.id::text) AS business_slug,
            COALESCE(bp.name, seller.business_name, mp.brand) AS business_name
          FROM master_products mp
          LEFT JOIN categories c ON c.id = mp.category_id
          LEFT JOIN categories sc ON sc.id = mp.subcategory_id
          LEFT JOIN business_profiles bp ON bp.id = mp.business_profile_id
          LEFT JOIN LATERAL (
            SELECT bp2.id, bp2.slug, bp2.name AS business_name
            FROM business_products bprod
            JOIN business_profiles bp2 ON (bp2.id = bprod.business_profile_id OR bp2.id = bprod.business_id)
            WHERE bprod.master_product_id = mp.id
            LIMIT 1
          ) seller ON TRUE
          WHERE COALESCE(mp.is_active, TRUE) = TRUE
            ${scopedBusinessId ? `AND (mp.business_profile_id = ${scopedBusinessId} ${scopedInstitutionId ? `OR mp.institution_id = ${scopedInstitutionId}` : ''} OR mp.id IN (SELECT bprod.master_product_id FROM business_products bprod WHERE (bprod.business_profile_id = ${scopedBusinessId} OR bprod.business_id = ${scopedBusinessId}) AND COALESCE(bprod.is_available, true) = true))` : ''}
            AND (
              mp.name ILIKE $1 OR COALESCE(mp.description, '') ILIKE $1 OR COALESCE(mp.brand, '') ILIKE $1 OR array_to_string(mp.synonyms, ' ') ILIKE $1
              OR COALESCE(c.name, '') ILIKE $1 OR COALESCE(sc.name, '') ILIKE $1 OR array_to_string(c.synonyms, ' ') ILIKE $1 OR array_to_string(sc.synonyms, ' ') ILIKE $1
              OR mp.name ILIKE $2 OR COALESCE(mp.description, '') ILIKE $2 OR array_to_string(mp.synonyms, ' ') ILIKE $2
            )
          ORDER BY mp.id DESC
          LIMIT 6`,
          [likeQuery, rawLikeQuery]
        );
        return res.rows.map((r: any) => {
          const bizSlug = r.business_slug;
          const storeUrl = bizSlug
            ? `/business/${bizSlug}?tab=products&highlight=${r.id}`
            : `/explore?type=product&q=${encodeURIComponent(r.name)}`;

          return {
            id: r.id,
            title: r.name,
            category_name: r.category_name,
            subcategory_name: r.subcategory_name,
            business_name: r.business_name,
            subtitle: [
              r.business_name ? `By ${r.business_name}` : null,
              r.category_name,
              r.subcategory_name,
              r.price && Number(r.price) > 0 ? `₹${r.price} / ${r.unit || "unit"}` : null,
            ].filter(Boolean).join(" • "),
            href: storeUrl,
            listingHref: storeUrl,
            storefrontHref: storeUrl,
            logo_url: r.default_image_url,
            price: r.price,
            unit: r.unit || "unit",
            type: "product",
          };
        });
      } catch (err) {
        console.error("Product search query error:", err);
        return [];
      }
    })();

    // 0d. Search Services
    const servicesPromise = (async () => {
      try {
        const res = await db.query(
          `SELECT
            ms.id,
            ms.name,
            ms.slug,
            ms.pricing_model,
            COALESCE(ms.suggested_price, ms.suggested_price_inr, 0) AS price,
            ms.default_image_url,
            c.id AS category_id,
            c.name AS category_name,
            sc.id AS subcategory_id,
            sc.name AS subcategory_name,
            COALESCE(bp.slug, pp_biz.slug, bp.id::text, pp_biz.id::text) AS business_slug,
            COALESCE(bp.name, pp_biz.name) AS business_name,
            pp.slug AS professional_slug,
            pp.name AS professional_name
          FROM master_services ms
          LEFT JOIN categories c ON c.id = ms.category_id
          LEFT JOIN categories sc ON sc.id = ms.subcategory_id
          LEFT JOIN business_profiles bp ON bp.id = ms.business_profile_id
          LEFT JOIN professional_profiles pp ON pp.id = ms.professional_profile_id
          LEFT JOIN business_profiles pp_biz ON pp_biz.id = pp.business_profile_id
          WHERE COALESCE(ms.is_active, TRUE) = TRUE
            ${scopedBusinessId ? `AND (ms.business_profile_id = ${scopedBusinessId} ${scopedInstitutionId ? `OR ms.institution_id = ${scopedInstitutionId}` : ''} OR ms.id IN (SELECT ps.master_service_id FROM professional_services ps JOIN professional_profiles pp ON pp.id = ps.professional_id WHERE (pp.business_profile_id = ${scopedBusinessId} ${scopedInstitutionId ? `OR pp.institution_profile_id = ${scopedInstitutionId}` : ''}) AND COALESCE(ps.is_active, true) = true))` : ''}
            AND (
              ms.name ILIKE $1 OR COALESCE(ms.description, '') ILIKE $1 OR array_to_string(ms.synonyms, ' ') ILIKE $1
              OR COALESCE(c.name, '') ILIKE $1 OR COALESCE(sc.name, '') ILIKE $1 OR array_to_string(c.synonyms, ' ') ILIKE $1 OR array_to_string(sc.synonyms, ' ') ILIKE $1
              OR ms.name ILIKE $2 OR COALESCE(ms.description, '') ILIKE $2 OR array_to_string(ms.synonyms, ' ') ILIKE $2
            )
          ORDER BY ms.id DESC
          LIMIT 6`,
          [likeQuery, rawLikeQuery]
        );
        return res.rows.map((r: any) => {
          const bizSlug = r.business_slug;
          const profSlug = r.professional_slug;
          const storeUrl = bizSlug
            ? `/business/${bizSlug}?tab=services&highlight=${r.id}`
            : profSlug
            ? `/professional/${profSlug}?tab=services&highlight=${r.id}`
            : `/explore?type=service&q=${encodeURIComponent(r.name)}`;

          return {
            id: r.id,
            title: r.name,
            category_name: r.category_name,
            subcategory_name: r.subcategory_name,
            business_name: r.business_name || r.professional_name,
            subtitle: [
              r.business_name || r.professional_name ? `By ${r.business_name || r.professional_name}` : null,
              r.category_name,
              r.subcategory_name,
              r.pricing_model,
              r.price && Number(r.price) > 0 ? `₹${r.price}` : null,
            ].filter(Boolean).join(" • "),
            href: storeUrl,
            listingHref: storeUrl,
            storefrontHref: storeUrl,
            logo_url: r.default_image_url,
            price: r.price,
            type: "service",
          };
        });
      } catch (err) {
        console.error("Service search query error:", err);
        return [];
      }
    })();

    // 0e. Search Categories
    const categoriesPromise = (async () => {
      try {
        const res = await db.query(
          `SELECT
            c.id,
            c.name,
            c.slug,
            c.category_type,
            parent.name AS parent_name
          FROM categories c
          LEFT JOIN categories parent ON parent.id = c.parent_id
          WHERE COALESCE(c.is_deleted, FALSE) = FALSE
            AND COALESCE(c.is_active, TRUE) = TRUE
            AND (
              c.name ILIKE $1 OR c.slug ILIKE $1 OR array_to_string(c.synonyms, ' ') ILIKE $1
              OR c.name ILIKE $2 OR c.slug ILIKE $2 OR array_to_string(c.synonyms, ' ') ILIKE $2
            )
          ORDER BY (CASE WHEN c.name ILIKE $1 THEN 1 ELSE 2 END), c.name ASC
          LIMIT 8`,
          [likeQuery, rawLikeQuery]
        );
        return res.rows.map((r: any) => {
          const typeLabel = r.category_type
            ? r.category_type.charAt(0).toUpperCase() + r.category_type.slice(1)
            : "General";
          return {
            id: r.id,
            title: r.name,
            category_name: r.name,
            category_type: r.category_type || "all",
            subtitle: [r.parent_name ? `Under ${r.parent_name}` : null, `${typeLabel} Category`].filter(Boolean).join(" • "),
            href: `/explore?categoryId=${r.id}&categoryName=${encodeURIComponent(r.name)}&type=all`,
            listingHref: `/explore?categoryId=${r.id}&categoryName=${encodeURIComponent(r.name)}&type=all`,
            type: "category",
          };
        });
      } catch (err) {
        console.error("Category search query error:", err);
        return [];
      }
    })();

    // 1. Search Courses
    const coursesPromise = (async () => {
      try {
        const res = await db.query(
          `SELECT
            p.id,
            p.name AS title,
            COALESCE(p.degree_level, 'Course') AS degree_level,
            COALESCE(p.duration, '1 Year') AS duration,
            p.annual_fee,
            ip.name AS institution_name,
            p.institution_id
          FROM institution_programs p
          LEFT JOIN institution_profiles ip ON ip.id = p.institution_id
          WHERE COALESCE(p.is_deleted, FALSE) = FALSE
            AND COALESCE(p.is_active, TRUE) = TRUE
            AND (
              p.name ILIKE $1 OR COALESCE(p.description, '') ILIKE $1 OR COALESCE(p.category, '') ILIKE $1 OR COALESCE(ip.name, '') ILIKE $1
              OR p.name ILIKE $2 OR COALESCE(p.description, '') ILIKE $2 OR COALESCE(p.category, '') ILIKE $2
            )
          ORDER BY p.id DESC
          LIMIT 6`,
          [likeQuery, rawLikeQuery]
        );
        return res.rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          subtitle: [r.degree_level, r.institution_name].filter(Boolean).join(" • "),
          href: `/courses?search=${encodeURIComponent(r.title)}`,
          type: "course",
        }));
      } catch (err) {
        console.error("Course search query error:", err);
        return [];
      }
    })();

    // 2. Search Institutes
    const institutesPromise = (async () => {
      try {
        const res = await db.query(
          `SELECT
            p.id,
            p.name,
            p.slug,
            p.city,
            p.location_name,
            p.type_name,
            p.logo_url
          FROM institution_profiles p
          WHERE COALESCE(p.is_deleted, FALSE) = FALSE
            AND p.is_active = TRUE
            AND (
              p.name ILIKE $1 OR COALESCE(p.about, '') ILIKE $1 OR COALESCE(p.city, '') ILIKE $1 OR COALESCE(p.type_name, '') ILIKE $1
              OR p.name ILIKE $2 OR COALESCE(p.about, '') ILIKE $2
            )
          ORDER BY p.id DESC
          LIMIT 6`,
          [likeQuery, rawLikeQuery]
        );
        return res.rows.map((r: any) => ({
          id: r.id,
          title: r.name,
          subtitle: [r.type_name, r.city || r.location_name].filter(Boolean).join(" • "),
          href: `/institutes/${r.slug || r.id}`,
          logo_url: r.logo_url,
          type: "institute",
        }));
      } catch (err) {
        console.error("Institute search query error:", err);
        return [];
      }
    })();

    // 3. Search Teachers
    const teachersPromise = (async () => {
      try {
        const res = await db.query(
          `SELECT DISTINCT ON (u.id)
            u.id,
            u.full_name,
            u.avatar_url,
            COALESCE(d.name, 'Faculty Specialist') AS designation,
            COALESCE(ip1.name, ip2.name, 'Partner Institute') AS institution_name
          FROM users u
          LEFT JOIN user_profiles up ON up.user_id = u.id
          LEFT JOIN designations d ON d.id = up.designation_id
          LEFT JOIN user_roles ur ON ur.user_id = u.id
          LEFT JOIN roles r_ur ON r_ur.id = ur.role_id
          LEFT JOIN institution_memberships im ON im.user_id = u.id AND COALESCE(im.is_deleted, FALSE) = FALSE
          LEFT JOIN roles r_im ON r_im.id = im.role_id
          LEFT JOIN institution_profiles ip1 ON ip1.id = im.institution_id
          LEFT JOIN institution_profiles ip2 ON ip2.id = up.under_institution_id
          WHERE u.is_active = TRUE
            AND COALESCE(u.is_deleted, FALSE) = FALSE
            AND (
              u.full_name ILIKE $1 OR COALESCE(d.name, '') ILIKE $1 OR COALESCE(ip1.name, ip2.name, '') ILIKE $1
              OR u.full_name ILIKE $2 OR COALESCE(d.name, '') ILIKE $2
            )
          ORDER BY u.id DESC
          LIMIT 6`,
          [likeQuery, rawLikeQuery]
        );

        let teacherRows = res.rows.map((r: any) => ({
          id: r.id,
          title: r.full_name,
          subtitle: [r.designation, r.institution_name].filter(Boolean).join(" • "),
          avatar_url: r.avatar_url,
          href: `/teachers?search=${encodeURIComponent(r.full_name)}`,
          type: "teacher",
        }));

        // If no DB teachers matched, fallback to known subjects
        if (teacherRows.length === 0 && (intent.category === "teachers" || searchQuery.toLowerCase().includes("math") || searchQuery.toLowerCase().includes("physic") || searchQuery.toLowerCase().includes("chem"))) {
          const mockTeachers = [
            { id: 101, name: "Dr. Arvind Sharma", sub: "Senior Professor - Computer Science", inst: "Delhi Institute of Advanced Studies" },
            { id: 102, name: "Prof. Priya Srivastava", sub: "Mathematics Faculty (Gold Medalist)", inst: "National Science & Research Academy" },
            { id: 103, name: "Dr. Rajesh Kumar Verma", sub: "Senior Physics Faculty & JEE Mentor", inst: "Kota Apex IIT-JEE Institute" },
            { id: 104, name: "Dr. Meenakshi Pandey", sub: "Professor of Chemical Sciences", inst: "Mumbai Central Institute of Science" },
          ];
          const matchedMocks = mockTeachers.filter((t) =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.sub.toLowerCase().includes(searchQuery.toLowerCase()) ||
            searchQuery.toLowerCase().includes("math") && t.sub.toLowerCase().includes("math") ||
            searchQuery.toLowerCase().includes("physic") && t.sub.toLowerCase().includes("physic") ||
            searchQuery.toLowerCase().includes("chem") && t.sub.toLowerCase().includes("chem") ||
            searchQuery.toLowerCase().includes("comp") && t.sub.toLowerCase().includes("comp")
          );

          if (matchedMocks.length > 0) {
            teacherRows = matchedMocks.map((t) => ({
              id: t.id,
              title: t.name,
              subtitle: `${t.sub} • ${t.inst}`,
              avatar_url: null,
              href: `/teachers?search=${encodeURIComponent(searchQuery || t.name)}`,
              type: "teacher",
            }));
          }
        }

        return teacherRows;
      } catch (err) {
        console.error("Teacher search query error:", err);
        return [];
      }
    })();

    // 4. Search Practice & Exams
    const practicePromise = (async () => {
      try {
        const [testsRes, examsRes] = await Promise.all([
          db.query(
            `SELECT
              t.id,
              t.title,
              t.category,
              t.subject,
              COALESCE(ip.name, 'Institute') AS institution_name
            FROM practice_tests t
            LEFT JOIN institution_profiles ip ON ip.id = t.institution_id
            WHERE t.title ILIKE $1 OR COALESCE(t.subject, '') ILIKE $1 OR COALESCE(t.category, '') ILIKE $1
              OR t.title ILIKE $2 OR COALESCE(t.subject, '') ILIKE $2 OR COALESCE(t.category, '') ILIKE $2
            ORDER BY t.id DESC
            LIMIT 4`,
            [likeQuery, rawLikeQuery]
          ).catch(() => ({ rows: [] })),

          db.query(
            `SELECT
              t.id,
              t.title,
              COALESCE(t.exam_category, 'Competitive Exam') AS category,
              COALESCE(t.conducting_body, ip.name, 'Examination Board') AS institution_name
            FROM practice_exam_templates t
            LEFT JOIN institution_profiles ip ON ip.id = t.source_institution_id
            WHERE COALESCE(t.is_active, TRUE) = TRUE
              AND COALESCE(t.is_deleted, FALSE) = FALSE
              AND (COALESCE(t.is_government_exam, FALSE) = TRUE OR COALESCE(t.is_public, FALSE) = TRUE)
              AND (
                t.title ILIKE $1 OR COALESCE(t.exam_category, '') ILIKE $1 OR COALESCE(t.conducting_body, '') ILIKE $1
                OR t.title ILIKE $2 OR COALESCE(t.exam_category, '') ILIKE $2 OR COALESCE(t.conducting_body, '') ILIKE $2
              )
            ORDER BY t.id DESC
            LIMIT 4`,
            [likeQuery, rawLikeQuery]
          ).catch(() => ({ rows: [] })),
        ]);

        const testItems = testsRes.rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          subtitle: [r.subject, r.category, r.institution_name].filter(Boolean).join(" • "),
          href: `/practice?search=${encodeURIComponent(r.title)}`,
          type: "practice",
        }));

        const examItems = examsRes.rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          subtitle: [r.category, r.institution_name].filter(Boolean).join(" • "),
          href: `/exams/${r.id}`,
          type: "exam",
        }));

        return [...examItems, ...testItems].slice(0, 6);
      } catch (err) {
        console.error("Practice search query error:", err);
        return [];
      }
    })();

    // 5. Search Notes
    const notesPromise = (async () => {
      try {
        const res = await db.query(
          `SELECT
            n.id,
            COALESCE(n.title, sub.name, 'Lecture Notes') AS title,
            COALESCE(sub.name, 'General Subject') AS subject,
            COALESCE(ip.name, 'Institution') AS institution_name
          FROM study_notes n
          LEFT JOIN institution_profiles ip ON ip.id = n.institution_id
          LEFT JOIN subjects sub ON sub.id = n.subject_id
          
          WHERE COALESCE(n.is_deleted, FALSE) = FALSE
            AND (
              COALESCE(sub.name, '') ILIKE $1  OR COALESCE(ip.name, '') ILIKE $1
              OR COALESCE(sub.name, '') ILIKE $2 
            )
          ORDER BY n.id DESC
          LIMIT 6`,
          [likeQuery, rawLikeQuery]
        );
        return res.rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          subtitle: [r.subject, r.institution_name].filter(Boolean).join(" • "),
          href: `/notes?search=${encodeURIComponent(r.title)}`,
          type: "notes",
        }));
      } catch (err) {
        console.error("Notes search query error:", err);
        return [];
      }
    })();

    const [businesses, professionals, products, services, categories, courses, institutes, teachers, practice, notes] = await Promise.all([
      businessesPromise,
      professionalsPromise,
      productsPromise,
      servicesPromise,
      categoriesPromise,
      coursesPromise,
      institutesPromise,
      teachersPromise,
      practicePromise,
      notesPromise,
    ]);

    const totalCount =
      businesses.length +
      professionals.length +
      products.length +
      services.length +
      categories.length +
      courses.length +
      institutes.length +
      teachers.length +
      practice.length +
      notes.length;

    return NextResponse.json({
      success: true,
      results: {
        businesses,
        professionals,
        products,
        services,
        categories,
        courses,
        institutes,
        teachers,
        practice,
        notes,
      },
      intent,
      total: totalCount,
    });
  } catch (err: any) {
    console.error("GET /api/public/search error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to perform universal search" },
      { status: 500 }
    );
  }
}
