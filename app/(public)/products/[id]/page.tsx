import { db } from "@/lib/db/db";
import { parseDiscoverySeoSlug, extractIdFromSlug, KNOWN_CATEGORY_SLUG_LABELS } from "@/lib/utils/seo-slug";
import CustomerExplorePage from "@/app/(public)/explore/page";
import { PublicProductDetailView } from "@/components/public/public-product-detail-view";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function fetchProductRecord(idOrSlug: string) {
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
      rawSlug.startsWith("product-") ||
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

    // 1. Query products table
    const prodRes = await db.query(
      `SELECT
        p.id,
        p.title,
        p.title AS name,
        p.slug,
        p.description,
        p.image_url,
        p.image_url AS default_image_url,
        p.gallery,
        COALESCE(p.sale_price, p.price, 0) AS price,
        COALESCE(p.sale_price, p.price, 0) AS sale_price,
        COALESCE(p.price, 0) AS regular_price,
        COALESCE(p.stock_quantity, 100) AS stock_quantity,
        p.business_profile_id,
        p.institution_id,
        bp.id AS business_id,
        bp.name AS business_name,
        bp.slug AS business_slug,
        bp.city AS business_city,
        bp.locality AS business_locality,
        bp.state AS business_state,
        bp.phone AS business_phone,
        bp.whatsapp AS business_whatsapp,
        COALESCE(c.name, p.category, 'Products') AS category_name,
        COALESCE(c.slug, 'products') AS category_slug
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN business_profiles bp ON bp.id = p.business_profile_id
      WHERE COALESCE(p.status, 'active') = 'active'
        AND (
          p.slug = $1
          OR p.slug = $2
          OR (p.id = $3 AND $3 > 0)
          OR p.slug ILIKE $1
          OR p.slug ILIKE $2
        )
      ORDER BY (CASE WHEN p.slug = $1 THEN 0 WHEN p.slug = $2 THEN 1 ELSE 2 END), p.id DESC
      LIMIT 1`,
      [rawSlug, withoutLocation, numId]
    );

    if (prodRes.rows.length > 0) {
      const pRow = prodRes.rows[0];
      const seller = {
        id: pRow.business_profile_id || pRow.business_id || 0,
        name: pRow.business_name || "Verified Local Store",
        slug: pRow.business_slug || "",
        phone: pRow.business_phone || "+91 9876543210",
        whatsapp: pRow.business_whatsapp,
        city: pRow.business_city || "Varanasi",
        locality: pRow.business_locality || "Pandeypur",
        state: pRow.business_state || "Uttar Pradesh",
      };
      return { product: pRow, seller, reviews: [] };
    }

    // 2. Query master_products table
    const mpRes = await db.query(
      `SELECT
        mp.id,
        mp.name,
        mp.name AS title,
        mp.slug,
        mp.description,
        mp.brand,
        mp.default_image_url,
        mp.default_image_url AS image_url,
        COALESCE(mp.discounted_price, mp.suggested_price, mp.suggested_price_inr, 0) AS price,
        COALESCE(mp.discounted_price, mp.suggested_price, mp.suggested_price_inr, 0) AS sale_price,
        COALESCE(mp.regular_price, 0) AS regular_price,
        100 AS stock_quantity,
        mp.business_profile_id,
        bp.id AS business_id,
        bp.name AS business_name,
        bp.slug AS business_slug,
        bp.city AS business_city,
        bp.locality AS business_locality,
        bp.state AS business_state,
        bp.phone AS business_phone,
        bp.whatsapp AS business_whatsapp,
        COALESCE(c.name, 'Products') AS category_name,
        COALESCE(c.slug, 'products') AS category_slug
      FROM master_products mp
      LEFT JOIN categories c ON c.id = COALESCE(mp.main_category_id, mp.category_id)
      LEFT JOIN business_profiles bp ON bp.id = mp.business_profile_id
      WHERE COALESCE(mp.is_active, TRUE) = TRUE
        AND (
          mp.slug = $1
          OR mp.slug = $2
          OR (mp.id = $3 AND $3 > 0)
          OR mp.slug ILIKE $1
          OR mp.slug ILIKE $2
        )
      ORDER BY (CASE WHEN mp.slug = $1 THEN 0 WHEN mp.slug = $2 THEN 1 ELSE 2 END), mp.id DESC
      LIMIT 1`,
      [rawSlug, withoutLocation, numId]
    );

    if (mpRes.rows.length > 0) {
      const mpRow = mpRes.rows[0];
      const seller = {
        id: mpRow.business_profile_id || mpRow.business_id || 0,
        name: mpRow.business_name || "Verified Local Store",
        slug: mpRow.business_slug || "",
        phone: mpRow.business_phone || "+91 9876543210",
        whatsapp: mpRow.business_whatsapp,
        city: mpRow.business_city || "Varanasi",
        locality: mpRow.business_locality || "Pandeypur",
        state: mpRow.business_state || "Uttar Pradesh",
      };
      return { product: mpRow, seller, reviews: [] };
    }

    return null;
  } catch (err) {
    console.error("Error fetching product record:", err);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolved = await params;
  const rawId = resolved.id;
  const data = await fetchProductRecord(rawId);

  if (data?.product) {
    const p = data.product;
    return {
      title: `${p.name || p.title} | 143Panda`,
      description: p.description?.slice(0, 160) || `Buy ${p.title} online at best prices.`,
    };
  }

  const { city, categorySlug, categoryName } = parseDiscoverySeoSlug(rawId);
  const locationText = city ? ` in ${city.charAt(0).toUpperCase() + city.slice(1)}` : "";
  const catText = categoryName || (categorySlug ? categorySlug.replace(/-/g, " ") : "Products & Shopping");
  return {
    title: `${catText}${locationText} | 143Panda`,
    description: `Browse verified local products and inventory${locationText}.`,
  };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: Props) {
  const resolvedParams = await params;
  const rawId = resolvedParams.id;

  // 1. Direct product view (renders the 2nd design immediately with zero client redirect)
  const data = await fetchProductRecord(rawId);
  if (data?.product) {
    return <PublicProductDetailView product={data.product} seller={data.seller} reviews={data.reviews} />;
  }

  // 2. Otherwise category/location listing alias
  const { categorySlug, categoryName, city } = parseDiscoverySeoSlug(rawId);
  const sp = searchParams ? await searchParams : {};
  const query = typeof sp.q === "string" ? sp.q : "";

  return (
    <CustomerExplorePage
      key={`product-${rawId}`}
      initialType="product"
      initialCategory={categorySlug}
      initialCategoryName={categoryName}
      initialCity={city}
      initialQuery={query}
    />
  );
}
