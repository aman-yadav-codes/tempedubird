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
  // User & Account
  { key: "user.full_name", label: "Full name", group: "Account", type: "text", description: "User full name" },
  { key: "user.email", label: "Email", group: "Account", type: "email", description: "User login email" },
  { key: "user.phone", label: "Phone", group: "Account", type: "phone", description: "User contact number" },
  { key: "user.avatar_url", label: "Avatar image", group: "Account", type: "image", description: "User profile photo" },

  // Profile & Address
  { key: "profile.about", label: "Profile summary", group: "Profile", type: "textarea", description: "Short profile summary" },
  { key: "profile.gender", label: "Gender", group: "Profile", type: "text", description: "User gender" },
  { key: "profile.full_address", label: "Full address", group: "Location", type: "textarea", description: "User full address" },

  // Staff & Faculty
  { key: "staff.role_code", label: "Role code", group: "Staff", type: "text", description: "Teacher, driver, or staff role code" },
  { key: "staff.role_name", label: "Role name", group: "Staff", type: "text", description: "Teacher or staff role title" },
  { key: "staff.designation", label: "Designation", group: "Staff", type: "text", description: "Staff designation for letters and certificates" },
  { key: "staff.department", label: "Department", group: "Staff", type: "text", description: "Academic or operational department" },
  { key: "staff.employee_code", label: "Employee Code / ID", group: "Staff", type: "text", description: "Unique staff ID / code" },
  { key: "staff.join_date", label: "Joining date", group: "Staff", type: "date", description: "Staff joining date" },
  { key: "staff.relieving_date", label: "Relieving date", group: "Staff", type: "date", description: "Date of relieving / exit" },
  { key: "staff.conduct", label: "Conduct Assessment", group: "Staff", type: "text", description: "Character and conduct evaluation" },
  { key: "staff.monthly_salary", label: "Monthly Gross Salary", group: "Staff", type: "text", description: "Monthly remuneration amount" },
  { key: "staff.annual_ctc", label: "Annual CTC", group: "Staff", type: "text", description: "Annual cost to company" },
  { key: "staff.reporting_manager", label: "Reporting Manager", group: "Staff", type: "text", description: "Reporting head or manager" },
  { key: "staff.probation_period", label: "Probation Period", group: "Staff", type: "text", description: "Probation period duration" },
  { key: "staff.bank_name", label: "Bank Name", group: "Staff", type: "text", description: "Payroll bank name" },
  { key: "staff.account_number", label: "Account Number", group: "Staff", type: "text", description: "Bank account number" },
  { key: "staff.payment_mode", label: "Payment Mode", group: "Staff", type: "text", description: "Salary payment transfer mode" },

  // Student & Demographics
  { key: "student.admission_number", label: "Admission number", group: "Student", type: "text", description: "Admission number shown in the student form" },
  { key: "student.apar_id", label: "APAR ID", group: "Student", type: "text", description: "APAR ID" },
  { key: "student.date_of_birth", label: "Date of birth", group: "Student", type: "date", description: "Student date of birth" },
  { key: "student.blood_group", label: "Blood group", group: "Student", type: "text", description: "Student blood group" },
  { key: "student.nationality", label: "Nationality", group: "Student", type: "text", description: "Student nationality" },
  { key: "student.father_name", label: "Father Name", group: "Student", type: "text", description: "Father full name" },
  { key: "student.mother_name", label: "Mother Name", group: "Student", type: "text", description: "Mother full name" },
  { key: "student.emergency_contact_name", label: "Emergency contact name", group: "Student", type: "text", description: "Emergency contact person" },
  { key: "student.emergency_contact_phone", label: "Emergency contact phone", group: "Student", type: "phone", description: "Emergency contact number" },

  // Guardians
  { key: "guardian.primary_name", label: "Primary guardian", group: "Guardians", type: "text", description: "Primary guardian name" },
  { key: "guardian.primary_relation", label: "Guardian relation", group: "Guardians", type: "text", description: "Primary guardian relation" },

  // Enrollment & Academics
  { key: "enrollment.institution_name", label: "Institution name", group: "Enrollment", type: "text", description: "Institution or school name" },
  { key: "enrollment.program_name", label: "Class / program", group: "Enrollment", type: "text", description: "Student class or program" },
  { key: "enrollment.section_name", label: "Section", group: "Enrollment", type: "text", description: "Student section" },
  { key: "enrollment.academic_year", label: "Academic year", group: "Enrollment", type: "text", description: "Academic year or session" },
  { key: "enrollment.roll_number", label: "Roll number", group: "Enrollment", type: "text", description: "Student roll number" },
  { key: "enrollment.admission_date", label: "Admission date", group: "Enrollment", type: "date", description: "Admission date" },

  // Academic Results & TC
  { key: "academic.board_name", label: "Board Name", group: "Academic", type: "text", description: "CBSE / ICSE / State Board" },
  { key: "academic.affiliation_number", label: "Affiliation Number", group: "Academic", type: "text", description: "Board affiliation registration number" },
  { key: "academic.school_code", label: "School / Center Code", group: "Academic", type: "text", description: "Official school examination code" },
  { key: "academic.term_name", label: "Term / Exam Name", group: "Academic", type: "text", description: "Term 1, Term 2, Final Exam" },
  { key: "academic.attendance_percent", label: "Attendance %", group: "Academic", type: "text", description: "Student attendance percentage" },
  { key: "academic.result_status", label: "Result Status", group: "Academic", type: "text", description: "Passed, Promoted, Distinction" },
  { key: "academic.rank", label: "Rank", group: "Academic", type: "text", description: "Class or section rank" },

  // Certificate & Awards
  { key: "certificate.title", label: "Certificate Title", group: "Certificates", type: "text", description: "Title of the certificate" },
  { key: "certificate.subtitle", label: "Certificate Subtitle", group: "Certificates", type: "text", description: "Subtitle or honoring line" },
  { key: "certificate.number", label: "Certificate Number", group: "Certificates", type: "text", description: "Official certificate ID" },
  { key: "certificate.issue_date", label: "Issue Date", group: "Certificates", type: "date", description: "Certificate issuance date" },
  { key: "certificate.topic", label: "Training Topic / Event", group: "Certificates", type: "text", description: "Workshop or event name" },
  { key: "certificate.completion_date", label: "Completion Date", group: "Certificates", type: "date", description: "Date of completion" },
  { key: "certificate.award_title", label: "Award Title", group: "Certificates", type: "text", description: "Name of the award" },
  { key: "certificate.citation", label: "Appreciation Citation", group: "Certificates", type: "textarea", description: "Citation or reason for recognition" },
  { key: "certificate.recognition_year", label: "Recognition Year", group: "Certificates", type: "text", description: "Award term or academic year" },

  // Financial & Fee Slips
  { key: "finance.receipt_number", label: "Receipt / Slip Number", group: "Finance", type: "text", description: "Invoice or receipt number" },
  { key: "finance.issue_date", label: "Receipt Date", group: "Finance", type: "date", description: "Fee payment or invoice date" },
  { key: "finance.due_date", label: "Due Date", group: "Finance", type: "date", description: "Fee due date" },
  { key: "finance.fee_type", label: "Fee Category", group: "Finance", type: "text", description: "Tuition, exam, transport fee" },
  { key: "finance.payment_mode", label: "Payment Mode", group: "Finance", type: "text", description: "UPI, Card, Cash, Bank Transfer" },
  { key: "finance.payment_status", label: "Payment Status", group: "Finance", type: "text", description: "Paid, Pending, Overdue" },
  { key: "finance.transaction_id", label: "Transaction ID", group: "Finance", type: "text", description: "Bank transaction or UTR number" },

  // Signatures & Official Seals
  { key: "signature.signatory_name", label: "Authorized Signatory Name", group: "Signatures", type: "text", description: "Name of authorized signer" },
  { key: "signature.signatory_title", label: "Signatory Title / Designation", group: "Signatures", type: "text", description: "Title of authorized signer" },
  { key: "signature.principal_name", label: "Principal Name", group: "Signatures", type: "text", description: "School principal name" },
  { key: "signature.principal_image", label: "Principal Signature", group: "Signatures", type: "image", description: "Principal signature image" },
  { key: "signature.official_seal", label: "Official Seal", group: "Signatures", type: "image", description: "Official institution rubber stamp or seal" },

  // Institution Basic
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

