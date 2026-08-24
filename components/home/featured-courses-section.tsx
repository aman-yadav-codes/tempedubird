"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CourseCard } from "@/components/public/course-card";
import { featuredCourses } from "@/lib/data/home-data";
import { useCategoryAvailability } from "@/hooks/use-category-availability";

export function FeaturedCoursesSection() {
  const { isInstitutionalAdmin, activeInstitutionId, activeInstitutionName } = useCategoryAvailability();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadCourses() {
      setLoading(true);
      try {
        const url =
          isInstitutionalAdmin && activeInstitutionId
            ? `/api/courses?limit=6&institutionId=${activeInstitutionId}`
            : "/api/courses?limit=6";

        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const rows = Array.isArray(json?.data) ? json.data : [];
          if (!ignore) {
            setCourses(rows);
          }
        } else if (!ignore) {
          setCourses([]);
        }
      } catch {
        if (!ignore) {
          setCourses([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadCourses();

    return () => {
      ignore = true;
    };
  }, [activeInstitutionId, isInstitutionalAdmin]);

  return (
    <section className="bg-muted/30 py-16">
      <div className="container mx-auto px-4 space-y-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Marketplace Showcase</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Featured Marketplace Courses
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Handpicked courses from top verified institutes across India.
            </p>
          </div>
          <Button variant="outline" className="gap-2 shrink-0" asChild>
            <Link href="/courses">
              View All Courses
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading courses...
          </div>
        ) : courses.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <p className="font-semibold text-foreground">No courses listed yet for this institution.</p>
            <p className="text-xs mt-1">Use the Institution Admin Portal to add classes and programs.</p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id || course.courseKey} {...course} />
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <Button size="lg" className="gap-2 font-bold" asChild>
            <Link href="/courses">
              Explore All Courses
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
