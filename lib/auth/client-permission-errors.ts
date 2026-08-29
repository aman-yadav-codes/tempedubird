const FORBIDDEN_MESSAGE = "Forbidden: Admin access required";

export function getApiErrorMessage(json: unknown, fallback: string) {
  const requiredPermission =
    json &&
    typeof json === "object" &&
    "requiredPermission" in json &&
    typeof json.requiredPermission === "string"
      ? json.requiredPermission
      : "";
  const error =
    json && typeof json === "object" && "error" in json && typeof json.error === "string"
      ? json.error
      : "";

  if (requiredPermission) {
    return `Missing required permission: ${requiredPermission}`;
  }

  if (error === FORBIDDEN_MESSAGE) {
    return fallback;
  }

  if (json && typeof json === "object" && "issues" in json && json.issues && typeof json.issues === "object") {
    const issueEntries = Object.entries(json.issues as Record<string, unknown>)
      .flatMap(([field, msgs]) => Array.isArray(msgs) ? msgs.map((m) => `${field}: ${m}`) : [`${field}: ${msgs}`]);
    if (issueEntries.length > 0) {
      return `${error || "Validation failed"} (${issueEntries.join(", ")})`;
    }
  }

  return error || fallback;
}

export async function readJsonResponse(res: Response) {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: res.ok
        ? "Invalid server response"
        : "This action returned a page response instead of API data. Please try again.",
    };
  }
}
