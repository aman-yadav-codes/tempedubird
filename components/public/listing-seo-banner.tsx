"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, HelpCircle, ChevronDown, MapPin, BookOpen, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ListingSeoData {
  id: number;
  listing_type: string;
  city: string;
  area: string;
  course: string;
  h1_heading?: string;
  subheading?: string;
  intro_content?: string;
  bottom_content?: string;
  quick_highlights?: string[] | string;
  faqs?: { question: string; answer: string }[] | string;
  canonical_url?: string;
}

interface ListingSeoBannerProps {
  city?: string;
  area?: string;
  course?: string;
  listingType?: string;
  onDataLoaded?: (data: ListingSeoData | null) => void;
}

export function ListingSeoTopBanner({
  city,
  area,
  course,
  listingType = "institutes",
  onDataLoaded
}: ListingSeoBannerProps) {
  const [data, setData] = useState<ListingSeoData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!city && !course) {
      setData(null);
      if (onDataLoaded) onDataLoaded(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const params = new URLSearchParams();
    params.set("listing_type", listingType);
    if (city && city !== "all") params.set("city", city);
    if (area && area !== "all") params.set("area", area);
    if (course && course !== "all") params.set("course", course);

    fetch(`/api/public/listing-seo?${params.toString()}`)
      .then(res => res.json())
      .then(res => {
        if (isMounted) {
          if (res.success && res.data) {
            setData(res.data);
            if (onDataLoaded) onDataLoaded(res.data);
          } else {
            setData(null);
            if (onDataLoaded) onDataLoaded(null);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setData(null);
          if (onDataLoaded) onDataLoaded(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [city, area, course, listingType]);

  if (!data || (!data.h1_heading && !data.intro_content)) {
    return null;
  }

  let highlights: string[] = [];
  if (Array.isArray(data.quick_highlights)) {
    highlights = data.quick_highlights;
  } else if (typeof data.quick_highlights === "string") {
    try { highlights = JSON.parse(data.quick_highlights); } catch (e) {}
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/[0.02] p-5 sm:p-7 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
          <Sparkles className="h-3 w-3 mr-1" />
          Verified Directory
        </Badge>
        {data.city && (
          <Badge variant="secondary" className="text-xs font-medium">
            <MapPin className="h-3 w-3 mr-1 text-rose-500" />
            {data.city} {data.area && data.area !== "all" ? `(${data.area})` : ""}
          </Badge>
        )}
        {data.course && data.course !== "all" && (
          <Badge variant="secondary" className="text-xs font-medium">
            <BookOpen className="h-3 w-3 mr-1 text-blue-500" />
            {data.course}
          </Badge>
        )}
      </div>

      {data.h1_heading && (
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-2">
          {data.h1_heading}
        </h1>
      )}

      {data.subheading && (
        <p className="text-sm sm:text-base font-medium text-foreground/80 mb-3">
          {data.subheading}
        </p>
      )}

      {data.intro_content && (
        <p className="text-sm text-muted-foreground leading-relaxed max-w-4xl">
          {data.intro_content}
        </p>
      )}

      {highlights.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-border/40">
          {highlights.map((hl, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-background border shadow-xs text-foreground/90"
            >
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              {hl}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ListingSeoBottomContent({
  city,
  area,
  course,
  listingType = "institutes"
}: ListingSeoBannerProps) {
  const [data, setData] = useState<ListingSeoData | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!city && !course) {
      setData(null);
      return;
    }

    let isMounted = true;
    const params = new URLSearchParams();
    params.set("listing_type", listingType);
    if (city && city !== "all") params.set("city", city);
    if (area && area !== "all") params.set("area", area);
    if (course && course !== "all") params.set("course", course);

    fetch(`/api/public/listing-seo?${params.toString()}`)
      .then(res => res.json())
      .then(res => {
        if (isMounted && res.success && res.data) {
          setData(res.data);
        }
      })
      .catch(() => {
        if (isMounted) setData(null);
      });

    return () => {
      isMounted = false;
    };
  }, [city, area, course, listingType]);

  if (!data || (!data.bottom_content && (!data.faqs || (Array.isArray(data.faqs) && data.faqs.length === 0)))) {
    return null;
  }

  let faqs: { question: string; answer: string }[] = [];
  if (Array.isArray(data.faqs)) {
    faqs = data.faqs;
  } else if (typeof data.faqs === "string") {
    try { faqs = JSON.parse(data.faqs); } catch (e) {}
  }

  const faqSchema = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(f => ({
      "@type": "Question",
      "name": f.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.answer
      }
    }))
  } : null;

  return (
    <section className="mt-12 pt-8 border-t space-y-8">
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* Rich Guide / Bottom Content */}
      {data.bottom_content && (
        <div className="rounded-2xl border bg-card/60 p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <BookOpen className="h-4 w-4" /> Comprehensive Area & Course Guide
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
            {data.bottom_content}
          </div>
        </div>
      )}

      {/* FAQs Accordion */}
      {faqs.length > 0 && (
        <div className="rounded-2xl border bg-card/60 p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                Frequently Asked Questions
              </h3>
              <p className="text-xs text-muted-foreground">
                Common questions about preparation, fees, and admission in {data.city} {data.area && data.area !== "all" ? `(${data.area})` : ""}.
              </p>
            </div>
          </div>

          <div className="divide-y rounded-xl border bg-background/50 overflow-hidden">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="transition-colors">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full text-left p-4 flex items-center justify-between gap-4 font-semibold text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
