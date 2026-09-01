import { toCanonicalAdminPath } from "@/lib/auth/role-routes";

export const FULL_ACCESS_PERMISSION = "*";
export const AUTHENTICATED_LOOKUP_PERMISSION = "__authenticated_lookup";
export const SUPER_ADMIN_PAGE_PATHS = [] as const;

export const PAGE_ACTIONS = ["view", "create", "edit", "delete"] as const;
export type PageAction = (typeof PAGE_ACTIONS)[number];
const PERMISSION_ACTIONS = [...PAGE_ACTIONS, "manage"] as const;

export type PermissionScope = "platform" | "institution";

export type AdminPermissionModule = {
  key: string;
  label: string;
  description: string;
  scope: PermissionScope;
  page: string;
};

export const MANAGED_PLATFORM_ROLE_CODES = ["platform_admin", "accountant", "guest"] as const;
export const MANAGED_INSTITUTION_ROLE_CODES = [
  "institution_admin",
  "director",
  "principal",
  "vice_principal",
  "dean",
  "center_head",
  "branch_manager",
  "academic_coordinator",
  "hod",
  "teacher",
  "faculty",
  "tutor",
  "teaching_assistant",
  "doubt_expert",
  "student",
  "parent",
  "counselor",
  "admission_counselor",
  "telecaller",
  "marketing_executive",
  "institution_accountant",
  "fee_collector",
  "exam_controller",
  "curriculum_developer",
  "librarian",
  "lab_assistant",
  "it_support",
  "placement_officer",
  "hostel_warden",
  "transport_coordinator",
  "driver",
  "security_guard",
  "administrative_staff",
  "sports_coach",
] as const;

export function isManagedPlatformRoleCode(roleCode: string | null | undefined) {
  return MANAGED_PLATFORM_ROLE_CODES.includes(roleCode as (typeof MANAGED_PLATFORM_ROLE_CODES)[number]);
}

export function isManagedInstitutionRoleCode(roleCode: string | null | undefined) {
  if (!roleCode) return false;
  return MANAGED_INSTITUTION_ROLE_CODES.includes(
    roleCode.toLowerCase() as (typeof MANAGED_INSTITUTION_ROLE_CODES)[number]
  );
}

