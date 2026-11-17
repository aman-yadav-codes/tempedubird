import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

function matchCategoryToBusinessTypeId(
  catName?: string | null,
  catSlug?: string | null,
  instTypes: { id: number; name: string; slug: string }[] = []
): { id: number; name: string } | null {
  const norm = ((catName || "") + " " + (catSlug || "")).toLowerCase();
  if (!norm.trim()) return null;

  // 1. Automotive & Transport
  if (/\b(automotive|transport|vehicle|vehicles|car|cars|rental|bike|bikes|dealership|cab|fleet|auto|motor)\b/i.test(norm)) {
    const t = instTypes.find((t) => t.slug === "automotive-and-transport" || t.name.toLowerCase().includes("automotive"));
    if (t) return t;
  }
  // 2. Real Estate & Construction
  if (/\b(real estate|property|properties|builder|construction|housing|realtor|developer|plots|flat|flats)\b/i.test(norm)) {
    const t = instTypes.find((t) => t.slug === "real-estate-and-construction" || t.name.toLowerCase().includes("real estate"));
    if (t) return t;
  }
  // 3. Hospitality & Events
  if (/\b(hospitality|hotel|hotels|resort|resorts|guest house|homestay|hostel|lodge|events|event|banquet|wedding|venue)\b/i.test(norm)) {
    const t = instTypes.find((t) => t.slug === "hospitality-and-events" || t.name.toLowerCase().includes("hospitality"));
    if (t) return t;
  }
  // 4. Food, Dining & Cafes
  if (/\b(food|dining|cafe|cafes|restaurant|restaurants|bakery|bakeries|catering|eatery|fast food|bar|pub|bistro|dhaba)\b/i.test(norm)) {
    const t = instTypes.find((t) => t.slug === "food-dining-and-cafes" || t.name.toLowerCase().includes("food"));
    if (t) return t;
  }
  // 5. IT & Digital Agency
  if (norm.includes("digital") || /\b(it|agency|agencies|software|tech|developer|development|cyber)\b/i.test(norm)) {
    const t = instTypes.find((t) => t.slug === "it-digital-agency" || t.name.toLowerCase() === "it & digital agency" || t.slug === "it-and-digital-agencies");
    if (t) return t;
  }
  // 6. Healthcare & Clinic (exclude hospitality)
  if (/\b(health|healthcare|clinic|medical|doctor|hospital|dental|pharmacy)\b/i.test(norm) && !norm.includes("hospitality")) {
    const t = instTypes.find((t) => t.slug === "healthcare-clinic" || t.slug === "healthcare-and-medical" || t.name.toLowerCase().includes("healthcare"));
    if (t) return t;
  }
  // 7. Salons & Personal Care
  if (/\b(salon|salons|spa|spas|beauty|parlour|barber)\b/i.test(norm)) {
    const t = instTypes.find((t) => t.slug === "salons-and-personal-care" || t.name.toLowerCase().includes("salon"));
    if (t) return t;
  }
  // 8. Fitness & Sports
  if (/\b(fitness|gym|sports|yoga|crossfit)\b/i.test(norm)) {
    const t = instTypes.find((t) => t.slug === "fitness-and-sports" || t.name.toLowerCase().includes("fitness"));
    if (t) return t;
  }
  // 9. Retail & Commerce
  if (/\b(retail|shopping|commerce|store|mart|market|shop|grocer|boutique|cloth|fashion)\b/i.test(norm)) {
    const t = instTypes.find((t) => t.slug === "retail-commerce" || t.slug === "retail-and-shopping" || t.name.toLowerCase().includes("retail"));
    if (t) return t;
  }
  // 10. Professional Services
  if (/\b(professional|financial|finance|tax|legal|law|audit|consult|accounting|advocate|services|maintenance)\b/i.test(norm)) {
    const t = instTypes.find((t) => t.slug === "professional-services" || t.slug === "professional-and-financial-services" || t.name.toLowerCase().includes("professional"));
    if (t) return t;
  }
  // 11. Coaching Center
  if (/\b(coaching|tuition|entrance|competitive)\b/i.test(norm)) {
    const t = instTypes.find((t) => t.slug === "coaching" || t.slug === "education-and-coaching" || t.name.toLowerCase().includes("coaching"));
    if (t) return t;
  }
  // 12. School
  if (/\b(school|k12|cbse|icse|secondary|primary|matric)\b/i.test(norm)) {
    const t = instTypes.find((t) => t.slug === "school" || t.name.toLowerCase() === "school");
    if (t) return t;
  }
  // 13. College
  if (/\b(college|degree|undergraduate)\b/i.test(norm)) {
    const t = instTypes.find((t) => t.slug === "college" || t.name.toLowerCase() === "college");
    if (t) return t;
  }
  // 14. University
  if (/\b(university|campus)\b/i.test(norm)) {
    const t = instTypes.find((t) => t.slug === "university" || t.name.toLowerCase() === "university");
    if (t) return t;
  }
  // 15. Institute
  if (/\b(institute|institution|academy|training)\b/i.test(norm)) {
    const t = instTypes.find((t) => t.slug === "institute" || t.name.toLowerCase() === "institute");
    if (t) return t;
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const instIdParam = searchParams.get("institutionId");
    const isPlatformAdmin = isPlatformAdminUser(user);

    // Platform Admin viewing the platform-level panel without a specific institution selected
    if (isPlatformAdmin && !instIdParam) {
      return NextResponse.json({
        success: true,
        isPlatformAdmin: true,
        allEnabled: true,
        businessTypeName: "Platform Admin",
        enabledKeys: [],
        disabledKeys: [],
        disabledRoutes: [],
      });
    }

    const allTypesRes = await db.query<{ id: number; name: string; slug: string }>(
      `SELECT id, name, slug FROM institution_types WHERE COALESCE(is_deleted, false) = false ORDER BY id ASC`
    );
    const allTypes = allTypesRes.rows;

    let businessTypeId: number | null = null;
    let businessTypeName: string | null = null;

    // Verify institutionId if provided: if regular user, ensure they actually belong to this institution
    let verifiedInstId: number | null = null;
    if (instIdParam) {
      const candidateId = Number(instIdParam);
      if (isPlatformAdmin) {
        verifiedInstId = candidateId;
      } else {
        const belongsRes = await db.query(
          `SELECT 1 FROM institution_memberships WHERE user_id = $1 AND institution_id = $2 AND is_active = true
           UNION
           SELECT 1 FROM business_profiles WHERE user_id = $1 AND institution_profile_id = $2
           LIMIT 1`,
          [user.id, candidateId]
        );
        if (belongsRes.rows.length > 0) {
          verifiedInstId = candidateId;
        }
      }
    }

    // 1. If verified institutionId available, find type from that institution
    if (verifiedInstId) {
      const instRes = await db.query(
        `SELECT 
           ip.id as institution_id,
           ip.institution_type_id, 
           it.name as type_name,
           bp.business_type,
           c.name as category_name,
           c.slug as category_slug
         FROM institution_profiles ip
         LEFT JOIN institution_types it ON it.id = ip.institution_type_id
         LEFT JOIN business_profiles bp ON bp.institution_profile_id = ip.id
         LEFT JOIN categories c ON c.id = bp.category_id
         WHERE ip.id = $1
         LIMIT 1`,
        [verifiedInstId]
      );

      if (instRes.rows.length > 0) {
        const row = instRes.rows[0];
        // Check if category or business_type matches a specific institution type
        const matched = matchCategoryToBusinessTypeId(row.category_name || row.business_type, row.category_slug, allTypes);
        if (matched) {
          businessTypeId = matched.id;
          businessTypeName = matched.name;
          // Sync institution profile if needed
          if (row.institution_type_id !== matched.id) {
            db.query(`UPDATE institution_profiles SET institution_type_id = $1, updated_at = NOW() WHERE id = $2`, [matched.id, row.institution_id]).catch(() => {});
          }
        } else if (row.institution_type_id) {
          businessTypeId = row.institution_type_id;
          businessTypeName = row.type_name;
        }
      }
    }

    // 2. If not found, check user's active institution membership
    if (!businessTypeId) {
      const userInstRes = await db.query(
        `SELECT 
           ip.id as institution_id,
           ip.institution_type_id, 
           it.name as type_name,
           bp.business_type,
           c.name as category_name,
           c.slug as category_slug
         FROM institution_memberships im
         JOIN institution_profiles ip ON ip.id = im.institution_id
         LEFT JOIN institution_types it ON it.id = ip.institution_type_id
         LEFT JOIN business_profiles bp ON bp.institution_profile_id = ip.id
         LEFT JOIN categories c ON c.id = bp.category_id
         WHERE im.user_id = $1 AND im.is_active = true
         ORDER BY im.id ASC
         LIMIT 1`,
        [user.id]
      );
      if (userInstRes.rows.length > 0) {
        const row = userInstRes.rows[0];
        const matched = matchCategoryToBusinessTypeId(row.category_name || row.business_type, row.category_slug, allTypes);
        if (matched) {
          businessTypeId = matched.id;
          businessTypeName = matched.name;
          if (row.institution_type_id !== matched.id) {
            db.query(`UPDATE institution_profiles SET institution_type_id = $1, updated_at = NOW() WHERE id = $2`, [matched.id, row.institution_id]).catch(() => {});
          }
        } else if (row.institution_type_id) {
          businessTypeId = row.institution_type_id;
          businessTypeName = row.type_name;
        }
      }
    }

    // 3. If not found, check user's registered business profile
    if (!businessTypeId) {
      const userBpRes = await db.query(
        `SELECT 
           bp.institution_profile_id,
           ip.institution_type_id, 
           it.name as type_name,
           bp.business_type,
           c.name as category_name,
           c.slug as category_slug
         FROM business_profiles bp
         LEFT JOIN institution_profiles ip ON ip.id = bp.institution_profile_id
         LEFT JOIN institution_types it ON it.id = ip.institution_type_id
         LEFT JOIN categories c ON c.id = bp.category_id
         WHERE bp.user_id = $1 AND COALESCE(bp.is_deleted, false) = false
         ORDER BY bp.id ASC
         LIMIT 1`,
        [user.id]
      );
      if (userBpRes.rows.length > 0) {
        const row = userBpRes.rows[0];
        const matched = matchCategoryToBusinessTypeId(row.category_name || row.business_type, row.category_slug, allTypes);
        if (matched) {
          businessTypeId = matched.id;
          businessTypeName = matched.name;
          if (row.institution_profile_id && row.institution_type_id !== matched.id) {
            db.query(`UPDATE institution_profiles SET institution_type_id = $1, updated_at = NOW() WHERE id = $2`, [matched.id, row.institution_profile_id]).catch(() => {});
          }
        } else if (row.institution_type_id) {
          businessTypeId = row.institution_type_id;
          businessTypeName = row.type_name;
        }
      }
    }

    // If still no business type found
    if (!businessTypeId) {
      return NextResponse.json({
        success: true,
        isPlatformAdmin,
        allEnabled: true,
        businessTypeName: "Default",
        enabledKeys: [],
        disabledKeys: [],
        disabledRoutes: [],
      });
    }

    // Fetch enabled and disabled modules for this business type
    const modRes = await db.query(
      `SELECT 
         sm.id,
         sm.parent_module_id,
         sm.module_key,
         sm.module_name,
         sm.route,
         btm.is_enabled
       FROM system_modules sm
       LEFT JOIN business_type_modules btm 
         ON btm.module_id = sm.id AND btm.business_type_id = $1
       WHERE sm.status = 'active'
       ORDER BY sm.parent_module_id NULLS FIRST, sm.display_order ASC`,
      [businessTypeId]
    );

    // Build parent map and initial status map
    const enabledMap = new Map<number, boolean>();
    const parentMap = new Map<number, number | null>();
    const bName = (businessTypeName || "").toLowerCase();

    for (const r of modRes.rows) {
      parentMap.set(r.id, r.parent_module_id);
      if (r.is_enabled !== null && r.is_enabled !== undefined) {
        enabledMap.set(r.id, r.is_enabled === true);
      } else {
        // Industry-specific default activation based on business type
        if (r.module_key === "marketing_vehicles") {
          enabledMap.set(r.id, /automotive|transport|vehicle|car|fleet|rental/i.test(bName));
        } else if (r.module_key === "marketing_properties") {
          enabledMap.set(r.id, /real estate|property|construction|builder|realtor/i.test(bName));
        } else if (r.module_key === "marketing_events") {
          enabledMap.set(r.id, /event|hospitality|banquet|wedding|venue/i.test(bName));
        } else if (r.module_key === "marketing_dishes") {
          enabledMap.set(r.id, /food|dining|cafe|restaurant|bakery|catering/i.test(bName));
        } else if (r.module_key === "marketing_rooms") {
          enabledMap.set(r.id, /hotel|resort|hospitality|lodge|stay|hostel|guest house/i.test(bName));
        } else {
          enabledMap.set(r.id, true);
        }
      }
    }

    const enabledKeys: string[] = [];
    const disabledKeys: string[] = [];
    const disabledRoutes = new Set<string>();

    for (const r of modRes.rows) {
      // Hierarchical rule: If parent is disabled, child is also strictly disabled
      const isParentDisabled = r.parent_module_id ? enabledMap.get(r.parent_module_id) === false : false;
      const isEnabled = enabledMap.get(r.id) !== false && !isParentDisabled;

      if (!isEnabled) {
        disabledKeys.push(r.module_key);
        if (r.route) {
          disabledRoutes.add(r.route);
        }

        // Comprehensive route expansion for standard system modules
        // 1. Operations module disabled -> disable all operations workflows
        if (r.route === "/admin/operations" || r.module_key === "operations") {
          disabledRoutes.add("/admin/operations");
          disabledRoutes.add("/admin/operations/tasks");
          disabledRoutes.add("/admin/operations/projects");
          disabledRoutes.add("/admin/operations/work-logs");
          disabledRoutes.add("/admin/operations/project-types");
          disabledRoutes.add("/admin/operations/project-pipelines");
          disabledRoutes.add("/admin/operations/generate-documents");
          disabledRoutes.add("/admin/operations/penalty-rules");
        }

        // 2. Academics module disabled -> disable both academic sessions & content/notes/exams
        if (r.module_key === "academics" || r.module_key === "operations_academics" || r.route === "/admin/institutions/academic-years") {
          disabledRoutes.add("/admin/institutions/academic-years");
          disabledRoutes.add("/admin/content");
          disabledRoutes.add("/admin/content/notes");
          disabledRoutes.add("/admin/content/assignments");
          disabledRoutes.add("/admin/content/exams");
          disabledRoutes.add("/admin/content/practice-exams");
          disabledRoutes.add("/admin/content/public-exams");
        }

        // 3. My Classroom disabled -> disable classroom attendance and sub-tabs
        if (r.module_key === "classroom" || r.module_key === "operations_classroom" || r.route === "/admin/classroom") {
          disabledRoutes.add("/admin/classroom");
          disabledRoutes.add("/admin/classroom/attendance");
          disabledRoutes.add("/admin/classroom/achievements");
          disabledRoutes.add("/admin/classroom/assignments");
          disabledRoutes.add("/admin/classroom/practice-exams");
          disabledRoutes.add("/admin/classroom/exams");
          disabledRoutes.add("/admin/classroom/results");
          disabledRoutes.add("/admin/classroom/my-timetable");
          disabledRoutes.add("/admin/classroom/id-card");
          disabledRoutes.add("/admin/classroom/fees");
        }

        // 4. Manage Students disabled -> disable all student sub-tabs
        if (r.module_key === "students" || r.module_key === "operations_students" || r.route === "/admin/students") {
          disabledRoutes.add("/admin/students");
          disabledRoutes.add("/admin/students/fee-management");
          disabledRoutes.add("/admin/students/attendance");
          disabledRoutes.add("/admin/students/performance");
          disabledRoutes.add("/admin/students/notes");
        }

        // 5. Institutions module disabled
        if (r.module_key === "institutions" || r.route === "/admin/institutions") {
          disabledRoutes.add("/admin/institutions");
          disabledRoutes.add("/admin/institutions/programs");
          disabledRoutes.add("/admin/institutions/placements");
          disabledRoutes.add("/admin/institutions/facilities");
          disabledRoutes.add("/admin/institutions/cutoffs");
          disabledRoutes.add("/admin/institutions/scholarships");
        }

        // 5. Tasks child module disabled
        if (r.module_key === "operations_tasks" || r.route === "/admin/operations/tasks") {
          disabledRoutes.add("/admin/operations/tasks");
        }

        // 6. Projects child module disabled
        if (r.module_key === "operations_projects" || r.route === "/admin/operations/projects") {
          disabledRoutes.add("/admin/operations/projects");
        }
      } else {
        enabledKeys.push(r.module_key);
      }
    }

    return NextResponse.json({
      success: true,
      isPlatformAdmin,
      allEnabled: false,
      businessTypeId,
      businessTypeName,
      enabledKeys,
      disabledKeys,
      disabledRoutes: Array.from(disabledRoutes),
    });
  } catch (err: unknown) {
    console.error("[GET /api/admin/business-type-access/my-access] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load access config" },
      { status: 500 }
    );
  }
}
