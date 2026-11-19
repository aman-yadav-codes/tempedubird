import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { resolveTenantContext } from "@/lib/records/tenant-context";

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export async function GET(req: Request) {
  try {
    const tenant = await resolveTenantContext(req);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant context could not be resolved" }, { status: 401 });
    }

    const url = new URL(req.url);
    const vertical = url.searchParams.get("vertical")?.trim().toLowerCase();
    const search = url.searchParams.get("search")?.trim();
    const status = url.searchParams.get("status");
    const categoryId = url.searchParams.get("category_id");
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20)));
    const offset = (page - 1) * limit;

    // Tenant Isolation Filter
    const conditions: string[] = [
      "br.is_deleted = FALSE",
      "(br.business_id = $1 OR br.institution_id = $2 OR br.business_id = $2 OR br.institution_id = $1)"
    ];
    const params: any[] = [tenant.businessId, tenant.institutionId || tenant.businessId];

    if (vertical) {
      params.push(vertical);
      conditions.push(`br.vertical_code = $${params.length}`);
    }

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`br.status = $${params.length}`);
    }

    if (categoryId && /^\d+$/.test(categoryId)) {
      params.push(Number(categoryId));
      conditions.push(`(br.category_id = $${params.length} OR br.subcategory_id = $${params.length})`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(br.title ILIKE $${params.length} OR br.slug ILIKE $${params.length} OR br.description ILIKE $${params.length})`);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count and KPI Summary
    const statsRes = await db.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN br.status = 'published' THEN 1 END)::int AS published,
        COUNT(CASE WHEN br.status = 'draft' THEN 1 END)::int AS draft,
        COUNT(CASE WHEN br.status = 'archived' THEN 1 END)::int AS archived
      FROM business_records br
      ${whereSql}
    `, params);

    const stats = statsRes.rows[0] || { total: 0, published: 0, draft: 0, archived: 0 };

    // Detail join query based on vertical
    const detailJoin = `
      LEFT JOIN vehicle_details vd ON vd.record_id = br.id
      LEFT JOIN property_details pd ON pd.record_id = br.id
      LEFT JOIN dishes d ON d.record_id = br.id
      LEFT JOIN menu_categories mc ON mc.id = d.menu_category_id
      LEFT JOIN hotel_rooms hr ON hr.record_id = br.id
      LEFT JOIN events ev ON ev.record_id = br.id
      LEFT JOIN students st ON st.record_id = br.id
      LEFT JOIN patients pt ON pt.record_id = br.id
    `;

    const detailSelect = `
      CASE br.vertical_code
        WHEN 'vehicles' THEN row_to_json(vd)
        WHEN 'properties' THEN row_to_json(pd)
        WHEN 'restaurants' THEN json_build_object(
          'id', d.id,
          'menu_category_id', d.menu_category_id,
          'menu_category_name', mc.name,
          'discounted_price', d.discounted_price,
          'portion_size', d.portion_size,
          'prep_time_minutes', d.prep_time_minutes,
          'spice_level', d.spice_level,
          'is_available', d.is_available,
          'variants', (SELECT json_agg(dv) FROM dish_variants dv WHERE dv.dish_id = d.id)
        )
        WHEN 'hotels' THEN row_to_json(hr)
        WHEN 'events' THEN json_build_object(
          'id', ev.id,
          'start_date', ev.start_date,
          'end_date', ev.end_date,
          'start_time', ev.start_time,
          'end_time', ev.end_time,
          'venue_name', ev.venue_name,
          'city', ev.city,
          'tickets', (SELECT json_agg(et) FROM event_tickets et WHERE et.event_id = ev.id)
        )
        WHEN 'education' THEN row_to_json(st)
        WHEN 'healthcare' THEN row_to_json(pt)
        ELSE NULL
      END as details
    `;

    const queryParams = [...params, limit, offset];
    const recordsRes = await db.query(`
      SELECT
        br.*,
        cat.name as category_name,
        subcat.name as subcategory_name,
        (SELECT COUNT(*)::int FROM business_record_media brm WHERE brm.record_id = br.id) as media_count,
        ${detailSelect}
      FROM business_records br
      LEFT JOIN master_records cat ON cat.id = br.category_id
      LEFT JOIN master_records subcat ON subcat.id = br.subcategory_id
      ${detailJoin}
      ${whereSql}
      ORDER BY br.id DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `, queryParams);

    return NextResponse.json({
      success: true,
      data: recordsRes.rows,
      stats,
      pagination: {
        page,
        limit,
        total: stats.total,
        totalPages: Math.ceil(stats.total / limit) || 1,
      },
      tenant: {
        businessId: tenant.businessId,
        institutionId: tenant.institutionId,
        businessName: tenant.businessName,
      }
    });
  } catch (err: any) {
    console.error("[Business Records GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch records" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const tenant = await resolveTenantContext(req);
    if (!tenant) {
      return NextResponse.json({ error: "Unauthorized / Tenant context required" }, { status: 401 });
    }

    const body = await req.json();
    const {
      vertical_code,
      title,
      description,
      category_id,
      subcategory_id,
      status = "published",
      is_active = true,
      is_featured = false,
      currency = "INR",
      price,
      featured_image,
      metadata = {},
      custom_attributes = {},
      media = [],
      details = {},
    } = body;

    if (!vertical_code) {
      return NextResponse.json({ error: "vertical_code is required" }, { status: 400 });
    }
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // 1. Resolve vertical_id
    const vRes = await db.query(`SELECT id FROM master_verticals WHERE LOWER(code) = LOWER($1) LIMIT 1`, [vertical_code]);
    if (vRes.rows.length === 0) {
      return NextResponse.json({ error: `Invalid vertical_code '${vertical_code}'` }, { status: 400 });
    }
    const verticalId = vRes.rows[0].id;

    // 2. Generate unique slug
    let baseSlug = slugify(title);
    if (!baseSlug) baseSlug = `record-${Date.now()}`;
    let finalSlug = baseSlug;
    let slugIndex = 1;

    while (true) {
      const slugCheck = await db.query(
        `SELECT id FROM business_records WHERE business_id = $1 AND slug = $2 AND is_deleted = FALSE LIMIT 1`,
        [tenant.businessId, finalSlug]
      );
      if (slugCheck.rows.length === 0) break;
      finalSlug = `${baseSlug}-${slugIndex}`;
      slugIndex += 1;
    }

    // 3. Insert into business_records
    const insertRec = await db.query(`
      INSERT INTO business_records (
        business_id, institution_id, vertical_id, vertical_code, title, slug,
        description, category_id, subcategory_id, status, is_active, is_featured,
        currency, price, featured_image, metadata, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17
      )
      RETURNING *
    `, [
      tenant.businessId,
      tenant.institutionId || tenant.businessId,
      verticalId,
      vertical_code,
      title.trim(),
      finalSlug,
      description || null,
      category_id ? Number(category_id) : null,
      subcategory_id ? Number(subcategory_id) : null,
      status,
      Boolean(is_active),
      Boolean(is_featured),
      currency,
      price !== undefined && price !== "" ? Number(price) : null,
      featured_image || null,
      metadata,
      tenant.userId,
    ]);

    const newRecord = insertRec.rows[0];
    const recordId = newRecord.id;

    // 4. Insert into vertical detail table
    switch (vertical_code) {
      case "vehicles": {
        await db.query(`
          INSERT INTO vehicle_details (
            record_id, vehicle_type_id, brand_id, model_id, variant_id,
            fuel_type_id, transmission_type_id, body_type_id, vehicle_condition_id,
            manufacturing_year, registration_year, color, engine_capacity,
            mileage, kilometers_driven, number_of_owners, seating_capacity,
            registration_number, vin_chassis_number, is_negotiable, financing_available,
            warranty_info, location, contact_info, specifications
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
          )
        `, [
          recordId,
          details.vehicle_type_id ? Number(details.vehicle_type_id) : null,
          details.brand_id ? Number(details.brand_id) : null,
          details.model_id ? Number(details.model_id) : null,
          details.variant_id ? Number(details.variant_id) : null,
          details.fuel_type_id ? Number(details.fuel_type_id) : null,
          details.transmission_type_id ? Number(details.transmission_type_id) : null,
          details.body_type_id ? Number(details.body_type_id) : null,
          details.vehicle_condition_id ? Number(details.vehicle_condition_id) : null,
          details.manufacturing_year ? Number(details.manufacturing_year) : null,
          details.registration_year ? Number(details.registration_year) : null,
          details.color || null,
          details.engine_capacity || null,
          details.mileage || null,
          details.kilometers_driven ? Number(details.kilometers_driven) : null,
          details.number_of_owners ? Number(details.number_of_owners) : 1,
          details.seating_capacity ? Number(details.seating_capacity) : null,
          details.registration_number || null,
          details.vin_chassis_number || null,
          Boolean(details.is_negotiable),
          Boolean(details.financing_available),
          details.warranty_info || null,
          details.location || null,
          details.contact_info || null,
          details.specifications || {},
        ]);
        break;
      }

      case "properties": {
        await db.query(`
          INSERT INTO property_details (
            record_id, property_type_id, listing_type_id, ownership_type_id,
            furnishing_type_id, construction_status_id, property_condition_id, land_type_id,
            bedrooms, bathrooms, balconies, parking_spaces, total_floors, floor_number,
            built_up_area, plot_area, area_unit, amenities, rental_amount, security_deposit,
            maintenance_charges, country, state, city, suburb, street_address,
            latitude, longitude, availability_status
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
          )
        `, [
          recordId,
          details.property_type_id ? Number(details.property_type_id) : null,
          details.listing_type_id ? Number(details.listing_type_id) : null,
          details.ownership_type_id ? Number(details.ownership_type_id) : null,
          details.furnishing_type_id ? Number(details.furnishing_type_id) : null,
          details.construction_status_id ? Number(details.construction_status_id) : null,
          details.property_condition_id ? Number(details.property_condition_id) : null,
          details.land_type_id ? Number(details.land_type_id) : null,
          details.bedrooms ? Number(details.bedrooms) : null,
          details.bathrooms ? Number(details.bathrooms) : null,
          details.balconies ? Number(details.balconies) : null,
          details.parking_spaces ? Number(details.parking_spaces) : null,
          details.total_floors ? Number(details.total_floors) : null,
          details.floor_number ? Number(details.floor_number) : null,
          details.built_up_area ? Number(details.built_up_area) : null,
          details.plot_area ? Number(details.plot_area) : null,
          details.area_unit || "sq ft",
          Array.isArray(details.amenities) ? details.amenities.map(Number) : null,
          details.rental_amount ? Number(details.rental_amount) : null,
          details.security_deposit ? Number(details.security_deposit) : null,
          details.maintenance_charges ? Number(details.maintenance_charges) : null,
          details.country || "India",
          details.state || null,
          details.city || null,
          details.suburb || null,
          details.street_address || null,
          details.latitude ? Number(details.latitude) : null,
          details.longitude ? Number(details.longitude) : null,
          details.availability_status || "available",
        ]);
        break;
      }

      case "restaurants": {
        const dishRes = await db.query(`
          INSERT INTO dishes (
            record_id, menu_category_id, cuisine_id, dietary_type_id, food_type_id,
            serving_unit_id, meal_type_id, discounted_price, portion_size, ingredients,
            allergens, prep_time_minutes, spice_level, calories, is_available, category_ids
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
          )
          RETURNING id
        `, [
          recordId,
          details.menu_category_id ? Number(details.menu_category_id) : null,
          details.cuisine_id ? Number(details.cuisine_id) : null,
          details.dietary_type_id ? Number(details.dietary_type_id) : null,
          details.food_type_id ? Number(details.food_type_id) : null,
          details.serving_unit_id ? Number(details.serving_unit_id) : null,
          details.meal_type_id ? Number(details.meal_type_id) : null,
          details.discounted_price ? Number(details.discounted_price) : null,
          details.portion_size || null,
          details.ingredients || null,
          Array.isArray(details.allergens) ? details.allergens.map(Number) : null,
          details.prep_time_minutes ? Number(details.prep_time_minutes) : null,
          details.spice_level || "Medium",
          details.calories ? Number(details.calories) : null,
          details.is_available !== undefined ? Boolean(details.is_available) : true,
          Array.isArray(details.category_ids) ? details.category_ids.map(Number) : null,
        ]);

        const dishId = dishRes.rows[0]?.id;
        if (dishId && Array.isArray(details.variants) && details.variants.length > 0) {
          for (const v of details.variants) {
            if (v.variant_name && v.price) {
              await db.query(`
                INSERT INTO dish_variants (dish_id, variant_name, price, discounted_price, is_default)
                VALUES ($1, $2, $3, $4, $5)
              `, [dishId, v.variant_name, Number(v.price), v.discounted_price ? Number(v.discounted_price) : null, Boolean(v.is_default)]);
            }
          }
        }
        break;
      }

      case "hotels": {
        await db.query(`
          INSERT INTO hotel_rooms (
            record_id, room_number, room_category_id, room_subcategory_id, room_type_id,
            bed_type_id, view_type_id, occupancy_type_id, meal_plan_id, accommodation_type_id,
            room_size_sqft, max_adults, max_children, number_of_beds, amenities,
            price_per_night, weekend_price, seasonal_price, extra_guest_charge,
            check_in_time, check_out_time, cancellation_policy
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
          )
        `, [
          recordId,
          details.room_number || null,
          details.room_category_id ? Number(details.room_category_id) : null,
          details.room_subcategory_id ? Number(details.room_subcategory_id) : null,
          details.room_type_id ? Number(details.room_type_id) : null,
          details.bed_type_id ? Number(details.bed_type_id) : null,
          details.view_type_id ? Number(details.view_type_id) : null,
          details.occupancy_type_id ? Number(details.occupancy_type_id) : null,
          details.meal_plan_id ? Number(details.meal_plan_id) : null,
          details.accommodation_type_id ? Number(details.accommodation_type_id) : null,
          details.room_size_sqft ? Number(details.room_size_sqft) : null,
          details.max_adults ? Number(details.max_adults) : 2,
          details.max_children ? Number(details.max_children) : 1,
          details.number_of_beds ? Number(details.number_of_beds) : 1,
          Array.isArray(details.amenities) ? details.amenities.map(Number) : null,
          Number(price || details.price_per_night || 0),
          details.weekend_price ? Number(details.weekend_price) : null,
          details.seasonal_price ? Number(details.seasonal_price) : null,
          details.extra_guest_charge ? Number(details.extra_guest_charge) : null,
          details.check_in_time || "14:00",
          details.check_out_time || "11:00",
          details.cancellation_policy || null,
        ]);
        break;
      }

      case "events": {
        const evRes = await db.query(`
          INSERT INTO events (
            record_id, event_category_id, event_subcategory_id, event_type_id,
            event_format_id, audience_type_id, organizer_name, start_date, end_date,
            start_time, end_time, time_zone, registration_deadline, venue_name,
            complete_address, city, state, country, online_meeting_url,
            speakers, performers, amenities, age_restrictions, terms_conditions, is_free
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
          )
          RETURNING id
        `, [
          recordId,
          details.event_category_id ? Number(details.event_category_id) : null,
          details.event_subcategory_id ? Number(details.event_subcategory_id) : null,
          details.event_type_id ? Number(details.event_type_id) : null,
          details.event_format_id ? Number(details.event_format_id) : null,
          details.audience_type_id ? Number(details.audience_type_id) : null,
          details.organizer_name || tenant.businessName,
          details.start_date || new Date().toISOString().split("T")[0],
          details.end_date || details.start_date || new Date().toISOString().split("T")[0],
          details.start_time || "10:00",
          details.end_time || "17:00",
          details.time_zone || "Asia/Kolkata",
          details.registration_deadline || null,
          details.venue_name || null,
          details.complete_address || null,
          details.city || null,
          details.state || null,
          details.country || "India",
          details.online_meeting_url || null,
          details.speakers || null,
          details.performers || null,
          Array.isArray(details.amenities) ? details.amenities.map(Number) : null,
          details.age_restrictions || null,
          details.terms_conditions || null,
          Boolean(details.is_free),
        ]);

        const eventId = evRes.rows[0]?.id;
        if (eventId && Array.isArray(details.tickets) && details.tickets.length > 0) {
          for (const t of details.tickets) {
            if (t.name) {
              await db.query(`
                INSERT INTO event_tickets (event_id, ticket_type_id, name, price, total_capacity, available_capacity)
                VALUES ($1, $2, $3, $4, $5, $5)
              `, [eventId, t.ticket_type_id ? Number(t.ticket_type_id) : null, t.name, Number(t.price || 0), Number(t.total_capacity || 100)]);
            }
          }
        }
        break;
      }

      case "education": {
        await db.query(`
          INSERT INTO students (
            record_id, admission_number, student_category_id, student_subcategory_id,
            education_level_id, course_id, department_id, academic_program_id,
            learning_mode_id, examination_type_id, student_status_id, dob, gender,
            contact_number, email, blood_group, class_grade, section, academic_year,
            admission_date, guardian_name, guardian_relation, guardian_phone, emergency_contact,
            address, city, state, postal_code, notes
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
          )
        `, [
          recordId,
          details.admission_number || `ADM-${Date.now().toString().slice(-6)}`,
          details.student_category_id ? Number(details.student_category_id) : null,
          details.student_subcategory_id ? Number(details.student_subcategory_id) : null,
          details.education_level_id ? Number(details.education_level_id) : null,
          details.course_id ? Number(details.course_id) : null,
          details.department_id ? Number(details.department_id) : null,
          details.academic_program_id ? Number(details.academic_program_id) : null,
          details.learning_mode_id ? Number(details.learning_mode_id) : null,
          details.examination_type_id ? Number(details.examination_type_id) : null,
          details.student_status_id ? Number(details.student_status_id) : null,
          details.dob || null,
          details.gender || null,
          details.contact_number || null,
          details.email || null,
          details.blood_group || null,
          details.class_grade || null,
          details.section || null,
          details.academic_year || "2026-2027",
          details.admission_date || new Date().toISOString().split("T")[0],
          details.guardian_name || null,
          details.guardian_relation || null,
          details.guardian_phone || null,
          details.emergency_contact || null,
          details.address || null,
          details.city || null,
          details.state || null,
          details.postal_code || null,
          details.notes || null,
        ]);
        break;
      }

      case "healthcare": {
        await db.query(`
          INSERT INTO patients (
            record_id, patient_identifier, patient_category_id, patient_subcategory_id,
            medical_department_id, medical_specialty_id, consultation_type_id,
            treatment_category_id, patient_visit_type_id, admission_type_id, care_type_id,
            dob, gender, phone, email, blood_group, assigned_doctor, registration_date,
            referral_source, emergency_contact_name, emergency_contact_phone,
            known_allergies, medical_alerts, address, city, state, postal_code, is_confidential
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
          )
        `, [
          recordId,
          details.patient_identifier || `PT-${Date.now().toString().slice(-6)}`,
          details.patient_category_id ? Number(details.patient_category_id) : null,
          details.patient_subcategory_id ? Number(details.patient_subcategory_id) : null,
          details.medical_department_id ? Number(details.medical_department_id) : null,
          details.medical_specialty_id ? Number(details.medical_specialty_id) : null,
          details.consultation_type_id ? Number(details.consultation_type_id) : null,
          details.treatment_category_id ? Number(details.treatment_category_id) : null,
          details.patient_visit_type_id ? Number(details.patient_visit_type_id) : null,
          details.admission_type_id ? Number(details.admission_type_id) : null,
          details.care_type_id ? Number(details.care_type_id) : null,
          details.dob || null,
          details.gender || null,
          details.phone || null,
          details.email || null,
          details.blood_group || null,
          details.assigned_doctor || null,
          details.registration_date || new Date().toISOString().split("T")[0],
          details.referral_source || null,
          details.emergency_contact_name || null,
          details.emergency_contact_phone || null,
          details.known_allergies || null,
          details.medical_alerts || null,
          details.address || null,
          details.city || null,
          details.state || null,
          details.postal_code || null,
          details.is_confidential !== undefined ? Boolean(details.is_confidential) : true,
        ]);
        break;
      }
    }

    // 5. Insert Dynamic Custom Attributes
    if (custom_attributes && typeof custom_attributes === "object") {
      for (const [attrCode, val] of Object.entries(custom_attributes)) {
        if (val !== undefined && val !== null && val !== "") {
          const aLookup = await db.query(
            `SELECT id, field_type FROM master_attributes WHERE vertical_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
            [verticalId, attrCode]
          );
          const attrId = aLookup.rows[0]?.id || null;
          const fieldType = aLookup.rows[0]?.field_type || "text";

          let vText = typeof val === "string" ? val : String(val);
          let vNum = fieldType === "number" && !isNaN(Number(val)) ? Number(val) : null;
          let vBool = fieldType === "boolean" ? Boolean(val) : null;
          let vJson = typeof val === "object" ? JSON.stringify(val) : null;

          await db.query(`
            INSERT INTO business_record_attributes (record_id, attribute_id, attribute_code, value_text, value_number, value_boolean, value_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (record_id, attribute_code) DO UPDATE SET value_text = EXCLUDED.value_text
          `, [recordId, attrId, attrCode, vText, vNum, vBool, vJson]);
        }
      }
    }

    // 6. Insert Media Items
    if (Array.isArray(media) && media.length > 0) {
      for (let i = 0; i < media.length; i++) {
        const m = media[i];
        if (m.url) {
          await db.query(`
            INSERT INTO business_record_media (record_id, media_type, url, title, display_order, is_featured)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [recordId, m.media_type || "image", m.url, m.title || null, i, Boolean(m.is_featured)]);
        }
      }
    }

    // 7. Write Audit Log
    await db.query(`
      INSERT INTO business_record_audit_logs (record_id, business_id, user_id, action, changes)
      VALUES ($1, $2, $3, 'create', $4)
    `, [recordId, tenant.businessId, tenant.userId, JSON.stringify({ title, vertical_code, status })]);

    return NextResponse.json({
      success: true,
      message: `${title} created successfully!`,
      data: newRecord,
    }, { status: 201 });
  } catch (err: any) {
    console.error("[Business Records POST] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create record" }, { status: 500 });
  }
}
