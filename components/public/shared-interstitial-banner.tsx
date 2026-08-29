"use client";

import React from "react";
import { Award, Flame, Sparkles } from "lucide-react";
import { PortalBannerAd } from "@/components/public/portal-banner-ad";

export interface SharedInterstitialBannerProps {
  bannerIndex: number;
  pageType?: "courses" | "institutes" | "exams" | "practice" | "notes" | "teachers" | "products" | "blogs";
  onEnquire?: () => void;
}

export function SharedInterstitialBanner({
  bannerIndex,
  pageType = "courses",
  onEnquire,
}: SharedInterstitialBannerProps) {
  // Map pageType to target_section key
  const sectionMap: Record<string, "course" | "institute" | "exam" | "practice" | "notes" | "teacher" | "product" | "blog"> = {
    courses: "course",
    institutes: "institute",
    exams: "exam",
    practice: "practice",
    notes: "notes",
    teachers: "teacher",
    products: "product",
    blogs: "blog",
  };
  const section = sectionMap[pageType] || "course";

  const fallbacks = [
    {
      badge: "NATIONAL MERIT SCHOLARSHIP 2026",
      title: "Up to 100% Tuition Fee Concession & Grants",
      description: "Apply for national merit tests, state academic grants & institution-level tuition fee concessions across verified partner colleges.",
      cta: "Check Scholarship Eligibility",
    },
    {
      badge: "ONLINE MOCK EXAM PORTAL",
      title: "Practice 1,500+ Test Series & Speed Quizzes",
      description: "Prepare with timed chapter quizzes, entrance test simulations, and real-time AI performance analysis.",
      cta: "Start Free Mock Test",
      url: "/practice",
    },
    {
      badge: "EXPERT ADMISSION COUNSELING",
      title: "Need Guidance on Choosing the Right Institute or Exam?",
      description: "Connect 1-on-1 with certified academic mentors to review syllabus requirements, batch timings, and fee waivers.",
      cta: "Request Free Counseling",
    },
  ];

  const current = fallbacks[bannerIndex % fallbacks.length];

  return (
    <PortalBannerAd
      section={section}
      placement="middle"
      onEnquire={onEnquire}
      fallbackBadge={current.badge}
      fallbackTitle={current.title}
      fallbackDescription={current.description}
      fallbackCta={current.cta}
      fallbackUrl={current.url}
    />
  );
}
