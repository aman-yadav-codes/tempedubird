export const INDIAN_TIME_ZONE = "Asia/Kolkata";

function parseDatabaseDate(value: string | number | Date) {
  if (typeof value !== "string") return new Date(value);

  const trimmed = value.trim();
  if (!trimmed) return new Date(NaN);

  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  if (hasTimezone) return new Date(trimmed);

  // PostgreSQL timestamp columns commonly arrive without a timezone suffix.
  // Admin timestamps are stored as India Standard Time, so parse naive strings
  // with +05:30 instead of letting the browser guess a timezone.
  return new Date(`${trimmed.replace(" ", "T")}+05:30`);
}

export function formatIndianRelativeTime(value: string | number | Date) {
  const date = parseDatabaseDate(value);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) return "-";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (diffSeconds < 60) return `${Math.max(1, diffSeconds)}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIAN_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatIndianDate(value: string | number | Date) {
  const date = parseDatabaseDate(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIAN_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatIndianDateTime(value: string | number | Date) {
  const date = parseDatabaseDate(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIAN_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
