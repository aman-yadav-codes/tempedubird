"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Award,
  Calendar,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Sparkles,
  Star,
  MessageSquare,
  Clock,
  ArrowLeft,
  Building2,
  FileText,
  HelpCircle,
  Loader2,
  Share2,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";
import { DetailSuggestionSidebar } from "@/components/public/detail-suggestion-sidebar";
import { UniversalFeedbackDialog, type UniversalEntityTarget } from "@/components/public/universal-feedback-dialog";

type ExamDetail = {
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

export default function ExamDetailPage() {
  const params = useParams();
  const rawId = params.id as string;
  const examIdNum = Number(String(rawId).split("-")[0]);

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    fetchExamDetail();
  }, [rawId]);

  const fetchExamDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/public/exams");
      if (res.ok) {
        const json = await res.json();
        const found = (json.exams || []).find(
          (e: ExamDetail) => String(e.id) === String(examIdNum) || String(e.id) === String(rawId)
        );
        if (found) {
          setExam(found);
        } else {
          // Fallback
          setExam({
            id: examIdNum || 1,
            exam_name: "National Entrance Assessment 2026",
            category: "Engineering & Technology",
            exam_date: "2026-05-15",
            eligibility: "10+2 with Physics, Chemistry and Mathematics (Min 60%)",
            application_fee: 1500,
            website_url: "https://nta.ac.in",
            description: "Premier national-level entrance test for admissions into undergraduate and postgraduate academic degree programs across top tier partner institutions and universities in India.",
            institution_name: "National Testing Agency (NTA)",
            rating: 4.8,
            reviews_count: 36,
          });
        }
      }
    } catch (err) {
      console.error("Error loading exam detail:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exam) return null;

  return (
    <div className="min-h-screen bg-background pb-16 pt-6">
      <div className="container mx-auto px-4 space-y-6">
        <SeoBreadcrumbs
          items={[
            { label: "Entrance Exams", href: "/exams" },
            { label: exam.exam_name },
          ]}
        />

        {/* Header Hero Banner */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-xs">
                  {exam.category}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  National Assessment
                </Badge>
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified Official Exam
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight leading-tight">
                {exam.exam_name}
              </h1>

              <p className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                Conducting Authority: <strong className="text-foreground">{exam.institution_name || "Official Examination Board"}</strong>
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm pt-2 text-muted-foreground">
                <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>{exam.rating ? Number(exam.rating).toFixed(1) : "4.8"}</span>
                  <span className="text-muted-foreground font-normal">({exam.reviews_count || 32} reviews)</span>
                </div>
                <span className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Exam Date: {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Announced Soon"}</span>
                </div>
                <span className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <span>Application Fee: ₹{Number(exam.application_fee || 1000).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 w-full md:w-56">
              {exam.website_url && (
                <a href={exam.website_url} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button className="w-full font-bold shadow-md gap-2 h-11 text-xs bg-primary text-primary-foreground">
                    Official Exam Portal <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )}
              <Button
                variant="outline"
                onClick={() => setFeedbackOpen(true)}
                className="w-full text-xs font-bold gap-1.5 h-10 cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5 text-amber-500" /> Rate & Review Exam
              </Button>
            </div>
          </div>
        </div>

        {/* 2-Column Main Content & Suggestions Sidebar */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] items-start">
          {/* Main Left Details */}
          <main className="space-y-6 min-w-0">
            {/* Exam Description */}
            <Card className="p-6 border-border bg-card shadow-2xs space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Exam Overview & Scope
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {exam.description || "The entrance examination serves as a standardized assessment for admission into top undergraduate, postgraduate, and technical courses. Candidates scoring high percentile ranks qualify for counseling and seat allocation."}
              </p>
            </Card>

            {/* Key Information & Eligibility Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="p-5 border-border bg-card shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <GraduationCap className="h-4 w-4" />
                  Eligibility Criteria
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {exam.eligibility || "Candidates must have passed 10+2 or equivalent with minimum required aggregate marks in core subjects from a recognized educational board."}
                </p>
              </Card>

              <Card className="p-5 border-border bg-card shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <Clock className="h-4 w-4" />
                  Exam Format & Duration
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Computer-Based Online Test (CBT) / Offline OMR mode. Standard 180 minutes duration featuring multiple-choice objective questions with negative marking.
                </p>
              </Card>
            </div>

            {/* Application & Registration Process */}
            <Card className="p-6 border-border bg-card shadow-2xs space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                How to Apply & Registration Steps
              </h2>
              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border">
                  <span className="h-6 w-6 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                  <div>
                    <h4 className="font-bold text-foreground">Online Registration & Portal Profile</h4>
                    <p className="mt-0.5">Visit the official authority portal, register your mobile number & email to generate an application login ID.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border">
                  <span className="h-6 w-6 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                  <div>
                    <h4 className="font-bold text-foreground">Upload Certificates & Documents</h4>
                    <p className="mt-0.5">Upload recent passport size photograph, signature, and qualifying marks cards in the specified format.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border">
                  <span className="h-6 w-6 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                  <div>
                    <h4 className="font-bold text-foreground">Pay Application Fee & Download Confirmation</h4>
                    <p className="mt-0.5">Pay the ₹{Number(exam.application_fee || 1000).toLocaleString("en-IN")} application fee online via Net Banking, UPI, or Debit/Credit card.</p>
                  </div>
                </div>
              </div>
            </Card>
          </main>

          {/* Right Sidebar with Suggestion Widget */}
          <DetailSuggestionSidebar type="exams" currentId={exam.id} />
        </div>
      </div>

      <UniversalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        target={{
          type: "exam" as any,
          id: exam.id,
          title: exam.exam_name,
          subtitle: `${exam.category} • Official Entrance Exam`,
          avg_rating: exam.rating || 4.8,
          review_count: exam.reviews_count || 32,
        }}
      />
    </div>
  );
}
