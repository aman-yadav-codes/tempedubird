"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  GraduationCap,
  Sparkles,
  Star,
  MessageSquare,
  CheckSquare,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Play,
  FileQuestion,
  Loader2,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";
import { DetailSuggestionSidebar } from "@/components/public/detail-suggestion-sidebar";
import { UniversalFeedbackDialog, type UniversalEntityTarget } from "@/components/public/universal-feedback-dialog";
import { PracticeTestRunnerModal } from "@/components/public/practice-test-runner-modal";

type PracticeTestDetail = {
  id: number;
  title: string;
  category: string;
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  passing_marks: number;
  negative_marking: boolean;
  negative_marks_per_question: number;
  difficulty_level: string;
  instructions?: string;
  institution_name?: string;
  rating?: number;
  reviews_count?: number;
};

type LeaderboardRow = {
  rank: number;
  id: number;
  student_name: string;
  obtained_marks: number;
  total_marks: number;
  percentage: number;
  time_taken_seconds: number;
  correct_answers: number;
  total_questions: number;
  created_at: string;
};

export default function PracticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id as string;
  const testIdNum = Number(String(rawId).split("-")[0]);

  const [test, setTest] = useState<PracticeTestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [pageLeaderboard, setPageLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  useEffect(() => {
    fetchPracticeDetail();
    fetchLeaderboard();
  }, [rawId]);

  const fetchPracticeDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/public/practice");
      if (res.ok) {
        const json = await res.json();
        const found = (json.practiceTests || []).find(
          (t: PracticeTestDetail) => String(t.id) === String(testIdNum) || String(t.id) === String(rawId)
        );
        if (found) {
          setTest(found);
        } else {
          // Fallback
          setTest({
            id: testIdNum || 1,
            title: "Full Length Mock Assessment Series",
            category: "Competitive Mock Series",
            duration_minutes: 90,
            total_questions: 60,
            total_marks: 240,
            passing_marks: 100,
            negative_marking: true,
            negative_marks_per_question: 1,
            difficulty_level: "Moderate to Advanced",
            instructions: "1. The test contains 60 multiple-choice questions.\n2. Each correct answer carries +4 marks.\n3. Each wrong answer has -1 negative marking.\n4. You can flag questions for review and return at any time before final submission.",
            institution_name: "EduBird Assessment Cell",
            rating: 4.9,
            reviews_count: 54,
          });
        }
      }
    } catch (err) {
      console.error("Error loading practice test:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch(`/api/public/practice/${testIdNum || 1}/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setPageLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error("Error loading page leaderboard:", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!test) return null;

  return (
    <div className="min-h-screen bg-background pb-16 pt-6">
      <div className="container mx-auto px-4 space-y-6">
        <SeoBreadcrumbs
          items={[
            { label: "Practice & Mock Tests", href: "/practice" },
            { label: test.title },
          ]}
        />

        {/* Hero Banner */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-xs">
                  {test.category || "Practice Test"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {test.difficulty_level || "Standard Difficulty"}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Instant Score & Analytics
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight leading-tight">
                {test.title}
              </h1>

              <p className="text-sm text-muted-foreground">
                Prepared by: <strong className="text-foreground">{test.institution_name || "EduBird Academic Faculty"}</strong>
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm pt-2 text-muted-foreground">
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>{test.rating ? Number(test.rating).toFixed(1) : "4.8"}</span>
                  <span className="text-muted-foreground font-normal">({test.reviews_count || 48} reviews)</span>
                </div>
                <span className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{test.duration_minutes || 60} Minutes</span>
                </div>
                <span className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <FileQuestion className="h-4 w-4 text-primary" />
                  <span>{test.total_questions || 50} Questions</span>
                </div>
                <span className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <Award className="h-4 w-4" />
                  <span>Total Marks: {test.total_marks || 200}</span>
                </div>
              </div>
            </div>

            {/* CTA Box */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 w-full md:w-56">
              <Button
                onClick={() => setRunnerOpen(true)}
                className="w-full font-bold shadow-md gap-2 h-11 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" /> Start Practice Test Now
              </Button>
              <Button
                variant="outline"
                onClick={() => setFeedbackOpen(true)}
                className="w-full text-xs font-bold gap-1.5 h-10 cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5 text-amber-500" /> Review Test
              </Button>
            </div>
          </div>
        </div>

        {/* 2-Column Main Content & Suggestions */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] items-start">
          <main className="space-y-6 min-w-0">
            {/* Test Instructions */}
            <Card className="p-6 border-border bg-card shadow-2xs space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                Examination Instructions & Guidelines
              </h2>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/30 p-4 rounded-2xl border">
                {test.instructions || "1. Read all questions carefully before choosing your answer.\n2. Submit only after reviewing all marked questions.\n3. Instant performance report will be generated showing section-wise percentile, accuracy rate, and detailed step-by-step solutions."}
              </div>
            </Card>

            {/* Scoring & Scheme Grid */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-4 border-border bg-card shadow-2xs text-center space-y-1">
                <p className="text-xs text-muted-foreground font-semibold">Correct Answer</p>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">+4 Marks</p>
              </Card>

              <Card className="p-4 border-border bg-card shadow-2xs text-center space-y-1">
                <p className="text-xs text-muted-foreground font-semibold">Negative Marking</p>
                <p className="text-xl font-black text-destructive">
                  {test.negative_marking ? `-${test.negative_marks_per_question || 1} Mark` : "No Negative"}
                </p>
              </Card>

              <Card className="p-4 border-border bg-card shadow-2xs text-center space-y-1">
                <p className="text-xs text-muted-foreground font-semibold">Passing Benchmark</p>
                <p className="text-xl font-black text-primary">{test.passing_marks || 60} Marks</p>
              </Card>
            </div>

            {/* LIVE LEADERBOARD & TOP PERFORMERS SECTION ON PAGE */}
            <Card className="p-6 border-border bg-card shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    Live Hall of Fame & Top Rankers
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Top scorers on this practice assessment</p>
                </div>

                <Button
                  onClick={() => setRunnerOpen(true)}
                  size="sm"
                  variant="outline"
                  className="font-bold text-xs gap-1.5 h-8 rounded-xl cursor-pointer"
                >
                  <Play className="h-3 w-3 fill-current" /> Compete Now
                </Button>
              </div>

              {loadingLeaderboard ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2 inline" /> Loading leaderboard...
                </div>
              ) : pageLeaderboard.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No rankers yet. Be the first to take the test and top the leaderboard!
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  {pageLeaderboard.slice(0, 5).map((entry) => {
                    const medals = ["🥇", "🥈", "🥉"];
                    const badge = medals[entry.rank - 1] || `#${entry.rank}`;

                    return (
                      <div
                        key={entry.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-2xs ${
                          entry.rank === 1
                            ? "bg-amber-500/10 border-amber-500/30"
                            : "bg-muted/20 border-border/70"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-base font-black w-8 text-center shrink-0">
                            {badge}
                          </span>

                          <div className="h-8 w-8 rounded-full bg-primary/15 text-primary font-black text-xs flex items-center justify-center shrink-0">
                            {entry.student_name ? entry.student_name[0].toUpperCase() : "U"}
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">
                              {entry.student_name}
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                              {entry.correct_answers}/{entry.total_questions} Questions Correct
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-black text-sm text-primary block">
                            {entry.obtained_marks} / {entry.total_marks} Marks
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            {entry.percentage}% Score
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </main>

          {/* Right Sidebar with Suggestion Widget */}
          <DetailSuggestionSidebar type="practice" currentId={test.id} />
        </div>
      </div>

      {/* Interactive Test Runner Modal with Timer, Question Navigator & Leaderboard */}
      <PracticeTestRunnerModal
        testId={test.id}
        open={runnerOpen}
        onOpenChange={setRunnerOpen}
        onTestCompleted={fetchLeaderboard}
      />

      <UniversalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        target={{
          type: "practice" as any,
          id: test.id,
          title: test.title,
          subtitle: `${test.category} • Mock Test Series`,
          avg_rating: test.rating || 4.8,
          review_count: test.reviews_count || 48,
        }}
      />
    </div>
  );
}
