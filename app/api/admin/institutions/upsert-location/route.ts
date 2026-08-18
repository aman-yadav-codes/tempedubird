import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

/**
 * POST /api/admin/institutions/upsert-location
 * Given a PickedLocation payload from the GoogleLocationPicker,
 * this finds or creates a location record and returns its id.
 */
export async function POST(req: Request) {
    try {
        await requireAdmin(req);
        const body = await req.json();

        const {
            latitude,
            longitude,
            country,
            state,
            city,
            area,
            pincode,
            full_address,
            formatted_address,
            place_id,
        } = body;

        if (!latitude || !longitude) {
            return NextResponse.json({ error: "latitude and longitude are required" }, { status: 400 });
        }

        // Build the location name from available parts, prioritizing formatted_address or full_address
        const name = formatted_address || full_address || [area, city, state, country].filter(Boolean).join(", ") || "Unknown";

        // Generate a slug from place_id or coordinates
        const slugBase = place_id
            ? place_id.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 60)
            : `loc-${String(latitude).replace(".", "")}-${String(longitude).replace(".", "")}`;

        // Check if a location with this place_id or coordinates already exists
        let existingRow = null;

        if (place_id) {
            // Try to find by slug (which encodes the place_id)
            const existing = await db.query(
                `SELECT id FROM locations WHERE slug = $1 AND is_deleted = FALSE LIMIT 1`,
                [slugBase]
            );
            if (existing.rows.length) existingRow = existing.rows[0];
        }

        if (!existingRow) {
            // Try find by lat/lng (within small tolerance)
            const existing = await db.query(
                `SELECT id FROM locations WHERE ABS(latitude::numeric - $1::numeric) < 0.001 AND ABS(longitude::numeric - $2::numeric) < 0.001 AND is_deleted = FALSE LIMIT 1`,
                [parseFloat(latitude), parseFloat(longitude)]
            );
            if (existing.rows.length) existingRow = existing.rows[0];
        }

        if (existingRow) {
            return NextResponse.json({ id: existingRow.id });
        }

        // Create new location
        // Ensure unique slug
        let slug = slugBase;
        let i = 1;
        while (true) {
            const check = await db.query(`SELECT 1 FROM locations WHERE slug = $1 LIMIT 1`, [slug]);
            if (!check.rows.length) break;
            slug = `${slugBase}-${i++}`;
        }

        const inserted = await db.query(
            `INSERT INTO locations (name, slug, type, latitude, longitude, location_scope)
             VALUES ($1, $2, 'city', $3, $4, 'institution')
             RETURNING id`,
            [
                name,
                slug,
                parseFloat(latitude),
                parseFloat(longitude),
            ]
        );

        return NextResponse.json({ id: inserted.rows[0].id }, { status: 201 });
    } catch (err: any) {
        const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
        return NextResponse.json({ error: err.message }, { status });
    }
}
