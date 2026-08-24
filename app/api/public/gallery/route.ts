import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { listInstitutionFacilitiesWithMedia } from "@/lib/queries/institutions";
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

const DEFAULT_FALLBACK_FACILITIES = [
  {
    id: "fb-1",
    facility_id: 1,
    institution_id: 1,
    institution_name: "Campus Facility",
    media_type: "labs",
    category_slug: "labs",
    category_name: "Laboratories & Tech",
    url: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1200&q=80",
    title: "High-Tech Computer & Robotics Laboratories",
    description: "Equipped with high-performance workstations, GPU computing clusters, IoT prototyping hardware, and AI development toolkits for practical engineering learning.",
    media: [
      { id: 101, url: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1200&q=80", title: "Robotics Workstation" },
      { id: 102, url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80", title: "Computing Cluster" },
    ],
    total_photos: 2,
  },
  {
    id: "fb-2",
    facility_id: 2,
    institution_id: 1,
    institution_name: "Campus Facility",
    media_type: "library",
    category_slug: "library",
    category_name: "Central Library",
    url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80",
    title: "Central Digital Knowledge Library",
    description: "Spacious air-conditioned library containing over 35,000 physical volumes, 24/7 digital subscriptions (IEEE, Springer, ScienceDirect), and automated RFID borrowing.",
    media: [
      { id: 103, url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80", title: "Reading Hall" },
    ],
    total_photos: 1,
  },
  {
    id: "fb-3",
    facility_id: 3,
    institution_id: 1,
    institution_name: "Campus Facility",
    media_type: "classrooms",
    category_slug: "classrooms",
    category_name: "Smart Classrooms",
    url: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80",
    title: "Interactive Smart Lecture Amphitheatres",
    description: "Ergonomically designed lecture halls equipped with 4K interactive touch displays, digital recording cameras for hybrid lectures, and high-fidelity sound systems.",
    media: [
      { id: 104, url: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80", title: "Smart Amphitheatre" },
    ],
    total_photos: 1,
  },
  {
    id: "fb-4",
    facility_id: 4,
    institution_id: 1,
    institution_name: "Campus Facility",
    media_type: "sports",
    category_slug: "sports",
    category_name: "Sports Complex",
    url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
    title: "Sports Complex & Fitness Center",
    description: "Olympic-standard sports facilities featuring outdoor cricket and football grounds, basketball and badminton courts, indoor gymnasium, and certified sports trainers.",
    media: [
      { id: 105, url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80", title: "Sports Complex" },
    ],
    total_photos: 1,
  },
  {
    id: "fb-5",
    facility_id: 5,
    institution_id: 1,
    institution_name: "Campus Facility",
    media_type: "hostels",
    category_slug: "hostels",
    category_name: "Hostel Living",
    url: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80",
    title: "Modern Residential Hostels & Dining Hall",
    description: "Separate secure residences for boys and girls with furnished rooms, 1Gbps high-speed Wi-Fi, 24/7 power backup, hygienic multi-cuisine mess, and biometric security.",
    media: [
      { id: 106, url: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80", title: "Hostel Campus" },
    ],
    total_photos: 1,
  },
  {
    id: "fb-6",
    facility_id: 6,
    institution_id: 1,
    institution_name: "Campus Facility",
    media_type: "auditorium",
    category_slug: "auditorium",
    category_name: "Auditorium",
    url: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    title: "Grand Auditorium & Convention Center",
    description: "1,200-seat acoustically engineered auditorium hosting international conferences, technical hackathons, guest lectures from industry pioneers, and cultural festivals.",
    media: [
      { id: 107, url: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80", title: "Main Auditorium" },
    ],
    total_photos: 1,
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionIdParam = searchParams.get("institutionId") || searchParams.get("inst");
    const instIdNum = institutionIdParam && /^\d+$/.test(institutionIdParam) ? Number(institutionIdParam) : null;
    const targetInstitutionId = instIdNum || getConfiguredInstitutionId();

    let facilities: any[] = [];
    let instName = "Educational Institution";

    if (targetInstitutionId && targetInstitutionId > 0) {
      try {
        facilities = await listInstitutionFacilitiesWithMedia(db, targetInstitutionId);
        const nameRes = await db.query<{ name: string }>(
          `SELECT name FROM institution_profiles WHERE id = $1 LIMIT 1`,
          [targetInstitutionId]
        );
        if (nameRes.rows[0]?.name) {
          instName = nameRes.rows[0].name;
        }
      } catch (err) {
        console.error("Error fetching facilities for gallery:", err);
      }
    }

    // Filter active and non-deleted
    const validFacilities = facilities.filter(
      (f) => !f.is_deleted && f.is_active !== false
    );

    if (validFacilities.length > 0) {
      const galleryItems: FacilityGalleryItem[] = [];
      const categoryMap = new Map<string, string>();

      for (const fac of validFacilities) {
        const catSlug = fac.facility_type_slug || fac.facility_type_name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "facility";
        const catName = fac.facility_type_name || "Facility";
        categoryMap.set(catSlug, catName);

        // Facility main photo
        const mainUrl = fac.image_url || fac.media?.[0]?.url;
        const allMedia = Array.isArray(fac.media) ? fac.media : [];

        if (mainUrl) {
          galleryItems.push({
            id: `facility-${fac.id}`,
            facility_id: fac.id,
            institution_id: fac.institution_id || targetInstitutionId || 1,
            institution_name: instName,
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

      const categories = [
        { key: "all", label: "All Facilities" },
        ...Array.from(categoryMap.entries()).map(([key, label]) => ({ key, label })),
      ];

      return NextResponse.json({
        success: true,
        data: galleryItems,
        categories,
        total: galleryItems.length,
      });
    }

    // Fallback if no facilities in database
    const defaultCategories = [
      { key: "all", label: "All Facilities" },
      { key: "labs", label: "Laboratories & Tech" },
      { key: "library", label: "Central Library" },
      { key: "classrooms", label: "Smart Classrooms" },
      { key: "sports", label: "Sports Complex" },
      { key: "hostels", label: "Hostel Living" },
      { key: "auditorium", label: "Auditorium" },
    ];

    return NextResponse.json({
      success: true,
      data: DEFAULT_FALLBACK_FACILITIES,
      categories: defaultCategories,
      total: DEFAULT_FALLBACK_FACILITIES.length,
    });
  } catch (err: any) {
    console.error("GET /api/public/gallery error:", err);
    return NextResponse.json({ error: "Failed to fetch gallery facilities" }, { status: 500 });
  }
}
