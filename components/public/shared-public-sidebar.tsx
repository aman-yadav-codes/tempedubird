"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  ChevronRight,
  Flame,
  GraduationCap,
  Headphones,
  Layers,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseEnquiryDialog } from "@/components/public/course-enquiry-dialog";

export interface SharedPublicSidebarProps {
  pageType: "institutes" | "exams" | "practice" | "notes" | "teachers" | "courses" | "vendors";
  quickCategories?: string[];
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
  onOpenInquiry?: () => void;
}

export function SharedPublicSidebar({
  pageType,
  quickCategories = [],
  activeCategory,
  onSelectCategory,
  onOpenInquiry,
}: SharedPublicSidebarProps) {
  const [internalInquiryOpen, setInternalInquiryOpen] = useState(false);

  const handleInquiry = () => {
    if (onOpenInquiry) {
      onOpenInquiry();
    } else {
      setInternalInquiryOpen(true);
    }
  };

  const getAdvisoryConfig = () => {
    switch (pageType) {
      case "vendors":
        return {
          title: "Campus Vendor Helpdesk",
          subtitle: "Verified Student Services",
          description: "Connect directly with verified hostel, mess, laundry, and repair service vendors near your campus.",
          btnText: "Vendor Inquiry",
        };
      case "institutes":
        return {
          title: "Campus Admission Helpline",
          subtitle: "Direct Institute Verification",
          description: "Connect with verified counselors to verify seat availability, scholarship criteria, and campus facilities.",
          btnText: "Request Admission Guidance",
        };
      case "exams":
        return {
          title: "Exam Advisory & Alerts",
          subtitle: "Targeted Prep Counseling",
          description: "Get real-time notification alerts for admit cards, eligibility guidelines, and cutoff trends.",
          btnText: "Get Free Exam Counseling",
        };
      case "practice":
        return {
          title: "Speed Test Mentorship",
          subtitle: "Percentile & Score Strategy",
          description: "Struggling with negative marking or time management? Talk to test series mentors.",
          btnText: "Consult Mock Test Mentor",
        };
      case "notes":
        return {
          title: "Curriculum Material Desk",
          subtitle: "Faculty Verified Handouts",
          description: "Looking for specific chapter formula sheets or past 10-year solved question papers?",
          btnText: "Request Study Material",
        };
      case "teachers":
        return {
          title: "1-on-1 Faculty Guidance",
          subtitle: "Private Mentorship & Doubt Sessions",
          description: "Connect with certified faculty members for personalized batch tutoring and doubt clearing.",
          btnText: "Connect with Faculty",
        };
      default:
        return {
          title: "Free Course Advisory",
          subtitle: "Expert 1-on-1 Guidance",
          description: "Connect directly with certified counselors for eligibility verification, fee discount options, and batch timings.",
          btnText: "Request Free Call Back",
        };
    }
  };

  const advisory = getAdvisoryConfig();

  const defaultCategoriesMap: Record<string, string[]> = {
    institutes: ["Engineering", "Medical", "K-12 School", "Coaching", "Management", "Science", "Law", "Commerce"],
    exams: ["JEE Main & Advanced", "NEET UG", "GATE", "CAT", "UPSC", "State Board", "CLAT", "CUET"],
    practice: ["Physics", "Chemistry", "Mathematics", "Biology", "General Aptitude", "Computer Science", "Logical Reasoning"],
    notes: ["Class 12 Physics", "Class 12 Chemistry", "Class 10 Math", "Engineering Mechanics", "Organic Chemistry", "Biology Diagrams"],
    teachers: ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "English Literature"],
  };

  const categories = quickCategories.length > 0 ? quickCategories : (defaultCategoriesMap[pageType] || []);

  return (
    <aside className="hidden lg:block w-[300px] xl:w-[320px] space-y-6 sticky top-28 shrink-0 self-start">
      {/* Widget 1: Contextual Advisory & Helpline */}
      <Card className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-card p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
            <Headphones className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-foreground">{advisory.title}</h4>
            <p className="text-[11px] text-muted-foreground">{advisory.subtitle}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {advisory.description}
        </p>

        <Button
          onClick={handleInquiry}
          className="w-full text-xs font-bold rounded-xl shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer gap-1.5"
        >
          <Sparkles className="size-3.5" />
          <span>{advisory.btnText}</span>
        </Button>
      </Card>

      {/* Widget 2: Sponsored Advertisement Banner */}
      <Card className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-amber-500/5 p-5 shadow-sm space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <Badge className="text-[10px] font-extrabold uppercase bg-amber-500 text-white border-none">
            Special Offer
          </Badge>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Sponsored</span>
        </div>

        <div className="space-y-1">
          <h4 className="text-sm font-black text-foreground leading-tight">
            100% Scholarship Test 2026
          </h4>
          <p className="text-xs text-muted-foreground">
            Take the national assessment test & win up to full fee waivers on accredited programs.
          </p>
        </div>

        <div className="pt-1">
          <Button
            onClick={handleInquiry}
            variant="outline"
            size="sm"
            className="w-full text-xs font-bold rounded-xl border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
          >
            Register Free <ArrowRight className="size-3 ml-1" />
          </Button>
        </div>
      </Card>

      {/* Widget 3: Quick Filter / Topic Pills */}
      {categories.length > 0 && (
        <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
              {pageType === "teachers" || pageType === "practice" || pageType === "notes" ? "Popular Subjects" : "Top Streams"}
            </h4>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.slice(0, 8).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory && onSelectCategory(cat)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted hover:bg-muted/80 text-foreground border border-border/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Widget 4: Quick Academic Portals */}
      <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Academic Portals</h4>
        <ul className="space-y-2 text-xs">
          {pageType !== "courses" && (
            <li>
              <Link href="/courses" className="flex items-center justify-between text-muted-foreground hover:text-primary font-semibold group">
                <span className="flex items-center gap-2">
                  <BookOpen className="size-3.5 text-primary" />
                  Explore Verified Courses
                </span>
                <ChevronRight className="size-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </li>
          )}
          {pageType !== "institutes" && (
            <li>
              <Link href="/institutes" className="flex items-center justify-between text-muted-foreground hover:text-primary font-semibold group">
                <span className="flex items-center gap-2">
                  <GraduationCap className="size-3.5 text-primary" />
                  Institutes Directory
                </span>
                <ChevronRight className="size-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </li>
          )}
          {pageType !== "exams" && (
            <li>
              <Link href="/exams" className="flex items-center justify-between text-muted-foreground hover:text-primary font-semibold group">
                <span className="flex items-center gap-2">
                  <Calendar className="size-3.5 text-primary" />
                  Entrance & Competitive Exams
                </span>
                <ChevronRight className="size-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </li>
          )}
          {pageType !== "practice" && (
            <li>
              <Link href="/practice" className="flex items-center justify-between text-muted-foreground hover:text-primary font-semibold group">
                <span className="flex items-center gap-2">
                  <Flame className="size-3.5 text-primary" />
                  Mock Tests & Speed Quizzes
                </span>
                <ChevronRight className="size-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </li>
          )}
          {pageType !== "notes" && (
            <li>
              <Link href="/notes" className="flex items-center justify-between text-muted-foreground hover:text-primary font-semibold group">
                <span className="flex items-center gap-2">
                  <Award className="size-3.5 text-primary" />
                  Lecture Notes & Handouts
                </span>
                <ChevronRight className="size-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </li>
          )}
          {pageType !== "teachers" && (
            <li>
              <Link href="/teachers" className="flex items-center justify-between text-muted-foreground hover:text-primary font-semibold group">
                <span className="flex items-center gap-2">
                  <UserCheck className="size-3.5 text-primary" />
                  Verified Faculty Members
                </span>
                <ChevronRight className="size-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </li>
          )}
        </ul>
      </Card>

      <CourseEnquiryDialog
        open={internalInquiryOpen}
        onOpenChange={setInternalInquiryOpen}
        course={{
          id: 1,
          title: advisory.title,
          institute: "EduBird Central Advisory",
          price: "Free",
          duration: "Academic Guidance",
        }}
      />
    </aside>
  );
}
