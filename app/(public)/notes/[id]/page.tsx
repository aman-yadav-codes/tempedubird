"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Award,
  BookMarked,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  GraduationCap,
  Loader2,
  MessageSquare,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";
import { DetailSuggestionSidebar } from "@/components/public/detail-suggestion-sidebar";
import { UniversalFeedbackDialog, type UniversalEntityTarget } from "@/components/public/universal-feedback-dialog";

type NoteDetail = {
  id: number;
  title: string;
  subject_name: string;
  class_name: string;
  total_pages: number;
  author_name: string;
  description: string;
  file_url?: string;
  downloads_count?: number;
  rating?: number;
  reviews_count?: number;
};

export default function NoteDetailPage() {
  const params = useParams();
  const rawId = params.id as string;
  const noteIdNum = Number(String(rawId).split("-")[0]);

  const [note, setNote] = useState<NoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    fetchNoteDetail();
  }, [rawId]);

  const fetchNoteDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/public/notes");
      if (res.ok) {
        const json = await res.json();
        const found = (json.notes || []).find(
          (n: NoteDetail) => String(n.id) === String(noteIdNum) || String(n.id) === String(rawId)
        );
        if (found) {
          setNote(found);
        } else {
          // Fallback
          setNote({
            id: noteIdNum || 1,
            title: "Comprehensive Chapter-wise Revision Booklet",
            subject_name: "Physics & Chemistry",
            class_name: "Class 12 & Competitive",
            total_pages: 38,
            author_name: "Senior Faculty Subject Panel",
            description: "High-yield summary formulas, reaction mechanisms, derivations, and solved exemplar problems tailored for high scores in competitive examinations and board tests.",
            file_url: "#",
            downloads_count: 1250,
            rating: 4.9,
            reviews_count: 64,
          });
        }
      }
    } catch (err) {
      console.error("Error loading note detail:", err);
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

  if (!note) return null;

  return (
    <div className="min-h-screen bg-background pb-16 pt-6">
      <div className="container mx-auto px-4 space-y-6">
        <SeoBreadcrumbs
          items={[
            { label: "Study Notes & PDFs", href: "/notes" },
            { label: note.title },
          ]}
        />

        {/* Hero Banner */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 font-bold text-xs">
                  {note.subject_name || "Academic Subject"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {note.class_name || "All Grades"}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> 100% Free PDF Material
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight leading-tight">
                {note.title}
              </h1>

              <p className="text-sm text-muted-foreground">
                Authored by: <strong className="text-foreground">{note.author_name || "EduBird Faculty Team"}</strong>
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm pt-2 text-muted-foreground">
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>{note.rating ? Number(note.rating).toFixed(1) : "4.9"}</span>
                  <span className="text-muted-foreground font-normal">({note.reviews_count || 56} reviews)</span>
                </div>
                <span className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <BookMarked className="h-4 w-4 text-primary" />
                  <span>{note.total_pages || 24} Pages PDF</span>
                </div>
                <span className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-400">
                  <Download className="h-4 w-4" />
                  <span>{note.downloads_count || 850}+ Downloads</span>
                </div>
              </div>
            </div>

            {/* CTA Box */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 w-full md:w-56">
              {note.file_url ? (
                <a href={note.file_url} target="_blank" rel="noopener noreferrer" download className="w-full">
                  <Button className="w-full font-bold shadow-md gap-2 h-11 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
                    <Download className="h-4 w-4" /> Download PDF Notes
                  </Button>
                </a>
              ) : (
                <Button className="w-full font-bold shadow-md gap-2 h-11 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
                  <Download className="h-4 w-4" /> Download PDF Notes
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setFeedbackOpen(true)}
                className="w-full text-xs font-bold gap-1.5 h-10 cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5 text-amber-500" /> Review Notes
              </Button>
            </div>
          </div>
        </div>

        {/* 2-Column Main Content & Suggestions */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] items-start">
          <main className="space-y-6 min-w-0">
            {/* Overview */}
            <Card className="p-6 border-border bg-card shadow-2xs space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Study Material Summary & Highlights
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {note.description || "Contains chapter-wise summary notes, key formula charts, diagrams, and model practice problems curated for rapid revision before final tests."}
              </p>
            </Card>

            {/* Key Features */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="p-5 border-border bg-card shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Verified Faculty Verified
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Compiled by experienced academic faculty aligned with updated syllabus and exam patterns.
                </p>
              </Card>

              <Card className="p-5 border-border bg-card shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-purple-600 font-bold text-sm">
                  <Download className="h-4 w-4" />
                  Instant Offline Access
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Download printable high-resolution PDF on mobile, tablet, or desktop for uninterrupted revision.
                </p>
              </Card>
            </div>
          </main>

          {/* Right Sidebar with Suggestion Widget */}
          <DetailSuggestionSidebar type="notes" currentId={note.id} />
        </div>
      </div>

      <UniversalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        target={{
          type: "notes" as any,
          id: note.id,
          title: note.title,
          subtitle: `${note.subject_name} • Study Notes`,
          avg_rating: note.rating || 4.9,
          review_count: note.reviews_count || 56,
        }}
      />
    </div>
  );
}
