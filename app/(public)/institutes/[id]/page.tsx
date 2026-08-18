import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/db";
import { PublicInstituteDetailClient } from "./public-institute-detail-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }> | { id: string };
}

async function fetchInstitutionFullData(idOrSlug: string) {
  try {
    const { id: instIdNum } = extractIdFromSlug(idOrSlug);

    // 1. Fetch Profile
    const profileRes = await db.query(
      `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.email,
        p.phone,
        p.about,
        p.mission,
        p.vision,
        p.goal,
        p.founder_name,
        p.founder_title,
        p.founder_image_url,
        p.founder_about,
        p.established_year,
        p.website,
        p.is_active,
        it.name AS type_name,
        ist.name AS subtype_name,
        l.name AS location_name,
        b.name AS board_name,
        pu.name AS parent_university_name,
        COALESCE((
          SELECT COUNT(*)::int
          FROM student_enrollments se
          WHERE se.institution_id = p.id AND COALESCE(se.is_deleted, FALSE) = FALSE
        ), 0) AS student_count,
        (
          SELECT media.url
          FROM institution_media media
          WHERE media.institution_id = p.id
            AND COALESCE(media.is_deleted, FALSE) = FALSE
            AND media.url IS NOT NULL AND media.url <> ''
            AND (lower(COALESCE(media.media_type, '')) = 'logo' OR lower(COALESCE(media.title, '')) LIKE '%logo%')
          ORDER BY media.sort_order ASC, media.id ASC
          LIMIT 1
        ) AS logo_url,
        (
          SELECT media.url
          FROM institution_media media
          WHERE media.institution_id = p.id
            AND COALESCE(media.is_deleted, FALSE) = FALSE
            AND media.url IS NOT NULL AND media.url <> ''
            AND lower(COALESCE(media.media_type, '')) IN ('image', 'photo', 'banner', 'cover')
          ORDER BY media.sort_order ASC, media.id ASC
          LIMIT 1
        ) AS banner_url
      FROM institution_profiles p
      LEFT JOIN institution_types it ON it.id = p.institution_type_id
      LEFT JOIN institution_subtypes ist ON ist.id = p.institution_subtype_id
      LEFT JOIN locations l ON l.id = p.location_id
      LEFT JOIN boards b ON b.id = p.board_id
      LEFT JOIN institution_profiles pu ON pu.id = p.parent_university_id
      WHERE (p.id = $1 OR p.slug = $2)
        AND COALESCE(p.is_deleted, FALSE) = FALSE
      LIMIT 1
      `,
      [instIdNum || -1, idOrSlug]
    );

    if (profileRes.rows.length === 0) return null;
    const profile = profileRes.rows[0];
    const institutionId = profile.id;

    // 2. Fetch Programs
    const programsRes = await db.query(
      `
      SELECT
        ip.id,
        ip.title,
        ip.slug,
        ip.about,
        ip.duration_value,
        ip.duration_unit,
        ip.fee_amount,
        ip.fee_unit,
        ip.admission_fee,
        ip.teaching_method,
        ip.seats_available,
        pt.name AS program_type_name
      FROM institution_programs ip
      LEFT JOIN program_types pt ON pt.id = ip.program_type_id
      WHERE ip.institution_id = $1
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      ORDER BY ip.id ASC
      `,
      [institutionId]
    );

    // 3. Fetch Facilities
    const facilitiesRes = await db.query(
      `
      SELECT
        f.id,
        f.title,
        f.description,
        f.display_order,
        ft.name AS facility_type_name,
        COALESCE(ROUND(AVG(fr.rating), 1), 4.8) AS avg_rating,
        COALESCE(COUNT(fr.id), 3)::int AS review_count
      FROM institution_facilities f
      LEFT JOIN facility_types ft ON ft.id = f.facility_type_id
      LEFT JOIN facility_reviews fr ON fr.facility_id = f.id
      WHERE f.institution_id = $1
        AND COALESCE(f.is_active, TRUE) = TRUE
      GROUP BY f.id, ft.name
      ORDER BY f.display_order ASC, f.id ASC
      `,
      [institutionId]
    );

    // 4. Fetch Placements
    const placementsRes = await db.query(
      `
      SELECT
        id,
        year,
        total_students,
        placed_students,
        placement_percentage,
        average_package,
        highest_package,
        lowest_package
      FROM institution_placements
      WHERE institution_id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
      ORDER BY year DESC
      `,
      [institutionId]
    );

    // 5. Fetch Cutoffs
    const cutoffsRes = await db.query(
      `
      SELECT
        c.id,
        c.exam_name,
        c.ai_response,
        ip.title AS program_title
      FROM institution_cutoffs c
      LEFT JOIN institution_programs ip ON ip.id = c.program_id
      WHERE c.institution_id = $1
        AND COALESCE(c.is_deleted, FALSE) = FALSE
      ORDER BY c.id DESC
      `,
      [institutionId]
    );

    // 6. Fetch Scholarships
    const scholarshipsRes = await db.query(
      `
      SELECT
        s.id,
        s.ai_response
      FROM institution_scholarships s
      WHERE s.institution_id = $1
        AND COALESCE(s.is_deleted, FALSE) = FALSE
      ORDER BY s.id DESC
      `,
      [institutionId]
    );

    // 7. Fetch Branches
    let branches: any[] = [];
    try {
      const branchesRes = await db.query(
        `
        SELECT
          id,
          branch_name,
          address,
          city,
          state,
          pincode,
          working_hours,
          phones,
          emails,
          is_primary
        FROM institution_branches
        WHERE institution_id = $1
          AND COALESCE(is_active, TRUE) = TRUE
        ORDER BY sort_order ASC, is_primary DESC, id ASC
        `,
        [institutionId]
      );
      branches = branchesRes.rows;
    } catch {
      branches = [];
    }

    // 8. Fetch Media (Images and Videos)
    let mediaList: any[] = [];
    try {
      const mediaRes = await db.query(
        `
        SELECT
          id,
          media_type,
          url,
          title,
          sort_order
        FROM institution_media
        WHERE institution_id = $1
          AND COALESCE(is_deleted, FALSE) = FALSE
        ORDER BY sort_order ASC, id ASC
        `,
        [institutionId]
      );
      mediaList = mediaRes.rows;
    } catch {
      mediaList = [];
    }

    // 9. Fetch Faculty & Staff
    let facultyList: any[] = [];
    try {
      const facultyRes = await db.query(
        `
        SELECT DISTINCT ON (u.id)
          u.id,
          u.full_name AS name,
          u.email,
          u.phone,
          COALESCE(up.designation, des.name, 'Faculty Member') AS designation,
          COALESCE(up.qualification, 'Higher Academic Qualification') AS qualification,
          COALESCE(up.specialization, 'Academic Specialization') AS specialization,
          COALESCE(up.experience_years, 5) AS experience_years,
          up.avatar_url,
          up.bio,
          COALESCE(r.name, 'Faculty Member') AS role_name,
          COALESCE(r.code, 'teacher') AS role_code
        FROM users u
        LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
        LEFT JOIN roles r ON r.id = im.role_id
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN designations des ON des.id = up.designation_id
        WHERE (im.institution_id = $1 OR up.under_institution_id = $1)
          AND u.is_active = TRUE
          AND COALESCE(u.is_deleted, FALSE) = FALSE
          AND COALESCE(r.code, '') NOT IN ('student', 'parent', 'guardian')
        ORDER BY u.id DESC
        `,
        [institutionId]
      );
      facultyList = facultyRes.rows;
    } catch (err) {
      console.error("Error loading faculty members:", err);
      facultyList = [];
    }

    // 10. Fetch Hostels
    let hostels: any[] = [];
    try {
      const hostelRes = await db.query(
        `SELECT * FROM institution_hostels WHERE institution_id = $1 AND COALESCE(is_active, TRUE) = TRUE ORDER BY id ASC`,
        [institutionId]
      );
      hostels = hostelRes.rows;
    } catch {
      hostels = [];
    }

    // 11. Fetch Libraries
    let libraries: any[] = [];
    try {
      const libRes = await db.query(
        `SELECT * FROM institution_libraries WHERE institution_id = $1 AND COALESCE(is_active, TRUE) = TRUE ORDER BY id ASC`,
        [institutionId]
      );
      libraries = libRes.rows;
    } catch {
      libraries = [];
    }

    return {
      profile,
      programs: programsRes.rows,
      facilities: facilitiesRes.rows,
      placements: placementsRes.rows,
      cutoffs: cutoffsRes.rows,
      scholarships: scholarshipsRes.rows,
      branches,
      mediaList,
      facultyList,
      hostels,
      libraries,
    };
  } catch (err) {
    console.error("Error loading institution data:", err);
    return null;
  }
}

