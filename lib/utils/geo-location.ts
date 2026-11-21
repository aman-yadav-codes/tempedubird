/**
 * Geolocation & Reverse Geocoding Helper for Indian Educational Hubs
 */

export type IndianCity = {
  name: string;
  lat: number;
  lng: number;
  state: string;
  aliases: string[];
};

export const MAJOR_INDIAN_CITIES: IndianCity[] = [
  { name: "Varanasi", lat: 25.3176, lng: 82.9739, state: "Uttar Pradesh", aliases: ["benaras", "kashi", "varanasi"] },
  { name: "New Delhi", lat: 28.6139, lng: 77.2090, state: "Delhi", aliases: ["delhi", "ncr", "noida", "gurugram", "gurgaon"] },
  { name: "Mumbai", lat: 19.0760, lng: 72.8777, state: "Maharashtra", aliases: ["bombay", "mumbai", "thane", "navi mumbai"] },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946, state: "Karnataka", aliases: ["bangalore", "bengaluru"] },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639, state: "West Bengal", aliases: ["calcutta", "kolkata", "howrah"] },
  { name: "Hyderabad", lat: 17.3850, lng: 78.4867, state: "Telangana", aliases: ["hyderabad", "secunderabad"] },
  { name: "Chennai", lat: 13.0827, lng: 80.2707, state: "Tamil Nadu", aliases: ["madras", "chennai"] },
  { name: "Pune", lat: 18.5204, lng: 73.8567, state: "Maharashtra", aliases: ["pune", "poona"] },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873, state: "Rajasthan", aliases: ["jaipur", "pink city", "kota"] },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462, state: "Uttar Pradesh", aliases: ["lucknow", "kanpur", "prayagraj", "allahabad"] },
  { name: "Patna", lat: 25.5941, lng: 85.1376, state: "Bihar", aliases: ["patna", "gaya"] },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714, state: "Gujarat", aliases: ["ahmedabad", "gandhinagar", "surat"] },
  { name: "Chandigarh", lat: 30.7333, lng: 76.7794, state: "Punjab", aliases: ["chandigarh", "mohali", "panchkula"] },
];

export const ALL_AVAILABLE_LOCATIONS = [
  "All Locations",
  "Varanasi",
  "New Delhi",
  "Mumbai",
  "Bengaluru",
  "Kolkata",
  "Hyderabad",
  "Pune",
  "Jaipur",
  "Lucknow",
  "Patna",
  "Ahmedabad",
  "Chandigarh",
  "Online",
];

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findClosestCity(lat: number, lng: number): string {
  let minDistance = Infinity;
  let closestCity = "Varanasi";

  for (const city of MAJOR_INDIAN_CITIES) {
    const dist = calculateDistanceKm(lat, lng, city.lat, city.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestCity = city.name;
    }
  }

  return closestCity;
}

export type GeolocationLocationDetail = {
  city: string;
  countryCode: string;
  countryName?: string;
};

