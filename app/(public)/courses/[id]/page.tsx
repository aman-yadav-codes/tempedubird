import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Gamepad2,
  GraduationCap,
  Languages,
  LinkIcon,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";

import { CourseDetailMedia } from "@/components/public/course-detail-media";
import { CourseDetailEnrollButton } from "@/components/public/course-detail-enroll-button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPublicCourseById } from "@/lib/api/public-courses";
import { buildInstituteUrl } from "@/lib/utils/seo-slug";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";

interface Props {
  params: Promise<{ id: string }>;
}

type FeeComponent = {
  id?: number;
  title?: string;
  amount?: unknown;
  unit?: string | null;
  payment_mode?: "one_time" | "installment" | string | null;
  discount_type?: "percentage" | "fixed" | string | null;
  discount_value?: unknown;
  final_amount?: unknown;
  installments_count?: number | null;
};

const fallbackLearnings = [
  "Build strong foundational concepts",
  "Practice through guided worksheets and assignments",
  "Improve confidence and critical thinking",
  "Develop disciplined study habits",
  "Track progress with regular reviews",
];

const fallbackCurriculum = [
  { title: "Language", lessons: 15, tags: ["Reading", "Grammar", "Vocabulary", "Writing"] },
  { title: "Mathematics", lessons: 20, tags: ["Numbers", "Arithmetic", "Shapes", "Measurement"] },
  { title: "Environmental Studies", lessons: 10, tags: ["Our World", "Safety", "Seasons"] },
  { title: "Creative Learning", lessons: 8, tags: ["Art", "Storytelling", "Activities"] },
  { title: "Life Skills", lessons: 7, tags: ["Teamwork", "Communication", "Values"] },
];

const includes = [
  "Live & recorded classes",
  "Study materials & worksheets",
  "Quizzes & assignments",
  "Progress reports",
  "Certificate of completion",
  "Doubt support",
];

function formatAmount(amount: unknown) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "Contact";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFeeAmount(fee: FeeComponent) {
  const finalVal = fee.final_amount != null ? Number(fee.final_amount) : Number(fee.amount);
  const unit = typeof fee.unit === "string" && fee.unit.trim() ? ` / ${fee.unit.trim()}` : "";
  return `${formatAmount(finalVal)}${unit}`;
}

