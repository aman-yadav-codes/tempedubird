import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="bg-primary py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-primary-foreground">
            Ready to Start Your Learning Journey?
          </h2>
          <p className="mb-8 text-lg text-primary-foreground/90">
            Join thousands of students who found their perfect course through EduBird.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" variant="secondary" className="gap-2" asChild>
              <Link href="/courses">
                Browse Courses
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              data-tracker-trigger="contact"
            >
              For Institutes
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
