import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/public/course-card";
import { featuredCourses } from "@/lib/data/home-data";

export function FeaturedCoursesSection() {
  return (
    <section className="bg-muted/30 py-16">
      <div className="container mx-auto px-4">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="mb-2 text-3xl font-bold text-foreground">Featured Courses</h2>
            <p className="text-muted-foreground">Handpicked courses from verified institutes</p>
          </div>
          <Button variant="outline" className="gap-2" asChild>
            <Link href="/courses">
              View All Courses
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredCourses.map((course) => (
            <CourseCard key={course.id} {...course} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button size="lg" className="gap-2" asChild>
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
