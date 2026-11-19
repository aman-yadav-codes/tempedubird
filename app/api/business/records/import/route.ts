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

export async function POST(req: Request) {
  try {
    const tenant = await resolveTenantContext(req);
    if (!tenant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { vertical_code, records = [] } = body;

    if (!vertical_code) {
      return NextResponse.json({ error: "vertical_code is required" }, { status: 400 });
    }
    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "No records provided for import" }, { status: 400 });
    }

    const vRes = await db.query(`SELECT id FROM master_verticals WHERE LOWER(code) = LOWER($1) LIMIT 1`, [vertical_code]);
    if (vRes.rows.length === 0) {
      return NextResponse.json({ error: `Invalid vertical_code '${vertical_code}'` }, { status: 400 });
    }
    const verticalId = vRes.rows[0].id;

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const item = records[i];
      const title = item.title || item.Title || item.name || item.Name;
      if (!title || !String(title).trim()) {
        skippedCount++;
        continue;
      }

      try {
        let baseSlug = slugify(String(title));
        let finalSlug = baseSlug;
        let suffix = 1;

        while (true) {
          const check = await db.query(
            `SELECT id FROM business_records WHERE business_id = $1 AND slug = $2 AND is_deleted = FALSE LIMIT 1`,
            [tenant.businessId, finalSlug]
          );
          if (check.rows.length === 0) break;
          finalSlug = `${baseSlug}-${suffix}`;
          suffix++;
        }

        const price = item.price || item.Price ? Number(item.price || item.Price) : null;
        const desc = item.description || item.Description || null;
        const status = item.status || item.Status || "published";

        const recInsert = await db.query(`
          INSERT INTO business_records (
            business_id, institution_id, vertical_id, vertical_code, title, slug,
            description, status, is_active, is_featured, currency, price, created_by, updated_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, TRUE, FALSE, 'INR', $9, $10, $10
          )
          RETURNING id
        `, [
          tenant.businessId,
          tenant.institutionId || tenant.businessId,
          verticalId,
          vertical_code,
          String(title).trim(),
          finalSlug,
          desc,
          status,
          price,
          tenant.userId
        ]);

        const recordId = recInsert.rows[0].id;

        // Detail table default insertion
        if (vertical_code === "vehicles") {
          await db.query(`
            INSERT INTO vehicle_details (record_id, color, mileage, location)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (record_id) DO NOTHING
          `, [recordId, item.color || item.Color || null, item.mileage || item.Mileage || null, item.location || item.Location || null]);
        } else if (vertical_code === "properties") {
          await db.query(`
            INSERT INTO property_details (record_id, bedrooms, bathrooms, built_up_area, city, street_address)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (record_id) DO NOTHING
          `, [
            recordId,
            item.bedrooms ? Number(item.bedrooms) : null,
            item.bathrooms ? Number(item.bathrooms) : null,
            item.built_up_area ? Number(item.built_up_area) : null,
            item.city || "Varanasi",
            item.address || item.street_address || null
          ]);
        } else if (vertical_code === "restaurants") {
          await db.query(`
            INSERT INTO dishes (record_id, spice_level, prep_time_minutes, is_available)
            VALUES ($1, $2, $3, TRUE)
            ON CONFLICT (record_id) DO NOTHING
          `, [recordId, item.spice_level || "Medium", item.prep_time ? Number(item.prep_time) : 20]);
        } else if (vertical_code === "hotels") {
          await db.query(`
            INSERT INTO hotel_rooms (record_id, room_number, price_per_night, max_adults)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (record_id) DO NOTHING
          `, [recordId, item.room_number || null, price || 3500, item.max_adults ? Number(item.max_adults) : 2]);
        }

        importedCount++;
      } catch (err: any) {
        errors.push(`Row ${i + 1} (${title}): ${err.message}`);
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${importedCount} records imported, ${skippedCount} skipped.`,
      importedCount,
      skippedCount,
      errors: errors.slice(0, 10),
    });
  } catch (err: any) {
    console.error("[Records Import POST] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to import records" }, { status: 500 });
  }
}
