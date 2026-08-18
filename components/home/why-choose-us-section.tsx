import { Card } from "@/components/ui/card";
import { whyChooseUs } from "@/lib/data/home-data";

export function WhyChooseUsSection() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold text-foreground">Why Choose EduBird?</h2>
          <p className="text-muted-foreground">
            We make finding the right course simple and trustworthy
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {whyChooseUs.map((item, index) => (
            <Card key={index} className="border-border/50 bg-card p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <item.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
