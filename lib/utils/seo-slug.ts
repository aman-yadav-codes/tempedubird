/**
 * Utility functions for generating and parsing SEO-friendly URLs across EduBird
 */

/**
 * Convert any string to a clean URL slug (lower case, hyphens instead of spaces/special chars)
 */
export function slugify(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove special characters
    .replace(/[\s_-]+/g, "-") // replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // trim hyphens
}

/**
 * Extract numeric ID from a slugified parameter (e.g. "155-apex-institute-varanasi" -> 155, or "155" -> 155)
 */
export function extractIdFromSlug(param: string | number | undefined): { id: number; slug: string } {
  if (!param) return { id: 0, slug: "" };
  const str = String(param).trim();
  const match = str.match(/^(\d+)(?:-(.*))?$/);
  if (match) {
    return {
      id: parseInt(match[1], 10),
      slug: match[2] || "",
    };
  }
  const numeric = parseInt(str, 10);
  return {
    id: isNaN(numeric) ? 0 : numeric,
    slug: "",
  };
}

/**
 * Build SEO-friendly URL for an Institution
 * Format: /institutes/{id}-{slugified-name}-{slugified-city}
 */
export function buildInstituteUrl(id: number | string, name: string, city?: string | null): string {
  const nameSlug = slugify(name);
  const citySlug = slugify(city);
  const parts = [id, nameSlug, citySlug].filter(Boolean);
  return `/institutes/${parts.join("-")}`;
}

/**
 * Build SEO-friendly URL for a Course
 * Format: /courses/{id}-{slugified-course-name}-{slugified-institution-name}-{slugified-city}
 */
export function buildCourseUrl(
  id: number | string,
  courseTitle: string,
  institutionName?: string | null,
  city?: string | null
): string {
  const courseSlug = slugify(courseTitle);
  const instSlug = slugify(institutionName);
  const citySlug = slugify(city);
  const parts = [id, courseSlug, instSlug, citySlug].filter(Boolean);
  return `/courses/${parts.join("-")}`;
}

/**
 * Build SEO-friendly URL for a Teacher / Faculty Member
 * Format: /teachers/{id}-{slugified-teacher-name}-{slugified-designation}-{slugified-institution-name}-{slugified-city}
 */
export function buildTeacherUrl(
  id: number | string,
  teacherName: string,
  designation?: string | null,
  institutionName?: string | null,
  city?: string | null
): string {
  const nameSlug = slugify(teacherName);
  const desigSlug = slugify(designation);
  const instSlug = slugify(institutionName);
  const citySlug = slugify(city);
  const parts = [id, nameSlug, desigSlug, instSlug, citySlug].filter(Boolean);
  return `/teachers/${parts.join("-")}`;
}

/**
 * Build rich SEO-friendly URL for a Business Profile
 * Format: /{main-category}/{sub-category}-{business-name}-in-{locality}-{city}
 * Example: /salons-personal-care/beauty-parlour-anjali-arora-pvt-ltd-in-pandeypur-varanasi
 */
export function buildBusinessSeoUrl(biz: {
  id?: number | string;
  name?: string;
  slug?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  subcategory_name?: string | null;
  subcategory_slug?: string | null;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
  country_code?: string | null;
}): string {
  const catSlug = slugify(biz.category_name || biz.category_slug || "services") || "services";
  const subcatSlug = slugify(biz.subcategory_name || biz.subcategory_slug || "");
  const baseBizSlug = slugify(biz.slug || biz.name || `business-${biz.id}`);

  // Format location: locality, city, state
  const locParts = [biz.locality, biz.city, biz.state].filter(Boolean).map((s) => slugify(s));
  const locSlug = locParts.length > 0 ? locParts.join("-") : "";

  let itemPart = baseBizSlug;
  // Prepend subcategory if present and not already part of business slug
  if (subcatSlug && !baseBizSlug.includes(subcatSlug)) {
    itemPart = `${subcatSlug}-${baseBizSlug}`;
  }
  // Append location with "-in-" if location present and not already in slug
  if (locSlug && !itemPart.includes(locSlug)) {
    itemPart = `${itemPart}-in-${locSlug}`;
  }

  return `/${catSlug}/${itemPart}`;
}

/**
 * Build rich SEO-friendly URL for a Professional Profile
 * Format: /{profession-type-or-category}/{designation-or-subcategory}-{name}-in-{locality}-{city}
 * Example: /agri-supply-manager/quality-sourcing-ramesh-kumar-in-new-delhi
 */
export function buildProfessionalSeoUrl(prof: {
  id?: number | string;
  name?: string;
  slug?: string | null;
  profession_type?: string | null;
  designation?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  subcategory_name?: string | null;
  subcategory_slug?: string | null;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
}): string {
  const catSlug = slugify(prof.category_name || prof.category_slug || prof.profession_type || "consultants") || "consultants";
  const subcatSlug = slugify(prof.subcategory_name || prof.subcategory_slug || prof.designation || "");
  const baseProfSlug = slugify(prof.slug || prof.name || `professional-${prof.id}`);

  const locParts = [prof.locality, prof.city, prof.state].filter(Boolean).map((s) => slugify(s));
  const locSlug = locParts.length > 0 ? locParts.join("-") : "";

  let itemPart = baseProfSlug;
  if (subcatSlug && !baseProfSlug.includes(subcatSlug)) {
    itemPart = `${subcatSlug}-${baseProfSlug}`;
  }
  if (locSlug && !itemPart.includes(locSlug)) {
    itemPart = `${itemPart}-in-${locSlug}`;
  }

  return `/${catSlug}/${itemPart}`;
}
