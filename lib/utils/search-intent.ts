/**
 * Intelligent Natural Language Search Intent & Keyword Parser
 * Parses natural queries like "looking for math teacher", "need wordpress course",
 * "want to try practice for class 11th math" and resolves the target directory route
 * with clean keyword parameters.
 */

export type SearchIntentResult = {
  targetRoute: string; // e.g. "/teachers", "/courses", "/practice", "/institutes", "/notes"
  cleanQuery: string;  // e.g. "math", "wordpress", "class 11th math"
  category: "teachers" | "courses" | "practice" | "institutes" | "notes";
  isIntentDetected: boolean;
};

// Filler phrases to strip out when parsing intent
const FILLER_PHRASES = [
  "looking for a",
  "looking for an",
  "looking for the",
  "looking for",
  "lookin for a",
  "lookin for an",
  "lookin for",
  "i am looking for",
  "i'm looking for",
  "i need a",
  "i need an",
  "i need",
  "need a",
  "need an",
  "need to find",
  "need",
  "i want to find",
  "i want to try",
  "want to try",
  "want to find",
  "want to learn",
  "want to take",
  "want to prepare",
  "i want to",
  "i want a",
  "i want an",
  "want a",
  "want an",
  "want",
  "search for a",
  "search for an",
  "search for",
  "search need",
  "search",
  "find me a",
  "find me an",
  "find me",
  "find a",
  "find an",
  "find",
  "show me the",
  "show me all",
  "show me a",
  "show me an",
  "show me",
  "show all",
  "show",
  "give me",
  "can i get",
  "how to find",
  "where can i find",
  "where is",
  "where to find",
  "best",
  "top rated",
  "top",
  "good",
];

const TEACHER_KEYWORDS = [
  "teacher",
  "teachers",
  "faculty",
  "faculties",
  "mentor",
  "mentors",
  "professor",
  "professors",
  "tutor",
  "tutors",
  "sir",
  "ma'am",
  "maam",
  "educator",
  "educators",
  "instructor",
  "instructors",
  "trainer",
  "trainers",
];

const PRACTICE_KEYWORDS = [
  "practice test",
  "practice tests",
  "mock test",
  "mock tests",
  "mock exam",
  "mock exams",
  "mock quiz",
  "mock quizzes",
  "practice quiz",
  "practice quizzes",
  "practice questions",
  "practice for",
  "practice",
  "mock",
  "quiz",
  "quizzes",
  "test series",
  "question paper",
  "past paper",
  "sample paper",
  "speed test",
  "exam series",
];

const INSTITUTE_KEYWORDS = [
  "institute",
  "institutes",
  "institution",
  "institutions",
  "college",
  "colleges",
  "university",
  "universities",
  "school",
  "schools",
  "coaching center",
  "coaching institute",
  "coaching",
  "academy",
  "academies",
  "campus",
];

const NOTES_KEYWORDS = [
  "lecture notes",
  "study notes",
  "notes pdf",
  "revision notes",
  "notes",
  "handout",
  "handouts",
  "study material",
  "formula sheet",
  "formula book",
  "question bank",
];

const COURSE_KEYWORDS = [
  "course",
  "courses",
  "certification",
  "certifications",
  "degree",
  "diploma",
  "batch",
  "batches",
  "bootcamp",
  "program",
  "programs",
  "training",
  "classes",
  "class",
];

export function parseSearchIntent(rawQuery: string): SearchIntentResult {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return {
      targetRoute: "/courses",
      cleanQuery: "",
      category: "courses",
      isIntentDetected: false,
    };
  }

  let working = trimmed.toLowerCase();

  // Strip leading & embedded common filler phrases
  for (const filler of FILLER_PHRASES) {
    const regex = new RegExp(`\\b${filler}\\b`, "gi");
    working = working.replace(regex, " ");
  }

  working = working.replace(/\s+/g, " ").trim();

  // Check Category Intent
  let category: SearchIntentResult["category"] = "courses";
  let targetRoute = "/courses";
  let isIntentDetected = false;

  // 1. Check Teachers
  for (const kw of TEACHER_KEYWORDS) {
    const kwRegex = new RegExp(`\\b${kw}\\b`, "gi");
    if (kwRegex.test(working)) {
      category = "teachers";
      targetRoute = "/teachers";
      isIntentDetected = true;
      working = working.replace(kwRegex, " ");
      break;
    }
  }

  // 2. Check Practice & Exams (if not teacher)
  if (!isIntentDetected) {
    for (const kw of PRACTICE_KEYWORDS) {
      const kwRegex = new RegExp(`\\b${kw}\\b`, "gi");
      if (kwRegex.test(working)) {
        category = "practice";
        targetRoute = "/practice";
        isIntentDetected = true;
        working = working.replace(kwRegex, " ");
        break;
      }
    }
  }

  // 3. Check Institutes
  if (!isIntentDetected) {
    for (const kw of INSTITUTE_KEYWORDS) {
      const kwRegex = new RegExp(`\\b${kw}\\b`, "gi");
      if (kwRegex.test(working)) {
        category = "institutes";
        targetRoute = "/institutes";
        isIntentDetected = true;
        working = working.replace(kwRegex, " ");
        break;
      }
    }
  }

  // 4. Check Notes
  if (!isIntentDetected) {
    for (const kw of NOTES_KEYWORDS) {
      const kwRegex = new RegExp(`\\b${kw}\\b`, "gi");
      if (kwRegex.test(working)) {
        category = "notes";
        targetRoute = "/notes";
        isIntentDetected = true;
        working = working.replace(kwRegex, " ");
        break;
      }
    }
  }

  // 5. Check Course explicitly
  if (!isIntentDetected) {
    for (const kw of COURSE_KEYWORDS) {
      const kwRegex = new RegExp(`\\b${kw}\\b`, "gi");
      if (kwRegex.test(working)) {
        category = "courses";
        targetRoute = "/courses";
        isIntentDetected = true;
        working = working.replace(kwRegex, " ");
        break;
      }
    }
  }

  // Clean trailing punctuation and extra spaces
  let cleanQuery = working.replace(/[^a-zA-Z0-9\s#+.-]/g, " ").replace(/\s+/g, " ").trim();

  // If query was cleaned down to empty (e.g. user just searched "teachers"), fallback to empty or raw
  if (!cleanQuery && isIntentDetected) {
    cleanQuery = "";
  } else if (!cleanQuery) {
    cleanQuery = trimmed;
  }

  return {
    targetRoute,
    cleanQuery,
    category,
    isIntentDetected,
  };
}
