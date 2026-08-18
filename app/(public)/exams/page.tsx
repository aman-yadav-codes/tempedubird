"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Calendar, CheckCircle2, ExternalLink, Loader2, Search, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";

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
};

export default function ExamsPublicPage() {
  const [exams, setExams] = useState<EntranceExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await fetch("/api/public/exams");
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

  const filtered = exams.filter(
    (e) =>
      e.exam_name.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
  );

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
              className="pl-9 text-xs h-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading entrance exams...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            No entrance exams found matching your query.
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filtered.map((e) => (
              <Card key={e.id} className="p-6 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-primary flex items-center gap-1 mb-1">
                        <Award className="h-3.5 w-3.5" />
                        {e.category || "Engineering Entrance"}
                      </span>
                      <h3 className="text-xl font-bold text-foreground leading-tight">{e.exam_name}</h3>
                    </div>

                    <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1">
                      <Calendar className="h-3 w-3" /> {e.exam_date || "2026"}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{e.description}</p>

                  <div className="p-3 rounded-xl bg-muted/50 text-xs space-y-1">
                    <div>
                      <strong className="text-foreground">Eligibility: </strong>
                      <span className="text-muted-foreground">{e.eligibility}</span>
                    </div>
                    <div>
                      <strong className="text-foreground">Application Fee: </strong>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{Number(e.application_fee || 1000).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    Verified Exam Information
                  </span>

                  {e.website_url && (
                    <a href={e.website_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="font-bold text-xs gap-1.5 shadow-xs">
                        Official Exam Portal <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
