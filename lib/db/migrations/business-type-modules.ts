import { db } from "@/lib/db/db";

export interface SystemModuleDefinition {
  key: string;
  name: string;
  description: string;
  route: string;
  icon: string;
  display_order: number;
  parent_key?: string | null;
  children?: Array<{
    key: string;
    name: string;
    description: string;
    route: string;
    icon: string;
    display_order: number;
  }>;
}

export const CORE_SYSTEM_MODULES: SystemModuleDefinition[] = [
  {
    key: "operations",
    name: "Operation",
    description: "Tasks & team workflow, operations boards, work logs, project pipelines, and document generation",
    route: "/admin/operations/tasks",
    icon: "ClipboardList",
    display_order: 10,
    children: [
      { key: "operations.tasks", name: "Task Management", description: "Operations tasks and deliverables", route: "/admin/operations/tasks", icon: "ClipboardList", display_order: 11 },
      { key: "operations.work_logs", name: "Daily Work Logs", description: "Team daily work tracking", route: "/admin/operations/work-logs", icon: "Clock", display_order: 12 },
      { key: "operations.pipelines", name: "Work Pipelines", description: "Operational workflows and stage pipelines", route: "/admin/operations/project-pipelines", icon: "GitBranch", display_order: 13 },
      { key: "operations.generate_docs", name: "Generate Documents", description: "Document generation and templates", route: "/admin/operations/generate-documents", icon: "FileText", display_order: 14 },
    ],
  },
  {
    key: "sales",
    name: "Sales",
    description: "Leads, customer opportunities, sales pipeline, quotation builder, and customer proposals",
    route: "/admin/sales",
    icon: "TrendingUp",
    display_order: 20,
    children: [
      { key: "sales.leads", name: "Leads & Enquiries", description: "Inbound leads and prospects", route: "/admin/sales", icon: "TrendingUp", display_order: 21 },
      { key: "sales.quotations", name: "Quotations & Proposals", description: "Client proposals and quotations", route: "/admin/sales/generate-documents", icon: "FileText", display_order: 22 },
    ],
  },
  {
    key: "finance",
    name: "Finance",
    description: "Invoices, transactions, staff payroll, fee collections, expense tracking, and receipts",
    route: "/admin/finance",
    icon: "IndianRupee",
    display_order: 30,
    children: [
      { key: "finance.invoices", name: "Invoices & Billing", description: "Customer and client billing records", route: "/admin/finance", icon: "FileText", display_order: 31 },
      { key: "finance.transactions", name: "Transactions", description: "Payment ledger and transaction history", route: "/admin/finance/transactions", icon: "CreditCard", display_order: 32 },
    ],
  },
  {
    key: "admin",
    name: "Admin",
    description: "Organization profile, branch management, inventory, facilities, and campus operations",
    route: "/admin/institutions",
    icon: "Building",
    display_order: 40,
    children: [
      { key: "admin.institutions", name: "Organization Profile", description: "Business identity and campus settings", route: "/admin/institutions", icon: "Building", display_order: 41 },
      { key: "admin.inventory", name: "Inventory", description: "Material assets and inventory tracking", route: "/admin/inventory", icon: "Boxes", display_order: 42 },
    ],
  },
  {
    key: "marketing",
    name: "Marketing",
    description: "Campaigns, email/SMS broadcasts, promo codes, affiliate earnings, and audience reach",
    route: "/admin/marketing",
    icon: "Megaphone",
    display_order: 50,
    children: [
      { key: "marketing.campaigns", name: "Marketing Campaigns", description: "Promotional initiatives and audience outreach", route: "/admin/marketing", icon: "Megaphone", display_order: 51 },
      { key: "marketing.affiliates", name: "Affiliate & Referrals", description: "Affiliate partners and commission tracking", route: "/admin/users/affiliates", icon: "Share2", display_order: 52 },
    ],
  },
  {
    key: "company_legal",
    name: "Company & Legal",
    description: "Company incorporation, legal agreements, compliance certificates, and contract management",
    route: "/admin/company",
    icon: "ShieldCheck",
    display_order: 60,
    children: [
      { key: "company_legal.profile", name: "Company Information", description: "Legal entity structure and tax filings", route: "/admin/company", icon: "Building2", display_order: 61 },
    ],
  },
  {
    key: "settings",
    name: "Settings",
    description: "System configuration, automated notifications, preferences, security, and global theme",
    route: "/admin/settings",
    icon: "Settings",
    display_order: 70,
  },
  {
    key: "orders_bookings",
    name: "Orders & Bookings",
    description: "Customer service appointments, product orders, booking calendar, and client fulfillment",
    route: "/admin/orders",
    icon: "ShoppingCart",
    display_order: 80,
  },
  {
    key: "roles_permissions",
    name: "Roles & Permissions",
    description: "Access control, custom staff role definitions, permissions, and institution memberships",
    route: "/admin/access-control",
    icon: "ShieldCheck",
    display_order: 90,
  },
  {
    key: "analytics",
    name: "Analytics",
    description: "Performance reports, store views, engagement analytics, customer journey, and conversion metrics",
    route: "/admin/analytics",
    icon: "TrendingUp",
    display_order: 100,
  },
  {
    key: "my_profile",
    name: "My Profile",
    description: "Personal admin/staff account, biometric attendance records, salary slips, and assigned tasks",
    route: "/admin/my-profile",
    icon: "User",
    display_order: 110,
  },
  {
    key: "manage_staff",
    name: "Manage Staff",
    description: "Employee directory, staff attendance, queries, performance leaderboard, job postings, and offer letters",
    route: "/admin/staff",
    icon: "Users",
    display_order: 120,
    children: [
      { key: "manage_staff.all_staff", name: "All Staff", description: "Staff profiles and designations", route: "/admin/staff", icon: "UsersRound", display_order: 121 },
      { key: "manage_staff.attendance", name: "Staff Attendance", description: "Daily staff attendance tracking", route: "/admin/staff/attendance", icon: "CalendarDays", display_order: 122 },
      { key: "manage_staff.performance", name: "Staff Performance", description: "Employee performance and metrics", route: "/admin/staff/performance", icon: "TrendingUp", display_order: 123 },
      { key: "manage_staff.queries", name: "Staff Queries", description: "Internal staff tickets and queries", route: "/admin/staff/queries", icon: "MessageSquare", display_order: 124 },
      { key: "manage_staff.jobs", name: "Our Jobs", description: "Recruitment vacancies and applicant pipeline", route: "/admin/staff/jobs", icon: "Briefcase", display_order: 125 },
    ],
  },
  {
    key: "my_classroom",
    name: "My Classroom",
    description: "Teacher class management, student attendance, class timetable, homework assignments, and practice exams",
    route: "/admin/classroom/attendance",
    icon: "BookOpen",
    display_order: 130,
    children: [
      { key: "my_classroom.attendance", name: "Classroom Attendance", description: "Daily student classroom attendance", route: "/admin/classroom/attendance", icon: "UserCheck", display_order: 131 },
      { key: "my_classroom.timetable", name: "Class Timetable", description: "Weekly teaching timetable", route: "/admin/classroom/my-timetable", icon: "Clock", display_order: 132 },
      { key: "my_classroom.assignments", name: "Classroom Assignments", description: "Coursework assignments and homework", route: "/admin/classroom/assignments", icon: "CheckSquare", display_order: 133 },
      { key: "my_classroom.exams", name: "Classroom Exams & Results", description: "Test schedules, tryouts, and results", route: "/admin/classroom/exams", icon: "Award", display_order: 134 },
    ],
  },
  {
    key: "manage_students",
    name: "Manage Students",
    description: "Student admission directory, student fee schedules, student report cards, and transfer certificates",
    route: "/admin/students",
    icon: "GraduationCap",
    display_order: 140,
    children: [
      { key: "manage_students.all_students", name: "All Students", description: "Student admissions and directory", route: "/admin/students", icon: "GraduationCap", display_order: 141 },
      { key: "manage_students.fee_management", name: "Fee Management", description: "Student tuition fee structure and collection", route: "/admin/students/fee-management", icon: "CreditCard", display_order: 142 },
      { key: "manage_students.attendance", name: "Student Attendance", description: "Overall student attendance logs", route: "/admin/students/attendance", icon: "CalendarDays", display_order: 143 },
      { key: "manage_students.performance", name: "Student Performance", description: "Academic performance and GPA metrics", route: "/admin/students/performance", icon: "TrendingUp", display_order: 144 },
    ],
  },
  {
    key: "academics",
    name: "Academics",
    description: "Syllabus management, courses & programs, academic subjects, lecture notes, and study material",
    route: "/admin/content/notes",
    icon: "BookMarked",
    display_order: 150,
    children: [
      { key: "academics.notes", name: "Lecture Notes", description: "Study materials and lecture handouts", route: "/admin/content/notes", icon: "StickyNote", display_order: 151 },
      { key: "academics.courses", name: "Courses & Programs", description: "Curriculum programs and degrees", route: "/admin/content/courses", icon: "BookCheck", display_order: 152 },
      { key: "academics.exams", name: "Competitive & Board Exams", description: "Standardized entrance and board exams", route: "/admin/content/public-exams", icon: "Landmark", display_order: 153 },
    ],
  },
];