export const ADMIN_PERMISSION_MODULES: AdminPermissionModule[] = [
  { key: "dashboard", label: "Dashboard", description: "admin dashboard", scope: "institution", page: "/admin" },
  { key: "analytics", label: "Traffic Analytics", description: "view clicks, views, impressions, searches and user journeys", scope: "institution", page: "/admin/analytics" },
  { key: "student.dashboard", label: "Student Dashboard", description: "student dashboard", scope: "institution", page: "/admin/my-program" },
  { key: "parent.dashboard", label: "Parent Dashboard", description: "parent dashboard", scope: "institution", page: "/admin" },
  { key: "teacher.dashboard", label: "Teacher Dashboard", description: "teacher dashboard", scope: "institution", page: "/admin" },
  { key: "users.allusers", label: "All Users", description: "admin users", scope: "platform", page: "/admin/users" },
  { key: "managestaff.allstaff", label: "All Staff", description: "teacher and driver profiles", scope: "institution", page: "/admin/staff" },
  { key: "managestaff.attendance", label: "Staff Attendance", description: "staff attendance", scope: "institution", page: "/admin/staff/attendance" },
  { key: "managestaff.salary", label: "Staff Salary", description: "staff salary records", scope: "institution", page: "/admin/staff/salary" },
  { key: "managestaff.queries", label: "Staff Queries", description: "staff queries and support tickets", scope: "institution", page: "/admin/staff/queries" },
  { key: "managestaff.salary_slips", label: "Salary Slips", description: "staff salary slips", scope: "institution", page: "/admin/staff/salary-slips" },
  { key: "managestaff.holidays", label: "Staff Holidays", description: "staff holiday and leave calendar", scope: "institution", page: "/admin/staff/holidays" },
  { key: "managestaff.offer_letters", label: "Offer Letters", description: "staff offer letters", scope: "institution", page: "/admin/staff/offer-letters" },
  { key: "managestaff.certificates", label: "Staff Certificates", description: "staff certificates and awards", scope: "institution", page: "/admin/staff/certificates" },
  { key: "managestaff.experience_letters", label: "Experience Letters", description: "staff experience letters", scope: "institution", page: "/admin/staff/experience-letters" },
  { key: "managestaff.jobs", label: "Our Jobs", description: "staff vacancies and job postings", scope: "institution", page: "/admin/staff/jobs" },
  { key: "managestaff.applicants", label: "Staff Applicants", description: "job applicants and recruitment pipeline", scope: "institution", page: "/admin/staff/applicants" },
  { key: "managestaff.appreciation_certificates", label: "Appreciation Certificates", description: "staff appreciation certificates", scope: "institution", page: "/admin/staff/appreciation-certificates" },
  { key: "managestaff.tasks", label: "Task Management", description: "staff task and deliverable operations", scope: "institution", page: "/admin/operations/tasks" },
  { key: "managestaff.letters", label: "Staff Letters", description: "staff joining and experience letters", scope: "institution", page: "/admin/staff/letters" },
  { key: "rolespermissions.scopetypes", label: "Scope Types", description: "scope types", scope: "platform", page: "/admin/access-control/scope-types" },
  { key: "rolespermissions.permissions", label: "Permissions", description: "permission codes", scope: "platform", page: "/admin/access-control/permissions" },
  { key: "rolespermissions.roles", label: "Roles", description: "roles", scope: "institution", page: "/admin/access-control/roles" },
  { key: "rolespermissions.rolepermissions", label: "Role Permissions", description: "default role permissions", scope: "institution", page: "/admin/access-control/role-permissions" },
  { key: "rolespermissions.institutionmemberships", label: "Institution Memberships", description: "institution memberships", scope: "institution", page: "/admin/access-control/institution-memberships" },
  { key: "rolespermissions.institutionrolepermissions", label: "Institution Role Permissions", description: "institution role permissions", scope: "institution", page: "/admin/access-control/institution-role-permissions" },
  { key: "rolespermissions.personalpermissions", label: "Personal Permissions", description: "user-specific institution permissions", scope: "institution", page: "/admin/access-control/personal-permissions" },
  { key: "managestudents.allstudents", label: "All Students", description: "students", scope: "institution", page: "/admin/students" },
  { key: "managestudents.fee_management", label: "Fee Management", description: "student fee management", scope: "institution", page: "/admin/students/fee-management" },
  { key: "managestudents.attendance", label: "Attendance", description: "student attendance", scope: "institution", page: "/admin/students/attendance" },
  { key: "managestudents.achievements", label: "Achievements", description: "student achievements", scope: "institution", page: "/admin/students/achievements" },
  { key: "managestudents.assignments", label: "Assignments", description: "student assignments", scope: "institution", page: "/admin/students/assignments" },
  { key: "managestudents.exams", label: "Exams", description: "student exams", scope: "institution", page: "/admin/students/exams" },
  { key: "managestudents.practice", label: "Practice", description: "student practice exams", scope: "institution", page: "/admin/students/practice" },
  { key: "managestudents.result", label: "Result", description: "student results", scope: "institution", page: "/admin/students/result" },
  { key: "managestudents.tc", label: "TC", description: "student transfer certificates", scope: "institution", page: "/admin/students/tc" },
  { key: "managestudents.cards", label: "Cards", description: "student cards", scope: "institution", page: "/admin/students/cards" },
  { key: "managestudents.notes", label: "Notes", description: "student notes", scope: "institution", page: "/admin/students/notes" },
  { key: "student.myclassroom.attendance", label: "Student Attendance", description: "the student's own attendance", scope: "institution", page: "/admin/classroom/attendance" },
  { key: "student.myclassroom.achievements", label: "Student Achievements", description: "the student's own achievements", scope: "institution", page: "/admin/classroom/achievements" },
  { key: "student.myclassroom.assignments", label: "Student Assignments", description: "the student's own assignments", scope: "institution", page: "/admin/classroom/assignments" },
  { key: "student.myclassroom.practice_exams", label: "Student Practice Exams", description: "the student's own practice exams", scope: "institution", page: "/admin/classroom/practice-exams" },
  { key: "student.myclassroom.exams", label: "Student Exams", description: "the student's own targeted exams", scope: "institution", page: "/admin/classroom/exams" },
  { key: "student.myclassroom.results", label: "Student Results", description: "the student's saved result cards", scope: "institution", page: "/admin/classroom/results" },
  { key: "student.myclassroom.timetable", label: "Student Timetable", description: "the student's own timetable", scope: "institution", page: "/admin/classroom/my-timetable" },
  { key: "student.myclassroom.idcard", label: "Student ID Card", description: "the student's saved ID card", scope: "institution", page: "/admin/classroom/id-card" },
  { key: "student.myclassroom.notes", label: "Student Notes", description: "the student's class notes", scope: "institution", page: "/admin/students/notes" },
  { key: "student.myclassroom.fees", label: "Student Fees", description: "the student's own fee structure and payments", scope: "institution", page: "/admin/classroom/fees" },
  { key: "student.myprogram", label: "Student My Program", description: "the student's enrolled programs", scope: "institution", page: "/admin/my-program" },
  { key: "student.guardians", label: "Student Guardians", description: "the student's own guardians", scope: "institution", page: "/admin/guardians" },
  { key: "student.guardians", label: "Student Guardians", description: "the student's own guardians", scope: "institution", page: "/admin/students/guardians" },
  { key: "student.guardians", label: "Student Guardians", description: "the student's own guardians", scope: "institution", page: "/student/guardians" },
  { key: "student.notification.all", label: "Student Notifications", description: "the student's notification inbox", scope: "institution", page: "/admin/notifications" },
  { key: "parent.childclassroom.attendance", label: "Child Attendance", description: "a parent's child attendance", scope: "institution", page: "/admin/classroom/attendance" },
  { key: "parent.childclassroom.assignments", label: "Child Assignments", description: "a parent's child assignments", scope: "institution", page: "/admin/classroom/assignments" },
  { key: "parent.childclassroom.practice_exams", label: "Child Practice Exams", description: "a parent's child practice exams", scope: "institution", page: "/admin/classroom/practice-exams" },
  { key: "parent.childclassroom.exams", label: "Child Exams", description: "a parent's child's targeted exams", scope: "institution", page: "/admin/classroom/exams" },
  { key: "parent.childclassroom.timetable", label: "Child Timetable", description: "a parent's child timetable", scope: "institution", page: "/admin/classroom/my-timetable" },
  { key: "parent.childclassroom.idcard", label: "Child ID Card", description: "a parent's child saved ID card", scope: "institution", page: "/admin/classroom/id-card" },
  { key: "parent.childclassroom.fees", label: "Child Fees", description: "a parent's child fee structure and payments", scope: "institution", page: "/admin/classroom/fees" },
  { key: "teacher.myclassroom.timetable", label: "Teacher Timetable", description: "the teacher's own timetable", scope: "institution", page: "/admin/classroom/my-timetable" },
  { key: "student.myinstitution.calendar", label: "Student Institution Calendar", description: "the student's institution calendar", scope: "institution", page: "/admin/institution/calendar" },
  { key: "parent.childinstitution.calendar", label: "Child Institution Calendar", description: "a parent's child institution calendar", scope: "institution", page: "/admin/institution/calendar" },
  { key: "student.myinstitution.complaints", label: "Student Complaints", description: "institution complaints created or received by students", scope: "institution", page: "/admin/institution/complaints" },
  { key: "teacher.myinstitution.complaints", label: "Teacher Complaints", description: "institution complaints created or received by teachers", scope: "institution", page: "/admin/institution/complaints" },
  { key: "parent.myinstitution.complaints", label: "Parent Complaints", description: "institution complaints created or received by parents", scope: "institution", page: "/admin/institution/complaints" },
  { key: "driver.myinstitution.complaints", label: "Driver Complaints", description: "institution complaints created or received by drivers", scope: "institution", page: "/admin/institution/complaints" },
  { key: "teacher.myinstitution.myattendance", label: "Teacher My Attendance", description: "the teacher's own attendance and leave requests", scope: "institution", page: "/admin/institution/my-attendance" },
  { key: "driver.myinstitution.myattendance", label: "Driver My Attendance", description: "the driver's own attendance and leave requests", scope: "institution", page: "/admin/institution/my-attendance" },
  { key: "teacher.myinstitution.mysalary", label: "Teacher My Salary", description: "the teacher's own salary records", scope: "institution", page: "/admin/institution/my-salary" },
  { key: "driver.myinstitution.mysalary", label: "Driver My Salary", description: "the driver's own salary records", scope: "institution", page: "/admin/institution/my-salary" },
  { key: "teacher.myinstitution.myletters", label: "Teacher My Letters", description: "letters generated for the teacher", scope: "institution", page: "/admin/institution/my-letters" },
  { key: "driver.myinstitution.myletters", label: "Driver My Letters", description: "letters generated for the driver", scope: "institution", page: "/admin/institution/my-letters" },
  { key: "analytics.overview", label: "Analytics Overview", description: "analytics overview", scope: "institution", page: "/admin/analytics" },
  { key: "analytics.leads", label: "Leads", description: "analytics leads", scope: "platform", page: "/admin/users/leads" },
  { key: "analytics.sales", label: "Sales", description: "analytics sales", scope: "platform", page: "/admin/analytics/sales" },
  { key: "analytics.reports", label: "Analytics Reports", description: "analytics reports", scope: "platform", page: "/admin/analytics/reports" },
  { key: "finance.platform.income", label: "Platform Finance Income", description: "platform-scoped finance income", scope: "platform", page: "/admin/finance/income" },
  { key: "finance.platform.expense", label: "Platform Finance Expense", description: "platform-scoped finance expenses", scope: "platform", page: "/admin/finance/expense" },
  { key: "finance.platform.invoice", label: "Platform Finance Invoice", description: "platform-scoped finance invoices", scope: "platform", page: "/admin/finance/invoice" },
  { key: "finance.platform.allowance", label: "Platform Finance Allowance", description: "platform-scoped finance allowances", scope: "platform", page: "/admin/finance/allowance" },
  { key: "finance.platform.recurring_expenses", label: "Platform Recurring Expenses", description: "platform-scoped recurring expenses", scope: "platform", page: "/admin/finance/recurring-expenses" },
  { key: "finance.income", label: "Finance Income", description: "institution-scoped finance income", scope: "institution", page: "/admin/finance/income" },
  { key: "finance.expense", label: "Finance Expense", description: "institution-scoped finance expenses", scope: "institution", page: "/admin/finance/expense" },
  { key: "finance.invoice", label: "Finance Invoice", description: "institution-scoped finance invoices", scope: "institution", page: "/admin/finance/invoice" },
  { key: "finance.allowance", label: "Finance Allowance", description: "institution-scoped finance allowances", scope: "institution", page: "/admin/finance/allowance" },
  { key: "finance.recurring_expenses", label: "Recurring Expenses", description: "institution-scoped recurring expenses", scope: "institution", page: "/admin/finance/recurring-expenses" },
  { key: "sales.leads", label: "Sales Lead", description: "sales leads", scope: "institution", page: "/admin/sales/leads" },
  { key: "sales.pipeline", label: "Sales Pipeline", description: "sales pipeline", scope: "institution", page: "/admin/sales/pipeline" },
  { key: "sales.proposals", label: "Sales Proposals", description: "commercial course proposals and custom quotes", scope: "institution", page: "/admin/sales/proposals" },
  { key: "sales.enquiries", label: "Sales Enquiry", description: "sales enquiries", scope: "institution", page: "/admin/sales/enquiries" },
  { key: "sales.enrollments", label: "Course Enrollments", description: "course enrollments", scope: "institution", page: "/admin/sales/enrollments" },
  { key: "sales.orders", label: "Orders", description: "product orders, student kit purchases, and receipts", scope: "institution", page: "/admin/sales/orders" },
  { key: "sales.commissions", label: "Sales Commissions", description: "sales commissions and incentives", scope: "institution", page: "/admin/sales/commissions" },
  { key: "content.category_tree", label: "Category Tree", description: "content category tree", scope: "institution", page: "/admin/content/tree" },
  { key: "content.categories", label: "Categories", description: "content categories", scope: "institution", page: "/admin/content/categories" },
  { key: "content.boards", label: "Boards", description: "content boards", scope: "institution", page: "/admin/content/boards" },
  { key: "content.universities", label: "Universities", description: "content universities registry", scope: "institution", page: "/admin/content/universities" },
  { key: "content.certifications", label: "Affiliated By / Certifications", description: "certification providers and university affiliations", scope: "institution", page: "/admin/content/certifications" },
  { key: "content.subjects", label: "Subjects", description: "content subjects", scope: "institution", page: "/admin/content/subjects" },
  { key: "content.courses", label: "Courses & Programs", description: "courses and program catalog", scope: "institution", page: "/admin/content/courses" },
  { key: "content.skills", label: "Skills", description: "content skills", scope: "platform", page: "/admin/master-data/skills" },
  { key: "content.designations", label: "Designations", description: "content designations", scope: "platform", page: "/admin/master-data/designations" },
  { key: "content.locations", label: "Locations", description: "content locations", scope: "platform", page: "/admin/master-data/locations" },
  { key: "content.syllabus", label: "Syllabus", description: "universal and institution syllabi", scope: "institution", page: "/admin/content/syllabus" },
  { key: "content.card_categories", label: "Card Categories", description: "global card and document categories", scope: "platform", page: "/admin/master-data/card-categories" },
  { key: "content.card_templates", label: "Card Templates", description: "assigned and marketplace card templates", scope: "institution", page: "/admin/content/card-templates" },
  { key: "content.assignments", label: "Assignments", description: "institution assignment templates", scope: "institution", page: "/admin/content/assignments" },
  { key: "content.exams", label: "Exams", description: "institution exam templates", scope: "institution", page: "/admin/content/exams" },
  { key: "content.notes", label: "Notes", description: "institution study notes", scope: "institution", page: "/admin/content/notes" },
  { key: "content.default_calendar", label: "Default Calendar", description: "platform default holidays, notices, and academic events", scope: "platform", page: "/admin/master-data/default-calendar" },
  { key: "content.exam_reviews", label: "Exam Reviews", description: "exam marketplace reviews", scope: "platform", page: "/admin/master-data/exams" },
  { key: "content.practice_exams", label: "Practice Exams", description: "institution practice exam templates", scope: "institution", page: "/admin/content/practice-exams" },
  { key: "content.practice_exam_reviews", label: "Practice Exam Reviews", description: "practice exam marketplace reviews", scope: "platform", page: "/admin/master-data/practice-exams" },
  { key: "content.institute_calendar", label: "Institute Calendar", description: "institution holidays, notices, and events", scope: "institution", page: "/admin/master-data/institute-calendar" },
  { key: "content.timetable_setup", label: "Timetable Setup", description: "subject teacher mappings and timetable slots", scope: "institution", page: "/admin/master-data/timetable-setup" },
  { key: "content.attendance_setup", label: "Attendance Setup", description: "attendance rules and shift settings", scope: "institution", page: "/admin/master-data/attendance-setup" },
  { key: "content.blog", label: "Blog", description: "institution website blog posts", scope: "institution", page: "/admin/content/blog" },
  { key: "content.media", label: "Media", description: "content media", scope: "institution", page: "/admin/content/media" },
  { key: "institution.types", label: "Institution Types", description: "institution types", scope: "platform", page: "/admin/institutions/types" },
  { key: "institution.subtypes", label: "Institution Subtypes", description: "institution subtypes", scope: "platform", page: "/admin/institutions/subtypes" },
  { key: "institution.program_types", label: "Program Types", description: "program types", scope: "platform", page: "/admin/institutions/program-types" },
  { key: "institution.facility_types", label: "Facility Types", description: "facility types", scope: "platform", page: "/admin/institutions/facility-types" },
  { key: "institution.languages", label: "Languages", description: "institution languages", scope: "platform", page: "/admin/institutions/languages" },
  { key: "institution.institutions", label: "Institutions", description: "institutions", scope: "institution", page: "/admin/institutions/list" },
  { key: "institution.programs", label: "Programs", description: "institution programs", scope: "institution", page: "/admin/institutions/programs" },
  { key: "institution.placements", label: "Placements", description: "institution placements", scope: "institution", page: "/admin/institutions/placements" },
  { key: "institution.facilities", label: "Facilities", description: "institution facilities", scope: "institution", page: "/admin/institutions/facilities" },
  { key: "institution.gallery", label: "Campus Gallery", description: "institution photo gallery and categorized albums", scope: "institution", page: "/admin/institutions/gallery" },
  { key: "institution.hostels", label: "Hostel Facilities", description: "institution hostels and campus living", scope: "institution", page: "/admin/institutions/hostels" },
  { key: "institution.libraries", label: "Digital & Central Libraries", description: "institution libraries and digital resources", scope: "institution", page: "/admin/institutions/libraries" },
  { key: "institution.cutoffs", label: "Institution Cutoffs", description: "institution cutoffs", scope: "institution", page: "/admin/institutions/cutoffs" },
  { key: "institution.scholarships", label: "Scholarships", description: "institution scholarships", scope: "institution", page: "/admin/institutions/scholarships" },
  { key: "institution.noticeboard", label: "Noticeboard", description: "institution noticeboard", scope: "institution", page: "/admin/institutions/news" },
  { key: "institution.complaints", label: "Institution Complaints", description: "institution complaint conversations", scope: "institution", page: "/admin/institution/complaints" },
  { key: "institution.general_settings", label: "Institution General Settings", description: "institution-wide default session settings", scope: "institution", page: "/admin/settings" },
  { key: "student.myinstitution.noticeboard", label: "Student Noticeboard", description: "institution noticeboard notices for students", scope: "institution", page: "/admin/institutions/news" },
  { key: "teacher.myinstitution.noticeboard", label: "Teacher Noticeboard", description: "institution noticeboard notices managed by teachers", scope: "institution", page: "/admin/institutions/news" },
  { key: "parent.myinstitution.noticeboard", label: "Parent Noticeboard", description: "institution noticeboard notices for parents", scope: "institution", page: "/admin/institutions/news" },
  { key: "driver.myinstitution.noticeboard", label: "Driver Noticeboard", description: "institution noticeboard notices for drivers", scope: "institution", page: "/admin/institutions/news" },
  { key: "settings.academic_sessions", label: "Academic Sessions", description: "global reusable academic sessions", scope: "platform", page: "/admin/institutions/academic-years" },
  { key: "institution.ai_settings", label: "Institution AI Settings", description: "institution AI settings", scope: "institution", page: "/admin/ai-settings" },
  { key: "notifications.inbox", label: "Notifications", description: "notification inbox", scope: "institution", page: "/admin/notifications" },
  { key: "notifications.muted", label: "Muted Notifications", description: "muted notification preferences", scope: "institution", page: "/admin/notifications/muted" },
  { key: "notifications.controls", label: "Notification Controls", description: "institution notification controls", scope: "institution", page: "/admin/notifications/settings" },
  { key: "support.tickets", label: "Institution Support", description: "institution support with the platform team", scope: "institution", page: "/admin/support" },
  { key: "student.support", label: "Student Support", description: "student support with the institution admin", scope: "institution", page: "/admin/support" },
  { key: "teacher.support", label: "Teacher Support", description: "teacher support with the institution admin", scope: "institution", page: "/admin/support" },
  { key: "parents.support", label: "Parent Support", description: "parent support with the institution admin", scope: "institution", page: "/admin/support" },
  { key: "driver.support", label: "Driver Support", description: "driver support with the institution admin", scope: "institution", page: "/admin/support" },
  { key: "tracker.history", label: "Tracker History", description: "tracker history", scope: "platform", page: "/admin/tracker" },
  { key: "settings.general", label: "General Settings", description: "general settings", scope: "platform", page: "/admin/settings" },
  { key: "company.pages", label: "Company Pages", description: "company pages and footer content", scope: "institution", page: "/admin/company" },
  { key: "company.payment_methods", label: "Company Payment Methods", description: "payment methods, UPI, and bank accounts", scope: "institution", page: "/admin/company" },
  { key: "settings.tracker", label: "Tracker Settings", description: "tracker settings", scope: "platform", page: "/admin/settings/tracker" },
  { key: "settings.notifications", label: "Notification Settings", description: "notification types and templates", scope: "platform", page: "/admin/settings/notifications" },
  { key: "settings.payments", label: "Payment Settings", description: "student payment collection settings", scope: "institution", page: "/admin/settings/payments" },
  { key: "settings.subscription", label: "Subscription", description: "institution subscription plans and status", scope: "institution", page: "/admin/settings/subscription" },
  { key: "settings.ai", label: "AI Settings", description: "AI settings", scope: "platform", page: "/admin/ai-settings" },
  { key: "settings.security", label: "Security Settings", description: "security settings", scope: "platform", page: "/admin/settings/security" },
  { key: "settings.logs", label: "System & Data Logs", description: "system audit trail and record modification history", scope: "institution", page: "/admin/settings/logs" },
  { key: "settings.recycle_bin", label: "Recycle Bin", description: "recoverable deleted records", scope: "institution", page: "/admin/settings/recycle-bin" },
  { key: "settings.help_center", label: "Help Center Settings", description: "help center overview", scope: "platform", page: "/admin/settings/help-center" },
  { key: "settings.help_center_categories", label: "Help Center Categories", description: "help center categories", scope: "platform", page: "/admin/settings/help-center/categories" },
  { key: "settings.help_center_articles", label: "Help Center Articles", description: "help center articles", scope: "platform", page: "/admin/settings/help-center/articles" },
  { key: "settings.help_center_updates", label: "Help Center Updates", description: "help center recent updates", scope: "platform", page: "/admin/settings/help-center/updates" },
  { key: "settings.help_center_analytics", label: "Help Center Analytics", description: "help center analytics", scope: "platform", page: "/admin/settings/help-center/analytics" },
  { key: "admin.inventory", label: "Inventory Management", description: "manage inventory, products, stock levels and assets", scope: "institution", page: "/admin/inventory" },
  { key: "admin.vendors", label: "Vendors & Suppliers", description: "manage vendors and suppliers", scope: "institution", page: "/admin/vendors" },
  { key: "admin.team", label: "Internal Admin Team", description: "manage internal admin team members", scope: "institution", page: "/admin/team" },
];

