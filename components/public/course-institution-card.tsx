"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, CheckCircle2, ChevronRight, MapPin, Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildInstituteUrl } from "@/lib/utils/seo-slug";
import { UniversalFeedbackDialog } from "@/components/public/universal-feedback-dialog";

export type CourseInstitutionProps = {
  id: number;
  name: string;
  slug?: string | null;
  city?: string | null;
  location?: string | null;
  logo_url?: string | null;
  rating?: number;
  reviews_count?: number;
  verified?: boolean;
};

export function CourseInstitutionSidebarCard({
  institution,
  className = "",
}: {
  institution: CourseInstitutionProps;
  className?: string;
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const instituteUrl = buildInstituteUrl(institution.id, institution.name, institution.location || institution.city);

  return (
    <div className={`rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm ${className}`}>
      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
        LISTED & MANAGED BY
      </p>

      <div className="flex items-center gap-3.5">
        <div className="size-14 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center shrink-0 font-bold text-xl overflow-hidden relative shadow-2xs">
          {institution.logo_url ? (
            <Image
              src={institution.logo_url}
              alt={institution.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <Building2 className="h-7 w-7 text-rose-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="font-black text-foreground text-base truncate hover:text-primary transition-colors">
              <Link href={instituteUrl}>{institution.name}</Link>
            </h4>
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
            <span className="truncate">{institution.location || institution.city || "India"}</span>
          </p>

          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-black text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
            >
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span>{institution.rating ? `${institution.rating}.0` : "4.9.0"}</span>
              <span className="text-muted-foreground font-normal text-xs">({institution.reviews_count || 24} Reviews)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFeedbackOpen(true)}
          className="text-xs font-bold border-amber-300 bg-amber-50/80 hover:bg-amber-100 text-amber-900 rounded-xl h-10 gap-1.5 cursor-pointer shadow-2xs"
        >
          <MessageSquare className="h-4 w-4 text-amber-600" />
          <span>Reviews & Q&A</span>
        </Button>

        <Button
          size="sm"
          className="text-xs font-bold bg-[#d92d20] hover:bg-[#b42318] text-white rounded-xl h-10 gap-1 cursor-pointer shadow-2xs"
          asChild
        >
          <Link href={instituteUrl}>
            <span>View Profile</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Universal Feedback Dialog */}
      <UniversalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        target={{
          type: "institution",
          id: institution.id,
          title: institution.name,
          subtitle: `${institution.location || institution.city || "India"}`,
          avg_rating: institution.rating || 4.9,
          review_count: institution.reviews_count || 24,
        }}
      />
    </div>
  );
}
