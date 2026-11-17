import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows } = await db.query(`
      SELECT 
        cc.*,
        COUNT(DISTINCT st.id) as state_count,
        COUNT(DISTINCT ct.id) as city_count
      FROM country_configurations cc
      LEFT JOIN locations l ON l.type = 'country' AND (l.name ILIKE cc.country_name OR l.country ILIKE cc.country_name)
      LEFT JOIN locations st ON st.type = 'state' AND (st.parent_id = l.id OR st.country = cc.country_name)
      LEFT JOIN locations ct ON ct.type = 'city' AND (ct.country = cc.country_name OR ct.parent_id = st.id)
      GROUP BY cc.id
      ORDER BY cc.country_name ASC;
    `);

    return NextResponse.json({ success: true, countries: rows });
  } catch (error: any) {
    console.error("Failed to fetch countries:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch countries" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      country_name,
      country_code,
      currency_code,
      currency_symbol,
      phone_code,
      postal_code_label,
      postal_code_regex,
      phone_regex,
      address_format,
      default_language,
      supported_languages,
      default_timezone,
      supported_timezones,
      seo_metadata,
      is_active = true,
    } = body;

    if (!country_name?.trim() || !country_code?.trim()) {
      return NextResponse.json({ error: "Country name and 2-letter code are required" }, { status: 400 });
    }

    const code = country_code.trim().toUpperCase();
    const name = country_name.trim();

    const result = await db.query(
      `
      INSERT INTO country_configurations (
        country_name, country_code, currency_code, currency_symbol, phone_code,
        postal_code_label, postal_code_regex, phone_regex, address_format,
        default_language, supported_languages, default_timezone, supported_timezones,
        seo_metadata, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (country_code) DO UPDATE SET
        country_name = EXCLUDED.country_name,
        currency_code = EXCLUDED.currency_code,
        currency_symbol = EXCLUDED.currency_symbol,
        phone_code = EXCLUDED.phone_code,
        postal_code_label = EXCLUDED.postal_code_label,
        postal_code_regex = EXCLUDED.postal_code_regex,
        phone_regex = EXCLUDED.phone_regex,
        address_format = EXCLUDED.address_format,
        default_language = EXCLUDED.default_language,
        supported_languages = EXCLUDED.supported_languages,
        default_timezone = EXCLUDED.default_timezone,
        supported_timezones = EXCLUDED.supported_timezones,
        seo_metadata = EXCLUDED.seo_metadata,
        is_active = EXCLUDED.is_active
      RETURNING *;
    `,
      [
        name,
        code,
        (currency_code || "USD").toUpperCase(),
        currency_symbol || "$",
        phone_code || "+1",
        postal_code_label || (code === "IN" ? "PIN code" : "ZIP code"),
        postal_code_regex || (code === "IN" ? "^[1-9][0-9]{5}$" : "^\\d{5}(-\\d{4})?$"),
        phone_regex || (code === "IN" ? "^(\\+91[\\-\\s]?)?[6789]\\d{9}$" : "^(\\+1[\\-\\s]?)?\\(?([2-9][0-8][0-9])\\)?[\\-\\s]?([2-9][0-9]{2})[\\-\\s]?([0-9]{4})$"),
        JSON.stringify(address_format || (code === "IN" ? ["locality", "city", "district", "state", "postal_code"] : ["locality", "city", "county", "state", "postal_code"])),
        default_language || (code === "IN" ? "en-IN" : "en-US"),
        JSON.stringify(supported_languages || (code === "IN" ? ["en", "hi"] : ["en", "es"])),
        default_timezone || (code === "IN" ? "Asia/Kolkata" : "America/New_York"),
        JSON.stringify(supported_timezones || (code === "IN" ? ["Asia/Kolkata"] : ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"])),
        JSON.stringify(seo_metadata || {}),
        is_active,
      ]
    );

    // Also ensure country exists in locations
    const locCheck = await db.query(
      `SELECT id FROM locations WHERE type = 'country' AND (name ILIKE $1 OR slug = $2) LIMIT 1`,
      [name, name.toLowerCase().replace(/[^a-z0-9]+/g, "-")]
    );
    if (!locCheck.rows[0]) {
      await db.query(
        `
        INSERT INTO locations (name, slug, type, country, is_active, is_deleted)
        VALUES ($1, $2, 'country', $1, true, false)
      `,
        [name, name.toLowerCase().replace(/[^a-z0-9]+/g, "-")]
      );
    }

    return NextResponse.json({ success: true, country: result.rows[0] });
  } catch (error: any) {
    console.error("Failed to save country:", error);
    return NextResponse.json({ error: error.message || "Failed to save country" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, is_active, currency_code, currency_symbol, phone_code, postal_code_label, default_timezone, default_language } = body;

    if (!id) {
      return NextResponse.json({ error: "Country ID is required" }, { status: 400 });
    }

    const result = await db.query(
      `
      UPDATE country_configurations
      SET 
        is_active = COALESCE($1, is_active),
        currency_code = COALESCE($2, currency_code),
        currency_symbol = COALESCE($3, currency_symbol),
        phone_code = COALESCE($4, phone_code),
        postal_code_label = COALESCE($5, postal_code_label),
        default_timezone = COALESCE($6, default_timezone),
        default_language = COALESCE($7, default_language)
      WHERE id = $8
      RETURNING *;
    `,
      [is_active, currency_code, currency_symbol, phone_code, postal_code_label, default_timezone, default_language, id]
    );

    return NextResponse.json({ success: true, country: result.rows[0] });
  } catch (error: any) {
    console.error("Failed to update country:", error);
    return NextResponse.json({ error: error.message || "Failed to update country" }, { status: 500 });
  }
}
