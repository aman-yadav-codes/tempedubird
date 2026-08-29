import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { createLocation, listLocations } from "@/lib/queries/locations";
import { getPagination, getPageCount } from "@/lib/queries/pagination";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function capitalize(text: string) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Helper to find or create a location node in hierarchy
async function findOrCreateLocationNode(
  name: string,
  type: "country" | "state" | "city" | "area",
  parentId: number | null,
  lat?: number | null,
  lng?: number | null
) {
  const cleanName = capitalize(name.trim());
  const slug = toSlug(cleanName);

  // Check if exists
  const existing = await db.query(
    `SELECT id, name, slug, type, parent_id FROM locations WHERE (slug = $1 OR name ILIKE $2) AND type = $3 AND is_deleted = FALSE LIMIT 1`,
    [slug, cleanName, type]
  );

  if (existing.rows.length > 0) {
    // If updating coordinates
    if (lat && lng) {
      await db.query(
        `UPDATE locations SET latitude = COALESCE(latitude, $1), longitude = COALESCE(longitude, $2) WHERE id = $3`,
        [lat, lng, existing.rows[0].id]
      );
    }
    return existing.rows[0];
  }

  // Create new
  const created = await db.query(
    `INSERT INTO locations (name, slug, type, parent_id, latitude, longitude, location_scope, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, 'global', TRUE)
     RETURNING id, name, slug, type, parent_id, latitude, longitude`,
    [cleanName, slug, type, parentId, lat || null, lng || null]
  );

  return created.rows[0];
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const url = new URL(req.url);
    const { page, limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() || "";
    const type = url.searchParams.get("type")?.trim() || undefined;
    const scopesParam = url.searchParams.get("scopes");
    const scopes = scopesParam ? scopesParam.split(",") : undefined;

    const { data, total } = await listLocations(db, { search, limit, offset, scopes, type });

    return NextResponse.json({
      data,
      pageCount: getPageCount(total, limit),
      total,
    });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json();

    const country = body.country?.trim() || "India";
    const state = body.state?.trim() || "";
    const city = body.city?.trim() || "";
    const area = body.area?.trim() || "";
    const latitude = body.latitude ? parseFloat(String(body.latitude)) : null;
    const longitude = body.longitude ? parseFloat(String(body.longitude)) : null;

    // Direct structured hierarchy creation
    if (area || city || state || country) {
      let countryNode = null;
      if (country) {
        countryNode = await findOrCreateLocationNode(country, "country", null);
      }

      let stateNode = null;
      if (state) {
        stateNode = await findOrCreateLocationNode(state, "state", countryNode ? countryNode.id : null);
      }

      let cityNode = null;
      if (city) {
        cityNode = await findOrCreateLocationNode(
          city,
          "city",
          stateNode ? stateNode.id : countryNode ? countryNode.id : null,
          !area ? latitude : null,
          !area ? longitude : null
        );
      }

      let areaNode = null;
      if (area) {
        areaNode = await findOrCreateLocationNode(
          area,
          "area",
          cityNode ? cityNode.id : stateNode ? stateNode.id : null,
          latitude,
          longitude
        );
      }

      const primaryLocation = areaNode || cityNode || stateNode || countryNode;
      return NextResponse.json({ data: primaryLocation }, { status: 201 });
    }

    // Fallback standard explicit creation
    const { name, slug, type, parent_id, location_scope } = body;
    if (!name || !slug || !type) {
      return NextResponse.json({ error: "Location details (name, type) or address fields are required" }, { status: 400 });
    }

    const location = await createLocation(db, {
      name: capitalize(name),
      slug: toSlug(slug),
      type,
      parent_id: parent_id ?? null,
      latitude,
      longitude,
      location_scope: location_scope || "global",
    });

    return NextResponse.json({ data: location }, { status: 201 });
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json({ error: "A location with that name/slug already exists" }, { status: 409 });
    }
    const status = err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
