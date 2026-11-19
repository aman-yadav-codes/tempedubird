import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { resolveTenantContext } from "@/lib/records/tenant-context";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
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

    // 1. Fetch original record
    const origRes = await db.query(
      `SELECT * FROM business_records WHERE id = $1 AND is_deleted = FALSE AND (business_id = $2 OR institution_id = $3 OR business_id = $3 OR institution_id = $2)`,
      [recordId, tenant.businessId, tenant.institutionId || tenant.businessId]
    );
    if (origRes.rows.length === 0) {
      return NextResponse.json({ error: "Record not found or access denied" }, { status: 404 });
    }
    const orig = origRes.rows[0];

    const newTitle = `${orig.title} (Copy)`;
    let newSlug = `${orig.slug}-copy-${Date.now().toString().slice(-4)}`;

    // 2. Clone core record
    const cloneRec = await db.query(`
      INSERT INTO business_records (
        business_id, institution_id, vertical_id, vertical_code, title, slug,
        description, category_id, subcategory_id, status, is_active, is_featured,
        currency, price, featured_image, metadata, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', TRUE, FALSE,
        $10, $11, $12, $13, $14, $14
      )
      RETURNING *
    `, [
      orig.business_id,
      orig.institution_id,
      orig.vertical_id,
      orig.vertical_code,
      newTitle,
      newSlug,
      orig.description,
      orig.category_id,
      orig.subcategory_id,
      orig.currency,
      orig.price,
      orig.featured_image,
      orig.metadata,
      tenant.userId,
    ]);

    const newId = cloneRec.rows[0].id;

    // 3. Clone vertical detail
    switch (orig.vertical_code) {
      case "vehicles": {
        await db.query(`
          INSERT INTO vehicle_details (
            record_id, vehicle_type_id, brand_id, model_id, variant_id, fuel_type_id,
            transmission_type_id, body_type_id, vehicle_condition_id, manufacturing_year,
            registration_year, color, engine_capacity, mileage, kilometers_driven,
            number_of_owners, seating_capacity, registration_number, vin_chassis_number,
            is_negotiable, financing_available, warranty_info, location, contact_info, specifications
          )
          SELECT $1, vehicle_type_id, brand_id, model_id, variant_id, fuel_type_id,
                 transmission_type_id, body_type_id, vehicle_condition_id, manufacturing_year,
                 registration_year, color, engine_capacity, mileage, kilometers_driven,
                 number_of_owners, seating_capacity, NULL, NULL,
                 is_negotiable, financing_available, warranty_info, location, contact_info, specifications
          FROM vehicle_details WHERE record_id = $2
        `, [newId, orig.id]);
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
          )
          SELECT $1, property_type_id, listing_type_id, ownership_type_id,
                 furnishing_type_id, construction_status_id, property_condition_id, land_type_id,
                 bedrooms, bathrooms, balconies, parking_spaces, total_floors, floor_number,
                 built_up_area, plot_area, area_unit, amenities, rental_amount, security_deposit,
                 maintenance_charges, country, state, city, suburb, street_address,
                 latitude, longitude, availability_status
          FROM property_details WHERE record_id = $2
        `, [newId, orig.id]);
        break;
      }
      case "restaurants": {
        const dishCopy = await db.query(`
          INSERT INTO dishes (
            record_id, menu_category_id, cuisine_id, dietary_type_id, food_type_id,
            serving_unit_id, meal_type_id, discounted_price, portion_size, ingredients,
            allergens, prep_time_minutes, spice_level, calories, is_available, category_ids
          )
          SELECT $1, menu_category_id, cuisine_id, dietary_type_id, food_type_id,
                 serving_unit_id, meal_type_id, discounted_price, portion_size, ingredients,
                 allergens, prep_time_minutes, spice_level, calories, is_available, category_ids
          FROM dishes WHERE record_id = $2
          RETURNING id
        `, [newId, orig.id]);

        const newDishId = dishCopy.rows[0]?.id;
        if (newDishId) {
          const oldDish = await db.query(`SELECT id FROM dishes WHERE record_id = $1`, [orig.id]);
          if (oldDish.rows.length > 0) {
            await db.query(`
              INSERT INTO dish_variants (dish_id, variant_name, price, discounted_price, is_default)
              SELECT $1, variant_name, price, discounted_price, is_default
              FROM dish_variants WHERE dish_id = $2
            `, [newDishId, oldDish.rows[0].id]);
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
          )
          SELECT $1, NULL, room_category_id, room_subcategory_id, room_type_id,
                 bed_type_id, view_type_id, occupancy_type_id, meal_plan_id, accommodation_type_id,
                 room_size_sqft, max_adults, max_children, number_of_beds, amenities,
                 price_per_night, weekend_price, seasonal_price, extra_guest_charge,
                 check_in_time, check_out_time, cancellation_policy
          FROM hotel_rooms WHERE record_id = $2
        `, [newId, orig.id]);
        break;
      }
      case "events": {
        const evCopy = await db.query(`
          INSERT INTO events (
            record_id, event_category_id, event_subcategory_id, event_type_id,
            event_format_id, audience_type_id, organizer_name, start_date, end_date,
            start_time, end_time, time_zone, registration_deadline, venue_name,
            complete_address, city, state, country, online_meeting_url,
            speakers, performers, amenities, age_restrictions, terms_conditions, is_free
          )
          SELECT $1, event_category_id, event_subcategory_id, event_type_id,
                 event_format_id, audience_type_id, organizer_name, start_date, end_date,
                 start_time, end_time, time_zone, registration_deadline, venue_name,
                 complete_address, city, state, country, online_meeting_url,
                 speakers, performers, amenities, age_restrictions, terms_conditions, is_free
          FROM events WHERE record_id = $2
          RETURNING id
        `, [newId, orig.id]);

        const newEvId = evCopy.rows[0]?.id;
        if (newEvId) {
          const oldEv = await db.query(`SELECT id FROM events WHERE record_id = $1`, [orig.id]);
          if (oldEv.rows.length > 0) {
            await db.query(`
              INSERT INTO event_tickets (event_id, ticket_type_id, name, price, total_capacity, available_capacity, is_active)
              SELECT $1, ticket_type_id, name, price, total_capacity, total_capacity, is_active
              FROM event_tickets WHERE event_id = $2
            `, [newEvId, oldEv.rows[0].id]);
          }
        }
        break;
      }
    }

    // 4. Clone custom attributes
    await db.query(`
      INSERT INTO business_record_attributes (record_id, attribute_id, attribute_code, value_text, value_number, value_boolean, value_json)
      SELECT $1, attribute_id, attribute_code, value_text, value_number, value_boolean, value_json
      FROM business_record_attributes WHERE record_id = $2
    `, [newId, orig.id]);

    // 5. Clone media
    await db.query(`
      INSERT INTO business_record_media (record_id, media_type, url, title, display_order, is_featured)
      SELECT $1, media_type, url, title, display_order, is_featured
      FROM business_record_media WHERE record_id = $2
    `, [newId, orig.id]);

    // 6. Audit log
    await db.query(`
      INSERT INTO business_record_audit_logs (record_id, business_id, user_id, action, changes)
      VALUES ($1, $2, $3, 'duplicate', $4)
    `, [newId, tenant.businessId, tenant.userId, JSON.stringify({ original_id: orig.id, title: newTitle })]);

    return NextResponse.json({
      success: true,
      message: `Duplicated successfully as "${newTitle}"`,
      data: cloneRec.rows[0],
    }, { status: 201 });
  } catch (err: any) {
    console.error("[Record Duplicate] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to duplicate record" }, { status: 500 });
  }
}
