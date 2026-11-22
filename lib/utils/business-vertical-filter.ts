export interface BusinessListingsBundle {
  products: any[];
  services: any[];
  professionals: any[];
  courses: any[];
  jobs: any[];
  packages?: any[];
  properties: any[];
  vehicles: any[];
  events: any[];
  dishes: any[];
  rooms: any[];
}

/**
 * Enforces vertical-specific business isolation:
 * Real Estate & Construction -> Only Property Listings
 * Automotive & Transport -> Vehicles (+ auto services/jobs)
 * Food, Dining & Cafes -> Dishes / Food Menu
 * Hospitality & Events -> Events & Hotel Rooms / Stay
 * Education & Coaching -> Courses (+ faculty/jobs)
 * Retail & Shopping -> Products
 * Home Services & Maintenance -> Services
 * IT & Digital Agencies -> IT Jobs & Software Services
 * Professional & Financial Services -> Professionals & Advisory Services
 * Healthcare & Medical -> Healthcare Services & Specialists
 * Fitness & Sports -> Fitness Services & Personal Trainers
 * Salons & Personal Care -> Salon & Spa Services
 */
export function filterListingsByBusinessCategory(business: any, raw: BusinessListingsBundle): BusinessListingsBundle {
  const catId = Number(business?.category_id || 0);
  const catName = String(business?.category_name || "").toLowerCase();
  const catSlug = String(business?.category_slug || business?.slug || "").toLowerCase();

  // 1. Real Estate & Construction
  if (
    catId === 7824 ||
    catName.includes("real estate") ||
    catName.includes("construction") ||
    catSlug.includes("real-estate") ||
    catSlug.includes("properties") ||
    catSlug.includes("prime-estates")
  ) {
    return {
      ...raw,
      products: [],
      services: [],
      courses: [],
      vehicles: [],
      events: [],
      dishes: [],
      rooms: [],
      // Properties remain active
    };
  }

  // 2. Automotive & Transport
  if (
    catId === 7800 ||
    catName.includes("automotive") ||
    catName.includes("transport") ||
    catSlug.includes("automotive") ||
    catSlug.includes("motors") ||
    catSlug.includes("vehicles")
  ) {
    return {
      ...raw,
      products: [],
      courses: [],
      properties: [],
      events: [],
      dishes: [],
      rooms: [],
      // Vehicles remain active
    };
  }

  // 3. Food, Dining & Cafes
  if (
    catId === 7782 ||
    catName.includes("food") ||
    catName.includes("dining") ||
    catName.includes("cafe") ||
    catName.includes("restaurant") ||
    catSlug.includes("dining") ||
    catSlug.includes("cafe") ||
    catSlug.includes("royal-awadh")
  ) {
    return {
      ...raw,
      products: [],
      services: [],
      courses: [],
      properties: [],
      vehicles: [],
      events: [],
      rooms: [],
      // Dishes remain active
    };
  }

  // 4. Hospitality & Events
  if (
    catId === 7845 ||
    catName.includes("hospitality") ||
    catName.includes("event") ||
    catName.includes("banquet") ||
    catSlug.includes("celebrations") ||
    catSlug.includes("banquets") ||
    catSlug.includes("events")
  ) {
    return {
      ...raw,
      products: [],
      courses: [],
      properties: [],
      vehicles: [],
      // Events & Rooms remain active
    };
  }

  // 5. Education & Coaching
  if (
    catId === 7816 ||
    catName.includes("education") ||
    catName.includes("coaching") ||
    catSlug.includes("education") ||
    catSlug.includes("institute") ||
    catSlug.includes("edubird") ||
    catSlug.includes("maa-sharda")
  ) {
    return {
      ...raw,
      products: [],
      properties: [],
      vehicles: [],
      events: [],
      dishes: [],
      rooms: [],
      // Courses remain active
    };
  }

  // 6. Retail & Shopping
  if (
    catId === 7791 ||
    catName.includes("retail") ||
    catName.includes("shopping") ||
    catName.includes("store") ||
    catSlug.includes("silks") ||
    catSlug.includes("mart") ||
    catSlug.includes("emporium")
  ) {
    return {
      ...raw,
      properties: [],
      vehicles: [],
      courses: [],
      events: [],
      dishes: [],
      rooms: [],
      // Products remain active
    };
  }

  // 7. Home Services & Maintenance
  if (
    catId === 7852 ||
    catName.includes("home services") ||
    catName.includes("maintenance") ||
    catSlug.includes("home-services") ||
    catSlug.includes("urbanfix")
  ) {
    return {
      ...raw,
      products: [],
      properties: [],
      vehicles: [],
      courses: [],
      events: [],
      dishes: [],
      rooms: [],
      // Services remain active
    };
  }

  // 8. IT & Digital Agencies
  if (
    catId === 7831 ||
    catName.includes("it & digital") ||
    catName.includes("digital agencies") ||
    catSlug.includes("techcraft") ||
    catSlug.includes("software")
  ) {
    return {
      ...raw,
      products: [],
      properties: [],
      vehicles: [],
      courses: [],
      events: [],
      dishes: [],
      rooms: [],
      // Jobs & Services remain active
    };
  }

  // 9. Professional & Financial Services
  if (
    catId === 7838 ||
    catName.includes("professional") ||
    catName.includes("financial") ||
    catSlug.includes("legal") ||
    catSlug.includes("advisory")
  ) {
    return {
      ...raw,
      products: [],
      properties: [],
      vehicles: [],
      courses: [],
      events: [],
      dishes: [],
      rooms: [],
      // Professionals & Services remain active
    };
  }

  // 10. Healthcare & Medical
  if (
    catId === 7765 ||
    catName.includes("healthcare") ||
    catName.includes("medical") ||
    catSlug.includes("aarogya") ||
    catSlug.includes("clinic")
  ) {
    return {
      ...raw,
      properties: [],
      vehicles: [],
      courses: [],
      events: [],
      dishes: [],
      rooms: [],
      // Healthcare services & doctors remain active
    };
  }

  // 11. Fitness & Sports
  if (
    catId === 7808 ||
    catName.includes("fitness") ||
    catName.includes("sports") ||
    catSlug.includes("fitness") ||
    catSlug.includes("gym") ||
    catSlug.includes("ironcore")
  ) {
    return {
      ...raw,
      products: [],
      properties: [],
      vehicles: [],
      courses: [],
      events: [],
      dishes: [],
      rooms: [],
      // Fitness services & packages remain active
    };
  }

  // 12. Salons & Personal Care
  if (
    catId === 7774 ||
    catName.includes("salon") ||
    catName.includes("personal care") ||
    catSlug.includes("salon") ||
    catSlug.includes("spa") ||
    catSlug.includes("ganga-glow")
  ) {
    return {
      ...raw,
      products: [],
      properties: [],
      vehicles: [],
      courses: [],
      events: [],
      dishes: [],
      rooms: [],
      // Salon & Spa services remain active
    };
  }

  return raw;
}
