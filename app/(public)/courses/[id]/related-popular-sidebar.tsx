"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Flame,
  Sparkles,
  Star,
  GraduationCap,
  Languages,
  Clock,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  Link as LinkIcon,
  BookOpen,
  Award,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface SidebarCourseItem {
  id: number | string;
  slug?: string;
  title: string;
  institute?: string;
  institution_id?: number;
  category?: string;
  level?: string;
  medium?: string;
  price?: string | number;
  rating?: number;
  reviews_count?: number;
  icon_url?: string;
  image_url?: string;
  duration?: string;
}

interface RelatedPopularSidebarProps {
  currentCourseId?: number | string;
  currentCourseTitle?: string;
  currentCategory?: string;
  popularCourses: SidebarCourseItem[];
  relatedCourses: SidebarCourseItem[];
  contactPhone?: string;
}

function formatRating(val: unknown): string {
  if (val === null || val === undefined) return "4.8";
  const num = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(num) || num <= 0) return "4.8";
  return num.toFixed(1);
}

function formatFee(price?: string | number | null): string {
  if (price == null || price === "") return "Contact for Fee";
  const num = Number(price);
  if (!Number.isFinite(num)) {
    return String(price).startsWith("₹") ? String(price) : `₹${price}`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

const courseHighlights = [
  "Comprehensive Study Material & Notes",
  "Dedicated Doubt Clearing Sessions",
  "Regular Practice Tests & Assessments",
  "Verified & Experienced Educators",
  "Recognized Course Completion Certificate",
];

export function RelatedPopularSidebar({
  currentCourseId,
  currentCourseTitle = "Current Course",
  currentCategory = "Academics",
  popularCourses = [],
  relatedCourses = [],
  contactPhone = "919999999999",
}: RelatedPopularSidebarProps) {
  const [activeTab, setActiveTab] = useState<"popular" | "related">("popular");
  const [copied, setCopied] = useState(false);

  const cleanPhone = contactPhone.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/${
    cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone || "919999999999"
  }?text=${encodeURIComponent(
    `Hello, I would like guidance regarding courses and admissions for ${currentCourseTitle}.`
  )}`;
  const callUrl = `tel:${cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`}`;

  const displayedCourses = activeTab === "popular" ? popularCourses : relatedCourses;

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
      {/* Popular & Related Courses Card */}
      <Card className="overflow-hidden rounded-2xl border border-border bg-card/95 shadow-md">
        {/* Card Header with Modern Switcher */}
        <div className="border-b border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              {activeTab === "popular" ? (
                <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                  <Flame className="size-4" />
                </div>
              ) : (
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="size-4" />
                </div>
              )}
              <h3 className="font-bold text-base text-foreground">
                {activeTab === "popular" ? "Popular Courses" : "Related Programs"}
              </h3>
            </div>
            <Link
              href="/courses"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="size-3" />
            </Link>
          </div>

          {/* Filter Tabs */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1">
            <button
              onClick={() => setActiveTab("popular")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "popular"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Flame className="size-3.5 text-amber-500" />
              <span>Popular</span>
              <span className="ml-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-bold text-amber-600">
                {popularCourses.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("related")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "related"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="size-3.5 text-primary" />
              <span>Related</span>
              <span className="ml-0.5 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                {relatedCourses.length}
              </span>
            </button>
          </div>
        </div>

        {/* Course List */}
        <CardContent className="p-3 space-y-2.5">
          {displayedCourses.length > 0 ? (
            displayedCourses.map((c, idx) => {
              const courseUrl = `/courses/${c.slug || c.id}`;

              return (
                <Link
                  key={`sidebar-course-${c.id}-${idx}`}
                  href={courseUrl}
                  className="group relative flex items-start gap-3 rounded-xl border border-border/70 bg-background/60 p-3 transition-all duration-200 hover:border-primary/50 hover:bg-card hover:shadow-xs"
                >
                  {/* Icon / Thumbnail */}
                  <div className="relative size-12 shrink-0 rounded-xl overflow-hidden border border-border bg-muted/40 flex items-center justify-center">
                    {c.icon_url || c.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.icon_url || c.image_url}
                        alt={c.title}
                        className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-primary/10 text-primary">
                        <GraduationCap className="size-5" />
                      </div>
                    )}
                  </div>

                  {/* Course Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="inline-block max-w-[140px] truncate rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {c.category || currentCategory}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 shrink-0">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        <span>{formatRating(c.rating)}</span>
                      </div>
                    </div>

                    <h4 className="mt-1 font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {c.title}
                    </h4>

                    {c.institute && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {c.institute}
                      </p>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-2 pt-1.5 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {c.medium && (
                          <span className="inline-flex items-center gap-0.5">
                            <Languages className="size-2.5" />
                            {c.medium}
                          </span>
                        )}
                        {c.duration && (
                          <span className="inline-flex items-center gap-0.5">
                            <Clock className="size-2.5" />
                            {c.duration}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-black text-primary">
                        {formatFee(c.price)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="py-6 text-center text-xs text-muted-foreground">
              <BookOpen className="size-8 mx-auto mb-2 text-muted-foreground/40" />
              <p>No other courses in this category currently.</p>
              <Button variant="link" size="sm" asChild className="mt-1 text-xs">
                <Link href="/courses">Browse All Available Courses</Link>
              </Button>
            </div>
          )}
        </CardContent>

        {/* Footer CTA to explore all courses */}
        <div className="border-t border-border bg-muted/20 p-3 text-center">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="w-full text-xs font-bold rounded-xl h-8 gap-1.5"
          >
            <Link href="/courses">
              <span>Explore All Programs</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </Card>

      {/* Need Guidance / Admission Enquiry Assistance Card */}
      <Card className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-muted/30 shadow-xs p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <Award className="size-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">Need Course Guidance?</h4>
              <p className="text-[11px] text-muted-foreground">
                Get free 1-on-1 academic counselling & fee details
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs font-bold border-emerald-500/40 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl h-8 gap-1 cursor-pointer"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>WhatsApp</span>
              </a>
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs font-bold border-sky-500/40 bg-sky-50/80 hover:bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 rounded-xl h-8 gap-1 cursor-pointer"
            >
              <a href={callUrl}>
                <PhoneCall className="size-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>Call Us</span>
              </a>
            </Button>
          </div>
        </div>
      </Card>

      {/* Program Highlights Checklist */}
      <Card className="rounded-2xl border border-border bg-card/95 shadow-xs">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Course Includes & Benefits
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1 space-y-2.5">
          {courseHighlights.map((item, idx) => (
            <div key={`highlight-${idx}`} className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
              <span className="leading-snug">{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Share Program Widget */}
      <Card className="rounded-2xl border border-border bg-card/95 shadow-xs p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-foreground">Share this Course</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyLink}
              title="Copy Course Link"
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer text-xs"
            >
              {copied ? (
                <CheckCircle2 className="size-3.5 text-emerald-600" />
              ) : (
                <LinkIcon className="size-3.5" />
              )}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Check out this course: ${currentCourseTitle} on EduBird`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Share on WhatsApp"
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              <WhatsAppIcon className="size-3.5" />
            </a>
          </div>
        </div>
      </Card>
    </aside>
  );
}
