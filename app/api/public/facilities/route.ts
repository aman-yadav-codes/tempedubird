import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { listInstitutionFacilitiesWithMedia } from "@/lib/queries/institutions";

const DEFAULT_FALLBACK_FACILITIES = [
  {
    id: 1,
    title: "High-Tech Computer & Robotics Laboratories",
    facility_type_name: "Laboratories & Tech",
    description: "Equipped with high-performance workstations, GPU computing clusters, IoT prototyping hardware, and AI development toolkits for practical engineering learning.",
    image_url: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1200&q=80",
    media: [
      { url: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=800&q=80" },
      { url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80" }
    ],
  },
  {
    id: 2,
    title: "Central Digital Knowledge Library",
    facility_type_name: "Central Library",
    description: "Spacious air-conditioned library containing over 35,000 physical volumes, 24/7 digital subscriptions (IEEE, Springer, ScienceDirect), and automated RFID borrowing.",
    image_url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80",
    media: [
      { url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80" }
    ],
  },
  {
    id: 3,
    title: "Interactive Smart Lecture Amphitheatres",
    facility_type_name: "Smart Classrooms",
    description: "Ergonomically designed lecture halls equipped with 4K interactive touch displays, digital recording cameras for hybrid lectures, and high-fidelity sound systems.",
    image_url: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80",
    media: [],
  },
  {
    id: 4,
    title: "Sports Complex & Fitness Center",
    facility_type_name: "Sports & Fitness",
    description: "Olympic-standard sports facilities featuring outdoor cricket and football grounds, basketball and badminton courts, indoor gymnasium, and certified sports trainers.",
    image_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
    media: [],
  },
  {
    id: 5,
    title: "Modern Residential Hostels & Dining Hall",
    facility_type_name: "Hostel Living",
    description: "Separate secure residences for boys and girls with furnished rooms, 1Gbps high-speed Wi-Fi, 24/7 power backup, hygienic multi-cuisine mess, and biometric security.",
    image_url: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80",
    media: [],
  },
  {
    id: 6,
    title: "Grand Auditorium & Convention Center",
    facility_type_name: "Auditorium",
    description: "1,200-seat acoustically engineered auditorium hosting international conferences, technical hackathons, guest lectures from industry pioneers, and cultural festivals.",
    image_url: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    media: [],
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionIdParam = searchParams.get("institutionId") || searchParams.get("inst");
    const institutionId = institutionIdParam ? Number(institutionIdParam) : null;

    let facilities: any[] = [];

    if (institutionId && Number.isInteger(institutionId) && institutionId > 0) {
      facilities = await listInstitutionFacilitiesWithMedia(db, institutionId);
    } else {
      // If no institutionId provided, attempt to fetch from default configured institution or first active institution
      const defaultId = Number(process.env.DEFAULT_INSTITUTION_ID || process.env.NEXT_PUBLIC_DEFAULT_INSTITUTION_ID || 160);
      facilities = await listInstitutionFacilitiesWithMedia(db, defaultId);
    }

    // Filter active and non-deleted
    const validFacilities = facilities.filter(
      (f) => !f.is_deleted && f.is_active !== false
    );

    if (validFacilities.length > 0) {
      return NextResponse.json({
        success: true,
        data: validFacilities,
        total: validFacilities.length,
      });
    }

    // If no facilities configured in DB yet for this institution, return rich fallback facilities
    return NextResponse.json({
      success: true,
      data: DEFAULT_FALLBACK_FACILITIES,
      total: DEFAULT_FALLBACK_FACILITIES.length,
    });
  } catch (err: any) {
    console.error("GET /api/public/facilities error:", err);
    return NextResponse.json({
      success: true,
      data: DEFAULT_FALLBACK_FACILITIES,
      total: DEFAULT_FALLBACK_FACILITIES.length,
    });
  }
}
