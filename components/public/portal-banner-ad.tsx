"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Building2,
  ExternalLink,
  Award,
  Flame,
  Globe,
  GraduationCap,
  Users,
  FileText,
  ShoppingBag,
  PenTool,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface PortalBannerAdProps {
  section:
    | "course"
    | "institute"
    | "teacher"
    | "notes"
    | "product"
    | "exam"
    | "practice"
    | "blog"
    | "general";
  placement: "top" | "middle" | "right_sidebar";
  fallbackTitle?: string;
  fallbackDescription?: string;
  fallbackCta?: string;
  fallbackUrl?: string;
  fallbackBadge?: string;
  className?: string;
  onEnquire?: () => void;
}

export interface ActiveAdRecord {
  id: number;
  title: string;
  institution_name?: string | null;
  ads_type: string;
  target_section?: string;
  image_url: string;
  headline?: string | null;
  description?: string | null;
  cta_text: string;
  target_url: string;
  open_in_new_tab: boolean;
}

export function PortalBannerAd({
  section,
  placement,
  fallbackTitle,
  fallbackDescription,
  fallbackCta = "Learn More",
  fallbackUrl,
  fallbackBadge,
  className = "",
  onEnquire,
}: PortalBannerAdProps) {
  const [ad, setAd] = useState<ActiveAdRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchAd() {
      try {
        const res = await fetch(
          `/api/public/ads?section=${encodeURIComponent(section)}&placement=${encodeURIComponent(placement)}`
        );
        const data = await res.json();
        if (isMounted) {
          if (data.primaryAd) {
            setAd(data.primaryAd);
          } else if (data.ads && data.ads.length > 0) {
            setAd(data.ads[0]);
          } else {
            setAd(null);
          }
        }
      } catch (err) {
        if (isMounted) setAd(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchAd();
    return () => {
      isMounted = false;
    };
  }, [section, placement]);

  const handleAdClick = (adId: number) => {
    try {
      fetch("/api/public/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: adId, event: "click" }),
      }).catch(() => {});
    } catch {}
  };

  // Section icons
  const SECTION_ICONS: Record<string, any> = {
    course: GraduationCap,
    institute: Building2,
    teacher: Users,
    notes: FileText,
    product: ShoppingBag,
    exam: Award,
    practice: PenTool,
    blog: BookOpen,
    general: Globe,
  };
  const SectionIcon = SECTION_ICONS[section] || Sparkles;

  // ==========================================
  // 1. ACTIVE CAMPAIGN BANNER FROM DB
  // ==========================================
  if (ad) {
    const isNewTab = ad.open_in_new_tab !== false;
    const targetUrl = ad.target_url || "#";

    // 1A. MIDDLE SECTION BANNER
    if (placement === "middle") {
      return (
        <div
          className={`col-span-full w-full min-h-[195px] sm:min-h-[205px] rounded-2xl border border-primary/30 relative overflow-hidden shadow-sm my-3 group transition-all hover:border-primary ${className}`}
        >
          {/* Background Image with Gradient Overlay */}
          <img
            src={ad.image_url}
            alt={ad.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/40" />

          {/* Banner Content */}
          <div className="relative z-10 p-5 sm:p-6 text-white flex flex-col justify-between h-full space-y-3">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="text-[10px] font-black uppercase tracking-wider bg-primary text-primary-foreground border-transparent px-2.5 py-0.5 shadow-xs">
                  <Sparkles className="size-3 mr-1 inline" />
                  SPONSORED
                </Badge>
                {ad.institution_name ? (
                  <Badge variant="outline" className="text-[10px] font-bold text-amber-300 border-amber-400/40 bg-amber-400/10">
                    <Building2 className="size-3 mr-1 inline" />
                    {ad.institution_name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] font-bold text-slate-300 border-white/20 bg-white/5">
                    <SectionIcon className="size-3 mr-1 inline" />
                    {section.toUpperCase()} OPPORTUNITY
                  </Badge>
                )}
              </div>

              <h4 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug">
                {ad.headline || ad.title}
              </h4>
              {ad.description && (
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed line-clamp-2">
                  {ad.description}
                </p>
              )}
            </div>

            <div className="pt-1 flex items-center gap-3">
              <a
                href={targetUrl}
                target={isNewTab ? "_blank" : "_self"}
                rel="noreferrer"
                onClick={() => handleAdClick(ad.id)}
              >
                <Button
                  size="sm"
                  className="font-black text-xs rounded-xl shadow-md cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 px-4 h-9"
                >
                  <span>{ad.cta_text || "Apply Now"}</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </a>
              <span className="text-[11px] text-slate-300 hidden sm:inline font-semibold">
                Verified Admission Partner • EduBird
              </span>
            </div>
          </div>
        </div>
      );
    }

    // 1B. RIGHT SIDEBAR BANNER
    if (placement === "right_sidebar") {
      return (
        <div
          className={`w-full rounded-2xl border border-primary/30 bg-card overflow-hidden shadow-sm relative group hover:border-primary transition-all ${className}`}
        >
          {/* Creative Top Preview */}
          <div className="relative h-36 w-full bg-muted overflow-hidden">
            <img
              src={ad.image_url}
              alt={ad.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
              <Badge className="text-[9px] font-black uppercase bg-primary text-primary-foreground">
                SPONSORED
              </Badge>
              {ad.institution_name && (
                <Badge variant="secondary" className="text-[9px] font-bold bg-background/90 text-foreground truncate max-w-[150px]">
                  {ad.institution_name}
                </Badge>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-2.5">
            <h4 className="font-black text-sm text-foreground leading-snug line-clamp-2">
              {ad.headline || ad.title}
            </h4>
            {ad.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {ad.description}
              </p>
            )}

            <a
              href={targetUrl}
              target={isNewTab ? "_blank" : "_self"}
              rel="noreferrer"
              onClick={() => handleAdClick(ad.id)}
              className="block pt-1"
            >
              <Button
                size="sm"
                className="w-full font-bold text-xs rounded-xl shadow-xs cursor-pointer gap-1.5 h-8"
              >
                <span>{ad.cta_text || "Explore Now"}</span>
                <ArrowRight className="size-3" />
              </Button>
            </a>
          </div>
        </div>
      );
    }

    // 1C. TOP BANNER (HERO / HEADER)
    return (
      <div
        className={`w-full rounded-2xl border border-primary/30 relative overflow-hidden shadow-sm my-4 group hover:border-primary transition-all ${className}`}
      >
        <div className="relative h-44 sm:h-52 w-full overflow-hidden">
          <img
            src={ad.image_url}
            alt={ad.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-transparent" />

          <div className="absolute inset-0 p-5 sm:p-7 text-white flex flex-col justify-center max-w-xl space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="text-[10px] font-black uppercase bg-primary text-primary-foreground">
                FEATURED {section.toUpperCase()}
              </Badge>
              {ad.institution_name && (
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {ad.institution_name}
                </span>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {ad.headline || ad.title}
            </h3>
            {ad.description && <p className="text-xs sm:text-sm text-slate-200 line-clamp-2">{ad.description}</p>}

            <div className="pt-2">
              <a
                href={targetUrl}
                target={isNewTab ? "_blank" : "_self"}
                rel="noreferrer"
                onClick={() => handleAdClick(ad.id)}
              >
                <Button size="sm" className="font-bold text-xs rounded-xl shadow-md bg-primary text-primary-foreground gap-1.5 h-9 px-4">
                  <span>{ad.cta_text || "Apply Now"}</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. FALLBACK BANNER (IF NO CUSTOM AD ACTIVE)
  // ==========================================
  if (placement === "middle") {
    return (
      <div
        className={`col-span-full min-h-[195px] sm:min-h-[200px] w-full rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border border-indigo-500/30 p-5 sm:p-6 text-white flex flex-col justify-between relative overflow-hidden shadow-sm my-2.5 transition-all hover:border-primary/50 ${className}`}
      >
        <div className="absolute -right-12 -top-12 size-48 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="space-y-1.5 max-w-2xl z-10">
          <div className="flex items-center gap-2">
            <Badge className="text-[10px] font-black uppercase tracking-wider text-indigo-400 border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 border">
              <Award className="size-3 mr-1 inline" />
              {fallbackBadge || "NATIONAL SCHOLARSHIP 2026"}
            </Badge>
            <span className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">
              Featured {section} opportunity
            </span>
          </div>
          <h4 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
            {fallbackTitle || "Up to 100% Tuition Fee Concession & Merit Grants"}
          </h4>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-2">
            {fallbackDescription ||
              "Apply for verified national scholarship tests, institutional fee waivers & merit concessions across affiliated institutions."}
          </p>
        </div>

        <div className="pt-2 z-10 flex items-center gap-3">
          {fallbackUrl ? (
            <Link href={fallbackUrl}>
              <Button size="sm" className="font-bold text-xs rounded-xl shadow-xs cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white">
                {fallbackCta || "Check Scholarship Eligibility"} <ArrowRight className="size-3.5 ml-1.5" />
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              onClick={onEnquire}
              className="font-bold text-xs rounded-xl shadow-xs cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {fallbackCta || "Check Scholarship Eligibility"} <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          )}
          <span className="text-[11px] text-slate-400 hidden sm:inline">100% Free • Verified by EduBird</span>
        </div>
      </div>
    );
  }

  if (placement === "right_sidebar") {
    return (
      <div
        className={`w-full rounded-2xl border border-border bg-card p-4 shadow-xs space-y-3 ${className}`}
      >
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
            {fallbackBadge || "SPECIAL OFFER"}
          </Badge>
          <span className="text-[9px] font-bold text-muted-foreground uppercase">Sponsored</span>
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-extrabold text-foreground">
            {fallbackTitle || "Free Entrance Mock Test Pass"}
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {fallbackDescription || "Get full access to 1,500+ speed quizzes & past year solved papers."}
          </p>
        </div>
        {fallbackUrl ? (
          <Link href={fallbackUrl}>
            <Button size="sm" variant="outline" className="w-full font-bold text-xs rounded-xl">
              {fallbackCta || "Explore Now"} →
            </Button>
          </Link>
        ) : (
          <Button size="sm" variant="outline" onClick={onEnquire} className="w-full font-bold text-xs rounded-xl">
            {fallbackCta || "Explore Now"} →
          </Button>
        )}
      </div>
    );
  }

  return null;
}
