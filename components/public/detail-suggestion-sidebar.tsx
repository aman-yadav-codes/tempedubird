"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Star,
  UserCheck,
  CheckSquare,
  BookMarked,
  PhoneCall,
  Download,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type DetailSuggestionType =
  | "courses"
  | "institutes"
  | "exams"
  | "practice"
  | "notes"
  | "teachers";

interface DetailSuggestionSidebarProps {
  type: DetailSuggestionType;
  currentId?: number | string;
  category?: string;
  className?: string;
}

export function DetailSuggestionSidebar({
  type,
  currentId,
  category,
  className = "",
}: DetailSuggestionSidebarProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const endpointMap: Record<DetailSuggestionType, string> = {
      courses: "/api/public/courses?limit=6",
      institutes: "/api/institutions?limit=6",
      exams: "/api/public/exams",
      practice: "/api/public/practice",
      notes: "/api/public/notes",
      teachers: "/api/public/teachers",
    };

    fetch(endpointMap[type])
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;
        let list: any[] = [];
        if (type === "courses") {
          list = data.courses || data.data || [];
        } else if (type === "institutes") {
          list = data.data || data.institutes || [];
        } else if (type === "exams") {
          list = data.exams || [];
        } else if (type === "practice") {
          list = data.practiceTests || [];
        } else if (type === "notes") {
          list = data.notes || [];
        } else if (type === "teachers") {
          list = data.teachers || [];
        }

        // Filter out the current item if ID is provided
        const filtered = list.filter(
          (item: any) => String(item.id) !== String(currentId)
        ).slice(0, 4);

        setItems(filtered);
      })
      .catch((err) => {
        console.error("Error loading sidebar suggestions:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [type, currentId]);

  const titles: Record<DetailSuggestionType, { title: string; subtitle: string; icon: any; viewAllHref: string }> = {
    courses: {
      title: "Suggested Courses",
      subtitle: "Top rated programs in demand",
      icon: BookOpen,
      viewAllHref: "/courses",
    },
    institutes: {
      title: "Recommended Institutes",
      subtitle: "Verified partner academies & colleges",
      icon: Building2,
      viewAllHref: "/institutes",
    },
    exams: {
      title: "Related Entrance Exams",
      subtitle: "Upcoming national & state tests",
      icon: GraduationCap,
      viewAllHref: "/exams",
    },
    practice: {
      title: "Popular Mock Tests",
      subtitle: "Sharpen your speed and accuracy",
      icon: CheckSquare,
      viewAllHref: "/practice",
    },
    notes: {
      title: "Recommended Study Notes",
      subtitle: "Handwritten toppers & faculty guides",
      icon: BookMarked,
      viewAllHref: "/notes",
    },
    teachers: {
      title: "Top Faculty & Mentors",
      subtitle: "Experienced subject matter experts",
      icon: UserCheck,
      viewAllHref: "/teachers",
    },
  };

  const currentConfig = titles[type];
  const Icon = currentConfig.icon;

  return (
    <aside className={`w-full space-y-6 ${className}`}>
      {/* 1. Main Suggestions Card */}
      <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/70 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-extrabold text-foreground leading-tight">
                  {currentConfig.title}
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">{currentConfig.subtitle}</p>
              </div>
            </div>
            <Link
              href={currentConfig.viewAllHref}
              className="text-[11px] font-bold text-primary hover:underline shrink-0"
            >
              View All
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4 space-y-3">
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No additional suggestions right now.
            </div>
          ) : (
            items.map((item: any) => {
              if (type === "courses") {
                const coursePrice = item.price || (item.fee_amount ? `₹${Number(item.fee_amount).toLocaleString("en-IN")}` : "Contact Fee");
                const instName = item.institute || item.institution_name || "EduBird Partner";
                const rating = item.rating ? Number(item.rating).toFixed(1) : "4.8";

                return (
                  <Link
                    key={item.id}
                    href={`/courses/${item.id}`}
                    className="group block p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-all hover:border-primary/40 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Badge variant="outline" className="text-[9px] uppercase font-bold text-primary bg-primary/5 py-0 px-1.5 mb-1">
                          {item.selectedCategory || item.category || "Course"}
                        </Badge>
                        <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                          {instName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-xs text-primary block">
                          {coursePrice}
                        </span>
                        <div className="flex items-center gap-0.5 justify-end text-[10px] text-amber-500 font-bold mt-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>{rating}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              }

              if (type === "institutes") {
                const instName = item.name;
                const locName = item.location_name || item.location || "India";
                const typeName = item.type_name || item.category || "Academy";
                const rating = item.avg_rating || item.rating ? Number(item.avg_rating || item.rating).toFixed(1) : "4.8";

                return (
                  <Link
                    key={item.id}
                    href={`/institutes/${item.id}`}
                    className="group block p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-all hover:border-primary/40 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 mb-1">
                          <Badge variant="outline" className="text-[9px] font-semibold py-0 px-1.5">
                            {typeName}
                          </Badge>
                          <span className="flex items-center text-[10px] text-emerald-600 font-bold gap-0.5">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {instName}
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                          {locName}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-500 font-bold text-xs shrink-0 pt-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{rating}</span>
                      </div>
                    </div>
                  </Link>
                );
              }

              if (type === "exams") {
                return (
                  <Link
                    key={item.id}
                    href={`/exams/${item.id}`}
                    className="group block p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-all hover:border-primary/40 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Badge variant="outline" className="text-[9px] font-bold text-primary bg-primary/5 py-0 px-1.5 mb-1">
                          {item.category || "Entrance Exam"}
                        </Badge>
                        <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {item.exam_name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {item.exam_date ? new Date(item.exam_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Coming Soon"}
                        </p>
                      </div>
                      <span className="font-extrabold text-[11px] text-emerald-600 dark:text-emerald-400 shrink-0">
                        {item.application_fee ? `₹${Number(item.application_fee).toLocaleString("en-IN")}` : "Free"}
                      </span>
                    </div>
                  </Link>
                );
              }

              if (type === "practice") {
                return (
                  <Link
                    key={item.id}
                    href={`/practice/${item.id}`}
                    className="group block p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-all hover:border-primary/40 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Badge variant="outline" className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 py-0 px-1.5 mb-1">
                          {item.difficulty_level || "Standard Level"}
                        </Badge>
                        <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          {item.duration_minutes || 60} Mins • {item.total_questions || 50} Questions
                        </p>
                      </div>
                      <Badge className="bg-primary text-primary-foreground text-[10px] shrink-0 font-bold">
                        Start Test
                      </Badge>
                    </div>
                  </Link>
                );
              }

              if (type === "notes") {
                return (
                  <Link
                    key={item.id}
                    href={`/notes/${item.id}`}
                    className="group block p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-all hover:border-primary/40 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Badge variant="outline" className="text-[9px] font-bold text-purple-600 bg-purple-500/10 py-0 px-1.5 mb-1">
                          {item.subject_name || "Study Notes"}
                        </Badge>
                        <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <BookMarked className="h-3 w-3 shrink-0" />
                          {item.total_pages || 15} Pages • {item.class_name || "All Grades"}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] text-primary shrink-0 font-bold">
                        <Download className="h-3 w-3 mr-0.5" /> PDF
                      </Badge>
                    </div>
                  </Link>
                );
              }

              if (type === "teachers") {
                return (
                  <Link
                    key={item.id}
                    href={`/teachers/${item.id}`}
                    className="group block p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-all hover:border-primary/40 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-[9px] font-bold uppercase text-primary">
                            {item.designation || "Faculty Member"}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {item.full_name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 shrink-0" />
                          {item.institution_name || "EduBird Academy"}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-500 font-bold text-xs shrink-0 pt-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{item.rating ? Number(item.rating).toFixed(1) : "4.9"}</span>
                      </div>
                    </div>
                  </Link>
                );
              }

              return null;
            })
          )}
        </CardContent>
      </Card>

      {/* 2. Instant Counseling Helpline Card */}
      <Card className="rounded-2xl border-primary/20 bg-gradient-to-br from-primary/10 via-background to-card p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-primary font-black text-sm">
          <PhoneCall className="h-4 w-4" />
          <span>Need Admission Guidance?</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Talk to certified education counselors for verified college cutoffs, syllabus, scholarship tests, and admission dates.
        </p>
        <Link href="/contact" className="block">
          <Button size="sm" className="w-full font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Request Free Callback
          </Button>
        </Link>
      </Card>
    </aside>
  );
}
