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
  const baseBizSlug = slugify(biz.slug || biz.name || `business-${biz.id}`);
  const rawCat = biz.category_name || biz.category_slug || "";
  const catSlug = slugify(rawCat);
  if (!catSlug || catSlug === "services" || catSlug === "general" || catSlug === "businesses") {
    return `/business/${baseBizSlug}`;
  }
  const subcatSlug = slugify(biz.subcategory_name || biz.subcategory_slug || "");

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
  const baseSlug = job.slug || slugify(job.title || job.name || `job-${job.id}`);
  return `/jobs/${baseSlug}`;
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

const KNOWN_COUNTRIES = new Set([
  "india", "in",
  "united states", "usa", "us", "america",
  "united kingdom", "uk", "gb", "great britain",
  "canada", "ca",
  "australia", "au",
  "uae", "united arab emirates", "ae",
  "singapore", "sg",
  "germany", "de", "deutschland",
  "france", "fr",
  "saudi arabia", "sa", "ksa",
  "new zealand", "nz",
  "south africa", "south-africa", "za", "rsa"
]);

const KNOWN_STATES = new Set([
  "uttar pradesh", "up", "maharashtra", "delhi", "new delhi", "rajasthan",
  "bihar", "karnataka", "punjab", "west bengal", "tamil nadu", "telangana",
  "gujarat", "haryana", "madhya pradesh", "mp", "kerala", "odisha", "assam"
]);

/**
 * Cleanly extract only the City name from any composite address or location string.
 * Strips countries, states, and postal codes.
 */
export function extractCleanCity(locationRaw?: string | null): string {
  if (!locationRaw) return "";
  const trimmed = locationRaw.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "all locations" || lower === "all" || lower === "worldwide") return "";
  if (KNOWN_COUNTRIES.has(lower)) return "";

  // Check known Indian cities and common localities/aliases
  if (lower.includes("varanasi") || lower.includes("kashi") || lower.includes("benaras") || lower.includes("pandeypur") || lower.includes("sigra")) {
    return "Varanasi";
  }
  if (lower.includes("delhi") || lower.includes("noida") || lower.includes("gurgaon") || lower.includes("gurugram")) {
    return "New Delhi";
  }
  if (lower.includes("mumbai") || lower.includes("bombay") || lower.includes("thane")) {
    return "Mumbai";
  }
  if (lower.includes("bengaluru") || lower.includes("bangalore")) {
    return "Bengaluru";
  }
  if (lower.includes("kolkata") || lower.includes("calcutta")) {
    return "Kolkata";
  }
  if (lower.includes("hyderabad") || lower.includes("secunderabad")) {
    return "Hyderabad";
  }
  if (lower.includes("lucknow") || lower.includes("kanpur") || lower.includes("prayagraj") || lower.includes("allahabad")) {
    return "Lucknow";
  }
  if (lower.includes("jaipur") || lower.includes("kota")) return "Jaipur";
  if (lower.includes("pune")) return "Pune";
  if (lower.includes("chennai")) return "Chennai";
  if (lower.includes("patna")) return "Patna";
  if (lower.includes("ahmedabad") || lower.includes("surat")) return "Ahmedabad";
  if (lower.includes("chandigarh")) return "Chandigarh";

  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
    const filtered = parts.filter((p) => {
      const pLow = p.toLowerCase();
      return !KNOWN_COUNTRIES.has(pLow) && !KNOWN_STATES.has(pLow) && !/^\d{5,6}$/.test(pLow);
    });
    if (filtered.length > 0) {
      return filtered[filtered.length - 1];
    }
    return "";
  }

  if (KNOWN_STATES.has(lower)) return "";
  return trimmed;
}

/**
 * Extract canonical city name and slug for SEO URLs
 * E.g. "Pandeypur Chauraha, Varanasi" -> "varanasi"
 * E.g. "India" -> "" (Country is not a city)
 */
