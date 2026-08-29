"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookMarked,
  Download,
  FileText,
  UserCheck,
  Loader2,
  Search,
  ArrowDownToLine,
  Star,
  MessageSquare,
  Sparkles,
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

type NoteItem = {
  id: number;
  title: string;
  subject: string;
  program_name: string;
  file_url: string;
  downloads_count: number;
  author_name: string;
  description: string;
  institution_name: string;
  price?: string;
  is_free?: boolean;
};

export default function NotesPublicPage() {
  const { isInstitutionalAdmin, activeInstitutionId } = useCategoryAvailability();
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get("search") || searchParams?.get("q") || "";
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [activeSubject, setActiveSubject] = useState<string>("all");
  const [feedbackTarget, setFeedbackTarget] = useState<UniversalEntityTarget | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Sync search URL query
  useEffect(() => {
    const q = searchParams?.get("search") || searchParams?.get("q");
    if (q !== null && q !== undefined && q !== search) {
      setSearch(q);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchNotes();
  }, [activeInstitutionId, isInstitutionalAdmin]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const url =
        isInstitutionalAdmin && activeInstitutionId
          ? `/api/public/notes?institutionId=${activeInstitutionId}`
          : "/api/public/notes";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setNotes(json.notes || []);
      }
    } catch (err) {
      console.error("Error loading notes:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.subject.toLowerCase().includes(search.toLowerCase()) ||
      n.program_name.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = activeSubject === "all" || n.subject.toLowerCase().includes(activeSubject.toLowerCase());
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="min-h-screen bg-background pb-16 pt-6">
      <div className="container mx-auto px-4 space-y-6">
        <SeoBreadcrumbs items={[{ label: "Lecture Notes & Study Material" }]} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-1">Study Material</Badge>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Lecture Notes & Revision Material</h1>
            <p className="text-sm text-muted-foreground mt-1">Download handwritten notes, formula booklets, and course handouts authored by expert faculty.</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, subject, or course..."
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
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading lecture notes...
              </div>
            ) : filtered.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground rounded-2xl shadow-2xs">
                No lecture notes found matching your query.
              </Card>
            ) : (
              <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((n, idx) => {
                  const shouldInsertBanner = (idx + 1) % 3 === 0 && idx !== filtered.length - 1;
                  const bannerIdx = Math.floor(idx / 3);

                  return (
                    <React.Fragment key={n.id}>
                      <Card className="p-5 shadow-2xs hover:border-primary/50 transition-all flex flex-col justify-between space-y-4 rounded-2xl border border-border/80 bg-card/95 hover:-translate-y-1">
                        <div className="space-y-3">
                          {/* Top Row: Category & Doc Type Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[11px] font-extrabold text-primary flex items-center gap-1 mb-1 truncate">
                                <BookMarked className="size-3.5 shrink-0" />
                                <span className="truncate">{n.program_name || "Academic Notes"}</span>
                              </span>
                              <h3 className="text-base font-black uppercase text-foreground leading-tight line-clamp-2">
                                <Link href={`/notes/${n.id}`} className="hover:text-primary hover:underline transition-colors">
                                  {n.title}
                                </Link>
                              </h3>
                              <p className="text-xs text-muted-foreground font-semibold mt-1 truncate">
                                Subject: {n.subject}
                              </p>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <Badge variant="secondary" className="text-[10px] font-bold">
                                PDF Document
                              </Badge>
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-extrabold">
                                {n.price || "Free"}
                              </Badge>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {n.description || "Comprehensive handwritten lecture handouts and formula sheets verified by subject faculties."}
                          </p>

                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                            <span className="flex items-center gap-1 font-semibold text-foreground truncate max-w-[150px]">
                              <UserCheck className="size-3.5 text-primary shrink-0" />
                              <span className="truncate">{n.author_name || "Faculty Desk"}</span>
                            </span>
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                              <Download className="size-3.5" /> {n.downloads_count || 320}+
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
                                  type: "notes",
                                  id: n.id,
                                  title: n.title,
                                  subtitle: `${n.subject} • ${n.author_name || "Faculty Notes"}`,
                                  avg_rating: 4.9,
                                  review_count: 16,
                                });
                                setFeedbackOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-600 font-bold hover:underline cursor-pointer"
                            >
                              <Star className="size-3.5 fill-amber-400 text-amber-400" />
                              <span>4.9</span>
                              <span className="text-muted-foreground font-normal">(16 reviews)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setFeedbackTarget({
                                  type: "notes",
                                  id: n.id,
                                  title: n.title,
                                  subtitle: `${n.subject} • ${n.author_name || "Faculty Notes"}`,
                                  avg_rating: 4.9,
                                  review_count: 16,
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
                          <a href={n.file_url || "#"} target="_blank" rel="noopener noreferrer" className="block">
                            <Button size="sm" className="w-full font-bold text-xs gap-1.5 rounded-xl shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
                              <ArrowDownToLine className="size-3.5" /> Download Handouts
                            </Button>
                          </a>
                        </div>
                      </Card>

                      {/* 200px Banner after every 3 items */}
                      {shouldInsertBanner && (
                        <SharedInterstitialBanner
                          bannerIndex={bannerIdx}
                          pageType="notes"
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
            pageType="notes"
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
