import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { resolveTenantContext } from "@/lib/records/tenant-context";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const recordId = Number(params.id);
    if (!recordId) {
      return NextResponse.json({ error: "Invalid record ID" }, { status: 400 });
    }

    const tenant = await resolveTenantContext(req);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 401 });
    }

    // Ownership check: user can only see their own records, never others
    let querySql = `
      SELECT br.*,
             cat.name as category_name,
             subcat.name as subcategory_name
      FROM business_records br
      LEFT JOIN master_records cat ON cat.id = br.category_id
      LEFT JOIN master_records subcat ON subcat.id = br.subcategory_id
      WHERE br.id = $1 AND br.is_deleted = FALSE
    `;
    const queryParams: any[] = [recordId];

    if (!tenant.isPlatformAdmin) {
      queryParams.push(tenant.userId, tenant.businessId);
      querySql += ` AND (
        br.created_by = $2 
        OR (
          br.business_id = $3 
          AND br.business_id IN (SELECT id FROM business_profiles WHERE user_id = $2)
        )
      )`;
    }

    querySql += ` LIMIT 1`;
    const recRes = await db.query(querySql, queryParams);

    if (recRes.rows.length === 0) {
      return NextResponse.json({ error: "Record not found or access denied" }, { status: 404 });
    }
    const record = recRes.rows[0];

    // Fetch vertical detail table
    let details: any = null;
    switch (record.vertical_code) {
      case "vehicles": {
        const vd = await db.query(`SELECT * FROM vehicle_details WHERE record_id = $1 LIMIT 1`, [recordId]);
        details = vd.rows[0] || null;
        break;
      }
      case "properties": {
        const pd = await db.query(`SELECT * FROM property_details WHERE record_id = $1 LIMIT 1`, [recordId]);
        details = pd.rows[0] || null;
        break;
      }
      case "restaurants": {
        const dd = await db.query(`
          SELECT d.*, mc.name as menu_category_name
          FROM dishes d
          LEFT JOIN menu_categories mc ON mc.id = d.menu_category_id
          WHERE d.record_id = $1 LIMIT 1
        `, [recordId]);
        details = dd.rows[0] || null;
        if (details) {
          const variants = await db.query(`SELECT * FROM dish_variants WHERE dish_id = $1 ORDER BY price ASC`, [details.id]);
          details.variants = variants.rows;
        }
        break;
      }
      case "hotels": {
        const hd = await db.query(`SELECT * FROM hotel_rooms WHERE record_id = $1 LIMIT 1`, [recordId]);
        details = hd.rows[0] || null;
        break;
      }
      case "events": {
        const ed = await db.query(`SELECT * FROM events WHERE record_id = $1 LIMIT 1`, [recordId]);
        details = ed.rows[0] || null;
        if (details) {
          const tickets = await db.query(`SELECT * FROM event_tickets WHERE event_id = $1 ORDER BY price ASC`, [details.id]);
          details.tickets = tickets.rows;
        }
        break;
      }
      case "education": {
        const sd = await db.query(`SELECT * FROM students WHERE record_id = $1 LIMIT 1`, [recordId]);
        details = sd.rows[0] || null;
        if (details) {
          const acad = await db.query(`SELECT * FROM student_academic_records WHERE student_id = $1 ORDER BY id DESC`, [details.id]);
          details.academic_records = acad.rows;
        }
        break;
      }
      case "healthcare": {
        const pt = await db.query(`SELECT * FROM patients WHERE record_id = $1 LIMIT 1`, [recordId]);
        details = pt.rows[0] || null;
        if (details) {
          const med = await db.query(`SELECT * FROM patient_medical_records WHERE patient_id = $1 ORDER BY visit_date DESC`, [details.id]);
          details.medical_records = med.rows;
        }
        break;
      }
    }

    // Fetch dynamic attributes
    const attrRes = await db.query(`
      SELECT bra.*, ma.label, ma.field_type, ma.options
      FROM business_record_attributes bra
      LEFT JOIN master_attributes ma ON ma.id = bra.attribute_id
      WHERE bra.record_id = $1
    `, [recordId]);

    // Fetch media
    const mediaRes = await db.query(`
      SELECT * FROM business_record_media
      WHERE record_id = $1
      ORDER BY display_order ASC, id ASC
    `, [recordId]);

    // Fetch audit logs
    const auditRes = await db.query(`
      SELECT al.*, u.email as user_email
      FROM business_record_audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.record_id = $1
      ORDER BY al.id DESC
      LIMIT 20
    `, [recordId]);

    return NextResponse.json({
      success: true,
      data: {
        ...record,
        details,
        custom_attributes: attrRes.rows,
        media: mediaRes.rows,
        audit_logs: auditRes.rows,
      }
    });
  } catch (err: any) {
    console.error("[Record GET by ID] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load record" }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const recordId = Number(params.id);
    if (!recordId) {
      return NextResponse.json({ error: "Invalid record ID" }, { status: 400 });
    }

    const tenant = await resolveTenantContext(req);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 401 });
    }

    // Check ownership: user can only update their own records
    let checkSql = `SELECT * FROM business_records WHERE id = $1 AND is_deleted = FALSE`;
    const checkParams: any[] = [recordId];

    if (!tenant.isPlatformAdmin) {
      checkParams.push(tenant.userId, tenant.businessId);
      checkSql += ` AND (
        created_by = $2 
        OR (
          business_id = $3 
          AND business_id IN (SELECT id FROM business_profiles WHERE user_id = $2)
        )
      )`;
    }

    const existingRes = await db.query(checkSql, checkParams);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "Record not found or access denied" }, { status: 404 });
    }
    const oldRec = existingRes.rows[0];

    const body = await req.json();
    const {
      title,
      description,
      category_id,
      subcategory_id,
      status,
      is_active,
      is_featured,
      currency,
      price,
      featured_image,
      metadata,
      custom_attributes,
      media,
      details = {},
    } = body;

    // Update business_records
    const updateRes = await db.query(`
      UPDATE business_records
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category_id = $3,
        subcategory_id = $4,
        status = COALESCE($5, status),
        is_active = COALESCE($6, is_active),
        is_featured = COALESCE($7, is_featured),
        currency = COALESCE($8, currency),
        price = $9,
        featured_image = COALESCE($10, featured_image),
        metadata = COALESCE($11, metadata),
        updated_by = $12,
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [
      title ? title.trim() : null,
      description !== undefined ? description : null,
      category_id ? Number(category_id) : null,
      subcategory_id ? Number(subcategory_id) : null,
      status || null,
      is_active !== undefined ? Boolean(is_active) : null,
      is_featured !== undefined ? Boolean(is_featured) : null,
      currency || null,
      price !== undefined && price !== "" ? Number(price) : null,
      featured_image !== undefined ? featured_image : null,
      metadata ? JSON.stringify(metadata) : null,
      tenant.userId,
      recordId
    ]);

    const updatedRecord = updateRes.rows[0];

    // Update vertical detail table
    switch (oldRec.vertical_code) {
      case "vehicles": {
        await db.query(`
          UPDATE vehicle_details SET
            vehicle_type_id = $1, brand_id = $2, model_id = $3, variant_id = $4,
            fuel_type_id = $5, transmission_type_id = $6, body_type_id = $7, vehicle_condition_id = $8,
            manufacturing_year = $9, registration_year = $10, color = $11, engine_capacity = $12,
            mileage = $13, kilometers_driven = $14, number_of_owners = $15, seating_capacity = $16,
            registration_number = $17, vin_chassis_number = $18, is_negotiable = $19, financing_available = $20,
            warranty_info = $21, location = $22, contact_info = $23, specifications = COALESCE($24, specifications)
          WHERE record_id = $25
        `, [
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
          details.specifications ? JSON.stringify(details.specifications) : null,
          recordId,
        ]);
        break;
      }

      case "properties": {
        await db.query(`
          UPDATE property_details SET
            property_type_id = $1, listing_type_id = $2, ownership_type_id = $3,
            furnishing_type_id = $4, construction_status_id = $5, property_condition_id = $6, land_type_id = $7,
            bedrooms = $8, bathrooms = $9, balconies = $10, parking_spaces = $11, total_floors = $12, floor_number = $13,
            built_up_area = $14, plot_area = $15, area_unit = $16, amenities = $17, rental_amount = $18, security_deposit = $19,
            maintenance_charges = $20, country = $21, state = $22, city = $23, suburb = $24, street_address = $25,
            latitude = $26, longitude = $27, availability_status = $28
          WHERE record_id = $29
        `, [
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
          recordId,
        ]);
        break;
      }

      case "restaurants": {
        const dishUpdate = await db.query(`
          UPDATE dishes SET
            menu_category_id = $1, cuisine_id = $2, dietary_type_id = $3, food_type_id = $4,
            serving_unit_id = $5, meal_type_id = $6, discounted_price = $7, portion_size = $8,
            ingredients = $9, allergens = $10, prep_time_minutes = $11, spice_level = $12,
            calories = $13, is_available = $14, category_ids = $15
          WHERE record_id = $16
          RETURNING id
        `, [
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
          recordId,
        ]);

        const dishId = dishUpdate.rows[0]?.id;
        if (dishId && Array.isArray(details.variants)) {
          await db.query(`DELETE FROM dish_variants WHERE dish_id = $1`, [dishId]);
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
          UPDATE hotel_rooms SET
            room_number = $1, room_category_id = $2, room_subcategory_id = $3, room_type_id = $4,
            bed_type_id = $5, view_type_id = $6, occupancy_type_id = $7, meal_plan_id = $8,
            accommodation_type_id = $9, room_size_sqft = $10, max_adults = $11, max_children = $12,
            number_of_beds = $13, amenities = $14, price_per_night = $15, weekend_price = $16,
            seasonal_price = $17, extra_guest_charge = $18, check_in_time = $19, check_out_time = $20,
            cancellation_policy = $21
          WHERE record_id = $22
        `, [
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
          recordId,
        ]);
        break;
      }

      case "events": {
        const evUpdate = await db.query(`
          UPDATE events SET
            event_category_id = $1, event_subcategory_id = $2, event_type_id = $3,
            event_format_id = $4, audience_type_id = $5, organizer_name = $6,
            start_date = $7, end_date = $8, start_time = $9, end_time = $10,
            time_zone = $11, registration_deadline = $12, venue_name = $13,
            complete_address = $14, city = $15, state = $16, country = $17,
            online_meeting_url = $18, speakers = $19, performers = $20,
            amenities = $21, age_restrictions = $22, terms_conditions = $23, is_free = $24
          WHERE record_id = $25
          RETURNING id
        `, [
          details.event_category_id ? Number(details.event_category_id) : null,
          details.event_subcategory_id ? Number(details.event_subcategory_id) : null,
          details.event_type_id ? Number(details.event_type_id) : null,
          details.event_format_id ? Number(details.event_format_id) : null,
          details.audience_type_id ? Number(details.audience_type_id) : null,
          details.organizer_name || null,
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
          recordId,
        ]);

        const eventId = evUpdate.rows[0]?.id;
        if (eventId && Array.isArray(details.tickets)) {
          await db.query(`DELETE FROM event_tickets WHERE event_id = $1`, [eventId]);
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
          UPDATE students SET
            admission_number = $1, student_category_id = $2, student_subcategory_id = $3,
            education_level_id = $4, course_id = $5, department_id = $6, academic_program_id = $7,
            learning_mode_id = $8, examination_type_id = $9, student_status_id = $10,
            dob = $11, gender = $12, contact_number = $13, email = $14, blood_group = $15,
            class_grade = $16, section = $17, academic_year = $18, admission_date = $19,
            guardian_name = $20, guardian_relation = $21, guardian_phone = $22, emergency_contact = $23,
            address = $24, city = $25, state = $26, postal_code = $27, notes = $28
          WHERE record_id = $29
        `, [
          details.admission_number || null,
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
          details.admission_date || null,
          details.guardian_name || null,
          details.guardian_relation || null,
          details.guardian_phone || null,
          details.emergency_contact || null,
          details.address || null,
          details.city || null,
          details.state || null,
          details.postal_code || null,
          details.notes || null,
          recordId,
        ]);
        break;
      }

      case "healthcare": {
        await db.query(`
          UPDATE patients SET
            patient_identifier = $1, patient_category_id = $2, patient_subcategory_id = $3,
            medical_department_id = $4, medical_specialty_id = $5, consultation_type_id = $6,
            treatment_category_id = $7, patient_visit_type_id = $8, admission_type_id = $9,
            care_type_id = $10, dob = $11, gender = $12, phone = $13, email = $14,
            blood_group = $15, assigned_doctor = $16, registration_date = $17,
            referral_source = $18, emergency_contact_name = $19, emergency_contact_phone = $20,
            known_allergies = $21, medical_alerts = $22, address = $23, city = $24,
            state = $25, postal_code = $26, is_confidential = $27
          WHERE record_id = $28
        `, [
          details.patient_identifier || null,
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
          details.registration_date || null,
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
          recordId,
        ]);
        break;
      }
    }

    // Dynamic attributes update
    if (custom_attributes && typeof custom_attributes === "object") {
      for (const [attrCode, val] of Object.entries(custom_attributes)) {
        if (val !== undefined) {
          const aLookup = await db.query(
            `SELECT id, field_type FROM master_attributes WHERE vertical_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
            [oldRec.vertical_id, attrCode]
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
            ON CONFLICT (record_id, attribute_code) DO UPDATE SET
              value_text = EXCLUDED.value_text,
              value_number = EXCLUDED.value_number,
              value_boolean = EXCLUDED.value_boolean,
              value_json = EXCLUDED.value_json
          `, [recordId, attrId, attrCode, vText, vNum, vBool, vJson]);
        }
      }
    }

    // Media update if provided
    if (Array.isArray(media)) {
      await db.query(`DELETE FROM business_record_media WHERE record_id = $1`, [recordId]);
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

    // Write audit log
    await db.query(`
      INSERT INTO business_record_audit_logs (record_id, business_id, user_id, action, changes)
      VALUES ($1, $2, $3, 'update', $4)
    `, [recordId, tenant.businessId, tenant.userId, JSON.stringify({ title: updatedRecord.title, status: updatedRecord.status })]);

    return NextResponse.json({
      success: true,
      message: `${updatedRecord.title} updated successfully!`,
      data: updatedRecord,
    });
  } catch (err: any) {
    console.error("[Record PUT by ID] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const recordId = Number(params.id);
    if (!recordId) {
      return NextResponse.json({ error: "Invalid record ID" }, { status: 400 });
    }

    const tenant = await resolveTenantContext(req);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 401 });
    }

    // Soft delete: user can only delete their own records
    let delSql = `
      UPDATE business_records
      SET is_deleted = TRUE, deleted_at = NOW(), updated_by = $1, status = 'archived'
      WHERE id = $2 AND is_deleted = FALSE
    `;
    const delParams: any[] = [tenant.userId, recordId];

    if (!tenant.isPlatformAdmin) {
      delParams.push(tenant.userId, tenant.businessId);
      delSql += ` AND (
        created_by = $3 
        OR (
          business_id = $4 
          AND business_id IN (SELECT id FROM business_profiles WHERE user_id = $3)
        )
      )`;
    }

    delSql += ` RETURNING id, title, vertical_code`;
    const res = await db.query(delSql, delParams);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Record not found or access denied" }, { status: 404 });
    }

    const deletedRecord = res.rows[0];

    // Audit log
    await db.query(`
      INSERT INTO business_record_audit_logs (record_id, business_id, user_id, action, changes)
      VALUES ($1, $2, $3, 'delete', $4)
    `, [recordId, tenant.businessId, tenant.userId, JSON.stringify({ action: "soft_deleted" })]);

    return NextResponse.json({
      success: true,
      message: `${deletedRecord.title} has been moved to archive.`,
      data: deletedRecord,
    });
  } catch (err: any) {
    console.error("[Record DELETE by ID] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete record" }, { status: 500 });
  }
}
