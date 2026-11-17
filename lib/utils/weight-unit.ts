export interface WeightOption {
  key: string;
  label: string; // e.g. "500 g", "1 kg"
  shortLabel: string; // e.g. "500g", "1kg"
  grams: number; // e.g. 500
}

export const STANDARD_WEIGHT_OPTIONS: WeightOption[] = [
  { key: "100g", label: "100 g", shortLabel: "100g", grams: 100 },
  { key: "250g", label: "250 g", shortLabel: "250g", grams: 250 },
  { key: "500g", label: "500 g", shortLabel: "500g", grams: 500 },
  { key: "1kg", label: "1 kg", shortLabel: "1kg", grams: 1000 },
  { key: "2kg", label: "2 kg", shortLabel: "2kg", grams: 2000 },
  { key: "5kg", label: "5 kg", shortLabel: "5kg", grams: 5000 },
];

/**
 * Checks if the unit corresponds to weight (KG, grams, 500g, etc.)
 */
export function isWeightBasedProduct(unit?: string | null): { isWeight: boolean; baseGrams: number; defaultKey: string } {
  if (!unit) return { isWeight: false, baseGrams: 0, defaultKey: "1kg" };
  const u = unit.trim().toLowerCase();

  // KG variants
  if (
    u === "kg" ||
    u === "kgs" ||
    u === "kilogram" ||
    u === "kilograms" ||
    u === "kilo" ||
    u === "/kg" ||
    u.endsWith("/kg") ||
    u.endsWith("/ kg") ||
    u.startsWith("kg ") ||
    u.includes("per kg")
  ) {
    return { isWeight: true, baseGrams: 1000, defaultKey: "1kg" };
  }

  // 500g variants
  if (u === "500g" || u === "500 g" || u === "500 gm" || u === "500gm" || u.endsWith("/500g") || u.endsWith("/ 500g")) {
    return { isWeight: true, baseGrams: 500, defaultKey: "500g" };
  }

  // 250g variants
  if (u === "250g" || u === "250 g" || u === "250 gm" || u === "250gm" || u.endsWith("/250g")) {
    return { isWeight: true, baseGrams: 250, defaultKey: "250g" };
  }

  // 100g variants
  if (u === "100g" || u === "100 g" || u === "100 gm") {
    return { isWeight: true, baseGrams: 100, defaultKey: "100g" };
  }

  // General grams
  if (u === "g" || u === "gm" || u === "gram" || u === "grams") {
    return { isWeight: true, baseGrams: 1, defaultKey: "100g" };
  }

  return { isWeight: false, baseGrams: 0, defaultKey: "1kg" };
}

/**
 * Backwards compatibility helper for isKgUnit
 */
export function isKgUnit(unit?: string | null): boolean {
  return isWeightBasedProduct(unit).isWeight;
}

/**
 * Compute the price for target grams given the base price and base grams.
 */
export function calculateWeightPrice(basePrice: number, baseGrams: number, targetGrams: number): number {
  if (!basePrice || isNaN(basePrice) || basePrice <= 0 || !baseGrams || baseGrams <= 0) return 0;
  const pricePerGram = basePrice / baseGrams;
  const raw = pricePerGram * targetGrams;
  const rounded = Math.round(raw * 100) / 100;
  return rounded;
}

/**
 * Format price cleanly (e.g. ₹17.50 or ₹18)
 */
export function formatWeightPrice(price: number): string {
  if (Number.isInteger(price)) {
    return price.toLocaleString("en-IN");
  }
  return price.toFixed(2);
}

/**
 * Formats grams to readable display (e.g. 500g -> "500 g", 1000g -> "1 kg", 1500g -> "1.5 kg")
 */
export function formatGramsDisplay(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${Number.isInteger(kg) ? kg : kg.toFixed(2)} kg`;
  }
  return `${grams} g`;
}
