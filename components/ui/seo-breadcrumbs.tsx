import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function SeoBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const fullItems = [
    { label: "Home", href: "/" },
    ...items,
  ];

  // Schema.org BreadcrumbList structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: fullItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.href ? `https://edubird.com${item.href}` : undefined,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="flex items-center text-xs sm:text-sm text-muted-foreground py-2 overflow-x-auto scrollbar-none">
        <ol className="flex items-center gap-1.5 whitespace-nowrap">
          {fullItems.map((item, index) => {
            const isLast = index === fullItems.length - 1;
            return (
              <li key={index} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />}
                {index === 0 && <Home className="h-3.5 w-3.5 text-primary shrink-0 mr-0.5" />}

                {isLast || !item.href ? (
                  <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-[320px]" title={item.label}>
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="hover:text-primary transition-colors hover:underline truncate max-w-[160px] sm:max-w-[220px]"
                    title={item.label}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
