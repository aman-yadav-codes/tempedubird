import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
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
  viewMode?: "grid" | "list";
  onEnroll?: (program: { id: number; title: string; institute: string; price: string; duration: string }) => void;
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
  onEnroll,
}: CourseCardProps) {
  const displayImage = images[0]?.url || image || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80";
  const courseUrl = buildCourseUrl(id, title, institute);
  const isList = viewMode === "list";
  const subjectPreview = subjects.slice(0, 2).join(", ");
  const sectionPreview = sections.slice(0, 2).join(", ");
  const languagePreview = languages.slice(0, 2).join(", ");

  return (
    <Card className="group h-full gap-0 overflow-hidden rounded-lg border-border bg-card/90 p-0 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/70 hover:shadow-[0_0_0_1px_rgba(239,68,68,0.25)]">
      <div className={`h-full p-3 ${isList ? "grid gap-4 sm:grid-cols-[280px_1fr]" : "flex flex-col"}`}>
        <div className={`relative overflow-hidden rounded-md bg-muted ${isList ? "min-h-[190px]" : "h-[170px]"}`}>
          {displayImage ? (
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
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              No media uploaded
            </div>
          )}
          <div className="absolute left-3 top-3">
            <Badge className={verified ? "bg-green-500/90 text-white" : "bg-muted"}>
              {verified && <CheckCircle2 className="mr-1 h-3 w-3" />}
              {verified ? "Verified" : "Standard"}
            </Badge>
          </div>
          <div className="absolute right-3 top-3">
            <Badge variant="secondary" className="max-w-[190px] truncate bg-background/90 text-foreground">
              {category}
            </Badge>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <CardHeader className="px-3 pb-3 pt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline" className="max-w-full truncate text-xs">
                {selectedCategory ?? level}
              </Badge>
              <span className="text-lg font-bold text-primary">{price}</span>
            </div>
            <h3 className="line-clamp-2 text-xl font-semibold text-foreground transition-colors group-hover:text-primary">
              <Link href={courseUrl} className="hover:underline">
                {title}
              </Link>
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Link href="/institutes" className="hover:text-primary hover:underline">
                {institute}
              </Link>
              {programType && (
                <>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                  <span>{programType}</span>
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
                  onClick={() => onEnroll({ id, title, institute, price, duration })}
                  className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-primary font-bold text-xs text-primary-foreground shadow-xs transition hover:bg-primary/90"
                >
                  <GraduationCap className="h-4 w-4" />
                  Enroll Now
                </button>
              )}
              <Link
                href={courseUrl}
                className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-primary/80 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground ${
                  !onEnroll ? "col-span-2" : ""
                }`}
              >
                View Details
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
