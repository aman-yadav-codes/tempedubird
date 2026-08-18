/**
 * Capitalize the first letter of each word
 * @param text - Input text
 * @returns Capitalized text
 */
export function capitalize(text: string): string {
    if (!text) return "";
    return text
        .trim()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

/**
 * Validate and transform input text to proper capitalization
 * @param text - Input text to validate and transform
 * @returns Validated and capitalized text
 */
export function validateAndCapitalize(text: string): string {
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

    return capitalize(trimmed);
}