export function extractCanonicalCitySlug(locationRaw?: string | null): string {
  const city = extractCleanCity(locationRaw);
  return city ? slugify(city) : "";
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
  else if (normType === "property" || normType === "properties") prefix = "/properties";
  else if (normType === "vehicle" || normType === "vehicles") prefix = "/vehicles";
  else if (normType === "event" || normType === "events") prefix = "/events";
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

export const KNOWN_CATEGORY_SLUG_LABELS: Record<string, string> = {
  // Property
  "all-properties": "Properties & Real Estate",
  "property-commercial-properties": "Commercial Properties",
  "property-residential-real-estate": "Residential Real Estate",
  "property-industrial-warehousing-estates": "Industrial & Warehousing Estates",
  "property-plots-development-lands": "Plots & Development Lands",
  "commercial-properties": "Commercial Properties",
  "residential-real-estate": "Residential Real Estate",
  "industrial-warehousing-estates": "Industrial & Warehousing Estates",
  "plots-development-lands": "Plots & Development Lands",
  // Vehicles
  "all-vehicles": "Vehicles & Mobility",
  "vehicle-passenger-cars-suvs": "Passenger Cars & SUVs",
  "vehicle-commercial-transport-vehicles": "Commercial & Transport Vehicles",
  "vehicle-two-wheelers-motorcycles": "Two-Wheelers & Motorcycles",
  "vehicle-luxury-exotic-automobiles": "Luxury & Exotic Automobiles",
  "passenger-cars-suvs": "Passenger Cars & SUVs",
  "commercial-transport-vehicles": "Commercial & Transport Vehicles",
  "two-wheelers-motorcycles": "Two-Wheelers & Motorcycles",
  "luxury-exotic-automobiles": "Luxury & Exotic Automobiles",
  // Events
  "all-events": "Events & Expos",
  "event-corporate-industry-events": "Corporate & Industry Events",
  "event-live-entertainment-cultural-shows": "Live Entertainment & Cultural Shows",
  "event-sports-fitness-tournaments": "Sports & Fitness Tournaments",
  "event-weddings-social-galas": "Weddings & Social Galas",
  "corporate-industry-events": "Corporate & Industry Events",
  "live-entertainment-cultural-shows": "Live Entertainment & Cultural Shows",
  "sports-fitness-tournaments": "Sports & Fitness Tournaments",
  "weddings-social-galas": "Weddings & Social Galas",
  // Professionals
  "all-professionals": "Professionals & Consultants",
  "doctors-and-healthcare-specialists": "Doctors & Healthcare Specialists",
  "academic-tutors-and-education-specialists": "Academic, Tutors & Education Specialists",
  "chartered-accountants-and-financial-advisors": "Chartered Accountants & Financial Advisors",
  "legal-law-and-compliance-experts": "Legal & Law Experts",
  "design-architecture-and-creative-experts": "Design, Architecture & Creative Experts",
  "business-strategy-and-management-consultants": "Business & Strategy Consultants",
  "fitness-wellness-and-sports-trainers": "Fitness & Wellness Trainers",
  "beauty-hair-and-styling-artists": "Beauty & Styling Artists",
  // Jobs
  "all-job-openings": "Job Openings & Careers",
  "administration-hr": "Administration & HR",
  "job-automotive-engineering-operations": "Automotive Engineering & Operations",
  "finance-accounting": "Finance & Accounting",
  "job-healthcare-medical-services": "Healthcare & Medical Services",
  "job-hospitality-restaurant-culinary": "Hospitality & Restaurant Culinary",
  "job-real-estate-construction": "Real Estate & Construction",
  "hospitality-retail-store-operations": "Retail & Store Operations",
  "automotive-engineering-operations": "Automotive Engineering & Operations",
  "healthcare-medical-services": "Healthcare & Medical Services",
  "hospitality-restaurant-culinary": "Hospitality & Restaurant Culinary",
  "real-estate-construction": "Real Estate & Construction",
  // Products
  "all-products": "Products & Merchandise",
  "electronics-and-gadgets": "Electronics & Gadgets",
  "automobiles-cars-and-electric-vehicles": "Automobiles, Cars & Electric Vehicles",
  "building-materials-and-construction-hardware": "Building Materials & Construction",
  "books-and-study-materials": "Books & Study Materials",
  "fashion-accessories-and-footwear": "Fashion Accessories & Apparel",
  "packaged-foods-and-gourmet-groceries": "Bakery & Gourmet Foods",
  "event-decor-and-celebration-supplies": "Event Supplies & Decor",
  "kitchenware-and-appliances": "Kitchenware & Appliances",
  "baby-care": "Baby Care",
  "dairy-products": "Dairy Products",
  "fruits-and-vegetables": "Fruits & Vegetables",
  "meat-fish-poultry": "Meat, Fish & Poultry",
  "chicken-meat-fish": "Chicken, Meat & Fish",
  "bakery-biscuits": "Bakery & Biscuits",
  "bath-body": "Bath & Body",
  "beauty-cosmetics": "Beauty & Cosmetics",
  "chips-namkeen": "Chips & Namkeen",
  "atta-rice-dal": "Atta, Rice & Dal",
  "automotive-spare-parts-accessories": "Automotive Spare Parts & Accessories",
  // Businesses
  "all-businesses": "Local Businesses & Stores",
  "education-and-coaching": "Education & Coaching",
  "fitness-and-sports": "Fitness & Sports",
  "food-dining-and-cafes": "Food, Dining & Cafes",
  "healthcare-and-medical": "Healthcare & Medical",
  "home-services-and-maintenance": "Home Services & Maintenance",
  "hospitality-and-events": "Hospitality & Events",
  "it-and-digital-agencies": "IT & Digital Agencies",
  "professional-and-financial-services": "Professional & Financial Services",
  "real-estate-and-construction": "Real Estate & Construction",
  "retail-and-shopping": "Retail & Shopping",
  "salons-and-personal-care": "Salons & Personal Care",
};

/**
 * Format any category slug into a clean, human-readable display title.
 * E.g. "property-commercial-properties" -> "Commercial Properties"
 * E.g. "academic-tutors-and-education-specialists" -> "Academic, Tutors & Education Specialists"
 */
export function formatCategorySlug(slug?: string | null): string {
  if (!slug) return "";
  const trimmed = slug.trim().toLowerCase();
  if (KNOWN_CATEGORY_SLUG_LABELS[trimmed]) {
    return KNOWN_CATEGORY_SLUG_LABELS[trimmed];
  }
  // Strip known vertical prefixes (e.g. property-, vehicle-, event-, job-, etc.)
  const stripped = trimmed.replace(/^(property|vehicle|event|job|service|product|business)-/, "");
  if (KNOWN_CATEGORY_SLUG_LABELS[stripped]) {
    return KNOWN_CATEGORY_SLUG_LABELS[stripped];
  }
  // Title-case words and convert "and" to "&"
  return stripped
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .replace(/\bAnd\b/g, "&");
}

/**
 * Parse structured discovery / listing slug
 * Example: "doctors-and-healthcare-in-varanasi" -> { categorySlug: "doctors-and-healthcare", categoryName: "Doctors & Healthcare Specialists", locationSlug: "varanasi", city: "Varanasi" }
 */
export function parseDiscoverySeoSlug(slug: string | undefined | null) {
  if (!slug) return { categorySlug: "", categoryName: "", locationSlug: "", city: "" };
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

  if (locationSlug && KNOWN_COUNTRIES.has(locationSlug.toLowerCase())) {
    locationSlug = "";
  }

  const city = locationSlug
    ? locationSlug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "";

  const categoryName = categorySlug ? formatCategorySlug(categorySlug) : "";

  return { categorySlug, categoryName, locationSlug, city: extractCleanCity(city) || city };
}
