"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Library, MapPin, Clock, Users, Globe, Mail, Phone, Loader2, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeoBreadcrumbs } from "@/components/ui/seo-breadcrumbs";
import { useCategoryAvailability } from "@/hooks/use-category-availability";

type LibraryItem = {
  id: number;
  institution_id: number;
  name: string;
  total_books: number;
  digital_titles: number;
  journals_subscribed: number;
  seating_capacity: number;
  membership_fee?: string;
  reading_hall_available: boolean;
  e_resources_access: boolean;
  opening_hours: string;
  borrowing_rules: string;
  librarian_name: string;
  librarian_email: string;
  librarian_phone: string;
  description: string;
  institution_name: string;
  institution_city: string;
};

export default function LibrariesPublicPage() {
  const { isInstitutionalAdmin, activeInstitutionId } = useCategoryAvailability();
  const [libraries, setLibraries] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchLibraries();
  }, [activeInstitutionId, isInstitutionalAdmin]);

  const fetchLibraries = async () => {
    try {
      setLoading(true);
      const url =
        isInstitutionalAdmin && activeInstitutionId
          ? `/api/public/libraries?institutionId=${activeInstitutionId}`
          : "/api/public/libraries";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setLibraries(json.libraries || []);
      }
    } catch (err) {
      console.error("Error loading libraries:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = libraries.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.institution_name && l.institution_name.toLowerCase().includes(search.toLowerCase())) ||
      (l.institution_city && l.institution_city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background pb-16 pt-6">
      <div className="container mx-auto px-4 space-y-6">
        <SeoBreadcrumbs items={[{ label: "Libraries & Knowledge Centers" }]} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-1">Academic Resources</Badge>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Central & Digital Libraries</h1>
            <p className="text-sm text-muted-foreground mt-1">Discover campus libraries, e-journals, research databases, and reading halls.</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search library or city..."
              className="pl-9 text-xs h-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading library resources...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            No library resources found matching your query.
          </Card>
        ) : (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((l) => (
              <Card key={l.id} className="p-6 shadow-xs hover:border-primary/50 transition-colors flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-primary flex items-center gap-1 mb-1">
                        <Library className="h-3.5 w-3.5" />
                        {l.institution_name || "Apex Institute of Engineering & Technology"}
                      </span>
                      <h3 className="text-xl font-bold text-foreground leading-tight">{l.name}</h3>
                      {l.institution_city && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3.5 w-3.5 text-primary" /> {l.institution_city}
                        </p>
                      )}
                    </div>

                    <Badge variant="outline" className="text-xs border-primary/30 text-primary font-bold">
                      {l.seating_capacity || 350} Seats
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{l.description}</p>

                  <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                    <div className="p-2 rounded-lg bg-muted/60">
                      <span className="text-base font-extrabold text-foreground block">{(l.total_books || 45000).toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Print Books</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/60">
                      <span className="text-base font-extrabold text-primary block">{(l.digital_titles || 15000).toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">E-Journals</span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/60">
                      <span className="text-base font-extrabold text-emerald-600 block">{l.journals_subscribed || 120}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Journals</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                    <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Opening Hours: <strong className="text-foreground">{l.opening_hours || "8:00 AM - 10:00 PM"}</strong></span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    <span>Librarian: </span>
                    <strong className="text-foreground">{l.librarian_name || "Head Librarian"}</strong>
                  </div>

                  <Link href={`/institutes/${l.institution_id || 155}`}>
                    <Button size="sm" className="font-bold text-xs gap-1.5 shadow-xs">
                      View Campus Details
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
