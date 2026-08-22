"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Building2, CheckSquare, BookMarked, UserCheck, Award, Library, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCategoryAvailability, type CategoryKey } from "@/hooks/use-category-availability";

const ALL_CATEGORY_META = [
  { key: "courses", name: "Courses & Programs", slug: "courses", href: "/courses", icon: BookOpen, defaultDesc: "Degrees, Diplomas & Certificates" },
  { key: "institutes", name: "Institutes & Colleges", slug: "institutes", href: "/institutes", icon: Building2, defaultDesc: "Schools, Universities & Academies" },
  { key: "practice", name: "Practice & Mock Tests", slug: "practice", href: "/practice", icon: CheckSquare, defaultDesc: "Chapter Tests & Mock Exams" },
  { key: "notes", name: "Study Notes & Materials", slug: "notes", href: "/notes", icon: BookMarked, defaultDesc: "Handouts, Formulae & Handbooks" },
  { key: "teachers", name: "Faculty & Educators", slug: "teachers", href: "/teachers", icon: UserCheck, defaultDesc: "Subject Experts & Mentors" },
  { key: "exams", name: "Entrance Exams", slug: "exams", href: "/exams", icon: Award, defaultDesc: "Competitive & National Assessments" },
  { key: "libraries", name: "Campus Libraries", slug: "libraries", href: "/libraries", icon: Library, defaultDesc: "Digital & Physical Catalogs" },
  { key: "hostels", name: "Hostels & Living", slug: "hostels", href: "/hostels", icon: Building2, defaultDesc: "Campus Residences & Mess" },
  { key: "blogs", name: "Articles & Campus News", slug: "blogs", href: "/blogs", icon: FileText, defaultDesc: "Announcements & Career Guides" },
];

export function CategoriesSection() {
  const { categories, isCategoryVisible, isInstitutionalAdmin, activeInstitutionName } = useCategoryAvailability();

  const visibleCategories = ALL_CATEGORY_META.filter((cat) => isCategoryVisible(cat.key as CategoryKey));

  return (
    <section className="py-16">
      <div className="container mx-auto px-4 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          {isInstitutionalAdmin && activeInstitutionName && (
            <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold px-3 py-1 text-xs">
              🏫 {activeInstitutionName} Active Modules
            </Badge>
          )}
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            {isInstitutionalAdmin ? "Explore Institution Offerings" : "Browse by Academic Category"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isInstitutionalAdmin
              ? "Access all verified records, courses, study notes, and facilities added by your institution."
              : "Explore verified courses, institutes, mock tests, and faculty across India."}
          </p>
        </div>

        {visibleCategories.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            No active categories populated yet.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCategories.map((category) => {
              const Icon = category.icon;
              const catData = categories?.[category.key as CategoryKey];
              const count = catData?.count ?? 0;

              return (
                <Link key={category.key} href={category.href}>
                  <Card className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md rounded-2xl h-full flex flex-col justify-between">
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        <Icon className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {category.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {count > 0 ? `${count} Available Records` : category.defaultDesc}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
