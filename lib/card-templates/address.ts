const GOOGLE_PLUS_CODE_PREFIX = /^\s*[A-Z0-9]{4,8}\+[A-Z0-9]{2,3}(?:\s*,\s*|\s+)/i;

export function stripGooglePlusCodeFromAddress(value: string) {
  return value.replace(GOOGLE_PLUS_CODE_PREFIX, "").trimStart();
}

export function isAddressLikeTemplateField(fieldName: string, label = "") {
  const normalized = `${fieldName} ${label}`.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return normalized.includes("address");
}

export function cleanTemplateAddressValue(fieldName: string, label: string, value: string) {
  return isAddressLikeTemplateField(fieldName, label)
    ? stripGooglePlusCodeFromAddress(value)
    : value;
}

