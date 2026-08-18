import type { DocumentTemplateField } from "@/lib/types/document-template";

export const AUTO_GENERATE_FIELDS_KEY = "__autoGenerateFields";

export function isCertificateNumberField(field: Pick<DocumentTemplateField, "field_name" | "label">) {
  const normalizedName = field.field_name.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const normalizedLabel = field.label.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return normalizedName === "certificatenumber" || normalizedLabel === "certificatenumber";
}

export function readAutoGenerateFields(fieldValues: Record<string, unknown>) {
  const configured = fieldValues[AUTO_GENERATE_FIELDS_KEY];
  return Array.isArray(configured)
    ? configured.filter((value): value is string => typeof value === "string")
    : [];
}

export function generateCertificateNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `CERT-${date}-${suffix}`;
}

function normalizedFieldIdentity(field: Pick<DocumentTemplateField, "field_name" | "label">) {
  return [
    field.field_name.replace(/[^a-z0-9]/gi, "").toLowerCase(),
    field.label.replace(/[^a-z0-9]/gi, "").toLowerCase(),
  ];
}

export function findDefaultDate(
  fields: DocumentTemplateField[],
  fieldValues: Record<string, unknown>
) {
  const preferredNames = [
    "achievementdate",
    "issuedate",
    "certificatedate",
    "dateofissue",
    "date",
  ];
  const dateFields = fields.filter((field) => field.field_type === "date");
  const field =
    preferredNames
      .map((name) =>
        dateFields.find((candidate) => normalizedFieldIdentity(candidate).includes(name))
      )
      .find(Boolean) ?? dateFields[0];
  const value = field ? String(fieldValues[field.field_name] ?? "").trim() : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function findDefaultTitle(
  fields: DocumentTemplateField[],
  fieldValues: Record<string, unknown>
) {
  const preferredNames = [
    "certificatetitle",
    "achievementtitle",
    "title",
    "eventname",
    "achievementname",
  ];
  for (const name of preferredNames) {
    const field = fields.find((candidate) =>
      normalizedFieldIdentity(candidate).includes(name)
    );
    const value = field ? String(fieldValues[field.field_name] ?? "").trim() : "";
    if (value) return value;
  }
  return null;
}
