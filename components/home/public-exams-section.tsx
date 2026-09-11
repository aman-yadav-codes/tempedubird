"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  Landmark,
  Loader2,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PublicExamItem = {
  id: number;
  exam_name: string;
  category: string;
  exam_type?: string;
  exam_date?: string;
  exam_time?: string;
  exam_mode?: string;
  total_marks?: number;
  duration_minutes?: number;
  eligibility?: string;
  application_fee?: number;
  website_url?: string;
  apply_url?: string;
  notification_pdf_url?: string;
  application_start_date?: string;
  application_end_date?: string;
  admit_card_date?: string;
  result_date?: string;
  description?: string;
  institution_name?: string;
  is_government_exam?: boolean;
};

const CATEGORY_TABS = [
  { key: "all", label: "All Examinations" },
  { key: "Government", label: "Civil & Govt Services" },
  { key: "Engineering", label: "Engineering (JEE / GATE)" },
  { key: "Medical", label: "Medical (NEET / AIIMS)" },
  { key: "Banking", label: "Banking & SSC" },
  { key: "Defense", label: "Defense & Armed Forces" },
  { key: "Class", label: "Class 10 & 12 Boards" },
];

export function PublicExamsSection() {
  const [exams, setExams] = useState<PublicExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("all");

  useEffect(() => {
    let ignore = false;

    async function loadExams() {
      setLoading(true);
      try {
        const res = await fetch("/api/public/exams", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (!ignore && Array.isArray(json?.exams)) {
            setExams(json.exams);
          }
        }
      } catch {
        if (!ignore) setExams([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadExams();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredExams = exams.filter((e) => {
    if (selectedTab === "all") return true;
    const cat = (e.category || "").toLowerCase();
    const name = (e.exam_name || "").toLowerCase();
    const target = selectedTab.toLowerCase();
    return cat.includes(target) || name.includes(target);
  });

  return (
    <section className="py-16 bg-gradient-to-b from-slate-50/70 via-background to-background border-b border-border/60">
      <div className="container mx-auto px-4 space-y-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
              <Landmark className="h-3.5 w-3.5" />
              <span>National &amp; State Examination Hub</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Public &amp; Government Selection Examinations
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Official notifications, syllabus-mapped entrance tests, application deadlines, and verified registration links published by national &amp; state examination authorities.
            </p>
          </div>

          <Button variant="outline" className="gap-2 shrink-0 border-primary/30 hover:bg-primary/5 hover:text-primary font-bold" asChild>
            <Link href="/exams">
              Explore All Exams <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedTab(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Loading / Empty / Content Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Loading public examinations...</span>
          </div>
        ) : filteredExams.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground rounded-2xl border-dashed">
            <Landmark className="size-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-bold text-foreground">No public examinations found in this category.</p>
            <p className="text-xs mt-1">Platform Admin can publish government &amp; selection exams anytime.</p>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredExams.slice(0, 6).map((exam) => {
              const applyLink = exam.apply_url || exam.website_url;
              const formattedDate = exam.exam_date
                ? new Date(exam.exam_date).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Official Date TBA";

              return (
                <Card
                  key={exam.id}
                  className="p-5 rounded-2xl bg-card border border-border/80 shadow-2xs hover:shadow-lg hover:border-primary/40 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Authority & Mode */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary truncate">
                        <Landmark className="size-3.5 shrink-0" />
                        <span className="truncate">{exam.institution_name || "Official Examination Authority"}</span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-bold shrink-0 capitalize bg-muted/80 text-foreground"
                      >
                        {exam.exam_mode || "Online CBT"}
                      </Badge>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="font-black text-base text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        <Link href={`/exams/${exam.id}`}>
                          {exam.exam_name}
                        </Link>
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center gap-1.5">
                        <Target className="size-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{exam.category || "Competitive Examination"}</span>
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {exam.description || "Official national selection test with syllabus-mapped merit rankings."}
                    </p>

                    {/* Key Metrics Chips */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/40">
                        <Calendar className="size-3.5 text-primary shrink-0" />
                        <span className="truncate font-semibold text-foreground">{formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/40">
                        <Award className="size-3.5 text-amber-500 shrink-0" />
                        <span className="truncate font-semibold text-foreground">
                          {exam.total_marks ? `${exam.total_marks} Marks` : "Official Pattern"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-4 border-t border-border/60 mt-4 flex items-center justify-between gap-2">
                    <Link
                      href={`/exams/${exam.id}`}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Syllabus &amp; Details</span>
                      <ArrowRight className="size-3" />
                    </Link>

                    {applyLink ? (
                      <Button asChild size="sm" className="h-8 text-xs font-bold gap-1 px-3 bg-primary text-primary-foreground">
                        <a href={applyLink} target="_blank" rel="noopener noreferrer">
                          <span>Apply</span>
                          <ExternalLink className="size-3" />
                        </a>
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="outline" className="h-8 text-xs font-bold gap-1 px-3">
                        <Link href={`/exams/${exam.id}`}>
                          <span>View Info</span>
                        </Link>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Bottom CTA */}
        {filteredExams.length > 0 && (
          <div className="pt-2 text-center">
            <Button size="lg" className="gap-2 font-bold px-8 shadow-xs" asChild>
              <Link href="/exams">
                <span>View All {exams.length} Public Examinations</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
