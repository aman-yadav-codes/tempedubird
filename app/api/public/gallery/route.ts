import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getConfiguredInstitutionId } from "@/lib/tenancy/institution-domain";

export type FacilityGalleryItem = {
  id: number | string;
  facility_id: number;
  institution_id: number;
  institution_name: string;
  media_type: string;
  category_slug: string;
  category_name: string;
  url: string;
  title: string;
  description?: string;
  category?: string;
  media?: Array<{ id: number; url: string; title?: string; media_type?: string }>;
  total_photos?: number;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionIdParam = searchParams.get("institutionId") || searchParams.get("inst") || searchParams.get("businessId");
    const instIdNum = institutionIdParam && /^\d+$/.test(institutionIdParam) ? Number(institutionIdParam) : null;
    const targetInstitutionId = instIdNum || getConfiguredInstitutionId();

    let galleryItems: FacilityGalleryItem[] = [];
    let categories: { key: string; label: string }[] = [{ key: "all", label: "All Photos" }];
    let instName = "Organization";

    if (targetInstitutionId && targetInstitutionId > 0) {
      try {
        const nameRes = await db.query<{ name: string }>(
          `SELECT name FROM institution_profiles WHERE id = $1 LIMIT 1`,
          [targetInstitutionId]
        );
        if (nameRes.rows[0]?.name) {
          instName = nameRes.rows[0].name;
        }

        const mediaRes = await db.query(
          `SELECT
            m.id,
            m.institution_id,
            COALESCE(ip.name, ip.slug, 'Organization') AS institution_name,
            m.url,
            COALESCE(NULLIF(m.title, ''), 'Showcase Photo') AS title,
            m.description,
            m.sort_order,
            m.category_id,
            COALESCE(gc.name, m.category, 'Photo Gallery') AS category_name,
            COALESCE(gc.slug, 'gallery') AS category_slug,
            m.media_type,
            m.created_at,
            m.updated_at
          FROM institution_media m
          LEFT JOIN institution_profiles ip ON ip.id = m.institution_id
          LEFT JOIN institution_gallery_categories gc ON gc.id = m.category_id
          WHERE m.institution_id = $1
            AND COALESCE(m.is_deleted, FALSE) = FALSE
            AND m.url IS NOT NULL AND m.url <> ''
            AND m.media_type != 'logo'
          ORDER BY m.sort_order ASC, m.id DESC`,
          [targetInstitutionId]
        );

        if (mediaRes.rows.length > 0) {
          const catRes = await db.query(
            `SELECT id, name, slug FROM institution_gallery_categories WHERE institution_id = $1 AND COALESCE(is_active, TRUE) = TRUE ORDER BY sort_order ASC, id ASC`,
            [targetInstitutionId]
          ).catch(() => ({ rows: [] }));

          const categoryMap = new Map<string, string>();
          for (const c of catRes.rows) {
            categoryMap.set(c.slug || String(c.id), c.name);
          }

          galleryItems = mediaRes.rows.map((row, idx) => {
            let displayTitle = row.title;
            if (/^WhatsApp Image/i.test(displayTitle) || /\.(jpe?g|png|webp|gif|bmp)$/i.test(displayTitle)) {
              displayTitle = `Showcase Photo ${idx + 1}`;
            }
            const catSlug = row.category_slug || (row.category_name ? row.category_name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "gallery");
            const catName = row.category_name || "Photo Gallery";
            if (catSlug && catName && catSlug !== "gallery") {
              categoryMap.set(catSlug, catName);
            }
            return {
              id: `media-${row.id}`,
              facility_id: row.id,
              institution_id: row.institution_id || targetInstitutionId,
              institution_name: instName,
              media_type: row.media_type || "image",
              category_slug: catSlug,
              category_name: catName,
              url: row.url,
              title: displayTitle,
              description: row.description || undefined,
              category: catName,
              total_photos: 1,
            };
          });

          const dynamicCategories = Array.from(categoryMap.entries()).map(([key, label]) => ({ key, label }));
          categories = [
            { key: "all", label: "All Photos" },
            ...dynamicCategories,
          ];

          return NextResponse.json({
            success: true,
            data: galleryItems,
            categories,
            total: galleryItems.length,
          });
        }
      } catch (err) {
        console.error("Error fetching media for gallery:", err);
      }
    }

    return NextResponse.json({
      success: true,
      data: galleryItems,
      categories,
      total: galleryItems.length,
    });
  } catch (err: any) {
    console.error("GET /api/public/gallery error:", err);
    return NextResponse.json({ error: "Failed to fetch gallery media" }, { status: 500 });
  }
}
