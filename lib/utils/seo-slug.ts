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
