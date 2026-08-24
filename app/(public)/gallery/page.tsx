import { headers } from "next/headers";
import { getCurrentPublicInstitutionProfile } from "@/lib/api/public-institutions";
import { GalleryPageView } from "@/components/public/gallery-page-view";
import { listInstitutionFacilitiesWithMedia } from "@/lib/queries/institutions";
import { db } from "@/lib/db/db";

async function getHost() {
  const headerList = await headers();
  return headerList.get("x-forwarded-host") ?? headerList.get("host");
}

export async function generateMetadata() {
  const profile = await getCurrentPublicInstitutionProfile(await getHost());
  const name = profile?.name ?? "EduBird";

  return {
    title: `Campus Gallery & Facilities | ${name}`,
    description: `Browse the photo gallery, infrastructure, laboratory setups, and campus facilities of ${name}.`,
  };
}

export default async function GalleryPage() {
  const host = await getHost();
  const profile = await getCurrentPublicInstitutionProfile(host);

  let initialGalleryItems: any[] = [];
  let initialCategories: { key: string; label: string }[] = [{ key: "all", label: "All Facilities" }];

  if (profile?.id) {
    try {
      const facilities = await listInstitutionFacilitiesWithMedia(db, profile.id);
      const valid = facilities.filter((f) => !f.is_deleted && f.is_active !== false);
      const categoryMap = new Map<string, string>();

      for (const fac of valid) {
        const catSlug = fac.facility_type_slug || fac.facility_type_name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "facility";
        const catName = fac.facility_type_name || "Facility";
        categoryMap.set(catSlug, catName);

        const mainUrl = fac.image_url || fac.media?.[0]?.url;
        const allMedia = Array.isArray(fac.media) ? fac.media : [];

        if (mainUrl) {
          initialGalleryItems.push({
            id: `facility-${fac.id}`,
            facility_id: fac.id,
            institution_id: fac.institution_id || profile.id,
            institution_name: profile.name,
            media_type: catSlug,
            category_slug: catSlug,
            category_name: catName,
            url: mainUrl,
            title: fac.title || fac.facility_type_name || "Campus Facility",
            description: fac.description || fac.ai_description || undefined,
            category: catName,
            media: allMedia,
            total_photos: (fac.image_url ? 1 : 0) + allMedia.length,
          });
        }
      }

      initialCategories = [
        { key: "all", label: "All Facilities" },
        ...Array.from(categoryMap.entries()).map(([key, label]) => ({ key, label })),
      ];
    } catch (err) {
      console.error("Error loading server-side gallery facilities:", err);
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
