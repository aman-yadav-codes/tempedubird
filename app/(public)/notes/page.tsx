"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookMarked, Download, FileText, UserCheck, Loader2, Search, ArrowDownToLine } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";
import { useCategoryAvailability } from "@/hooks/use-category-availability";

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
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.subject.toLowerCase().includes(search.toLowerCase()) ||
      n.program_name.toLowerCase().includes(search.toLowerCase())
  );

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
              className="pl-9 text-xs h-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading lecture notes...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            No lecture notes found matching your query.
          </Card>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((n) => (
              <Card key={n.id} className="p-6 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-primary flex items-center gap-1 mb-1">
                        <BookMarked className="h-3.5 w-3.5" />
                        {n.program_name || "B.Tech CS"}
                      </span>
                      <h3 className="text-xl font-bold text-foreground leading-tight">{n.title}</h3>
                      <p className="text-xs text-muted-foreground font-medium mt-1">Subject: {n.subject}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="text-xs font-bold">
                        PDF Document
                      </Badge>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                        {n.price || "Free Access"}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{n.description}</p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <UserCheck className="h-3.5 w-3.5 text-primary" /> {n.author_name || "Apex Faculty"}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Download className="h-3.5 w-3.5" /> {n.downloads_count || 300}+ Downloads
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {n.institution_name || "Apex Institute of Engineering & Technology"}
                  </span>

                  <a href={n.file_url || "#"} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="font-bold text-xs gap-1.5 shadow-xs">
                      <ArrowDownToLine className="h-3.5 w-3.5" /> Download PDF Notes
                    </Button>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
