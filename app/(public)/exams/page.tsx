"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Search,
  GraduationCap,
  Sparkles,
  MessageSquare,
  Star,
  Send,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";
import { useCategoryAvailability } from "@/hooks/use-category-availability";
import { SharedPublicSidebar } from "@/components/public/shared-public-sidebar";
import { SharedInterstitialBanner } from "@/components/public/shared-interstitial-banner";
import { UniversalFeedbackDialog, type UniversalEntityTarget } from "@/components/public/universal-feedback-dialog";
import { CourseEnquiryDialog } from "@/components/public/course-enquiry-dialog";

type EntranceExam = {
  id: number;
  exam_name: string;
  category: string;
  exam_date: string;
  eligibility: string;
  application_fee: number;
  website_url: string;
  description: string;
  institution_name: string;
  rating?: number;
  reviews_count?: number;
};

export default function ExamsPublicPage() {
  const { isInstitutionalAdmin, activeInstitutionId } = useCategoryAvailability();
  const [exams, setExams] = useState<EntranceExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [feedbackTarget, setFeedbackTarget] = useState<UniversalEntityTarget | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [enquiryExam, setEnquiryExam] = useState<EntranceExam | null>(null);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  useEffect(() => {
    fetchExams();
  }, [activeInstitutionId, isInstitutionalAdmin]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const url =
        isInstitutionalAdmin && activeInstitutionId
          ? `/api/public/exams?institutionId=${activeInstitutionId}`
          : "/api/public/exams";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setExams(json.exams || []);
      }
    } catch (err) {
      console.error("Error loading exams:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = exams.filter((e) => {
    const matchesQuery =
      e.exam_name.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || e.category.toLowerCase().includes(activeCategory.toLowerCase());
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background pb-16 pt-6">
      <div className="container mx-auto px-4 space-y-6">
        <SeoBreadcrumbs items={[{ label: "Entrance & Competitive Exams" }]} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-1">National Assessments</Badge>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Entrance Examinations & Admission Tests</h1>
            <p className="text-sm text-muted-foreground mt-1">Check exam dates, eligibility criteria, fee details, and official notification portals.</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exam name or category..."
              className="pl-9 text-xs h-10 rounded-xl"
            />
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] items-start">
          {/* Main Listings Column */}
          <div className="space-y-6 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-sm text-muted-foreground rounded-2xl border border-border bg-card/70 shadow-2xs">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading entrance exams...
              </div>
            ) : filtered.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground rounded-2xl shadow-2xs">
                No entrance exams found matching your query.
              </Card>
            ) : (
              <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((e, idx) => {
                  const shouldInsertBanner = (idx + 1) % 3 === 0 && idx !== filtered.length - 1;
                  const bannerIdx = Math.floor(idx / 3);

                  return (
                    <React.Fragment key={e.id}>
                      <Card className="p-5 shadow-2xs hover:border-primary/50 transition-all flex flex-col justify-between space-y-4 rounded-2xl border border-border/80 bg-card/95 hover:-translate-y-1">
                        <div className="space-y-3">
                          {/* Top Row: Category & Exam Date Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[11px] font-extrabold text-primary flex items-center gap-1 mb-1 truncate">
                                <Award className="size-3.5 shrink-0" />
                                <span className="truncate">{e.category || "National Entrance"}</span>
                              </span>
                              <h3 className="text-base font-black uppercase text-foreground leading-tight line-clamp-2">
                                <Link href={`/exams/${e.id}`} className="hover:text-primary hover:underline transition-colors">
                                  {e.exam_name}
                                </Link>
                              </h3>
                            </div>

                            <Badge className="bg-emerald-600/90 text-white font-bold text-[10px] gap-1 shrink-0 px-2 py-0.5 rounded-lg">
                              <Calendar className="size-3" /> {e.exam_date || "2026"}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {e.description || "Official competitive examination with national level ranking and seat allotment."}
                          </p>

                          <div className="p-3 rounded-xl bg-muted/40 text-xs space-y-1.5 border border-border/50">
                            <div className="truncate">
                              <strong className="text-foreground">Eligibility: </strong>
                              <span className="text-muted-foreground">{e.eligibility || "Standard Academic Criteria"}</span>
                            </div>
                            <div>
                              <strong className="text-foreground">Application Fee: </strong>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                ₹{Number(e.application_fee || 1000).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-2 border-t border-border/60">
                          {/* Rating & Reviews */}
                          <div className="flex items-center justify-between text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setFeedbackTarget({
                                  type: "exam",
                                  id: e.id,
                                  title: e.exam_name,
                                  subtitle: `${e.category} • Official Entrance Exam`,
                                  avg_rating: e.rating || 4.8,
                                  review_count: e.reviews_count || 12,
                                });
                                setFeedbackOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-600 font-bold hover:underline cursor-pointer"
                            >
                              <Star className="size-3.5 fill-amber-400 text-amber-400" />
                              <span>{e.rating ? Number(e.rating).toFixed(1) : "4.8"}</span>
                              <span className="text-muted-foreground font-normal">({e.reviews_count || 12} reviews)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setFeedbackTarget({
                                  type: "exam",
                                  id: e.id,
                                  title: e.exam_name,
                                  subtitle: `${e.category} • Official Entrance Exam`,
                                  avg_rating: e.rating || 4.8,
                                  review_count: e.reviews_count || 12,
                                });
                                setFeedbackOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary font-medium cursor-pointer"
                            >
                              <MessageSquare className="size-3" />
                              <span>Feedback</span>
                            </button>
                          </div>

                          {/* Actions */}
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                            <button
                              type="button"
                              onClick={() => {
                                setFeedbackTarget({
                                  type: "exam",
                                  id: e.id,
                                  title: e.exam_name,
                                  subtitle: `${e.category} • Official Entrance Exam`,
                                  avg_rating: e.rating || 4.8,
                                  review_count: e.reviews_count || 12,
                                });
                                setFeedbackOpen(true);
                              }}
                              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-amber-300 bg-amber-50/70 text-xs font-bold text-amber-800 transition hover:bg-amber-100 cursor-pointer"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                              <span>Reviews & Q&A</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEnquiryExam(e);
                                setEnquiryOpen(true);
                              }}
                              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-xs font-bold text-primary-foreground transition hover:bg-primary/90 cursor-pointer shadow-xs"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>Enquiry</span>
                            </button>
                          </div>
                        </div>
                      </Card>

                      {/* 200px Banner after every 3 items */}
                      {shouldInsertBanner && (
                        <SharedInterstitialBanner
                          bannerIndex={bannerIdx}
                          pageType="exams"
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar Options & Ads */}
          <SharedPublicSidebar
            pageType="exams"
            activeCategory={activeCategory}
            onSelectCategory={(cat) => setActiveCategory(activeCategory === cat ? "all" : cat)}
          />
        </div>
      </div>

      <UniversalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        target={feedbackTarget}
      />

      {/* Exam Enquiry Dialog */}
      <CourseEnquiryDialog
        open={enquiryOpen}
        onOpenChange={setEnquiryOpen}
        course={enquiryExam ? {
          id: enquiryExam.id,
          title: enquiryExam.exam_name,
          institute: enquiryExam.institution_name || enquiryExam.category || "Competitive Exam",
          price: `₹${Number(enquiryExam.application_fee || 1000).toLocaleString("en-IN")}`,
        } : null}
      />
    </div>
  );
}
