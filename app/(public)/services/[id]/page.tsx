import { db } from "@/lib/db/db";
import { parseDiscoverySeoSlug, extractIdFromSlug, KNOWN_CATEGORY_SLUG_LABELS } from "@/lib/utils/seo-slug";
import CustomerExplorePage from "@/app/(public)/explore/page";
import { PublicServiceDetailView } from "@/components/public/public-service-detail-view";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function fetchServiceRecord(idOrSlug: string) {
  try {
    const rawSlug = decodeURIComponent(idOrSlug || "").trim().toLowerCase();
    if (
      rawSlug.startsWith("in-") ||
      rawSlug.startsWith("all-") ||
      rawSlug.startsWith("service-") ||
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
    let withoutLocation = rawSlug;
    const lastInIndex = rawSlug.lastIndexOf("-in-");
    if (lastInIndex !== -1) {
      withoutLocation = rawSlug.substring(0, lastInIndex);
    }
    const { id: rawNumId } = extractIdFromSlug(rawSlug);
    const { id: withoutLocId } = extractIdFromSlug(withoutLocation);
    const numId = rawNumId || withoutLocId || -1;

    // 1. Query services table
    const serviceRes = await db.query(
      `SELECT
        s.id,
        s.title,
        s.title AS name,
        s.slug,
        s.description,
        s.image_url,
        s.image_url AS default_image_url,
        s.gallery,
        COALESCE(s.pricing_model, 'fixed_price') AS pricing_model,
        COALESCE(s.duration_minutes, 60) AS duration_minutes,
        COALESCE(s.duration_unit, 'minutes') AS duration_unit,
        COALESCE(s.price, 0) AS price,
        COALESCE(s.sale_price, s.price, 0) AS sale_price,
        COALESCE(s.price, 0) AS regular_price,
        s.service_location,
        s.business_profile_id,
        s.professional_profile_id,
        bp.name AS business_name,
        bp.slug AS business_slug,
        bp.logo_url AS business_logo_url,
        bp.address AS business_address,
        bp.city AS business_city,
        bp.locality AS business_locality,
        bp.state AS business_state,
        bp.phone AS business_phone,
        bp.whatsapp AS business_whatsapp,
        pp.name AS professional_name,
        pp.slug AS professional_slug,
        pp.phone AS professional_phone,
        pp.city AS professional_city,
        COALESCE(c.name, s.category, 'Services') AS category_name,
        COALESCE(c.slug, 'services') AS category_slug
      FROM services s
      LEFT JOIN categories c ON c.id = s.category_id
      LEFT JOIN business_profiles bp ON bp.id = s.business_profile_id
      LEFT JOIN professional_profiles pp ON pp.id = s.professional_profile_id
      WHERE COALESCE(s.status, 'active') = 'active'
        AND (
          s.slug = $1
          OR s.slug = $2
          OR (s.id = $3 AND $3 > 0)
          OR s.slug ILIKE $1
          OR s.slug ILIKE $2
        )
      ORDER BY (CASE WHEN s.slug = $1 THEN 0 WHEN s.slug = $2 THEN 1 ELSE 2 END), s.id DESC
      LIMIT 1`,
      [rawSlug, withoutLocation, numId]
    );

    if (serviceRes.rows.length > 0) {
      const sRow = serviceRes.rows[0];
      const isProfessional = Boolean(sRow.professional_profile_id && !sRow.business_profile_id);
      const provider = isProfessional
        ? {
            id: sRow.professional_profile_id,
            name: sRow.professional_name || "Verified Professional",
            slug: sRow.professional_slug || "",
            phone: sRow.professional_phone || "+91 9876543210",
            city: sRow.professional_city || "Varanasi",
            locality: "Varanasi",
            state: "Uttar Pradesh",
          }
        : {
            id: sRow.business_profile_id || 0,
            name: sRow.business_name || "Verified Service Center",
            slug: sRow.business_slug || "",
            phone: sRow.business_phone || "+91 9876543210",
            whatsapp: sRow.business_whatsapp || sRow.business_phone || "+91 9876543210",
            city: sRow.business_city || "Varanasi",
            locality: sRow.business_locality || "Varanasi",
            state: sRow.business_state || "Uttar Pradesh",
            address: sRow.business_address || "",
            logo_url: sRow.business_logo_url || null,
          };
      return { service: sRow, provider, providerType: isProfessional ? ("professional" as const) : ("business" as const), reviews: [] };
    }

    // 2. Query master_services table
    const msRes = await db.query(
      `SELECT
        ms.id,
        ms.name,
        ms.name AS title,
        ms.slug,
        ms.description,
        ms.default_image_url,
        ms.default_image_url AS image_url,
        COALESCE(ms.pricing_model, 'fixed_price') AS pricing_model,
        COALESCE(ms.duration_minutes, 60) AS duration_minutes,
        COALESCE(ms.duration_unit, 'minutes') AS duration_unit,
        COALESCE(ms.suggested_price, ms.suggested_price_inr, 0) AS price,
        COALESCE(ms.suggested_price, ms.suggested_price_inr, 0) AS sale_price,
        COALESCE(ms.suggested_max_price, ms.regular_price, 0) AS regular_price,
        ms.service_location,
        ms.business_profile_id,
        ms.professional_profile_id,
        bp.name AS business_name,
        bp.slug AS business_slug,
        bp.logo_url AS business_logo_url,
        bp.address AS business_address,
        bp.city AS business_city,
        bp.locality AS business_locality,
        bp.state AS business_state,
        bp.phone AS business_phone,
        bp.whatsapp AS business_whatsapp,
        pp.name AS professional_name,
        pp.slug AS professional_slug,
        pp.phone AS professional_phone,
        pp.city AS professional_city,
        COALESCE(c.name, 'Services') AS category_name,
        COALESCE(c.slug, 'services') AS category_slug
      FROM master_services ms
      LEFT JOIN categories c ON c.id = COALESCE(ms.main_category_id, ms.category_id)
      LEFT JOIN business_profiles bp ON bp.id = ms.business_profile_id
      LEFT JOIN professional_profiles pp ON pp.id = ms.professional_profile_id
      WHERE COALESCE(ms.is_active, TRUE) = TRUE
        AND (
          ms.slug = $1
          OR ms.slug = $2
          OR (ms.id = $3 AND $3 > 0)
          OR ms.slug ILIKE $1
          OR ms.slug ILIKE $2
        )
      ORDER BY (CASE WHEN ms.slug = $1 THEN 0 WHEN ms.slug = $2 THEN 1 ELSE 2 END), ms.id DESC
      LIMIT 1`,
      [rawSlug, withoutLocation, numId]
    );

    if (msRes.rows.length > 0) {
      const msRow = msRes.rows[0];
      const isProfessional = Boolean(msRow.professional_profile_id && !msRow.business_profile_id);
      const provider = isProfessional
        ? {
            id: msRow.professional_profile_id,
            name: msRow.professional_name || "Verified Professional",
            slug: msRow.professional_slug || "",
            phone: msRow.professional_phone || "+91 9876543210",
            city: msRow.professional_city || "Varanasi",
            locality: "Varanasi",
            state: "Uttar Pradesh",
          }
        : {
            id: msRow.business_profile_id || 0,
            name: msRow.business_name || "Verified Service Center",
            slug: msRow.business_slug || "",
            phone: msRow.business_phone || "+91 9876543210",
            whatsapp: msRow.business_whatsapp || msRow.business_phone || "+91 9876543210",
            city: msRow.business_city || "Varanasi",
            locality: msRow.business_locality || "Varanasi",
            state: msRow.business_state || "Uttar Pradesh",
            address: msRow.business_address || "",
            logo_url: msRow.business_logo_url || null,
          };
      return { service: msRow, provider, providerType: isProfessional ? ("professional" as const) : ("business" as const), reviews: [] };
    }

    return null;
  } catch (err) {
    console.error("Error fetching service record:", err);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const rawId = resolved.id;
  const data = await fetchServiceRecord(rawId);

  if (data?.service) {
    const s = data.service;
    return {
      title: `${s.name || s.title} | 143Panda`,
      description: s.description?.slice(0, 160) || `Book ${s.title} online at best prices.`,
    };
  }

  const { city, categorySlug, categoryName } = parseDiscoverySeoSlug(rawId);
  const locationText = city ? ` in ${city.charAt(0).toUpperCase() + city.slice(1)}` : "";
  const catText = categoryName || (categorySlug ? categorySlug.replace(/-/g, " ") : "Services & Maintenance");
  return {
    title: `${catText}${locationText} | 143Panda`,
    description: `Browse verified local services and experts${locationText}.`,
  };
}

export default async function ServiceDetailPage({
  params,
  searchParams,
}: Props) {
  const resolvedParams = await params;
  const rawId = resolvedParams.id;

  // 1. Direct service view (renders modern PublicServiceDetailView directly)
  const data = await fetchServiceRecord(rawId);
  if (data?.service) {
    return (
      <PublicServiceDetailView
        service={data.service}
        provider={data.provider}
        providerType={data.providerType}
        reviews={data.reviews}
      />
    );
  }

  // 2. Otherwise category/location listing alias
  const { categorySlug, categoryName, city } = parseDiscoverySeoSlug(rawId);
  const sp = searchParams ? await searchParams : {};
  const query = typeof sp.q === "string" ? sp.q : "";

  return (
    <CustomerExplorePage
      key={`service-${rawId}`}
      initialType="service"
      initialCategory={categorySlug}
      initialCategoryName={categoryName}
      initialCity={city}
      initialQuery={query}
    />
  );
}