export const LEGACY_PERMISSION_MODULE_MAP: Record<string, string> = {
  "user_management.users": "users.allusers",
  "users.all": "users.allusers",
  "users.alluser": "users.allusers",
  "user_management.leads": "analytics.leads",
  "users.leads": "analytics.leads",
  "staff.teachers": "managestaff.allstaff",
  "staff.drivers": "managestaff.allstaff",
  "staff.parents": "managestaff.allstaff",
  "manage_staff.teachers": "managestaff.allstaff",
  "manage_staff.drivers": "managestaff.allstaff",
  "manage_staff.parents": "managestaff.allstaff",
  "managestaff.teachers": "managestaff.allstaff",
  "managestaff.drivers": "managestaff.allstaff",
  "managestaff.parents": "managestaff.allstaff",
  "teacher": "managestaff.allstaff",
  "driver": "managestaff.allstaff",
  "parent": "managestaff.allstaff",
  "access.scope_types": "rolespermissions.scopetypes",
  "access.permissions": "rolespermissions.permissions",
  "access.roles": "rolespermissions.roles",
  "access.role_permissions": "rolespermissions.rolepermissions",
  "access.institution_memberships": "rolespermissions.institutionmemberships",
  "access.institution_role_permissions": "rolespermissions.institutionrolepermissions",
  "access.personal_permissions": "rolespermissions.personalpermissions",
  "roles_permissions.scope_types": "rolespermissions.scopetypes",
  "roles_permissions.permissions": "rolespermissions.permissions",
  "roles_permissions.roles": "rolespermissions.roles",
  "roles_permissions.role_permissions": "rolespermissions.rolepermissions",
  "roles_permissions.institution_memberships": "rolespermissions.institutionmemberships",
  "roles_permissions.institution_role_permissions": "rolespermissions.institutionrolepermissions",
  "roles_permissions.personal_permissions": "rolespermissions.personalpermissions",
  "student_management.students": "managestudents.allstudents",
  "student_management.fee_management": "managestudents.fee_management",
  "student_management.attendance": "managestudents.attendance",
  "student_management.achievements": "managestudents.achievements",
  "student_management.assignments": "managestudents.assignments",
  "student_management.exams": "managestudents.exams",
  "student_management.practice": "managestudents.practice",
  "student_management.results": "managestudents.result",
  "student_management.transfer_certificates": "managestudents.tc",
  "student_management.cards": "managestudents.cards",
  "student_management.notes": "managestudents.notes",
  "manage_students.all_students": "managestudents.allstudents",
  "manage_students.fee_management": "managestudents.fee_management",
  "manage_students.attendance": "managestudents.attendance",
  "manage_students.achievements": "managestudents.achievements",
  "manage_students.assignments": "managestudents.assignments",
  "manage_students.exams": "managestudents.exams",
  "manage_students.practice": "managestudents.practice",
  "manage_students.result": "managestudents.result",
  "manage_students.tc": "managestudents.tc",
  "manage_students.cards": "managestudents.cards",
  "manage_students.notes": "managestudents.notes",
  "student.attendance": "student.myclassroom.attendance",
  "student.achievements": "student.myclassroom.achievements",
  "student.assignments": "student.myclassroom.assignments",
  "student.practice_exams": "student.myclassroom.practice_exams",
  "student.exams": "student.myclassroom.exams",
  "student.results": "student.myclassroom.results",
  "student.notes": "student.myclassroom.notes",
  "student.fees": "student.myclassroom.fees",
  "student.guardians": "student.guardians",
  "student.notifications": "student.notification.all",
  "student.notification": "student.notification.all",
  "student.practice": "student.myclassroom.practice_exams",
  "classroom.attendance": "student.myclassroom.attendance",
  "classroom.guardians": "student.guardians",
  "classroom.achievements": "student.myclassroom.achievements",
  "classroom.assignments": "student.myclassroom.assignments",
  "classroom.practice_exams": "student.myclassroom.practice_exams",
  "classroom.exams": "student.myclassroom.exams",
  "classroom.results": "student.myclassroom.results",
  "classroom.notes": "student.myclassroom.notes",
  "classroom.fees": "student.myclassroom.fees",
  "classroom.my_timetable": "student.myclassroom.timetable",
  "classroom.teacher_timetable": "teacher.myclassroom.timetable",
  "student.institution_calendar": "student.myinstitution.calendar",
  "classroom.institution_calendar": "student.myinstitution.calendar",
  "myinstitution.institution_calendar": "student.myinstitution.calendar",
  "content.categories.category_tree": "content.category_tree",
  "content.categories.manage_categories": "content.categories",
  "content.categories.boards": "content.boards",
  "content.categories.universities": "content.universities",
  "content.categories.subjects": "content.subjects",
  "content.master_data.skills": "content.skills",
  "content.master_data.designations": "content.designations",
  "content.master_data.locations": "content.locations",
  "content.master_data.syllabus": "content.syllabus",
  "content.master_data.card_categories": "content.card_categories",
  "content.master_data.card_templates": "content.card_templates",
  "content.master_data.assignments": "content.assignments",
  "content.master_data.exams": "content.exams",
  "content.master_data.notes": "content.notes",
  "content.master_data.practice_exams": "content.practice_exams",
  "content.master_data.institute_calendar": "content.institute_calendar",
  "content.master_data.timetable_setup": "content.timetable_setup",
  "content.master_data.attendance_setup": "content.attendance_setup",
  "content.blogs": "content.blog",
  "institutions.master.institution_type": "institution.types",
  "institutions.master.institution_subtype": "institution.subtypes",
  "institutions.master.program_type": "institution.program_types",
  "institutions.master.facility_type": "institution.facility_types",
  "institutions.master.language": "institution.languages",
  "institutions.institutions": "institution.institutions",
  "institutions.programs": "institution.programs",
  "institutions.placements": "institution.placements",
  "institutions.facilities": "institution.facilities",
  "institutions.cutoffs": "institution.cutoffs",
  "institutions.scholarships": "institution.scholarships",
  "institutions.news": "institution.noticeboard",
  "institutions.noticeboard": "institution.noticeboard",
  "institutions.academic_years": "settings.academic_sessions",
  "notifications.all": "notifications.inbox",
  "notifications.muted": "notifications.muted",
  "finance.recurring_expense": "finance.recurring_expenses",
  "finance.platform.recurring_expense": "finance.platform.recurring_expenses",
  "settings.payment": "settings.payments",
  "settings.payment_settings": "settings.payments",
  "settings.payments_settings": "settings.payments",
  "settings.subscriptions": "settings.subscription",
  "settings.subscription_settings": "settings.subscription",
  "settings.ai_settings": "settings.ai",
};

