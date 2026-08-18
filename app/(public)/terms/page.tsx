import Link from "next/link";
import { FileText } from "lucide-react";
import { db } from "@/lib/db/db";
import { getCompanyPageBySlug } from "@/lib/queries/company";

export const metadata = {
  title: "Terms & Conditions | EduBird",
  description: "Read the terms and conditions governing the use of EduBird services.",
};

export default async function TermsPage() {
  const page = await getCompanyPageBySlug(db, "terms-and-conditions");

  return (
    <div className="bg-background min-h-screen">
      <section className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-12 lg:py-16 max-w-4xl">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold uppercase tracking-wide text-primary">Terms of Service</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {page?.title || "Terms & Conditions"}
          </h1>
          {page?.subtitle && (
            <p className="mt-4 text-base leading-7 text-muted-foreground">{page.subtitle}</p>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-10 shadow-xs">
          {page?.content ? (
            <div
              className="prose prose-slate dark:prose-invert max-w-none leading-relaxed"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          ) : (
            <p className="text-muted-foreground">Terms and conditions content is currently being updated.</p>
          )}

          <div className="mt-12 pt-6 border-t text-sm text-muted-foreground flex flex-wrap justify-between gap-4">
            <p>Questions about our terms? <Link href="/contact" className="text-primary underline">Contact Us</Link></p>
            <p>Last updated: August 2026</p>
          </div>
        </div>
      </section>
    </div>
  );
}
