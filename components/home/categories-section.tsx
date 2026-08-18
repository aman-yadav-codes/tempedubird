import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { categories } from "@/lib/data/home-data";

export function CategoriesSection() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">Browse by Category</h2>
          <p className="text-muted-foreground">Explore courses across different domains</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, index) => (
            <Link key={index} href={`/courses?cat=${category.slug}`}>
              <Card className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/10">
                    <category.icon className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.count} courses</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
