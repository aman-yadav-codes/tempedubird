import Link from "next/link";
import { HelpCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/db";
import { getAllCompanyFaqs, getCompanyPageBySlug } from "@/lib/queries/company";

export const metadata = {
  title: "Frequently Asked Questions (FAQs) | EduBird",
  description: "Find answers to commonly asked questions about courses, admissions, fees, and account access.",
};

export default async function FaqsPage() {
  const page = await getCompanyPageBySlug(db, "faqs");
  const faqs = await getAllCompanyFaqs(db, true);

  // Group FAQs by category
  const categoriesMap: Record<string, typeof faqs> = {};
  faqs.forEach((faq) => {
    const cat = faq.category || "General";
    if (!categoriesMap[cat]) categoriesMap[cat] = [];
    categoriesMap[cat].push(faq);
  });

  const categories = Object.keys(categoriesMap);

  return (
    <div className="bg-background min-h-screen">
      <section className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-12 lg:py-16 max-w-4xl">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold uppercase tracking-wide text-primary">Help Center</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {page?.title || "Frequently Asked Questions"}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {page?.subtitle || "Find quick answers to common questions about courses, admissions, payment processing, and account access."}
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
        {page?.content && (
          <div
            className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground mb-6"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        )}

        {faqs.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <p>No FAQs available at the moment.</p>
          </div>
        ) : (
          categories.map((cat) => (
            <div key={cat} className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight text-foreground border-b pb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {cat}
              </h2>
              <div className="grid gap-4">
                {categoriesMap[cat].map((faq) => (
                  <details
                    key={faq.id}
                    className="group rounded-xl border border-border bg-card p-5 transition-all [&[open]]:shadow-xs [&[open]]:border-primary/40"
                  >
                    <summary className="flex cursor-pointer items-center justify-between font-semibold text-foreground list-none group-open:text-primary">
                      <span>{faq.question}</span>
                      <span className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs text-muted-foreground transition-transform group-open:rotate-180 group-open:bg-primary group-open:text-primary-foreground group-open:border-primary">
                        ↓
                      </span>
                    </summary>
                    <div className="mt-4 pt-3 border-t text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Still need help CTA */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-center space-y-3 mt-12">
          <MessageCircle className="mx-auto h-8 w-8 text-primary" />
          <h3 className="text-xl font-semibold text-foreground">Still have questions?</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            If you could not find the answer to your question, feel free to contact our support team.
          </p>
          <div className="pt-2">
            <Button asChild>
              <Link href="/contact">Contact Support</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