export const EXTRA_PERMISSION_CODES = ["institution.ai_settings.manage"] as const;

export const PAGE_VIEW_PERMISSIONS: Record<string, string> = Object.fromEntries(
  ADMIN_PERMISSION_MODULES.map((module) => [module.page, `${module.key}.view`])
);

export function normalizeAdminPath(pathname: string) {
  return toCanonicalAdminPath(pathname).split("?")[0].replace(/\/+$/, "") || "/admin";
}

export function adminPathMatchesRoute(pathname: string, route: string) {
  const normalizedPath = normalizeAdminPath(pathname);
  const normalizedRoute = normalizeAdminPath(route);
  return (
    normalizedPath === normalizedRoute ||
    (normalizedRoute !== "/admin" && normalizedPath.startsWith(`${normalizedRoute}/`))
  );
}

function getPermissionModule(permission: string) {
  const parts = permission.split(".");
  const action = parts.at(-1);
  const moduleKey = PERMISSION_ACTIONS.includes(action as (typeof PERMISSION_ACTIONS)[number])
    ? parts.slice(0, -1).join(".")
    : permission;

  return ADMIN_PERMISSION_MODULES.find((item) => item.key === moduleKey) ?? null;
}

export function isPlatformFullAccess(user: { permissions?: string[] } | null | undefined) {
  return Boolean(user?.permissions?.includes(FULL_ACCESS_PERMISSION));
}

export function isPlatformAdminUser(
  user: {
    role_codes?: string[];
    is_super_admin?: boolean;
    permissions?: string[];
  } | null | undefined
) {
  return Boolean(
    user?.is_super_admin ||
    user?.role_codes?.includes("platform_admin") ||
    isPlatformFullAccess(user)
  );
}

export function isInstitutionAdminUser(
  user: {
    role_codes?: string[];
  } | null | undefined
) {
  return Boolean(
    user?.role_codes?.some((role) =>
      [
        "institution_admin",
        "professional_organization",
        "school_owner",
        "college_owner",
        "university_owner",
        "library_owner",
        "pg_owner",
      ].includes(role)
    )
  );
}

export function isStudentUser(
  user: {
    role_codes?: string[];
  } | null | undefined
) {
  return Boolean(user?.role_codes?.includes("student"));
}

export function isTeacherUser(
  user: {
    role_codes?: string[];
  } | null | undefined
) {
  return Boolean(user?.role_codes?.includes("teacher"));
}

export function isParentUser(
  user: {
    role_codes?: string[];
  } | null | undefined
) {
  return Boolean(user?.role_codes?.includes("parent"));
}

const PLATFORM_ADMIN_HIDDEN_PATHS = [
  "/admin/access-control/institution-memberships",
  "/admin/access-control/institution-role-permissions",
  "/admin/students",
  "/admin/institutions/news",
  "/admin/master-data/institute-calendar",
  "/admin/master-data/timetable-setup",
] as const;

export function isAdminPathVisibleForRole(
  user: {
    role_codes?: string[];
    is_super_admin?: boolean;
    permissions?: string[];
  } | null | undefined,
  pathname: string
) {
  const normalized = normalizeAdminPath(pathname);
  if (normalized === "/admin/classroom" || normalized.startsWith("/admin/classroom/")) {
    return (
      !isInstitutionAdminUser(user) &&
      (isStudentUser(user) || isTeacherUser(user) || isParentUser(user))
    );
  }

  if (normalized === "/admin/institution" || normalized.startsWith("/admin/institution/")) {
    if (normalized === "/admin/institution/complaints") {
      return !isPlatformAdminUser(user);
    }
    if (normalized === "/admin/institution/my-attendance") {
      return isTeacherUser(user) || Boolean(user?.role_codes?.includes("driver"));
    }
    if (normalized === "/admin/institution/my-salary") {
      return isTeacherUser(user) || Boolean(user?.role_codes?.includes("driver"));
    }
    if (normalized === "/admin/institution/my-letters") {
      return isTeacherUser(user) || Boolean(user?.role_codes?.includes("driver"));
    }
    return isStudentUser(user) || isParentUser(user);
  }

  if (normalized === "/admin/guardians" || normalized === "/admin/students/guardians" || normalized === "/student/guardians") {
    return true;
  }

  if (normalized === "/admin/staff" || normalized.startsWith("/admin/staff/")) {
    return isPlatformAdminUser(user) || isInstitutionAdminUser(user);
  }

  if (normalized === "/admin/master-data" || normalized.startsWith("/admin/master-data")) {
    if (
      normalized === "/admin/master-data/timetable-setup" ||
      normalized === "/admin/master-data/attendance-setup" ||
      normalized === "/admin/master-data/institute-calendar" ||
      normalized === "/admin/master-data/card-templates" ||
      normalized === "/admin/master-data"
    ) {
      return isPlatformAdminUser(user) || isInstitutionAdminUser(user);
    }
    return isPlatformAdminUser(user);
  }

  if (normalized === "/admin/finance/allowance") {
    return (
      isPlatformAdminUser(user) ||
      isInstitutionAdminUser(user) ||
      isTeacherUser(user) ||
      Boolean(user?.role_codes?.includes("driver")) ||
      hasPermission(user, "finance.platform.allowance.view") ||
      hasPermission(user, "finance.allowance.view")
    );
  }

  if (normalized === "/admin/finance" || normalized.startsWith("/admin/finance/")) {
    return (
      isPlatformAdminUser(user) ||
      isInstitutionAdminUser(user) ||
      Boolean(user?.permissions?.some((permission) => permission.startsWith("finance.platform.")))
    );
  }

  if (normalized === "/admin/inventory" || normalized.startsWith("/admin/inventory/")) {
    return isPlatformAdminUser(user) || isInstitutionAdminUser(user) || hasPermission(user, "admin.inventory.view") || hasPermission(user, "admin.inventory");
  }

  if (normalized === "/admin/vendors" || normalized.startsWith("/admin/vendors/")) {
    return isPlatformAdminUser(user) || isInstitutionAdminUser(user) || hasPermission(user, "admin.vendors.view") || hasPermission(user, "admin.vendors");
  }

  if (normalized === "/admin/team" || normalized.startsWith("/admin/team/")) {
    return isPlatformAdminUser(user) || isInstitutionAdminUser(user) || hasPermission(user, "admin.team.view") || hasPermission(user, "admin.team");
  }

  if (!isPlatformAdminUser(user)) return true;

  return !PLATFORM_ADMIN_HIDDEN_PATHS.some(
    (hiddenPath) =>
      normalized === hiddenPath ||
      normalized.startsWith(`${hiddenPath}/`)
  );
}