export const COUNTRY_KEYWORD_MAP: Array<{ code: string; keywords: string[] }> = [
  {
    code: "IN",
    keywords: [
      "india", "bharat", "hindustan",
      "varanasi", "benaras", "kashi", "delhi", "new delhi", "ncr", "noida", "gurgaon", "gurugram",
      "mumbai", "bombay", "thane", "navi mumbai", "bengaluru", "bangalore", "kolkata", "calcutta",
      "hyderabad", "secunderabad", "chennai", "madras", "pune", "jaipur", "lucknow", "patna",
      "ahmedabad", "surat", "chandigarh", "mohali", "panchkula", "kanpur", "prayagraj", "allahabad",
      "agra", "bhopal", "indore", "nagpur", "vadodara", "ghaziabad", "ludhiana", "nashik",
      "faridabad", "meerut", "rajkot", "gorakhpur", "bareilly", "aligarh", "moradabad", "jalandhar",
      "bhubaneswar", "dehradun", "ranchi", "raipur", "coimbatore", "kochi", "cochin", "trivandrum",
      "thiruvananthapuram", "visakhapatnam", "vizag", "vijayawada", "guntur", "mysore", "mysuru",
      "mangalore", "guwahati", "amritsar", "uttar pradesh", "maharashtra", "karnataka", "tamil nadu",
      "telangana", "gujarat", "rajasthan", "west bengal", "kerala", "bihar", "madhya pradesh",
      "punjab", "haryana", "odisha", "assam", "jharkhand", "uttarakhand", "himachal pradesh", "goa",
    ],
  },
  {
    code: "ZA",
    keywords: [
      "south africa", "suid-afrika", "mzansi",
      "johannesburg", "joburg", "jozi", "cape town", "kaapstad", "durban", "ethekwini",
      "pretoria", "tshwane", "soweto", "port elizabeth", "gqeberha", "bloemfontein", "mangaung",
      "east london", "buffalo city", "nelspruit", "mbombela", "kimberley", "polokwane", "pietersburg",
      "pietermaritzburg", "sandton", "centurion", "midrand", "roodepoort", "benoni", "boksburg",
      "germiston", "randburg", "krugersdorp", "rustenburg", "george", "paarl", "stellenbosch",
      "somerset west", "klerksdorp", "witbank", "emalahleni", "potchefstroom", "upington", "welkom",
      "vereeniging", "vanderbijlpark", "gauteng", "western cape", "kwazulu-natal", "eastern cape",
      "free state", "limpopo", "mpumalanga", "north west", "northern cape",
    ],
  },
  {
    code: "US",
    keywords: [
      "united states", "usa", "u.s.a", "u.s.", "america",
      "new york", "nyc", "los angeles", "chicago", "houston", "phoenix", "philadelphia",
      "san antonio", "san diego", "dallas", "san jose", "austin", "jacksonville", "fort worth",
      "columbus", "charlotte", "indianapolis", "san francisco", "seattle", "denver", "washington dc",
      "boston", "el paso", "nashville", "detroit", "oklahoma city", "portland", "las vegas",
      "memphis", "louisville", "baltimore", "milwaukee", "albuquerque", "tucson", "fresno",
      "sacramento", "mesa", "kansas city", "atlanta", "omaha", "colorado springs", "raleigh",
      "miami", "long beach", "virginia beach", "oakland", "minneapolis", "tulsa", "tampa",
      "arlington", "new orleans", "california", "texas", "florida", "illinois", "pennsylvania",
      "ohio", "georgia", "north carolina", "michigan",
    ],
  },
  {
    code: "GB",
    keywords: [
      "united kingdom", "uk", "great britain", "britain", "england", "scotland", "wales",
      "northern ireland", "london", "birmingham", "manchester", "glasgow", "liverpool",
      "newcastle", "sheffield", "bristol", "belfast", "edinburgh", "leeds", "cardiff",
      "leicester", "coventry", "bradford", "nottingham", "hull", "stoke", "southampton",
    ],
  },
  {
    code: "CA",
    keywords: [
      "canada", "toronto", "montreal", "vancouver", "calgary", "edmonton", "ottawa",
      "winnipeg", "quebec city", "hamilton", "kitchener", "victoria", "halifax",
      "ontario", "british columbia", "alberta", "quebec",
    ],
  },
  {
    code: "AU",
    keywords: [
      "australia", "sydney", "melbourne", "brisbane", "perth", "adelaide", "gold coast",
      "canberra", "newcastle", "wollongong", "hobart", "geelong", "townsville", "cairns",
      "darwin", "new south wales", "victoria", "queensland", "western australia",
    ],
  },
  {
    code: "AE",
    keywords: [
      "united arab emirates", "uae", "emirates", "dubai", "abu dhabi", "sharjah",
      "ajman", "ras al khaimah", "fujairah", "umm al quwain", "al ain",
    ],
  },
  {
    code: "SG",
    keywords: ["singapore", "jurong", "woodlands", "tampines", "bedok", "changi"],
  },
  {
    code: "DE",
    keywords: ["germany", "deutschland", "berlin", "munich", "frankfurt", "hamburg", "cologne", "stuttgart"],
  },
  {
    code: "FR",
    keywords: ["france", "paris", "marseille", "lyon", "toulouse", "nice", "nantes"],
  },
  {
    code: "SA",
    keywords: ["saudi arabia", "riyadh", "jeddah", "mecca", "medina", "dammam", "khobar"],
  },
  {
    code: "NZ",
    keywords: ["new zealand", "auckland", "wellington", "christchurch", "hamilton", "tauranga"],
  },
];

export function resolveCountryFromLocation(locationText?: string | null): string | null {
  if (!locationText || typeof locationText !== "string") return null;
  const lower = locationText.toLowerCase().trim();
  if (lower === "all locations" || lower === "all" || lower === "global") return null;

  // Split tokens if comma/slash separated (e.g. "Pandeypur, Varanasi, India")
  const parts = lower.split(/[,/|-]+/).map((s) => s.trim()).filter(Boolean);

  // 1. Direct match on full string or parts against mapped keywords
  for (const item of COUNTRY_KEYWORD_MAP) {
    // Check if the country code matches directly
    if (lower === item.code.toLowerCase()) return item.code;
    for (const p of parts) {
      if (p === item.code.toLowerCase()) return item.code;
    }

    // Check keywords
    for (const kw of item.keywords) {
      if (lower === kw) return item.code;
      if (parts.some((p) => p === kw || p.includes(kw))) return item.code;
      if (lower.includes(kw)) return item.code;
    }
  }

  return null;
}

export async function detectLocationDetails(lat: number, lng: number): Promise<GeolocationLocationDetail> {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (response.ok) {
      const data = await response.json();
      const detectedCity = data.city || data.locality || data.principalSubdivision || "";
      const detectedCountryCode = (data.countryCode || "").trim().toUpperCase();
      const detectedCountryName = data.countryName || "";

      let finalCity = detectedCity.trim();
      const lower = finalCity.toLowerCase();

      // If Indian coordinates, check known Indian cities list
      if (!detectedCountryCode || detectedCountryCode === "IN") {
        for (const city of MAJOR_INDIAN_CITIES) {
          if (city.aliases.some((alias) => lower.includes(alias)) || lower.includes(city.name.toLowerCase())) {
            finalCity = city.name;
            break;
          }
        }
      }

      if (finalCity) {
        return {
          city: finalCity,
          countryCode: detectedCountryCode || resolveCountryFromLocation(finalCity) || "IN",
          countryName: detectedCountryName,
        };
      }
    }
  } catch {
    // Fallback to geometric centroid calculation
  }

  const closest = findClosestCity(lat, lng);
  return {
    city: closest,
    countryCode: resolveCountryFromLocation(closest) || "IN",
    countryName: "India",
  };
}

export async function detectCityFromCoordinates(lat: number, lng: number): Promise<string> {
  const detail = await detectLocationDetails(lat, lng);
  return detail.city;
}
