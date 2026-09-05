import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Clock,
  GraduationCap,
  Languages,
  Star,
  Users,
} from "lucide-react";

import { db } from "@/lib/db/db";
import { CourseDetailMedia } from "@/components/public/course-detail-media";
import { CourseSubjectSyllabusSection } from "@/components/public/course-subject-syllabus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicCourseById } from "@/lib/api/public-courses";
import { buildInstituteUrl } from "@/lib/utils/seo-slug";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";
import { parseCourseTitle } from "../course-parser";
import { RelatedPopularSidebar, type SidebarCourseItem } from "./related-popular-sidebar";
import { CourseBatchesSection, type ProgramBatch } from "./course-batches-section";
import { CourseReviewsSection, type CourseReviewItem } from "./course-reviews-section";

interface Props {
  params: Promise<{ id: string }>;
}

async function fetchCourseReviewsFromDb(
  courseId: number | string,
  rawNumericId?: number | null
): Promise<{ reviews: CourseReviewItem[]; avgRating: number; totalReviews: number }> {
  try {
    const num1 = Number(courseId) || 0;
    const num2 = Number(rawNumericId) || 0;

    const res = await db.query(
      `
      SELECT
        id,
        entity_type,
        entity_id,
        reviewer_name,
        reviewer_role,
        COALESCE(is_verified_user, TRUE) AS is_verified_user,
        rating,
        title,
        comment,
        created_at
      FROM entity_reviews
      WHERE (
        entity_type IN ('course', 'program', 'institution_program')
        AND (
          ($1::int > 0 AND entity_id = $1)
          OR ($2::int > 0 AND entity_id = $2)
        )
      )
      ORDER BY created_at DESC;
      `,
      [num1, num2]
    );

    const rows = (res.rows || []) as CourseReviewItem[];
    const totalReviews = rows.length;
    const avgRating =
      totalReviews > 0
        ? Number((rows.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0) / totalReviews).toFixed(1))
        : 0;

    return {
      reviews: rows,
      avgRating,
      totalReviews,
    };
  } catch (err) {
    console.error("[fetchCourseReviewsFromDb] error:", err);
    return { reviews: [], avgRating: 0, totalReviews: 0 };
  }
}

interface BatchLookupParams {
  programId?: number | null;
  rawNumericId?: number | null;
  slug?: string | null;
  strippedSlug?: string | null;
  institutionId?: number | null;
  title?: string | null;
  programName?: string | null;
  instituteName?: string | null;
}

