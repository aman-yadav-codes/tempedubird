"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckSquare,
  Clock,
  HelpCircle,
  Flame,
  Award,
  Loader2,
  Search,
  Play,
  Star,
  MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";
import { useCategoryAvailability } from "@/hooks/use-category-availability";
import { UniversalFeedbackDialog, type UniversalEntityTarget } from "@/components/public/universal-feedback-dialog";
import { SharedPublicSidebar } from "@/components/public/shared-public-sidebar";
import { SharedInterstitialBanner } from "@/components/public/shared-interstitial-banner";

type PracticeTest = {
  id: number;
  title: string;
  category: string;
  subject: string;
  questions_count: number;
  time_limit_mins: number;
  difficulty: string;
  attempts_count: number;
  created_by_name: string;
  description: string;
  institution_name: string;
  price?: string;
  is_free?: boolean;
};

export default function PracticePublicPage() {
  const { isInstitutionalAdmin, activeInstitutionId } = useCategoryAvailability();
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get("search") || searchParams?.get("q") || "";
  const [tests, setTests] = useState<PracticeTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [activeSubject, setActiveSubject] = useState<string>("all");
  const [feedbackTarget, setFeedbackTarget] = useState<UniversalEntityTarget | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Sync URL search query
  useEffect(() => {
    const q = searchParams?.get("search") || searchParams?.get("q");
    if (q !== null && q !== undefined && q !== search) {
      setSearch(q);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchTests();
  }, [activeInstitutionId, isInstitutionalAdmin]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const url =
        isInstitutionalAdmin && activeInstitutionId
          ? `/api/public/practice?institutionId=${activeInstitutionId}`
          : "/api/public/practice";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setTests(json.practiceTests || []);
      }
    } catch (err) {
      console.error("Error loading practice tests:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = tests.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = activeSubject === "all" || t.subject.toLowerCase().includes(activeSubject.toLowerCase());
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="min-h-screen bg-background pb-16 pt-6">
      <div className="container mx-auto px-4 space-y-6">
        <SeoBreadcrumbs items={[{ label: "Practice & Mock Test Series" }]} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-1">Exam Preparation</Badge>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Practice Tests & Mock Quiz Series</h1>
            <p className="text-sm text-muted-foreground mt-1">Take full-length mock exams, topic-wise practice sets, and timed speed quizzes.</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject or test..."
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
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading practice tests...
              </div>
            ) : filtered.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground rounded-2xl shadow-2xs">
                No practice tests found matching your query.
              </Card>
            ) : (
              <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((t, idx) => {
                  const shouldInsertBanner = (idx + 1) % 3 === 0 && idx !== filtered.length - 1;
                  const bannerIdx = Math.floor(idx / 3);

                  return (
                    <React.Fragment key={t.id}>
                      <Card className="p-5 shadow-2xs hover:border-primary/50 transition-all flex flex-col justify-between space-y-4 rounded-2xl border border-border/80 bg-card/95 hover:-translate-y-1">
                        <div className="space-y-3">
                          {/* Top Row: Category & Difficulty Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[11px] font-extrabold text-primary flex items-center gap-1 mb-1 truncate">
                                <CheckSquare className="size-3.5 shrink-0" />
                                <span className="truncate">{t.category || "Exam Series"}</span>
                              </span>
                              <h3 className="text-base font-black uppercase text-foreground leading-tight line-clamp-2">
                                <Link href={`/practice/${t.id}`} className="hover:text-primary hover:underline transition-colors">
                                  {t.title}
                                </Link>
                              </h3>
                              <p className="text-xs text-muted-foreground font-semibold mt-1 truncate">
                                Subject: {t.subject}
                              </p>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <Badge className={`text-[10px] font-bold ${t.difficulty === "Hard" ? "bg-red-500" : "bg-amber-500"}`}>
                                {t.difficulty}
                              </Badge>
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-extrabold">
                                {t.price || "Free"}
                              </Badge>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {t.description || "Timed speed test with automated scoring and topic-wise benchmark report."}
                          </p>

                          <div className="flex flex-wrap items-center gap-2.5 text-xs pt-1 border-t border-border/40 text-muted-foreground">
                            <span className="flex items-center gap-1 font-semibold text-foreground">
                              <HelpCircle className="size-3.5 text-primary" /> {t.questions_count} Qs
                            </span>
                            <span className="h-3 w-px bg-border" />
                            <span className="flex items-center gap-1 font-semibold text-foreground">
                              <Clock className="size-3.5 text-primary" /> {t.time_limit_mins} Mins
                            </span>
                            <span className="h-3 w-px bg-border" />
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                              <Flame className="size-3.5" /> {t.attempts_count || 12}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3 pt-2 border-t border-border/60">
                          {/* Rating & Reviews */}
                          <div className="flex items-center justify-between text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setFeedbackTarget({
                                  type: "practice",
                                  id: t.id,
                                  title: t.title,
                                  subtitle: `${t.subject} • ${t.category} • ${t.time_limit_mins} mins`,
                                  avg_rating: 4.8,
                                  review_count: t.attempts_count ? Math.min(t.attempts_count, 14) : 8,
                                });
                                setFeedbackOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-600 font-bold hover:underline cursor-pointer"
                            >
                              <Star className="size-3.5 fill-amber-400 text-amber-400" />
                              <span>4.8</span>
                              <span className="text-muted-foreground font-normal">({t.attempts_count ? Math.min(t.attempts_count, 14) : 8} reviews)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setFeedbackTarget({
                                  type: "practice",
                                  id: t.id,
                                  title: t.title,
                                  subtitle: `${t.subject} • ${t.category} • ${t.time_limit_mins} mins`,
                                  avg_rating: 4.8,
                                  review_count: t.attempts_count ? Math.min(t.attempts_count, 14) : 8,
                                });
                                setFeedbackOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary font-medium cursor-pointer"
                            >
                              <MessageSquare className="size-3" />
                              <span>Feedback</span>
                            </button>
                          </div>

                          {/* CTA Button */}
                          <Button
                            size="sm"
                            className="w-full font-bold text-xs gap-1.5 rounded-xl shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                          >
                            <Play className="size-3.5 fill-current" /> Start Mock Test
                          </Button>
                        </div>
                      </Card>

                      {/* 200px Banner after every 3 items */}
                      {shouldInsertBanner && (
                        <SharedInterstitialBanner
                          bannerIndex={bannerIdx}
                          pageType="practice"
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
            pageType="practice"
            activeCategory={activeSubject}
            onSelectCategory={(cat) => setActiveSubject(activeSubject === cat ? "all" : cat)}
          />
        </div>
      </div>

      {/* Universal Feedback Dialog */}
      <UniversalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        target={feedbackTarget}
      />
    </div>
  );
}