export function isInstitutionScopedPermission(permission: string) {
  if (permission === FULL_ACCESS_PERMISSION) return true;
  return getPermissionModule(permission)?.scope === "institution";
}

export function isPlatformOnlyPermission(permission: string) {
  if (permission === FULL_ACCESS_PERMISSION) return true;
  return getPermissionModule(permission)?.scope === "platform";
}

export function isPermissionAssignableToRole(permission: string, roleCode?: string | null, roleScope?: string | null) {
  if (permission === FULL_ACCESS_PERMISSION) {
    return roleCode === "platform_admin";
  }

  const permissionModule = getPermissionModule(permission);
  if (!permissionModule) return false;

  if (permissionModule.scope === "platform") {
    return roleCode === "platform_admin" || roleScope === "platform";
  }

  if (permissionModule.key.startsWith("finance.platform.")) {
    return roleCode === "platform_admin" || roleScope === "platform";
  }

  const roleOwnedPrefix = permissionModule.key.split(".")[0];
  if (permissionModule.key === "teacher.myinstitution.noticeboard") {
    return roleCode === "teacher";
  }
  if (permissionModule.key === "teacher.myinstitution.myattendance") {
    return roleCode === "teacher" && (permission.endsWith(".view") || permission.endsWith(".create"));
  }
  if (permissionModule.key === "driver.myinstitution.myattendance") {
    return roleCode === "driver" && (permission.endsWith(".view") || permission.endsWith(".create"));
  }
  if (permissionModule.key === "teacher.myinstitution.mysalary") {
    return roleCode === "teacher" && permission.endsWith(".view");
  }
  if (permissionModule.key === "driver.myinstitution.mysalary") {
    return roleCode === "driver" && permission.endsWith(".view");
  }
  if (permissionModule.key === "teacher.myinstitution.myletters") {
    return roleCode === "teacher" && permission.endsWith(".view");
  }
  if (permissionModule.key === "driver.myinstitution.myletters") {
    return roleCode === "driver" && permission.endsWith(".view");
  }
  if (roleCode === "teacher") {
    if (roleOwnedPrefix === "teacher") {
      return permissionModule.key.endsWith(".complaints") || permission.endsWith(".view");
    }
    return (
      permissionModule.key.startsWith("managestudents.") ||
      permissionModule.key.startsWith("content.") ||
      permissionModule.key.startsWith("notifications.") ||
      permissionModule.key.startsWith("support.")
    );
  }

  const supportRoleOwner: Record<string, string> = {
    student: "student.support",
    teacher: "teacher.support",
    parent: "parents.support",
    driver: "driver.support",
  };
  if (Object.values(supportRoleOwner).includes(permissionModule.key)) {
    return supportRoleOwner[roleCode ?? ""] === permissionModule.key && permission.endsWith(".view");
  }

  if (roleCode === "student") {
    return permissionModule.key.startsWith("student.") && permission.endsWith(".view");
  }

  if (["student", "parent", "teacher", "driver"].includes(roleOwnedPrefix)) {
    return roleCode === roleOwnedPrefix && (
      permissionModule.key.endsWith(".complaints") || permission.endsWith(".view")
    );
  }

  if (roleCode === "parent") {
    return false;
  }

  return true;
}

export function isAdminPathPlatformOnly(pathname: string) {
  const permission = getPageViewPermission(pathname);
  return isPlatformOnlyPermission(permission);
}

export function getPermissionName(code: string) {
  if (code === FULL_ACCESS_PERMISSION) return "Full system access";

  const parts = code.split(".");
  const action = parts.pop();
  const permissionModule = ADMIN_PERMISSION_MODULES.find((item) => item.key === parts.join("."));
  const actionLabel =
    action === "view" ? "View" :
    action === "create" ? "Create" :
    action === "edit" ? "Edit" :
    action === "delete" ? "Delete" :
    action;

  return `${actionLabel} ${permissionModule?.label ?? parts.join(" ")}`;
}

export function getPermissionDescription(code: string) {
  if (code === FULL_ACCESS_PERMISSION) return "Bypasses all permission checks.";

  const parts = code.split(".");
  const action = parts.pop();
  const permissionModule = ADMIN_PERMISSION_MODULES.find((item) => item.key === parts.join("."));
  return `Can ${action} ${permissionModule?.description ?? parts.join(" ")}.`;
}

export function getCrudPermissionCodes() {
  return ADMIN_PERMISSION_MODULES.flatMap((module) => {
    if (module.key === "institution.ai_settings") return ["institution.ai_settings.view"];
    if (
      module.key === "student.dashboard" ||
      module.key === "parent.dashboard" ||
      module.key === "teacher.dashboard" ||
      module.key === "student.myinstitution.noticeboard" ||
      module.key === "student.myprogram" ||
      module.key === "student.notification.all" ||
      module.key === "parent.myinstitution.noticeboard" ||
      module.key === "driver.myinstitution.noticeboard" ||
      module.key.startsWith("student.myclassroom.") ||
      module.key.startsWith("parent.childclassroom.") ||
      module.key.startsWith("teacher.myclassroom.") ||
      module.key === "student.myinstitution.calendar" ||
      module.key === "parent.childinstitution.calendar"
      || module.key === "student.support"
      || module.key === "teacher.support"
      || module.key === "parents.support"
      || module.key === "driver.support"
    ) return [`${module.key}.view`];
    if (
      module.key === "teacher.myinstitution.myattendance" ||
      module.key === "driver.myinstitution.myattendance"
    ) return [`${module.key}.view`, `${module.key}.create`];
    if (
      module.key === "teacher.myinstitution.mysalary" ||
      module.key === "driver.myinstitution.mysalary" ||
      module.key === "teacher.myinstitution.myletters" ||
      module.key === "driver.myinstitution.myletters"
    ) return [`${module.key}.view`];
    return PAGE_ACTIONS.map((action) => `${module.key}.${action}`);
  });
}

export function getManagedPermissionCodes() {
  return Array.from(new Set([...getCrudPermissionCodes(), ...EXTRA_PERMISSION_CODES]));
}

export function getLegacyPermissionCodeMap() {
  return Object.fromEntries(
    Object.entries(LEGACY_PERMISSION_MODULE_MAP).flatMap(([legacyModule, currentModule]) =>
      PAGE_ACTIONS.map((action) => [`${legacyModule}.${action}`, `${currentModule}.${action}`])
    )
  );
}

export function getLegacyPermissionCodeEntries() {
  const parentTargets = [
    "parent.childclassroom.attendance.view",
    "parent.childclassroom.assignments.view",
    "parent.childclassroom.practice_exams.view",
    "parent.childclassroom.exams.view",
    "parent.childclassroom.timetable.view",
    "parent.childclassroom.idcard.view",
    "parent.childclassroom.fees.view",
    "parent.childinstitution.calendar.view",
  ];
  return [
    ...Object.entries(getLegacyPermissionCodeMap()),
    ["classroom.idcard.view", "student.myclassroom.idcard.view"],
    ["classroom.results.view", "student.myclassroom.results.view"],
    ["teacher.institution.news.view", "teacher.myinstitution.noticeboard.view"],
    ["teachers.institution.noticeboard.view", "teacher.myinstitution.noticeboard.view"],
    ["teachers.institution.noticeboard.create", "teacher.myinstitution.noticeboard.create"],
    ["teachers.institution.noticeboard.edit", "teacher.myinstitution.noticeboard.edit"],
    ["teachers.institution.noticeboard.delete", "teacher.myinstitution.noticeboard.delete"],
    ["student.institution.noticeboard.view", "student.myinstitution.noticeboard.view"],
    ["parent.institution.noticeboard.view", "parent.myinstitution.noticeboard.view"],
    ["driver.institution.noticeboard.view", "driver.myinstitution.noticeboard.view"],
    ["teacher.myinstitution.myattendace.view", "teacher.myinstitution.myattendance.view"],
    ["teacher.myinstitution.myattendace.create", "teacher.myinstitution.myattendance.create"],
    ["driver.myinstitution.myattendace.view", "driver.myinstitution.myattendance.view"],
    ["driver.myinstitution.myattendace.create", "driver.myinstitution.myattendance.create"],
    ["institution.news.view", "institution.noticeboard.view"],
    ["institution.news.create", "institution.noticeboard.create"],
    ["institution.news.edit", "institution.noticeboard.edit"],
    ["institution.news.delete", "institution.noticeboard.delete"],
    ["student.institution.news.view", "student.myinstitution.noticeboard.view"],
    ["teachers.institution.news.view", "teacher.myinstitution.noticeboard.view"],
    ["teachers.institution.news.create", "teacher.myinstitution.noticeboard.create"],
    ["teachers.institution.news.edit", "teacher.myinstitution.noticeboard.edit"],
    ["teachers.institution.news.delete", "teacher.myinstitution.noticeboard.delete"],
    ["parent.institution.news.view", "parent.myinstitution.noticeboard.view"],
    ["driver.institution.news.view", "driver.myinstitution.noticeboard.view"],
    ...parentTargets.map((target) => ["parent.student_records.view", target]),
  ] as Array<[string, string]>;
}

export type InstitutionMembership = {
  id: number;
  institution_id: number;
  institution_name: string | null;
  institution_board_id?: number | null;
  institution_board_name?: string | null;
  role_id: number;
  role_code: string;
  role_name: string;
  permissions: string[];
};

export type PermissionUser = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  is_verified: boolean;
  roles: string[];
  role_codes: string[];
  permissions: string[];
  memberships: InstitutionMembership[];
  under_institution_id?: number | null;
  avatar_url?: string | null;
};

type PermissionTarget = {
  institutionId?: number | null;
};

function permissionSetAllows(permissionSet: Set<string>, permission: string) {
  if (permissionSet.has(FULL_ACCESS_PERMISSION) || permissionSet.has(permission)) return true;
  return getLegacyPermissionCodeEntries().some(
    ([legacy, current]) => current === permission && permissionSet.has(legacy)
  );
}

