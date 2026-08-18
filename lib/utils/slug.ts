export function slugify(input: string) {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function ensureUniqueSlug(db: any, table: string, baseSlug: string) {
  const allowed = new Set(["institution_profiles", "institution_programs"]);
  if (!allowed.has(table)) throw new Error("Invalid table for slug generation");

  let slug = baseSlug;
  let i = 1;

  while (true) {
    const res = await db.query(`SELECT 1 FROM ${table} WHERE slug = $1 LIMIT 1`, [slug]);
    if (!res.rows.length) return slug;
    slug = `${baseSlug}-${i++}`;
  }
}
/**
 * Validate and transform text into slug
 * @param text - Input text
 * @returns Valid slug
 */
export function validateAndSlugify(text: string): string {
  if (!text || typeof text !== "string") {
    throw new Error("Input must be a non-empty string");
  }

  const trimmed = text.trim();

  if (trimmed.length === 0) {
    throw new Error("Input cannot be empty");
  }

  if (trimmed.length > 255) {
    throw new Error("Input cannot exceed 255 characters");
  }

  return slugify(trimmed);
}