/**
 * Intelligent field matcher that matches any template field name to the best source field.
 */
export function getAutoMappedSourceFieldKey(fieldName: string): string | null {
  const norm = fieldName.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Institution Branding & Contact
  if (norm.includes("logo")) return "institution.logo_url";
  if (norm.includes("schooladdress") || norm.includes("institutionaddress")) return "institution.full_address";
  if (norm.includes("schoolname") || norm.includes("institutionname") || norm.includes("schooltitle")) return "institution.name";
  if (norm.includes("schoolemail") || norm.includes("institutionemail")) return "institution.email";
  if (norm.includes("schoolphone") || norm.includes("institutionphone")) return "institution.phone";
  if (norm.includes("schoolwebsite") || norm.includes("institutionwebsite")) return "institution.website";
  if (norm.includes("boardname") || norm.includes("board")) return "academic.board_name";
  if (norm.includes("affiliation") || norm.includes("affiliationnumber") || norm.includes("affiliationno")) return "academic.affiliation_number";
  if (norm.includes("schoolno") || norm.includes("schoolcode")) return "academic.school_code";

  // Student Demographics
  if (norm.includes("studentname") || (norm.includes("student") && norm.includes("name"))) return "user.full_name";
  if (norm.includes("studentphoto") || norm.includes("avatar")) return "user.avatar_url";
  if (norm.includes("rollnumber") || norm.includes("rollno")) return "enrollment.roll_number";
  if (norm.includes("classname") || norm.includes("programname") || norm.includes("class")) return "enrollment.program_name";
  if (norm.includes("sectionname") || norm.includes("section")) return "enrollment.section_name";
  if (norm.includes("admissionnumber") || norm.includes("admissionno")) return "student.admission_number";
  if (norm.includes("aparid") || norm.includes("studentid")) return "student.apar_id";
  if (norm.includes("dateofbirth") || norm.includes("dob")) return "student.date_of_birth";
  if (norm.includes("bloodgroup")) return "student.blood_group";
  if (norm.includes("fathername")) return "student.father_name";
  if (norm.includes("mothername")) return "student.mother_name";
  if (norm.includes("nationality")) return "student.nationality";
  if (norm.includes("studentaddress")) return "profile.full_address";

  // Staff & Faculty
  if (norm.includes("employeename") || norm.includes("candidatefullname") || norm.includes("staffname")) return "user.full_name";
  if (norm.includes("employeecode") || norm.includes("employeeid") || norm.includes("staffid")) return "staff.employee_code";
  if (norm.includes("employeeemail") || norm.includes("candidateemail")) return "user.email";
  if (norm.includes("employeephone") || norm.includes("candidatephone")) return "user.phone";
  if (norm.includes("designation") || norm.includes("jobtitle")) return "staff.designation";
  if (norm.includes("department")) return "staff.department";
  if (norm.includes("joiningdate") || norm.includes("dateofjoining")) return "staff.join_date";
  if (norm.includes("relievingdate")) return "staff.relieving_date";
  if (norm.includes("conductassessment") || norm.includes("conduct")) return "staff.conduct";
  if (norm.includes("monthlysalary") || norm.includes("basicsalary") || norm.includes("grosssalary")) return "staff.monthly_salary";
  if (norm.includes("annualctc")) return "staff.annual_ctc";
  if (norm.includes("reportingmanager") || norm.includes("reportingto")) return "staff.reporting_manager";
  if (norm.includes("probationperiod")) return "staff.probation_period";
  if (norm.includes("bankname")) return "staff.bank_name";
  if (norm.includes("accountnumber") || norm.includes("accountno")) return "staff.account_number";
  if (norm.includes("paymentmode")) return "staff.payment_mode";

  // Certificates & Recognition
  if (norm.includes("certificatenumber") || norm.includes("certificateid") || norm.includes("serialno")) return "certificate.number";
  if (norm.includes("certificatetitle") || norm.includes("awardtitle") || norm.includes("achievementname")) return "certificate.title";
  if (norm.includes("certificatesubtitle")) return "certificate.subtitle";
  if (norm.includes("recipientname") || norm.includes("presentedtotext")) return "user.full_name";
  if (norm.includes("trainingtopic")) return "certificate.topic";
  if (norm.includes("completiondate")) return "certificate.completion_date";
  if (norm.includes("appreciationreason") || norm.includes("achievementdescription")) return "certificate.citation";
  if (norm.includes("recognitionyear") || norm.includes("achievementyear")) return "certificate.recognition_year";

  // Financial / Invoice / Fee Slip
  if (norm.includes("slipnumber") || norm.includes("receiptnumber") || norm.includes("invoicenumber")) return "finance.receipt_number";
  if (norm.includes("duedate")) return "finance.due_date";
  if (norm.includes("feetype")) return "finance.fee_type";
  if (norm.includes("paymentstatus")) return "finance.payment_status";
  if (norm.includes("transactionid")) return "finance.transaction_id";

  // Academic Sessions & Terms
  if (norm.includes("academicsession") || norm.includes("academicyear")) return "enrollment.academic_year";
  if (norm.includes("termname")) return "academic.term_name";
  if (norm.includes("attendancepercentage") || norm.includes("attendancepercent")) return "academic.attendance_percent";
  if (norm.includes("resultstatus")) return "academic.result_status";
  if (norm.includes("rank")) return "academic.rank";

  // Signatures & Dates
  if (norm.includes("issuedate") || norm.includes("letterdate") || norm.includes("resultdate") || norm.includes("date")) return "certificate.issue_date";
  if (norm.includes("principalsignature")) return "signature.principal_image";
  if (norm.includes("principalname")) return "signature.principal_name";
  if (norm.includes("signatoryname") || norm.includes("signatory") || norm.includes("signername") || norm.includes("authorizedsignatoryname")) return "signature.signatory_name";
  if (norm.includes("signatorydesignation") || norm.includes("signatorytitle") || norm.includes("signertitle") || norm.includes("authorizedsignatorytitle")) return "signature.signatory_title";
  if (norm.includes("schoolseal") || norm.includes("officialseal") || norm.includes("seal")) return "signature.official_seal";

  return null;
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