export function hasPermission(
  user: {
    permissions?: string[];
    memberships?: InstitutionMembership[];
    is_super_admin?: boolean;
    role_codes?: string[];
  } | null | undefined,
  permission: string,
  target: PermissionTarget = {}
) {
  if (!user) return false;
  if (permission === AUTHENTICATED_LOOKUP_PERMISSION) return true;
  if (user.is_super_admin || isPlatformFullAccess(user)) return true;
  if (permission === FULL_ACCESS_PERMISSION) return false;
  if (
    permission.startsWith("settings.recycle_bin.") &&
    user.role_codes?.includes("platform_admin")
  ) {
    return true;
  }

  const platformPermissions = new Set(user.permissions ?? []);
  if (permissionSetAllows(platformPermissions, permission)) return true;

  if (!isInstitutionScopedPermission(permission)) return false;

  if (isInstitutionAdminUser(user)) {
    if (target.institutionId) {
      const allowedIds = (user.memberships ?? []).map((m) => m.institution_id);
      if ((user as any).under_institution_id) allowedIds.push((user as any).under_institution_id);
      return allowedIds.includes(target.institutionId);
    }
    return true;
  }

  if (target.institutionId) {
    return user.memberships?.some((membership) => {
      if (membership.institution_id !== target.institutionId) return false;
      return permissionSetAllows(new Set(membership.permissions ?? []), permission);
    }) ?? false;
  }

  return user.memberships?.some((membership) =>
    permissionSetAllows(new Set(membership.permissions ?? []), permission)
  ) ?? false;
}

export function canAccessAdminArea(
  user: {
    role_codes?: string[];
    permissions?: string[];
    memberships?: InstitutionMembership[];
    is_super_admin?: boolean;
  } | null | undefined
) {
  if (!user) return false;
  if (user.is_super_admin || isPlatformFullAccess(user)) return true;
  if (
    user.role_codes?.some((role) =>
      [
        "student",
        "parent",
        "guardian",
        "teacher",
        "driver",
        "institution_admin",
        "professional_organization",
        "school_owner",
        "college_owner",
        "university_owner",
        "library_owner",
        "pg_owner",
      ].includes(role)
    )
  ) {
    return true;
  }
  return ADMIN_PERMISSION_MODULES.some((module) =>
    hasPermission(user, `${module.key}.view`)
  );
}

function permissionForAction(module: string, verb: string) {
  if (verb === "GET") return `${module}.view`;
  if (verb === "POST") return `${module}.create`;
  if (verb === "PATCH" || verb === "PUT") return `${module}.edit`;
  if (verb === "DELETE") return `${module}.delete`;
  return `${module}.view`;
}

function isSharedLookupRequest(pathname: string, verb: string) {
  if (verb !== "GET") return false;

  return (
    pathname.includes("/api/admin/categories/qualifications") ||
    pathname.includes("/api/admin/categories/tree") ||
    pathname.includes("/api/admin/categories") ||
    pathname.includes("/api/admin/boards") ||
    pathname.includes("/api/admin/universities") ||
    pathname.includes("/api/admin/certifications") ||
    pathname.includes("/api/admin/subjects") ||
    pathname.includes("/api/admin/sections") ||
    pathname.includes("/api/admin/content/courses") ||
    pathname.includes("/api/admin/master-data/skills") ||
    pathname.includes("/api/admin/master-data/designations") ||
    pathname.includes("/api/admin/master-data/syllabi") ||
    pathname.includes("/api/admin/master-data/assignments") ||
    pathname.includes("/api/admin/master-data/notes") ||
    pathname.includes("/api/admin/master-data/exams") ||
    pathname.includes("/api/admin/master-data/practice-exams") ||
    pathname.includes("/api/admin/master-data/card-templates") ||
    pathname.includes("/api/admin/master-data/institute-calendar") ||
    pathname.includes("/api/admin/institutions/programs") ||
    pathname.includes("/api/admin/institutions/profiles") ||
    pathname.includes("/api/admin/institutions/facilities") ||
    pathname.includes("/api/admin/institutions/gallery") ||
    pathname.includes("/api/admin/institutions/hostels") ||
    pathname.includes("/api/admin/institutions/libraries") ||
    pathname.includes("/api/admin/institutions/placements") ||
    pathname.includes("/api/admin/institutions/scholarships") ||
    pathname.includes("/api/admin/sales/enquiries") ||
    pathname.includes("/api/admin/sales/pipeline") ||
    pathname.includes("/api/admin/sales/enrollments") ||
    pathname.includes("/api/program-types")
  );
}

