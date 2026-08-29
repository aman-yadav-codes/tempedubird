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

export async function detectCityFromCoordinates(lat: number, lng: number): Promise<string> {
  try {
    // Attempt reverse geocoding via bigdatacloud free client-safe endpoint
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (response.ok) {
      const data = await response.json();
      const detectedCity = data.city || data.locality || data.principalSubdivision || "";
      const lower = detectedCity.toLowerCase();

      // Check if matched in our known cities
      for (const city of MAJOR_INDIAN_CITIES) {
        if (city.aliases.some((alias) => lower.includes(alias)) || lower.includes(city.name.toLowerCase())) {
          return city.name;
        }
      }

      if (detectedCity.trim()) {
        return detectedCity.trim();
      }
    }
  } catch {
    // Fallback to geometric centroid calculation
  }

  return findClosestCity(lat, lng);
}
