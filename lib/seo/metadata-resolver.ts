/**
 * SEO & Meta Tag Template & Conditional Resolver
 * Resolves dynamic placeholders e.g. {{course_title}}, {{institution_name}}, {{city}}, etc.
 */

export interface SeoContextData {
  site_name?: string;
  course_title?: string;
  institution_name?: string;
  teacher_name?: string;
  blog_title?: string;
  author_name?: string;
  city?: string;
  area?: string;
  state?: string;
  country?: string;
  category?: string;
  price?: string | number;
  rating?: string | number;
  discount?: string | number;
  thumbnail?: string;
  institution_banner?: string;
  blog_cover?: string;
  slug?: string;
  id?: string | number;
  current_year?: string | number;
  canonical_url?: string;
  [key: string]: any;
}

export interface ConditionalRule {
  condition: string; // e.g. "city_present", "discount_active", "rating_high"
  action: string;    // e.g. "append_title", "prepend_title", "append_desc"
  value: string;     // e.g. "in {{city}}, {{state}}"
}

export interface SeoConfigTemplate {
  page_path: string;
  page_type: "static" | "dynamic_template" | "conditional_rule";
  entity_type?: string;
  meta_title: string;
  meta_description?: string | null;
  keywords?: string[] | string;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  og_url?: string | null;
  canonical_url?: string | null;
  robots_directive?: string;
  schema_markup_type?: string;
  conditional_rules?: ConditionalRule[] | string;
  is_active?: boolean;
}

export interface ResolvedMetadata {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string;
  robots: string;
  openGraph: {
    title: string;
    description: string;
    url: string;
    images: Array<{ url: string; alt?: string }>;
    type: string;
  };
  twitter: {
    card: string;
    title: string;
    description: string;
    images: string[];
  };
  jsonLdSchema: Record<string, any>;
}

export function interpolateTemplate(template: string | null | undefined, context: SeoContextData): string {
  if (!template) return "";
  const currentYear = new Date().getFullYear().toString();
  const fullContext: SeoContextData = {
    site_name: "EduBird",
    current_year: currentYear,
    ...context,
  };

  return template.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, key) => {
    const val = fullContext[key];
    return val !== undefined && val !== null ? String(val) : "";
  }).replace(/\s+/g, " ").trim();
}

export function resolveSeoMetadata(
  config: SeoConfigTemplate,
  context: SeoContextData = {}
): ResolvedMetadata {
  let rules: ConditionalRule[] = [];
  if (config.conditional_rules) {
    rules = typeof config.conditional_rules === "string"
      ? JSON.parse(config.conditional_rules)
      : config.conditional_rules;
  }

  let title = config.meta_title || "";
  let description = config.meta_description || "";
  let ogTitle = config.og_title || title;
  let ogDescription = config.og_description || description;
  let ogImage = config.og_image || "/images/og-default.png";
  let ogUrl = config.og_url || config.canonical_url || "https://edubird.net";
  let canonicalUrl = config.canonical_url || ogUrl;
  let robots = config.robots_directive || "index, follow";

  // Evaluate conditional rules
  for (const rule of rules) {
    let conditionMet = false;
    if (rule.condition === "city_present" && context.city) conditionMet = true;
    if (rule.condition === "area_present" && context.area) conditionMet = true;
    if (rule.condition === "discount_active" && context.discount && Number(context.discount) > 0) conditionMet = true;
    if (rule.condition === "rating_high" && context.rating && Number(context.rating) >= 4.5) conditionMet = true;

    if (conditionMet) {
      const resolvedValue = interpolateTemplate(rule.value, context);
      if (rule.action === "append_title") {
        title = `${title} ${resolvedValue}`;
        ogTitle = `${ogTitle} ${resolvedValue}`;
      } else if (rule.action === "prepend_title") {
        title = `${resolvedValue} ${title}`;
        ogTitle = `${resolvedValue} ${ogTitle}`;
      } else if (rule.action === "append_desc") {
        description = `${description} ${resolvedValue}`;
        ogDescription = `${ogDescription} ${resolvedValue}`;
      }
    }
  }

  const resolvedTitle = interpolateTemplate(title, context);
  const resolvedDesc = interpolateTemplate(description, context);
  const resolvedOgTitle = interpolateTemplate(ogTitle, context);
  const resolvedOgDesc = interpolateTemplate(ogDescription, context);
  const resolvedOgImage = interpolateTemplate(ogImage, context);
  const resolvedOgUrl = interpolateTemplate(ogUrl, context);
  const resolvedCanonical = interpolateTemplate(canonicalUrl, context);

  let rawKeywords: string[] = [];
  if (Array.isArray(config.keywords)) {
    rawKeywords = config.keywords;
  } else if (typeof config.keywords === "string") {
    rawKeywords = config.keywords.split(",").map((k) => k.trim());
  }

  const resolvedKeywords = rawKeywords
    .map((kw) => interpolateTemplate(kw, context))
    .filter(Boolean);

  const schemaType = config.schema_markup_type || "WebPage";

  return {
    title: resolvedTitle,
    description: resolvedDesc,
    keywords: resolvedKeywords,
    canonicalUrl: resolvedCanonical,
    robots,
    openGraph: {
      title: resolvedOgTitle,
      description: resolvedOgDesc,
      url: resolvedOgUrl,
      images: [{ url: resolvedOgImage, alt: resolvedOgTitle }],
      type: schemaType === "Article" ? "article" : "website",
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedOgTitle,
      description: resolvedOgDesc,
      images: [resolvedOgImage],
    },
    jsonLdSchema: {
      "@context": "https://schema.org",
      "@type": schemaType,
      name: resolvedTitle,
      description: resolvedDesc,
      url: resolvedCanonical,
      image: resolvedOgImage,
    },
  };
}