import { extractIdFromSlug } from "@/lib/utils/seo-slug";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const data = await fetchInstitutionFullData(resolvedParams.id);

  if (!data?.profile) {
    return {
      title: "Institution Not Found | EduBird",
    };
  }

  const p = data.profile;
  const location = p.location_name || "India";
  const title = `${p.name} (${location}) - Admission, Fees, Courses & Facilities | EduBird`;
  const description = p.about
    ? `${p.about.slice(0, 150)}... Admission details, course fee structure, faculty members, and campus hostels at ${p.name}, ${location}.`
    : `Explore ${p.name} located in ${location}. View programs offered, fee structure, faculty members, placements, and hostel facilities. Apply online on EduBird.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: p.banner_url || p.logo_url ? [{ url: p.banner_url || p.logo_url }] : [],
    },
  };
}

export default async function InstituteDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const data = await fetchInstitutionFullData(resolvedParams.id);

  if (!data || !data.profile) {
    notFound();
  }

  const p = data.profile;

  // EducationalOrganization Schema.org JSON-LD
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: p.name,
    description: p.about,
    url: p.website || undefined,
    telephone: p.phone || undefined,
    email: p.email || undefined,
    address: p.location_name
      ? {
          "@type": "PostalAddress",
          addressLocality: p.location_name,
          addressCountry: "IN",
        }
      : undefined,
  };

  const breadcrumbItems = [
    { label: "Institutes", href: "/institutes" },
    ...(p.location_name ? [{ label: p.location_name, href: `/institutes?location=${encodeURIComponent(p.location_name)}` }] : []),
    { label: p.name },
  ];

  return (
    <div className="bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <div className="container mx-auto px-4 pt-4 pb-2">
        <SeoBreadcrumbs items={breadcrumbItems} />
      </div>
      <PublicInstituteDetailClient data={data} />
    </div>
  );
}