export function getRequestPermission(method: string, url: string) {
  const pathname = new URL(url).pathname;
  const searchParams = new URL(url).searchParams;
  const verb = method.toUpperCase();

  if (isSharedLookupRequest(pathname, verb)) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/access-control/options") || pathname.includes("/api/admin/access/options")) return "rolespermissions.institutionmemberships.view";
  if (pathname.includes("/api/admin/access-control/scope-types")) return permissionForAction("rolespermissions.scopetypes", verb);
  if (pathname.includes("/api/admin/access-control/permissions")) return permissionForAction("rolespermissions.permissions", verb);
  if (pathname.includes("/api/admin/access-control/roles")) return permissionForAction("rolespermissions.roles", verb);
  if (pathname.includes("/api/admin/access-control/role-permissions")) return permissionForAction("rolespermissions.rolepermissions", verb);
  if (pathname.includes("/api/admin/access-control/institution-memberships")) return permissionForAction("rolespermissions.institutionmemberships", verb);
  if (pathname.includes("/api/admin/access-control/institution-role-permissions")) return permissionForAction("rolespermissions.institutionrolepermissions", verb);
  if (pathname.includes("/api/admin/access-control/personal-permissions")) return permissionForAction("rolespermissions.personalpermissions", verb);
  if (pathname.includes("/api/admin/access/scope-types")) return permissionForAction("rolespermissions.scopetypes", verb);
  if (pathname.includes("/api/admin/access/permissions")) return permissionForAction("rolespermissions.permissions", verb);
  if (pathname.includes("/api/admin/access/roles")) return permissionForAction("rolespermissions.roles", verb);
  if (pathname.includes("/api/admin/access/role-permissions")) return permissionForAction("rolespermissions.rolepermissions", verb);
  if (pathname.includes("/api/admin/access/institution-memberships")) return permissionForAction("rolespermissions.institutionmemberships", verb);
  if (pathname.includes("/api/admin/access/institution-role-permissions")) return permissionForAction("rolespermissions.institutionrolepermissions", verb);
  if (pathname.includes("/api/admin/access")) return "rolespermissions.institutionmemberships.view";
  if (pathname.includes("/api/admin/roles")) return permissionForAction("users.allusers", verb);
  if (pathname.includes("/api/admin/users/leads")) return permissionForAction("analytics.leads", verb);
  if (pathname.includes("/api/admin/users") && pathname.includes("/password")) {
    return AUTHENTICATED_LOOKUP_PERMISSION;
  }
  if (
    pathname.includes("/api/admin/users") &&
    ["all", "teacher_driver"].includes(searchParams.get("staffScope") ?? "")
  ) {
    return permissionForAction("managestaff.allstaff", verb);
  }
  if (pathname.includes("/api/admin/users")) {
    const requestedRoleCodes = [
      searchParams.get("staffRole"),
      searchParams.get("roleCode"),
      ...(searchParams.get("roleCodes")?.split(",") ?? []),
    ]
      .map((roleCode) => roleCode?.trim() ?? "")
      .filter(Boolean);

    const staffPermissionModules = requestedRoleCodes
      .map((roleCode) => getStaffPermissionModule(roleCode))
      .filter((module): module is string => Boolean(module));

    if (
      requestedRoleCodes.length > 0 &&
      staffPermissionModules.length === requestedRoleCodes.length &&
      new Set(staffPermissionModules).size === 1
    ) {
      return permissionForAction(staffPermissionModules[0], verb);
    }
  }
  if (pathname.includes("/api/admin/users")) return permissionForAction("users.allusers", verb);
  if (pathname.includes("/api/admin/student-records")) return permissionForAction("managestudents.allstudents", verb);
  if (pathname.includes("/api/admin/students/fee-management")) return permissionForAction("managestudents.fee_management", verb);
  if (pathname.includes("/api/admin/students/attendance")) return permissionForAction("managestudents.attendance", verb);
  if (pathname.includes("/api/admin/students/achievements")) return permissionForAction("managestudents.achievements", verb);
  if (pathname.includes("/api/admin/students/assignments")) return permissionForAction("managestudents.assignments", verb);
  if (pathname.includes("/api/admin/students/exams")) return permissionForAction("managestudents.exams", verb);
  if (pathname.includes("/api/admin/students/practice")) return permissionForAction("managestudents.practice", verb);
  if (pathname.includes("/api/admin/students/result")) return permissionForAction("managestudents.result", verb);
  if (pathname.includes("/api/admin/students/tc")) return permissionForAction("managestudents.tc", verb);
  if (pathname.includes("/api/admin/students/cards")) return permissionForAction("managestudents.cards", verb);
  if (pathname.includes("/api/admin/students/notes")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/students")) return permissionForAction("managestudents.allstudents", verb);
  if (pathname.includes("/api/admin/staff/attendance")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/staff/salary")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/staff/letters")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/staff/jobs")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/staff/applicants")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/finance/income")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/finance/expense")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/finance/allowance")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/classroom/attendance")) return "student.myclassroom.attendance.view";
  if (pathname.includes("/api/admin/classroom/achievements")) return "student.myclassroom.achievements.view";
  if (pathname.includes("/api/admin/classroom/assignments")) return "student.myclassroom.assignments.view";
  if (pathname.includes("/api/admin/classroom/practice-exams")) return "student.myclassroom.practice_exams.view";
  if (pathname.includes("/api/admin/classroom/exams")) return "student.myclassroom.exams.view";
  if (pathname.includes("/api/admin/classroom/results")) return "student.myclassroom.results.view";
  if (pathname.includes("/api/admin/classroom/my-timetable")) return "student.myclassroom.timetable.view";
  if (pathname.includes("/api/admin/classroom/id-card")) return "student.myclassroom.idcard.view";
  if (pathname.includes("/api/admin/classroom/fees")) return "student.myclassroom.fees.view";
  if (pathname.includes("/api/admin/student/programs")) return "student.myprogram.view";
  if (pathname.includes("/api/admin/institution/calendar")) return "student.myinstitution.calendar.view";
  if (pathname.includes("/api/admin/institution/complaints")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/sales")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/analytics/sales")) return permissionForAction("analytics.sales", verb);
  if (pathname.includes("/api/admin/analytics/reports")) return permissionForAction("analytics.reports", verb);
  if (pathname.includes("/api/admin/analytics")) return permissionForAction("analytics.overview", verb);
  if (pathname.includes("/api/admin/content/courses")) return permissionForAction("content.courses", verb);
  if (pathname.includes("/api/admin/categories/tree")) return permissionForAction("content.category_tree", verb);
  if (pathname.includes("/api/admin/categories")) return permissionForAction("content.categories", verb);
  if (pathname.includes("/api/admin/content/blog")) return permissionForAction("content.blog", verb);
  if (pathname.includes("/api/admin/boards")) return permissionForAction("content.boards", verb);
  if (pathname.includes("/api/admin/universities")) return permissionForAction("content.universities", verb);
  if (pathname.includes("/api/admin/certifications")) return permissionForAction("content.certifications", verb);
  if (pathname.includes("/api/admin/subjects")) return permissionForAction("content.subjects", verb);
  if (pathname.includes("/api/admin/master-data/skills")) return permissionForAction("content.skills", verb);
  if (pathname.includes("/api/admin/master-data/designations")) return permissionForAction("content.designations", verb);
  if (pathname.includes("/api/admin/master-data/locations")) return permissionForAction("content.locations", verb);
  if (pathname.includes("/api/admin/master-data/card-categories")) return permissionForAction("content.card_categories", verb);
  if (pathname.includes("/api/admin/master-data/card-templates/preview-images")) return "content.card_templates.view";
  if (pathname.includes("/api/admin/master-data/card-templates")) return permissionForAction("content.card_templates", verb);
  if (pathname.includes("/api/admin/master-data/assignments")) return permissionForAction("content.assignments", verb);
  if (pathname.includes("/api/admin/master-data/notes")) return permissionForAction("content.notes", verb);
  if (pathname.includes("/api/admin/master-data/exams")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/master-data/practice-exams")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/master-data/institute-calendar")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/master-data/attendance-setup")) return permissionForAction("content.attendance_setup", verb);
  if (pathname.includes("/api/admin/master-data/syllabi")) return permissionForAction("content.syllabus", verb);
  if (pathname.includes("/api/admin/master-data/organizations")) return permissionForAction("content.designations", verb);
  if (pathname.includes("/api/admin/timetable/slots")) return permissionForAction("content.timetable_setup", verb);
  if (pathname.includes("/api/admin/timetable/subject-teachers")) return permissionForAction("content.timetable_setup", verb);
  if (pathname.includes("/api/admin/timetable/class-teacher")) return permissionForAction("content.timetable_setup", verb);
  if (pathname.includes("/api/admin/timetable/entries")) return permissionForAction("content.timetable_setup", verb);
  if (pathname.includes("/api/admin/uploads/image") || pathname.includes("/api/admin/uploads/documents")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/institutions/program-media")) return permissionForAction("institution.programs", verb);
  if (pathname.includes("/api/admin/institutions/institution-media")) return permissionForAction("institution.institutions", verb);
  if (pathname.includes("/api/admin/uploads")) return permissionForAction("content.media", verb);
  if (pathname.includes("/api/admin/institutions/types")) return permissionForAction("institution.types", verb);
  if (pathname.includes("/api/admin/institutions/subtypes")) return permissionForAction("institution.subtypes", verb);
  if (pathname.includes("/api/admin/institutions/program-types")) return permissionForAction("institution.program_types", verb);
  if (pathname.includes("/api/admin/institutions/facility-types")) return permissionForAction("institution.facility_types", verb);
  if (pathname.includes("/api/admin/institutions/languages")) return permissionForAction("institution.languages", verb);
  if (pathname.includes("/api/admin/institutions/programs")) return permissionForAction("institution.programs", verb);
  if (pathname.includes("/api/admin/institutions/placements")) return permissionForAction("institution.placements", verb);
  if (pathname.includes("/api/admin/institutions/facilities") || pathname.includes("/api/admin/institution/facilities")) return permissionForAction("institution.facilities", verb);
  if (pathname.includes("/api/admin/institutions/gallery") || pathname.includes("/api/admin/institution/gallery")) return permissionForAction("institution.gallery", verb);
  if (pathname.includes("/api/admin/institutions/hostels") || pathname.includes("/api/admin/institution/hostels")) return permissionForAction("institution.hostels", verb);
  if (pathname.includes("/api/admin/institutions/libraries") || pathname.includes("/api/admin/institution/libraries")) return permissionForAction("institution.libraries", verb);
  if (pathname.includes("/api/admin/institutions/cutoffs")) return permissionForAction("institution.cutoffs", verb);
  if (pathname.includes("/api/admin/institutions/scholarships")) return permissionForAction("institution.scholarships", verb);
  if (pathname.includes("/api/admin/institutions/news")) return permissionForAction("institution.noticeboard", verb);
  if (pathname.includes("/api/admin/institutions/session-templates")) {
    return verb === "GET" ? AUTHENTICATED_LOOKUP_PERMISSION : permissionForAction("settings.academic_sessions", verb);
  }
  if (pathname.includes("/api/admin/institutions/academic-years")) {
    return verb === "GET" ? AUTHENTICATED_LOOKUP_PERMISSION : permissionForAction("settings.academic_sessions", verb);
  }
  if (pathname.includes("/api/admin/sales/enquiries")) return permissionForAction("sales.enquiries", verb);
  if (pathname.includes("/api/admin/sales/pipeline")) return permissionForAction("sales.pipeline", verb);
  if (pathname.includes("/api/admin/sales/enrollments")) return permissionForAction("sales.enrollments", verb);
  if (pathname.includes("/api/admin/sales/leads")) return permissionForAction("sales.leads", verb);
  if (pathname.includes("/api/admin/institutions/profiles")) return permissionForAction("institution.institutions", verb);
  if (pathname.includes("/api/admin/institutions")) return permissionForAction("institution.institutions", verb);
  if (pathname.includes("/api/admin/institution-notification-settings")) return permissionForAction("notifications.controls", verb);
  if (pathname.includes("/api/admin/notification-templates")) return permissionForAction("settings.notifications", verb);
  if (pathname.includes("/api/admin/notification-preferences")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/notifications")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/support")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/tracker/settings")) return permissionForAction("settings.tracker", verb);
  if (pathname.includes("/api/admin/settings/cron-jobs")) return permissionForAction("settings.general", verb);
  if (pathname.includes("/api/admin/settings/general")) return permissionForAction("institution.general_settings", verb);
  if (pathname.includes("/api/admin/settings/socket-services")) return permissionForAction("settings.general", verb);
  if (pathname.includes("/api/admin/settings/subscription")) return permissionForAction("settings.subscription", verb);
  if (pathname.includes("/api/admin/settings/payment-categories")) return AUTHENTICATED_LOOKUP_PERMISSION;
  if (pathname.includes("/api/admin/settings/payments")) return permissionForAction("settings.payments", verb);
  if (pathname.includes("/api/admin/tracker")) return permissionForAction("tracker.history", verb);
  if (pathname.includes("/api/admin/recycle-bin")) return permissionForAction("settings.recycle_bin", verb);
  if (pathname.includes("/api/admin/ai")) return permissionForAction("settings.ai", verb);
  if (pathname.includes("/api/help/analytics")) return permissionForAction("settings.help_center_analytics", verb);
  if (pathname.includes("/api/help/categories") && verb !== "GET") return permissionForAction("settings.help_center_categories", verb);
  if (pathname.includes("/api/help/articles") && verb !== "GET") return permissionForAction("settings.help_center_articles", verb);
  if (pathname.includes("/api/help/recent-updates") && verb !== "GET") return permissionForAction("settings.help_center_updates", verb);
  if (pathname.includes("/api/admin/sections")) return AUTHENTICATED_LOOKUP_PERMISSION;

  return FULL_ACCESS_PERMISSION;
}

export function getPageViewPermission(pathname: string) {
  const normalized = normalizeAdminPath(pathname);
  if (normalized === "/admin/classroom/attendance") return "student.myclassroom.attendance.view";
  if (normalized === "/admin/classroom/achievements") return "student.myclassroom.achievements.view";
  if (normalized === "/admin/classroom/assignments") return "student.myclassroom.assignments.view";
  if (normalized === "/admin/classroom/practice-exams") return "student.myclassroom.practice_exams.view";
  if (normalized === "/admin/classroom/exams") return "student.myclassroom.exams.view";
  if (normalized === "/admin/classroom/results") return "student.myclassroom.results.view";
  if (normalized === "/admin/classroom/my-timetable") return "student.myclassroom.timetable.view";
  if (normalized === "/admin/classroom/id-card") return "student.myclassroom.idcard.view";
  if (normalized === "/admin/classroom/fees") return "student.myclassroom.fees.view";
  if (normalized === "/admin/my-program") return "student.myprogram.view";
  if (normalized === "/admin/students/notes") return "student.myclassroom.notes.view";
  const match = Object.entries(PAGE_VIEW_PERMISSIONS)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([page]) => adminPathMatchesRoute(normalized, page));
  return match?.[1] ?? FULL_ACCESS_PERMISSION;
}

