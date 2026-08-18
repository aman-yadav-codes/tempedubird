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

interface Props {
  params: Promise<{ id: string }>;
}

type FeeComponent = {
  id?: number;
  title?: string;
  amount?: unknown;
  unit?: string | null;
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
  const unit = typeof fee.unit === "string" && fee.unit.trim() ? ` / ${fee.unit.trim()}` : "";
  return `${formatAmount(fee.amount)}${unit}`;
}

function compactText(text: string, fallback: string) {
  return text.trim().replace(/\s+/g, " ") || fallback;
}

import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";
import { buildInstituteUrl } from "@/lib/utils/seo-slug";

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
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge className="bg-green-500 text-white">Verified</Badge>
                <Badge variant="outline">{course.programType ?? "Course"}</Badge>
                <Badge variant="outline">{course.category}</Badge>
                {course.selectedCategory && <Badge variant="outline">{course.selectedCategory}</Badge>}
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                {course.title}
              </h1>
              <p className="mt-4 text-base text-muted-foreground">
                Offered by <span className="font-semibold text-primary">{course.institute}</span>
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5 text-yellow-400">
                  ★ <span className="font-semibold text-foreground">4.8</span>
                  <span className="text-muted-foreground">(128 reviews)</span>
                </span>
                <span className="h-4 w-px bg-border" />
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {course.seatsAvailable ? `${course.seatsAvailable} Seats Available` : "2,450 Enrolled"}
                </span>
              </div>
            </section>

            <CourseDetailMedia items={course.images} title={course.title} />

            <div className="grid gap-3 rounded-xl border border-border bg-card/80 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <Feature icon={<BookOpen />} title="Engaging Lessons" text="Curriculum designed for learners" />
              <Feature icon={<Gamepad2 />} title="Interactive Activities" text="Exercises and activities" />
              <Feature icon={<BarChart3 />} title="Progress Tracking" text="Track performance" />
              <Feature icon={<ShieldCheck />} title="Certificate" text="Completion proof" />
            </div>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">About This Program</h2>
              <p className="text-sm leading-7 text-muted-foreground">{aboutText}</p>
              <div className="space-y-3">
                {fallbackLearnings.map((item) => (
                  <div key={item} className="flex gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-foreground">Curriculum Details</h2>
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

            <div className="grid gap-5 lg:grid-cols-3">
              <Panel title="What You'll Learn">
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {fallbackLearnings.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Panel>

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

            <CardBlock title="Fee Components">
              {feeComponents.length > 0 ? (
                feeComponents.map((fee) => (
                  <div key={fee.id ?? fee.title} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{fee.title ?? "Course fee"}</span>
                    <span className="font-semibold text-foreground">{formatFeeAmount(fee)}</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Course fee</span>
                  <span className="font-semibold text-foreground">{course.price}</span>
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
              <p className="mb-4 text-sm text-muted-foreground">Our team is here to help you.</p>
              <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                Contact Support
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

  const language = course.languages[0] ?? "English";

  return (
    <Card className="border-border bg-card/95 shadow-md">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-4 text-sm">
          <DetailRow icon={<Clock className="h-4 w-4" />} label="Duration" value={course.duration} />
          <DetailRow icon={<GraduationCap className="h-4 w-4" />} label="Level" value={course.selectedCategory ?? "Beginner"} />
          <DetailRow icon={<Languages className="h-4 w-4" />} label="Language" value={language} />
          <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="Last Updated" value="May 2024" />
        </div>

        <Separator />

        <div>
          <p className="text-sm text-muted-foreground">Course Price</p>
          <p className="mt-1 text-3xl font-bold text-primary">{course.price}</p>
        </div>

        <Separator />

        <div className="space-y-4 text-sm">
          <DetailRow icon={<Clock className="h-4 w-4" />} label="Duration" value={course.duration} />
          <DetailRow icon={<Users className="h-4 w-4" />} label="Classes" value={course.seatsAvailable ? String(course.seatsAvailable) : "60"} />
          <DetailRow icon={<BookOpen className="h-4 w-4" />} label="Category" value={course.category} />
          <DetailRow icon={<Award className="h-4 w-4" />} label="Program" value={course.selectedCategory ?? course.title} />
        </div>

        <CourseDetailEnrollButton course={course} />
        <Button variant="outline" className="w-full" size="lg" data-tracker-trigger="contact">
          Contact Institute
        </Button>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          14 days money-back guarantee
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
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="max-w-[170px] truncate text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}