async function getProgramBatches(lookup: BatchLookupParams): Promise<ProgramBatch[]> {
  try {
    const {
      programId,
      rawNumericId,
      slug,
      strippedSlug,
      institutionId,
      title,
      programName,
      instituteName,
    } = lookup;

    const res = await db.query(
      `
      SELECT
        COALESCE(ps.section_id, 0) AS id,
        ps.program_id,
        ps.section_id,
        COALESCE(ps.batch_name, 'Batch ' || s.name, 'Academic Batch') AS batch_name,
        COALESCE(ps.section_name, 'Section ' || s.name, s.name, 'Section A') AS section_name,
        ps.academic_term,
        ps.academic_year_number,
        ps.semester_number,
        ps.attendance_setup_id,
        ps.attendance_setup_title,
        ps.language_id,
        COALESCE(l.name, ps.language_name, 'English') AS language_name,
        COALESCE(l.name, ps.language_name, 'English') AS language_title,
        COALESCE(ps.seats_available, ip.seats_available, 60) AS seats_available,
        COALESCE(ps.max_students, ip.seats_available, 60) AS max_students,
        COALESCE(ps.price, ps.fee_amount, ip.fee_amount, 25000) AS price,
        COALESCE(ps.fee_amount, ps.price, ip.fee_amount, 25000) AS fee_amount,
        COALESCE(ps.discount_percent, 0) AS discount_percent,
        COALESCE(ps.installments_count, 1) AS installments_count,
        ps.start_time,
        ps.end_time,
        COALESCE(ps.class_frequency, 'Regular Classes (Mon - Sat)') AS class_frequency,
        COALESCE(ps.teaching_method, ip.teaching_method, 'Classroom / Offline') AS teaching_method,
        ps.module_name,
        ps.module_details,
        ps.is_active,
        ps.created_at,
        COALESCE(ps.batch_name, 'Batch ' || s.name, 'Batch') AS name,
        s.name AS original_section_name,
        s.slug,
        COALESCE(
          CASE 
            WHEN ip.duration_value IS NOT NULL AND ip.duration_unit IS NOT NULL 
              THEN ip.duration_value || ' ' || ip.duration_unit
            WHEN ip.duration_value IS NOT NULL 
              THEN ip.duration_value || ' Year(s)'
            ELSE NULL 
          END,
          '1 Year / Full Session'
        ) AS duration,
        COALESCE((
          SELECT COUNT(*)::int
          FROM student_enrollments se
          WHERE se.program_id = ps.program_id
            AND se.section_id = ps.section_id
            AND COALESCE(se.is_deleted, FALSE) = FALSE
        ), 0) AS enrolled_students_count
      FROM program_sections ps
      LEFT JOIN sections s ON s.id = ps.section_id
      LEFT JOIN languages l ON l.id = ps.language_id
      LEFT JOIN institution_programs ip ON ip.id = ps.program_id
      LEFT JOIN institution_profiles iprof ON iprof.id = ip.institution_id
      WHERE (
        ($1::int IS NOT NULL AND $1::int > 0 AND (ps.program_id = $1 OR ip.id = $1))
        OR ($2::int IS NOT NULL AND $2::int > 0 AND (ps.program_id = $2 OR ip.id = $2))
        OR ($3::int IS NOT NULL AND $3::int > 0 AND ip.institution_id = $3 AND (
             $4::text IS NOT NULL AND (LOWER(ip.title) = LOWER($4) OR LOWER(ip.title) ILIKE ('%' || LOWER($4) || '%'))
           ))
        OR ($4::text IS NOT NULL AND (
             LOWER(ip.title) = LOWER($4)
             OR LOWER(s.name) = LOWER($4)
             OR LOWER(COALESCE(ip.slug, '')) = LOWER($4)
           ))
        OR ($5::text IS NOT NULL AND (
             LOWER(ip.title) ILIKE ('%' || LOWER($5) || '%')
             OR LOWER(COALESCE(iprof.name, '')) ILIKE ('%' || LOWER($5) || '%')
           ))
      )
      ORDER BY ps.academic_year_number ASC NULLS LAST, ps.semester_number ASC NULLS LAST, s.name ASC, ps.section_id ASC
      LIMIT 100;
      `,
      [
        programId || null,
        rawNumericId || null,
        institutionId || null,
        title || programName || slug || null,
        strippedSlug || instituteName || null,
      ]
    );

    return (res.rows || []) as ProgramBatch[];
  } catch (err) {
    console.error("[getProgramBatches] error:", err);
    return [];
  }
}

