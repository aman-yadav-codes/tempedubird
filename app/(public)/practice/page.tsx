"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckSquare, Clock, HelpCircle, Flame, Award, Loader2, Search, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";

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
};

export default function PracticePublicPage() {
  const [tests, setTests] = useState<PracticeTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const res = await fetch("/api/public/practice");
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

  const filtered = tests.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  );

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
              className="pl-9 text-xs h-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading practice tests...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            No practice tests found matching your query.
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filtered.map((t) => (
              <Card key={t.id} className="p-6 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-primary flex items-center gap-1 mb-1">
                        <CheckSquare className="h-3.5 w-3.5" />
                        {t.category || "Engineering Entrance"}
                      </span>
                      <h3 className="text-xl font-bold text-foreground leading-tight">{t.title}</h3>
                      <p className="text-xs text-muted-foreground font-medium mt-1">Subject: {t.subject}</p>
                    </div>

                    <Badge className={t.difficulty === "Hard" ? "bg-red-500" : "bg-amber-500"}>
                      {t.difficulty}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                    <span className="flex items-center gap-1 text-foreground font-semibold">
                      <HelpCircle className="h-3.5 w-3.5 text-primary" /> {t.questions_count} Questions
                    </span>
                    <span className="h-3.5 w-px bg-border" />
                    <span className="flex items-center gap-1 text-foreground font-semibold">
                      <Clock className="h-3.5 w-3.5 text-primary" /> {t.time_limit_mins} Mins
                    </span>
                    <span className="h-3.5 w-px bg-border" />
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Flame className="h-3.5 w-3.5" /> {t.attempts_count} Attempts
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    By <strong className="text-foreground">{t.created_by_name || t.institution_name || "Apex Faculty"}</strong>
                  </span>

                  <Button size="sm" className="font-bold text-xs gap-1.5 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Play className="h-3.5 w-3.5 fill-current" /> Start Practice Test
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
