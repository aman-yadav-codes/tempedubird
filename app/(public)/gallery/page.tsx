import { headers } from "next/headers";
import { getCurrentPublicInstitutionProfile } from "@/lib/api/public-institutions";
import { GalleryPageView } from "@/components/public/gallery-page-view";
import { db } from "@/lib/db/db";
import { getConfiguredInstitutionId } from "@/lib/tenancy/institution-domain";

async function getHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}

export async function generateMetadata() {
  const host = await getHost();
  const profile = await getCurrentPublicInstitutionProfile(host);
  const name = profile?.name ?? "EduBird";

  return {
    title: `Photo Gallery & Showcase | ${name}`,
    description: `Browse the photo gallery, workspace, products, and showcase of ${name}.`,
  };
}

export default async function GalleryPage() {
  const host = await getHost();
  let profile = await getCurrentPublicInstitutionProfile(host);

  const fallbackId = getConfiguredInstitutionId();
  if (!profile && fallbackId) {
    try {
      const res = await db.query(
        `SELECT id, name, slug, logo_url, banner_url, address, city, state, pincode, phone, email
         FROM institution_profiles
         WHERE id = $1 AND COALESCE(is_deleted, FALSE) = FALSE
         LIMIT 1`,
        [fallbackId]
      );
      if (res.rows[0]) {
        profile = res.rows[0] as any;
      }
    } catch (e) {
      console.error("Error loading fallback institution profile:", e);
    }
  }

  const effectiveId = profile?.id || fallbackId;
  let initialGalleryItems: any[] = [];
  let initialCategories: { key: string; label: string }[] = [{ key: "all", label: "All Photos" }];

  if (effectiveId) {
    try {
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
        [effectiveId]
      );

      const catRes = await db.query(
        `SELECT id, name, slug FROM institution_gallery_categories WHERE institution_id = $1 AND COALESCE(is_active, TRUE) = TRUE ORDER BY sort_order ASC, id ASC`,
        [effectiveId]
      ).catch(() => ({ rows: [] }));

      const categoryMap = new Map<string, string>();
      for (const c of catRes.rows) {
        categoryMap.set(c.slug || String(c.id), c.name);
      }

      initialGalleryItems = mediaRes.rows.map((row, idx) => {
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
          institution_id: row.institution_id || effectiveId,
          institution_name: profile?.name || row.institution_name,
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
      initialCategories = [
        { key: "all", label: "All Photos" },
        ...dynamicCategories,
      ];
    } catch (err) {
      console.error("Error loading server-side gallery media:", err);
    }
  }

  return (
    <GalleryPageView
      initialProfile={profile}
      initialGalleryItems={initialGalleryItems.length > 0 ? initialGalleryItems : undefined}
      initialCategories={initialCategories.length > 1 ? initialCategories : undefined}
    />
  );
}