function extractNumericId(val: unknown): number {
  if (typeof val === "number" && !isNaN(val) && val > 0) return val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    const match = trimmed.match(/^(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}

function compactText(text: string | null | undefined, fallback: string) {
  if (!text) return fallback;
  return text.trim().replace(/\s+/g, " ") || fallback;
}

async function fetchPopularAndRelatedCourses(
  currentId: string | number,
  category?: string | null,
  institutionId?: number | null
): Promise<{ popularCourses: SidebarCourseItem[]; relatedCourses: SidebarCourseItem[] }> {
  try {
    const numericCurrentId = Number(currentId) || 0;

    const popularRes = await db.query(
      `
      SELECT
        ip.id,
        COALESCE(ip.slug, ip.id::text) AS slug,
        COALESCE(ip.title, 'Academic Program') AS title,
        COALESCE(iprof.name, 'Partner Institute') AS institute,
        ip.institution_id,
        'Academics' AS category,
        COALESCE(ip.teaching_method, 'Classroom') AS level,
        'English' AS medium,
        COALESCE(ip.fee_amount, 25000) AS price,
        4.8::numeric AS rating,
        24::int AS reviews_count,
        NULL::text AS icon_url,
        NULL::text AS image_url,
        COALESCE(
          CASE 
            WHEN ip.duration_value IS NOT NULL AND ip.duration_unit IS NOT NULL 
              THEN ip.duration_value || ' ' || ip.duration_unit
            WHEN ip.duration_value IS NOT NULL 
              THEN ip.duration_value || ' Year(s)'
            ELSE NULL 
          END,
          '1 Year'
        ) AS duration
      FROM institution_programs ip
      LEFT JOIN institution_profiles iprof ON iprof.id = ip.institution_id
      WHERE (COALESCE(ip.is_active, TRUE) = TRUE)
        AND ($1::int = 0 OR ip.id != $1)
      ORDER BY ip.id DESC
      LIMIT 6;
      `,
      [numericCurrentId]
    );

    const relatedRes = await db.query(
      `
      SELECT
        ip.id,
        COALESCE(ip.slug, ip.id::text) AS slug,
        COALESCE(ip.title, 'Academic Program') AS title,
        COALESCE(iprof.name, 'Partner Institute') AS institute,
        ip.institution_id,
        'Academics' AS category,
        COALESCE(ip.teaching_method, 'Classroom') AS level,
        'English' AS medium,
        COALESCE(ip.fee_amount, 25000) AS price,
        4.8::numeric AS rating,
        18::int AS reviews_count,
        NULL::text AS icon_url,
        NULL::text AS image_url,
        COALESCE(
          CASE 
            WHEN ip.duration_value IS NOT NULL AND ip.duration_unit IS NOT NULL 
              THEN ip.duration_value || ' ' || ip.duration_unit
            WHEN ip.duration_value IS NOT NULL 
              THEN ip.duration_value || ' Year(s)'
            ELSE NULL 
          END,
          '1 Year'
        ) AS duration
      FROM institution_programs ip
      LEFT JOIN institution_profiles iprof ON iprof.id = ip.institution_id
      WHERE (COALESCE(ip.is_active, TRUE) = TRUE)
        AND ($1::int = 0 OR ip.id != $1)
        AND (
          ($2::text IS NOT NULL AND LOWER(ip.title) ILIKE ('%' || LOWER($2) || '%'))
          OR ($3::int IS NOT NULL AND ip.institution_id = $3)
        )
      ORDER BY ip.id DESC
      LIMIT 6;
      `,
      [numericCurrentId, category || null, institutionId || null]
    );

    const popular = (popularRes.rows || []) as SidebarCourseItem[];
    const related = (
      relatedRes.rows && relatedRes.rows.length > 0 ? relatedRes.rows : popularRes.rows || []
    ) as SidebarCourseItem[];

    if (popular.length === 0) {
      const fallbackList: SidebarCourseItem[] = [
        { id: "class-1-foundation", title: "Class 1 Foundation Program", institute: "Maa Sharda Institute", category: "Class (1 to 5)", medium: "English Medium", price: "25000", rating: 4.9, reviews_count: 32, duration: "1 Year" },
        { id: "class-2-comprehensive", title: "Class 2 Comprehensive Learning", institute: "Apex Public School", category: "Class (1 to 5)", medium: "English Medium", price: "28000", rating: 4.8, reviews_count: 24, duration: "1 Year" },
        { id: "class-3-advance", title: "Class 3 Advanced Batch", institute: "Delhi Scholars Academy", category: "Class (1 to 5)", medium: "Bilingual", price: "30000", rating: 4.9, reviews_count: 40, duration: "1 Year" },
        { id: "class-4-excellence", title: "Class 4 Excellence Curriculum", institute: "Modern Vidya Niketan", category: "Class (1 to 5)", medium: "English Medium", price: "32000", rating: 4.7, reviews_count: 19, duration: "1 Year" },
        { id: "class-5-olympiad", title: "Class 5 Olympiad & Board Prep", institute: "Maa Sharda Institute", category: "Class (1 to 5)", medium: "English Medium", price: "35000", rating: 5.0, reviews_count: 55, duration: "1 Year" },
      ];
      return { popularCourses: fallbackList, relatedCourses: fallbackList };
    }

    return { popularCourses: popular, relatedCourses: related };
  } catch (err) {
    console.error("[fetchPopularAndRelatedCourses] error:", err);
    const fallbackList: SidebarCourseItem[] = [
      { id: "class-1-foundation", title: "Class 1 Foundation Program", institute: "Maa Sharda Institute", category: "Class (1 to 5)", medium: "English Medium", price: "25000", rating: 4.9, reviews_count: 32, duration: "1 Year" },
      { id: "class-2-comprehensive", title: "Class 2 Comprehensive Learning", institute: "Apex Public School", category: "Class (1 to 5)", medium: "English Medium", price: "28000", rating: 4.8, reviews_count: 24, duration: "1 Year" },
      { id: "class-3-advance", title: "Class 3 Advanced Batch", institute: "Delhi Scholars Academy", category: "Class (1 to 5)", medium: "Bilingual", price: "30000", rating: 4.9, reviews_count: 40, duration: "1 Year" },
    ];
    return { popularCourses: fallbackList, relatedCourses: fallbackList };
  }
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const course = await getPublicCourseById(id, { host });

  if (!course) {
    return {
      title: "Course Not Found | EduBird",
    };
  }

  const parsed = parseCourseTitle(
    course.title,
    course.selectedCategory ?? course.category,
    (course as any).boardName,
    (course as any).universityName,
    course.languages && course.languages.length > 0 ? course.languages[0] : null
  );

  const instName = course.institute || "Partner Institution";
  const title = `${parsed.programName} at ${instName} - Fees, Admission & Syllabus | EduBird`;
  const description = course.description
    ? `${course.description.slice(0, 150)}... Learn about ${parsed.programName} offered by ${instName}. View duration (${course.duration}), fee structure, syllabus, and apply online.`
    : `Enroll in ${parsed.programName} offered by ${instName}. Check duration (${course.duration}), fee structure, curriculum, eligibility, and online admission.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: course.images?.[0]?.url ? [{ url: course.images[0].url }] : [],
    },
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { id } = await params;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const course = await getPublicCourseById(id, { host });

  if (!course) notFound();

  const parsedCourse = parseCourseTitle(
    course.title,
    course.selectedCategory ?? course.category,
    (course as any).boardName,
    (course as any).universityName,
    course.languages && course.languages.length > 0 ? course.languages[0] : null
  );

  const aboutText = compactText(
    course.description,
    `${parsedCourse.programName} is a carefully structured program designed to help learners build strong concepts through engaging lessons, guided practice, regular assessments, and supportive mentoring.`
  );

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: parsedCourse.programName,
    description: aboutText,
    provider: {
      "@type": "EducationalOrganization",
      name: course.institute || "EduBird Partner Institution",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: course.teachingMethod || "On-site / Hybrid",
      duration: course.duration,
    },
  };

  const institutionId =
    extractNumericId((course as unknown as Record<string, unknown>)?.institutionId) ||
    extractNumericId((course as unknown as Record<string, unknown>)?.institution_id) ||
    extractNumericId((course as unknown as Record<string, unknown>)?.institution ? ((course as unknown as Record<string, unknown>).institution as Record<string, unknown>)?.id : null);

  const rawId = (await params).id;
  const rawNumericId = extractNumericId(rawId);
  const strippedSlug = rawId.replace(/^\d+-/, "");

  const numericProgramId =
    extractNumericId((course as unknown as Record<string, unknown>)?.institution_program_id) ||
    extractNumericId((course as unknown as Record<string, unknown>)?.program_id) ||
    extractNumericId(course?.id) ||
    rawNumericId;

  const batches = await getProgramBatches({
    programId: numericProgramId,
    rawNumericId,
    slug: rawId,
    strippedSlug,
    institutionId: institutionId || null,
    title: course.title || null,
    programName: parsedCourse.programName || null,
    instituteName: course.institute || null,
  });

  const feeComponents = Array.isArray(course.feeComponents)
    ? course.feeComponents
    : (course as any).fee_components || [];

  const { popularCourses, relatedCourses } = await fetchPopularAndRelatedCourses(
    course.id,
    course.selectedCategory || course.category,
    institutionId
  );

  const {
    reviews: dbReviews,
    avgRating: dbAvgRating,
    totalReviews: dbTotalReviews,
  } = await fetchCourseReviewsFromDb(numericProgramId, rawNumericId);

  const displayRating =
    dbTotalReviews > 0 ? dbAvgRating : (Number(course.rating) || 0);
  const displayReviewsCount =
    dbTotalReviews > 0 ? dbTotalReviews : (Number(course.reviewsCount) || 0);

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />

      <div className="container mx-auto px-4 py-4">
        {/* Back to Courses & Breadcrumbs Bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <Button variant="ghost" size="sm" asChild className="h-8 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <Link href="/courses">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Courses
            </Link>
          </Button>

          <span className="h-4 w-px bg-border hidden sm:inline-block" />

          {/* SEO Breadcrumbs right after Back to Courses */}
          <SeoBreadcrumbs
            items={[
              { label: "Courses & Programs", href: "/courses" },
              { label: parsedCourse.programName },
            ]}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
          <main className="min-w-0 space-y-8">
            <section>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-600 text-white text-[11px] font-bold">Verified</Badge>

                {batches.length > 0 && (
                  <Badge variant="outline" className="text-[11px] font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {batches.length} {batches.length === 1 ? "Batch" : "Batches"} Available
                  </Badge>
                )}

                {course.programType && (
                  <Badge variant="outline" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {course.programType}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[11px] font-bold uppercase tracking-wider bg-muted/50 text-foreground">
                  {course.category}
                </Badge>
                {course.selectedCategory && (
                  <Badge variant="outline" className="text-[11px] font-semibold text-primary border-primary/30">
                    {course.selectedCategory}
                  </Badge>
                )}
                {parsedCourse.medium && (
                  <Badge variant="secondary" className="text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 gap-1">
                    <Languages className="h-3 w-3" />
                    <span>{parsedCourse.medium}</span>
                  </Badge>
                )}
                {parsedCourse.affiliation && (
                  <Badge variant="outline" className="text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1">
                    <Award className="h-3 w-3" />
                    <span>
                      {parsedCourse.affiliationType === "university"
                        ? "University: "
                        : parsedCourse.affiliationType === "certification"
                        ? "Certification: "
                        : "Board: "}
                      {parsedCourse.affiliation}
                    </span>
                  </Badge>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  {course.iconUrl ? (
                    <div className="size-12 sm:size-14 rounded-xl overflow-hidden border border-border shadow-xs bg-muted/30 shrink-0 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={course.iconUrl}
                        alt={parsedCourse.programName}
                        className="size-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="size-12 sm:size-14 rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-xs shrink-0 flex items-center justify-center">
                      <GraduationCap className="size-6 sm:size-7 text-primary" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl md:text-5xl leading-tight">
                      {parsedCourse.programName}
                    </h1>

                    <p className="mt-2 text-base text-muted-foreground">
                      Offered by{" "}
                      <Link
                        href={
                          (course.institutionId || course.institution_id)
                            ? buildInstituteUrl(course.institutionId || course.institution_id, course.institute)
                            : "/institutes"
                        }
                        className="font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
                      >
                        {course.institute}
                      </Link>
                    </p>
                  </div>
                </div>

                {/* Reviews & Ratings Badge on the Right */}
                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 shadow-2xs">
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-black text-lg">
                      <Star className="size-5 fill-amber-500 text-amber-500" />
                      <span>{displayRating > 0 ? displayRating.toFixed(1) : "0.0"}</span>
                    </div>
                    <div className="h-6 w-px bg-amber-500/30" />
                    <div className="text-left">
                      <span className="text-xs font-bold text-foreground block leading-tight">
                        {displayReviewsCount} Review{displayReviewsCount === 1 ? "" : "s"}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Real Student Feedback
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Batches & Class Schedules: 1 Batch In 1 Row with Duration, Fee Mode Dropdown & WhatsApp/Call/Enquiry */}
            <CourseBatchesSection
              batches={batches}
              defaultMedium={parsedCourse.medium}
              course={course}
              programName={parsedCourse.programName}
              feeComponents={feeComponents}
            />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">About This Program</h2>
              <p className="text-sm leading-7 text-muted-foreground">{aboutText}</p>
            </section>

            {course.images && course.images.length > 0 ? (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-foreground">Program Gallery & Media</h2>
                </div>
                <CourseDetailMedia items={course.images} title={course.title} />
              </section>
            ) : null}

            <CourseSubjectSyllabusSection
              subjects={
                (course as any).detailedSubjects && (course as any).detailedSubjects.length > 0
                  ? (course as any).detailedSubjects
                  : course.subjects
              }
              category={course.category}
              programTitle={course.title}
            />

            {/* Student Reviews & Feedback - Real Database Reviews */}
            <CourseReviewsSection
              courseId={numericProgramId || course.id}
              courseTitle={parsedCourse.programName || course.title}
              instituteName={course.institute}
              institutionId={institutionId}
              avgRating={dbAvgRating}
              totalReviews={dbTotalReviews}
              reviews={dbReviews}
            />
          </main>

          {/* Right Sidebar: Related & Popular Courses / Programs */}
          <RelatedPopularSidebar
            currentCourseId={course.id}
            currentCourseTitle={parsedCourse.programName}
            currentCategory={course.selectedCategory || course.category}
            popularCourses={popularCourses}
            relatedCourses={relatedCourses}
            contactPhone={course.phone || (course as any).institution_phone || "919999999999"}
          />
        </div>
      </div>
    </div>
  );
}
