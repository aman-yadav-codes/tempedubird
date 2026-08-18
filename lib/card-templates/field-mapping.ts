import type { DocumentFieldType, DocumentTemplateField } from "@/lib/types/document-template";
import { cleanTemplateAddressValue } from "@/lib/card-templates/address";

export type DocumentSourceField = {
  key: string;
  label: string;
  group: string;
  type: DocumentFieldType;
  description: string;
};

export type DocumentTemplateFieldMapping = {
  id?: number;
  template_id?: number;
  institution_id: number | null;
  template_field_id?: number | null;
  template_field_name: string;
  source_field_key: string;
  source_field_label: string;
  transform: string;
  fallback_value: string | null;
  is_active?: boolean;
};

export const DOCUMENT_SOURCE_FIELDS: DocumentSourceField[] = [
  { key: "user.full_name", label: "Full name", group: "Account", type: "text", description: "User full name" },
  { key: "user.email", label: "Email", group: "Account", type: "email", description: "User login email" },
  { key: "user.phone", label: "Phone", group: "Account", type: "phone", description: "User contact number" },
  { key: "user.avatar_url", label: "Avatar image", group: "Account", type: "image", description: "User profile photo" },
  { key: "profile.about", label: "Profile summary", group: "Profile", type: "textarea", description: "Short profile summary" },
  { key: "profile.gender", label: "Gender", group: "Profile", type: "text", description: "User gender" },
  { key: "profile.full_address", label: "Full address", group: "Location", type: "textarea", description: "User full address" },
  { key: "staff.role_code", label: "Role code", group: "Staff", type: "text", description: "Teacher or driver role code" },
  { key: "staff.role_name", label: "Role name", group: "Staff", type: "text", description: "Teacher or driver role name" },
  { key: "staff.designation", label: "Designation", group: "Staff", type: "text", description: "Staff designation for letters" },
  { key: "staff.join_date", label: "Joining date", group: "Staff", type: "date", description: "Staff joining date" },
  { key: "student.admission_number", label: "Admission number", group: "Student", type: "text", description: "Admission number shown in the student form" },
  { key: "student.apar_id", label: "APAR ID", group: "Student", type: "text", description: "APAR ID" },
  { key: "student.date_of_birth", label: "Date of birth", group: "Student", type: "date", description: "Student date of birth" },
  { key: "student.blood_group", label: "Blood group", group: "Student", type: "text", description: "Student blood group" },
  { key: "student.emergency_contact_name", label: "Emergency contact name", group: "Student", type: "text", description: "Emergency contact person" },
  { key: "student.emergency_contact_phone", label: "Emergency contact phone", group: "Student", type: "phone", description: "Emergency contact number" },
  { key: "enrollment.institution_name", label: "Institution name", group: "Enrollment", type: "text", description: "Institution or school name" },
  { key: "enrollment.program_name", label: "Class / program", group: "Enrollment", type: "text", description: "Student class or program" },
  { key: "enrollment.section_name", label: "Section", group: "Enrollment", type: "text", description: "Student section" },
  { key: "enrollment.academic_year", label: "Academic year", group: "Enrollment", type: "text", description: "Academic year or session" },
  { key: "enrollment.roll_number", label: "Roll number", group: "Enrollment", type: "text", description: "Student roll number" },
  { key: "enrollment.admission_date", label: "Admission date", group: "Enrollment", type: "date", description: "Admission date" },
  { key: "guardian.primary_name", label: "Primary guardian", group: "Guardians", type: "text", description: "Primary guardian name" },
  { key: "guardian.primary_relation", label: "Guardian relation", group: "Guardians", type: "text", description: "Primary guardian relation" },
  { key: "document.primary_number", label: "Document number", group: "Documents", type: "text", description: "Primary student document number" },
  { key: "institution.name", label: "Institution name", group: "Institution Basic", type: "text", description: "Institution or school name" },
  { key: "institution.type", label: "Institution type", group: "Institution Basic", type: "text", description: "School, college, coaching center, or other institution type" },
  { key: "institution.board_name", label: "Board", group: "Institution Basic", type: "text", description: "Institution board name" },
  { key: "institution.subtype", label: "Subtype", group: "Institution Basic", type: "text", description: "Institution subtype such as private or government" },
  { key: "institution.slug", label: "Institution slug", group: "Institution Basic", type: "text", description: "Institution slug" },
  { key: "institution.phone", label: "Institution phone", group: "Institution Contact", type: "phone", description: "Institution contact phone number" },
  { key: "institution.email", label: "Institution email", group: "Institution Contact", type: "email", description: "Institution contact email" },
  { key: "institution.established_year", label: "Established year", group: "Institution Contact", type: "number", description: "Institution established year" },
  { key: "institution.website", label: "Website", group: "Institution Contact", type: "text", description: "Institution website URL" },
  { key: "institution.about", label: "About", group: "Institution Contact", type: "textarea", description: "Institution about/profile text" },
  { key: "institution.full_address", label: "Full address", group: "Institution Location", type: "textarea", description: "Institution full address" },
  { key: "institution.address", label: "Address", group: "Institution Location", type: "textarea", description: "Institution address" },
  { key: "institution.city", label: "City", group: "Institution Location", type: "text", description: "Institution city" },
  { key: "institution.area", label: "Area", group: "Institution Location", type: "text", description: "Institution area/locality" },
  { key: "institution.state", label: "State", group: "Institution Location", type: "text", description: "Institution state" },
  { key: "institution.country", label: "Country", group: "Institution Location", type: "text", description: "Institution country" },
  { key: "institution.pincode", label: "Pincode", group: "Institution Location", type: "text", description: "Institution pincode" },
  { key: "institution.latitude", label: "Latitude", group: "Institution Location", type: "number", description: "Institution latitude" },
  { key: "institution.longitude", label: "Longitude", group: "Institution Location", type: "number", description: "Institution longitude" },
  { key: "institution.logo_url", label: "Logo image", group: "Institution Media", type: "image", description: "Institution logo or primary image" },
  { key: "institution.gallery_image_url", label: "Gallery image", group: "Institution Media", type: "image", description: "Institution gallery/banner image" },
];

export function getSourceField(key: string) {
  return DOCUMENT_SOURCE_FIELDS.find((field) => field.key === key);
}

export function applyTemplateFieldMappings(
  html: string,
  templateFields: DocumentTemplateField[],
  mappings: DocumentTemplateFieldMapping[],
  values: Record<string, string | number | null | undefined>
) {
  return templateFields.reduce((result, field) => {
    const mapping = mappings.find((item) => item.template_field_name === field.field_name);
    const rawValue = mapping
      ? values[mapping.source_field_key] ?? mapping.fallback_value ?? ""
      : "";
    return result.replaceAll(
      `{{${field.field_name}}}`,
      cleanTemplateAddressValue(field.field_name, field.label, String(rawValue ?? ""))
    );
  }, html);
}
