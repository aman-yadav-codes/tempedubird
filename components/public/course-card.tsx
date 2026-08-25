"use client";

import Image from "next/image";
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
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { buildCourseUrl } from "@/lib/utils/seo-slug";

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
  onEnroll,
  onEnquire,
}: CourseCardProps) {
  const hasCustomMedia = Boolean(
    (images && images.length > 0 && images[0]?.url) ||
    (image && image.trim()) ||
    (iconUrl && iconUrl.trim())
  );
  const displayImage = (images && images.length > 0 && images[0]?.url) ? images[0].url : (image && image.trim() ? image : (iconUrl && iconUrl.trim() ? iconUrl : null));
  const courseUrl = buildCourseUrl(id, title, institute);
  const isList = viewMode === "list";
  const subjectPreview = subjects.slice(0, 2).join(", ");
  const sectionPreview = sections.slice(0, 2).join(", ");
  const languagePreview = languages.slice(0, 2).join(", ");

  return (
    <Card className="group h-full gap-0 overflow-hidden rounded-lg border-border bg-card/90 p-0 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/70 hover:shadow-[0_0_0_1px_rgba(239,68,68,0.25)]">
      <div className={`h-full p-3 ${isList ? "grid gap-4 sm:grid-cols-[280px_1fr]" : "flex flex-col"}`}>
        <div className={`relative overflow-hidden rounded-md bg-muted ${isList ? "min-h-[190px]" : "h-[165px]"}`}>
          {hasCustomMedia && displayImage ? (
            <Image
              src={displayImage}
              alt={title}
              fill
              sizes={
                isList
                  ? "(min-width: 768px) 280px, 100vw"
                  : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              }
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              unoptimized
            />
          ) : (
            <div className="relative h-full w-full bg-gradient-to-br from-primary/10 via-muted/40 to-primary/5 flex items-center justify-center p-4 transition-colors group-hover:from-primary/15">
              <div className="size-8 sm:size-9 rounded-lg bg-background/95 border border-primary/20 shadow-2xs flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-300">
                <GraduationCap className="size-4 text-primary" />
              </div>
            </div>
          )}
          <div className="absolute left-3 top-3">
            <Badge className={verified ? "bg-green-500/95 text-white text-[10px] font-bold shadow-xs" : "bg-muted text-[10px]"}>
              {verified && <CheckCircle2 className="mr-1 h-3 w-3" />}
              {verified ? "Verified" : "Standard"}
            </Badge>
          </div>
          <div className="absolute right-3 top-3">
            <Badge variant="secondary" className="max-w-[170px] truncate bg-background/90 text-foreground text-[10px] font-bold uppercase tracking-wider shadow-xs border border-border/60">
              {selectedCategory ?? category}
            </Badge>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <CardHeader className="px-3 pb-2.5 pt-3.5 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {selectedCategory ?? category}
              </span>
              <span className="text-xl font-black text-primary">{price}</span>
            </div>
            <h3 className="line-clamp-1 text-lg sm:text-xl font-black uppercase tracking-tight text-foreground transition-colors group-hover:text-primary leading-snug">
              <Link href={courseUrl} className="hover:underline uppercase font-black">
                {title}
              </Link>
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Link href="/institutes" className="hover:text-primary hover:underline font-semibold text-muted-foreground">
                {institute}
              </Link>
              {programType && (
                <>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                  <span className="uppercase text-[10px] tracking-wider font-semibold text-muted-foreground/80">{programType}</span>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col px-3 pb-1">
            <Separator className="mb-4" />
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {duration}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                {seatsAvailable ? `${seatsAvailable} seats` : students}
              </div>
              {teachingMethod && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Monitor className="h-4 w-4" />
                  <span className="truncate">{teachingMethod}</span>
                </div>
              )}
              {languagePreview && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Languages className="h-4 w-4" />
                  <span className="truncate">{languagePreview}</span>
                </div>
              )}
            </div>

            <div className="mb-4 space-y-2 text-sm">
              {subjectPreview && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="line-clamp-1">
                    {subjectPreview}
                    {subjects.length > 2 ? ` +${subjects.length - 2} more` : ""}
                  </span>
                </div>
              )}
              {sectionPreview && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <GraduationCap className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="line-clamp-1">
                    {sectionPreview}
                    {sections.length > 2 ? ` +${sections.length - 2} more` : ""}
                  </span>
                </div>
              )}
              {!subjectPreview && !sectionPreview && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  Curriculum details available soon
                </div>
              )}
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {programType && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {programType}
                </Badge>
              )}
              {verified && (
                <Badge variant="outline" className="border-green-500/40 text-green-500">
                  Verified Institute
                </Badge>
              )}
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2">
              {onEnroll && (
                <button
                  type="button"
                  onClick={() => onEnroll({ id, title, institute, price, duration, institution_id: institutionId || institution_id, fee_amount })}
                  className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-primary font-bold text-xs text-primary-foreground shadow-xs transition hover:bg-primary/90 cursor-pointer"
                >
                  <GraduationCap className="h-4 w-4" />
                  Enroll Now
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (onEnquire) {
                    onEnquire({ id, title, institute, price, duration, institution_id: institutionId || institution_id });
                  } else {
                    window.location.href = courseUrl;
                  }
                }}
                className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-primary/80 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground cursor-pointer ${
                  !onEnroll ? "col-span-2" : ""
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Enquiry
              </button>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
