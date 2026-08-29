"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  HelpCircle,
  Languages,
  Monitor,
  Users,
  Star,
  MessageSquare,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buildCourseUrl } from "@/lib/utils/seo-slug";
import { UniversalFeedbackDialog } from "@/components/public/universal-feedback-dialog";

export interface CourseCardProps {
  id: number;
  title: string;
  institute: string;
  duration: string;
  level: string;
  rating?: number;
  reviews?: number;
  price: string;
  image?: string;
  images?: { id: number; url: string; mediaType?: "image" | "video" }[];
  iconUrl?: string | null;
  verified: boolean;
  category: string;
  students: string;
  selectedCategory?: string | null;
  seatsAvailable?: number | null;
  teachingMethod?: string | null;
  programType?: string | null;
  languages?: string[];
  subjects?: string[];
  sections?: string[];
  institutionId?: number;
  institution_id?: number;
  fee_amount?: any;
  viewMode?: "grid" | "list";
  onEnroll?: (program: { id: number; title: string; institute: string; price: string; duration: string; institution_id?: number; fee_amount?: string | number }) => void;
  onEnquire?: (program: { id: number; title: string; institute: string; price: string; duration: string; institution_id?: number }) => void;
}

export function CourseCard({
  id,
  title,
  institute,
  duration,
  level,
  price,
  image,
  images = [],
  iconUrl,
  verified,
  category,
  students,
  selectedCategory,
  seatsAvailable,
  teachingMethod,
  programType,
  languages = [],
  subjects = [],
  sections = [],
  viewMode = "grid",
  institutionId,
  institution_id,
  fee_amount,
  rating,
  reviews,
  onEnroll,
  onEnquire,
}: CourseCardProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const courseUrl = buildCourseUrl(id, title, institute);
  const isList = viewMode === "list";
  const subjectPreview = subjects.slice(0, 2).join(", ");
  const sectionPreview = sections.slice(0, 2).join(", ");
  const languagePreview = languages.slice(0, 2).join(", ");

  const categoryLabel = selectedCategory || category || "COURSE";

  return (
    <Card className="group h-full flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card/95 p-0 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/60 hover:shadow-md hover:shadow-primary/5">
      <div className={`h-full p-4 sm:p-5 flex flex-col justify-between ${isList ? "gap-4" : "gap-3"}`}>
        {/* Compact Card Header */}
        <div className="space-y-2.5">
          {/* Top Line: Small Icon & Category on Left, Price on Right */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="size-7 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <GraduationCap className="size-3.5" />
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground truncate">
                {categoryLabel}
              </span>
            </div>

            {/* Price Tag */}
            <div className="text-right shrink-0">
              <span className="text-lg sm:text-xl font-black text-primary tracking-tight">
                {price}
              </span>
            </div>
          </div>

          {/* Title & Institute (with green checkmark icon ONLY) */}
          <div className="space-y-1 pt-0.5">
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-foreground transition-colors group-hover:text-primary leading-snug line-clamp-2">
              <Link href={courseUrl} className="hover:underline">
                {title}
              </Link>
            </h3>

            {/* Institute Name with Green Check Icon immediately following */}
            <div className="flex items-center flex-wrap gap-1.5 text-xs text-muted-foreground">
              <Link
                href="/institutes"
                className="hover:text-primary hover:underline font-semibold text-muted-foreground inline-flex items-center gap-1 truncate max-w-[200px]"
              >
                <span>{institute}</span>
              </Link>
              {verified && (
                <span title="Verified Institute" className="inline-flex">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/10 shrink-0 inline-block" />
                </span>
              )}
              {programType && (
                <>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span className="uppercase text-[10px] tracking-wider font-semibold text-muted-foreground/70 truncate">
                    {programType}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content Section: Attributes & Meta */}
        <div className="space-y-3 pt-2 border-t border-border/60">
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate">
              <Clock className="h-3.5 w-3.5 text-primary/70 shrink-0" />
              <span className="truncate">{duration || "1 Year"}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Users className="h-3.5 w-3.5 text-primary/70 shrink-0" />
              <span className="truncate">{seatsAvailable ? `${seatsAvailable} seats` : students}</span>
            </div>
            {teachingMethod && (
              <div className="flex items-center gap-1.5 truncate">
                <Monitor className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                <span className="truncate">{teachingMethod}</span>
              </div>
            )}
            {languagePreview ? (
              <div className="flex items-center gap-1.5 truncate">
                <Languages className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                <span className="truncate">{languagePreview}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 truncate">
                <BookOpen className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                <span className="truncate">{subjectPreview || "Full Curriculum"}</span>
              </div>
            )}
          </div>

          {/* Rating & Review trigger */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-600 font-bold hover:underline cursor-pointer"
            >
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>
                {rating != null && !isNaN(Number(rating))
                  ? (Number.isInteger(Number(rating)) ? `${Number(rating)}.0` : Number(rating).toFixed(1))
                  : "4.8"}
              </span>
              <span className="text-muted-foreground font-normal">
                ({reviews != null && !isNaN(Number(reviews)) ? Number(reviews) : 4} {Number(reviews) === 1 ? "review" : "reviews"})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary font-medium cursor-pointer"
            >
              <MessageSquare className="h-3 w-3" />
              <span>Feedback</span>
            </button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {onEnroll ? (
              <button
                type="button"
                onClick={() =>
                  onEnroll({
                    id,
                    title,
                    institute,
                    price,
                    duration,
                    institution_id: institutionId || institution_id,
                    fee_amount,
                  })
                }
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-primary font-bold text-xs text-primary-foreground shadow-2xs transition hover:bg-primary/90 cursor-pointer"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Enroll</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (onEnquire) {
                  onEnquire({
                    id,
                    title,
                    institute,
                    price,
                    duration,
                    institution_id: institutionId || institution_id,
                  });
                } else {
                  window.location.href = courseUrl;
                }
              }}
              className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-primary/70 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground cursor-pointer ${
                !onEnroll ? "col-span-2" : ""
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Enquiry</span>
            </button>
          </div>
        </div>
      </div>

      {/* Universal Feedback & Comment Dialog */}
      <UniversalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        target={{
          type: "course",
          id,
          title,
          subtitle: `${institute} • ${duration}`,
          avg_rating: rating || 4.8,
          review_count: reviews || 24,
        }}
      />
    </Card>
  );
}
