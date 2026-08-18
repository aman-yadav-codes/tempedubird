import type { Metadata } from "next";

import { InstituteBreadcrumb } from "@/components/public/institutes/institute-breadcrumb";
import { InstitutesDirectory } from "@/components/public/institutes/institutes-directory";

export const metadata: Metadata = {
  title: "Partner Institutes in India",
  description:
    "Explore verified EduBird partner institutes in India. Search institutes by city, course, type, rating, facilities, admission status, and placement support.",
  alternates: {
    canonical: "/institutes",
  },
  openGraph: {
    title: "Partner Institutes in India - EduBird",
    description:
      "Find verified educational institutes trusted by learners across India.",
    url: "/institutes",
    siteName: "EduBird",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function InstitutesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": "https://edubird.in/institutes#organization",
        name: "EduBird Partner Institutes",
        url: "https://edubird.in/institutes",
        description: metadata.description,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://edubird.in",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Institutes",
            item: "https://edubird.in/institutes",
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:py-8">
        <InstituteBreadcrumb />
        <InstitutesDirectory />
      </div>
    </div>
  );
}
