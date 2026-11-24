import { db } from "@/lib/db/db";
import { parseDiscoverySeoSlug, extractIdFromSlug } from "@/lib/utils/seo-slug";
import CustomerExplorePage from "@/app/(public)/explore/page";
import { PublicEventDetailView } from "@/components/public/public-event-detail-view";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function fetchEventRecord(idOrSlug: string) {
  try {
    const rawSlug = decodeURIComponent(idOrSlug || "").trim().toLowerCase();
    if (rawSlug.startsWith("in-") || rawSlug.startsWith("all-") || rawSlug.startsWith("event-")) {
      return null;
    }
    let withoutLocation = rawSlug;
    const lastInIndex = rawSlug.lastIndexOf("-in-");
    if (lastInIndex !== -1) {
      withoutLocation = rawSlug.substring(0, lastInIndex);
    }
    const { id: rawNumId } = extractIdFromSlug(rawSlug);
    const { id: withoutLocId } = extractIdFromSlug(withoutLocation);
    const numId = rawNumId || withoutLocId || -1;

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
        COALESCE(e.city, bp.city, 'Varanasi') AS city,
        COALESCE(e.state, bp.state, 'Uttar Pradesh') AS state,
        COALESCE(e.venue_name, e.complete_address, bp.address) AS address,
        COALESCE(bp.phone, '+91 94152 20304') AS phone,
        bp.whatsapp,
        bp.email,
        c.name AS category_name,
        subc.name AS subcategory_name,
        e.venue_name,
        e.start_date,
        e.end_date,
        e.start_time,
        e.end_time,
        e.is_free,
        e.organizer_name
      FROM business_records br
      LEFT JOIN events e ON e.record_id = br.id
      LEFT JOIN business_profiles bp ON bp.id = br.business_id
      LEFT JOIN master_records c ON c.id = br.category_id
      LEFT JOIN master_records subc ON subc.id = br.subcategory_id
      WHERE (br.vertical_code = 'events' OR br.vertical_code = 'event')
        AND (
          br.slug = $1
          OR br.slug = $2
          OR br.slug ILIKE $1
          OR br.slug ILIKE $2
          OR (br.id = $3 AND $3 > 0)
          
        )
        AND (br.is_deleted IS NULL OR br.is_deleted = FALSE)
      ORDER BY (CASE WHEN br.slug = $1 THEN 0 WHEN br.slug = $2 THEN 1 ELSE 2 END), br.id DESC
      LIMIT 1
    `;
    const res = await db.query(query, [rawSlug, withoutLocation, numId]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const owner = {
      id: row.business_id,
      name: row.business_name || row.organizer_name || "Event Organizer",
      slug: row.business_slug,
      phone: row.phone,
      whatsapp: row.whatsapp,
      email: row.email,
      city: row.city,
      state: row.state,
    };

    return { event: row, owner };
  } catch (err) {
    console.error("Error fetching event record:", err);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const rawId = resolved.id;
  const data = await fetchEventRecord(rawId);

  if (data?.event) {
    const ev = data.event;
    return {
      title: `${ev.title || ev.name} | Events & Expos`,
      description: ev.description?.slice(0, 160) || `Join ${ev.title} in ${ev.city || "Varanasi"}.`,
    };
  }

  const { city, categorySlug, categoryName } = parseDiscoverySeoSlug(rawId);
  const locationText = city ? ` in ${city.charAt(0).toUpperCase() + city.slice(1)}` : "";
  const catText = categoryName || (categorySlug ? categorySlug.replace(/-/g, " ") : "Events & Expos");
  return {
    title: `${catText}${locationText} | 143Panda`,
    description: `Discover upcoming events, exhibitions, and conferences${locationText}.`,
  };
}

export default async function EventAliasOrListingPage({
  params,
  searchParams,
}: Props) {
  const resolvedParams = await params;
  const rawId = resolvedParams.id;

  // 1. Check if this is a single event detail view
  const data = await fetchEventRecord(rawId);
  if (data?.event) {
    return <PublicEventDetailView event={data.event} owner={data.owner} />;
  }

  // 2. Otherwise treat as a category/location filter alias
  const { categorySlug, categoryName, city } = parseDiscoverySeoSlug(rawId);
  const sp = searchParams ? await searchParams : {};
  const query = typeof sp.q === "string" ? sp.q : "";

  return (
    <CustomerExplorePage
      key={`event-${rawId}`}
      initialType="event"
      initialCategory={categorySlug}
      initialCategoryName={categoryName}
      initialCity={city}
      initialQuery={query}
    />
  );
}