let migrationPromise: Promise<void> | null = null;

export async function ensureBusinessTypeModulesSchema(): Promise<void> {
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    // 1. Create system_modules table
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_modules (
        id SERIAL PRIMARY KEY,
        module_key VARCHAR(100) UNIQUE NOT NULL,
        module_name VARCHAR(150) NOT NULL,
        description TEXT,
        parent_module_id INTEGER REFERENCES system_modules(id) ON DELETE CASCADE,
        route VARCHAR(255),
        icon VARCHAR(100),
        display_order INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create business_type_modules table
    await db.query(`
      CREATE TABLE IF NOT EXISTS business_type_modules (
        id SERIAL PRIMARY KEY,
        business_type_id INTEGER NOT NULL REFERENCES institution_types(id) ON DELETE CASCADE,
        module_id INTEGER NOT NULL REFERENCES system_modules(id) ON DELETE CASCADE,
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (business_type_id, module_id)
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_btm_type_enabled
      ON business_type_modules(business_type_id, is_enabled)
    `);

    // 3. Ensure 'IT & Digital Agency' exists in institution_types
    await db.query(`
      INSERT INTO institution_types (name, slug, is_active, is_deleted)
      VALUES ('IT & Digital Agency', 'it-digital-agency', true, false)
      ON CONFLICT DO NOTHING
    `);

    // 4. Seed core system modules
    for (const mod of CORE_SYSTEM_MODULES) {
      const parentRes = await db.query<{ id: number }>(
        `INSERT INTO system_modules (module_key, module_name, description, route, icon, display_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (module_key) DO UPDATE SET
           module_name = EXCLUDED.module_name,
           description = EXCLUDED.description,
           route = EXCLUDED.route,
           icon = EXCLUDED.icon,
           display_order = EXCLUDED.display_order,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [mod.key, mod.name, mod.description, mod.route, mod.icon, mod.display_order]
      );
      const parentId = parentRes.rows[0]?.id;

      if (parentId && mod.children) {
        for (const child of mod.children) {
          await db.query(
            `INSERT INTO system_modules (module_key, module_name, description, parent_module_id, route, icon, display_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (module_key) DO UPDATE SET
               module_name = EXCLUDED.module_name,
               description = EXCLUDED.description,
               parent_module_id = EXCLUDED.parent_module_id,
               route = EXCLUDED.route,
               icon = EXCLUDED.icon,
               display_order = EXCLUDED.display_order,
               updated_at = CURRENT_TIMESTAMP`,
            [child.key, child.name, child.description, parentId, child.route, child.icon, child.display_order]
          );
        }
      }
    }

    // 5. Initialize default module mappings for all existing business types
    const typesRes = await db.query<{ id: number; name: string; slug: string }>(
      `SELECT id, name, slug FROM institution_types WHERE COALESCE(is_deleted, false) = false`
    );
    const allModulesRes = await db.query<{ id: number; module_key: string; parent_module_id: number | null }>(
      `SELECT id, module_key, parent_module_id FROM system_modules`
    );

    const educationalSpecificKeys = new Set([
      "my_classroom",
      "my_classroom.attendance",
      "my_classroom.timetable",
      "my_classroom.assignments",
      "my_classroom.exams",
      "manage_students",
      "manage_students.all_students",
      "manage_students.fee_management",
      "manage_students.attendance",
      "manage_students.performance",
      "academics",
      "academics.notes",
      "academics.courses",
      "academics.exams",
    ]);

    for (const bType of typesRes.rows) {
      const typeLower = bType.name.toLowerCase();
      const isEducational =
        typeLower.includes("school") ||
        typeLower.includes("college") ||
        typeLower.includes("university") ||
        typeLower.includes("institute") ||
        typeLower.includes("coaching") ||
        typeLower.includes("academy");

      for (const sm of allModulesRes.rows) {
        let isEnabled = true;
        // Non-educational business types (e.g. IT & Digital Agency, Retail, Salon, etc.)
        // have student/classroom/academic modules disabled by default
        if (!isEducational && educationalSpecificKeys.has(sm.module_key)) {
          isEnabled = false;
        }

        await db.query(
          `INSERT INTO business_type_modules (business_type_id, module_id, is_enabled)
           VALUES ($1, $2, $3)
           ON CONFLICT (business_type_id, module_id) DO NOTHING`,
          [bType.id, sm.id, isEnabled]
        );
      }
    }
  })().catch((err) => {
    migrationPromise = null;
    throw err;
  });

  return migrationPromise;
}
