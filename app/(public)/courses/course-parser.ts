/**
 * Utility for parsing and formatting course / program titles into distinct attributes:
 * - Program / Class Name (e.g. "Class 1", "B.Tech in Computer Science and Engineering", "B.Com")
 * - Affiliation / Authority (Board / University / Certification Provider)
 * - Affiliation Type ("board" | "university" | "certification")
 * - Medium of Instruction (e.g. "English Medium", "Hindi Medium")
 */

export interface ParsedCourseInfo {
  rawTitle: string;
  programName: string;
  affiliation: string | null;
  affiliationType: "board" | "university" | "certification" | null;
  medium: string | null;
}

export function parseCourseTitle(
  rawTitle?: string | null,
  explicitCategory?: string | null,
  explicitBoard?: string | null,
  explicitUniversity?: string | null,
  explicitMedium?: string | null
): ParsedCourseInfo {
  let title = (rawTitle || "").trim();
  if (!title) {
    return {
      rawTitle: "",
      programName: explicitCategory || "Course",
      affiliation: explicitBoard || explicitUniversity || null,
      affiliationType: explicitBoard ? "board" : (explicitUniversity ? "university" : null),
      medium: explicitMedium || null,
    };
  }

  let medium = explicitMedium || null;
  let affiliation = explicitBoard || explicitUniversity || null;
  let affiliationType: "board" | "university" | "certification" | null = explicitBoard
    ? "board"
    : explicitUniversity
    ? "university"
    : null;

  // 1. Extract Medium if present in title string (e.g. "- English Medium", "- Hindi Medium")
  const mediumRegex = /\s*-\s*([A-Za-z\s]+(?:Medium|Media))\s*$/i;
  const mediumMatch = title.match(mediumRegex);
  if (mediumMatch) {
    if (!medium) {
      medium = mediumMatch[1].trim();
    }
    title = title.replace(mediumRegex, "").trim();
  }

  // 2. Check if title is compound: "Class 1 - Board of School Education Haryana (BSEH / HBSE)"
  const parts = title.split(/\s*-\s*/);
  let programName = title;

  if (parts.length >= 2) {
    programName = parts[0].trim();
    const potentialAffiliation = parts.slice(1).join(" - ").trim();
    if (!affiliation && potentialAffiliation) {
      affiliation = potentialAffiliation;
      if (/board|bseh|cbse|icse|state\s*board|hbse|upmsp|nios/i.test(potentialAffiliation)) {
        affiliationType = "board";
      } else if (/univ|aktu|college|institute|iit|nit/i.test(potentialAffiliation)) {
        affiliationType = "university";
      } else if (/certif|google|aws|microsoft|cisco|comptia|oracle|ibm/i.test(potentialAffiliation)) {
        affiliationType = "certification";
      } else {
        affiliationType = "board";
      }
    }
  }

  // If affiliationType still unset but affiliation exists
  if (affiliation && !affiliationType) {
    if (/board|bseh|cbse|icse|state\s*board|hbse|upmsp|nios/i.test(affiliation)) {
      affiliationType = "board";
    } else if (/univ|aktu|college|institute|iit|nit/i.test(affiliation)) {
      affiliationType = "university";
    } else if (/certif|google|aws|microsoft|cisco|comptia|oracle|ibm/i.test(affiliation)) {
      affiliationType = "certification";
    } else {
      affiliationType = "board";
    }
  }

  // Fallback program name
  if (!programName && explicitCategory) {
    programName = explicitCategory;
  }

  return {
    rawTitle: rawTitle || "",
    programName: programName || rawTitle || "Course",
    affiliation: affiliation || null,
    affiliationType: affiliationType || (affiliation ? "board" : null),
    medium: medium || null,
  };
}
