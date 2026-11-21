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
 * Extract numeric ID from a slugified parameter (e.g. "155-apex-institute-varanasi" -> 155, "item-title-51" -> 51, or "155" -> 155)
 */
export function extractIdFromSlug(param: string | number | undefined): { id: number; slug: string } {
  if (!param) return { id: 0, slug: "" };
  const str = String(param).trim();

  // Strip trailing -in-location if present for ID extraction purposes
  let cleanStr = str;
  const lastInIdx = str.lastIndexOf("-in-");
  if (lastInIdx !== -1) {
    const afterIn = str.substring(lastInIdx + 4);
    // Location suffix should not end with digits (IDs) and not be part of phrases like "-in-store-"
    if (!/\d+$/.test(afterIn) && !afterIn.includes("-store") && afterIn !== "store") {
      cleanStr = str.substring(0, lastInIdx);
    }
  }

  // 1. Pure number: e.g. "155"
  if (/^\d+$/.test(cleanStr)) {
    return { id: parseInt(cleanStr, 10), slug: "" };
  }

  // 2. Leading number: e.g. "155-apex-institute-varanasi"
  const leadingMatch = cleanStr.match(/^(\d+)-(.*)$/);
  if (leadingMatch) {
    return {
      id: parseInt(leadingMatch[1], 10),
      slug: leadingMatch[2] || "",
    };
  }

  // 3. Trailing number: e.g. "service-title-varanasi-51" or "product-item-1278"
  const trailingMatch = cleanStr.match(/^(.*)-(\d+)$/);
  if (trailingMatch) {
    return {
      id: parseInt(trailingMatch[2], 10),
      slug: trailingMatch[1] || "",
    };
  }

  // 4. Fallback parseInt if str starts with digits
  const numeric = parseInt(cleanStr, 10);
  return {
    id: isNaN(numeric) ? 0 : numeric,
    slug: cleanStr,
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
  const locSlug = locParts.length > 0 ? locParts.join("-") : "varanasi";

  let itemPart = baseProfSlug;
  if (subcatSlug && !baseProfSlug.includes(subcatSlug)) {
    itemPart = `${subcatSlug}-${baseProfSlug}`;
  }
  if (locSlug && !itemPart.includes(locSlug)) {
    itemPart = `${itemPart}-in-${locSlug}`;
  }

  return `/${catSlug}/${itemPart}`;
}

/**
 * Build rich SEO-friendly URL for a Service
 * Format: /{category}/{service-title}-in-{locality}-{city}
 * Example: /home-services/ac-repair-installation-in-pandeypur-varanasi
 */
export function buildServiceSeoUrl(service: {
  id?: number | string;
  name?: string;
  title?: string;
  slug?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  subcategory_name?: string | null;
  subcategory_slug?: string | null;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
  seller_info?: any;
}): string {
  const catSlug = slugify(service.category_name || service.category_slug || "services") || "services";
  const title = service.title || service.name || `service-${service.id}`;
  const baseSlug = slugify(service.slug || title);
  const city = service.city || service.seller_info?.city || service.state || "varanasi";
  const locality = service.locality || service.seller_info?.locality || "";
  const locParts = [locality, city].filter(Boolean).map((s) => slugify(s));
  const locSlug = locParts.length > 0 ? locParts.join("-") : "varanasi";

  let itemPart = baseSlug;
  if (locSlug && !itemPart.includes(locSlug)) {
    itemPart = `${itemPart}-in-${locSlug}`;
  }

  return `/${catSlug}/${itemPart}`;
}

/**
 * Build rich SEO-friendly URL for a Course / Academic Program
 * Format: /{category}/{course-name}-in-{locality}-{city}
 * Example: /education-coaching/iit-jee-neet-foundation-in-pandeypur-varanasi
 */
export function buildCourseSeoUrl(course: {
  id?: number | string;
  name?: string;
  title?: string;
  slug?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  subcategory_name?: string | null;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
  institution_name?: string | null;
}): string {
  const catSlug = slugify(course.category_name || course.category_slug || "education-coaching") || "education-coaching";
  const title = course.name || course.title || `course-${course.id}`;
  const baseSlug = slugify(course.slug || title);
  const city = course.city || "varanasi";
  const locality = course.locality || "";
  const locParts = [locality, city].filter(Boolean).map((s) => slugify(s));
  const locSlug = locParts.length > 0 ? locParts.join("-") : "varanasi";

  let itemPart = baseSlug;
  if (locSlug && !itemPart.includes(locSlug)) {
    itemPart = `${itemPart}-in-${locSlug}`;
  }

  return `/${catSlug}/${itemPart}`;
}

/**
 * Build rich SEO-friendly URL for a Job Opening / Career Vacancy
 * Format: /{category}/{job-title}-in-{locality}-{city}
 * Example: /jobs/senior-physics-faculty-in-pandeypur-varanasi
 */
export function buildJobSeoUrl(job: {
  id?: number | string;
  title?: string;
  name?: string;
  slug?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  department?: string | null;
  locality?: string | null;
  location?: string | null;
  city?: string | null;
}): string {
  const catSlug = slugify(job.category_name || job.category_slug || job.department || "jobs") || "jobs";
  const title = job.title || job.name || `job-${job.id}`;
  const baseSlug = slugify(job.slug || title);
  const city = job.city || job.location || "varanasi";
  const locality = job.locality || "";
  const locParts = [locality, city].filter(Boolean).map((s) => slugify(s));
  const locSlug = locParts.length > 0 ? locParts.join("-") : "varanasi";

  let itemPart = baseSlug;
  if (locSlug && !itemPart.includes(locSlug)) {
    itemPart = `${itemPart}-in-${locSlug}`;
  }

  return `/${catSlug}/${itemPart}`;
}

/**
 * Build rich SEO-friendly URL for a Product / Merchandise Listing
 * Format: /{category}/{product-title}-in-{locality}-{city}
 * Example: /education-coaching/neet-jee-physics-question-bank-in-varanasi
 */
export function buildProductSeoUrl(product: {
  id?: number | string;
  name?: string;
  title?: string;
  slug?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  brand_name?: string | null;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
  seller_info?: any;
}): string {
  const catSlug = slugify(product.category_name || product.category_slug || "products") || "products";
  const title = product.title || product.name || `product-${product.id}`;
  const baseSlug = slugify(product.slug || title);
  const city = product.city || product.seller_info?.city || product.state || "varanasi";
  const locality = product.locality || product.seller_info?.locality || "";
  const locParts = [locality, city].filter(Boolean).map((s) => slugify(s));
  const locSlug = locParts.length > 0 ? locParts.join("-") : "varanasi";

  let itemPart = baseSlug;
  if (locSlug && !itemPart.includes(locSlug)) {
    itemPart = `${itemPart}-in-${locSlug}`;
  }

  return `/${catSlug}/${itemPart}`;
}

/**
 * Build rich SEO-friendly URL for Real Estate / Property Listing
 * Format: /{category}/{property-title}-in-{locality}-{city}
 * Example: /real-estate/coaching-center-commercial-floor-in-pandeypur-varanasi
 */
export function buildPropertySeoUrl(prop: {
  id?: number | string;
  name?: string;
  title?: string;
  slug?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  property_type?: string | null;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
}): string {
  const catSlug = slugify(prop.category_name || prop.category_slug || prop.property_type || "property") || "property";
  const title = prop.title || prop.name || `property-${prop.id}`;
  const baseSlug = slugify(prop.slug || title);
  const city = prop.city || prop.state || "varanasi";
  const locality = prop.locality || "";
  const locParts = [locality, city].filter(Boolean).map((s) => slugify(s));
  const locSlug = locParts.length > 0 ? locParts.join("-") : "varanasi";

  let itemPart = baseSlug;
  if (locSlug && !itemPart.includes(locSlug)) {
    itemPart = `${itemPart}-in-${locSlug}`;
  }

  return `/${catSlug}/${itemPart}`;
}

/**
 * Extract canonical city name and slug for SEO URLs
 * E.g. "Pandeypur Chauraha, Varanasi" -> "varanasi"
 * E.g. "Pandeypur Chauraha" -> "varanasi" (resolves known area to city)
 */
export function extractCanonicalCitySlug(locationRaw?: string | null): string {
  if (!locationRaw || locationRaw.toLowerCase() === "all locations" || locationRaw.toLowerCase() === "all") return "";
  let raw = locationRaw.trim();
  if (raw.includes(",")) {
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    raw = parts[parts.length - 1] || parts[0];
  }
  if (raw.toLowerCase().includes("pandeypur")) {
    return "varanasi";
  }
  return slugify(raw);
}

/**
 * Build structured discovery / listing SEO URL
 * Format: /{listingType}/{category-slug}-in-{location}
 * Example: /professionals/doctors-and-healthcare-in-varanasi
 */
export function buildDiscoverySeoUrl({
  type,
  category,
  subcategory,
  location,
  city,
  locality,
}: {
  type?: string | null;
  category?: string | null;
  subcategory?: string | null;
  location?: string | null;
  city?: string | null;
  locality?: string | null;
}): string {
  const normType = (type || "").toLowerCase().trim();
  let prefix = "/businesses";
  if (normType === "professional" || normType === "professionals") prefix = "/professionals";
  else if (normType === "product" || normType === "products") prefix = "/products";
  else if (normType === "course" || normType === "courses") prefix = "/courses";
  else if (normType === "job" || normType === "jobs") prefix = "/jobs";
  else if (normType === "business" || normType === "businesses") prefix = "/businesses";
  else if (normType === "service" || normType === "services") prefix = "/services";
  else if (normType === "property" || normType === "properties") prefix = "/businesses";
  else if (normType === "event" || normType === "events") prefix = "/businesses";
  else if (!normType || normType === "all") {
    prefix = "/businesses";
  }

  const rawCat = subcategory || category || "";
  let catSlug = slugify(rawCat);
  if (catSlug.startsWith("all-")) catSlug = "";

  const locRaw = city || location || [locality, city].filter(Boolean).join(" ") || locality || "";
  const locSlug = extractCanonicalCitySlug(locRaw);

  if (catSlug && locSlug) {
    return `${prefix}/${catSlug}-in-${locSlug}`;
  }
  if (catSlug) {
    return `${prefix}/${catSlug}`;
  }
  if (locSlug) {
    return `${prefix}/in-${locSlug}`;
  }
  return prefix;
}

/**
 * Parse structured discovery / listing slug
 * Example: "doctors-and-healthcare-in-varanasi" -> { categorySlug: "doctors-and-healthcare", locationSlug: "varanasi", city: "Varanasi" }
 */
export function parseDiscoverySeoSlug(slug: string | undefined | null) {
  if (!slug) return { categorySlug: "", locationSlug: "", city: "" };
  const raw = String(slug).trim();

  let categorySlug = raw;
  let locationSlug = "";

  const inIndex = raw.lastIndexOf("-in-");
  if (inIndex !== -1) {
    categorySlug = raw.substring(0, inIndex);
    locationSlug = raw.substring(inIndex + 4);
  } else if (raw.startsWith("in-")) {
    categorySlug = "";
    locationSlug = raw.substring(3);
  }

  if (categorySlug.startsWith("all-")) {
    categorySlug = "";
  }

  const city = locationSlug
    ? locationSlug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "";

  return { categorySlug, locationSlug, city };
}
