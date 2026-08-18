export type RecycleBinAudience =
  | "institution_admin"
  | "teacher"
  | "student"
  | "guardian"
  | "owner";

export type RecycleBinResource = {
  key: string;
  table: string;
  alias: string;
  typeLabel: string;
  labelSql: string;
  joins?: string;
  institutionIdSql?: string;
  ownerUserIdSql?: string;
  studentUserIdSql?: string;
  guardianUserIdSql?: string;
  permissionModule?: string;
  audiences?: RecycleBinAudience[];
  platformOwned?: boolean;
  restoreSql?: string[];
};

const platform = (
  resource: Omit<RecycleBinResource, "platformOwned">
): RecycleBinResource => ({ ...resource, platformOwned: true });

const institution = (
  resource: Omit<RecycleBinResource, "audiences">
): RecycleBinResource => ({
  ...resource,
  audiences: ["institution_admin"],
});

export const RECYCLE_BIN_RESOURCES: RecycleBinResource[] = [
  platform({
    key: "institutions",
    table: "institution_profiles",
    alias: "record",
    typeLabel: "Institution",
    labelSql: "COALESCE(record.name, record.slug, 'Institution ' || record.id::text)",
    institutionIdSql: "record.id",
    restoreSql: ["is_active = TRUE", "status = 'active'"],
  }),
  platform({
    key: "users",
    table: "users",
    alias: "record",
    typeLabel: "User Account",
    labelSql: "COALESCE(record.full_name, record.email, 'User ' || record.id::text)",
    restoreSql: ["is_active = TRUE"],
  }),
  platform({
    key: "scope_types",
    table: "scope_types",
    alias: "record",
    typeLabel: "Scope Type",
    labelSql: "COALESCE(record.name, record.code, 'Scope ' || record.id::text)",
  }),
  platform({
    key: "roles",
    table: "roles",
    alias: "record",
    typeLabel: "Role",
    labelSql: "COALESCE(record.name, record.code, 'Role ' || record.id::text)",
  }),
  platform({
    key: "permissions",
    table: "permissions",
    alias: "record",
    typeLabel: "Permission",
    labelSql: "COALESCE(record.name, record.code, 'Permission ' || record.id::text)",
  }),
  platform({
    key: "categories",
    table: "categories",
    alias: "record",
    typeLabel: "Category",
    labelSql: "COALESCE(record.name, record.slug, 'Category ' || record.id::text)",
  }),
  platform({
    key: "boards",
    table: "boards",
    alias: "record",
    typeLabel: "Board",
    labelSql: "COALESCE(record.name, record.slug, 'Board ' || record.id::text)",
  }),
  platform({
    key: "subjects",
    table: "subjects",
    alias: "record",
    typeLabel: "Subject",
    labelSql: "COALESCE(record.name, record.slug, 'Subject ' || record.id::text)",
  }),
  platform({
    key: "card_categories",
    table: "card_categories",
    alias: "record",
    typeLabel: "Card Category",
    labelSql: "COALESCE(record.name, record.slug, 'Card category ' || record.id::text)",
  }),
  platform({
    key: "document_templates",
    table: "document_templates",
    alias: "record",
    typeLabel: "Document Template",
    labelSql: "COALESCE(record.name, 'Template ' || record.id::text)",
  }),
  platform({
    key: "help_categories",
    table: "help_categories",
    alias: "record",
    typeLabel: "Help Category",
    labelSql: "COALESCE(record.name, record.slug, 'Help category ' || record.id::text)",
  }),
  platform({
    key: "help_articles",
    table: "help_articles",
    alias: "record",
    typeLabel: "Help Article",
    labelSql: "COALESCE(record.title, record.slug, 'Help article ' || record.id::text)",
  }),
  platform({
    key: "help_recent_updates",
    table: "help_recent_updates",
    alias: "record",
    typeLabel: "Help Center Update",
    labelSql: "COALESCE(record.title, 'Help update ' || record.id::text)",
  }),
  platform({
    key: "app_settings",
    table: "app_settings",
    alias: "record",
    typeLabel: "Platform Settings",
    labelSql: "'Platform settings ' || record.id::text",
  }),
  platform({
    key: "notification_templates",
    table: "notification_templates",
    alias: "record",
    typeLabel: "Notification Template",
    labelSql: "COALESCE(record.code, record.title_template, 'Notification template ' || record.id::text)",
  }),
  ...[
    ["institution_types", "Institution Type"],
    ["institution_subtypes", "Institution Subtype"],
    ["program_types", "Program Type"],
    ["facility_types", "Facility Type"],
    ["languages", "Language"],
    ["designations", "Designation"],
    ["locations", "Location"],
    ["skills", "Skill"],
    ["sections", "Section"],
    ["academic_session_templates", "Academic Session"],
  ].map(([table, typeLabel]) =>
    platform({
      key: table,
      table,
      alias: "record",
      typeLabel,
      labelSql: `COALESCE(record.name, 'Record ' || record.id::text)`,
    })
  ),
  institution({
    key: "institution_memberships",
    table: "institution_memberships",
    alias: "record",
    typeLabel: "Institution Member",
    labelSql:
      "COALESCE(member_user.full_name, member_user.email, 'User ' || record.user_id::text) || ' · ' || COALESCE(member_role.name, member_role.code, 'Member')",
    joins:
      "LEFT JOIN users member_user ON member_user.id = record.user_id LEFT JOIN roles member_role ON member_role.id = record.role_id",
    institutionIdSql: "record.institution_id",
    permissionModule: "users.allusers",
    restoreSql: [
      "is_active = TRUE",
      "status = 'ACTIVE'",
      "is_current = TRUE",
      "leave_date = NULL",
    ],
  }),
  institution({
    key: "institution_programs",
    table: "institution_programs",
    alias: "record",
    typeLabel: "Program",
    labelSql: "COALESCE(record.title, record.slug, 'Program ' || record.id::text)",
    institutionIdSql: "record.institution_id",
    permissionModule: "institution.programs",
  }),
  institution({
    key: "institution_academic_classes",
    table: "institution_academic_classes",
    alias: "record",
    typeLabel: "Academic Class",
    labelSql: "COALESCE(class_category.name, 'Academic class ' || record.id::text)",
    joins: "LEFT JOIN categories class_category ON class_category.id = record.category_id",
    institutionIdSql: "record.institution_id",
    permissionModule: "institution.programs",
  }),
  institution({
    key: "institution_class_sections",
    table: "institution_class_sections",
    alias: "record",
    typeLabel: "Class Section",
    labelSql: "COALESCE(section.name, 'Class section ' || record.id::text)",
    joins:
      "INNER JOIN institution_academic_classes academic_class ON academic_class.id = record.institution_class_id LEFT JOIN sections section ON section.id = record.section_id",
    institutionIdSql: "academic_class.institution_id",
    permissionModule: "institution.programs",
  }),
  {
    key: "assignment_templates",
    table: "assignment_templates",
    alias: "record",
    typeLabel: "Assignment Draft",
    labelSql: "COALESCE(record.title, 'Assignment draft ' || record.id::text)",
    institutionIdSql: "record.source_institution_id",
    ownerUserIdSql: "record.created_by",
    permissionModule: "content.assignments",
    audiences: ["institution_admin", "teacher"],
  },
  institution({
    key: "assignments",
    table: "assignments",
    alias: "record",
    typeLabel: "Assignment",
    labelSql: "COALESCE(record.title, 'Assignment ' || record.id::text)",
    institutionIdSql: "record.institution_id",
    permissionModule: "content.assignments",
  }),
  {
    key: "practice_exam_templates",
    table: "practice_exam_templates",
    alias: "record",
    typeLabel: "Practice Exam Draft",
    labelSql: "COALESCE(record.title, 'Practice exam draft ' || record.id::text)",
    institutionIdSql: "record.source_institution_id",
    ownerUserIdSql: "record.created_by",
    permissionModule: "content.practice_exams",
    audiences: ["institution_admin", "teacher"],
  },
  institution({
    key: "practice_exams",
    table: "practice_exams",
    alias: "record",
    typeLabel: "Practice Exam",
    labelSql: "COALESCE(record.title, 'Practice exam ' || record.id::text)",
    institutionIdSql: "record.institution_id",
    permissionModule: "content.practice_exams",
  }),
  institution({
    key: "attendance_sessions",
    table: "attendance_sessions",
    alias: "record",
    typeLabel: "Attendance Session",
    labelSql: "'Attendance · ' || record.attendance_date::text",
    institutionIdSql: "record.institution_id",
    permissionModule: "managestudents.attendance",
  }),
  institution({
    key: "student_attendance",
    table: "student_attendance",
    alias: "record",
    typeLabel: "Student Attendance",
    labelSql:
      "COALESCE(student_user.full_name, 'Student ' || record.student_id::text) || ' · ' || attendance_session.attendance_date::text",
    joins:
      "INNER JOIN attendance_sessions attendance_session ON attendance_session.id = record.attendance_session_id LEFT JOIN student_profiles student_profile ON student_profile.id = record.student_id LEFT JOIN users student_user ON student_user.id = student_profile.user_id",
    institutionIdSql: "attendance_session.institution_id",
    permissionModule: "managestudents.attendance",
  }),
  institution({
    key: "student_period_attendance",
    table: "student_period_attendance",
    alias: "record",
    typeLabel: "Period Attendance",
    labelSql:
      "COALESCE(student_user.full_name, 'Student ' || record.student_id::text) || ' · ' || attendance_session.attendance_date::text",
    joins:
      "INNER JOIN attendance_sessions attendance_session ON attendance_session.id = record.attendance_session_id LEFT JOIN student_profiles student_profile ON student_profile.id = record.student_id LEFT JOIN users student_user ON student_user.id = student_profile.user_id",
    institutionIdSql: "attendance_session.institution_id",
    permissionModule: "managestudents.attendance",
  }),
  institution({
    key: "student_achievements",
    table: "student_achievements",
    alias: "record",
    typeLabel: "Certificate / Achievement",
    labelSql: "COALESCE(record.title, 'Achievement ' || record.id::text)",
    institutionIdSql: "record.institution_id",
    permissionModule: "managestudents.achievements",
  }),
  {
    key: "student_documents",
    table: "student_documents",
    alias: "record",
    typeLabel: "Student Document",
    labelSql:
      "COALESCE(record.document_type, 'Document') || COALESCE(' · ' || record.document_number, '')",
    joins:
      "LEFT JOIN student_profiles student_profile ON student_profile.id = record.student_id LEFT JOIN student_enrollments enrollment ON enrollment.id = record.enrollment_id",
    institutionIdSql: "enrollment.institution_id",
    studentUserIdSql: "student_profile.user_id",
    permissionModule: "managestudents.allstudents",
    audiences: ["institution_admin", "student"],
  },
  institution({
    key: "institution_generated_documents",
    table: "institution_generated_documents",
    alias: "record",
    typeLabel: "Generated Document",
    labelSql:
      "COALESCE(record.reference_type, 'Generated document') || ' · ' || record.id::text",
    institutionIdSql: "record.institution_id",
    permissionModule: "content.card_templates",
  }),
  ...[
    ["institution_facilities", "Facility", "COALESCE(record.title, 'Facility ' || record.id::text)", "institution.facilities"],
    ["institution_news", "Noticeboard", "COALESCE(record.title, record.slug, 'Notice ' || record.id::text)", "institution.noticeboard"],
    ["institution_calendar_events", "Calendar Event", "COALESCE(record.title, 'Event ' || record.id::text)", "content.institute_calendar"],
    ["institution_media", "Institution Media", "COALESCE(record.title, record.url, 'Media ' || record.id::text)", "institution.institutions"],
    ["institution_placements", "Placement", "'Placement ' || COALESCE(record.year::text, record.id::text)", "institution.placements"],
    ["institution_cutoffs", "Institution Cutoff", "COALESCE(record.exam_name, 'Cutoff ' || record.id::text)", "institution.cutoffs"],
    ["institution_scholarships", "Scholarship", "'Scholarship ' || record.id::text", "institution.scholarships"],
    ["academic_years", "Academic Year", "COALESCE(record.name, 'Academic year ' || record.id::text)", "settings.academic_sessions"],
    ["support_tickets", "Support Ticket", "COALESCE(record.subject, record.ticket_number, 'Ticket ' || record.id::text)", "support.tickets"],
  ].map(([table, typeLabel, labelSql, permissionModule]) =>
    institution({
      key: table,
      table,
      alias: "record",
      typeLabel,
      labelSql,
      institutionIdSql: "record.institution_id",
      permissionModule,
    })
  ),
  institution({
    key: "class_timetables",
    table: "class_timetables",
    alias: "record",
    typeLabel: "Class Timetable",
    labelSql: "'Timetable · ' || COALESCE(record.day_of_week::text, record.id::text)",
    joins:
      "INNER JOIN institution_class_sections class_section ON class_section.id = record.institution_class_section_id INNER JOIN institution_academic_classes academic_class ON academic_class.id = class_section.institution_class_id",
    institutionIdSql: "academic_class.institution_id",
    permissionModule: "content.timetable_setup",
  }),
  institution({
    key: "timetable_entries",
    table: "timetable_entries",
    alias: "record",
    typeLabel: "Timetable Entry",
    labelSql: "'Timetable entry · ' || COALESCE(record.day_of_week::text, record.id::text)",
    joins: "INNER JOIN institution_programs program ON program.id = record.program_id",
    institutionIdSql: "program.institution_id",
    permissionModule: "content.timetable_setup",
  }),
  {
    key: "student_assignment_submission_files",
    table: "student_assignment_submission_files",
    alias: "record",
    typeLabel: "Assignment Upload",
    labelSql: "COALESCE(record.file_url, 'Assignment upload ' || record.id::text)",
    joins:
      "INNER JOIN student_assignment_answers answer ON answer.id = record.answer_id INNER JOIN student_assignments student_assignment ON student_assignment.id = answer.student_assignment_id INNER JOIN student_profiles student_profile ON student_profile.id = student_assignment.student_id LEFT JOIN student_enrollments enrollment ON enrollment.id = student_assignment.enrollment_id",
    institutionIdSql: "enrollment.institution_id",
    studentUserIdSql: "student_profile.user_id",
    audiences: ["student"],
  },
  {
    key: "support_ticket_attachments",
    table: "support_ticket_attachments",
    alias: "record",
    typeLabel: "Support Attachment",
    labelSql: "COALESCE(record.file_name, 'Support attachment ' || record.id::text)",
    joins:
      "INNER JOIN support_ticket_messages ticket_message ON ticket_message.id = record.ticket_message_id INNER JOIN support_tickets ticket ON ticket.id = ticket_message.ticket_id",
    institutionIdSql: "ticket.institution_id",
    ownerUserIdSql: "record.uploaded_by",
    permissionModule: "support.tickets",
    audiences: ["institution_admin", "owner", "guardian"],
  },
];

export const RECYCLE_BIN_RESOURCE_MAP = new Map(
  RECYCLE_BIN_RESOURCES.map((resource) => [resource.key, resource])
);