export function getStaffPermissionModule(roleCode: string | null | undefined): string | null {
  if (!roleCode) return null;
  const normalized = roleCode.toLowerCase();
  if (normalized === "student") return "managestudents.allstudents";
  if (
    isManagedInstitutionRoleCode(normalized) ||
    normalized === "teacher" ||
    normalized === "driver" ||
    normalized === "parent"
  ) {
    return "managestaff.allstaff";
  }
  return null;
}

export function hasAdminPagePermission(
  user: {
    role_codes?: string[];
    permissions?: string[];
    memberships?: InstitutionMembership[];
    is_super_admin?: boolean;
  } | null | undefined,
  pathname: string
) {
  const normalized = normalizeAdminPath(pathname);
  if (!normalized.startsWith("/admin")) return true;
  if (!isAdminPathVisibleForRole(user, normalized)) return false;

  if (normalized === "/admin/access-control") {
    return ADMIN_PERMISSION_MODULES
      .filter((module) => module.page.startsWith("/admin/access-control/"))
      .some(
        (module) =>
          isAdminPathVisibleForRole(user, module.page) &&
          hasPermission(user, `${module.key}.view`)
      );
  }

  if (normalized === "/admin/ai-settings") {
    return (
      hasPermission(user, "settings.ai.view") ||
      hasPermission(user, "institution.ai_settings.view")
    );
  }

  if (normalized === "/admin/settings") {
    return (
      isInstitutionAdminUser(user) ||
      hasPermission(user, "settings.general.view") ||
      hasPermission(user, "institution.general_settings.view")
    );
  }

  if (normalized === "/admin/settings/subscription") {
    return isPlatformAdminUser(user) || isInstitutionAdminUser(user);
  }

  if (
    normalized === "/admin/institutions/gallery" ||
    normalized.startsWith("/admin/institutions/gallery") ||
    normalized === "/admin/institutions/hostels" ||
    normalized.startsWith("/admin/institutions/hostels") ||
    normalized === "/admin/institutions/libraries" ||
    normalized.startsWith("/admin/institutions/libraries")
  ) {
    return isPlatformAdminUser(user) || isInstitutionAdminUser(user) || hasPermission(user, getPageViewPermission(normalized));
  }

  if (normalized === "/admin/staff" || normalized.startsWith("/admin/staff")) {
    return isPlatformAdminUser(user) || isInstitutionAdminUser(user);
  }

  if (normalized === "/admin/operations" || normalized.startsWith("/admin/operations")) {
    return isPlatformAdminUser(user) || isInstitutionAdminUser(user);
  }

  if (normalized === "/admin/company" || normalized.startsWith("/admin/company")) {
    return isPlatformAdminUser(user) || isInstitutionAdminUser(user);
  }

  if (normalized === "/admin/analytics" || normalized.startsWith("/admin/analytics")) {
    return isPlatformAdminUser(user) || isInstitutionAdminUser(user);
  }

  if (normalized === "/admin/content" || normalized.startsWith("/admin/content")) {
    return isPlatformAdminUser(user) || isInstitutionAdminUser(user);
  }

  if (normalized === "/admin/marketing" || normalized.startsWith("/admin/marketing")) {
    return isPlatformAdminUser(user) || isInstitutionAdminUser(user);
  }

  if (normalized === "/admin/sales" || normalized.startsWith("/admin/sales")) {
    return isPlatformAdminUser(user) || isInstitutionAdminUser(user);
  }

  if (normalized === "/admin/finance/allowance") {
    return (
      isPlatformAdminUser(user) ||
      isInstitutionAdminUser(user) ||
      isTeacherUser(user) ||
      Boolean(user?.role_codes?.includes("driver")) ||
      hasPermission(user, "finance.platform.allowance.view") ||
      hasPermission(user, "finance.allowance.view")
    );
  }

  if (normalized === "/admin/finance" || normalized.startsWith("/admin/finance/")) {
    if (isPlatformAdminUser(user) || isInstitutionAdminUser(user)) return true;
    if (normalized === "/admin/finance/income") return hasPermission(user, "finance.platform.income.view");
    if (normalized === "/admin/finance/expense") return hasPermission(user, "finance.platform.expense.view");
    if (normalized === "/admin/finance/invoice") return hasPermission(user, "finance.platform.invoice.view");
    if (normalized === "/admin/finance/recurring-expenses") return hasPermission(user, "finance.platform.recurring_expenses.view");
    return false;
  }

  if (normalized === "/admin") {
    return (
      hasPermission(user, "dashboard.view") ||
      hasPermission(user, "student.dashboard.view") ||
      hasPermission(user, "parent.dashboard.view") ||
      hasPermission(user, "teacher.dashboard.view")
    );
  }

  if (normalized === "/admin/master-data/practice-exams") {
    return isPlatformAdminUser(user)
      ? hasPermission(user, "content.practice_exam_reviews.view")
      : hasPermission(user, "content.practice_exams.view");
  }

  if (normalized === "/admin/master-data/exams") {
    return isPlatformAdminUser(user)
      ? hasPermission(user, "content.exam_reviews.view")
      : hasPermission(user, "content.exams.view");
  }

  if (normalized === "/admin/classroom/my-timetable") {
    return (
      hasPermission(user, "student.myclassroom.timetable.view") ||
      hasPermission(user, "teacher.myclassroom.timetable.view") ||
      hasPermission(user, "parent.childclassroom.timetable.view")
    );
  }

  if (normalized.startsWith("/admin/classroom/")) {
    const suffix = normalized === "/admin/classroom/practice-exams"
      ? "practice_exams"
      : normalized === "/admin/classroom/exams"
        ? "exams"
      : normalized === "/admin/classroom/results"
        ? "results"
      : normalized === "/admin/classroom/id-card"
        ? "idcard"
      : normalized === "/admin/classroom/fees"
        ? "fees"
        : normalized.split("/").at(-1);
    return Boolean(suffix && (
      hasPermission(user, `student.myclassroom.${suffix}.view`) ||
      hasPermission(user, `parent.childclassroom.${suffix}.view`)
    ));
  }

  if (normalized === "/admin/students/notes") {
    return (
      hasPermission(user, "managestudents.notes.view") ||
      hasPermission(user, "student.myclassroom.notes.view")
    );
  }

  if (normalized === "/admin/institution/calendar") {
    return (
      hasPermission(user, "student.myinstitution.calendar.view") ||
      hasPermission(user, "parent.childinstitution.calendar.view")
    );
  }

  if (normalized === "/admin/institution/complaints") {
    return (
      hasPermission(user, "institution.complaints.view") ||
      hasPermission(user, "student.myinstitution.complaints.view") ||
      hasPermission(user, "teacher.myinstitution.complaints.view") ||
      hasPermission(user, "parent.myinstitution.complaints.view") ||
      hasPermission(user, "driver.myinstitution.complaints.view")
    );
  }

  if (normalized === "/admin/institution/my-attendance") {
    return (
      hasPermission(user, "teacher.myinstitution.myattendance.view") ||
      hasPermission(user, "driver.myinstitution.myattendance.view")
    );
  }

  if (normalized === "/admin/institution/my-salary") {
    return (
      hasPermission(user, "teacher.myinstitution.mysalary.view") ||
      hasPermission(user, "driver.myinstitution.mysalary.view")
    );
  }

  if (normalized === "/admin/institution/my-letters") {
    return (
      hasPermission(user, "teacher.myinstitution.myletters.view") ||
      hasPermission(user, "driver.myinstitution.myletters.view")
    );
  }

  if (normalized === "/admin/institutions/news") {
    return (
      !isPlatformAdminUser(user) &&
      (
        hasPermission(user, "institution.noticeboard.view") ||
        hasPermission(user, "student.myinstitution.noticeboard.view") ||
        hasPermission(user, "teacher.myinstitution.noticeboard.view") ||
        hasPermission(user, "parent.myinstitution.noticeboard.view") ||
        hasPermission(user, "driver.myinstitution.noticeboard.view")
      )
    );
  }

  if (normalized === "/admin/support") {
    return (
      hasPermission(user, "support.tickets.view") ||
      hasPermission(user, "student.support.view") ||
      hasPermission(user, "teacher.support.view") ||
      hasPermission(user, "parents.support.view") ||
      hasPermission(user, "driver.support.view")
    );
  }

  if (normalized === "/admin/my-program") {
    return (
      hasPermission(user, "student.myprogram.view") ||
      hasPermission(user, "student.dashboard.view") ||
      Boolean(user?.role_codes?.includes("student"))
    );
  }

  if (normalized === "/admin/guardians" || normalized === "/admin/students/guardians" || normalized === "/student/guardians") {
    return true;
  }

  if (normalized === "/admin/notifications") {
    if (user?.role_codes?.includes("student")) {
      return hasPermission(user, "student.notification.all.view");
    }
    return hasPermission(user, "notifications.inbox.view");
  }

  if (normalized === "/admin/notifications/muted") {
    return hasPermission(user, "notifications.muted.view");
  }

  if (normalized === "/admin/notifications/settings") {
    return hasPermission(user, "notifications.controls.view");
  }

  return hasPermission(user, getPageViewPermission(normalized));
}

export function getFirstAllowedAdminPath(
  user: {
    role_codes?: string[];
    permissions?: string[];
    memberships?: InstitutionMembership[];
    is_super_admin?: boolean;
  } | null | undefined
) {
  if (!user) return null;
  const match = ADMIN_PERMISSION_MODULES.find(
    (module) =>
      isAdminPathVisibleForRole(user, module.page) &&
      hasPermission(user, `${module.key}.view`)
  );
  return match?.page ?? null;
}

export function getInstitutionIdFromUrl(url: string) {
  const searchParams = new URL(url).searchParams;
  const raw = searchParams.get("institutionId") ?? searchParams.get("institution_id");
  const institutionId = raw ? Number(raw) : null;

  return Number.isInteger(institutionId) && institutionId > 0 ? institutionId : null;
}