function compactText(text: string, fallback: string) {
  return text.trim().replace(/\s+/g, " ") || fallback;
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

  const instName = course.institute || "Partner Institution";
  const title = `${course.title} at ${instName} - Fees, Admission & Syllabus | EduBird`;
  const description = course.description
    ? `${course.description.slice(0, 150)}... Learn about ${course.title} offered by ${instName}. View duration (${course.duration}), fee structure, syllabus, and apply online.`
    : `Enroll in ${course.title} offered by ${instName}. Check duration (${course.duration}), fee structure, curriculum, eligibility, and online admission.`;

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

  const feeComponents: FeeComponent[] = Array.isArray(course.feeComponents)
    ? course.feeComponents.filter((fee): fee is FeeComponent => Boolean(fee) && typeof fee === "object")
    : [];
  const heroImage = course.images[0]?.url;
  const aboutText = compactText(
    course.description,
    `${course.title} is a carefully structured program designed to help learners build strong concepts through engaging lessons, guided practice, regular assessments, and supportive mentoring.`,
  );
  const curriculum =
    course.subjects.length > 0
      ? course.subjects.slice(0, 6).map((subject, index) => ({
          title: subject,
          lessons: [15, 20, 10, 8, 7, 12][index] ?? 8,
          tags: [course.category, course.selectedCategory ?? course.programType ?? "Program"].filter(Boolean),
        }))
      : fallbackCurriculum;
  const relatedImage = heroImage ?? "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80";

  // Course Schema.org JSON-LD
  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
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

  const breadcrumbItems = [
    { label: "Courses", href: "/courses" },
    { label: course.category || "Programs", href: `/courses?category=${encodeURIComponent(course.category || "")}` },
    { label: course.title },
  ];

  return (
    <div className="bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <div className="container mx-auto px-4 py-6 lg:py-8 space-y-6">
        <SeoBreadcrumbs items={breadcrumbItems} />

        <Button variant="ghost" size="sm" className="mb-4 gap-2 px-0 text-muted-foreground hover:text-foreground" asChild>
          <Link href="/courses">
            <ArrowLeft className="h-4 w-4" />
            Back to Courses
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
          <main className="min-w-0 space-y-8">
            <section>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge className="bg-green-500 text-white text-[11px] font-bold">Verified</Badge>
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
              </div>

              <div className="flex items-start gap-3.5">
                {course.iconUrl ? (
                  <div className="size-12 sm:size-14 rounded-xl overflow-hidden border border-border shadow-xs bg-muted/30 shrink-0 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={course.iconUrl}
                      alt={course.title}
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
                    {course.title}
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

              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5 text-yellow-400">
                  ★ <span className="font-semibold text-foreground">4.8</span>
                  <span className="text-muted-foreground">(128 reviews)</span>
                </span>
                <span className="h-4 w-px bg-border" />
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {course.seatsAvailable ? `${course.seatsAvailable} Seats Available` : "Admissions Open"}
                </span>
                {course.duration ? (
                  <>
                    <span className="h-4 w-px bg-border" />
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {course.duration}
                    </span>
                  </>
                ) : null}
              </div>
            </section>

            <div className="grid gap-3 rounded-xl border border-border bg-card/80 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <Feature icon={<BookOpen />} title="Engaging Lessons" text="Curriculum designed for learners" />
              <Feature icon={<Gamepad2 />} title="Interactive Activities" text="Exercises and activities" />
              <Feature icon={<BarChart3 />} title="Progress Tracking" text="Track performance" />
              <Feature icon={<ShieldCheck />} title="Certificate" text="Completion proof" />
            </div>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">About This Program</h2>
              <p className="text-sm leading-7 text-muted-foreground">{aboutText}</p>
            </section>

            {course.images && course.images.length > 0 ? (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-foreground">Program Gallery & Media</h2>
                  <span className="text-xs text-muted-foreground font-medium">
                    {course.images.length} {course.images.length === 1 ? "File" : "Files"}
                  </span>
                </div>
                <CourseDetailMedia items={course.images} title={course.title} />
              </section>
            ) : null}

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-foreground">What You&apos;ll Learn</h2>
                <Button variant="outline" size="sm" className="gap-2">
                  View Full Curriculum
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {curriculum.map((item, index) => (
                  <div key={item.title} className="flex items-center gap-4 rounded-lg border border-border bg-card/80 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.tags.slice(0, 4).map((tag) => (
                          <Badge key={tag} variant="secondary" className="bg-muted text-[10px] text-muted-foreground">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <span className="hidden text-sm text-muted-foreground sm:block">{item.lessons} Lessons</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-5 md:grid-cols-2">
              <Panel title="Meet Your Instructor">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-2xl font-bold text-primary">
                    E
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{course.institute} Team</p>
                    <p className="text-sm text-muted-foreground">Education Specialist</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Experienced educators focused on making learning clear, practical, and engaging.
                </p>
                <p className="mt-4 text-sm text-yellow-400">★ 4.9 <span className="text-muted-foreground">(256 reviews)</span></p>
              </Panel>

              <Panel title="Student Reviews" action="View All">
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-bold text-foreground">4.8</span>
                  <div>
                    <p className="text-yellow-400">★★★★★</p>
                    <p className="text-xs text-muted-foreground">(128 reviews)</p>
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  {[88, 9, 2, 1, 0].map((value, index) => (
                    <div key={index} className="grid grid-cols-[24px_1fr_34px] items-center gap-2 text-xs text-muted-foreground">
                      <span>{5 - index} ★</span>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
                      </div>
                      <span>{value}%</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-foreground">More Courses You Might Like</h2>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/courses">
                    View All Courses
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[2, 4, 5, 6].map((item) => (
                  <Link key={item} href={`/courses/${item}`} className="group overflow-hidden rounded-lg border border-border bg-card transition hover:border-primary/70">
                    <div className="relative h-32 bg-muted">
                      <Image src={relatedImage} alt={`Class ${item}`} fill sizes="260px" className="object-cover transition group-hover:scale-105" />
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-foreground">Class {item}</p>
                      <p className="text-xs text-muted-foreground">{course.institute}</p>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-yellow-400">★ 4.{item + 2}</span>
                        <span className="font-bold text-primary">{course.price}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </main>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <SidebarSummary course={course} />

            <CardBlock title="Fee Structure & Components">
              {feeComponents.length > 0 ? (
                <div className="space-y-3">
                  {feeComponents.map((fee) => {
                    const origAmount = Number(fee.amount);
                    const finalAmount = fee.final_amount != null ? Number(fee.final_amount) : origAmount;
                    const hasDiscount = Boolean(fee.discount_value && Number(fee.discount_value) > 0);
                    const isInstallment = fee.payment_mode === "installment" || (fee.unit && fee.unit !== "one-time");

                    return (
                      <div key={fee.id ?? fee.title} className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-foreground">{fee.title ?? "Course Fee"}</span>
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {fee.unit ? `per ${fee.unit}` : isInstallment ? "Installment" : "One-Time"}
                          </Badge>
                        </div>

                        <div className="flex items-baseline justify-between pt-1">
                          <div className="text-xs text-muted-foreground">
                            {hasDiscount && (
                              <span className="line-through text-muted-foreground/80 mr-2">
                                {formatAmount(origAmount)}
                              </span>
                            )}
                            {hasDiscount && (
                              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold mr-1.5">
                                {fee.discount_type === "percentage" ? `${fee.discount_value}% OFF` : `₹${fee.discount_value} OFF`}
                              </Badge>
                            )}
                          </div>
                          <span className="font-extrabold text-base text-primary">
                            {formatFeeAmount(fee)}
                          </span>
                        </div>

                        {fee.installments_count && fee.installments_count > 1 ? (
                          <p className="text-[11px] text-muted-foreground">
                            {fee.installments_count} installments estimated for full duration
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm p-3 rounded-xl border border-border/80 bg-muted/20">
                  <span className="text-muted-foreground">Full Course Fee</span>
                  <span className="font-bold text-foreground text-base">{course.price}</span>
                </div>
              )}
            </CardBlock>

            <CardBlock title="Share this course">
              <div className="flex gap-3">
                {[
                  <LinkIcon key="link" className="h-4 w-4" />,
                  "f",
                  "x",
                  <MessageCircle key="chat" className="h-4 w-4" />,
                ].map((item, index) => (
                  <button key={index} className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-sm text-muted-foreground transition hover:border-primary hover:text-primary">
                    {item}
                  </button>
                ))}
              </div>
            </CardBlock>

            <CardBlock title="This course includes">
              <div className="space-y-3">
                {includes.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </CardBlock>

            <CardBlock title="Have a question?">
              <p className="mb-4 text-sm text-muted-foreground">Our admissions counseling team is here to help you.</p>
              <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground font-bold">
                Contact Support / Enquiry
              </Button>
            </CardBlock>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactElement<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 border-border py-2 sm:border-r sm:last:border-r-0">
      <div className="text-primary">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-card/90">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{title}</CardTitle>
        {action && <button className="text-xs font-semibold text-primary">{action}</button>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function CardBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border bg-card/95">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SidebarSummary({
  course,
}: {
  course: Awaited<ReturnType<typeof getPublicCourseById>>;
}) {
  if (!course) return null;

  const institutionId = course.institutionId || course.institution_id;
  const instituteUrl = institutionId
    ? buildInstituteUrl(institutionId, course.institute)
    : "/institutes";

  const durationText =
    course.duration && course.duration.trim() && course.duration !== "Flexible"
      ? course.duration
      : course.durationValue
      ? `${course.durationValue} ${course.durationUnit || "Months"}`
      : "Regular / Flexible";

  const seatsText = course.seatsAvailable
    ? `${course.seatsAvailable} Seats Available`
    : "Admissions Open";

  const languagesText =
    course.languages && course.languages.length > 0
      ? course.languages.join(", ")
      : "English, Hindi";

  const methodText = course.teachingMethod
    ? course.teachingMethod.toLowerCase().includes("class") ||
      course.teachingMethod.toLowerCase().includes("off")
      ? "Classroom / Offline"
      : course.teachingMethod.toLowerCase().includes("onl")
      ? "Online Live"
      : course.teachingMethod.toLowerCase().includes("hyb")
      ? "Hybrid / Blended"
      : course.teachingMethod
    : "Classroom / Offline";

  return (
    <Card className="border-border bg-card/95 shadow-md">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-3.5 text-sm">
          <DetailRow icon={<Clock className="h-4 w-4" />} label="Duration" value={durationText} />
          <DetailRow icon={<GraduationCap className="h-4 w-4" />} label="Level / Class" value={course.selectedCategory ?? course.level ?? course.title} />
          <DetailRow icon={<Languages className="h-4 w-4" />} label="Language" value={languagesText} />
          <DetailRow icon={<Users className="h-4 w-4" />} label="Teaching Method" value={methodText} />
          <DetailRow icon={<Users className="h-4 w-4" />} label="Seats Available" value={seatsText} />
          {(course as any).boardName ? (
            <DetailRow icon={<Award className="h-4 w-4" />} label="Affiliated Board" value={(course as any).boardName} />
          ) : null}
          {(course as any).universityName ? (
            <DetailRow icon={<Award className="h-4 w-4" />} label="University" value={(course as any).universityName} />
          ) : null}
        </div>

        <Separator />

        <div>
          <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Course Fee</p>
          <p className="mt-1 text-3xl font-extrabold text-primary">{course.price}</p>
        </div>

        <Separator />

        <div className="space-y-3.5 text-sm">
          <DetailRow icon={<BookOpen className="h-4 w-4" />} label="Category" value={course.category || "Academic Course"} />
          <DetailRow icon={<Award className="h-4 w-4" />} label="Program" value={course.selectedCategory ?? course.title} />
          {course.sections && course.sections.length > 0 ? (
            <DetailRow icon={<Award className="h-4 w-4" />} label="Sections" value={course.sections.join(", ")} />
          ) : null}
          {course.subjects && course.subjects.length > 0 ? (
            <DetailRow icon={<BookOpen className="h-4 w-4" />} label="Subjects" value={course.subjects.slice(0, 3).join(", ") + (course.subjects.length > 3 ? ` +${course.subjects.length - 3} more` : "")} />
          ) : null}
        </div>

        <CourseDetailEnrollButton course={course} />
        <Button variant="outline" className="w-full font-bold" size="lg" asChild>
          <Link href={instituteUrl}>
            View Institute Profile
          </Link>
        </Button>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          Verified Institution Curriculum
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
        {icon}
        {label}
      </span>
      <span className="max-w-[170px] truncate text-right font-bold text-foreground text-xs">{value}</span>
    </div>
  );
}
