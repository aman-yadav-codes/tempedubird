import { db } from "@/lib/db/db";
import { parseDiscoverySeoSlug, extractIdFromSlug, KNOWN_CATEGORY_SLUG_LABELS } from "@/lib/utils/seo-slug";
import CustomerExplorePage from "@/app/(public)/explore/page";
import { PublicVehicleDetailView } from "@/components/public/public-vehicle-detail-view";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function fetchVehicleRecord(idOrSlug: string) {
  try {
    const rawSlug = decodeURIComponent(idOrSlug || "").trim().toLowerCase();
    let withoutLocation = rawSlug;
    const lastInIndex = rawSlug.lastIndexOf("-in-");
    if (lastInIndex !== -1) {
      withoutLocation = rawSlug.substring(0, lastInIndex);
    }

    if (
      rawSlug.startsWith("in-") ||
      rawSlug.startsWith("all-") ||
      rawSlug.startsWith("vehicle-") ||
      KNOWN_CATEGORY_SLUG_LABELS[rawSlug] ||
      KNOWN_CATEGORY_SLUG_LABELS[withoutLocation]
    ) {
      return null;
    }

    try {
      const catCheck = await db.query(
        `SELECT 1 FROM categories WHERE slug = $1 OR slug = $2 LIMIT 1`,
        [withoutLocation, rawSlug]
      );
      if (catCheck.rows.length > 0) {
        return null;
      }
    } catch {}
    const { id: rawNumId } = extractIdFromSlug(rawSlug);
    const { id: withoutLocId } = extractIdFromSlug(withoutLocation);
    const numId = rawNumId || withoutLocId || -1;

    const slugVariants = Array.from(new Set([
      rawSlug,
      withoutLocation,
    ])).filter(Boolean);

    const query = `
      SELECT 
        br.id,
        br.business_id,
        br.vertical_code,
        br.category_id,
        br.subcategory_id,
        br.title,
        br.title AS name,
        br.slug,
        br.description,
        br.price,
        br.currency,
        br.featured_image AS image_url,
        br.featured_image AS default_image_url,
        br.is_active,
        br.is_featured,
        br.created_at,
        bp.id AS business_id,
        bp.name AS business_name,
        bp.slug AS business_slug,
        COALESCE(bp.city, vd.location, 'Varanasi') AS city,
        COALESCE(bp.state, 'Uttar Pradesh') AS state,
        COALESCE(vd.location, bp.address) AS address,
        COALESCE(vd.contact_info, bp.phone, '+91 94152 20302') AS phone,
        bp.whatsapp,
        bp.email,
        c.name AS category_name,
        subc.name AS subcategory_name,
        vd.manufacturing_year,
        vd.color,
        vd.mileage,
        vd.kilometers_driven,
        vd.engine_capacity,
        vd.registration_number
      FROM business_records br
      LEFT JOIN vehicle_details vd ON vd.record_id = br.id
      LEFT JOIN business_profiles bp ON bp.id = br.business_id
      LEFT JOIN master_records c ON c.id = br.category_id
      LEFT JOIN master_records subc ON subc.id = br.subcategory_id
      WHERE (br.vertical_code = 'vehicles' OR br.vertical_code = 'vehicle')
        AND (
          br.slug = ANY($1)
          OR br.slug ILIKE ANY($1)
          OR (br.id = $2 AND $2 > 0)
          OR (length($3) >= 8 AND (br.slug ILIKE '%' || $3 || '%' OR $3 ILIKE '%' || br.slug || '%'))
        )
        AND (br.is_deleted IS NULL OR br.is_deleted = FALSE)
      ORDER BY (CASE WHEN br.slug = $4 THEN 0 WHEN br.slug = $5 THEN 1 ELSE 2 END), br.id DESC
      LIMIT 1
    `;
    const res = await db.query(query, [slugVariants, numId, withoutLocation, rawSlug, withoutLocation]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const owner = {
      id: row.business_id,
      name: row.business_name || "Dealership",
      slug: row.business_slug,
      phone: row.phone,
      whatsapp: row.whatsapp,
      email: row.email,
      city: row.city,
      state: row.state,
    };

    return { vehicle: row, owner };
  } catch (err) {
    console.error("Error fetching vehicle record:", err);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const rawId = resolved.id;
  const data = await fetchVehicleRecord(rawId);

  if (data?.vehicle) {
    const veh = data.vehicle;
    return {
      title: `${veh.title || veh.name} | Vehicles & Mobility`,
      description: veh.description?.slice(0, 160) || `Inspect ${veh.title} in ${veh.city || "Varanasi"}.`,
    };
  }

  const { city, categorySlug, categoryName } = parseDiscoverySeoSlug(rawId);
  const locationText = city ? ` in ${city.charAt(0).toUpperCase() + city.slice(1)}` : "";
  const catText = categoryName || (categorySlug ? categorySlug.replace(/-/g, " ") : "Vehicles & Mobility");
  return {
    title: `${catText}${locationText} | 143Panda`,
    description: `Discover cars, bikes, and commercial vehicles${locationText}.`,
  };
}

export default async function VehicleAliasOrListingPage({
  params,
  searchParams,
}: Props) {
  const resolvedParams = await params;
  const rawId = resolvedParams.id;

  // 1. Check if this is a single vehicle detail view
  const data = await fetchVehicleRecord(rawId);
  if (data?.vehicle) {
    return <PublicVehicleDetailView vehicle={data.vehicle} owner={data.owner} />;
  }

  // 2. Otherwise treat as a category/location filter alias
  const { categorySlug, categoryName, city } = parseDiscoverySeoSlug(rawId);
  const sp = searchParams ? await searchParams : {};
  const query = typeof sp.q === "string" ? sp.q : "";

  return (
    <CustomerExplorePage
      key={`vehicle-${rawId}`}
      initialType="vehicle"
      initialCategory={categorySlug}
      initialCategoryName={categoryName}
      initialCity={city}
      initialQuery={query}
    />
  );
}
